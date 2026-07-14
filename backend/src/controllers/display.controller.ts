import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import {
  Category,
  DisplayMovementType,
  DisplayProduct,
  DisplayRequestStatus,
  DisplayRequestType,
  DisplayReturn,
  DisplayReturnItem,
  DisplayReturnStatus,
  DisplayStockMovement,
  DisplayStockRequest,
  Product,
  ProductVariant,
  User,
} from '../models';
import { successResponse } from '../utils/response';
import { AppError } from '../utils/errors';
import { auditService } from '../services/audit.service';
import { socketService } from '../services/socket.service';

function isAdminRole(roleName?: string) {
  return roleName === 'ADMIN' || roleName === 'SUPER_ADMIN';
}

function isTcpRole(roleName?: string) {
  return roleName === 'TCP';
}

function parsePositiveInt(value: unknown, field: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new AppError(`${field} harus berupa angka 0 atau lebih`, 400);
  return parsed;
}

function asDateOnly(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

async function ensureDisplaySlot(productId: string, userId: string, transaction?: any) {
  const product = await Product.findByPk(productId, { include: [{ model: Category, as: 'category' }], transaction });
  if (!product) throw new AppError('Produk asli tidak ditemukan', 404);

  const existing = await DisplayProduct.findOne({ where: { productId }, transaction });
  if (existing) return { slot: existing, product };

  const slot = await DisplayProduct.create(
    {
      productId: product.id,
      sku: `DSP-${product.id}`.slice(0, 80),
      name: product.name,
      description: product.description,
      categoryId: null,
      supplierId: null,
      displayLocation: null,
      unit: product.unit || 'pcs',
      stock: 0,
      minStock: 0,
      slotLimit: 1,
      estimatedValue: String(product.sellingPrice ?? 0),
      condition: 'GOOD' as any,
      status: 'STORED' as any,
      notes: null,
      isActive: true,
    },
    { transaction }
  );

  await auditService.log(
    { userId, action: 'CREATE' as any, entity: 'DisplaySlot', entityId: slot.id, before: null, after: slot.toJSON(), ip: '', userAgent: '' },
    transaction
  );
  return { slot, product };
}

async function createDisplayMovement(params: {
  slot: DisplayProduct;
  type: DisplayMovementType;
  quantity: number;
  stockAfter: number;
  reference?: string;
  notes?: string;
  userId: string;
  transaction: any;
}) {
  return DisplayStockMovement.create(
    {
      productId: params.slot.id,
      type: params.type,
      quantity: params.quantity,
      stockBefore: params.slot.stock,
      stockAfter: params.stockAfter,
      reference: params.reference || null,
      notes: params.notes || null,
      createdBy: params.userId,
    },
    { transaction: params.transaction }
  );
}

function slotView(product: any) {
  const slot = product.displaySlot || null;
  const used = Number(slot?.stock ?? 0);
  const limit = Number(slot?.slotLimit ?? 1);
  const available = Math.max(limit - Math.min(Math.max(used, 0), limit), 0);
  return {
    id: slot?.id || null,
    productId: product.id,
    sku: product.sku,
    name: product.name,
    description: product.description,
    categoryId: product.categoryId,
    displayLocation: slot?.displayLocation || null,
    unit: product.unit,
    salesStock: product.stock,
    stock: used,
    slotLimit: limit,
    displayUsed: used,
    displayAvailable: available,
    needsDisplayRequest: used <= 0,
    minStock: 0,
    estimatedValue: slot?.estimatedValue || product.sellingPrice,
    condition: slot?.condition || 'GOOD',
    status: slot?.status || 'STORED',
    notes: slot?.notes || null,
    isActive: product.isActive,
    createdAt: slot?.createdAt || product.createdAt,
    updatedAt: slot?.updatedAt || product.updatedAt,
    sourceProduct: product,
    category: product.category,
    supplier: null,
  };
}

async function generateLetterNumber(transaction: any, date = new Date()) {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const latest = await DisplayReturn.findOne({
    where: { letterMonth: month, letterYear: year },
    order: [['letterSequence', 'DESC']],
    transaction,
  });
  const sequence = (latest?.letterSequence || 0) + 1;
  const letterNumber = `${String(sequence).padStart(3, '0')}/LN/${String(month).padStart(2, '0')}/${year}`;
  return { sequence, month, year, letterNumber };
}

const returnInclude = [
  { model: DisplayReturnItem, as: 'items', include: [{ model: Product, as: 'product' }, { model: ProductVariant, as: 'variant' }, { model: DisplayProduct, as: 'displayProduct' }] },
  { model: User, as: 'creator', attributes: ['id', 'fullName', 'username'] },
  { model: User, as: 'sender', attributes: ['id', 'fullName', 'username'] },
  { model: User, as: 'receiver', attributes: ['id', 'fullName', 'username'] },
  { model: User, as: 'completer', attributes: ['id', 'fullName', 'username'] },
];

export const displayController = {
  async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const requestWhere: any = { status: DisplayRequestStatus.PENDING };
      if (!isAdminRole(req.user?.roleName)) requestWhere.requestedBy = req.user!.id;
      const returnWhere: any = {};
      if (isTcpRole(req.user?.roleName)) returnWhere.status = { [Op.in]: [DisplayReturnStatus.READY_TO_SEND, DisplayReturnStatus.SENT] };
      if (!isAdminRole(req.user?.roleName) && !isTcpRole(req.user?.roleName)) returnWhere.createdBy = req.user!.id;

      const [totalProducts, activeSlots, pendingRequests, activeReturns] = await Promise.all([
        Product.count({ where: { isActive: true } }),
        DisplayProduct.count({ where: { isActive: true, stock: { [Op.gt]: 0 } } }),
        DisplayStockRequest.count({ where: requestWhere }),
        DisplayReturn.count({ where: returnWhere }),
      ]);

      return successResponse(res, { totalProducts, activeSlots, pendingRequests, activeReturns, badgeCount: pendingRequests + activeReturns }, 'Ringkasan sistem display berhasil diambil', 200);
    } catch (error) { return next(error); }
  },

  async getCategories(_req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await Category.findAll({ where: { isActive: true }, order: [['name', 'ASC']] });
      return successResponse(res, categories, 'Kategori produk berhasil diambil', 200);
    } catch (error) { return next(error); }
  },
  async createCategory(_req: Request, _res: Response, next: NextFunction) { return next(new AppError('Kategori display memakai kategori produk asli', 400)); },
  async updateCategory(_req: Request, _res: Response, next: NextFunction) { return next(new AppError('Kategori display memakai kategori produk asli', 400)); },
  async getSuppliers(_req: Request, res: Response, next: NextFunction) {
    try { return successResponse(res, [], 'Supplier display mengikuti data produk/pembelian asli', 200); } catch (error) { return next(error); }
  },
  async createSupplier(_req: Request, _res: Response, next: NextFunction) { return next(new AppError('Supplier display tidak dibuat terpisah', 400)); },
  async updateSupplier(_req: Request, _res: Response, next: NextFunction) { return next(new AppError('Supplier display tidak dibuat terpisah', 400)); },

  async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, search = '', categoryId = '', status = '' } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      const where: any = { isActive: true };
      if (categoryId) where.categoryId = categoryId;
      if (search) where[Op.or] = [{ sku: { [Op.like]: `%${search}%` } }, { name: { [Op.like]: `%${search}%` } }];
      const include: any[] = [
        { model: Category, as: 'category' },
        { model: ProductVariant, as: 'variantItems' },
        { model: DisplayProduct, as: 'displaySlot', required: false },
      ];
      const result = await Product.findAndCountAll({ where, include, order: [['updatedAt', 'DESC']], limit: Number(limit), offset, distinct: true });
      let rows = result.rows.map((row: any) => slotView(row));
      if (status) rows = rows.filter((row) => row.status === status);
      return successResponse(res, { products: rows, pagination: { total: result.count, page: Number(page), limit: Number(limit), totalPages: Math.ceil(result.count / Number(limit)) } }, 'Produk display berhasil diambil dari data produk asli', 200);
    } catch (error) { return next(error); }
  },

  async createProduct(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      const productId = req.body.productId;
      if (!productId) throw new AppError('Produk asli wajib dipilih', 400);
      const { slot } = await ensureDisplaySlot(productId, req.user!.id, transaction);
      await transaction.commit();
      return successResponse(res, slot, 'Slot display produk berhasil disiapkan dalam keadaan kosong', 201);
    } catch (error) { await transaction.rollback(); return next(error); }
  },

  async updateProduct(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      const slot = await DisplayProduct.findByPk(req.params.id, { transaction });
      if (!slot) throw new AppError('Slot display tidak ditemukan', 404);
      const before = slot.toJSON();
      await slot.update({
        displayLocation: req.body.displayLocation !== undefined ? req.body.displayLocation || null : slot.displayLocation,
        condition: req.body.condition || slot.condition,
        status: req.body.status || slot.status,
        notes: req.body.notes !== undefined ? req.body.notes || null : slot.notes,
        isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : slot.isActive,
      }, { transaction });
      await auditService.log({ userId: req.user!.id, action: 'UPDATE' as any, entity: 'DisplaySlot', entityId: slot.id, before, after: slot.toJSON(), ip: req.ip || '', userAgent: req.get('User-Agent') || '' }, transaction);
      await transaction.commit();
      return successResponse(res, slot, 'Data slot display berhasil diperbarui', 200);
    } catch (error) { await transaction.rollback(); return next(error); }
  },

  async adjustStock(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      const slot = await DisplayProduct.findByPk(req.params.id, { transaction });
      if (!slot) throw new AppError('Slot display tidak ditemukan', 404);
      const type = req.body.type as DisplayMovementType;
      const quantity = parsePositiveInt(req.body.quantity, 'Jumlah');
      let stockAfter = slot.stock;
      if (type === DisplayMovementType.IN) stockAfter += quantity;
      else if (type === DisplayMovementType.OUT) stockAfter -= quantity;
      else if (type === DisplayMovementType.ADJUSTMENT) stockAfter = parsePositiveInt(req.body.targetStock, 'Target slot');
      else throw new AppError('Tipe penyesuaian display tidak valid', 400);
      if (stockAfter < 0) throw new AppError('Slot display tidak boleh minus', 400);
      if (stockAfter > slot.slotLimit) throw new AppError('Setiap produk hanya memiliki 1 slot display. Jika slot habis, gunakan pengajuan display.', 400);
      await createDisplayMovement({ slot, type, quantity, stockAfter, reference: `DISPLAY_MANUAL:${slot.sku}`, notes: req.body.notes || null, userId: req.user!.id, transaction });
      await slot.update({ stock: stockAfter, status: stockAfter > 0 ? 'DISPLAYED' as any : 'STORED' as any }, { transaction });
      await auditService.log({ userId: req.user!.id, action: 'UPDATE' as any, entity: 'DisplaySlot', entityId: slot.id, before: { stock: slot.stock }, after: { stock: stockAfter }, ip: req.ip || '', userAgent: req.get('User-Agent') || '' }, transaction);
      await transaction.commit();
      return successResponse(res, slot, 'Slot display berhasil disesuaikan', 200);
    } catch (error) { await transaction.rollback(); return next(error); }
  },

  async getMovements(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId = '', limit = 100 } = req.query;
      const where: any = {};
      if (productId) where.productId = productId;
      const movements = await DisplayStockMovement.findAll({ where, include: [{ model: DisplayProduct, as: 'product', include: [{ model: Product, as: 'sourceProduct' }] }, { model: User, as: 'creator', attributes: ['id', 'fullName', 'username'] }], order: [['createdAt', 'DESC']], limit: Number(limit) });
      return successResponse(res, movements, 'Riwayat display berhasil diambil', 200);
    } catch (error) { return next(error); }
  },

  async createRequest(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      const productId = req.body.productId;
      if (!productId) throw new AppError('Produk wajib dipilih', 400);
      const { slot } = await ensureDisplaySlot(productId, req.user!.id, transaction);
      const type = req.body.type as DisplayRequestType;
      if (!Object.values(DisplayRequestType).includes(type)) throw new AppError('Tipe pengajuan display tidak valid', 400);
      const pending = await DisplayStockRequest.findOne({ where: { productId: slot.id, status: DisplayRequestStatus.PENDING }, transaction });
      if (pending) throw new AppError('Produk ini masih memiliki pengajuan display yang menunggu review', 400);
      if (type === DisplayRequestType.STOCK_IN && slot.stock >= slot.slotLimit) throw new AppError('Slot display produk ini sudah terisi', 400);
      if (type === DisplayRequestType.STOCK_OUT && slot.stock <= 0) throw new AppError('Slot display produk ini sudah kosong', 400);
      if (type === DisplayRequestType.ADJUSTMENT) {
        const targetStock = parsePositiveInt(req.body.targetStock ?? 0, 'Target slot');
        if (targetStock > slot.slotLimit) throw new AppError('Target slot display maksimal 1', 400);
      }
      const request = await DisplayStockRequest.create({ productId: slot.id, type, quantity: parsePositiveInt(req.body.quantity ?? 1, 'Jumlah'), targetStock: req.body.targetStock !== undefined && req.body.targetStock !== '' ? parsePositiveInt(req.body.targetStock, 'Target slot') : null, reason: String(req.body.reason || '').trim(), requestedBy: req.user!.id }, { transaction });
      await transaction.commit();
      socketService.emitToAdmins('approval:pending', { message: 'Pengajuan display baru', entityType: 'DisplaySlot', requestType: type, requesterName: (req.user as any)?.fullName || req.user?.username });
      return successResponse(res, request, 'Pengajuan display berhasil dikirim', 201);
    } catch (error) { await transaction.rollback(); return next(error); }
  },

  async getRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const { status = '' } = req.query;
      const where: any = {};
      if (status) where.status = status;
      if (!isAdminRole(req.user?.roleName)) where.requestedBy = req.user!.id;
      const requests = await DisplayStockRequest.findAll({ where, include: [{ model: DisplayProduct, as: 'product', include: [{ model: Product, as: 'sourceProduct', include: [{ model: Category, as: 'category' }] }] }, { model: User, as: 'requester', attributes: ['id', 'fullName', 'username'] }, { model: User, as: 'reviewer', attributes: ['id', 'fullName', 'username'] }], order: [['createdAt', 'DESC']] });
      return successResponse(res, requests, 'Pengajuan display berhasil diambil', 200);
    } catch (error) { return next(error); }
  },

  async reviewRequest(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      const request = await DisplayStockRequest.findByPk(req.params.id, { include: [{ model: DisplayProduct, as: 'product' }], transaction });
      if (!request) throw new AppError('Pengajuan display tidak ditemukan', 404);
      if (request.status !== DisplayRequestStatus.PENDING) throw new AppError('Pengajuan display sudah diproses', 400);
      const action = String(req.body.action || '').toLowerCase();
      if (action === 'reject') {
        await request.update({ status: DisplayRequestStatus.REJECTED, reviewedBy: req.user!.id, reviewedAt: new Date(), rejectionReason: req.body.rejectionReason || null }, { transaction });
      } else if (action === 'approve') {
        const slot = (request as any).product as DisplayProduct;
        let movementType: DisplayMovementType = DisplayMovementType.IN;
        let stockAfter = slot.stock;
        if (request.type === DisplayRequestType.STOCK_IN) { movementType = DisplayMovementType.IN; stockAfter += request.quantity; }
        if (request.type === DisplayRequestType.STOCK_OUT) { movementType = DisplayMovementType.OUT; stockAfter -= request.quantity; }
        if (request.type === DisplayRequestType.ADJUSTMENT) { movementType = DisplayMovementType.ADJUSTMENT; stockAfter = request.targetStock ?? slot.stock; }
        if (stockAfter < 0) throw new AppError('Slot display tidak boleh minus', 400);
        if (stockAfter > slot.slotLimit) throw new AppError('Setiap produk hanya punya 1 slot display', 400);
        await createDisplayMovement({ slot, type: movementType, quantity: request.quantity, stockAfter, reference: `DISPLAY_REQUEST:${request.id}`, notes: request.reason, userId: req.user!.id, transaction });
        await slot.update({ stock: stockAfter, status: stockAfter > 0 ? 'DISPLAYED' as any : 'STORED' as any }, { transaction });
        await request.update({ status: DisplayRequestStatus.APPROVED, reviewedBy: req.user!.id, reviewedAt: new Date(), rejectionReason: null }, { transaction });
      } else throw new AppError('Aksi review pengajuan display tidak valid', 400);
      await transaction.commit();
      return successResponse(res, request, 'Pengajuan display berhasil diproses', 200);
    } catch (error) { await transaction.rollback(); return next(error); }
  },

  async getReturns(req: Request, res: Response, next: NextFunction) {
    try {
      const { status = '' } = req.query;
      const where: any = {};
      if (status) where.status = status;
      if (isTcpRole(req.user?.roleName)) where.status = { [Op.in]: [DisplayReturnStatus.READY_TO_SEND, DisplayReturnStatus.SENT] };
      if (!isAdminRole(req.user?.roleName) && !isTcpRole(req.user?.roleName)) where.createdBy = req.user!.id;
      const rows = await DisplayReturn.findAll({ where, include: returnInclude as any, order: [['createdAt', 'DESC']] });
      return successResponse(res, rows, 'Retur Display berhasil diambil', 200);
    } catch (error) { return next(error); }
  },

  async getReturnById(req: Request, res: Response, next: NextFunction) {
    try {
      const row = await DisplayReturn.findByPk(req.params.id, { include: returnInclude as any });
      if (!row) throw new AppError('Retur Display tidak ditemukan', 404);
      return successResponse(res, row, 'Detail Retur Display berhasil diambil', 200);
    } catch (error) { return next(error); }
  },

  async createReturn(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      const items = Array.isArray(req.body.items) ? req.body.items : [];
      if (items.length === 0) throw new AppError('Minimal 1 barang retur display wajib dipilih', 400);
      const now = new Date();
      const letter = await generateLetterNumber(transaction, now);
      const displayReturn = await DisplayReturn.create({ letterNumber: letter.letterNumber, letterSequence: letter.sequence, letterMonth: letter.month, letterYear: letter.year, letterDate: asDateOnly(now) as any, recipientName: String(req.body.recipientName || '').trim(), recipientAddress: String(req.body.recipientAddress || '').trim(), carriedBy: req.body.carriedBy || null, status: DisplayReturnStatus.READY_TO_SEND, notes: req.body.notes || null, createdBy: req.user!.id }, { transaction });
      if (!displayReturn.recipientName || !displayReturn.recipientAddress) throw new AppError('Nama dan alamat tujuan wajib diisi', 400);

      for (const item of items) {
        const slot = await DisplayProduct.findByPk(item.displayProductId, { include: [{ model: Product, as: 'sourceProduct' }], transaction });
        if (!slot || !slot.productId) throw new AppError('Slot display tidak ditemukan', 404);
        const quantity = parsePositiveInt(item.quantity ?? 1, 'Jumlah retur');
        if (quantity < 1) throw new AppError('Jumlah retur minimal 1', 400);
        if (slot.stock < quantity) throw new AppError(`Slot display ${slot.name} tidak cukup untuk diretur`, 400);
        const variant = item.productVariantId ? await ProductVariant.findByPk(item.productVariantId, { transaction }) : null;
        await DisplayReturnItem.create({ displayReturnId: displayReturn.id, displayProductId: slot.id, productId: slot.productId, productVariantId: item.productVariantId || null, skuSnapshot: (slot as any).sourceProduct?.sku || slot.sku.replace(/^DSP-/, ''), productNameSnapshot: (slot as any).sourceProduct?.name || slot.name, variantSnapshot: variant ? `${variant.name ? `${variant.name}: ` : ''}${variant.value}` : item.variantSnapshot || null, quantity, condition: item.condition || 'Perlu dicek', reason: String(item.reason || '').trim(), notes: item.notes || null }, { transaction });
        const stockAfter = slot.stock - quantity;
        await createDisplayMovement({ slot, type: DisplayMovementType.OUT, quantity, stockAfter, reference: `DISPLAY_RETURN:${displayReturn.letterNumber}`, notes: item.reason || 'Retur Display', userId: req.user!.id, transaction });
        await slot.update({ stock: stockAfter, status: 'MAINTENANCE' as any }, { transaction });
      }
      await transaction.commit();
      socketService.emitToAdmins('data:refresh', { entityType: 'DisplayReturn', action: 'CREATE' });
      const created = await DisplayReturn.findByPk(displayReturn.id, { include: returnInclude as any });
      return successResponse(res, created, 'Retur Display dan Surat Jalan berhasil dibuat', 201);
    } catch (error) { await transaction.rollback(); return next(error); }
  },

  async updateReturnStatus(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      const row = await DisplayReturn.findByPk(req.params.id, { transaction });
      if (!row) throw new AppError('Retur Display tidak ditemukan', 404);
      const status = req.body.status as DisplayReturnStatus;
      if (!Object.values(DisplayReturnStatus).includes(status)) throw new AppError('Status Retur Display tidak valid', 400);
      const updates: any = { status };
      if (status === DisplayReturnStatus.SENT) { updates.sentBy = req.user!.id; updates.sentAt = new Date(); }
      if (status === DisplayReturnStatus.RECEIVED) { updates.receivedBy = req.user!.id; updates.receivedAt = new Date(); }
      if (status === DisplayReturnStatus.COMPLETED) { updates.completedBy = req.user!.id; updates.completedAt = new Date(); }
      await row.update(updates, { transaction });
      await transaction.commit();
      const updated = await DisplayReturn.findByPk(row.id, { include: returnInclude as any });
      return successResponse(res, updated, 'Status Retur Display berhasil diperbarui', 200);
    } catch (error) { await transaction.rollback(); return next(error); }
  },
};
