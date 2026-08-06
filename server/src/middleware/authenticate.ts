import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { redis } from '../config/redis';
import { AppError } from '../shared/errors/AppError';
import { JwtPayload } from '../shared/types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        departmentId?: string;
        jti: string;
      };
    }
  }
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw AppError.unauthorized('No token provided.');
    }

    const token = authHeader.slice(7);
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Check token deny-list (for logged-out tokens)
    const isDenied = await redis.get(`jwt:deny:${payload.jti}`);
    if (isDenied) {
      throw AppError.unauthorized('Token has been revoked.');
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      departmentId: payload.departmentId,
      jti: payload.jti,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    if (error instanceof jwt.TokenExpiredError) {
      return next(AppError.unauthorized('Token has expired.'));
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(AppError.unauthorized('Invalid token.'));
    }
    next(error);
  }
}
