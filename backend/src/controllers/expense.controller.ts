import { Request, Response, NextFunction } from 'express';
import { Expense, User } from '../models';
import { successResponse, errorResponse } from '../utils/response';
import { Op } from 'sequelize';

export const expenseController = {
  // Get all expenses with filters
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, startDate, endDate, category } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const where: any = {};

      // Date range filter
      if (startDate && endDate) {
        where.expenseDate = {
          [Op.between]: [new Date(startDate as string), new Date(endDate as string)],
        };
      }

      // Category filter
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
  async getById(req: Request, res: Response, next: NextFunction) {
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
        return errorResponse(res, 'Expense not found', 404);
      }

      return successResponse(res, expense, 'Expense retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  },

  // Create new expense
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, description, amount, expenseDate, notes } = req.body;

      const expense = await Expense.create({
        category,
        description,
        amount: parseFloat(amount).toString(),
        expenseDate: new Date(expenseDate),
        notes: notes || null,
        receiptDocument: null, // TODO: Handle file upload
        createdBy: req.user!.id,
      });

      return successResponse(res, expense, 'Expense created successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  // Update expense
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { category, description, amount, expenseDate, notes } = req.body;

      const expense = await Expense.findByPk(id);

      if (!expense) {
        return errorResponse(res, 'Expense not found', 404);
      }

      // Only SUPER_ADMIN or creator can update
      if (req.user!.roleName !== 'SUPER_ADMIN' && expense.createdBy !== req.user!.id) {
        return errorResponse(res, 'Not authorized to update this expense', 403);
      }

      await expense.update({
        category,
        description,
        amount: parseFloat(amount).toString(),
        expenseDate: new Date(expenseDate),
        notes: notes || null,
      });

      return successResponse(res, expense, 'Expense updated successfully', 200);
    } catch (error) {
      next(error);
    }
  },

  // Delete expense
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const expense = await Expense.findByPk(id);

      if (!expense) {
        return errorResponse(res, 'Expense not found', 404);
      }

      // Only SUPER_ADMIN can delete
      if (req.user!.roleName !== 'SUPER_ADMIN') {
        return errorResponse(res, 'Only SUPER_ADMIN can delete expenses', 403);
      }

      await expense.destroy();

      return successResponse(res, null, 'Expense deleted successfully', 200);
    } catch (error) {
      next(error);
    }
  },
};
