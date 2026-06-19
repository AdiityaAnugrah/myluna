import { Request, Response, NextFunction } from 'express';
import { District, Province, Regency, Village } from '../models';
import { AppError } from '../utils/errors';
import { successResponse } from '../utils/response';

function requiredId(value: unknown, label: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${label} wajib diisi`, 400);
  }
  return parsed;
}

export const regionController = {
  async getProvinces(_req: Request, res: Response, next: NextFunction) {
    try {
      const provinces = await Province.findAll({
        where: { isActive: true },
        attributes: ['id', 'label'],
        order: [['label', 'ASC']],
      });
      successResponse(res, provinces, 'Provinces retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  async getRegencies(req: Request, res: Response, next: NextFunction) {
    try {
      const provinceId = requiredId(req.query.provinceId, 'Provinsi');
      const regencies = await Regency.findAll({
        where: { provinceId, isActive: true },
        attributes: ['id', 'provinceId', 'label'],
        order: [['label', 'ASC']],
      });
      successResponse(res, regencies, 'Regencies retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  async getDistricts(req: Request, res: Response, next: NextFunction) {
    try {
      const regencyId = requiredId(req.query.regencyId, 'Kabupaten/kota');
      const districts = await District.findAll({
        where: { regencyId, isActive: true },
        attributes: ['id', 'provinceId', 'regencyId', 'label'],
        order: [['label', 'ASC']],
      });
      successResponse(res, districts, 'Districts retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  async getVillages(req: Request, res: Response, next: NextFunction) {
    try {
      const districtId = requiredId(req.query.districtId, 'Kecamatan');
      const villages = await Village.findAll({
        where: { districtId, isActive: true },
        attributes: ['id', 'provinceId', 'regencyId', 'districtId', 'label', 'postalCode'],
        order: [['label', 'ASC']],
      });
      successResponse(res, villages, 'Villages retrieved successfully');
    } catch (error) {
      next(error);
    }
  },
};
