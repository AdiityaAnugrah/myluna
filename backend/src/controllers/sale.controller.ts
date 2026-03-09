import { Request, Response, NextFunction } from 'express';
import { Sale, SaleItem, Product, ProductVariant, User, StockMovement, MovementType, ChangeRequest, Settlement } from '../models';
import { auditService } from '../services/audit.service';
import { socketService } from '../services/socket.service';
import { successResponse } from '../utils/response';
import { AppError } from '../utils/errors';
import { sequelize } from '../config/database';
import { Op } from 'sequelize';

export const saleController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        status = '', 
        paymentMethod = '',
        startDate = '',
        endDate = ''
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      const where: any = {};

      // Data Isolation: If role is USER, only show their own sales
      if ((req as any).user?.roleName === 'USER') {
        where.createdBy = (req as any).user.id;
      }

      if (status) {
        where.status = status;
      }

      if (paymentMethod) {
        where.paymentMethod = paymentMethod;
      }

      if (startDate && endDate) {
        where.saleDate = {
          [Op.between]: [new Date(startDate as string), new Date(endDate as string)],
        };
      }

      const { count, rows } = await Sale.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'fullName', 'email'],
          },
          {
            model: SaleItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'sku', 'name', 'unit', 'variants', 'length', 'width', 'height', 'weight'],
              },
            ],
          },
          {
            model: Settlement,
            as: 'settlement',
            attributes: ['id', 'netAmount', 'settlementDate'],
          },
        ],
        limit: Number(limit),
        offset,
        order: [['saleDate', 'DESC']],
      });

      // Fetch pending cancellation requests for these sales
      const saleIds = rows.map(r => r.id);
      const pendingCancels = await ChangeRequest.findAll({
        where: {
          entityType: 'SALE',
          entityId: { [Op.in]: saleIds },
          status: 'PENDING',
          requestType: 'DELETE',
        },
        attributes: ['entityId']
      });
      const pendingCancelSaleIds = new Set(pendingCancels.map(pc => pc.entityId));

      const salesWithCancelFlag = rows.map(sale => {
        const saleJson = sale.toJSON() as any;
        saleJson.isCancelPending = pendingCancelSaleIds.has(sale.id);
        return saleJson;
      });

      successResponse(
        res,
        {
          sales: salesWithCancelFlag,
          pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / Number(limit)),
          },
        },
        'Sales retrieved successfully',
        200
      );
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const sale = await Sale.findByPk(id, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'fullName', 'email'],
          },
          {
            model: SaleItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'sku', 'name', 'unit', 'variants'],
              },
            ],
          },
        ],
      });

      if (!sale) {
        throw new AppError('Sale not found', 404);
      }

      // Check for pending cancellation
      const pendingCancel = await ChangeRequest.findOne({
        where: {
          entityType: 'SALE',
          entityId: sale.id,
          status: 'PENDING',
          requestType: 'DELETE',
        }
      });

      const saleJson = sale.toJSON() as any;
      saleJson.isCancelPending = !!pendingCancel;

      successResponse(res, saleJson, 'Sale retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  },

  async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [statusCounts, todayCount] = await Promise.all([
        Sale.findAll({
          attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
          group: ['status'],
          raw: true,
        }),
        Sale.count({
          where: {
            saleDate: {
              [Op.gte]: today,
            },
          },
        }),
      ]);

      const stats = {
        PENDING: 0,
        APPROVED: 0,
        PROCESSED: 0,
        CANCELLED: 0,
        SETTLED: 0,
        COMPLETED: 0,
        WAITING_APPROVAL: 0,
        todaySales: todayCount,
        totalSales: 0,
      };

      statusCounts.forEach((record: any) => {
        if (stats.hasOwnProperty(record.status)) {
          stats[record.status as keyof typeof stats] = parseInt(record.count);
        }
        stats.totalSales += parseInt(record.count);
      });

      successResponse(res, stats, 'Sales stats retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();

    try {
      if (!req.user || !req.user.id) {
        throw new AppError('User not authenticated', 401);
      }

      // Handle JSON parsing if items is a string (multipart/form-data)
      if (typeof req.body.items === 'string') {
        try {
          req.body.items = JSON.parse(req.body.items);
        } catch (e) {
          throw new AppError('Invalid items format', 400);
        }
      }

      let {
        invoiceNumber,
        saleDate,
        customerName,
        customerPhone,
        paymentMethod,
        platform,
        items,
        notes,
        shippingService,
        shippingAddress
      } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        throw new AppError('Items must be a non-empty array', 400);
      }

      // Check if file is uploaded for HEMAT_CARGO
      let shippingDocument = null;
      const normalizedShippingService = shippingService?.toUpperCase().replace(/\s+|_/g, ' ');
      if (normalizedShippingService === 'HEMAT CARGO') {
         if (req.file) {
            shippingDocument = req.file.filename;
         } else {
            throw new AppError('Dokumen PDF wajib diunggah untuk Hemat Cargo', 400);
         }
      } else {
        // If not HEMAT_CARGO, check if file was uploaded anyway and maybe warn or ignore
        // But importantly, notes are required if not HEMAT_CARGO (implied by requirement "tambah lagi inputan ya itu alamat text area, nah tapi jika yang di pilih dari jasa pengiriman itu Hemat Caro maka otmatis input catatan hilang")
        // Actually, the requirement says "if Hemat Cargo, input catatan hilang". It doesn't explicitly say "mandatory" otherwise, but usually notes are optional. 
        // However, let's strictly follow: Hemat Cargo -> No Notes, PDF Required. Others -> Notes Available (maybe optional), No PDF Req.
      }

      // Validate invoice number
      if (!invoiceNumber || invoiceNumber.trim() === '') {
        throw new AppError('Nomor Invoice wajib diisi', 400);
      }
      const saleNumber = invoiceNumber.trim();

      // Check if sale number already exists
      const existingSale = await Sale.findOne({ where: { saleNumber } });
      if (existingSale) {
        throw new AppError('Nomor Invoice sudah digunakan, gunakan nomor yang lain', 400);
      }

      // Validate all products, check stock, and calculate total
      let totalAmount = 0;
      for (const item of items) {
        const product = await Product.findByPk(item.productId, { transaction });
        if (!product) {
          throw new AppError(`Product with ID ${item.productId} not found`, 404);
        }

        // If item has a variant, validate against variant stock; otherwise use main product stock
        if (item.variantName) {
          const variant = await ProductVariant.findOne({
            where: { productId: item.productId, value: item.variantName },
            transaction,
          });
          if (variant && variant.stock < item.quantity) {
            throw new AppError(
              `Stok tidak cukup untuk produk ${product.name} varian ${item.variantName}. Tersedia: ${variant.stock}, Diminta: ${item.quantity}`,
              400
            );
          }
        } else {
          if (product.stock < item.quantity) {
            throw new AppError(
              `Stok tidak cukup untuk produk ${product.name}. Tersedia: ${product.stock}, Diminta: ${item.quantity}`,
              400
            );
          }
        }

        const discount = Number(item.discount) || 0;
        const price = Number(item.price);
        const quantity = Number(item.quantity);
        const subtotal = (quantity * price) - discount;
        totalAmount += subtotal;
      }

      // Create sale
      const sale = await Sale.create(
        {
          saleNumber,
          saleDate,
          customerName,
          customerPhone,
          totalAmount,
          paymentMethod,
          platform: platform || 'OFFLINE_STORE',
          status: 'WAITING_APPROVAL' as any, // Default status
          notes: normalizedShippingService === 'HEMAT CARGO' ? null : notes,
          shippingService,
          shippingAddress,
          shippingDocument,
          createdBy: req.user.id,
        },
        { transaction }
      );

      // Create sale items and update product stock
      for (const item of items) {
        const discount = item.discount || 0;
        const subtotal = (item.quantity * item.price) - discount;

        await SaleItem.create(
          {
            saleId: sale.id,
            productId: item.productId,
            variantName: item.variantName,
            quantity: item.quantity,
            price: item.price,
            discount,
            subtotal,
          },
          { transaction }
        );

        // Update stock: main product stock - quantity
        const product = await Product.findByPk(item.productId, { transaction });
        await product!.update(
          { stock: product!.stock - item.quantity },
          { transaction }
        );

        // If item has a variant, also deduct from that variant's stock
        if (item.variantName) {
          const variant = await ProductVariant.findOne({
            where: { productId: item.productId, value: item.variantName },
            transaction,
          });
          if (variant) {
            await variant.update({ stock: variant.stock - item.quantity }, { transaction });
          }
        }

        // Record Stock Movement (OUT)
        await StockMovement.create({
            productId: item.productId,
            type: MovementType.OUT,
            quantity: item.quantity,
            reference: `SALE:${sale.saleNumber}`,
            notes: `Sale created${item.variantName ? ` (Varian: ${item.variantName})` : ''}`,
            createdBy: req.user!.id
        }, { transaction });
      }

      // Log activity
      const formDuration = req.body.duration ? Number(req.body.duration) : null;
      await auditService.log(
        {
          userId: req.user.id,
          action: 'CREATE' as any,
          entity: 'Sale',
          entityId: sale.id,
          before: null,
          after: { ...sale.toJSON(), items },
          ip: req.ip || '',
          userAgent: req.get('User-Agent') || '',
          duration: formDuration,
          metadata: { itemCount: items.length, totalAmount, platform: platform || 'OFFLINE_STORE' },
        },
        transaction
      );

      await transaction.commit();

      // Fetch complete sale with relations
      const completeSale = await Sale.findByPk(sale.id, {
        include: [
          {
            model: SaleItem,
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

      // Send real-time notification to admins
      socketService.emitToAdmins('approval:pending', {
        message: 'Persetujuan penjualan diperlukan',
        saleId: sale.id,
        saleNumber: sale.saleNumber,
        customerName: sale.customerName,
        totalAmount: `Rp ${totalAmount.toLocaleString('id-ID')}`,
      });

      successResponse(res, completeSale, 'Sale created successfully', 201);
    } catch (error) {
      await transaction.rollback();
      next(error);
    }
  },

  async approve(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const sale = await Sale.findByPk(id, { transaction });

      if (!sale) throw new AppError('Sale not found', 404);
      if (sale.status !== 'WAITING_APPROVAL' as any) throw new AppError('Sale is not waiting for approval', 400);

      await sale.update({ status: 'APPROVED' as any }, { transaction });

      await auditService.log({
          userId: req.user!.id,
          action: 'UPDATE' as any, // Or APPROVE if available
          entity: 'Sale',
          entityId: sale.id,
          before: { status: 'WAITING_APPROVAL' },
          after: { status: 'APPROVED' },
          ip: req.ip || '',
          userAgent: req.get('User-Agent') || ''
      }, transaction);

      await transaction.commit();
      successResponse(res, sale, 'Sale approved successfully');
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
  },

  async reject(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const sale = await Sale.findByPk(id, { include: [{ model: SaleItem, as: 'items' }], transaction });

      if (!sale) throw new AppError('Sale not found', 404);
      if (sale.status !== 'WAITING_APPROVAL' as any) throw new AppError('Sale is not waiting for approval', 400);

      // Restore stock
      if (sale.items) {
          for (const item of sale.items) {
              const product = await Product.findByPk(item.productId, { transaction });
              if (product) {
                  await product.update({ stock: product.stock + item.quantity }, { transaction });

                  // Record Stock Movement (IN) - Return stock
                  await StockMovement.create({
                      productId: item.productId,
                      type: MovementType.IN,
                      quantity: item.quantity,
                      reference: `SALE_REJECT:${sale.saleNumber}`,
                      notes: `Sale rejected`,
                      createdBy: req.user!.id
                  }, { transaction });
              }
          }
      }

      await sale.update({ status: 'REJECTED' as any }, { transaction });

      await auditService.log({
          userId: req.user!.id,
          action: 'UPDATE' as any, // Or REJECT
          entity: 'Sale',
          entityId: sale.id,
          before: { status: 'WAITING_APPROVAL' },
          after: { status: 'REJECTED' },
          ip: req.ip || '',
          userAgent: req.get('User-Agent') || ''
      }, transaction);

      await transaction.commit();
      successResponse(res, sale, 'Sale rejected successfully');
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
  },

  async process(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const sale = await Sale.findByPk(id, { transaction });

      if (!sale) throw new AppError('Sale not found', 404);
      
      // Allow processing from both WAITING_APPROVAL (auto-approve for TCP) and APPROVED status
      if (!['WAITING_APPROVAL', 'APPROVED'].includes(sale.status as string)) {
        throw new AppError(
          `Sale cannot be processed. Current status: ${sale.status}. Sale must be WAITING_APPROVAL or APPROVED.`, 
          400
        );
      }
      
      // Auto-approve if still waiting (for TCP role workflow)
      if (sale.status === 'WAITING_APPROVAL' as any) {
        await sale.update({ status: 'APPROVED' as any }, { transaction });
        
        // Log the auto-approval
        await auditService.log({
          userId: req.user!.id,
          action: 'UPDATE' as any,
          entity: 'Sale',
          entityId: sale.id,
          before: { status: 'WAITING_APPROVAL' },
          after: { status: 'APPROVED' },
          ip: req.ip || '',
          userAgent: req.get('User-Agent') || ''
        }, transaction);
      }

      // Mark as processed with timestamp
      await sale.update({ 
        status: 'PROCESSED' as any,
        processedAt: new Date()
      }, { transaction });

      await auditService.log({
          userId: req.user!.id,
          action: 'UPDATE' as any,
          entity: 'Sale',
          entityId: sale.id,
          before: { status: 'APPROVED' },
          after: { status: 'PROCESSED', processedAt: sale.processedAt },
          ip: req.ip || '',
          userAgent: req.get('User-Agent') || ''
      }, transaction);

      await transaction.commit();
      
      // Send real-time notification to TCP team  
      socketService.emitToTCP('shipping:ready', {
        message: 'Pesanan siap untuk dikirim',
        saleId: sale.id,
        customerName: sale.customerName || 'N/A',
        totalAmount: sale.totalAmount || 0,
        processedBy: (req.user as any)?.fullName || req.user?.username,
      });
      
      successResponse(res, sale, 'Sale processed successfully');
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const sale = await Sale.findByPk(id);
      if (!sale) {
        throw new AppError('Sale not found', 404);
      }

      const previousData = sale.toJSON();

      await sale.update({
        status: status || sale.status,
        notes: notes !== undefined ? notes : sale.notes,
      });

      // Log activity
      await auditService.log({
        userId: req.user!.id,
        action: 'UPDATE' as any,
        entity: 'Sale',
        entityId: sale.id,
        before: previousData,
        after: sale.toJSON(),
        ip: req.ip || '',
        userAgent: req.get('User-Agent') || '',
      });

      successResponse(res, sale, 'Sale updated successfully', 200);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();

    try {
      const { id } = req.params;

      const sale = await Sale.findByPk(id, {
        include: [
          {
            model: SaleItem,
            as: 'items',
          },
        ],
        transaction,
      });

      if (!sale) {
        throw new AppError('Sale not found', 404);
      }

      // Restore product stock
      for (const item of sale.items!) {
        const product = await Product.findByPk(item.productId, { transaction });
        await product!.update(
          { stock: product!.stock + item.quantity },
          { transaction }
        );

        // Record Stock Movement (IN) - Return stock
        await StockMovement.create({
            productId: item.productId,
            type: MovementType.IN,
            quantity: item.quantity,
            reference: `SALE_DELETE:${sale.saleNumber || id}`,
            notes: `Sale deleted`,
            createdBy: req.user!.id
        }, { transaction });
      }

      // Log activity before deletion (since we have the data)
      await auditService.log(
        {
          userId: req.user!.id,
          action: 'DELETE' as any,
          entity: 'Sale',
          entityId: sale.id,
          before: sale.toJSON(),
          after: null,
          ip: req.ip || '',
          userAgent: req.get('User-Agent') || '',
        },
        transaction
      );

      // Delete sale (cascade will delete items)
      await sale.destroy({ transaction });

      await transaction.commit();

      successResponse(res, null, 'Sale deleted successfully', 200);
    } catch (error) {
      await transaction.rollback();
      next(error);
    }
  },
  async requestCancellation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason || reason.trim().length === 0) {
        throw new AppError('Alasan pembatalan harus diisi', 400);
      }

      const sale = await Sale.findByPk(id);

      if (!sale) {
        throw new AppError('Sale not found', 404);
      }

      if (['CANCELLED', 'COMPLETED', 'SETTLED'].includes(sale.status as string)) {
        throw new AppError('Penjualan ini sudah selesai dan tidak dapat dibatalkan', 400);
      }

      // Check if there's already a pending cancellation request
      const existingRequest = await ChangeRequest.findOne({
        where: {
          entityType: 'SALE',
          entityId: id,
          status: 'PENDING',
        },
      });

      if (existingRequest) {
        throw new AppError('Sudah ada pengajuan pembatalan yang sedang menunggu persetujuan', 400);
      }

      const changeRequest = await ChangeRequest.create({
        entityType: 'SALE',
        entityId: id,
        requestType: 'DELETE', // Using DELETE as identifying action for "Cancel"
        status: 'PENDING',
        payload: {
          saleId: id,
          saleNumber: sale.saleNumber,
          customerName: sale.customerName,
          totalAmount: sale.totalAmount,
          reason: reason.trim(),
        },
        requestedBy: req.user!.id,
      });

      await auditService.log({
        userId: req.user!.id,
        action: 'CREATE' as any,
        entity: 'ChangeRequest',
        entityId: changeRequest.id,
        before: null,
        after: changeRequest.toJSON(),
        ip: req.ip || '',
        userAgent: req.get('User-Agent') || '',
      });

      // Notify admins
      const { socketService } = require('../services/socket.service');
      socketService.emitToAdmins('notification:new', {
        message: 'Pengajuan Pembatalan Penjualan',
        description: `${(req.user as any)?.fullName || 'User'} mengajukan pembatalan penjualan #${sale.saleNumber}. Alasan: ${reason.trim()}`,
        type: 'WARNING',
      });

      successResponse(res, changeRequest, 'Pengajuan pembatalan penjualan berhasil dikirim', 201);
    } catch (error) {
      next(error);
    }
  },
};
