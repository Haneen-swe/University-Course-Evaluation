import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/env';
import { redis } from '../../config/redis';
import { emailTransporter } from '../../config/email';
import { AppError } from '../../shared/errors/AppError';
import { JwtPayload, Role } from '../../shared/types';
import { authRepository } from './auth.repository';
import { auditRepository } from '../audit/audit.repository';
import { logger } from '../../config/logger';

function generateTokenPair(user: {
  id: string;
  email: string;
  role: Role;
  departmentId?: string | null;
}) {
  const jti = crypto.randomBytes(16).toString('hex');

  const accessToken = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId ?? undefined,
      jti,
    } satisfies JwtPayload,
    env.JWT_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'] }
  );

  const refreshToken = jwt.sign(
    { sub: user.id, jti },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'] }
  );

  return { accessToken, refreshToken, jti };
}

export const authService = {
  async login(email: string, password: string, ip: string) {
    const user = await authRepository.findByEmail(email);
    if (!user || !user.isActive) {
      throw AppError.unauthorized('Invalid email or password.');
    }
    if (!user.passwordHash) {
      throw AppError.unauthorized(
        'This account uses SSO. Please log in via your institution.'
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw AppError.unauthorized('Invalid email or password.');
    }

    const { accessToken, refreshToken } = generateTokenPair(user);
    await redis.set(
      `refresh:${user.id}`,
      refreshToken,
      'EX',
      7 * 24 * 60 * 60
    );

    await auditRepository.insert({
      actorId: user.id,
      action: 'USER_LOGIN',
      targetType: 'User',
      targetId: user.id,
      metadata: { email: user.email },
      ipAddress: ip,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        departmentId: user.departmentId,
      },
    };
  },

  async logout(userId: string, jti: string, refreshToken?: string) {
    // Add access token to deny-list (15-min TTL)
    await redis.set(`jwt:deny:${jti}`, '1', 'EX', 15 * 60);
    // Revoke refresh token
    await redis.del(`refresh:${userId}`);

    await auditRepository.insert({
      actorId: userId,
      action: 'USER_LOGOUT',
      targetType: 'User',
      targetId: userId,
      metadata: {},
      ipAddress: undefined,
    });
  },

  async refreshToken(token: string) {
    if (!token) {
      throw AppError.unauthorized('No refresh token provided.');
    }

    let payload: { sub: string; jti: string };
    try {
      payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as {
        sub: string;
        jti: string;
      };
    } catch {
      throw AppError.unauthorized('Invalid or expired refresh token.');
    }

    const stored = await redis.get(`refresh:${payload.sub}`);
    if (!stored || stored !== token) {
      throw AppError.unauthorized('Refresh token has been revoked.');
    }

    const user = await authRepository.findById(payload.sub);
    if (!user || !user.isActive) {
      throw AppError.unauthorized('User account is inactive.');
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(user);
    await redis.set(
      `refresh:${user.id}`,
      newRefreshToken,
      'EX',
      7 * 24 * 60 * 60
    );

    return { accessToken, refreshToken: newRefreshToken };
  },

  async forgotPassword(email: string) {
    const user = await authRepository.findByEmail(email);
    // Silently return if user not found — prevents enumeration
    if (!user || !user.isActive) return;

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(rawToken, 10);
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await authRepository.setResetToken(user.id, hashedToken, expires);

    const resetUrl = `${env.APP_URL}/reset-password?token=${rawToken}`;

    try {
      await emailTransporter.sendMail({
        from: env.EMAIL_FROM,
        to: user.email,
        subject: 'UCES — Password Reset Request',
        html: `
          <p>Hello ${user.firstName},</p>
          <p>A password reset was requested for your account.</p>
          <p><a href="${resetUrl}">Click here to reset your password</a></p>
          <p>This link expires in 1 hour. If you did not request this, please ignore this email.</p>
        `,
      });
    } catch (err) {
      logger.error('Failed to send password reset email:', err);
    }
  },

  async resetPassword(rawToken: string, newPassword: string) {
    const users = await authRepository.findByValidResetToken();
    let matchedUser = null;

    for (const user of users) {
      if (user.passwordResetToken) {
        const isMatch = await bcrypt.compare(rawToken, user.passwordResetToken);
        if (isMatch) {
          matchedUser = user;
          break;
        }
      }
    }

    if (!matchedUser) {
      throw AppError.badRequest('Invalid or expired password reset token.');
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await authRepository.updatePassword(matchedUser.id, newHash);

    await auditRepository.insert({
      actorId: matchedUser.id,
      action: 'PASSWORD_RESET',
      targetType: 'User',
      targetId: matchedUser.id,
      metadata: {},
      ipAddress: undefined,
    });
  },
};