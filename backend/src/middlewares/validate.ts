
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { BadRequestError } from '../utils/errors';

export const validate =
  (schema: AnyZodObject) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
        if (error instanceof ZodError) {
             const message = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
             return next(new BadRequestError(message));
        }
      return next(error);
    }
  };
