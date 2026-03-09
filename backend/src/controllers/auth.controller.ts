import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { auditService } from '../services/audit.service';
import { AuditAction } from '../models/AuditLog';
import { successResponse } from '../utils/response';

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { credential, password } = req.body;
      const result = await authService.login(credential, password);

      // Catat aktivitas login
      await auditService.log({
        userId: result.user.id,
        action: AuditAction.LOGIN,
        entity: 'Auth',
        entityId: result.user.id,
        before: null,
        after: { username: result.user.username, role: result.user.role },
        ip: req.ip || req.socket.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
      });

      successResponse(res, result, 'Login successful', 200);
    } catch (error) {
      next(error);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refresh(refreshToken);
      successResponse(res, result, 'Token refreshed successfully', 200);
    } catch (error) {
      next(error);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      await authService.logout(userId);

      // Catat aktivitas logout
      await auditService.log({
        userId,
        action: AuditAction.LOGOUT,
        entity: 'Auth',
        entityId: userId,
        before: null,
        after: null,
        ip: req.ip || req.socket.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
      });

      successResponse(res, null, 'Logout successful', 200);
    } catch (error) {
      next(error);
    }
  },

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.getMe(req.user!.id);
      successResponse(res, user, 'User retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user!.id;

      await authService.changePassword(userId, currentPassword, newPassword);

      // Catat aktivitas ganti password
      await auditService.log({
        userId,
        action: AuditAction.UPDATE,
        entity: 'Auth',
        entityId: userId,
        before: null,
        after: { action: 'Ganti kata sandi' },
        ip: req.ip || req.socket.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
      });

      successResponse(res, null, 'Ganti kata sandi berhasil', 200);
    } catch (error) {
      next(error);
    }
  },

  async heartbeat(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.heartbeat(req.user!.id);
      successResponse(res, result, 'Heartbeat recorded', 200);
    } catch (error) {
      next(error);
    }
  },
};
