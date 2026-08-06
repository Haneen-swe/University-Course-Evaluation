import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { LoginDto, ForgotPasswordDto, ResetPasswordDto } from './auth.schema';
import { env } from '../../config/env';

// In production: SameSite=None + Secure so the cookie is sent on cross-origin API requests.
// In development: SameSite=Lax is sufficient (same-site or top-level navigations).
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: (env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = req.body as LoginDto;
      const { accessToken, refreshToken, user } = await authService.login(
        dto.email,
        dto.password,
        req.ip ?? 'unknown'
      );
      res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
      res.json({ success: true, data: { accessToken, user } });
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const jti = req.user!.jti;
      const userId = req.user!.id;
      const refreshToken = req.cookies?.refreshToken;
      await authService.logout(userId, jti, refreshToken);
      res.clearCookie('refreshToken');
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.refreshToken;
      const { accessToken, refreshToken: newRefreshToken } =
        await authService.refreshToken(token);
      res.cookie('refreshToken', newRefreshToken, REFRESH_COOKIE_OPTIONS);
      res.json({ success: true, data: { accessToken } });
    } catch (err) {
      next(err);
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = req.body as ForgotPasswordDto;
      await authService.forgotPassword(dto.email);
      // Always return 200 to prevent email enumeration
      res.json({
        success: true,
        data: {
          message: 'If that email address exists, a reset link has been sent.',
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = req.body as ResetPasswordDto;
      await authService.resetPassword(dto.token, dto.newPassword);
      res.json({
        success: true,
        data: { message: 'Password updated successfully. Please log in.' },
      });
    } catch (err) {
      next(err);
    }
  },
};
