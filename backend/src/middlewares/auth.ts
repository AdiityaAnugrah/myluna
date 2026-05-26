import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';
import { UnauthorizedError } from '../utils/errors';
import { User, Role } from '../models';
import { logger } from '../utils/logger';

export async function auth(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);
    logger.info(`[AUTH] Incoming request for ${req.method} ${req.path}. Token: ${token.substring(0, 10)}... (length: ${token.length})`);

    try {
      const decoded = jwt.verify(token, jwtConfig.access.secret) as {
        userId: string;
      };

      const user = await User.findByPk(decoded.userId, {
        include: [{ model: Role, as: 'role' }],
      });

      if (!user || !user.isActive) {
        logger.warn(`[AUTH] User not found or inactive. UserID: ${decoded.userId}`);
        throw new UnauthorizedError('Invalid token or inactive user');
      }

      req.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        roleId: user.roleId,
        roleName: (user as any).role.name,
        isTestingMode: (user as any).role.name === 'TESTING',
      };

      const isWriteMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
      if (req.user.isTestingMode && isWriteMethod) {
        _res.status(200).json({
          success: true,
          message: 'MODE TESTING: aksi disimulasikan. Data produksi tidak diubah.',
          data: {
            simulated: true,
            method: req.method,
            path: req.originalUrl,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      return next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        logger.warn(`[AUTH] Invalid token: ${error.message}. Token start: ${token.substring(0, 10)}...`);
        return next(new UnauthorizedError('Invalid token'));
      } else if (error instanceof jwt.TokenExpiredError) {
        logger.warn(`[AUTH] Token expired`);
        return next(new UnauthorizedError('Token expired'));
      } else {
        logger.error(`[AUTH] Verification error: ${error instanceof Error ? error.message : String(error)}`);
        return next(error);
      }
    }
  } catch (error) {
    return next(error);
  }
}
