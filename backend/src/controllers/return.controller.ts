import path from 'path';
import sharp from 'sharp';
import { NextFunction, Request, Response } from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import {
  AuditAction,
  Expense,
  MovementType,
  Product,
  ProductVariant,
  Sale,
  SaleItem,
  SaleReturn,
  SaleReturnDecision,
  SaleReturnItem,
  SaleReturnStatus,
  StockMovement,
  User,
} from '../models';
import { auditService } from '../services/audit.service';
import { socketService } from '../services/socket.service';
import { AppError } from '../utils/errors';
import { successResponse } from '../utils/response';
import { getLocalDateString } from '../utils/dateGuard';
import { returnEvidenceDir, returnReceivedDir } from '../middlewares/uploadReturn';

const eligibleSaleStatuses = ['PROCESSED', 'SETTLED', 'COMPLETED'];

type UploadedFileMap = { [fieldname: string]: Express.Multer.File[] } | undefined;

function generateReturnNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `RTR-${y}${m}${d}-${random}`;
}

async function storePhotos(files: Express.Multer.File[], directory: string, prefix: string) {
  const storedPhotos: string[] = [];

  for (const file of files) {
    const filename = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
    const absolutePath = path.join(directory, filename);

    await sharp(file.buffer)
      .rotate()
      .resize(1280, 1280, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 70 })
      .toFile(absolutePath);

    storedPhotos.push(
      directory === returnEvidenceDir
        ? `/uploads/returns/evidence/${filename}`
        : `/uploads/returns/received/${filename}`
    );
  }

  return storedPhotos;
}

function parseItemsPayload(rawItems: unknown) {
  if (Array.isArray(rawItems)) return rawItems;
  if (typeof rawItems === 'string') {
    try {
      const parsed = JSON.parse(rawItems);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      throw new AppError('Format item retur tidak valid', 400);
    }
  }
  return [];
}

async function getExistingReturnedQtyMap(saleId: string) {
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
  });

  const qtyMap = new Map<string, number>();
  for (const item of existingItems) {
    qtyMap.set(item.saleItemId, (qtyMap.get(item.saleItemId) || 0) + Number(item.qtyRequested || 0));
  }

  return qtyMap;
}

function ensureEligibleSaleStatus(status: string) {
  if (!eligibleSaleStatuses.includes(status)) {
    throw new AppError('Retur hanya bisa dibuat untuk penjualan yang sudah diproses, selesai, atau pelunasan', 400);
  }
}

async function resolveReplacementStock(options: {
  productId: string;
  variantName?: string | null;
  qty: number;
  transaction: any;
}) {
  const product = await Product.findByPk(options.productId, { transaction: options.transaction });
  if (!product) {
    throw new AppError('Produk pengganti tidak ditemukan', 404);
  }

  if (product.stock < options.qty) {
    throw new AppError(`Stok produk pengganti ${product.name} tidak mencukupi`, 400);
  }

  let variant = null;
  if (options.variantName) {
    variant = await ProductVariant.findOne({
      where: { productId: options.productId, value: options.variantName },
      transaction: options.transaction,
    });

    if (!variant) {
      throw new AppError(`Varian pengganti ${options.variantName} tidak ditemukan`, 404);
    }

    if (variant.stock < options.qty) {
      throw new AppError(`Stok varian pengganti ${options.variantName} tidak mencukupi`, 400);
    }
  }

  return { product, variant };
}

