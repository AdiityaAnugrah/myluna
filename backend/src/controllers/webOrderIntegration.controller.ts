import { buildWebsiteProductPayload } from '../services/websiteProductSync.service';
import { resolveWebsiteOrder } from '../services/websiteOrderResolver.service';
import { appendWebsiteOrderReference, websiteInternalSaleNumber } from '../utils/websiteOrderReference';
import { resolveWebsiteProduct, resolveWebsiteVariant, appendWebsiteIdentities, readWebsiteIdentities, WebsiteItemIdentity } from '../services/websiteProductIdentity.service';
import { websitePaymentEnvironment } from '../utils/websitePaymentEnvironment';
import { websiteFulfillment } from '../services/websiteFulfillment.service';
import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import {
  Product,
  ProductVariant,
  Category,
  Sale,
  SaleItem,
  SaleReturn,
  SaleReturnItem,
  ReturnSourceType,
  SaleReturnStatus,
  AuditAction,
  StockMovement,
  MovementType,
  User,
} from '../models';
import { sequelize } from '../config/database';
import { successResponse } from '../utils/response';
import { AppError } from '../utils/errors';
import { socketService } from '../services/socket.service';
import { auditService } from '../services/audit.service';
import { parseBoolean, postJsonToLunareaWebsite } from '../services/lunareaWebsiteHttp.service';
import { websiteShippingNotes, websitePreparedResyncNotes, websiteShippingReference, assertWebsiteShippingReferenceChange } from '../utils/websiteShipping';

function cleanText(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function itemVariantName(name: string) {
  const match = name.match(/\(([^()]*)\)\s*$/);
  return match ? cleanText(match[1]) : '';
}

function generateReturnNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `RTR-${y}${m}${d}-${random}`;
}

function isOperationalItem(item: any) {
  const name = cleanText(item?.name).toLowerCase();
  const id = cleanText(item?.id).toLowerCase();
  return !['biaya admin', 'biaya ongkir', 'ongkir', 'diskon voucher', 'luna point', 'ganti kaca', 'potongan preorder']
    .some(keyword => id === keyword || (!id && name === keyword));
}

function normalizeAddress(raw: unknown) {
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return Object.values(parsed).filter(Boolean).join(', ');
      }
    } catch (_) {
      return raw;
    }
    return raw;
  }

  if (raw && typeof raw === 'object') {
    return Object.values(raw as Record<string, unknown>).filter(Boolean).join(', ');
  }

  return '';
}

async function resolveCreatedBy() {
  const configuredUserId = process.env.WEBSITE_ORDER_USER_ID;
  if (configuredUserId) {
    const user = await User.findByPk(configuredUserId);
    if (user) return user.id;
  }

  const user = await User.findOne({
    where: { isActive: true },
    order: [['createdAt', 'ASC']],
  });

  if (!user) {
    throw new AppError('User integrasi website belum tersedia', 500);
  }

  return user.id;
}

async function getExistingReturnedQtyMap(saleId: string, transaction: any) {
  const existingItems = await SaleReturnItem.findAll({
    include: [
      {
        model: SaleReturn,
        as: 'returnRecord',
        required: true,
        where: {
          saleId,
          status: {
            [Op.ne]: SaleReturnStatus.REJECTED,
          },
        },
        attributes: [],
      },
    ],
    attributes: ['saleItemId', 'qtyRequested'],
    transaction,
  });

  const qtyMap = new Map<string, number>();
  for (const item of existingItems) {
    qtyMap.set(item.saleItemId, (qtyMap.get(item.saleItemId) || 0) + Number(item.qtyRequested || 0));
  }

  return qtyMap;
}

