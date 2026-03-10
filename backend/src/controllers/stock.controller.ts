import { Request, Response, NextFunction } from 'express';
import { StockMovement, Product, MovementType, User } from '../models';
import { successResponse } from '../utils/response';
import { AppError } from '../utils/errors';
import { sequelize } from '../config/database';
import { Op } from 'sequelize';
import { auditService } from '../services/audit.service';

export const stockController = {
  async getMovements(req: Request, res: Response, next: NextFunction) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        productId = '',
        type = '',
        startDate = '',
        endDate = ''
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      const where: any = {};

      if (productId) {
        where.productId = productId;
      }

      if (type) {
        where.type = type;
      }

      if (startDate && endDate) {
        where.createdAt = {
          [Op.between]: [new Date(startDate as string), new Date(endDate as string)],
        };
      }

      const { count, rows } = await StockMovement.findAndCountAll({
        where,
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'sku', 'name', 'unit'],
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'fullName', 'email'],
          },
        ],
        limit: Number(limit),
        offset,
        order: [['createdAt', 'DESC']],
      });

      return successResponse(
        res,
        {
          movements: rows,
          pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / Number(limit)),
          },
        },
        'Stock movements retrieved successfully',
        200
      );
    } catch (error) {
      return next(error);
    }
  },

  async createAdjustment(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();

    try {
      const { productId, variantName, quantity, type, notes } = req.body;

      // Validate product
      const product = await Product.findByPk(productId, { transaction });
      
      // Check for approval workflow
      // const userRole = (req as any).user?.roleName;
      // const userId = (req as any).user?.id;


      
      if (!product) {
        throw new AppError('Product not found', 404);
      }

      // Calculate final quantity based on type
      // If OUT, make quantity negative
      const finalQuantity = type === 'OUT' ? -Math.abs(quantity) : Math.abs(quantity);

      if (variantName) {
        const variant = await sequelize.models.ProductVariant.findOne({
          where: { productId, value: variantName },
          transaction,
        }) as any;
        
        if (!variant) {
            throw new AppError(`Varian ${variantName} tidak ditemukan`, 404);
        }
        
        if (type === 'OUT' && variant.stock < Math.abs(quantity)) {
            throw new AppError(
              `Stok varian tidak cukup. Tersedia: ${variant.stock}, Diminta: ${Math.abs(quantity)}`,
              400
            );
        }
        
        await variant.update(
            { stock: variant.stock + finalQuantity },
            { transaction }
        );
      } else {
          // Check if stock would go negative for OUT transactions (main product)
          if (type === 'OUT' && product.stock < Math.abs(quantity)) {
            throw new AppError(
              `Stok tidak cukup. Tersedia: ${product.stock}, Diminta: ${Math.abs(quantity)}`,
              400
            );
          }
      }

      // Create stock movement
      const movement = await StockMovement.create(
        {
          productId,
          type: MovementType.ADJUSTMENT,
          quantity: finalQuantity,
          reference: 'MANUAL_ADJUSTMENT',
          notes: (notes || '') + (variantName ? ` (Varian: ${variantName})` : ''),
          createdBy: req.user!.id,
        },
        { transaction }
      );

      // Update product stock
      await product.update(
        { stock: product.stock + finalQuantity },
        { transaction }
      );

      await transaction.commit();

      // Fetch complete movement with relations
      const completeMovement = await StockMovement.findByPk(movement.id, {
        include: [
          {
            model: Product,
            as: 'product',
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'fullName', 'email'],
          },
        ],
      });

      // Log activity
      await auditService.log(
        {
          userId: req.user!.id,
          action: 'CREATE' as any,
          entity: 'StockMovement',
          entityId: movement.id,
          before: { stock: product.stock },
          after: { 
            ...movement.toJSON(), 
            newProductStock: product.stock + finalQuantity 
          },
          ip: req.ip || '',
          userAgent: req.get('User-Agent') || '',
        },
        transaction
      );

      return successResponse(
        res,
        completeMovement,
        'Stock adjustment created successfully',
        201
      );
    } catch (error) {
      await transaction.rollback();
      return next(error);
    }
  },

  async getStockReport(_req: Request, res: Response, next: NextFunction) {
    try {
      const products = await Product.findAll({
        where: { isActive: true },
        attributes: [
          'id',
          'sku',
          'name',
          'unit',
          'stock',
          'minStock',
          'purchasePrice',
          'sellingPrice',
        ],
        order: [['name', 'ASC']],
      });

      // Calculate stock value and categorize products
      const report = products.map((product) => {
        const stockValue = product.stock * product.purchasePrice;
        const status =
          product.stock === 0
            ? 'OUT_OF_STOCK'
            : product.stock <= product.minStock
            ? 'LOW_STOCK'
            : 'NORMAL';

        return {
          ...product.toJSON(),
          stockValue,
          status,
        };
      });

      // Calculate summary
      const summary = {
        totalProducts: products.length,
        totalStockValue: report.reduce((sum, p) => sum + p.stockValue, 0),
        outOfStock: report.filter((p) => p.status === 'OUT_OF_STOCK').length,
        lowStock: report.filter((p) => p.status === 'LOW_STOCK').length,
        normal: report.filter((p) => p.status === 'NORMAL').length,
      };

      return successResponse(
        res,
        {
          summary,
          products: report,
        },
        'Stock report generated successfully',
        200
      );
    } catch (error) {
      return next(error);
    }
  },
};
