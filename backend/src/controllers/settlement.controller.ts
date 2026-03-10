import { Request, Response, NextFunction } from 'express';
import { Settlement, Sale, User, ChangeRequest } from '../models';
import { successResponse } from '../utils/response';
import { AppError } from '../utils/errors';
import { sequelize } from '../config/database';
import { Op } from 'sequelize';
import { auditService } from '../services/audit.service';

export const settlementController = {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const {
        page = 1,
        limit = 10,
        startDate = '',
        endDate = '',
        status = '', // 'pending' or 'settled'
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      
      // Build where clause for settlements
      const settlementWhere: any = {};
      
      if (startDate && endDate) {
        settlementWhere.settlementDate = {
          [Op.between]: [new Date(startDate as string), new Date(endDate as string)],
        };
      }

      // Get processed sales with optional settlement filter
      const saleWhere: any = {
        status: 'PROCESSED',
      };

      // Data Isolation: If role is USER, only show their own data
      if ((req as any).user?.roleName === 'USER') {
        const userId = (req as any).user.id;
        settlementWhere.createdBy = userId;
        saleWhere.createdBy = userId;
      }


      if (status === 'pending') {
        // Get processed sales without settlements
        const { count, rows } = await Sale.findAndCountAll({
          where: saleWhere,
          include: [
            {
              model: Settlement,
              as: 'settlement',
              required: false,
            },
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'fullName', 'email'],
            },
          ],
          limit: Number(limit),
          offset,
          order: [['processedAt', 'DESC']],
        });

        // Filter out sales that have settlements
        const pendingSales = rows.filter(sale => !sale.settlement);
        
        return successResponse(
          res,
          {
            settlements: pendingSales.map(sale => ({
              sale,
              needsSettlement: true,
              daysSinceProcessed: Math.floor(
                (Date.now() - new Date(sale.processedAt!).getTime()) / (1000 * 60 * 60 * 24)
              ),
            })),
            pagination: {
              total: count,
              page: Number(page),
              limit: Number(limit),
              totalPages: Math.ceil(count / Number(limit)),
            },
          },
          'Pending settlements retrieved successfully',
          200
        );
      }

      // Get settlements (status='settled' or all)
      const { count, rows } = await Settlement.findAndCountAll({
        where: settlementWhere,
        include: [
          {
            model: Sale,
            as: 'sale',
            include: [
              {
                model: User,
                as: 'creator',
                attributes: ['id', 'fullName', 'email'],
              },
            ],
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'fullName', 'email'],
          },
        ],
        limit: Number(limit),
        offset,
        order: [['settlementDate', 'DESC']],
      });

      return successResponse(
        res,
        {
          settlements: rows,
          pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / Number(limit)),
          },
        },
        'Settlements retrieved successfully',
        200
      );
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const settlement = await Settlement.findByPk(id, {
        include: [
          {
            model: Sale,
            as: 'sale',
            include: [
              {
                model: User,
                as: 'creator',
                attributes: ['id', 'fullName', 'email'],
              },
            ],
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'fullName', 'email'],
          },
        ],
      });

      if (!settlement) {
        throw new AppError('Settlement not found', 404);
      }

      return successResponse(res, settlement, 'Settlement retrieved successfully', 200);
    } catch (error) {
      return next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();

    try {
      const { saleId, netAmount, settlementDate, notes } = req.body;

      // Validate sale exists and is PROCESSED
      const sale = await Sale.findByPk(saleId, { transaction });
      if (!sale) {
        throw new AppError('Sale not found', 404);
      }

      if (sale.status !== 'PROCESSED') {
        throw new AppError('Only processed sales can be settled', 400);
      }

      // Check if settlement already exists for this sale
      const existingSettlement = await Settlement.findOne({
        where: { saleId },
        transaction,
      });

      if (existingSettlement) {
        throw new AppError('Settlement already exists for this sale', 400);
      }

      // Validate net amount
      const netAmountNum = parseFloat(netAmount);
      const totalAmountNum = parseFloat(sale.totalAmount as any);
      if (!netAmount || netAmountNum <= 0) {
        throw new AppError('Net amount must be greater than 0', 400);
      }
      if (netAmountNum > totalAmountNum) {
        throw new AppError('Dana bersih tidak boleh melebihi Total Penjualan kotor', 400);
      }

      // Handle file upload if present
      let proofDocument = null;
      if (req.file) {
        proofDocument = req.file.filename;
      }

      // Create settlement using sale.saleNumber as the invoice number
      const settlement = await Settlement.create(
        {
          saleId,
          invoiceNumber: sale.saleNumber, // Selalu gunakan saleNumber dari penjualan
          netAmount: parseFloat(netAmount).toFixed(2),
          settlementDate: new Date(settlementDate),
          proofDocument,
          notes: notes || null,
          createdBy: req.user!.id,
        },
        { transaction }
      );

      // Update sale status to SETTLED
      await (sale as any).update({ status: 'SETTLED' }, { transaction });

      await transaction.commit();

      // Fetch complete settlement with relations
      const completeSettlement = await Settlement.findByPk(settlement.id, {
        include: [
          {
            model: Sale,
            as: 'sale',
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'fullName', 'email'],
          },
        ],
      });

      // Log activity
      await auditService.log({
        userId: req.user!.id,
        action: 'CREATE' as any,
        entity: 'Settlement',
        entityId: settlement.id,
        before: null,
        after: completeSettlement ? completeSettlement.toJSON() : settlement.toJSON(),
        ip: req.ip || '',
        userAgent: req.get('User-Agent') || '',
      });

      const { socketService } = require('../services/socket.service');
      socketService.broadcastDataRefresh('settlements');
      socketService.broadcastDataRefresh('sales'); // since sale status changed
      
      return successResponse(res, completeSettlement, 'Settlement created successfully', 201);
    } catch (error) {
      await transaction.rollback();
      return next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { netAmount, settlementDate, notes } = req.body;

      // Check user role - only SUPER_ADMIN can edit
      if (req.user?.roleName !== 'SUPER_ADMIN') {
        throw new AppError('Only Super Admin can edit settlements', 403);
      }

      const settlement = await Settlement.findByPk(id, {
        include: [{ model: Sale, as: 'sale' }]
      });
      if (!settlement) {
        throw new AppError('Settlement not found', 404);
      }

      if (netAmount) {
        const netAmountNum = parseFloat(netAmount);
        const sale = (settlement as any).sale;
        if (sale && netAmountNum > parseFloat(sale.totalAmount)) {
           throw new AppError('Dana bersih tidak boleh melebihi Total Penjualan kotor', 400);
        }
      }

      const previousData = settlement.toJSON();

      // Handle file upload if present
      let proofDocument = settlement.proofDocument;
      if (req.file) {
        proofDocument = req.file.filename;
      }

      await settlement.update({
        netAmount: netAmount ? parseFloat(netAmount).toFixed(2) : settlement.netAmount,
        settlementDate: settlementDate ? new Date(settlementDate) : settlement.settlementDate,
        proofDocument,
        notes: notes !== undefined ? notes : settlement.notes,
      });

      // Log activity
      await auditService.log({
        userId: req.user!.id,
        action: 'UPDATE' as any,
        entity: 'Settlement',
        entityId: settlement.id,
        before: previousData,
        after: settlement.toJSON(),
        ip: req.ip || '',
        userAgent: req.get('User-Agent') || '',
      });

      // Fetch with relations
      const updatedSettlement = await Settlement.findByPk(id, {
        include: [
          {
            model: Sale,
            as: 'sale',
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'fullName', 'email'],
          },
        ],
      });

      const { socketService } = require('../services/socket.service');
      socketService.broadcastDataRefresh('settlements');
      
      return successResponse(res, updatedSettlement, 'Settlement updated successfully', 200);
    } catch (error) {
      return next(error);
    }
  },

  async requestCancellation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason || reason.trim().length === 0) {
        throw new AppError('Alasan pembatalan harus diisi', 400);
      }

      // Find settlement + sale info for context
      const settlement = await Settlement.findByPk(id, {
        include: [{
          model: Sale,
          as: 'sale',
          attributes: ['id', 'saleNumber', 'totalAmount'],
        }],
      });

      if (!settlement) {
        throw new AppError('Settlement not found', 404);
      }

      const sale = (settlement as any).sale;

      // Check if there's already a pending cancellation request for this settlement
      const existingRequest = await ChangeRequest.findOne({
        where: {
          entityType: 'SETTLEMENT',
          entityId: id,
          status: 'PENDING',
        },
      });

      if (existingRequest) {
        throw new AppError('Sudah ada pengajuan pembatalan yang sedang menunggu persetujuan', 400);
      }

      // Create ChangeRequest
      const changeRequest = await ChangeRequest.create({
        entityType: 'SETTLEMENT',
        entityId: id,
        requestType: 'DELETE',
        status: 'PENDING',
        payload: {
          settlementId: id,
          saleNumber: sale?.saleNumber || '-',
          totalAmount: sale?.totalAmount || 0,
          netAmount: settlement.netAmount,
          reason: reason.trim(),
        },
        requestedBy: req.user!.id,
      });

      // Log activity
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

      // Notify admins via socket
      const { socketService } = require('../services/socket.service');
      socketService.emitToRole('ADMIN', 'notification:new', {
        message: 'Pengajuan Pembatalan Pelunasan',
        description: `${(req.user as any)?.fullName || 'User'} mengajukan pembatalan pelunasan untuk ${sale?.saleNumber || 'N/A'}. Alasan: ${reason.trim()}`,
        type: 'WARNING',
      });
      socketService.emitToRole('SUPER_ADMIN', 'notification:new', {
        message: 'Pengajuan Pembatalan Pelunasan',
        description: `${(req.user as any)?.fullName || 'User'} mengajukan pembatalan pelunasan untuk ${sale?.saleNumber || 'N/A'}. Alasan: ${reason.trim()}`,
        type: 'WARNING',
      });

      return successResponse(res, changeRequest, 'Pengajuan pembatalan berhasil dikirim', 201);
    } catch (error) {
      return next(error);
    }
  },

  // Get dashboard statistics
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;

      const dateFilter: any = {};
      if (startDate && endDate) {
        dateFilter.createdAt = {
          [Op.between]: [new Date(startDate as string), new Date(endDate as string)],
        };
      }

      // Fetch ALL sales that are PROCESSED or SETTLED in the period
      const processedSales = await Sale.findAll({
        where: {
          status: {
            [Op.in]: ['PROCESSED', 'SETTLED'],
          },
          ...dateFilter,
        },
        include: [
          {
            model: Settlement,
            as: 'settlement',
            required: false, // Include pending ones too
          },
        ],
      });

      let totalGrossSettled = 0;
      let totalNetSettled = 0;
      let settledCount = 0;
      let pendingCount = 0;

      for (const sale of processedSales) {
        if (sale.settlement) {
          totalGrossSettled += Number(sale.totalAmount);
          totalNetSettled += Number(sale.settlement.netAmount);
          settledCount++;
        } else {
          pendingCount++;
        }
      }

      const difference = totalGrossSettled - totalNetSettled;

      successResponse(
        res,
        {
          totalGross: totalGrossSettled, // Only show settled gross to match net
          totalNet: totalNetSettled,
          difference,
          grossCount: settledCount, // Only show settled count to match gross
          settledCount,
          pendingCount,
        },
        'Settlement statistics retrieved successfully',
        200
      );
    } catch (error) {
      next(error);
    }
  },
};
