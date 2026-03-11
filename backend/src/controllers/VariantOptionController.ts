import { Request, Response } from 'express';
import { VariantOption } from '../models';

export class VariantOptionController {
  static async list(_req: Request, res: Response) {
    try {
      const options = await VariantOption.findAll({
        order: [['name', 'ASC']],
      });
      return res.json({
        success: true,
        data: options,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const name = req.body.name?.toUpperCase();
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Name is required',
        });
      }

      const existing = await VariantOption.findOne({ where: { name } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Option already exists',
        });
      }

      const option = await VariantOption.create({ name });
      return res.status(201).json({
        success: true,
        data: option,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}