export async function resolveSaleItemForWebsiteReturn(sale: Sale, item: any, _transaction: any) {
  const requestedId = cleanText(item?.id);
  const variant = itemVariantName(cleanText(item?.name));
  const identities = readWebsiteIdentities(sale.notes);
  const candidates = (sale.items || []).filter(line => {
    if (item.sale_item_id && item.sale_item_id !== line.id) return false;
    if (identities) {
      const identity = identities.find(i => i.saleItemId === line.id);
      if (!identity || identity.productId !== line.productId) throw new AppError('Identitas retur pesanan tidak cocok', 409);
      if (identity.websiteId !== requestedId) return false;
      if (item.luna_product_id && item.luna_product_id !== identity.productId) return false;
      if (item.luna_variant_id && item.luna_variant_id !== identity.variantId) return false;
      return item.luna_variant_id ? true : (line.variantName || '') === variant;
    }
    const product = (line as any).product as Product | undefined;
    const sameProduct = product && (requestedId === product.id || requestedId === product.sku);
    const sameName = cleanText(item?.name) === `${cleanText(product?.name || line.componentName)}${line.variantName ? ` (${line.variantName})` : ''}`;
    return !!line.productId && !!(sameProduct || sameName) && (line.variantName || '') === variant;
  });
  if (candidates.length !== 1) throw new AppError('Item retur belum cocok secara tunggal dengan pesanan asli', 422);
  return candidates[0];
}

