import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../shared/errors/AppError';

type Target = 'body' | 'query' | 'params';

/**
 * Zod validation middleware factory.
 * Validates req[target] against schema and replaces it with parsed value.
 */
export function validate(schema: ZodSchema, target: Target = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[target]);
      req[target] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return next(
          new AppError(422, 'VALIDATION_ERROR', 'Request validation failed.', details)
        );
      }
      next(error);
    }
  };
}
