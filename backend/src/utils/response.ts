import { Response } from 'express';

export function successResponse(
  res: Response,
  data: any,
  message: string = 'Success',
  statusCode: number = 200,
  meta?: any
) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(meta && { meta }),
  });
}

export function errorResponse(
  res: Response,
  code: string,
  message: string,
  statusCode: number = 500,
  details?: any
) {
  return res.status(statusCode).json({
    success: false,
    code,
    message,
    ...(details && { details }),
  });
}
