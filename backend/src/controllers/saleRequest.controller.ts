import { Request, Response, NextFunction } from 'express';
import { SaleReturnRequest, Sale, User, RequestStatus } from '../models';
import { successResponse } from '../utils/response';
import { AppError } from '../utils/errors';
import { sequelize } from '../config/database';
import { socketService } from '../services/socket.service';

export const saleRequestController = {
  // Create a new return/exchange request (User)
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { saleId, type, reason } = req.body;
      const userId = (req as any).user.id;
      const userFullName = (req as any).user.fullName || (req as any).user.username;

      const sale = await Sale.findByPk(saleId);
      if (!sale) {
        throw new AppError('Sale not found', 404);
      }

      const request = await SaleReturnRequest.create({
        saleId,
        type,
        reason,
        requestedBy: userId,
        status: RequestStatus.PENDING,
      });

      // Notify admins
      socketService.emitToAdmins('approval:pending', {
        message: `Permintaan retur penjualan baru dari ${userFullName}`,
        description: `No. Nota: ${sale.saleNumber} - Alasan: ${reason}`,
        requestId: request.id,
        type: 'SALE_RETURN'
      });

      successResponse(res, request, 'Return request submitted successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  // List all pending requests (Admin)
  async listPending(_req: Request, res: Response, next: NextFunction) {
    try {
      const requests = await SaleReturnRequest.findAll({
        where: { status: RequestStatus.PENDING },
        include: [
          {
            model: Sale,
            as: 'sale',
            attributes: ['id', 'saleNumber', 'totalAmount', 'saleDate'],
          },
          {
            model: User,
            as: 'requester',
            attributes: ['id', 'username', 'fullName'],
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      successResponse(res, requests, 'Pending return requests retrieved successfully', 200);
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

      const request = await SaleReturnRequest.findByPk(id, { transaction });
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
      
      // Note: Actual inventory adjustment logic for return would typically go here
      // For now, we appove the request and leave manual adjustment to admin or implement automatic logic later

      await transaction.commit();

      // Notify user
      if (request.requestedBy) {
        socketService.emitToUser(request.requestedBy, 'notification:new', {
          message: 'Permintaan Retur Disetujui',
          description: 'Permintaan retur penjualan Anda telah disetujui oleh admin.',
          type: 'SUCCESS'
        });
      }

      successResponse(res, request, 'Return request approved successfully', 200);
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

      const request = await SaleReturnRequest.findByPk(id);
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
          message: 'Permintaan Retur Ditolak',
          description: `Permintaan retur penjualan Anda telah ditolak${rejectionReason ? ': ' + rejectionReason : '.'}`,
          type: 'ERROR'
        });
      }

      successResponse(res, request, 'Return request rejected successfully', 200);
    } catch (error) {
      next(error);
    }
  },
};
