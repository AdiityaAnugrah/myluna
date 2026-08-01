import { NextFunction, Request, Response } from 'express';
import { SystemSetting } from '../models';
import { AppError } from '../utils/errors';
import { successResponse } from '../utils/response';
import { ensureSystemSettingsReady, SETTLEMENT_CONFIRMATION_DATE_BASIS_KEY } from '../services/systemSetting.service';

const VALID_SETTING_VALUES: Record<string, string[]> = {
  [SETTLEMENT_CONFIRMATION_DATE_BASIS_KEY]: ['SETTLEMENT_DATE', 'CONFIRMATION_DATE'],
};

export const systemSettingController = {
  async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      await ensureSystemSettingsReady();
      const settings = await SystemSetting.findAll({
        order: [['label', 'ASC']],
      });

      return successResponse(res, settings, 'System settings retrieved successfully', 200);
    } catch (error) {
      return next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { key } = req.params;
      const value = String(req.body.value || '').trim();

      const allowedValues = VALID_SETTING_VALUES[key];
      if (!allowedValues || !allowedValues.includes(value)) {
        throw new AppError('Nilai pengaturan tidak valid', 400);
      }

      await ensureSystemSettingsReady();
      const setting = await SystemSetting.findOne({ where: { key } });
      if (!setting) {
        throw new AppError('Pengaturan tidak ditemukan', 404);
      }

      await setting.update({ value });

      return successResponse(res, setting, 'System setting updated successfully', 200);
    } catch (error) {
      return next(error);
    }
  },
};
