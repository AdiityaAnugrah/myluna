import { Request, Response, NextFunction } from 'express';
import { ShippingService } from '../models';
import { successResponse } from '../utils/response';
import { AppError } from '../utils/errors';
import { auditService } from '../services/audit.service';
import { AuditAction } from '../models/AuditLog';

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
      const { name, requiresDocument = false } = req.body;

      const existingService = await ShippingService.findOne({ where: { name } });
      if (existingService) {
        if (!existingService.isActive) {
          await existingService.update({ isActive: true });

          await auditService.log({
            userId: req.user!.id,
            action: AuditAction.UPDATE,
            entity: 'ShippingService',
            entityId: existingService.id,
            before: { name: existingService.name, isActive: false, requiresDocument: existingService.requiresDocument },
            after: { name: existingService.name, isActive: true, requiresDocument: existingService.requiresDocument },
            ip: req.ip || req.socket.remoteAddress || '',
            userAgent: req.headers['user-agent'] || '',
          });

          return successResponse(res, existingService, 'Shipping service reactivated successfully', 201);
        }
        throw new AppError('Shipping service already exists', 400);
      }

      const service = await ShippingService.create({ name, isActive: true, requiresDocument });

      await auditService.log({
        userId: req.user!.id,
        action: AuditAction.CREATE,
        entity: 'ShippingService',
        entityId: service.id,
        before: null,
        after: { name, isActive: true, requiresDocument },
        ip: req.ip || req.socket.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
      });

      return successResponse(res, service, 'Shipping service created successfully', 201);
    } catch (error) {
      return next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, isActive, requiresDocument } = req.body;

      const service = await ShippingService.findByPk(id);
      if (!service) {
        throw new AppError('Shipping service not found', 404);
      }

      const before = { name: service.name, isActive: service.isActive, requiresDocument: service.requiresDocument };

      await service.update({
        name: name || service.name,
        isActive: isActive !== undefined ? isActive : service.isActive,
        requiresDocument: requiresDocument !== undefined ? requiresDocument : service.requiresDocument,
      });

      await auditService.log({
        userId: req.user!.id,
        action: AuditAction.UPDATE,
        entity: 'ShippingService',
        entityId: id,
        before,
        after: { name: service.name, isActive: service.isActive, requiresDocument: service.requiresDocument },
        ip: req.ip || req.socket.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
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

      const before = { name: service.name, isActive: service.isActive, requiresDocument: service.requiresDocument };

      // Soft delete
      await service.update({ isActive: false });

      await auditService.log({
        userId: req.user!.id,
        action: AuditAction.DELETE,
        entity: 'ShippingService',
        entityId: id,
        before,
        after: { name: service.name, isActive: false, requiresDocument: service.requiresDocument },
        ip: req.ip || req.socket.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
      });

      return successResponse(res, null, 'Shipping service deleted successfully', 200);
    } catch (error) {
      return next(error);
    }
  },
};
