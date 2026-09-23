import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import {
  Product,
  ProductVariant,
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

function cleanText(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function itemBaseName(name: string) {
  return cleanText(name.replace(/\s*\([^)]*\)\s*$/, ''));
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
  return ![
    'biaya admin',
    'biaya ongkir',
    'voucher',
    'flash sale',
    'potongan preorder',
  ].some((keyword) => name.includes(keyword) || id.includes(keyword));
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

async function findProductForWebsiteItem(item: any, baseName: string, transaction: any) {
  const websiteId = cleanText(item?.id);
  const rawMap = String(process.env.LUNA_WEB_PRODUCT_MAP || '');
  if (websiteId && rawMap) {
    try {
      const parsedMap = JSON.parse(rawMap) as Record<string, string>;
      const mappedProductId = parsedMap[websiteId] || parsedMap[baseName];
      if (mappedProductId) {
        const mappedProduct = await Product.findByPk(mappedProductId, { transaction });
        if (mappedProduct) return mappedProduct;
      }
    } catch (_) {
      // lanjutkan pencarian normal jika format env mapping belum valid
    }
  }

  const where: any = {
    [Op.or]: [
      ...(websiteId ? [{ sku: websiteId }, { id: websiteId }] : []),
      ...(baseName ? [{ name: baseName }] : []),
    ],
  };

  return Product.findOne({ where, transaction });
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

async function resolveSaleItemForWebsiteReturn(sale: Sale, item: any, transaction: any) {
  const requestedId = cleanText(item?.id);
  const requestedName = cleanText(item?.name);
  const requestedBaseName = itemBaseName(requestedName);

  for (const saleItem of sale.items || []) {
    const product = (saleItem as any).product as Product | undefined;
    const saleItemName = cleanText(product?.name || saleItem.componentName || '');
    const saleItemBaseName = itemBaseName(saleItemName);

    if (
      (requestedId && product && (requestedId === product.id || requestedId === product.sku)) ||
      (requestedName && requestedName === saleItemName) ||
      (requestedBaseName && requestedBaseName === saleItemBaseName)
    ) {
      if (saleItem.productId) {
        return saleItem;
      }

      const matchedProduct = await findProductForWebsiteItem(item, requestedBaseName || saleItemBaseName, transaction);
      if (matchedProduct) {
        await saleItem.update({ productId: matchedProduct.id, itemType: 'PRODUCT' }, { transaction });
        saleItem.productId = matchedProduct.id;
        return saleItem;
      }
    }
  }

  return null;
}

export const webOrderIntegrationController = {
  async importLunareaOrder(req: Request, res: Response, next: NextFunction) {
    const token = String(req.headers['x-luna-webhook-token'] || req.headers['x-webhook-token'] || '');
    const expectedToken = String(process.env.LUNA_WEB_ORDER_TOKEN || '');

    if (!expectedToken || token !== expectedToken) {
      return res.status(401).json({ success: false, message: 'Invalid webhook token' });
    }

    const transaction = await sequelize.transaction();

    try {
      const body = req.body || {};
      const orderId = cleanText(body.order_id);
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
      if (isGuestOrder || (!customerId && !customerEmail)) {
        throw new AppError('Order website wajib berasal dari akun customer', 400);
      }

      if (status !== 'Proses') {
        await transaction.rollback();
        return successResponse(res, { skipped: true, reason: 'Status belum dibayar' }, 'Order belum masuk proses', 200);
      }

      const dryRun = String(req.headers['x-luna-dry-run'] || body.dry_run || '').toLowerCase() === 'true';
      if (dryRun) {
        await transaction.rollback();
        return successResponse(
          res,
          {
            dryRun: true,
            saleNumber: orderId,
            status: 'WAITING_APPROVAL',
            platform: 'WEBSITE',
            customerId: customerId || customerEmail || null,
            customerEmail: customerEmail || null,
            customerName: customerName || null,
            customerPhone: customerPhone || null,
            customerAuthProvider: customerAuthProvider || 'email',
            shippingAddress: cleanText(normalizeAddress(body.alamat_pen)),
            itemCount: Array.isArray(body.items) ? body.items.filter(isOperationalItem).length : 0,
          },
          'Dry run berhasil, data tidak disimpan',
          200
        );
      }

      const existingSale = await Sale.findOne({ where: { saleNumber: orderId }, transaction });
      if (existingSale) {
        await transaction.commit();
        return successResponse(res, existingSale, 'Order website sudah pernah masuk sistem', 200);
      }

      const createdBy = await resolveCreatedBy();
      const items = Array.isArray(body.items) ? body.items.filter(isOperationalItem) : [];
      if (items.length === 0) {
        throw new AppError('Item order kosong', 400);
      }

      const saleDate = body.transaction_time ? new Date(String(body.transaction_time)) : new Date();
      const shippingAddress = cleanText(normalizeAddress(body.alamat_pen));
      const shippingService = cleanText(body.kurir) || 'Website Lunarea';
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

      let calculatedTotal = 0;
      const stockRequired = new Map<string, number>();

      for (const item of items) {
        const name = cleanText(item.name);
        const baseName = itemBaseName(name);
        const variantName = itemVariantName(name);
        const quantity = Math.max(1, Number(item.quantity || 1));
        const price = Number(item.price ?? item.value ?? 0);
        const discount = Number(item.discount || 0);
        const subtotal = quantity * price - discount;
        calculatedTotal += subtotal;

        const product = await findProductForWebsiteItem(item, baseName, transaction);
        if (product) {
          const finalVariant = variantName || null;
          const key = `${product.id}|${finalVariant || ''}`;
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
        } else {
          mappedItems.push({
            itemType: 'COMPONENT',
            productId: null,
            componentName: name || baseName || cleanText(item.id) || 'Produk Website',
            componentNotes: `Item website belum cocok dengan master produk. ID website: ${cleanText(item.id) || '-'}`,
            variantName: null,
            quantity,
            price,
            discount,
            subtotal,
          });
        }
      }

      for (const [key, totalQty] of stockRequired) {
        const [productId, variantName] = key.split('|');
        const product = await Product.findByPk(productId, { transaction });
        if (!product) continue;

        if (variantName) {
          const variant = await ProductVariant.findOne({ where: { productId, value: variantName }, transaction });
          if (variant && variant.stock < totalQty) {
            throw new AppError(`Stok varian ${product.name} (${variantName}) tidak cukup`, 400);
          }
        } else if (product.stock < totalQty) {
          throw new AppError(`Stok ${product.name} tidak cukup`, 400);
        }
      }

      const sale = await Sale.create(
        {
          saleNumber: orderId,
          saleDate,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          totalAmount: grossAmount || calculatedTotal,
          paymentMethod: 'TRANSFER' as any,
          platform: 'WEBSITE' as any,
          saleType: 'PRODUCT' as any,
          status: 'WAITING_APPROVAL' as any,
          notes: `Order otomatis dari lunareafurniture.com | Akun website: ${customerEmail || customerId || '-'} | Login: ${customerAuthProvider || 'email'}${body.note ? ` | Catatan: ${cleanText(body.note)}` : ''}`,
          shippingService,
          shippingAddress,
          shippingAddressDetail: shippingAddress || null,
          createdBy,
        },
        { transaction }
      );

      for (const item of mappedItems) {
        await SaleItem.create({ saleId: sale.id, ...item }, { transaction });

        if (item.itemType !== 'PRODUCT' || !item.productId) continue;

        const product = await Product.findByPk(item.productId, { transaction });
        if (!product) continue;

        const stockBefore = product.stock;
        await product.update({ stock: stockBefore - item.quantity }, { transaction });

        if (item.variantName) {
          const variant = await ProductVariant.findOne({
            where: { productId: item.productId, value: item.variantName },
            transaction,
          });
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

      await transaction.commit();

      socketService.emitToAdmins('approval:pending', {
        message: 'Order website Lunarea masuk',
        saleId: sale.id,
        saleNumber: sale.saleNumber,
        customerName: sale.customerName,
        totalAmount: `Rp ${Number(sale.totalAmount || 0).toLocaleString('id-ID')}`,
      });
      socketService.broadcastDataRefresh('sales');

      return successResponse(res, sale, 'Order website Lunarea berhasil masuk sistem', 201);
    } catch (error) {
      await transaction.rollback();
      return next(error);
    }
  },

  async importLunareaReturn(req: Request, res: Response, next: NextFunction) {
    const token = String(req.headers['x-luna-webhook-token'] || req.headers['x-webhook-token'] || '');
    const expectedToken = String(process.env.LUNA_WEB_ORDER_TOKEN || '');

    if (!expectedToken || token !== expectedToken) {
      return res.status(401).json({ success: false, message: 'Invalid webhook token' });
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

      const sale = await Sale.findOne({
        where: { saleNumber: orderId },
        include: [
          {
            model: SaleItem,
            as: 'items',
            include: [{ model: Product, as: 'product' }],
          },
        ],
        transaction,
      });

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
