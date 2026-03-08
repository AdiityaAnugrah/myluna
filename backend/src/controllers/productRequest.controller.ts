import { Request, Response, NextFunction } from 'express';
import { ProductStatusRequest, Product, User, RequestStatus, ProductStatus } from '../models';
import { successResponse } from '../utils/response';
import { AppError } from '../utils/errors';
import { sequelize } from '../config/database';
import { socketService } from '../services/socket.service';

export const productRequestController = {
  // Create a new status change request (User)
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId, requestedStatus, reason } = req.body;
      const userId = (req as any).user.id;
      const userFullName = (req as any).user.fullName || (req as any).user.username;

      const product = await Product.findByPk(productId);
      if (!product) {
        throw new AppError('Product not found', 404);
      }

      // Validate requested status
      if (
        (requestedStatus === ProductStatus.PASSIVE && !product.isActive) ||
        (requestedStatus === ProductStatus.ACTIVE && product.isActive)
      ) {
        throw new AppError('Product is already in the requested status', 400);
      }

      const request = await ProductStatusRequest.create({
        productId,
        requestedStatus,
        reason,
        requestedBy: userId,
        status: RequestStatus.PENDING,
      });

      // Notify admins
      socketService.emitToAdmins('approval:pending', {
        message: `Permintaan perubahan status produk dari ${userFullName}`,
        description: `Produk: ${product.name} (${product.sku}) menjadi ${requestedStatus === ProductStatus.ACTIVE ? 'Aktif' : 'Pasif'}`,
        requestId: request.id,
        type: 'PRODUCT_STATUS'
      });

      successResponse(res, request, 'Status change request submitted successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  // List all pending requests (Admin)
  async listPending(_req: Request, res: Response, next: NextFunction) {
    try {
      const requests = await ProductStatusRequest.findAll({
        where: { status: RequestStatus.PENDING },
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'sku', 'isActive'],
          },
          {
            model: User,
            as: 'requester',
            attributes: ['id', 'username', 'fullName'],
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      successResponse(res, requests, 'Pending requests retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  },

  // Approve a request (Admin)
  async approve(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      const request = await ProductStatusRequest.findByPk(id, { transaction });
      if (!request) {
        throw new AppError('Request not found', 404);
      }

      if (request.status !== RequestStatus.PENDING) {
        throw new AppError('Request has already been processed', 400);
      }

      // Update request status
      await request.update(
        {
          status: RequestStatus.APPROVED,
          processedBy: userId,
        },
        { transaction }
      );

      // Update product status
      const product = await Product.findByPk(request.productId, { transaction });
      if (product) {
        await product.update(
          { isActive: request.requestedStatus === ProductStatus.ACTIVE },
          { transaction }
        );
      }

      await transaction.commit();

      // Notify user
      if (request.requestedBy) {
        socketService.emitToUser(request.requestedBy, 'notification:new', {
          message: 'Permintaan Perubahan Disetujui',
          description: `Permintaan perubahan status untuk produk ${product?.name || ''} telah disetujui.`,
          type: 'SUCCESS'
        });
      }

      successResponse(res, request, 'Request approved successfully', 200);
    } catch (error) {
      await transaction.rollback();
      next(error);
    }
  },

  // Reject a request (Admin)
  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;
      const userId = (req as any).user.id;

      const request = await ProductStatusRequest.findByPk(id);
      if (!request) {
        throw new AppError('Request not found', 404);
      }

      if (request.status !== RequestStatus.PENDING) {
        throw new AppError('Request has already been processed', 400);
      }

      await request.update({
        status: RequestStatus.REJECTED,
        processedBy: userId,
        rejectionReason: rejectionReason || null,
      });

      // Notify user
      if (request.requestedBy) {
        socketService.emitToUser(request.requestedBy, 'notification:new', {
          message: 'Permintaan Perubahan Ditolak',
          description: `Permintaan perubahan status untuk produk telah ditolak${rejectionReason ? ': ' + rejectionReason : '.'}`,
          type: 'ERROR'
        });
      }

      successResponse(res, request, 'Request rejected successfully', 200);
    } catch (error) {
      next(error);
    }
  },
};
