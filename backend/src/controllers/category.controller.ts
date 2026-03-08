import { Request, Response, NextFunction } from 'express';
import { Category, Product } from '../models';
import { successResponse } from '../utils/response';
import { AppError } from '../utils/errors';
import { auditService } from '../services/audit.service';

export const categoryController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { isActive = 'true', onlyMain = 'false' } = req.query;
      const where: any = {};

      if (isActive !== 'all') {
        where.isActive = isActive === 'true';
      }

      if (onlyMain === 'true') {
        where.parentId = null;
      }

      const categories = await Category.findAll({
        where,
        include: [
          {
            model: Category,
            as: 'children',
          }
        ],
        order: [['name', 'ASC']],
      });

      return successResponse(res, categories, 'Categories retrieved successfully', 200);
    } catch (error) {
      return next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const category = await Category.findByPk(id, {
        include: [
          { model: Category, as: 'parent' },
          { model: Category, as: 'children' }
        ]
      });

      if (!category) {
        throw new AppError('Kategori tidak ditemukan', 404);
      }

      return successResponse(res, category, 'Category retrieved successfully', 200);
    } catch (error) {
      return next(error);
    }
  },


  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, parentId } = req.body;



      // Cek apakah nama kategori sudah ada
      const existingCategory = await Category.findOne({ where: { name } });
      if (existingCategory) {
        throw new AppError('Nama kategori sudah digunakan', 400);
      }

      if (parentId) {
        const parent = await Category.findByPk(parentId);
        if (!parent) {
          throw new AppError('Kategori induk tidak ditemukan', 404);
        }
      }

      const category = await Category.create({
        name,
        parentId: parentId || null,
        isActive: true,
      });

      // Log activity
      await auditService.log({
        userId: req.user!.id,
        action: 'CREATE' as any,
        entity: 'Category',
        entityId: category.id,
        before: null,
        after: category.toJSON(),
        ip: req.ip || '',
        userAgent: req.get('User-Agent') || '',
      });

      return successResponse(res, category, 'Category created successfully', 201);
    } catch (error) {
      return next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, isActive, parentId } = req.body;

      const category = await Category.findByPk(id);
      


      if (!category) {
        throw new AppError('Kategori tidak ditemukan', 404);
      }

      // Cek jika nama berubah dan sudah dipakai
      if (name && name !== category.name) {
        const existingCategory = await Category.findOne({ where: { name } });
        if (existingCategory) {
          throw new AppError('Nama kategori sudah digunakan', 400);
        }
      }

      if (parentId) {
        if (parentId === id) {
          throw new AppError('Kategori tidak bisa menjadi induk untuk dirinya sendiri', 400);
        }
        const parent = await Category.findByPk(parentId);
        if (!parent) {
          throw new AppError('Kategori induk tidak ditemukan', 404);
        }
      }

      const previousData = category.toJSON();

      await category.update({
        name: name || category.name,
        parentId: parentId !== undefined ? (parentId === "none" ? null : parentId) : category.parentId,
        isActive: isActive !== undefined ? isActive : category.isActive,
      });

      // Log activity
      await auditService.log({
        userId: req.user!.id,
        action: 'UPDATE' as any,
        entity: 'Category',
        entityId: category.id,
        before: previousData,
        after: category.toJSON(),
        ip: req.ip || '',
        userAgent: req.get('User-Agent') || '',
      });

      return successResponse(res, category, 'Category updated successfully', 200);
    } catch (error) {
      return next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const category = await Category.findByPk(id);

      if (!category) {
        throw new AppError('Kategori tidak ditemukan', 404);
      }

      // Cek apakah ada produk yang menggunakan kategori ini
      const productCount = await Product.count({ where: { categoryId: id } });
      if (productCount > 0) {
        throw new AppError(
          `Kategori tidak bisa dihapus karena masih digunakan oleh ${productCount} produk`,
          400
        );
      }

      const categoryData = category.toJSON();

      // Hard delete — benar-benar dihapus dari database
      await category.destroy();

      // Log activity
      await auditService.log({
        userId: req.user!.id,
        action: 'DELETE' as any,
        entity: 'Category',
        entityId: id,
        before: categoryData,
        after: null,
        ip: req.ip || '',
        userAgent: req.get('User-Agent') || '',
      });

      return successResponse(res, null, 'Kategori berhasil dihapus', 200);
    } catch (error) {
      return next(error);
    }
  },
};
