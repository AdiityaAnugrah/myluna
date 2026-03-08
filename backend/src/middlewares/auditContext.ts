import { Request, Response, NextFunction } from 'express';

export function auditContext(req: Request, _res: Response, next: NextFunction) {
  if (req.user) {
    req.auditContext = {
      userId: req.user.id,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    };
  }
  next();
}
