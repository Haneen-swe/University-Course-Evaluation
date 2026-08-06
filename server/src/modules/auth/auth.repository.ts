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

  findByValidResetToken() {
    return prisma.user.findMany({
      where: {
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
