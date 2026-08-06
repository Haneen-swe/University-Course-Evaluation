import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors/AppError';
import { Role } from '../shared/types';

/**
 * RBAC middleware factory.
 * Usage: router.get('/path', authenticate, authorize('admin', 'dept_head'), controller)
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }
    if (!allowedRoles.includes(req.user.role as Role)) {
      return next(
        AppError.forbidden(
          `Access denied. Required role(s): ${allowedRoles.join(', ')}.`
        )
      );
    }
    next();
  };
}
