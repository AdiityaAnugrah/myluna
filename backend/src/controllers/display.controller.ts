import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import {
  DisplayCategory,
  DisplayMovementType,
  DisplayProduct,
  DisplayRequestStatus,
  DisplayRequestType,
  DisplayStockMovement,
  DisplayStockRequest,
  DisplaySupplier,
  User,
} from '../models';
import { successResponse } from '../utils/response';
import { AppError } from '../utils/errors';
import { auditService } from '../services/audit.service';
import { socketService } from '../services/socket.service';

function isAdminRole(roleName?: string) {
  return roleName === 'ADMIN' || roleName === 'SUPER_ADMIN';
}

function parsePositiveInt(value: unknown, field: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new AppError(`${field} harus berupa angka 0 atau lebih`, 400);
  }
  return parsed;
}

async function createDisplayMovement(params: {
  product: DisplayProduct;
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
      productId: params.product.id,
      type: params.type,
      quantity: params.quantity,
      stockBefore: params.product.stock,
      stockAfter: params.stockAfter,
      reference: params.reference || null,
      notes: params.notes || null,
      createdBy: params.userId,
    },
    { transaction: params.transaction }
  );
}

export const displayController = {
  async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const requestWhere: any = { status: DisplayRequestStatus.PENDING };
      if (!isAdminRole(req.user?.roleName)) {
        requestWhere.requestedBy = req.user!.id;
      }

      const [totalProducts, lowStockProducts, pendingRequests, totalCategories, totalSuppliers] = await Promise.all([
        DisplayProduct.count({ where: { isActive: true } }),
        DisplayProduct.count({ where: { isActive: true, stock: { [Op.lte]: sequelize.col('minStock') } as any } }),
        DisplayStockRequest.count({ where: requestWhere }),
        DisplayCategory.count({ where: { isActive: true } }),
        DisplaySupplier.count({ where: { isActive: true } }),
      ]);

      return successResponse(
        res,
        {
          totalProducts,
          lowStockProducts,
          pendingRequests,
          totalCategories,
          totalSuppliers,
          badgeCount: pendingRequests,
        },
        'Ringkasan sistem display berhasil diambil',
        200
      );
    } catch (error) {
      return next(error);
    }
  },

  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const { isActive = 'true' } = req.query;
      const where: any = {};
      if (isActive !== 'all') where.isActive = isActive === 'true';
      const categories = await DisplayCategory.findAll({ where, order: [['name', 'ASC']] });
      return successResponse(res, categories, 'Kategori display berhasil diambil', 200);
    } catch (error) {
      return next(error);
    }
  },

  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const name = String(req.body.name || '').trim();
      if (name.length < 2) throw new AppError('Nama kategori display wajib diisi', 400);
      const existing = await DisplayCategory.findOne({ where: { name } });
      if (existing) throw new AppError('Nama kategori display sudah digunakan', 400);
      const category = await DisplayCategory.create({ name, description: req.body.description || null, isActive: true });
      await auditService.log({ userId: req.user!.id, action: 'CREATE' as any, entity: 'DisplayCategory', entityId: category.id, before: null, after: category.toJSON(), ip: req.ip || '', userAgent: req.get('User-Agent') || '' });
      return successResponse(res, category, 'Kategori display berhasil dibuat', 201);
    } catch (error) {
      return next(error);
    }
  },

  async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await DisplayCategory.findByPk(req.params.id);
      if (!category) throw new AppError('Kategori display tidak ditemukan', 404);
      const before = category.toJSON();
      await category.update({
        name: req.body.name !== undefined ? String(req.body.name).trim() : category.name,
        description: req.body.description !== undefined ? req.body.description || null : category.description,
        isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : category.isActive,
      });
      await auditService.log({ userId: req.user!.id, action: 'UPDATE' as any, entity: 'DisplayCategory', entityId: category.id, before, after: category.toJSON(), ip: req.ip || '', userAgent: req.get('User-Agent') || '' });
      return successResponse(res, category, 'Kategori display berhasil diperbarui', 200);
    } catch (error) {
      return next(error);
    }
  },

  async getSuppliers(req: Request, res: Response, next: NextFunction) {
    try {
      const { isActive = 'true', search = '' } = req.query;
      const where: any = {};
      if (isActive !== 'all') where.isActive = isActive === 'true';
      if (search) where[Op.or] = [{ name: { [Op.like]: `%${search}%` } }, { contact: { [Op.like]: `%${search}%` } }, { phone: { [Op.like]: `%${search}%` } }];
      const suppliers = await DisplaySupplier.findAll({ where, order: [['name', 'ASC']] });
      return successResponse(res, suppliers, 'Supplier display berhasil diambil', 200);
    } catch (error) {
      return next(error);
    }
  },

  async createSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const name = String(req.body.name || '').trim();
      if (name.length < 2) throw new AppError('Nama supplier display wajib diisi', 400);
      const supplier = await DisplaySupplier.create({ name, contact: req.body.contact || null, phone: req.body.phone || null, email: req.body.email || null, address: req.body.address || null, isActive: true });
      await auditService.log({ userId: req.user!.id, action: 'CREATE' as any, entity: 'DisplaySupplier', entityId: supplier.id, before: null, after: supplier.toJSON(), ip: req.ip || '', userAgent: req.get('User-Agent') || '' });
      return successResponse(res, supplier, 'Supplier display berhasil dibuat', 201);
    } catch (error) {
      return next(error);
    }
  },

  async updateSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const supplier = await DisplaySupplier.findByPk(req.params.id);
      if (!supplier) throw new AppError('Supplier display tidak ditemukan', 404);
      const before = supplier.toJSON();
      await supplier.update({
        name: req.body.name !== undefined ? String(req.body.name).trim() : supplier.name,
        contact: req.body.contact !== undefined ? req.body.contact || null : supplier.contact,
        phone: req.body.phone !== undefined ? req.body.phone || null : supplier.phone,
        email: req.body.email !== undefined ? req.body.email || null : supplier.email,
        address: req.body.address !== undefined ? req.body.address || null : supplier.address,
        isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : supplier.isActive,
      });
      await auditService.log({ userId: req.user!.id, action: 'UPDATE' as any, entity: 'DisplaySupplier', entityId: supplier.id, before, after: supplier.toJSON(), ip: req.ip || '', userAgent: req.get('User-Agent') || '' });
      return successResponse(res, supplier, 'Supplier display berhasil diperbarui', 200);
    } catch (error) {
      return next(error);
    }
  },

  async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, search = '', categoryId = '', status = '', isActive = 'true' } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      const where: any = {};
      if (isActive !== 'all') where.isActive = isActive === 'true';
      if (categoryId) where.categoryId = categoryId;
      if (status) where.status = status;
      if (search) where[Op.or] = [{ sku: { [Op.like]: `%${search}%` } }, { name: { [Op.like]: `%${search}%` } }, { displayLocation: { [Op.like]: `%${search}%` } }];
      const { count, rows } = await DisplayProduct.findAndCountAll({
        where,
        include: [{ model: DisplayCategory, as: 'category' }, { model: DisplaySupplier, as: 'supplier' }],
        order: [['updatedAt', 'DESC']],
        limit: Number(limit),
        offset,
      });
      return successResponse(res, { products: rows, pagination: { total: count, page: Number(page), limit: Number(limit), totalPages: Math.ceil(count / Number(limit)) } }, 'Produk display berhasil diambil', 200);
    } catch (error) {
      return next(error);
    }
  },

  async createProduct(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      const sku = String(req.body.sku || '').trim();
      const name = String(req.body.name || '').trim();
      if (sku.length < 2 || name.length < 2) throw new AppError('SKU dan nama produk display wajib diisi', 400);
      const existing = await DisplayProduct.findOne({ where: { sku }, transaction });
      if (existing) throw new AppError('SKU produk display sudah digunakan', 400);
      const stock = parsePositiveInt(req.body.stock ?? 0, 'Stok awal');
      const product = await DisplayProduct.create({
        sku,
        name,
        description: req.body.description || null,
        categoryId: req.body.categoryId || null,
        supplierId: req.body.supplierId || null,
        displayLocation: req.body.displayLocation || null,
        unit: req.body.unit || 'pcs',
        stock,
        minStock: parsePositiveInt(req.body.minStock ?? 0, 'Minimal stok'),
        estimatedValue: req.body.estimatedValue || null,
        condition: req.body.condition || 'GOOD',
        status: req.body.status || 'DISPLAYED',
        notes: req.body.notes || null,
        isActive: true,
      }, { transaction });
      if (stock > 0) await createDisplayMovement({ product, type: DisplayMovementType.IN, quantity: stock, stockAfter: stock, reference: `DISPLAY_INIT:${sku}`, notes: 'Stok awal produk display', userId: req.user!.id, transaction });
      await auditService.log({ userId: req.user!.id, action: 'CREATE' as any, entity: 'DisplayProduct', entityId: product.id, before: null, after: product.toJSON(), ip: req.ip || '', userAgent: req.get('User-Agent') || '' }, transaction);
      await transaction.commit();
      return successResponse(res, product, 'Produk display berhasil dibuat', 201);
    } catch (error) {
      await transaction.rollback();
      return next(error);
    }
  },

  async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await DisplayProduct.findByPk(req.params.id);
      if (!product) throw new AppError('Produk display tidak ditemukan', 404);
      const before = product.toJSON();
      await product.update({
        sku: req.body.sku !== undefined ? String(req.body.sku).trim() : product.sku,
        name: req.body.name !== undefined ? String(req.body.name).trim() : product.name,
        description: req.body.description !== undefined ? req.body.description || null : product.description,
        categoryId: req.body.categoryId !== undefined ? req.body.categoryId || null : product.categoryId,
        supplierId: req.body.supplierId !== undefined ? req.body.supplierId || null : product.supplierId,
        displayLocation: req.body.displayLocation !== undefined ? req.body.displayLocation || null : product.displayLocation,
        unit: req.body.unit !== undefined ? req.body.unit || 'pcs' : product.unit,
        minStock: req.body.minStock !== undefined ? parsePositiveInt(req.body.minStock, 'Minimal stok') : product.minStock,
        estimatedValue: req.body.estimatedValue !== undefined ? req.body.estimatedValue || null : product.estimatedValue,
        condition: req.body.condition || product.condition,
        status: req.body.status || product.status,
        notes: req.body.notes !== undefined ? req.body.notes || null : product.notes,
        isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : product.isActive,
      });
      await auditService.log({ userId: req.user!.id, action: 'UPDATE' as any, entity: 'DisplayProduct', entityId: product.id, before, after: product.toJSON(), ip: req.ip || '', userAgent: req.get('User-Agent') || '' });
      return successResponse(res, product, 'Produk display berhasil diperbarui', 200);
    } catch (error) {
      return next(error);
    }
  },

  async adjustStock(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      const product = await DisplayProduct.findByPk(req.params.id, { transaction });
      if (!product) throw new AppError('Produk display tidak ditemukan', 404);
      const type = req.body.type as DisplayMovementType;
      const quantity = parsePositiveInt(req.body.quantity, 'Jumlah');
      let stockAfter = product.stock;
      if (type === DisplayMovementType.IN) stockAfter += quantity;
      else if (type === DisplayMovementType.OUT) stockAfter -= quantity;
      else if (type === DisplayMovementType.ADJUSTMENT) stockAfter = parsePositiveInt(req.body.targetStock, 'Target stok');
      else throw new AppError('Tipe penyesuaian stok display tidak valid', 400);
      if (stockAfter < 0) throw new AppError('Stok display tidak boleh minus', 400);
      await createDisplayMovement({ product, type, quantity, stockAfter, reference: `DISPLAY_MANUAL:${product.sku}`, notes: req.body.notes || null, userId: req.user!.id, transaction });
      await product.update({ stock: stockAfter }, { transaction });
      await auditService.log({ userId: req.user!.id, action: 'UPDATE' as any, entity: 'DisplayStock', entityId: product.id, before: { stock: product.stock }, after: { stock: stockAfter }, ip: req.ip || '', userAgent: req.get('User-Agent') || '' }, transaction);
      await transaction.commit();
      return successResponse(res, product, 'Stok produk display berhasil disesuaikan', 200);
    } catch (error) {
      await transaction.rollback();
      return next(error);
    }
  },

  async getMovements(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId = '', limit = 100 } = req.query;
      const where: any = {};
      if (productId) where.productId = productId;
      const movements = await DisplayStockMovement.findAll({ where, include: [{ model: DisplayProduct, as: 'product' }, { model: User, as: 'creator', attributes: ['id', 'fullName', 'username'] }], order: [['createdAt', 'DESC']], limit: Number(limit) });
      return successResponse(res, movements, 'Riwayat stok display berhasil diambil', 200);
    } catch (error) {
      return next(error);
    }
  },

  async createRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await DisplayProduct.findByPk(req.body.productId);
      if (!product) throw new AppError('Produk display tidak ditemukan', 404);
      const type = req.body.type as DisplayRequestType;
      if (!Object.values(DisplayRequestType).includes(type)) throw new AppError('Tipe pengajuan stok display tidak valid', 400);
      const request = await DisplayStockRequest.create({ productId: product.id, type, quantity: parsePositiveInt(req.body.quantity ?? 0, 'Jumlah'), targetStock: req.body.targetStock !== undefined && req.body.targetStock !== '' ? parsePositiveInt(req.body.targetStock, 'Target stok') : null, reason: String(req.body.reason || '').trim(), requestedBy: req.user!.id });
      socketService.emitToAdmins('approval:pending', { message: 'Pengajuan stok display baru', entityType: 'DisplayStock', requestType: type, requesterName: (req.user as any)?.fullName || req.user?.username });
      return successResponse(res, request, 'Pengajuan stok display berhasil dikirim', 201);
    } catch (error) {
      return next(error);
    }
  },

  async getRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const { status = '' } = req.query;
      const where: any = {};
      if (status) where.status = status;
      if (!isAdminRole(req.user?.roleName)) where.requestedBy = req.user!.id;
      const requests = await DisplayStockRequest.findAll({ where, include: [{ model: DisplayProduct, as: 'product' }, { model: User, as: 'requester', attributes: ['id', 'fullName', 'username'] }, { model: User, as: 'reviewer', attributes: ['id', 'fullName', 'username'] }], order: [['createdAt', 'DESC']] });
      return successResponse(res, requests, 'Pengajuan stok display berhasil diambil', 200);
    } catch (error) {
      return next(error);
    }
  },

  async reviewRequest(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      const request = await DisplayStockRequest.findByPk(req.params.id, { include: [{ model: DisplayProduct, as: 'product' }], transaction });
      if (!request) throw new AppError('Pengajuan stok display tidak ditemukan', 404);
      if (request.status !== DisplayRequestStatus.PENDING) throw new AppError('Pengajuan stok display sudah diproses', 400);
      const action = String(req.body.action || '').toLowerCase();
      if (action === 'reject') {
        await request.update({ status: DisplayRequestStatus.REJECTED, reviewedBy: req.user!.id, reviewedAt: new Date(), rejectionReason: req.body.rejectionReason || null }, { transaction });
      } else if (action === 'approve') {
        const product = (request as any).product as DisplayProduct;
        let movementType: DisplayMovementType = DisplayMovementType.IN;
        let stockAfter = product.stock;
        if (request.type === DisplayRequestType.STOCK_IN) { movementType = DisplayMovementType.IN; stockAfter += request.quantity; }
        if (request.type === DisplayRequestType.STOCK_OUT) { movementType = DisplayMovementType.OUT; stockAfter -= request.quantity; }
        if (request.type === DisplayRequestType.ADJUSTMENT) { movementType = DisplayMovementType.ADJUSTMENT; stockAfter = request.targetStock ?? product.stock; }
        if (stockAfter < 0) throw new AppError('Stok display tidak boleh minus', 400);
        await createDisplayMovement({ product, type: movementType, quantity: request.quantity, stockAfter, reference: `DISPLAY_REQUEST:${request.id}`, notes: request.reason, userId: req.user!.id, transaction });
        await product.update({ stock: stockAfter }, { transaction });
        await request.update({ status: DisplayRequestStatus.APPROVED, reviewedBy: req.user!.id, reviewedAt: new Date(), rejectionReason: null }, { transaction });
      } else {
        throw new AppError('Aksi review pengajuan display tidak valid', 400);
      }
      await transaction.commit();
      return successResponse(res, request, 'Pengajuan stok display berhasil diproses', 200);
    } catch (error) {
      await transaction.rollback();
      return next(error);
    }
  },
};
