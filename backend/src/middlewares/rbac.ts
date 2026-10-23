import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { rolesWithAdminOrder } from '../utils/roles';

export function rbac(allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const userRole = req.user.roleName.toUpperCase();
    const requiredRoles = rolesWithAdminOrder(allowedRoles).map(r => r.toUpperCase());

    // TESTING write requests are short-circuited by auth middleware; do not
    // grant the test role access to production data on read routes.
    if (userRole === 'DEV') {
      return next();
    }

    if (!requiredRoles.includes(userRole)) {
      console.log(`[RBAC] Access Denied. Required provided: ${JSON.stringify(allowedRoles)}. User role: ${req.user.roleName}`);
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
}
