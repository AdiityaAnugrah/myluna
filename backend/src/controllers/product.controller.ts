import { Product, Category, ProductVariant, ChangeRequest, EntityType, RequestType, RequestStatus } from '../models';
import { successResponse } from '../utils/response';
import { AppError } from '../utils/errors';
import { Op } from 'sequelize';
import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/audit.service';
import { socketService } from '../services/socket.service';

export const productController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        categoryId = '',
        isActive = 'true',
        lowStock = 'false'
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      const where: any = {};

      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { sku: { [Op.like]: `%${search}%` } },
        ];
      }

      if (categoryId) {
        // Get all descendant category IDs for recursive filtering
        const getChildIds = async (parentId: string): Promise<string[]> => {
          const children = await Category.findAll({
            where: { parentId },
            attributes: ['id'],
          });
          const ids = children.map((c) => c.id);
          const childIds = await Promise.all(ids.map((id) => getChildIds(id)));
          return [...ids, ...childIds.flat()];
        };

        const descendantIds = await getChildIds(categoryId as string);
        where.categoryId = {
          [Op.in]: [categoryId, ...descendantIds],
        };
      }

      if (isActive !== 'all') {
        where.isActive = isActive === 'true';
      }

      if (lowStock === 'true') {
        where.stock = {
          [Op.lte]: Product.sequelize!.col('minStock'),
        };
      }

      const { count, rows } = await Product.findAndCountAll({
        where,
        include: [
          {
            model: ProductVariant,
            as: 'variantItems',
          },
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'parentId'],
            include: [
              {
                model: Category,
                as: 'parent',
                attributes: ['id', 'name'],
              },
            ],
          },
        ],
        limit: Number(limit),
        offset,
        order: [['createdAt', 'DESC']],
      });

      return successResponse(
        res,
        {
          products: rows.map(r => {
            const json: any = r.toJSON();
            // Map the relation to the expected frontend structure
            if (json.variantItems && json.variantItems.length > 0) {
              json.variants = json.variantItems;
            } else if (typeof json.variants === 'string') {
              try { json.variants = JSON.parse(json.variants); } catch (e) { json.variants = []; }
            }
            return json;
          }),
          pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / Number(limit)),
          },
        },
        'Products retrieved successfully',
        200
      );
    } catch (error) {
      return next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const product = await Product.findByPk(id, {
        include: [
          {
            model: ProductVariant,
            as: 'variantItems',
          },
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'parentId'],
            include: [
              {
                model: Category,
                as: 'parent',
                attributes: ['id', 'name'],
              },
            ],
          },
        ],
      });

      if (!product) {
        throw new AppError('Product not found', 404);
      }

      const json: any = product.toJSON();
      if (json.variantItems && json.variantItems.length > 0) {
        json.variants = json.variantItems;
      } else if (typeof json.variants === 'string') {
        try { json.variants = JSON.parse(json.variants); } catch (e) { json.variants = []; }
      }

      return successResponse(res, json, 'Product retrieved successfully', 200);
    } catch (error) {
      return next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        sku,
        name,
        description,
        categoryId,
        unit,
        purchasePrice,
        sellingPrice,
        stock,
        minStock,
        imageUrl,
        length,
        width,
        height,
        weight,
        variants, // Array of { name, value, priceAdjustment, stock }
      } = req.body;



      // Auto-generate SKU if not provided
      const generatedSku = sku || `SKU-${Date.now()}-${name.substring(0, 5).toUpperCase().replace(/\s/g, '')}`;

      // Check if SKU already exists
      const existingProduct = await Product.findOne({ where: { sku: generatedSku } });
      if (existingProduct) {
        throw new AppError('Product with this SKU already exists', 400);
      }

      // Check if category exists
      const category = await Category.findByPk(categoryId);
      if (!category) {
        throw new AppError('Category not found', 404);
      }

      // Approval Workflow: If role is USER, create a change request
      if (req.user?.roleName === 'USER') {
        const changeRequest = await ChangeRequest.create({
          entityType: EntityType.PRODUCT,
          entityId: null,
          requestType: RequestType.CREATE,
          status: RequestStatus.PENDING,
          payload: req.body,
          requestedBy: req.user.id
        });

        // Notify admins
        socketService.emitToAdmins('approval:pending', {
          message: 'Permintaan penambahan produk baru',
          entityType: 'Product',
          requestType: 'CREATE',
          requesterName: (req as any).user.fullName || (req as any).user.username,
        });

        return successResponse(res, changeRequest, 'Product creation request submitted for approval', 202);
      }

      const product = await Product.sequelize!.transaction(async (t) => {
        const newProduct = await Product.create({
          sku: generatedSku,
          name,
          description,
          categoryId,
          unit,
          purchasePrice,
          sellingPrice,
          stock: stock || 0,
          minStock: minStock || 0,
          imageUrl,
          length,
          width,
          height,
          weight,
          isActive: true,
        }, { transaction: t });

        if (variants && Array.isArray(variants)) {
          await ProductVariant.bulkCreate(
            variants.map((v: any) => ({
              ...v,
              productId: newProduct.id,
            })),
            { transaction: t }
          );
        }

        return newProduct;
      });

      const result = await Product.findByPk(product.id, {
        include: [{ model: ProductVariant, as: 'variantItems' }]
      });

      // Log activity
      const formDuration = req.body.duration ? Number(req.body.duration) : null;
      await auditService.log({
        userId: req.user!.id,
        action: 'CREATE' as any,
        entity: 'Product',
        entityId: result!.id,
        before: null,
        after: result!.toJSON(),
        ip: req.ip || '',
        userAgent: req.get('User-Agent') || '',
        duration: formDuration,
        metadata: { hasVariants: !!(variants && variants.length > 0), categoryId },
      });

      return successResponse(res, result, 'Product created successfully', 201);
    } catch (error) {
      return next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const {
        sku,
        name,
        description,
        categoryId,
        unit,
        purchasePrice,
        sellingPrice,
        minStock,
        isActive,
        imageUrl,
        length,
        width,
        height,
        weight,
        variants,
      } = req.body;

      const product = await Product.findByPk(id);



      if (!product) {
        throw new AppError('Product not found', 404);
      }

      // Check permissions for USER role
      if (req.user?.roleName === 'USER') {
        // 1. Restrict isActive change
        if (isActive !== undefined && isActive !== product.isActive) {
          throw new AppError('Anda tidak memiliki izin untuk mengubah status aktif/nonaktif produk', 403);
        }

        // 2. Redirect other updates to ChangeRequest
        const changeRequest = await ChangeRequest.create({
          entityType: EntityType.PRODUCT,
          entityId: id,
          requestType: RequestType.UPDATE,
          status: RequestStatus.PENDING,
          payload: req.body,
          requestedBy: req.user.id
        });

        // Notify admins
        socketService.emitToAdmins('approval:pending', {
          message: 'Permintaan pembaruan data produk',
          entityType: 'Product',
          requestType: 'UPDATE',
          requesterName: (req as any).user.fullName || (req as any).user.username,
        });

        return successResponse(res, changeRequest, 'Product update request submitted for approval', 202);
      }

      // Check if SKU is being changed and if it already exists
      if (sku && sku !== product.sku) {
        const existingProduct = await Product.findOne({ where: { sku } });
        if (existingProduct) {
          throw new AppError('Product with this SKU already exists', 400);
        }
      }

      // Check if category exists
      if (categoryId) {
        const category = await Category.findByPk(categoryId);
        if (!category) {
          throw new AppError('Category not found', 404);
        }
      }

      await Product.sequelize!.transaction(async (t) => {
          // Check if image is being updated and delete old one
          if (imageUrl && product.imageUrl && imageUrl !== product.imageUrl) {
             const { deleteProductImage } = require('../utils/imageProcessor');
             deleteProductImage(product.imageUrl);
          }

          await product.update({
          sku: sku || product.sku,
          name: name || product.name,
          description,
          categoryId: categoryId || product.categoryId,
          unit: unit || product.unit,
          purchasePrice: purchasePrice !== undefined ? purchasePrice : product.purchasePrice,
          sellingPrice: sellingPrice !== undefined ? sellingPrice : product.sellingPrice,
          minStock: minStock !== undefined ? minStock : product.minStock,
          isActive: isActive !== undefined ? isActive : product.isActive,
          imageUrl: imageUrl !== undefined ? imageUrl : product.imageUrl,
          length: length !== undefined ? length : product.length,
          width: width !== undefined ? width : product.width,
          height: height !== undefined ? height : product.height,
          weight: weight !== undefined ? weight : product.weight,
        }, { transaction: t });

        if (variants && Array.isArray(variants)) {
          // Simplest way: remove existing variants and recreating them
          await ProductVariant.destroy({ where: { productId: id }, transaction: t });
          await ProductVariant.bulkCreate(
            variants.map((v: any) => ({
              ...v,
              productId: id,
            })),
            { transaction: t }
          );
        }
      });

      const result = await Product.findByPk(id, {
        include: [{ model: ProductVariant, as: 'variantItems' }]
      });

      // Check for low stock and notify admins
      if (result && result.stock <= result.minStock) {
        socketService.emitToAdmins('product:low-stock', {
          productId: result.id,
          productName: result.name,
          currentStock: result.stock,
          minStock: result.minStock,
        });
      }

      // Log activity
      await auditService.log({
        userId: req.user!.id,
        action: 'UPDATE' as any,
        entity: 'Product',
        entityId: id,
        before: product.toJSON(),
        after: result!.toJSON(),
        ip: req.ip || '',
        userAgent: req.get('User-Agent') || '',
      });

      return successResponse(res, result, 'Product updated successfully', 200);
    } catch (error) {
      return next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;



      const product = await Product.findByPk(id);
      if (!product) {
        throw new AppError('Product not found', 404);
      }

      // Restrict delete for USER role
      if (req.user?.roleName === 'USER') {
        throw new AppError('Anda tidak memiliki izin untuk menghapus produk', 403);
      }

      // Soft delete by setting isActive to false
      await product.update({ isActive: false });

      // Log activity
      await auditService.log({
        userId: req.user!.id,
        action: 'DELETE' as any, // Soft delete logged as DELETE
        entity: 'Product',
        entityId: id,
        before: product.toJSON(),
        after: { isActive: false },
        ip: req.ip || '',
        userAgent: req.get('User-Agent') || '',
      });

      return successResponse(res, null, 'Product deleted successfully', 200);
    } catch (error) {
      return next(error);
    }
  },

  async getLowStock(_req: Request, res: Response, next: NextFunction) {
    try {
      const products = await Product.findAll({
        where: {
          isActive: true,
          stock: {
            [Op.lte]: Product.sequelize!.col('minStock'),
          },
        },
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'parentId'],
            include: [
              {
                model: Category,
                as: 'parent',
                attributes: ['id', 'name'],
              },
            ],
          },
        ],
        order: [['stock', 'ASC']],
      });

      return successResponse(
        res,
        products,
        'Low stock products retrieved successfully',
        200
      );
    } catch (error) {
      return next(error);
    }
  },

  // Bulk delete products (soft delete)
  async bulkDelete(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new AppError('Product IDs array is required', 400);
      }

      await Product.sequelize!.transaction(async (t) => {
        await Product.update(
          { isActive: false },
          {
            where: { id: { [Op.in]: ids } },
            transaction: t,
          }
        );
      });

      // Log bulk delete activity
      await auditService.log({
        userId: req.user!.id,
        action: 'DELETE' as any,
        entity: 'Product',
        entityId: ids.join(','),
        before: null,
        after: { bulkDeleted: ids.length },
        ip: req.ip || '',
        userAgent: req.get('User-Agent') || '',
      });

      return successResponse(
        res,
        { deletedCount: ids.length },
        `${ids.length} products deleted successfully`,
        200
      );
    } catch (error) {
      return next(error);
    }
  },

  // Bulk update products
  async bulkUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids, updates } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new AppError('Product IDs array is required', 400);
      }

      if (!updates || typeof updates !== 'object') {
        throw new AppError('Updates object is required', 400);
      }

      // Only allow specific fields to be bulk updated
      const allowedFields = ['categoryId', 'isActive', 'minStock'];
      const updateData: any = {};

      Object.keys(updates).forEach((key) => {
        if (allowedFields.includes(key)) {
          updateData[key] = updates[key];
        }
      });

      if (Object.keys(updateData).length === 0) {
        throw new AppError('No valid fields to update', 400);
      }

      // Validate categoryId if provided
      if (updateData.categoryId) {
        const category = await Category.findByPk(updateData.categoryId);
        if (!category) {
          throw new AppError('Category not found', 404);
        }
      }

      await Product.sequelize!.transaction(async (t) => {
        await Product.update(updateData, {
          where: { id: { [Op.in]: ids } },
          transaction: t,
        });
      });

      // Log bulk update activity
      await auditService.log({
        userId: req.user!.id,
        action: 'UPDATE' as any,
        entity: 'Product',
        entityId: ids.join(','),
        before: null,
        after: { bulkUpdated: ids.length, updates: updateData },
        ip: req.ip || '',
        userAgent: req.get('User-Agent') || '',
      });

      return successResponse(
        res,
        { updatedCount: ids.length },
        `${ids.length} products updated successfully`,
        200
      );
    } catch (error) {
      return next(error);
    }
  },
};
