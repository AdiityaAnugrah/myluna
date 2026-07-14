import { NextFunction, Request, Response } from 'express';
import { FeatureFlag } from '../models';
import { AppError } from '../utils/errors';
import { successResponse } from '../utils/response';

const VALID_ROLES = ['USER', 'TCP', 'ADMIN', 'SUPER_ADMIN', 'DEV'] as const;
type ValidRole = (typeof VALID_ROLES)[number];

function normalizeRoles(input: unknown): ValidRole[] {
  if (!Array.isArray(input)) return ['DEV'];

  const roles = input
    .map((role) => String(role).toUpperCase())
    .filter((role): role is ValidRole => VALID_ROLES.includes(role as ValidRole));

  const uniqueRoles = Array.from(new Set<ValidRole>([...roles, 'DEV']));
  return uniqueRoles;
}

export const featureController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const role = req.user?.roleName?.toUpperCase() || '';
      const isDev = role === 'DEV';

      const features = await FeatureFlag.findAll({
        order: [
          ['sortOrder', 'ASC'],
          ['label', 'ASC'],
        ],
      });

      const visibleFeatures = isDev
        ? features
        : features.filter((feature) => {
            const allowedRoles = Array.isArray(feature.allowedRoles) ? feature.allowedRoles : [];
            return feature.isEnabled && allowedRoles.map(String).map((item) => item.toUpperCase()).includes(role);
          });

      return successResponse(res, visibleFeatures, 'Feature settings retrieved successfully', 200);
    } catch (error) {
      return next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const feature = await FeatureFlag.findByPk(req.params.id);
      if (!feature) {
        throw new AppError('Feature not found', 404);
      }

      const payload: Partial<{
        label: string;
        description: string | null;
        path: string | null;
        isEnabled: boolean;
        isDevelopment: boolean;
        allowedRoles: ValidRole[];
      }> = {};

      if (typeof req.body.label === 'string' && req.body.label.trim()) payload.label = req.body.label.trim();
      if (typeof req.body.description === 'string') payload.description = req.body.description.trim() || null;
      if (typeof req.body.path === 'string') payload.path = req.body.path.trim() || null;
      if (typeof req.body.isEnabled === 'boolean') payload.isEnabled = req.body.isEnabled;
      if (typeof req.body.isDevelopment === 'boolean') payload.isDevelopment = req.body.isDevelopment;
      if (Array.isArray(req.body.allowedRoles)) payload.allowedRoles = normalizeRoles(req.body.allowedRoles);

      await feature.update(payload);

      return successResponse(res, feature, 'Feature settings updated successfully', 200);
    } catch (error) {
      return next(error);
    }
  },
};
