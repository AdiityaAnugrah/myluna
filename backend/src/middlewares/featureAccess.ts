import { NextFunction, Request, Response } from 'express';
import { FeatureFlag } from '../models';
import { ForbiddenError } from '../utils/errors';

export function featureAccess(featureKey: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) return next();

      const role = req.user.roleName.toUpperCase();
      if (role === 'DEV' || role === 'TESTING') return next();

      const feature = await FeatureFlag.findOne({ where: { key: featureKey } });
      if (!feature) return next();

      const allowedRoles = Array.isArray(feature.allowedRoles)
        ? feature.allowedRoles.map((item) => String(item).toUpperCase())
        : [];

      if (!feature.isEnabled || !allowedRoles.includes(role)) {
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