export const returnController = {
  async getEligibleSales(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Authentication required', 401);

      const q = String(req.query.q || '').trim();
      if (q.length < 2) {
        return successResponse(res, [], 'Eligible return sales retrieved', 200);
      }

      const where: any = {
        status: {
          [Op.in]: eligibleSaleStatuses,
        },
        isInitialBalance: false,
        [Op.or]: [
          { saleNumber: { [Op.like]: `%${q}%` } },
          { customerName: { [Op.like]: `%${q}%` } },
        ],
      };

      if (req.user.roleName === 'USER') {
        where.createdBy = req.user.id;
      }

      const sales = await Sale.findAll({
        where,
        include: [
          {
            model: SaleItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'sku', 'name', 'unit', 'stock', 'sellingPrice'],
              },
            ],
          },
        ],
        order: [['saleDate', 'DESC']],
        limit: 20,
      });

      return successResponse(res, sales, 'Eligible return sales retrieved', 200);
    } catch (error) {
      return next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      if (!req.user) throw new AppError('Authentication required', 401);

      const filesMap = (req.files as UploadedFileMap) || {};
      const evidencePhotos = filesMap.evidencePhotos || [];
      if (!evidencePhotos.length) {
        throw new AppError('Minimal 1 foto bukti retur wajib diunggah', 400);
      }
      if (evidencePhotos.length > 5) {
        throw new AppError('Maksimal 5 foto bukti retur', 400);
      }

      const { saleId, reason } = req.body;
      const items = parseItemsPayload(req.body.items);
      const requestDate =
        req.user.roleName === 'USER'
          ? getLocalDateString(new Date())
          : String(req.body.requestDate || getLocalDateString(new Date()));

      if (!saleId || String(reason || '').trim().length < 5) {
        throw new AppError('Penjualan dan alasan retur wajib diisi', 400);
      }
      if (!Array.isArray(items) || items.length === 0) {
        throw new AppError('Minimal 1 item retur wajib dipilih', 400);
      }

      const sale = await Sale.findByPk(saleId, {
        include: [
          {
            model: SaleItem,
            as: 'items',
            include: [{ model: Product, as: 'product' }],
          },
        ],
        transaction,
      });

      if (!sale) throw new AppError('Penjualan tidak ditemukan', 404);
      ensureEligibleSaleStatus(String(sale.status));

      if (req.user.roleName === 'USER' && sale.createdBy !== req.user.id) {
        throw new AppError('Anda hanya dapat membuat retur untuk penjualan milik sendiri', 403);
      }

      const existingQtyMap = await getExistingReturnedQtyMap(sale.id);
      const saleItemsById = new Map((sale.items || []).map((item) => [item.id, item]));

      for (const item of items) {
        const saleItem = saleItemsById.get(String(item.saleItemId || ''));
        const qtyRequested = Number(item.qtyRequested || 0);

        if (!saleItem) {
          throw new AppError('Ada item retur yang tidak sesuai dengan penjualan', 400);
        }
        if (!Number.isInteger(qtyRequested) || qtyRequested <= 0) {
          throw new AppError('Qty retur harus bilangan bulat lebih dari 0', 400);
        }
        const existingReturnedQty = existingQtyMap.get(saleItem.id) || 0;
        if (existingReturnedQty + qtyRequested > saleItem.quantity) {
          throw new AppError(`Qty retur untuk item ${saleItem.id} melebihi qty penjualan`, 400);
        }
      }

      const storedEvidencePhotos = await storePhotos(evidencePhotos, returnEvidenceDir, 'return-evidence');

      const createdReturn = await SaleReturn.create(
        {
          returnNumber: generateReturnNumber(),
          saleId: sale.id,
          requestedBy: req.user.id,
          status: SaleReturnStatus.PENDING_REVIEW,
          reason: String(reason).trim(),
          requestDate: new Date(requestDate),
          evidencePhotos: storedEvidencePhotos,
        },
        { transaction }
      );

      for (const item of items) {
        const saleItem = saleItemsById.get(String(item.saleItemId))!;
        await SaleReturnItem.create(
          {
            returnId: createdReturn.id,
            saleItemId: saleItem.id,
            productId: saleItem.productId,
            variantName: saleItem.variantName || null,
            qtySold: saleItem.quantity,
            qtyRequested: Number(item.qtyRequested),
          },
          { transaction }
        );
      }

      await auditService.log(
        {
          userId: req.user.id,
          action: AuditAction.CREATE,
          entity: 'SaleReturn',
          entityId: createdReturn.id,
          before: null,
          after: {
            returnNumber: createdReturn.returnNumber,
            saleId: createdReturn.saleId,
            status: createdReturn.status,
            items,
          },
          ip: req.ip || req.socket.remoteAddress || '',
          userAgent: req.headers['user-agent'] || '',
        },
        transaction
      );

      await transaction.commit();

      const result = await SaleReturn.findByPk(createdReturn.id, {
        include: [
          { model: Sale, as: 'sale' },
          {
            model: SaleReturnItem,
            as: 'items',
            include: [
              { model: SaleItem, as: 'saleItem' },
              { model: Product, as: 'product', attributes: ['id', 'sku', 'name', 'unit'] },
            ],
          },
        ],
      });

      socketService.emitToTCP('notification:new', {
        message: 'Pengajuan retur baru',
        description: `Retur ${createdReturn.returnNumber} menunggu review TCP`,
        type: 'INFO',
      });
      socketService.broadcastDataRefresh('returns');

      return successResponse(res, result, 'Retur berhasil diajukan', 201);
    } catch (error) {
      await transaction.rollback();
      return next(error);
    }
  },

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Authentication required', 401);

      const { page = 1, limit = 10, status = '', search = '' } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      const where: any = {};

      if (status) where.status = status;
      if (req.user.roleName === 'USER') where.requestedBy = req.user.id;
      if (search) {
        where[Op.or] = [
          { returnNumber: { [Op.like]: `%${String(search)}%` } },
          { '$sale.saleNumber$': { [Op.like]: `%${String(search)}%` } },
          { '$sale.customerName$': { [Op.like]: `%${String(search)}%` } },
        ];
      }

      const { count, rows } = await SaleReturn.findAndCountAll({
        where,
        include: [
          {
            model: Sale,
            as: 'sale',
            attributes: ['id', 'saleNumber', 'saleDate', 'customerName', 'status'],
          },
          {
            model: User,
            as: 'requester',
            attributes: ['id', 'fullName', 'username'],
          },
          {
            model: SaleReturnItem,
            as: 'items',
            attributes: ['id', 'qtyRequested', 'qtyReceived', 'resolution'],
          },
        ],
        distinct: true,
        limit: Number(limit),
        offset,
        order: [['createdAt', 'DESC']],
      });

      return successResponse(
        res,
        {
          returns: rows,
          pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / Number(limit)),
          },
        },
        'Return list retrieved successfully',
        200
      );
    } catch (error) {
      return next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Authentication required', 401);

      const record = await SaleReturn.findByPk(req.params.id, {
        include: [
          {
            model: Sale,
            as: 'sale',
            include: [
              {
                model: SaleItem,
                as: 'items',
                include: [{ model: Product, as: 'product', attributes: ['id', 'sku', 'name', 'unit'] }],
              },
            ],
          },
          {
            model: SaleReturnItem,
            as: 'items',
            include: [
              { model: SaleItem, as: 'saleItem' },
              { model: Product, as: 'product', attributes: ['id', 'sku', 'name', 'unit', 'stock'] },
              { model: Product, as: 'replacementProduct', attributes: ['id', 'sku', 'name', 'unit'] },
            ],
          },
          { model: User, as: 'requester', attributes: ['id', 'fullName', 'username'] },
          { model: User, as: 'reviewer', attributes: ['id', 'fullName', 'username'] },
          { model: User, as: 'receiver', attributes: ['id', 'fullName', 'username'] },
          { model: User, as: 'processor', attributes: ['id', 'fullName', 'username'] },
        ],
      });

      if (!record) throw new AppError('Data retur tidak ditemukan', 404);
      if (req.user.roleName === 'USER' && record.requestedBy !== req.user.id) {
        throw new AppError('Anda tidak berhak melihat retur ini', 403);
      }

      return successResponse(res, record, 'Return detail retrieved successfully', 200);
    } catch (error) {
      return next(error);
    }
  },

  async review(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      if (!req.user) throw new AppError('Authentication required', 401);

      const { action, rejectionReason } = req.body;
      const record = await SaleReturn.findByPk(req.params.id, { transaction });
      if (!record) throw new AppError('Data retur tidak ditemukan', 404);
      if (record.status !== SaleReturnStatus.PENDING_REVIEW) {
        throw new AppError('Retur ini sudah diproses review-nya', 400);
      }

      const normalizedAction = String(action || '').toUpperCase();
      if (!['APPROVE', 'REJECT'].includes(normalizedAction)) {
        throw new AppError('Aksi review tidak valid', 400);
      }
      if (normalizedAction === 'REJECT' && String(rejectionReason || '').trim().length < 5) {
        throw new AppError('Alasan penolakan wajib diisi minimal 5 karakter', 400);
      }

      const before = record.toJSON();
      await record.update(
        {
          status:
            normalizedAction === 'APPROVE'
              ? SaleReturnStatus.WAITING_ITEM_RETURN
              : SaleReturnStatus.REJECTED,
          reviewedBy: req.user.id,
          reviewedAt: new Date(),
          rejectionReason:
            normalizedAction === 'REJECT' ? String(rejectionReason).trim() : null,
        },
        { transaction }
      );

      await auditService.log(
        {
          userId: req.user.id,
          action: AuditAction.UPDATE,
          entity: 'SaleReturn',
          entityId: record.id,
          before,
          after: record.toJSON(),
          ip: req.ip || req.socket.remoteAddress || '',
          userAgent: req.headers['user-agent'] || '',
        },
        transaction
      );

      await transaction.commit();
      socketService.broadcastDataRefresh('returns');

      return successResponse(
        res,
        record,
        normalizedAction === 'APPROVE' ? 'Retur disetujui' : 'Retur ditolak',
        200
      );
    } catch (error) {
      await transaction.rollback();
      return next(error);
    }
  },

  async receive(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      if (!req.user) throw new AppError('Authentication required', 401);

      const record = await SaleReturn.findByPk(req.params.id, { transaction });
      if (!record) throw new AppError('Data retur tidak ditemukan', 404);
      if (record.status !== SaleReturnStatus.WAITING_ITEM_RETURN) {
        throw new AppError('Retur ini belum siap diterima', 400);
      }

      const filesMap = (req.files as UploadedFileMap) || {};
      const receivedPhotos = filesMap.receivedPhotos || [];
      const storedReceivedPhotos = receivedPhotos.length
        ? await storePhotos(receivedPhotos, returnReceivedDir, 'return-received')
        : [];

      const before = record.toJSON();
      await record.update(
        {
          status: SaleReturnStatus.ITEM_RECEIVED,
          receivedBy: req.user.id,
          receivedAt: new Date(),
          receivedPhotos: storedReceivedPhotos.length ? storedReceivedPhotos : record.receivedPhotos,
        },
        { transaction }
      );

      await auditService.log(
        {
          userId: req.user.id,
          action: AuditAction.UPDATE,
          entity: 'SaleReturn',
          entityId: record.id,
          before,
          after: record.toJSON(),
          ip: req.ip || req.socket.remoteAddress || '',
          userAgent: req.headers['user-agent'] || '',
        },
        transaction
      );

      await transaction.commit();
      socketService.broadcastDataRefresh('returns');

      return successResponse(res, record, 'Barang retur berhasil dikonfirmasi diterima', 200);
    } catch (error) {
      await transaction.rollback();
      return next(error);
    }
  },

  async restock(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      if (!req.user) throw new AppError('Authentication required', 401);

      const record = await SaleReturn.findByPk(req.params.id, {
        include: [{ model: SaleReturnItem, as: 'items' }],
        transaction,
      });
      if (!record) throw new AppError('Data retur tidak ditemukan', 404);
      if (record.status !== SaleReturnStatus.ITEM_RECEIVED) {
        throw new AppError('Retur belum berada pada tahap inspeksi', 400);
      }

      const payloadItems = parseItemsPayload(req.body.items);
      if (!payloadItems.length) throw new AppError('Detail item restock wajib diisi', 400);

      const returnItems = (record.items || []) as SaleReturnItem[];
      const itemsById = new Map<string, SaleReturnItem>(returnItems.map((item) => [item.id, item]));

      for (const item of payloadItems) {
        const returnItem = itemsById.get(String(item.returnItemId || ''));
        const qtyReceived = Number(item.qtyReceived || 0);
        if (!returnItem) throw new AppError('Item retur tidak ditemukan', 400);
        if (!Number.isInteger(qtyReceived) || qtyReceived <= 0 || qtyReceived > returnItem.qtyRequested) {
          throw new AppError('Qty diterima untuk restock tidak valid', 400);
        }

        const product = await Product.findByPk(returnItem.productId, { transaction });
        if (!product) throw new AppError('Produk retur tidak ditemukan', 404);

        const stockBefore = product.stock;
        await product.update({ stock: product.stock + qtyReceived }, { transaction });

        if (returnItem.variantName) {
          const variant = await ProductVariant.findOne({
            where: { productId: returnItem.productId, value: returnItem.variantName },
            transaction,
          });
          if (variant) {
            await variant.update({ stock: variant.stock + qtyReceived }, { transaction });
          }
        }

        await StockMovement.create(
          {
            productId: returnItem.productId,
            type: MovementType.IN,
            quantity: qtyReceived,
            stockBefore,
            stockAfter: stockBefore + qtyReceived,
            reference: `RETURN_RESTOCK:${record.returnNumber}`,
            notes: `Retur masuk stok${returnItem.variantName ? ` (Varian: ${returnItem.variantName})` : ''}`,
            createdBy: req.user.id,
          },
          { transaction }
        );

        await returnItem.update(
          {
            qtyReceived,
            resolution: SaleReturnDecision.RESTOCK,
            replacementProductId: null,
            replacementVariantName: null,
            replacementQty: null,
          },
          { transaction }
        );
      }

      const before = record.toJSON();
      await record.update(
        {
          status: SaleReturnStatus.RESTOCKED,
          inspectionDecision: SaleReturnDecision.RESTOCK,
          inspectionNotes: String(req.body.inspectionNotes || '').trim() || null,
          processedBy: req.user.id,
          processedAt: new Date(),
          financialImpactAmount: '0',
        },
        { transaction }
      );

      await auditService.log(
        {
          userId: req.user.id,
          action: AuditAction.UPDATE,
          entity: 'SaleReturn',
          entityId: record.id,
          before,
          after: record.toJSON(),
          ip: req.ip || req.socket.remoteAddress || '',
          userAgent: req.headers['user-agent'] || '',
        },
        transaction
      );

      await transaction.commit();
      socketService.broadcastDataRefresh('returns');
      socketService.broadcastDataRefresh('stock');

      return successResponse(res, record, 'Retur berhasil dimasukkan kembali ke stok', 200);
    } catch (error) {
      await transaction.rollback();
      return next(error);
    }
  },

  async damaged(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      if (!req.user) throw new AppError('Authentication required', 401);

      const record = await SaleReturn.findByPk(req.params.id, {
        include: [{ model: SaleReturnItem, as: 'items' }],
        transaction,
      });
      if (!record) throw new AppError('Data retur tidak ditemukan', 404);
      if (record.status !== SaleReturnStatus.ITEM_RECEIVED) {
        throw new AppError('Retur belum berada pada tahap inspeksi', 400);
      }

      const payloadItems = parseItemsPayload(req.body.items);
      if (!payloadItems.length) throw new AppError('Detail item retur rusak wajib diisi', 400);

      const returnItems = (record.items || []) as SaleReturnItem[];
      const itemsById = new Map<string, SaleReturnItem>(returnItems.map((item) => [item.id, item]));
      let calculatedImpact = 0;

      for (const item of payloadItems) {
        const returnItem = itemsById.get(String(item.returnItemId || ''));
        const qtyReceived = Number(item.qtyReceived || 0);
        if (!returnItem) throw new AppError('Item retur tidak ditemukan', 400);
        if (!Number.isInteger(qtyReceived) || qtyReceived <= 0 || qtyReceived > returnItem.qtyRequested) {
          throw new AppError('Qty diterima untuk retur rusak tidak valid', 400);
        }

        const saleItem = await SaleItem.findByPk(returnItem.saleItemId, { transaction });
        if (!saleItem) throw new AppError('Data item penjualan asal tidak ditemukan', 404);
        const unitValue = Number(saleItem.subtotal) / Number(saleItem.quantity || 1);
        calculatedImpact += qtyReceived * unitValue;

        await returnItem.update(
          {
            qtyReceived,
            resolution: SaleReturnDecision.DAMAGED,
            replacementProductId: null,
            replacementVariantName: null,
            replacementQty: null,
          },
          { transaction }
        );
      }

      const financialImpactAmount =
        Number(req.body.financialImpactAmount || 0) > 0
          ? Number(req.body.financialImpactAmount)
          : calculatedImpact;

      await Expense.create(
        {
          category: 'OTHER',
          description: `Retur rusak ${record.returnNumber}`,
          amount: financialImpactAmount.toFixed(2),
          expenseDate: new Date(),
          notes: String(req.body.inspectionNotes || '').trim() || `Kerugian retur ${record.returnNumber}`,
          receiptDocument: null,
          createdBy: req.user.id,
        },
        { transaction }
      );

      const before = record.toJSON();
      await record.update(
        {
          status: SaleReturnStatus.DAMAGED,
          inspectionDecision: SaleReturnDecision.DAMAGED,
          inspectionNotes: String(req.body.inspectionNotes || '').trim() || null,
          processedBy: req.user.id,
          processedAt: new Date(),
          financialImpactAmount: financialImpactAmount.toFixed(2),
        },
        { transaction }
      );

      await auditService.log(
        {
          userId: req.user.id,
          action: AuditAction.UPDATE,
          entity: 'SaleReturn',
          entityId: record.id,
          before,
          after: record.toJSON(),
          ip: req.ip || req.socket.remoteAddress || '',
          userAgent: req.headers['user-agent'] || '',
        },
        transaction
      );

      await transaction.commit();
      socketService.broadcastDataRefresh('returns');
      socketService.broadcastDataRefresh('expense');
      socketService.broadcastDataRefresh('finance');

      return successResponse(res, record, 'Retur ditandai tidak layak pakai', 200);
    } catch (error) {
      await transaction.rollback();
      return next(error);
    }
  },

  async resend(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      if (!req.user) throw new AppError('Authentication required', 401);

      const record = await SaleReturn.findByPk(req.params.id, {
        include: [{ model: SaleReturnItem, as: 'items' }],
        transaction,
      });
      if (!record) throw new AppError('Data retur tidak ditemukan', 404);
      if (record.status !== SaleReturnStatus.ITEM_RECEIVED) {
        throw new AppError('Retur belum berada pada tahap inspeksi', 400);
      }

      const payloadItems = parseItemsPayload(req.body.items);
      if (!payloadItems.length) throw new AppError('Detail item kirim ulang wajib diisi', 400);

      const resendShippingService = String(req.body.resendShippingService || '').trim();
      const resendShippingCost = Number(req.body.resendShippingCost || 0);
      if (!resendShippingService) {
        throw new AppError('Jasa pengiriman ulang wajib dipilih', 400);
      }
      if (resendShippingCost < 0) {
        throw new AppError('Biaya pengiriman ulang tidak valid', 400);
      }

      const returnItems = (record.items || []) as SaleReturnItem[];
      const itemsById = new Map<string, SaleReturnItem>(returnItems.map((item) => [item.id, item]));

      for (const item of payloadItems) {
        const returnItem = itemsById.get(String(item.returnItemId || ''));
        if (!returnItem) throw new AppError('Item retur tidak ditemukan', 400);

        const qtyReceived = Number(item.qtyReceived || 0);
        const replacementQty = Number(item.replacementQty || qtyReceived);
        if (!Number.isInteger(qtyReceived) || qtyReceived <= 0 || qtyReceived > returnItem.qtyRequested) {
          throw new AppError('Qty diterima untuk kirim ulang tidak valid', 400);
        }
        if (!Number.isInteger(replacementQty) || replacementQty <= 0) {
          throw new AppError('Qty pengganti tidak valid', 400);
        }

        const replacementProductId = String(item.replacementProductId || returnItem.productId);
        const replacementVariantName =
          item.replacementVariantName !== undefined ? String(item.replacementVariantName || '') || null : returnItem.variantName;

        const { product, variant } = await resolveReplacementStock({
          productId: replacementProductId,
          variantName: replacementVariantName,
          qty: replacementQty,
          transaction,
        });

        const stockBefore = product.stock;
        await product.update({ stock: product.stock - replacementQty }, { transaction });

        if (variant) {
          await variant.update({ stock: variant.stock - replacementQty }, { transaction });
        }

        await StockMovement.create(
          {
            productId: replacementProductId,
            type: MovementType.OUT,
            quantity: replacementQty,
            stockBefore,
            stockAfter: stockBefore - replacementQty,
            reference: `RETURN_RESEND:${record.returnNumber}`,
            notes: `Kirim ulang retur${replacementVariantName ? ` (Varian: ${replacementVariantName})` : ''}`,
            createdBy: req.user.id,
          },
          { transaction }
        );

        await returnItem.update(
          {
            qtyReceived,
            resolution: SaleReturnDecision.RESEND,
            replacementProductId,
            replacementVariantName,
            replacementQty,
          },
          { transaction }
        );
      }

      if (resendShippingCost > 0) {
        await Expense.create(
          {
            category: 'SHIPPING',
            description: `Ongkir kirim ulang retur ${record.returnNumber}`,
            amount: resendShippingCost.toFixed(2),
            expenseDate: new Date(),
            notes: `Jasa kirim: ${resendShippingService}`,
            receiptDocument: null,
            createdBy: req.user.id,
          },
          { transaction }
        );
      }

      const before = record.toJSON();
      await record.update(
        {
          status: SaleReturnStatus.RESENT,
          inspectionDecision: SaleReturnDecision.RESEND,
          inspectionNotes: String(req.body.inspectionNotes || '').trim() || null,
          processedBy: req.user.id,
          processedAt: new Date(),
          resendShippingService,
          resendShippingCost: resendShippingCost.toFixed(2),
          financialImpactAmount: resendShippingCost.toFixed(2),
        },
        { transaction }
      );

      await auditService.log(
        {
          userId: req.user.id,
          action: AuditAction.UPDATE,
          entity: 'SaleReturn',
          entityId: record.id,
          before,
          after: record.toJSON(),
          ip: req.ip || req.socket.remoteAddress || '',
          userAgent: req.headers['user-agent'] || '',
        },
        transaction
      );

      await transaction.commit();
      socketService.broadcastDataRefresh('returns');
      socketService.broadcastDataRefresh('stock');
      socketService.broadcastDataRefresh('expense');
      socketService.broadcastDataRefresh('finance');

      return successResponse(res, record, 'Kirim ulang retur berhasil diproses', 200);
    } catch (error) {
      await transaction.rollback();
      return next(error);
    }
  },
};
