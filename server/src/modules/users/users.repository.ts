import { prisma } from '../../config/database';

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  departmentId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

export const usersRepository = {
  findMany(filters: {
    role?: string;
    departmentId?: string;
    isActive?: boolean;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const where = {
      deletedAt: null,
      ...(filters.role && { role: filters.role as any }),
      ...(filters.departmentId && { departmentId: filters.departmentId }),
      ...(filters.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters.search && {
        OR: [
          { firstName: { contains: filters.search, mode: 'insensitive' as const } },
          { lastName: { contains: filters.search, mode: 'insensitive' as const } },
          { email: { contains: filters.search, mode: 'insensitive' as const } },
        ],
      }),
    };
    return Promise.all([
      prisma.user.findMany({ where, select: userSelect, skip: filters.skip, take: filters.take, orderBy: { createdAt: 'desc' } }),
      prisma.user.count({ where }),
    ]);
  },

  findById(id: string) {
    return prisma.user.findFirst({ where: { id, deletedAt: null }, select: userSelect });
  },

  findByEmail(email: string) {
    return prisma.user.findFirst({ where: { email, deletedAt: null }, select: { id: true } });
  },

  create(data: {
    email: string;
    passwordHash?: string;
    firstName: string;
    lastName: string;
    role: any;
    departmentId?: string;
  }) {
    return prisma.user.create({ data, select: userSelect });
  },

  update(id: string, data: { firstName?: string; lastName?: string; role?: string; departmentId?: string | null; isActive?: boolean }) {
    return prisma.user.update({ where: { id }, data: data as any, select: userSelect });
  },

  softDelete(id: string) {
    return prisma.user.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  },
};
