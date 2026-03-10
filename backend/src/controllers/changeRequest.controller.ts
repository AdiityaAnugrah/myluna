import { Request, Response, NextFunction } from 'express';
import { ChangeRequest, RequestStatus, EntityType, RequestType, Product, Category, Supplier, StockMovement, User, MovementType, Settlement, Sale, SaleItem, ProductVariant } from '../models';
import { successResponse } from '../utils/response';
import { AppError } from '../utils/errors';
import { sequelize } from '../config/database';
import { socketService } from '../services/socket.service';

export const changeRequestController = {
  // Create a generic change request (used for USER stock adjustment requests)
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { entityType, entityId, requestType, payload } = req.body;

      if (!entityType || !requestType || !payload) {
        throw new AppError('entityType, requestType, and payload are required', 400);
      }

      const request = await ChangeRequest.create({
        entityType,
        entityId: entityId || null,
        requestType,
        payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
        status: RequestStatus.PENDING,
        requestedBy: userId,
      });

      // Notify admins via socket
      socketService.emitToAdmins('notification:new', {
        message: 'Permintaan Penyesuaian Stok',
        description: 'Pengajuan penyesuaian stok baru memerlukan persetujuan.',
        type: 'INFO',
      });

      return successResponse(res, request, 'Permintaan penyesuaian stok berhasil diajukan', 201);
    } catch (error) {
      return next(error);
    }
  },

  // List all pending requests (Admin only)
  async listPending(_req: Request, res: Response, next: NextFunction) {
    try {
      const requests = await ChangeRequest.findAll({
        where: { status: RequestStatus.PENDING },
        include: [
          {
            model: User,
            as: 'requester',
            attributes: ['id', 'username', 'fullName', 'email'],
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      return successResponse(res, requests, 'Pending requests retrieved successfully', 200);
    } catch (error) {
      return next(error);
    }
  },

  // Approve a request
  async approve(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      const request = await ChangeRequest.findByPk(id, { transaction });
      if (!request) {
        throw new AppError('Request not found', 404);
      }

      if (request.status !== RequestStatus.PENDING) {
        throw new AppError('Request has already been processed', 400);
      }

      const { entityType, entityId, requestType, payload } = request;

      // Apply changes based on Entity Type
      switch (entityType) {
        case EntityType.PRODUCT:
          await handleProductChange(requestType, entityId, payload, transaction);
          break;
        case EntityType.CATEGORY:
          await handleCategoryChange(requestType, entityId, payload, transaction);
          break;
        case EntityType.SUPPLIER:
          await handleSupplierChange(requestType, entityId, payload, transaction);
          break;
        /* Stock Adjustments might be handled differently or here too */
         case EntityType.STOCK:
             await handleStockChange(requestType, entityId, payload, transaction, userId);
             break;
        case EntityType.SETTLEMENT:
            await handleSettlementCancellation(entityId, payload, transaction, userId);
            break;
        case EntityType.SALE:
            await handleSaleCancellation(entityId, payload, transaction, userId);
            break;
        default:
          throw new AppError(`Unsupported entity type: ${entityType}`, 400);
      }

      // Update request status
      await request.update(
        {
          status: RequestStatus.APPROVED,
          reviewedBy: userId,
        },
        { transaction }
      );

      await transaction.commit();

      // Notify requester
      if (request.requestedBy) {
        socketService.emitToUser(request.requestedBy, 'notification:new', {
          message: 'Permintaan Perubahan Disetujui',
          description: `Permintaan perubahan untuk ${request.entityType} telah disetujui dan diterapkan.`,
          type: 'SUCCESS'
        });
      }

      return successResponse(res, request, 'Request approved and applied successfully', 200);
    } catch (error) {
      await transaction.rollback();
      return next(error);
    }
  },

  // Reject a request
  async reject(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;
      const userId = (req as any).user.id;

      const request = await ChangeRequest.findByPk(id, { transaction });
      if (!request) {
        throw new AppError('Request not found', 404);
      }

      if (request.status !== RequestStatus.PENDING) {
        throw new AppError('Request has already been processed', 400);
      }

      // Update request status
      await request.update(
        {
          status: RequestStatus.REJECTED,
          reviewedBy: userId,
          rejectionReason,
        },
        { transaction }
      );

      await transaction.commit();

      // Notify requester
      if (request.requestedBy) {
        socketService.emitToUser(request.requestedBy, 'notification:new', {
          message: 'Permintaan Perubahan Ditolak',
          description: `Permintaan perubahan untuk ${request.entityType} telah ditolak${rejectionReason ? ': ' + rejectionReason : '.'}`,
          type: 'ERROR'
        });
      }

      return successResponse(res, request, 'Request rejected', 200);
    } catch (error) {
      await transaction.rollback();
      return next(error);
    }
  },
};

// Helper functions to apply changes
async function handleProductChange(type: RequestType, id: string | null, payload: any, transaction: any) {
  // Parse payload if it's a string
  const data = typeof payload === 'string' ? JSON.parse(payload) : payload;

  // Explicitly pick only valid Product model fields (ignore tracking fields like duration, metadata, etc.)
  const PRODUCT_FIELDS = ['sku','name','description','categoryId','unit','purchasePrice','sellingPrice','stock','minStock','isActive','imageUrl','length','width','height','weight','variants','marketplaceLinks','slug'];
  const productData: any = {};
  for (const key of PRODUCT_FIELDS) {
    if (data[key] !== undefined) productData[key] = data[key];
  }

  // Auto-generate SKU if not provided (form no longer shows SKU input)
  if (!productData.sku) {
    const nameSlug = (productData.name || 'PRD').substring(0, 5).toUpperCase().replace(/\s/g, '');
    productData.sku = `SKU-${Date.now()}-${nameSlug}`;
  }

  // Separate variants from product insert fields
  const { variants } = data;
  delete productData.variants; // Don't put variants in Product.create (use ProductVariant table)

  if (type === RequestType.CREATE) {
    const product = await Product.create(productData, { transaction });
    if (variants && Array.isArray(variants)) {
      await ProductVariant.bulkCreate(
        variants.map((v: any) => ({
          ...v,
          productId: product.id,
        })),
        { transaction }
      );
    }
  } else if (type === RequestType.UPDATE) {
    if (!id) throw new Error('Entity ID required for UPDATE');
    const product = await Product.findByPk(id, { transaction });
    if (!product) throw new Error('Product not found');

    // Don't overwrite SKU on update if not changed
    if (!data.sku) delete productData.sku;

    await product.update(productData, { transaction });

    if (variants && Array.isArray(variants)) {
      await ProductVariant.destroy({ where: { productId: id }, transaction });
      await ProductVariant.bulkCreate(
        variants.map((v: any) => ({
          ...v,
          productId: id,
        })),
        { transaction }
      );
    }
  } else if (type === RequestType.DELETE) {
    if (!id) throw new Error('Entity ID required for DELETE');
    const product = await Product.findByPk(id, { transaction });
    if (!product) throw new Error('Product not found');
    await product.update({ isActive: false }, { transaction });
  }
}

async function handleCategoryChange(type: RequestType, id: string | null, payload: any, transaction: any) {
  const data = typeof payload === 'string' ? JSON.parse(payload) : payload;

  // Explicit allowlist — only valid Category model fields
  const CATEGORY_FIELDS = ['name', 'description', 'parentId', 'isActive'];
  const categoryData: any = {};
  for (const key of CATEGORY_FIELDS) {
    if (data[key] !== undefined) categoryData[key] = data[key];
  }

  if (type === RequestType.CREATE) {
    await Category.create(categoryData, { transaction });
  } else if (type === RequestType.UPDATE) {
    if (!id) throw new Error('Entity ID required for UPDATE');
    const category = await Category.findByPk(id, { transaction });
    if (!category) throw new Error('Category not found');
    await category.update(categoryData, { transaction });
  } else if (type === RequestType.DELETE) {
    if (!id) throw new Error('Entity ID required for DELETE');
    const category = await Category.findByPk(id, { transaction });
    if (!category) throw new Error('Category not found');
    await category.update({ isActive: false }, { transaction });
  }
}

async function handleSupplierChange(type: RequestType, id: string | null, payload: any, transaction: any) {
  const data = typeof payload === 'string' ? JSON.parse(payload) : payload;

  // Explicit allowlist — only valid Supplier model fields
  const SUPPLIER_FIELDS = ['name', 'contact', 'phone', 'email', 'address', 'isActive'];
  const supplierData: any = {};
  for (const key of SUPPLIER_FIELDS) {
    if (data[key] !== undefined) supplierData[key] = data[key];
  }

  if (type === RequestType.CREATE) {
    await Supplier.create(supplierData, { transaction });
  } else if (type === RequestType.UPDATE) {
    if (!id) throw new Error('Entity ID required for UPDATE');
    const supplier = await Supplier.findByPk(id, { transaction });
    if (!supplier) throw new Error('Supplier not found');
    await supplier.update(supplierData, { transaction });
  } else if (type === RequestType.DELETE) {
    if (!id) throw new Error('Entity ID required for DELETE');
    const supplier = await Supplier.findByPk(id, { transaction });
    if (!supplier) throw new Error('Supplier not found');
    await supplier.update({ isActive: false }, { transaction });
  }
}

async function handleStockChange(type: RequestType, _id: string | null, payload: any, transaction: any, userId: string) {
    // Parse payload if it's a string
    const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
    
    if (type === RequestType.CREATE) {
        // payload: { productId, quantity, type, notes }
        // Re-use stock controller logic essentially
        const { productId, variantName, quantity, type: moveType, notes } = data;
        
        const product = await Product.findByPk(productId, { transaction });
        if(!product) throw new Error("Product not found");

        const finalQuantity = moveType === 'OUT' ? -Math.abs(quantity) : Math.abs(quantity);

        if (variantName) {
            const variant = await ProductVariant.findOne({
                where: { productId, value: variantName },
                transaction,
            });
            if (!variant) throw new Error(`Varian ${variantName} tidak ditemukan`);
            
            if (moveType === 'OUT' && variant.stock < Math.abs(quantity)) {
                 throw new Error(`Stok varian tidak cukup. Tersedia: ${variant.stock}`);
            }
            await variant.update({ stock: variant.stock + finalQuantity }, { transaction });
        } else {
            if (moveType === 'OUT' && product.stock < Math.abs(quantity)) {
                 throw new Error(`Insufficient stock. Available: ${product.stock}`);
            }
        }

        await StockMovement.create({
            productId,
            type: MovementType.ADJUSTMENT,
            quantity: finalQuantity,
            reference: 'SYSTEM_APPROVAL',
            notes: (notes || '') + (variantName ? ` (Varian: ${variantName})` : ''),
            createdBy: userId 
        }, { transaction });

        await product.update({ stock: product.stock + finalQuantity }, { transaction });
    }
}

async function handleSettlementCancellation(_entityId: string | null, payload: any, transaction: any, _userId: string) {
  const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
  const { settlementId } = data;

  if (!settlementId) throw new Error('Settlement ID is required');

  const settlement = await Settlement.findByPk(settlementId, {
    include: [{
      model: Sale,
      as: 'sale',
      include: [{ model: SaleItem, as: 'items' }],
    }],
    transaction,
  });

  if (!settlement) throw new Error('Settlement not found');

  const sale = (settlement as any).sale;

  // 1. Restore stock & record movements
  if (sale && sale.items) {
    for (const item of sale.items) {
      const product = await Product.findByPk(item.productId, { transaction });
      if (product) {
        await product.update({ stock: product.stock + item.quantity }, { transaction });
        
        if (item.variantName) {
            const variant = await ProductVariant.findOne({
                where: { productId: item.productId, value: item.variantName },
                transaction,
            });
            if (variant) {
                await variant.update({ stock: variant.stock + item.quantity }, { transaction });
            }
        }

        await StockMovement.create({
          productId: item.productId,
          type: MovementType.IN,
          quantity: item.quantity,
          reference: `CANCEL:${sale.saleNumber || settlementId}`,
          notes: `Pembatalan pelunasan disetujui. Alasan: ${data.reason || '-'}${item.variantName ? ` (Varian: ${item.variantName})` : ''}`,
          createdBy: _userId,
        }, { transaction });
      }
    }

    // 2. Update sale status to CANCELLED
    await sale.update({ status: 'CANCELLED' as any }, { transaction });
  }

  // 3. Delete settlement
  await settlement.destroy({ transaction });
}

async function handleSaleCancellation(id: string | null, payload: any, transaction: any, _userId: string) {
  const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
  const { saleId } = data;

  if (!saleId && !id) throw new Error('Sale ID is required');
  const targetId = saleId || id;

  const sale = await Sale.findByPk(targetId, {
    include: [{ model: SaleItem, as: 'items' }],
    transaction,
  });

  if (!sale) throw new Error('Sale not found');

  if (sale.status === 'CANCELLED') {
      throw new Error('Sale is already cancelled');
  }

  // 1. Restore stock & record movements
  if (sale.items) {
    for (const item of sale.items) {
      const product = await Product.findByPk(item.productId, { transaction });
      if (product) {
        await product.update({ stock: product.stock + item.quantity }, { transaction });
        
        if (item.variantName) {
            const variant = await ProductVariant.findOne({
                where: { productId: item.productId, value: item.variantName },
                transaction,
            });
            if (variant) {
                await variant.update({ stock: variant.stock + item.quantity }, { transaction });
            }
        }

        await StockMovement.create({
          productId: item.productId,
          type: MovementType.IN,
          quantity: item.quantity,
          reference: `CANCEL:${sale.saleNumber}`,
          notes: `Pembatalan penjualan disetujui. Alasan: ${data.reason || '-'}${item.variantName ? ` (Varian: ${item.variantName})` : ''}`,
          createdBy: _userId,
        }, { transaction });
      }
    }
  }

  // 2. Update sale status to CANCELLED
  await sale.update({ status: 'CANCELLED' as any }, { transaction });
}
