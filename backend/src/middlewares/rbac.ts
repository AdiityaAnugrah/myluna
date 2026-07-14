import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

export function rbac(allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const userRole = req.user.roleName.toUpperCase();
    const requiredRoles = allowedRoles.map(r => r.toUpperCase());

    // DEV berada di atas semua role, TESTING tetap bisa akses untuk simulasi end-to-end.
    if (userRole === 'DEV' || userRole === 'TESTING') {
      return next();
    }

    if (!requiredRoles.includes(userRole)) {
      console.log(`[RBAC] Access Denied. Required provided: ${JSON.stringify(allowedRoles)}. User role: ${req.user.roleName}`);
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
}
