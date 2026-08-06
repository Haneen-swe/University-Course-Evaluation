import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';

interface AuditEntry {
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export const auditRepository = {
  insert(entry: AuditEntry) {
    return prisma.auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        metadata: entry.metadata ? (entry.metadata as object) : Prisma.DbNull,
        ipAddress: entry.ipAddress
          ? entry.ipAddress.replace(/\.\d+$/, '.0') // zero last octet
          : null,
      },
    });
  },

  findMany(filters: {
    actorId?: string;
    action?: string;
    targetType?: string;
    from?: Date;
    to?: Date;
    skip?: number;
    take?: number;
  }) {
    const where = {
      ...(filters.actorId && { actorId: filters.actorId }),
      ...(filters.action && { action: { contains: filters.action, mode: 'insensitive' as const } }),
      ...(filters.targetType && { targetType: filters.targetType }),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from && { gte: filters.from }),
              ...(filters.to && { lte: filters.to }),
            },
          }
        : {}),
    };

    return Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: filters.skip,
        take: filters.take,
        include: { actor: { select: { id: true, email: true, firstName: true, lastName: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);
  },
};
