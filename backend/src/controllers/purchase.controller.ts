import { Request, Response, NextFunction } from 'express';
import { Purchase, PurchaseItem, Supplier, Product, ProductVariant, User, StockMovement, MovementType } from '../models';
import { successResponse } from '../utils/response';
import { AppError } from '../utils/errors';
import { sequelize } from '../config/database';
import { Op } from 'sequelize';
import { auditService } from '../services/audit.service';

export const purchaseController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        status = '', 
        supplierId = '',
        startDate = '',
        endDate = ''
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (supplierId) {
        where.supplierId = supplierId;
      }

      if (startDate && endDate) {
        where.purchaseDate = {
          [Op.between]: [new Date(startDate as string), new Date(endDate as string)],
        };
      }

      const { count, rows } = await Purchase.findAndCountAll({
        where,
        include: [
          {
            model: PurchaseItem,
            as: 'items',
            attributes: ['quantity'],
          },
          {
            model: Supplier,
            as: 'supplier',
            attributes: ['id', 'name', 'contact', 'phone'],
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'fullName', 'email'],
          },
        ],
        limit: Number(limit),
        offset,
        order: [['purchaseDate', 'DESC']],
      });

      successResponse(
        res,
        {
          purchases: rows,
          pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / Number(limit)),
          },
        },
        'Purchases retrieved successfully',
        200
      );
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const purchase = await Purchase.findByPk(id, {
        include: [
          {
            model: Supplier,
            as: 'supplier',
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'fullName', 'email'],
          },
          {
            model: PurchaseItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'sku', 'name', 'unit'],
              },
            ],
          },
        ],
      });

      if (!purchase) {
        throw new AppError('Purchase not found', 404);
      }

      successResponse(res, purchase, 'Purchase retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();

    try {
      const {
        purchaseNumber,
        supplierId,
        purchaseDate,
        items,
        notes,
      } = req.body;

      // Validate supplier
      const supplier = await Supplier.findByPk(supplierId);
      if (!supplier) {
        throw new AppError('Supplier not found', 404);
      }

      // Auto-generate purchase number if not provided
      let finalPurchaseNumber = purchaseNumber;
      if (!finalPurchaseNumber) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;
        
        // Find latest purchase number for this date
        const latestPurchase = await Purchase.findOne({
          where: {
            purchaseNumber: { [Op.like]: `PUR/${dateStr}/%` }
          },
          order: [['createdAt', 'DESC']],
        });

        let sequence = 1;
        if (latestPurchase) {
            const parts = latestPurchase.purchaseNumber.split('/');
            if (parts.length === 3) {
                sequence = parseInt(parts[2]) + 1;
            }
        }
        
        finalPurchaseNumber = `PUR/${dateStr}/${String(sequence).padStart(4, '0')}`;
      }

      // Check if purchase number already exists
      const existingPurchase = await Purchase.findOne({ where: { purchaseNumber: finalPurchaseNumber } });
      if (existingPurchase) {
        throw new AppError('Nomor pengajuan sudah ada', 400);
      }

      // Validate all products and calculate total
      let totalAmount = 0;
      for (const item of items) {
        const product = await Product.findByPk(item.productId);
        if (!product) {
          throw new AppError(`Product dengan ID ${item.productId} tidak ditemukan`, 404);
        }
        totalAmount += item.quantity * item.price;
      }

      // Create purchase
      const purchase = await Purchase.create(
        {
          purchaseNumber: finalPurchaseNumber,
          supplierId,
          purchaseDate,
          totalAmount,
          status: 'COMPLETED' as any,
          notes,
          createdBy: req.user!.id,
        },
        { transaction }
      );

      // Create purchase items and update product stock
      for (const item of items) {
        const subtotal = item.quantity * item.price;

        await PurchaseItem.create(
          {
            purchaseId: purchase.id,
            productId: item.productId,
            variantName: item.variantName || null,
            quantity: item.quantity,
            price: item.price,
            subtotal,
          },
          { transaction }
        );

        // Update stock: main product stock + variant stock if applicable
        const product = await Product.findByPk(item.productId, { transaction });
        await product!.update(
          { stock: product!.stock + item.quantity },
          { transaction }
        );

        // If a specific variant was purchased, also update that variant's stock
        if (item.variantName) {
          const variant = await ProductVariant.findOne({
            where: { productId: item.productId, value: item.variantName },
            transaction,
          });
          if (variant) {
            await variant.update({ stock: variant.stock + item.quantity }, { transaction });
          }
        }

        // Record Stock Movement (IN)
        await StockMovement.create({
            productId: item.productId,
            type: MovementType.IN,
            quantity: item.quantity,
            reference: `PURCHASE:${purchase.purchaseNumber}`,
            notes: `Purchase created${item.variantName ? ` (Varian: ${item.variantName})` : ''}`,
            createdBy: req.user!.id
        }, { transaction });
      }

      await transaction.commit();

      // Fetch complete purchase with relations
      const completePurchase = await Purchase.findByPk(purchase.id, {
        include: [
          {
            model: Supplier,
            as: 'supplier',
          },
          {
            model: PurchaseItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
              },
            ],
          },
        ],
      });

      // Log activity
      const formDuration = req.body.duration ? Number(req.body.duration) : null;
      await auditService.log({
        userId: req.user!.id,
        action: 'CREATE' as any,
        entity: 'Purchase',
        entityId: purchase.id,
        before: null,
        after: completePurchase ? completePurchase.toJSON() : purchase.toJSON(),
        ip: req.ip || '',
        userAgent: req.get('User-Agent') || '',
        duration: formDuration,
        metadata: { itemCount: items.length, totalAmount, supplierId },
      });

      successResponse(res, completePurchase, 'Pengajuan ambil barang berhasil ditambahkan', 201);
    } catch (error) {
      await transaction.rollback();
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const purchase = await Purchase.findByPk(id);
      if (!purchase) {
        throw new AppError('Purchase not found', 404);
      }

      const previousData = purchase.toJSON();

      await purchase.update({
        status: status || purchase.status,
        notes: notes !== undefined ? notes : purchase.notes,
      });

      // Log activity
      await auditService.log({
        userId: req.user!.id,
        action: 'UPDATE' as any,
        entity: 'Purchase',
        entityId: purchase.id,
        before: previousData,
        after: purchase.toJSON(),
        ip: req.ip || '',
        userAgent: req.get('User-Agent') || '',
      });

      successResponse(res, purchase, 'Purchase updated successfully', 200);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();

    try {
      const { id } = req.params;

      const purchase = await Purchase.findByPk(id, {
        include: [
          {
            model: PurchaseItem,
            as: 'items',
          },
        ],
        transaction,
      });

      if (!purchase) {
        throw new AppError('Purchase not found', 404);
      }

      // Restore product stock
      for (const item of purchase.items!) {
        const product = await Product.findByPk(item.productId, { transaction });
        await product!.update(
          { stock: product!.stock - item.quantity },
          { transaction }
        );

        // Record Stock Movement (OUT) - Reversal
        await StockMovement.create({
            productId: item.productId,
            type: MovementType.OUT, // Taking back stock
            quantity: item.quantity,
            reference: `PURCHASE_DELETE:${purchase.purchaseNumber || id}`,
            notes: `Purchase deleted`,
            createdBy: req.user!.id
        }, { transaction });
      }

      // Log activity
      await auditService.log(
        {
          userId: req.user!.id,
          action: 'DELETE' as any,
          entity: 'Purchase',
          entityId: id,
          before: purchase.toJSON(),
          after: null,
          ip: req.ip || '',
          userAgent: req.get('User-Agent') || '',
        },
        transaction
      );

      // Delete purchase (cascade will delete items)
      await purchase.destroy({ transaction });

      await transaction.commit();

      successResponse(res, null, 'Pengajuan ambil barang berhasil dihapus', 200);
    } catch (error) {
      await transaction.rollback();
      next(error);
    }
  },
};
