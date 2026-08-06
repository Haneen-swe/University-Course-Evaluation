import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { authLimiter, passwordResetLimiter } from '../../middleware/rateLimiter';
import {
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schema';

export const authRouter = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       200:
 *         description: Login successful; access token returned; refresh token set as httpOnly cookie
 *       401:
 *         description: Invalid credentials
 */
authRouter.post('/login', authLimiter, validate(loginSchema), authController.login);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout and revoke tokens
 *     responses:
 *       204: { description: Logged out }
 */
authRouter.post('/logout', authenticate, authController.logout);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token using httpOnly refresh token cookie
 *     security: []
 *     responses:
 *       200: { description: New access token issued }
 *       401: { description: Invalid or expired refresh token }
 */
authRouter.post('/refresh', authController.refreshToken);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset link
 *     security: []
 */
authRouter.post(
  '/forgot-password',
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using token from email
 *     security: []
 */
authRouter.post(
  '/reset-password',
  validate(resetPasswordSchema),
  authController.resetPassword
);
