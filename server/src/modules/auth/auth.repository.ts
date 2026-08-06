import { prisma } from '../../config/database';

export const authRepository = {
  findByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        role: true,
        departmentId: true,
        isActive: true,
      },
    });
  },

  findById(id: string) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        departmentId: true,
        isActive: true,
      },
    });
  },

  setResetToken(userId: string, hashedToken: string, expires: Date) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: expires,
      },
    });
  },

  /**
   * Find a single user whose hashed reset token matches the raw token.
   * Uses a time-safe approach: fetch all unexpired tokens, then bcrypt-compare
   * in application code. The set of unexpired tokens is always very small
   * (one per user per hour), so this is safe and avoids storing the raw token.
   */
  findByValidResetToken() {
    return prisma.user.findMany({
      where: {
        passwordResetToken: { not: null },
        passwordResetExpires: { gt: new Date() },
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        passwordResetToken: true,
      },
    });
  },

  updatePassword(userId: string, newHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });
  },
};
