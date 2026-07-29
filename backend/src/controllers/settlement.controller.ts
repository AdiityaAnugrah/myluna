import { Request, Response, NextFunction } from 'express';
import { Settlement, SettlementRequest, SettlementRequestStatus, Sale, SaleItem, Product, User, ChangeRequest } from '../models';
import { successResponse } from '../utils/response';
import { AppError } from '../utils/errors';
import { sequelize } from '../config/database';
import { Op } from 'sequelize';
import { auditService } from '../services/audit.service';
import { assertUserDateIsToday } from '../utils/dateGuard';

export const settlementController = {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const {
        page = 1,
        limit = 10,
        startDate = '',
        endDate = '',
        status = '', // 'pending' or 'settled'
        search = '',
        sortBy = 'urgent', // 'urgent' = oldest processedAt first, 'terbaru' = newest saleDate first
        responsibleUserId = '',
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      
      // Build where clause for settlements
      const settlementWhere: any = {};
      
      if (startDate && endDate) {
        settlementWhere.settlementDate = {
          [Op.between]: [new Date(startDate as string), new Date(endDate as string)],
        };
      }

      // Base sale where for filtering by related sale properties
      const baseSaleWhere: any = {};

      if (search) {
        const searchStr = `%${(search as string).toLowerCase()}%`;
        baseSaleWhere[Op.or] = [
          { saleNumber: { [Op.like]: searchStr } },
          { customerName: { [Op.like]: searchStr } },
          { customerPhone: { [Op.like]: searchStr } },
        ];
      }

      if (responsibleUserId) {
        baseSaleWhere.createdBy = responsibleUserId;
      }

      // Data Isolation: If role is USER, only show data related to their own sales.
      // Filter is based on sale.createdBy (who created the sale), NOT settlement.createdBy,
      // so users can see the settlement status of ALL sales they are responsible for,
      // even if the settlement was entered by an admin.
      if ((req as any).user?.roleName === 'USER') {
        const userId = (req as any).user.id;
        baseSaleWhere.createdBy = userId;
        // For settled/all: filter is applied via baseSaleWhere on the sale relation (see below)
        // settlementWhere.createdBy is intentionally NOT set here
      }

      const saleWhere: any = {
        ...baseSaleWhere,
        status: 'PROCESSED',
      };

      if (status === 'pending') {
        // Use LEFT JOIN + WHERE settlement IS NULL to get accurate count at DB level
        const { count, rows } = await Sale.findAndCountAll({
          where: {
            ...saleWhere,
            '$settlement.id$': null, // Only sales without a settlement
          },
          include: [
            {
              model: Settlement,
              as: 'settlement',
              required: false,
            },
            {
              model: SettlementRequest,
              as: 'pendingSettlementRequest',
              required: false,
              where: { status: SettlementRequestStatus.PENDING },
              include: [
                {
                  model: User,
                  as: 'requester',
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
          distinct: true, // Ensure correct count with LEFT JOIN
          limit: Number(limit),
          offset,
          order: sortBy === 'terbaru'
            ? [['saleDate', 'DESC']]
            : [['processedAt', 'ASC']],
        });

        return successResponse(
          res,
          {
            settlements: rows.map(sale => ({
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
            required: true, // INNER JOIN — ensures baseSaleWhere filters always apply
            where: Object.keys(baseSaleWhere).length > 0 ? baseSaleWhere : undefined,
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
        order: sortBy === 'terbaru'
          ? [['settlementDate', 'DESC']]
          : [['settlementDate', 'ASC']], // oldest settlement first for urgent
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
              {
                model: SaleItem,
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

      assertUserDateIsToday(req.user?.roleName, settlementDate, 'Tanggal pelunasan');

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

      const existingPendingRequest = await SettlementRequest.findOne({
        where: { saleId, status: SettlementRequestStatus.PENDING },
        transaction,
      });

      if (existingPendingRequest) {
        throw new AppError('Pengajuan pelunasan untuk penjualan ini sedang menunggu konfirmasi admin', 400);
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

      if (req.user?.roleName === 'USER') {
        const settlementRequest = await SettlementRequest.create(
          {
            saleId,
            invoiceNumber: sale.saleNumber,
            netAmount: parseFloat(netAmount).toFixed(2),
            settlementDate: new Date(settlementDate),
            proofDocument,
            notes: notes || null,
            status: SettlementRequestStatus.PENDING,
            requestedBy: req.user!.id,
          },
          { transaction }
        );

        await transaction.commit();

        const completeRequest = await SettlementRequest.findByPk(settlementRequest.id, {
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
              as: 'requester',
              attributes: ['id', 'fullName', 'email'],
            },
          ],
        });

        await auditService.log({
          userId: req.user!.id,
          action: 'CREATE' as any,
          entity: 'SettlementRequest',
          entityId: settlementRequest.id,
          before: null,
          after: completeRequest ? completeRequest.toJSON() : settlementRequest.toJSON(),
          ip: req.ip || '',
          userAgent: req.get('User-Agent') || '',
        });

        const { socketService } = require('../services/socket.service');
        socketService.emitToAdmins('notification:new', {
          message: 'Konfirmasi Pelunasan',
          description: `${(req.user as any)?.fullName || 'User'} mengajukan pelunasan untuk ${sale.saleNumber}.`,
          type: 'INFO',
        });
        socketService.broadcastDataRefresh('settlements');

        return successResponse(res, completeRequest, 'Pengajuan pelunasan berhasil dikirim dan menunggu konfirmasi admin', 201);
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

  async getConfirmationRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        page = 1,
        limit = 10,
        status = 'PENDING',
        search = '',
      } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const saleWhere: any = {};
      if (search) {
        const searchStr = `%${(search as string).toLowerCase()}%`;
        saleWhere[Op.or] = [
          { saleNumber: { [Op.like]: searchStr } },
          { customerName: { [Op.like]: searchStr } },
          { customerPhone: { [Op.like]: searchStr } },
        ];
      }

      const where: any = {};
      if (status && status !== 'ALL') where.status = status;

      const { count, rows } = await SettlementRequest.findAndCountAll({
        where,
        include: [
          {
            model: Sale,
            as: 'sale',
            required: true,
            where: Object.keys(saleWhere).length ? saleWhere : undefined,
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
            as: 'requester',
            attributes: ['id', 'fullName', 'email'],
          },
          {
            model: User,
            as: 'reviewer',
            attributes: ['id', 'fullName', 'email'],
          },
        ],
        distinct: true,
        limit: Number(limit),
        offset,
        order: [['createdAt', 'ASC']],
      });

      return successResponse(
        res,
        {
          requests: rows,
          pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / Number(limit)),
          },
        },
        'Settlement confirmation requests retrieved successfully',
        200
      );
    } catch (error) {
      return next(error);
    }
  },

  async approveRequest(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();

    try {
      const { id } = req.params;
      const { reviewNotes } = req.body;

      const settlementRequest = await SettlementRequest.findByPk(id, { transaction });
      if (!settlementRequest) throw new AppError('Pengajuan pelunasan tidak ditemukan', 404);
      if (settlementRequest.status !== SettlementRequestStatus.PENDING) {
        throw new AppError('Pengajuan pelunasan ini sudah direview', 400);
      }

      const sale = await Sale.findByPk(settlementRequest.saleId, { transaction });
      if (!sale) throw new AppError('Sale not found', 404);
      if (sale.status !== 'PROCESSED') {
        throw new AppError('Only processed sales can be settled', 400);
      }

      const existingSettlement = await Settlement.findOne({
        where: { saleId: settlementRequest.saleId },
        transaction,
      });
      if (existingSettlement) {
        throw new AppError('Settlement already exists for this sale', 400);
      }

      const settlement = await Settlement.create(
        {
          saleId: settlementRequest.saleId,
          invoiceNumber: sale.saleNumber,
          netAmount: settlementRequest.netAmount,
          settlementDate: settlementRequest.settlementDate,
          proofDocument: settlementRequest.proofDocument,
          notes: settlementRequest.notes,
          createdBy: req.user!.id,
        },
        { transaction }
      );

      await (sale as any).update({ status: 'SETTLED' }, { transaction });
      await settlementRequest.update(
        {
          status: SettlementRequestStatus.APPROVED,
          reviewedBy: req.user!.id,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes || null,
          settlementId: settlement.id,
        },
        { transaction }
      );

      await transaction.commit();

      const completeSettlement = await Settlement.findByPk(settlement.id, {
        include: [
          { model: Sale, as: 'sale' },
          { model: User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
        ],
      });

      await auditService.log({
        userId: req.user!.id,
        action: 'UPDATE' as any,
        entity: 'SettlementRequest',
        entityId: settlementRequest.id,
        before: { status: SettlementRequestStatus.PENDING },
        after: { status: SettlementRequestStatus.APPROVED, settlementId: settlement.id },
        ip: req.ip || '',
        userAgent: req.get('User-Agent') || '',
      });

      const { socketService } = require('../services/socket.service');
      socketService.broadcastDataRefresh('settlements');
      socketService.broadcastDataRefresh('sales');
      socketService.emitToUser(settlementRequest.requestedBy, 'notification:new', {
        message: 'Pelunasan Dikonfirmasi',
        description: `Pelunasan untuk ${sale.saleNumber} sudah dikonfirmasi admin.`,
        type: 'SUCCESS',
      });

      return successResponse(res, completeSettlement, 'Pelunasan berhasil dikonfirmasi', 200);
    } catch (error) {
      await transaction.rollback();
      return next(error);
    }
  },

  async rejectRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reviewNotes } = req.body;

      if (!reviewNotes || !String(reviewNotes).trim()) {
        throw new AppError('Catatan penolakan wajib diisi', 400);
      }

      const settlementRequest = await SettlementRequest.findByPk(id, {
        include: [{ model: Sale, as: 'sale' }],
      });
      if (!settlementRequest) throw new AppError('Pengajuan pelunasan tidak ditemukan', 404);
      if (settlementRequest.status !== SettlementRequestStatus.PENDING) {
        throw new AppError('Pengajuan pelunasan ini sudah direview', 400);
      }

      await settlementRequest.update({
        status: SettlementRequestStatus.REJECTED,
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
        reviewNotes: String(reviewNotes).trim(),
      });

      await auditService.log({
        userId: req.user!.id,
        action: 'UPDATE' as any,
        entity: 'SettlementRequest',
        entityId: settlementRequest.id,
        before: { status: SettlementRequestStatus.PENDING },
        after: settlementRequest.toJSON(),
        ip: req.ip || '',
        userAgent: req.get('User-Agent') || '',
      });

      const sale = (settlementRequest as any).sale;
      const { socketService } = require('../services/socket.service');
      socketService.broadcastDataRefresh('settlements');
      socketService.emitToUser(settlementRequest.requestedBy, 'notification:new', {
        message: 'Pelunasan Ditolak',
        description: `Pengajuan pelunasan untuk ${sale?.saleNumber || 'penjualan'} ditolak. ${reviewNotes}`,
        type: 'WARNING',
      });

      return successResponse(res, settlementRequest, 'Pengajuan pelunasan berhasil ditolak', 200);
    } catch (error) {
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

  // Get dashboard statistics — uses SQL aggregation for scalability (no row limit)
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;

      // Build date condition for raw SQL
      let dateCondition = '';
      const replacements: any = {};
      if (startDate && endDate) {
        dateCondition = ' AND s.saleDate BETWEEN :startDate AND :endDate';
        replacements.startDate = new Date(startDate as string);
        replacements.endDate = new Date(`${endDate}T23:59:59`);
      }

      // Single query: aggregate settled stats (sales that HAVE a settlement)
      const [settledResult]: any = await sequelize.query(`
        SELECT 
          COALESCE(SUM(s.totalAmount), 0) AS totalGross,
          COALESCE(SUM(st.net_amount), 0) AS totalNet,
          COUNT(*) AS settledCount
        FROM Sales s
        INNER JOIN Settlements st ON st.sale_id = s.id
        WHERE s.status IN ('PROCESSED', 'SETTLED')
          AND COALESCE(s.isInitialBalance, 0) = 0
          ${dateCondition}
      `, { replacements, type: 'SELECT' });

      // Single query: aggregate pending stats (sales WITHOUT a settlement)
      const [pendingResult]: any = await sequelize.query(`
        SELECT 
          COALESCE(SUM(s.totalAmount), 0) AS totalPendingAmount,
          COUNT(*) AS pendingCount
        FROM Sales s
        LEFT JOIN Settlements st ON st.sale_id = s.id
        WHERE s.status IN ('PROCESSED', 'SETTLED')
          AND COALESCE(s.isInitialBalance, 0) = 0
          AND st.id IS NULL
          ${dateCondition}
      `, { replacements, type: 'SELECT' });

      const totalGross = parseFloat(settledResult?.totalGross || '0');
      const totalNet = parseFloat(settledResult?.totalNet || '0');
      const settledCount = parseInt(settledResult?.settledCount || '0', 10);
      const totalPendingAmount = parseFloat(pendingResult?.totalPendingAmount || '0');
      const pendingCount = parseInt(pendingResult?.pendingCount || '0', 10);
      const difference = totalGross - totalNet;

      successResponse(
        res,
        {
          totalGross,
          totalNet,
          difference,
          grossCount: settledCount,
          settledCount,
          pendingCount,
          totalPendingAmount,
        },
        'Settlement statistics retrieved successfully',
        200
      );
    } catch (error) {
      next(error);
    }
  },
};
