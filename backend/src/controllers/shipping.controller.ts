import { Request, Response, NextFunction } from 'express';
import { ShippingService } from '../models';
import { successResponse } from '../utils/response';
import { AppError } from '../utils/errors';

export const shippingController = {
  async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const services = await ShippingService.findAll({
        order: [['name', 'ASC']],
      });

      return successResponse(res, services, 'Shipping services retrieved successfully', 200);
    } catch (error) {
      return next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;

      // Check if service already exists
      const existingService = await ShippingService.findOne({ where: { name } });
      if (existingService) {
        if (!existingService.isActive) {
          // Reactivate if it was soft deleted
          await existingService.update({ isActive: true });
          return successResponse(res, existingService, 'Shipping service reactivated successfully', 201);
        }
        throw new AppError('Shipping service already exists', 400);
      }

      const service = await ShippingService.create({ name, isActive: true });
      return successResponse(res, service, 'Shipping service created successfully', 201);
    } catch (error) {
      return next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, isActive } = req.body;

      const service = await ShippingService.findByPk(id);
      if (!service) {
        throw new AppError('Shipping service not found', 404);
      }

      await service.update({
        name: name || service.name,
        isActive: isActive !== undefined ? isActive : service.isActive,
      });

      return successResponse(res, service, 'Shipping service updated successfully', 200);
    } catch (error) {
      return next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const service = await ShippingService.findByPk(id);
      if (!service) {
        throw new AppError('Shipping service not found', 404);
      }

      // Soft delete
      await service.update({ isActive: false });

      return successResponse(res, null, 'Shipping service deleted successfully', 200);
    } catch (error) {
      return next(error);
    }
  },
};
