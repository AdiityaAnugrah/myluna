import { Request, Response, NextFunction } from 'express';
import { Platform } from '../models';
import { successResponse } from '../utils/response';
import { AppError } from '../utils/errors';

export const platformController = {
  async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const platforms = await Platform.findAll({
        order: [['name', 'ASC']],
      });

      return successResponse(res, platforms, 'Platforms retrieved successfully', 200);
    } catch (error) {
      return next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, feePercentage } = req.body;
      const normalizedFeePercentage =
        feePercentage === undefined || feePercentage === null || feePercentage === ''
          ? 25
          : Number(feePercentage);

      if (!Number.isFinite(normalizedFeePercentage) || normalizedFeePercentage < 0 || normalizedFeePercentage > 100) {
        throw new AppError('Persentase biaya platform harus di antara 0 sampai 100', 400);
      }

      // Check if platform already exists
      const existingPlatform = await Platform.findOne({ where: { name } });
      if (existingPlatform) {
        if (!existingPlatform.isActive) {
          // Reactivate if it was soft deleted
          await existingPlatform.update({ isActive: true, feePercentage: normalizedFeePercentage });
          return successResponse(res, existingPlatform, 'Platform reactivated successfully', 201);
        }
        throw new AppError('Platform already exists', 400);
      }

      const platform = await Platform.create({ name, feePercentage: normalizedFeePercentage, isActive: true });
      return successResponse(res, platform, 'Platform created successfully', 201);
    } catch (error) {
      return next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, isActive, feePercentage } = req.body;

      const platform = await Platform.findByPk(id);
      if (!platform) {
        throw new AppError('Platform not found', 404);
      }

      const updates: any = {
        name: name || platform.name,
        isActive: isActive !== undefined ? isActive : platform.isActive,
      };

      if (feePercentage !== undefined) {
        const normalizedFeePercentage = Number(feePercentage);
        if (!Number.isFinite(normalizedFeePercentage) || normalizedFeePercentage < 0 || normalizedFeePercentage > 100) {
          throw new AppError('Persentase biaya platform harus di antara 0 sampai 100', 400);
        }
        updates.feePercentage = normalizedFeePercentage;
      }

      await platform.update({
        ...updates,
      });

      return successResponse(res, platform, 'Platform updated successfully', 200);
    } catch (error) {
      return next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const platform = await Platform.findByPk(id);
      if (!platform) {
        throw new AppError('Platform not found', 404);
      }

      // Soft delete
      await platform.update({ isActive: false });

      return successResponse(res, null, 'Platform deleted successfully', 200);
    } catch (error) {
      return next(error);
    }
  },
};
