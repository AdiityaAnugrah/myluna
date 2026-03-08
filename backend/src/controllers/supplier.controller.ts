import { Request, Response, NextFunction } from 'express';
import { Supplier } from '../models';
import { successResponse } from '../utils/response';
import { AppError } from '../utils/errors';
import { Op } from 'sequelize';
import { auditService } from '../services/audit.service';
import { socketService } from '../services/socket.service';
import { ChangeRequest, EntityType, RequestType, RequestStatus } from '../models';

export const supplierController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        isActive = 'true' 
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      const where: any = {};

      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { contact: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
        ];
      }

      if (isActive !== 'all') {
        where.isActive = isActive === 'true';
      }

      const { count, rows } = await Supplier.findAndCountAll({
        where,
        limit: Number(limit),
        offset,
        order: [['name', 'ASC']],
      });

      return successResponse(
        res,
        {
          suppliers: rows,
          pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / Number(limit)),
          },
        },
        'Suppliers retrieved successfully',
        200
      );
    } catch (error) {
      return next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const supplier = await Supplier.findByPk(id);

      if (!supplier) {
        throw new AppError('Supplier not found', 404);
      }

      return successResponse(res, supplier, 'Supplier retrieved successfully', 200);
    } catch (error) {
      return next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, contact, phone, email, address } = req.body;

      // Check for approval workflow
      const userRole = (req as any).user?.roleName;
      const userId = (req as any).user?.id;

      if (userRole === 'USER') {
          const changeRequest = await ChangeRequest.create({
              entityType: EntityType.SUPPLIER,
              entityId: null,
              requestType: RequestType.CREATE,
              status: RequestStatus.PENDING,
              payload: req.body,
              requestedBy: userId
          });
          
          // Send real-time notification to admins
          socketService.emitToAdmins('approval:pending', {
              message: 'Permintaan perubahan data baru',
              entityType: 'Supplier',
              requestType: 'CREATE',
              requesterName: (req as any).user?.fullName || (req as any).user?.username,
          });
          
          return successResponse(res, changeRequest, 'Request submitted for approval', 202);
      }

      const supplier = await Supplier.create({
        name,
        contact,
        phone,
        email,
        address,
        isActive: true,
      });

      // Log activity
      await auditService.log({
        userId: userId!,
        action: 'CREATE' as any,
        entity: 'Supplier',
        entityId: supplier.id,
        before: null,
        after: supplier.toJSON(),
        ip: req.ip || '',
        userAgent: req.get('User-Agent') || '',
      });

      return successResponse(res, supplier, 'Supplier created successfully', 201);
    } catch (error) {
      return next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, contact, phone, email, address, isActive } = req.body;

      const supplier = await Supplier.findByPk(id);

      if (!supplier) {
        throw new AppError('Supplier not found', 404);
      }

      // Check for approval workflow
      const userRole = (req as any).user?.roleName;
      const userId = (req as any).user?.id;

      if (userRole === 'USER') {
          const changeRequest = await ChangeRequest.create({
              entityType: EntityType.SUPPLIER,
              entityId: id,
              requestType: RequestType.UPDATE,
              status: RequestStatus.PENDING,
              payload: req.body,
              requestedBy: userId
          });
          
          // Send real-time notification to admins
          socketService.emitToAdmins('approval:pending', {
              message: 'Permintaan perubahan data supplier',
              entityType: 'Supplier',
              requestType: 'UPDATE',
              requesterName: (req as any).user?.fullName || (req as any).user?.username,
          });
          
          return successResponse(res, changeRequest, 'Request submitted for approval', 202);
      }

      const previousData = supplier.toJSON();

      await supplier.update({
        name: name || supplier.name,
        contact,
        phone,
        email,
        address,
        isActive: isActive !== undefined ? isActive : supplier.isActive,
      });

      // Log activity
      await auditService.log({
        userId: req.user!.id,
        action: 'UPDATE' as any,
        entity: 'Supplier',
        entityId: supplier.id,
        before: previousData,
        after: supplier.toJSON(),
        ip: req.ip || '',
        userAgent: req.get('User-Agent') || '',
      });

      return successResponse(res, supplier, 'Supplier updated successfully', 200);
    } catch (error) {
      return next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const supplier = await Supplier.findByPk(id);

      if (!supplier) {
        throw new AppError('Supplier not found', 404);
      }

      // Check for approval workflow
      const userRole = (req as any).user?.roleName;
      const userId = (req as any).user?.id;

      if (userRole === 'USER') {
          const changeRequest = await ChangeRequest.create({
              entityType: EntityType.SUPPLIER,
              entityId: id,
              requestType: RequestType.DELETE,
              status: RequestStatus.PENDING,
              payload: supplier.toJSON(),
              requestedBy: userId
          });
          
          // Send real-time notification to admins
          socketService.emitToAdmins('approval:pending', {
              message: 'Permintaan penghapusan data supplier',
              entityType: 'Supplier',
              requestType: 'DELETE',
              requesterName: (req as any).user?.fullName || (req as any).user?.username,
          });
          
          return successResponse(res, changeRequest, 'Request submitted for approval', 202);
      }

      // Soft delete by setting isActive to false
      await supplier.update({ isActive: false });

      // Log activity
      await auditService.log({
        userId: req.user!.id,
        action: 'DELETE' as any,
        entity: 'Supplier',
        entityId: id,
        before: supplier.toJSON(),
        after: { isActive: false },
        ip: req.ip || '',
        userAgent: req.get('User-Agent') || '',
      });

      return successResponse(res, null, 'Supplier deleted successfully', 200);
    } catch (error) {
      return next(error);
    }
  },
};