export const webOrderIntegrationController = {
  async syncProductsToLunareaWebsite(req: Request, res: Response, next: NextFunction) {
    const token = String(req.headers['x-luna-webhook-token'] || req.headers['x-webhook-token'] || '');
    const expectedToken = String(process.env.LUNA_WEB_ORDER_TOKEN || '');

    if (!expectedToken || token !== expectedToken) {
      return res.status(401).json({ success: false, message: 'Invalid webhook token' });
    }

    try {
      const body = req.body || {};
      const websiteUrl = String(
        body.website_url ||
        process.env.LUNAREA_WEBSITE_PRODUCT_SYNC_URL ||
        'https://lunareafurniture.com/integrations/luna-product-sync'
      );
      const websiteHost = cleanText(body.website_host || process.env.LUNAREA_WEBSITE_PRODUCT_SYNC_HOST);
      const insecureTls = parseBoolean(body.insecure_tls) || parseBoolean(process.env.LUNAREA_WEBSITE_PRODUCT_SYNC_INSECURE_TLS);
      const createMissing = parseBoolean(body.create_missing);
      const dryRun = parseBoolean(body.dry_run);
      const productIds = Array.isArray(body.product_ids) ? body.product_ids.map(cleanText).filter(Boolean) : [];
      const limit = Math.min(Math.max(Number(body.limit || 500), 1), 5000);
      const includeInactive = parseBoolean(body.include_inactive);

      const where: any = {};
      if (productIds.length > 0) {
        where.id = { [Op.in]: productIds };
      } else if (!includeInactive) {
        where.isActive = true;
      }

      const products = await Product.findAll({
        where,
        include: [
          {
            model: ProductVariant,
            as: 'variantItems',
            separate: true,
            order: [['createdAt', 'ASC']],
          },
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'parentId'],
            include: [
              {
                model: Category,
                as: 'parent',
                attributes: ['id', 'name'],
              },
            ],
          },
        ],
        limit,
        order: [['updatedAt', 'DESC']],
      });

      const payload = {
        source: 'luna-system',
        dry_run: dryRun,
        create_missing: createMissing,
        products: await Promise.all(products.map(buildWebsiteProductPayload)),
      };

      const response = await postJsonToLunareaWebsite(websiteUrl, payload, {
        token: expectedToken,
        hostHeader: websiteHost || undefined,
        insecureTls,
      });

      const text = response.text;
      let websiteResult: any = text;
      try {
        websiteResult = JSON.parse(text);
      } catch (_) {
        // keep raw text for diagnostics
      }

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          message: 'Sync produk ke website gagal',
          website_status: response.status,
          website_result: websiteResult,
        });
      }

      return successResponse(
        res,
        {
          sent: products.length,
          websiteUrl,
          createMissing,
          dryRun,
          websiteResult,
        },
        'Sync produk ke website Lunarea berhasil',
        200
      );
    } catch (error) {
      return next(error);
    }
  },

  async importLunareaOrder(req: Request, res: Response, next: NextFunction) {
    const token = String(req.headers['x-luna-webhook-token'] || req.headers['x-webhook-token'] || '');
    const expectedToken = String(process.env.LUNA_WEB_ORDER_TOKEN || '');

    if (!expectedToken || token !== expectedToken) {
      return res.status(401).json({ success: false, message: 'Invalid webhook token' });
    }

    const paymentLane = websitePaymentEnvironment(req.body || {});
    if (paymentLane === 'invalid') return res.status(400).json({ success: false, message: 'Invalid payment environment' });
    if (paymentLane === 'sandbox') {
      return successResponse(res, { skipped: true, reason: 'sandbox_order' }, 'Order uji tidak masuk operasional produksi');
    }

    let transaction: any;
    try {
      transaction = await sequelize.transaction();
      const body = req.body || {};
      const orderId = cleanText(body.order_id);
      const internalSaleNumber = websiteInternalSaleNumber(orderId);
      const status = cleanText(body.status);
      const customerId = cleanText(body.customer_id);
      const customerEmail = cleanText(body.customer_email || body.email_cus);
      const customerName = cleanText(body.customer_name || body.nama_pen);
      const customerPhone = cleanText(body.customer_phone || body.hp_pen);
      const customerAuthProvider = cleanText(body.customer_auth_provider || 'email');
      const isGuestOrder = String(body.is_guest || '').toLowerCase() === 'true';

      if (!orderId || !orderId.toUpperCase().startsWith('L')) {
        throw new AppError('Order Lunarea tidak valid', 400);
      }
      if (body.event_type === 'shipping_update') {
        const existing = await resolveWebsiteOrder(orderId, transaction);
        if (!existing) throw new AppError('Order website belum terdaftar di MyLuna. Sinkronkan order pembayaran terlebih dahulu.', 404);
        if (['CANCELLED', 'REJECTED'].includes(existing.status)) throw new AppError('Penjualan sudah dibatalkan atau ditolak', 409);
        assertWebsiteShippingReferenceChange(body, String(existing.status), existing.notes);
        const notes = websiteShippingNotes(body, existing.notes);
        const dryShipping = String(req.headers['x-luna-dry-run'] || body.dry_run || '').toLowerCase() === 'true';
        if (dryShipping) {
          await transaction.rollback();
          return successResponse(res, { dryRun: true, shipping_updated: false, saleNumber: orderId }, 'Validasi pengiriman berhasil; data tidak disimpan');
        }
        // This branch never creates a Sale/StockMovement or changes sale totals/workflow.
        if (notes !== existing.notes) {
          await existing.update({ notes }, { transaction });
        }
        await transaction.commit();
        socketService.broadcastDataRefresh('sales');
        return successResponse(res, { shipping_updated: true, saleNumber: orderId, shipping_pricing_recorded: !!body.shipping_pricing }, 'Pengiriman website diperbarui');
      }
      if (isGuestOrder || (!customerId && !customerEmail)) {
        throw new AppError('Order website wajib berasal dari akun customer', 400);
      }

      if (status !== 'Proses') {
        await transaction.rollback();
        return successResponse(res, { skipped: true, reason: 'Status belum dibayar' }, 'Order belum masuk proses', 200);
      }

      // Admin-reviewed paid orders arrive before AWB creation. Dispatch still requires an AWB.
      const preparedShipping = { ...body, status: 'Proses', shipping_status: 'Disiapkan', courier: body.courier || body.kurir };
      websiteShippingNotes(preparedShipping, null);
      const dryRun = String(req.headers['x-luna-dry-run'] || body.dry_run || '').toLowerCase() === 'true';
      const existingSale = await resolveWebsiteOrder(orderId, transaction);
      if (existingSale) {
        if (['CANCELLED', 'REJECTED'].includes(existingSale.status) || (existingSale.platform && String(existingSale.platform) !== 'WEBSITE')) {
          throw new AppError('Order sudah dibatalkan/ditolak atau nomor pesanan dipakai transaksi lain. Perlu rekonsiliasi operator.', 409);
        }
        const frozen = readWebsiteIdentities(existingSale.notes);
        if (frozen && Array.isArray(body.items)) {
          const storedItems = await SaleItem.findAll({ where: { saleId: existingSale.id }, transaction });
          const incomingItems = body.items.filter(isOperationalItem);
          if (incomingItems.length !== frozen.length || incomingItems.some((item: any, index: number) => {
            const identity = frozen[index];
            const stored = storedItems.find(line => line.id === identity.saleItemId);
            return !stored || String(item.id) !== identity.websiteId
              || (item.luna_product_id && item.luna_product_id !== identity.productId)
              || (item.luna_variant_id && item.luna_variant_id !== identity.variantId)
              || Number(item.quantity) !== Number(stored.quantity)
              || Number(item.price ?? item.value) !== Number(stored.price);
          }) || Number(body.data_mid?.gross_amount || body.total) !== Number(existingSale.totalAmount)) {
            throw new AppError('Snapshot pesanan ulang berbeda dari pesanan MyLuna asli', 409);
          }
        }
        const notes = websitePreparedResyncNotes(preparedShipping, String(existingSale.status), existingSale.notes);
        if (!dryRun && notes !== existingSale.notes) await existingSale.update({ notes, shippingService: cleanText(preparedShipping.courier) }, { transaction });
        if (dryRun) await transaction.rollback(); else await transaction.commit();
        return successResponse(res, { ...existingSale.toJSON(), website_order_id: orderId, dryRun, fulfillment: websiteFulfillment(existingSale), tracking_number: websiteShippingReference(notes).awb, shipping_pricing_recorded: !!body.shipping_pricing }, 'Order website sudah pernah masuk sistem', 200);
      }

      // Sale hooks rename cancelled/rejected numbers. Never silently import those orders again.
      const archivedSale = await Sale.findOne({
        where: {
          platform: 'WEBSITE', status: { [Op.in]: ['CANCELLED', 'REJECTED'] },
          [Op.or]: [
            { saleNumber: { [Op.startsWith]: `${orderId}-CANCELLED-` } },
            { saleNumber: { [Op.startsWith]: `${orderId}-REJECTED-` } },
            { saleNumber: { [Op.startsWith]: `${internalSaleNumber}-CANCELLED-` } },
            { saleNumber: { [Op.startsWith]: `${internalSaleNumber}-REJECTED-` } },
          ],
        }, transaction, lock: transaction.LOCK.UPDATE,
      });
      if (archivedSale && [orderId, internalSaleNumber].some(id => archivedSale.saleNumber.startsWith(`${id}-CANCELLED-`) || archivedSale.saleNumber.startsWith(`${id}-REJECTED-`))) {
        throw new AppError('Order pernah dibatalkan/ditolak di MyLuna. Sinkron ulang memerlukan rekonsiliasi operator.', 409);
      }

      const createdBy = await resolveCreatedBy();
      const items = Array.isArray(body.items) ? body.items.filter(isOperationalItem) : [];
      if (items.length === 0) {
        throw new AppError('Item order kosong', 400);
      }

      const saleDate = new Date(String(body.transaction_time || ''));
      const shippingAddress = cleanText(normalizeAddress(body.alamat_pen));
      const shippingService = cleanText(body.courier || body.kurir);
      const dataMid = body.data_mid || {};
      const grossAmount = Number(dataMid.gross_amount || body.total || 0);

      const mappedItems: Array<{
        itemType: 'PRODUCT' | 'COMPONENT';
        productId: string | null;
        componentName: string | null;
        componentNotes: string | null;
        variantName: string | null;
        quantity: number;
        price: number;
        discount: number;
        subtotal: number;
      }> = [];

      const stockRequired = new Map<string, number>();
      const resolvedVariants = new Map<string, ProductVariant | null>();
      const sourceIdentities: Array<Omit<WebsiteItemIdentity, 'saleItemId'>> = [];
      const productRequired = new Map<string, number>();

      for (const item of items) {
        const name = cleanText(item.name);
        const variantName = itemVariantName(name);
        const quantity = Number(item.quantity);
        const price = Number(item.price ?? item.value ?? 0);
        const discount = Number(item.discount || 0);
        if (!Number.isSafeInteger(quantity) || quantity <= 0 || !Number.isSafeInteger(price) || price < 0
          || !Number.isSafeInteger(discount) || discount < 0 || discount > quantity * price
          || !Number.isSafeInteger(quantity * price)) throw new AppError('Jumlah atau nominal item pesanan tidak valid', 422);
        const subtotal = quantity * price - discount;

        const product = await resolveWebsiteProduct(item, transaction);
        const resolvedVariant = await resolveWebsiteVariant(product.id, item, variantName, transaction);
        resolvedVariants.set(JSON.stringify([product.id, resolvedVariant?.value || '']), resolvedVariant);
        sourceIdentities.push({ websiteId: cleanText(item.id), productId: product.id, variantId: resolvedVariant?.id || null });
        if (product) {
          const finalVariant = resolvedVariant?.value || null;
          const key = JSON.stringify([product.id, finalVariant || '']);
          productRequired.set(product.id, (productRequired.get(product.id) || 0) + quantity);
          stockRequired.set(key, (stockRequired.get(key) || 0) + quantity);
          mappedItems.push({
            itemType: 'PRODUCT',
            productId: product.id,
            componentName: null,
            componentNotes: null,
            variantName: finalVariant,
            quantity,
            price,
            discount,
            subtotal,
          });
        }
      }

      for (const [key, totalQty] of stockRequired) {
        const [productId, variantName] = JSON.parse(key) as [string, string];
        const product = await Product.findByPk(productId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!product) throw new AppError('Produk pesanan tidak ditemukan', 422);
        if (product.stock < (productRequired.get(productId) || 0)) throw new AppError(`Stok ${product.name} tidak cukup`, 400);

        if (variantName) {
          const variant = resolvedVariants.get(key);
          if (!variant || variant.stock < totalQty) {
            throw new AppError(`Stok varian ${product.name} (${variantName}) tidak cukup`, 400);
          }
        } else if (product.stock < totalQty) {
          throw new AppError(`Stok ${product.name} tidak cukup`, 400);
        }
      }

      if (!Number.isFinite(saleDate.getTime()) || !Number.isSafeInteger(grossAmount) || grossAmount <= 0) {
        throw new AppError('Waktu atau total pembayaran pesanan tidak valid', 422);
      }
      if (dryRun) {
        await transaction.rollback();
        return successResponse(res, { dryRun: true, saleNumber: orderId, itemCount: mappedItems.length }, 'Validasi produk, varian, dan stok berhasil; data tidak disimpan');
      }
      const identities: WebsiteItemIdentity[] = [];
      const sale = await Sale.create(
        {
          saleNumber: internalSaleNumber,
          saleDate,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          totalAmount: grossAmount,
          paymentMethod: 'TRANSFER' as any,
          platform: 'WEBSITE' as any,
          saleType: 'PRODUCT' as any,
          status: 'WAITING_APPROVAL' as any,
          notes: appendWebsiteOrderReference(websiteShippingNotes(preparedShipping, `Order otomatis dari lunareafurniture.com | Akun website: ${customerEmail || customerId || '-'} | Login: ${customerAuthProvider || 'email'}${body.note ? ` | Catatan: ${cleanText(body.note)}` : ''}`), orderId),
          shippingService,
          shippingAddress,
          shippingAddressDetail: shippingAddress || null,
          createdBy,
        },
        { transaction, websiteOrderIdentity: true } as { transaction: any; websiteOrderIdentity: boolean }
      );

      for (const [index, item] of mappedItems.entries()) {
        const savedItem = await SaleItem.create({ saleId: sale.id, ...item }, { transaction });
        identities.push({ saleItemId: savedItem.id, ...sourceIdentities[index] });

        if (item.itemType !== 'PRODUCT' || !item.productId) continue;

        const product = await Product.findByPk(item.productId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!product) throw new AppError('Produk pesanan tidak ditemukan', 422);

        const stockBefore = product.stock;
        await product.update({ stock: stockBefore - item.quantity }, { transaction });

        if (item.variantName) {
          const variant = resolvedVariants.get(JSON.stringify([item.productId, item.variantName]));
          if (variant) {
            await variant.update({ stock: variant.stock - item.quantity }, { transaction });
          }
        }

        await StockMovement.create(
          {
            productId: item.productId,
            type: MovementType.OUT,
            quantity: item.quantity,
            stockBefore,
            stockAfter: stockBefore - item.quantity,
            reference: `WEB:${orderId}`,
            notes: `Order website Lunarea${item.variantName ? ` (Varian: ${item.variantName})` : ''}`,
            createdBy,
          },
          { transaction }
        );
      }

      await sale.update({ notes: appendWebsiteIdentities(sale.notes || '', identities) }, { transaction, websiteIdentitySnapshot: true } as any);
      await transaction.commit();

      try {
      socketService.emitToAdmins('approval:pending', {
        message: 'Order website Lunarea masuk',
        saleId: sale.id,
        saleNumber: sale.saleNumber,
        customerName: sale.customerName,
        totalAmount: `Rp ${Number(sale.totalAmount || 0).toLocaleString('id-ID')}`,
      });
      socketService.broadcastDataRefresh('sales');
      } catch (_) { /* Committed order remains acknowledged even when live notifications fail. */ }

      return successResponse(res, { ...sale.toJSON(), website_order_id: orderId, fulfillment: websiteFulfillment(sale), tracking_number: websiteShippingReference(sale.notes).awb, shipping_pricing_recorded: !!body.shipping_pricing }, 'Order website Lunarea berhasil masuk sistem', 201);
    } catch (error) {
      if (transaction && !transaction.finished) await transaction.rollback();
      return next(error);
    }
  },

  async importLunareaReturn(req: Request, res: Response, next: NextFunction) {
    const token = String(req.headers['x-luna-webhook-token'] || req.headers['x-webhook-token'] || '');
    const expectedToken = String(process.env.LUNA_WEB_ORDER_TOKEN || '');

    if (!expectedToken || token !== expectedToken) {
      return res.status(401).json({ success: false, message: 'Invalid webhook token' });
    }

    const paymentLane = websitePaymentEnvironment(req.body || {});
    if (paymentLane === 'invalid') return res.status(400).json({ success: false, message: 'Invalid payment environment' });
    if (paymentLane === 'sandbox') {
      return successResponse(res, { skipped: true, reason: 'sandbox_order' }, 'Order uji tidak masuk operasional produksi');
    }

    const transaction = await sequelize.transaction();

    try {
      const body = req.body || {};
      const orderId = cleanText(body.order_id);
      const customerId = cleanText(body.customer_id);
      const customerEmail = cleanText(body.customer_email);
      const customerAuthProvider = cleanText(body.customer_auth_provider || 'email');
      const reason = cleanText(body.reason);
      const solution = cleanText(body.solution);
      const items = Array.isArray(body.items) ? body.items : [];
      const dryRun = String(req.headers['x-luna-dry-run'] || body.dry_run || '').toLowerCase() === 'true';
      const isGuestReturn = String(body.is_guest || '').toLowerCase() === 'true';

      if (!orderId || !orderId.toUpperCase().startsWith('L')) {
        throw new AppError('Order Lunarea tidak valid', 400);
      }
      if (isGuestReturn || (!customerId && !customerEmail)) {
        throw new AppError('Retur website wajib berasal dari akun customer', 400);
      }
      if (reason.length < 5) {
        throw new AppError('Alasan retur wajib diisi minimal 5 karakter', 400);
      }
      if (!items.length) {
        throw new AppError('Minimal 1 item retur wajib dipilih', 400);
      }

      const sale = await resolveWebsiteOrder(orderId, transaction, [
          {
            model: SaleItem,
            as: 'items',
            include: [{ model: Product, as: 'product' }],
          },
        ]);

      if (!sale) {
        throw new AppError('Order website belum ditemukan di Luna Sistem', 404);
      }

      const activeReturn = await SaleReturn.findOne({
        where: {
          saleId: sale.id,
          status: {
            [Op.notIn]: [SaleReturnStatus.REJECTED, SaleReturnStatus.COMPLETED],
          },
        },
        transaction,
      });
      if (activeReturn) {
        await transaction.commit();
        return successResponse(res, activeReturn, 'Pengajuan retur order ini sudah masuk sistem', 200);
      }

      const returnedQtyMap = await getExistingReturnedQtyMap(sale.id, transaction);
      const resolvedItems: Array<{
        saleItem: SaleItem;
        qtyRequested: number;
        note: string;
      }> = [];

      for (const item of items) {
        const qtyRequested = Number(item.qty_requested || item.qtyRequested || item.quantity || 0);
        if (!Number.isInteger(qtyRequested) || qtyRequested <= 0) {
          throw new AppError('Qty retur harus bilangan bulat lebih dari 0', 400);
        }

        const saleItem = await resolveSaleItemForWebsiteReturn(sale, item, transaction);
        if (!saleItem || !saleItem.productId) {
          throw new AppError(`Item retur belum cocok dengan master produk: ${cleanText(item.name || item.id)}`, 400);
        }

        const existingReturnedQty = returnedQtyMap.get(saleItem.id) || 0;
        if (existingReturnedQty + qtyRequested > saleItem.quantity) {
          throw new AppError(`Qty retur ${cleanText(item.name || item.id)} melebihi qty pembelian`, 400);
        }

        resolvedItems.push({
          saleItem,
          qtyRequested,
          note: cleanText(item.note),
        });
      }

      if (dryRun) {
        await transaction.rollback();
        return successResponse(
          res,
          {
            dryRun: true,
            saleNumber: sale.saleNumber,
            status: SaleReturnStatus.PENDING_REVIEW,
            itemCount: resolvedItems.length,
            reason,
            solution: solution || null,
          },
          'Dry run retur berhasil, data tidak disimpan',
          200
        );
      }

      const createdBy = await resolveCreatedBy();
      const evidencePhotos = Array.isArray(body.evidence_photos)
        ? body.evidence_photos.map(cleanText).filter(Boolean).slice(0, 5)
        : [];
      const fullReason = [
        reason,
        solution ? `Solusi diminta customer: ${solution}` : '',
        customerEmail ? `Email customer: ${customerEmail}` : '',
        customerId ? `ID akun website: ${customerId}` : '',
        cleanText(body.customer_phone) ? `HP customer: ${cleanText(body.customer_phone)}` : '',
        customerAuthProvider ? `Login customer: ${customerAuthProvider}` : '',
      ].filter(Boolean).join('\n');

      const createdReturn = await SaleReturn.create(
        {
          returnNumber: generateReturnNumber(),
          saleId: sale.id,
          requestedBy: createdBy,
          sourceType: ReturnSourceType.DIRECT,
          status: SaleReturnStatus.PENDING_REVIEW,
          reason: fullReason,
          requestDate: new Date(),
          evidencePhotos,
        },
        { transaction }
      );

      for (const item of resolvedItems) {
        await SaleReturnItem.create(
          {
            returnId: createdReturn.id,
            saleItemId: item.saleItem.id,
            productId: item.saleItem.productId!,
            variantName: item.saleItem.variantName || null,
            qtySold: item.saleItem.quantity,
            qtyRequested: item.qtyRequested,
            itemNotes: item.note || null,
          },
          { transaction }
        );
      }

      await auditService.log(
        {
          userId: createdBy,
          action: AuditAction.CREATE,
          entity: 'SaleReturn',
          entityId: createdReturn.id,
          before: null,
          after: {
            source: 'lunareafurniture.com',
            returnNumber: createdReturn.returnNumber,
            saleNumber: sale.saleNumber,
            status: createdReturn.status,
            items: resolvedItems.map((item) => ({
              saleItemId: item.saleItem.id,
              qtyRequested: item.qtyRequested,
              note: item.note,
            })),
          },
          ip: req.ip || req.socket.remoteAddress || '',
          userAgent: req.headers['user-agent'] || '',
        },
        transaction
      );

      await transaction.commit();

      socketService.emitToAdmins('notification:new', {
        message: 'Retur website Lunarea masuk',
        description: `Retur untuk order ${sale.saleNumber} menunggu review admin`,
        type: 'INFO',
      });
      socketService.broadcastDataRefresh('returns');

      return successResponse(res, createdReturn, 'Retur website Lunarea berhasil masuk sistem', 201);
    } catch (error) {
      await transaction.rollback();
      return next(error);
    }
  },
};
