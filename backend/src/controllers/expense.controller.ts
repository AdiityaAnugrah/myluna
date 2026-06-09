import { Request, Response, NextFunction } from 'express';
import { Expense, User } from '../models';
import { successResponse, errorResponse } from '../utils/response';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import { auditService } from '../services/audit.service';
import { AuditAction } from '../models/AuditLog';
import { socketService } from '../services/socket.service';
import { assertUserDateIsToday } from '../utils/dateGuard';

export const expenseController = {
  // Get all expenses with filters
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, startDate, endDate, category } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const where: any = {};

      if (startDate && endDate) {
        where.expenseDate = {
          [Op.between]: [new Date(startDate as string), new Date(endDate as string)],
        };
      }

      if (category) {
        where.category = category;
      }

      const { count, rows } = await Expense.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'fullName', 'email'],
          },
        ],
        limit: Number(limit),
        offset,
        order: [['expenseDate', 'DESC']],
      });

      successResponse(
        res,
        {
          expenses: rows,
          pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / Number(limit)),
          },
        },
        'Expenses retrieved successfully',
        200
      );
    } catch (error) {
      next(error);
    }
  },

  // Get expense by ID
  async getById(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { id } = req.params;

      const expense = await Expense.findByPk(id, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'fullName', 'email'],
          },
        ],
      });

      if (!expense) {
        return errorResponse(res, 'Expense not found', '404');
      }

      return successResponse(res, expense, 'Expense retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  },

  // Create new expense
  async create(req: Request, res: Response, next: NextFunction): Promise<any> {
    const t = await sequelize.transaction();
    try {
      const { category, description, amount, expenseDate, notes } = req.body;

      assertUserDateIsToday(req.user?.roleName, expenseDate, 'Tanggal pengeluaran');

      const expense = await Expense.create({
        category,
        description,
        amount: parseFloat(amount).toString(),
        expenseDate: new Date(expenseDate),
        notes: notes || null,
        receiptDocument: null,
        createdBy: req.user!.id,
      }, { transaction: t });

      await auditService.log({
        userId: req.user!.id,
        action: AuditAction.CREATE,
        entity: 'Expense',
        entityId: expense.id,
        before: null,
        after: {
          category,
          description,
          amount: parseFloat(amount),
          expenseDate,
          notes: notes || null,
        },
        ip: req.ip || req.socket.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
      }, t);

      await t.commit();
      socketService.broadcastDataRefresh('expense');
      return successResponse(res, expense, 'Expense created successfully', 201);
    } catch (error) {
      await t.rollback();
      next(error);
    }
  },

  // Update expense
  async update(req: Request, res: Response, next: NextFunction): Promise<any> {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { category, description, amount, expenseDate, notes } = req.body;

      assertUserDateIsToday(req.user?.roleName, expenseDate, 'Tanggal pengeluaran');

      const expense = await Expense.findByPk(id, { transaction: t });

      if (!expense) {
        await t.rollback();
        return errorResponse(res, 'Expense not found', '404');
      }

      if (req.user!.roleName !== 'SUPER_ADMIN' && expense.createdBy !== req.user!.id) {
        await t.rollback();
        return errorResponse(res, 'Not authorized to update this expense', '403');
      }

      const before = {
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        expenseDate: expense.expenseDate,
        notes: expense.notes,
      };

      await expense.update({
        category,
        description,
        amount: parseFloat(amount).toString(),
        expenseDate: new Date(expenseDate),
        notes: notes || null,
      }, { transaction: t });

      await auditService.log({
        userId: req.user!.id,
        action: AuditAction.UPDATE,
        entity: 'Expense',
        entityId: id,
        before,
        after: {
          category,
          description,
          amount: parseFloat(amount),
          expenseDate,
          notes: notes || null,
        },
        ip: req.ip || req.socket.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
      }, t);

      await t.commit();
      socketService.broadcastDataRefresh('expense');
      return successResponse(res, expense, 'Expense updated successfully', 200);
    } catch (error) {
      await t.rollback();
      next(error);
    }
  },

  // Delete expense
  async delete(req: Request, res: Response, next: NextFunction): Promise<any> {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;

      const expense = await Expense.findByPk(id, { transaction: t });

      if (!expense) {
        await t.rollback();
        return errorResponse(res, 'Expense not found', '404');
      }

      if (req.user!.roleName !== 'SUPER_ADMIN') {
        await t.rollback();
        return errorResponse(res, 'Only SUPER_ADMIN can delete expenses', '403');
      }

      const before = {
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        expenseDate: expense.expenseDate,
        notes: expense.notes,
      };

      await expense.destroy({ transaction: t });

      await auditService.log({
        userId: req.user!.id,
        action: AuditAction.DELETE,
        entity: 'Expense',
        entityId: id,
        before,
        after: null,
        ip: req.ip || req.socket.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
      }, t);

      await t.commit();
      socketService.broadcastDataRefresh('expense');
      return successResponse(res, null, 'Expense deleted successfully', 200);
    } catch (error) {
      await t.rollback();
      next(error);
    }
  },
};
