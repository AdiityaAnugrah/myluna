import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  BusinessRuleViolationError,
} from '../utils/errors';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: err.message,
      details: err.details,
    });
  }

  if (err instanceof UnauthorizedError) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: err.message,
    });
  }

  if (err instanceof ForbiddenError) {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN',
      message: err.message,
    });
  }

  if (err instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      code: 'NOT_FOUND',
      message: err.message,
    });
  }

  if (err instanceof ConflictError) {
    return res.status(409).json({
      success: false,
      code: 'CONFLICT',
      message: err.message,
    });
  }

  if (err instanceof BusinessRuleViolationError) {
    return res.status(422).json({
      success: false,
      code: 'BUSINESS_RULE_VIOLATION',
      message: err.message,
    });
  }

  // Handle generic AppError with custom status code
  if (err instanceof AppError && err.statusCode !== 500) {
    return res.status(err.statusCode).json({
      success: false,
      code: 'ERROR',
      message: err.message,
    });
  }

  return res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
}
