import { NextFunction, Request, Response } from 'express';
import { FeatureFlag } from '../models';
import { ForbiddenError } from '../utils/errors';

interface FeatureAccessOptions {
  readFallbackFeatureKeys?: string[];
}

function isRoleAllowed(feature: FeatureFlag, role: string) {
  const allowedRoles = Array.isArray(feature.allowedRoles)
    ? feature.allowedRoles.map((item) => String(item).toUpperCase())
    : [];

  return feature.isEnabled && !feature.isDevelopment && allowedRoles.includes(role);
}

export function featureAccess(featureKey: string, options: FeatureAccessOptions = {}) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) return next();

      const role = req.user.roleName.toUpperCase();
      if (role === 'DEV') return next();

      const feature = await FeatureFlag.findOne({ where: { key: featureKey } });
      if (!feature) return next();

      if (role === 'TESTING') return next();

      if (isRoleAllowed(feature, role)) {
        return next();
      }

      const isReadMethod = req.method.toUpperCase() === 'GET';
      if (isReadMethod && options.readFallbackFeatureKeys?.length) {
        const fallbackFeatures = await FeatureFlag.findAll({
          where: { key: options.readFallbackFeatureKeys },
        });
        if (fallbackFeatures.some((item) => isRoleAllowed(item, role))) {
          return next();
        }
      }

      if (feature.isDevelopment) {
        return next(new ForbiddenError('Fitur ini sedang dalam maintenance/pengembangan'));
      }

      if (!feature.isEnabled || !isRoleAllowed(feature, role)) {
        return next(new ForbiddenError('Fitur ini sedang tidak aktif untuk role Anda'));
      }

      return next();
    } catch (error: any) {
      const message = String(error?.message || '');
      if (message.includes('feature_flags') || message.includes('doesn') || message.includes('exist')) {
        return next();
      }
      return next(error);
    }
  };
}
