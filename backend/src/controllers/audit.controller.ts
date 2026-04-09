import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/audit.service';
import { successResponse } from '../utils/response';

export const auditController = {
  async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, userId, entity, startDate, endDate } = req.query;

      const currentUser = (req as any).user;

      const result = await auditService.getAll({
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
        userId: userId as string,
        entity: entity as string,
        startDate: startDate as string,
        endDate: endDate as string,
        currentUser,
      });

      return successResponse(res, result.data, 'Audit logs retrieved successfully', 200, result.meta);
    } catch (error) {
      return next(error);
    }
  },

  async getDailyStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, startDate, endDate } = req.query;

      const result = await auditService.getDailySummary({
        userId: userId as string,
        startDate: startDate as string,
        endDate: endDate as string,
      });

      return successResponse(res, result, 'Audit daily stats retrieved successfully', 200);
    } catch (error) {
      return next(error);
    }
  },
};
