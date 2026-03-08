import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { successResponse } from '../utils/response';

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { credential, password } = req.body;
      const result = await authService.login(credential, password);
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
      await authService.logout(req.user!.id);
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
      const userId = req.user!.id; // from auth middleware

      await authService.changePassword(userId, currentPassword, newPassword);
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
