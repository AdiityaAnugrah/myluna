import { NextFunction, Request, Response } from 'express';
import { Op, Transaction } from 'sequelize';
import {
  InventoryLoan,
  InventoryLoanDirection,
  InventoryLoanItem,
  InventoryLoanItemCondition,
  InventoryLoanStatus,
  MovementType,
  Product,
  ProductLocationStock,
  ProductStockLocation,
  ProductVariant,
  StockMovement,
  User,
} from '../models';
import { sequelize } from '../config/database';
import { AppError } from '../utils/errors';
import { successResponse } from '../utils/response';
import { auditService } from '../services/audit.service';

function normalizeCondition(value: unknown): InventoryLoanItemCondition {
  const raw = String(value || '').toUpperCase();
  if (Object.values(InventoryLoanItemCondition).includes(raw as InventoryLoanItemCondition)) {
    return raw as InventoryLoanItemCondition;
  }
  return InventoryLoanItemCondition.GOOD;
}

function generateLoanNumber() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `PB-${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

async function adjustProductStock(params: {
  productId: string;
  variantName?: string | null;
  quantityDelta: number;
  reference: string;
  notes: string;
  createdBy: string;
  transaction: Transaction;
}) {
  const { productId, variantName, quantityDelta, reference, notes, createdBy, transaction } = params;

  const product = await Product.findByPk(productId, { transaction, lock: transaction.LOCK.UPDATE });
  if (!product) throw new AppError('Produk tidak ditemukan', 404);

  const stockBefore = Number(product.stock || 0);
  const stockAfter = stockBefore + quantityDelta;
  if (stockAfter < 0) {
    throw new AppError(`Stok ${product.name} tidak cukup. Tersedia: ${stockBefore}, diminta: ${Math.abs(quantityDelta)}`, 400);
  }

  if (variantName) {
    const variant = await ProductVariant.findOne({
      where: { productId, value: variantName },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!variant) throw new AppError(`Varian ${variantName} tidak ditemukan`, 404);
    const variantStockAfter = Number(variant.stock || 0) + quantityDelta;
    if (variantStockAfter < 0) {
      throw new AppError(
        `Stok varian ${variantName} tidak cukup. Tersedia: ${variant.stock}, diminta: ${Math.abs(quantityDelta)}`,
        400
      );
    }
    await variant.update({ stock: variantStockAfter }, { transaction });
  }

  const movement = await StockMovement.create(
    {
      productId,
      type: MovementType.ADJUSTMENT,
      quantity: quantityDelta,
      stockBefore,
      stockAfter,
      reference,
      notes: notes + (variantName ? ` (Varian: ${variantName})` : ''),
      createdBy,
    },
    { transaction }
  );

  await product.update({ stock: stockAfter }, { transaction });
  return movement;
}

async function adjustCenterStock(params: {
  productId: string;
  variantName?: string | null;
  quantityDelta: number;
  transaction: Transaction;
}) {
  const { productId, variantName, quantityDelta, transaction } = params;
  const [locationStock] = await ProductLocationStock.findOrCreate({
    where: {
      productId,
      variantName: variantName || null,
      location: ProductStockLocation.CENTER,
    },
    defaults: {
      productId,
      variantName: variantName || null,
      location: ProductStockLocation.CENTER,
      stock: 0,
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  const before = Number(locationStock.stock || 0);
  const after = before + quantityDelta;
  if (after < 0) {
    throw new AppError(
      `Stok pusat/TCP tidak cukup. Tersedia: ${before}, diminta: ${Math.abs(quantityDelta)}. Isi stok pusat awal dulu bila stok fisiknya memang ada.`,
      400
    );
  }
  await locationStock.update({ stock: after }, { transaction });
  return { before, after };
}

export const inventoryLoanController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, status = '', direction = '', search = '', startDate = '', endDate = '' } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      const where: any = {};

      if (status) where.status = status;
      if (direction) where.direction = direction;
      if (search) {
        where[Op.or] = [
          { loanNumber: { [Op.like]: `%${search}%` } },
          { borrowerName: { [Op.like]: `%${search}%` } },
          { targetName: { [Op.like]: `%${search}%` } },
        ];
      }
      if (startDate && endDate) {
        where.loanDate = { [Op.between]: [String(startDate), String(endDate)] };
      }

      const { count, rows } = await InventoryLoan.findAndCountAll({
        where,
        include: [
          { model: User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
          { model: User, as: 'returner', attributes: ['id', 'fullName', 'email'] },
          {
            model: InventoryLoanItem,
            as: 'items',
            include: [{ model: Product, as: 'product', attributes: ['id', 'sku', 'name', 'unit', 'stock'] }],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit: Number(limit),
        offset,
        distinct: true,
      });

      return successResponse(
        res,
        {
          loans: rows,
          pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / Number(limit)),
          },
        },
        'Data pinjam barang berhasil diambil',
        200
      );
    } catch (error) {
      return next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const loan = await InventoryLoan.findByPk(req.params.id, {
        include: [
          { model: User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
          { model: User, as: 'returner', attributes: ['id', 'fullName', 'email'] },
          {
            model: InventoryLoanItem,
            as: 'items',
            include: [{ model: Product, as: 'product', attributes: ['id', 'sku', 'name', 'unit', 'stock'] }],
          },
        ],
      });
      if (!loan) throw new AppError('Data pinjam barang tidak ditemukan', 404);
      return successResponse(res, loan, 'Detail pinjam barang berhasil diambil', 200);
    } catch (error) {
      return next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      const {
        direction,
        loanDate,
        borrowerName,
        targetName,
        notes,
        submittedSignatureName,
        submittedSignature,
        acknowledgedSignatureName,
        acknowledgedSignature,
        receivedSignatureName,
        receivedSignature,
        items,
      } = req.body;

      if (direction !== InventoryLoanDirection.FROM_CENTER) {
        throw new AppError('Form Pinjam Barang hanya untuk toko meminjam barang dari Pusat/TCP. Barang dari toko ke pusat gunakan proses retur/stok keluar.', 400);
      }
      if (!borrowerName || !targetName) {
        throw new AppError('Nama peminjam dan ditujukan pada wajib diisi', 400);
      }
      if (!Array.isArray(items) || items.length === 0) {
        throw new AppError('Minimal pilih satu produk yang dipinjam', 400);
      }

      const loan = await InventoryLoan.create(
        {
          loanNumber: generateLoanNumber(),
          direction,
          loanDate: loanDate ? new Date(loanDate) : new Date(),
          borrowerName: String(borrowerName).trim(),
          targetName: String(targetName).trim(),
          notes: notes ? String(notes).trim() : null,
          submittedSignatureName: submittedSignatureName ? String(submittedSignatureName).trim() : null,
          submittedSignature: submittedSignature ? String(submittedSignature) : null,
          acknowledgedSignatureName: acknowledgedSignatureName ? String(acknowledgedSignatureName).trim() : null,
          acknowledgedSignature: acknowledgedSignature ? String(acknowledgedSignature) : null,
          receivedSignatureName: receivedSignatureName ? String(receivedSignatureName).trim() : null,
          receivedSignature: receivedSignature ? String(receivedSignature) : null,
          status: InventoryLoanStatus.BORROWED,
          createdBy: req.user!.id,
        },
        { transaction }
      );

      const sign = 1;
      const reference = `INVENTORY_LOAN:${loan.loanNumber}`;
      for (const rawItem of items) {
        const quantity = Math.abs(Number(rawItem.quantity || 0));
        if (!rawItem.productId || !Number.isInteger(quantity) || quantity <= 0) {
          throw new AppError('Produk dan jumlah pinjaman wajib valid', 400);
        }

        await InventoryLoanItem.create(
          {
            loanId: loan.id,
            productId: rawItem.productId,
            variantName: rawItem.variantName ? String(rawItem.variantName) : null,
            quantity,
            condition: normalizeCondition(rawItem.condition),
            notes: rawItem.notes ? String(rawItem.notes).trim() : null,
          },
          { transaction }
        );

        await adjustProductStock({
          productId: rawItem.productId,
          variantName: rawItem.variantName || null,
          quantityDelta: sign * quantity,
          reference,
          notes: `Pinjam barang dari pusat/TCP - ${loan.loanNumber}`,
          createdBy: req.user!.id,
          transaction,
        });

        await adjustCenterStock({
          productId: rawItem.productId,
          variantName: rawItem.variantName || null,
          quantityDelta: -sign * quantity,
          transaction,
        });
      }

      await auditService.log(
        {
          userId: req.user!.id,
          action: 'CREATE' as any,
          entity: 'InventoryLoan',
          entityId: loan.id,
          before: null,
          after: { ...loan.toJSON(), itemCount: items.length },
          ip: req.ip || '',
          userAgent: req.get('User-Agent') || '',
        },
        transaction
      );

      await transaction.commit();

      const created = await InventoryLoan.findByPk(loan.id, {
        include: [
          { model: User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
          {
            model: InventoryLoanItem,
            as: 'items',
            include: [{ model: Product, as: 'product', attributes: ['id', 'sku', 'name', 'unit', 'stock'] }],
          },
        ],
      });
      return successResponse(res, created, 'Pinjam barang berhasil dibuat dan stok sudah disesuaikan', 201);
    } catch (error) {
      if (!(transaction as any).finished) await transaction.rollback();
      return next(error);
    }
  },

  async markReturned(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      const loan = await InventoryLoan.findByPk(req.params.id, {
        include: [{ model: InventoryLoanItem, as: 'items' }],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!loan) throw new AppError('Data pinjam barang tidak ditemukan', 404);
      if (loan.status !== InventoryLoanStatus.BORROWED) {
        throw new AppError('Pinjaman ini sudah tidak berstatus dipinjam', 400);
      }

      const reverseSign = loan.direction === InventoryLoanDirection.TO_CENTER ? 1 : -1;
      const reference = `INVENTORY_LOAN_RETURN:${loan.loanNumber}`;
      const loanItems = (loan as any).items || [];

      for (const item of loanItems) {
        await adjustProductStock({
          productId: item.productId,
          variantName: item.variantName,
          quantityDelta: reverseSign * item.quantity,
          reference,
          notes: `Pengembalian pinjam barang - ${loan.loanNumber}`,
          createdBy: req.user!.id,
          transaction,
        });

        await adjustCenterStock({
          productId: item.productId,
          variantName: item.variantName,
          quantityDelta: -reverseSign * item.quantity,
          transaction,
        });
      }

      await loan.update(
        {
          status: InventoryLoanStatus.RETURNED,
          returnedAt: new Date(),
          returnedBy: req.user!.id,
          returnNotes: req.body?.returnNotes ? String(req.body.returnNotes).trim() : null,
        },
        { transaction }
      );

      await auditService.log(
        {
          userId: req.user!.id,
          action: 'UPDATE' as any,
          entity: 'InventoryLoan',
          entityId: loan.id,
          before: { status: InventoryLoanStatus.BORROWED },
          after: { status: InventoryLoanStatus.RETURNED, returnNotes: req.body?.returnNotes || null },
          ip: req.ip || '',
          userAgent: req.get('User-Agent') || '',
        },
        transaction
      );

      await transaction.commit();
      const updated = await InventoryLoan.findByPk(loan.id, {
        include: [
          { model: User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
          { model: User, as: 'returner', attributes: ['id', 'fullName', 'email'] },
          {
            model: InventoryLoanItem,
            as: 'items',
            include: [{ model: Product, as: 'product', attributes: ['id', 'sku', 'name', 'unit', 'stock'] }],
          },
        ],
      });
      return successResponse(res, updated, 'Pinjam barang berhasil ditandai sudah kembali dan stok sudah dibalik', 200);
    } catch (error) {
      if (!(transaction as any).finished) await transaction.rollback();
      return next(error);
    }
  },

  async getCenterStocks(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId = '' } = req.query;
      const where: any = { location: ProductStockLocation.CENTER };
      if (productId) where.productId = productId;

      const rows = await ProductLocationStock.findAll({
        where,
        include: [{ model: Product, as: 'product', attributes: ['id', 'sku', 'name', 'stock', 'unit'] }],
        order: [['updatedAt', 'DESC']],
      });

      return successResponse(res, rows, 'Stok pusat berhasil diambil', 200);
    } catch (error) {
      return next(error);
    }
  },

  async adjustCenterStock(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      const { productId, variantName, quantity, type = 'SET' } = req.body;
      const qty = Math.abs(Number(quantity || 0));
      if (!productId || qty < 0 || !Number.isFinite(qty)) throw new AppError('Produk dan jumlah stok pusat wajib valid', 400);
      const product = await Product.findByPk(productId, { transaction });
      if (!product) throw new AppError('Produk tidak ditemukan', 404);

      const [row] = await ProductLocationStock.findOrCreate({
        where: { productId, variantName: variantName || null, location: ProductStockLocation.CENTER },
        defaults: { productId, variantName: variantName || null, location: ProductStockLocation.CENTER, stock: 0 },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      const before = Number(row.stock || 0);
      const nextStock = type === 'IN' ? before + qty : type === 'OUT' ? before - qty : qty;
      if (nextStock < 0) throw new AppError('Stok pusat tidak boleh minus', 400);
      await row.update({ stock: nextStock }, { transaction });

      await auditService.log(
        {
          userId: req.user!.id,
          action: 'UPDATE' as any,
          entity: 'ProductLocationStock',
          entityId: row.id,
          before: { stock: before },
          after: { stock: nextStock, productId, variantName: variantName || null },
          ip: req.ip || '',
          userAgent: req.get('User-Agent') || '',
        },
        transaction
      );

      await transaction.commit();
      return successResponse(res, row, 'Stok pusat berhasil diperbarui', 200);
    } catch (error) {
      if (!(transaction as any).finished) await transaction.rollback();
      return next(error);
    }
  },
};
