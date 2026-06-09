import { Request, Response, NextFunction } from 'express';

import { User, Role } from '../models';
import { AppError } from '../utils/errors';
import { successResponse } from '../utils/response';
import { auditService } from '../services/audit.service';

type PrimaryColor = 'umber' | 'blue' | 'green' | 'violet' | 'orange' | 'pink' | 'rose' | 'amber' | 'slate';

const primaryColors: PrimaryColor[] = ['umber', 'blue', 'green', 'violet', 'orange', 'pink', 'rose', 'amber', 'slate'];

const normalizePrimaryColor = (color?: string): PrimaryColor => {
  if (!color || color === 'red' || color === 'sage') return 'umber';
  return primaryColors.includes(color as PrimaryColor) ? (color as PrimaryColor) : 'umber';
};

export const userController = {
  // Get all roles
  async getRoles(_req: Request, res: Response, next: NextFunction) {
    try {
      const roles = await Role.findAll({
        attributes: ['id', 'name', 'description'],
      });
      successResponse(res, roles, 'Roles retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  // Get all users
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 10, search, roleId } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const where: any = {};
      
      // Basic search by username or email
      if (search) {
        const { Op } = require('sequelize');
        where[Op.or] = [
          { username: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { fullName: { [Op.like]: `%${search}%` } }
        ];
      }

      if (roleId) {
        where.roleId = roleId;
      }

      const { count, rows } = await User.findAndCountAll({
        where,
        limit: Number(limit),
        offset,
        include: [
          {
            model: Role,
            as: 'role',
            attributes: ['id', 'name', 'description'],
          },
        ],
        attributes: { exclude: ['password'] }, // Don't return passwords
        order: [['createdAt', 'DESC']],
      });

      successResponse(res, {
        users: rows,
        pagination: {
          total: count,
          page: Number(page),
          totalPages: Math.ceil(count / Number(limit)),
        },
      }, 'Users retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  // Get user by ID
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await User.findByPk(id, {
        include: [
          {
            model: Role,
            as: 'role',
            attributes: ['id', 'name', 'description'],
          },
        ],
        attributes: { exclude: ['password'] },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      successResponse(res, user, 'User retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  // Create new user (Super Admin only)
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, email, password, fullName, roleId, isActive } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        where: {
          [require('sequelize').Op.or]: [{ email }, { username }],
        },
      });

      if (existingUser) {
        throw new AppError('Username or email already exists', 400);
      }

      // Check if role exists
      const role = await Role.findByPk(roleId);
      if (!role) {
        throw new AppError('Role not found', 404);
      }

      const user = await User.create({
        username,
        email,
        password, // Model hook will hash this
        fullName,
        roleId,
        isActive: isActive !== undefined ? isActive : true,
        totalDuration: 0,
      });

      // Remove password from response
      const userResponse = user.toJSON();
      delete (userResponse as any).password;

      successResponse(res, userResponse, 'User created successfully', 201);

      // Log activity
      // We need logged in user ID, assuming auth middleware populates req.user
      if (req.user) {
        await auditService.log({
          userId: req.user.id,
          action: 'CREATE' as any,
          entity: 'User',
          entityId: user.id,
          before: null,
          after: userResponse,
          ip: req.ip || '',
          userAgent: req.get('User-Agent') || '',
        });
      }
    } catch (error) {
      next(error);
    }
  },

  // Update user
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { username, email, password, fullName, roleId, isActive } = req.body;

      const user = await User.findByPk(id);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Check uniqueness if changing username/email
      if ((username && username !== user.username) || (email && email !== user.email)) {
        const { Op } = require('sequelize');
        const existingUser = await User.findOne({
          where: {
            [Op.and]: [
              { [Op.or]: [{ email }, { username }] },
              { id: { [Op.ne]: id } },
            ],
          },
        });

        if (existingUser) {
          throw new AppError('Username or email already in use', 400);
        }
      }

      const updates: any = {
        username,
        email,
        fullName,
        roleId,
        isActive,
      };

      if (password) {
        updates.password = password; // Model hook will hash this
      }

      // Remove undefined fields
      Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

      await user.update(updates);

      const updatedUser = await User.findByPk(id, {
        include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
        attributes: { exclude: ['password'] },
      });

      // Log activity
      if (req.user) {
        await auditService.log({
            userId: req.user.id,
            action: 'UPDATE' as any,
            entity: 'User',
            entityId: id,
            before: null, // Could fetch previous data if needed, but expensive
            after: updatedUser ? updatedUser.toJSON() : {},
            ip: req.ip || '',
            userAgent: req.get('User-Agent') || '',
        });
      }

      successResponse(res, updatedUser, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  },

  // Delete user
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await User.findByPk(id);

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Prevent deleting yourself (optional but good practice)
      if (user.id === (req as any).user.id) {
         throw new AppError('Cannot delete your own account', 400);
      }

      await user.destroy();

      await user.destroy();

      // Log activity
      if (req.user) {
          await auditService.log({
            userId: req.user.id,
            action: 'DELETE' as any,
            entity: 'User',
            entityId: id,
            before: user.toJSON(),
            after: null,
            ip: req.ip || '',
            userAgent: req.get('User-Agent') || '',
          });
      }

      successResponse(res, null, 'User deleted successfully');
    } catch (error) {
      next(error);
    }
  },

  // Update user settings
  async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { theme, fontSize, primaryColor } = req.body;

      const user = await User.findByPk(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      await user.update({
        settings: {
          theme: theme || user.settings?.theme || 'system',
          fontSize: fontSize || user.settings?.fontSize || 'medium',
          primaryColor: normalizePrimaryColor(primaryColor || user.settings?.primaryColor),
        },
      });

      successResponse(res, user.settings, 'Settings updated successfully');
    } catch (error) {
      next(error);
    }
  },
};
