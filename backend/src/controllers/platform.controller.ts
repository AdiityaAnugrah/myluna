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
      const { name } = req.body;

      // Check if platform already exists
      const existingPlatform = await Platform.findOne({ where: { name } });
      if (existingPlatform) {
        if (!existingPlatform.isActive) {
          // Reactivate if it was soft deleted
          await existingPlatform.update({ isActive: true });
          return successResponse(res, existingPlatform, 'Platform reactivated successfully', 201);
        }
        throw new AppError('Platform already exists', 400);
      }

      const platform = await Platform.create({ name, isActive: true });
      return successResponse(res, platform, 'Platform created successfully', 201);
    } catch (error) {
      return next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, isActive } = req.body;

      const platform = await Platform.findByPk(id);
      if (!platform) {
        throw new AppError('Platform not found', 404);
      }

      await platform.update({
        name: name || platform.name,
        isActive: isActive !== undefined ? isActive : platform.isActive,
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
