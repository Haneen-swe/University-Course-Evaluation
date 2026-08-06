import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';

// Mock dependencies
jest.mock('../../src/config/database', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock('../../src/config/redis', () => ({
  redis: {
    set: jest.fn(),
    del: jest.fn(),
    get: jest.fn(),
  },
}));
jest.mock('../../src/config/email', () => ({
  emailTransporter: { sendMail: jest.fn() },
}));
jest.mock('../../src/modules/audit/audit.repository', () => ({
  auditRepository: { insert: jest.fn() },
}));

import { authService } from '../../src/modules/auth/auth.service';
import { AppError } from '../../src/shared/errors/AppError';

describe('AuthService', () => {
  describe('login()', () => {
    it('throws UNAUTHENTICATED when user not found', async () => {
      const { prisma } = require('../../src/config/database');
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(authService.login('notfound@uni.edu', 'pass', '127.0.0.0')).rejects.toBeInstanceOf(AppError);
    });

    it('throws UNAUTHENTICATED when user is inactive', async () => {
      const { prisma } = require('../../src/config/database');
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: '1', email: 'a@b.com', passwordHash: '$2b$12$...',
        firstName: 'A', lastName: 'B', role: 'student', departmentId: null, isActive: false,
      });

      await expect(authService.login('a@b.com', 'pass', '127.0.0.0')).rejects.toBeInstanceOf(AppError);
    });

    it('throws UNAUTHENTICATED when password is wrong', async () => {
      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      const { prisma } = require('../../src/config/database');
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: '1', email: 'a@b.com', passwordHash: '$2b$12$someHash',
        firstName: 'A', lastName: 'B', role: 'student', departmentId: null, isActive: true,
      });

      await expect(authService.login('a@b.com', 'wrongpassword', '127.0.0.0')).rejects.toBeInstanceOf(AppError);
    });
  });

  describe('refreshToken()', () => {
    it('throws UNAUTHENTICATED when no token provided', async () => {
      await expect(authService.refreshToken('')).rejects.toBeInstanceOf(AppError);
    });
  });

  describe('forgotPassword()', () => {
    it('silently succeeds when user not found (prevents enumeration)', async () => {
      const { prisma } = require('../../src/config/database');
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      // Should not throw
      await expect(authService.forgotPassword('ghost@uni.edu')).resolves.toBeUndefined();
    });
  });
});
