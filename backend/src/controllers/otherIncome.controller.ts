import { Request, Response, NextFunction } from 'express';
import OtherIncome from '../models/OtherIncome';
import { User } from '../models';
import { successResponse } from '../utils/response';
import { AppError } from '../utils/errors';
import { Op } from 'sequelize';
import { auditService } from '../services/audit.service';
import { AuditAction } from '../models/AuditLog';
import { socketService } from '../services/socket.service';
import { assertUserDateIsToday } from '../utils/dateGuard';

export const otherIncomeController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, startDate, endDate } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const where: any = {};

      // USER role can only see their own records
      if (req.user?.roleName === 'USER') {
        where.createdBy = req.user.id;
      }

      if (startDate && endDate) {
        where.transactionDate = {
          [Op.between]: [new Date(startDate as string), new Date(endDate as string)],
        };
      }

      const { count, rows } = await OtherIncome.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'fullName', 'email'],
          },
        ],
        order: [['transactionDate', 'DESC'], ['createdAt', 'DESC']],
        limit: Number(limit),
        offset,
      });

      successResponse(
        res,
        {
          otherIncomes: rows,
          pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / Number(limit)),
          },
        },
        'Other incomes retrieved successfully',
        200
      );
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const otherIncome = await OtherIncome.findByPk(id, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'fullName', 'email'],
          },
        ],
      });

      if (!otherIncome) {
        throw new AppError('Other income not found', 404);
      }

      successResponse(res, otherIncome, 'Other income retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { transactionDate, bankName, buyerName, amount, notes } = req.body;

      if (!transactionDate || !bankName || !buyerName || !amount) {
        throw new AppError('Tanggal, nama bank, nama pembeli, dan jumlah wajib diisi', 400);
      }

      if (parseFloat(amount) <= 0) {
        throw new AppError('Jumlah transaksi harus lebih dari 0', 400);
      }

      assertUserDateIsToday(req.user?.roleName, transactionDate, 'Tanggal transaksi');

      let proofDocument: string | null = null;
      if (req.file) {
        proofDocument = req.file.filename;
      }

      const otherIncome = await OtherIncome.create({
        transactionDate: new Date(transactionDate),
        bankName: bankName.trim(),
        buyerName: buyerName.trim(),
        amount: parseFloat(amount).toFixed(2),
        proofDocument,
        notes: notes?.trim() || null,
        createdBy: req.user!.id,
      });

      await auditService.log({
        userId: req.user!.id,
        action: AuditAction.CREATE,
        entity: 'OtherIncome',
        entityId: otherIncome.id,
        before: null,
        after: otherIncome.toJSON(),
        ip: req.ip || req.socket.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
      });

      socketService.broadcastDataRefresh('otherIncomes');
      successResponse(res, otherIncome, 'Pendapatan lain-lain berhasil disimpan', 201);
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { id } = req.params;
      const { transactionDate, bankName, buyerName, amount, notes } = req.body;

      const otherIncome = await OtherIncome.findByPk(id);
      if (!otherIncome) {
        return next(new AppError('Other income not found', 404));
      }

      // Only SUPER_ADMIN, ADMIN, or creator can update
      if (
        req.user!.roleName !== 'SUPER_ADMIN' &&
        req.user!.roleName !== 'ADMIN' &&
        otherIncome.createdBy !== req.user!.id
      ) {
        return next(new AppError('Tidak berhak mengubah data ini', 403));
      }

      const before = {
        transactionDate: otherIncome.transactionDate,
        bankName: otherIncome.bankName,
        buyerName: otherIncome.buyerName,
        amount: otherIncome.amount,
        notes: otherIncome.notes,
      };

      // Only replace proofDocument if new file uploaded
      const proofDocument = req.file ? req.file.filename : otherIncome.proofDocument;
      if (transactionDate) {
        assertUserDateIsToday(req.user?.roleName, transactionDate, 'Tanggal transaksi');
      }

      await otherIncome.update({
        transactionDate: transactionDate ? new Date(transactionDate) : otherIncome.transactionDate,
        bankName: bankName?.trim() || otherIncome.bankName,
        buyerName: buyerName?.trim() || otherIncome.buyerName,
        amount: amount ? parseFloat(amount).toFixed(2) : otherIncome.amount,
        notes: notes !== undefined ? (notes?.trim() || null) : otherIncome.notes,
        proofDocument,
      });

      await auditService.log({
        userId: req.user!.id,
        action: AuditAction.UPDATE,
        entity: 'OtherIncome',
        entityId: id,
        before,
        after: {
          transactionDate: otherIncome.transactionDate,
          bankName: otherIncome.bankName,
          buyerName: otherIncome.buyerName,
          amount: otherIncome.amount,
          notes: otherIncome.notes,
        },
        ip: req.ip || req.socket.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
      });

      socketService.broadcastDataRefresh('otherIncomes');
      return successResponse(res, otherIncome, 'Pendapatan lain-lain berhasil diperbarui', 200);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { id } = req.params;

      const otherIncome = await OtherIncome.findByPk(id);
      if (!otherIncome) {
        return next(new AppError('Other income not found', 404));
      }

      // Only SUPER_ADMIN can delete
      if (req.user!.roleName !== 'SUPER_ADMIN') {
        return next(new AppError('Hanya Super Admin yang dapat menghapus data ini', 403));
      }

      const before = otherIncome.toJSON();

      await otherIncome.destroy();

      await auditService.log({
        userId: req.user!.id,
        action: AuditAction.DELETE,
        entity: 'OtherIncome',
        entityId: id,
        before,
        after: null,
        ip: req.ip || req.socket.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
      });

      socketService.broadcastDataRefresh('otherIncomes');
      return successResponse(res, null, 'Pendapatan lain-lain berhasil dihapus', 200);
    } catch (error) {
      next(error);
    }
  },
};
