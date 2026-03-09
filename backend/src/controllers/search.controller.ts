import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { Product, Sale, Category } from '../models';
import { successResponse } from '../utils/response';

export const searchController = {
  async globalSearch(req: Request, res: Response, next: NextFunction) {
    try {
      const { q } = req.query;

      if (!q || String(q).trim().length < 2) {
        return successResponse(res, { products: [], sales: [] }, 'Search results', 200);
      }

      const query = String(q).trim();
      const like = { [Op.like]: `%${query}%` };

      // Search products
      const products = await Product.findAll({
        where: {
          isActive: true,
          [Op.or]: [
            { name: like },
            { sku: like },
          ],
        },
        include: [{ model: Category, as: 'category', attributes: ['name'] }],
        limit: 5,
        order: [['name', 'ASC']],
        attributes: ['id', 'name', 'sku', 'stock', 'sellingPrice', 'unit'],
      });

      // Search sales by customer name or sale number
      const sales = await Sale.findAll({
        where: {
          [Op.or]: [
            { customerName: like },
            { saleNumber: like },
          ],
        },
        limit: 5,
        order: [['saleDate', 'DESC']],
        attributes: ['id', 'saleNumber', 'customerName', 'totalAmount', 'status', 'saleDate'],
      });

      return successResponse(res, { products, sales }, 'Search results', 200);
    } catch (error) {
      return next(error);
    }
  },
};
