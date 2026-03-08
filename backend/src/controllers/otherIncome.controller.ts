import { Request, Response, NextFunction } from 'express';
import OtherIncome from '../models/OtherIncome';
import { User } from '../models';
import { successResponse } from '../utils/response';
import { AppError } from '../utils/errors';
import { Op } from 'sequelize';
import { auditService } from '../services/audit.service';

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

      // For USER role: only allow today's date
      if (req.user?.roleName === 'USER') {
        const today = new Date().toISOString().split('T')[0];
        if (transactionDate !== today) {
          throw new AppError('Tanggal transaksi hanya boleh hari ini', 400);
        }
      }

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
        action: 'CREATE' as any,
        entity: 'OtherIncome',
        entityId: otherIncome.id,
        before: null,
        after: otherIncome.toJSON(),
        ip: req.ip || '',
        userAgent: req.get('User-Agent') || '',
      });

      successResponse(res, otherIncome, 'Pendapatan lain-lain berhasil disimpan', 201);
    } catch (error) {
      next(error);
    }
  },
};
