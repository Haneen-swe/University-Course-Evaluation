import bcrypt from 'bcrypt';
import { AppError } from '../../shared/errors/AppError';
import { parsePagination, buildPaginatedResult } from '../../shared/utils/pagination';
import { auditRepository } from '../audit/audit.repository';
import { usersRepository } from './users.repository';
import { CreateUserDto, UpdateUserDto, UserQueryDto } from './users.schema';

export const usersService = {
  async list(query: UserQueryDto) {
    const { skip, take, page, limit } = parsePagination(query);
    const [users, total] = await usersRepository.findMany({ ...query, skip, take });
    return buildPaginatedResult(users, total, page, limit);
  },

  async findById(id: string) {
    const user = await usersRepository.findById(id);
    if (!user) throw AppError.notFound('User');
    return user;
  },

  async create(dto: CreateUserDto, actorId: string, actorIp: string) {
    const existing = await usersRepository.findByEmail(dto.email);
    if (existing) throw AppError.conflict('A user with this email already exists.');

    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 12) : undefined;
    const user = await usersRepository.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
      departmentId: dto.departmentId,
    });

    await auditRepository.insert({
      actorId,
      action: 'USER_CREATED',
      targetType: 'User',
      targetId: user.id,
      metadata: { email: user.email, role: user.role },
      ipAddress: actorIp,
    });

    return user;
  },

  async update(id: string, dto: UpdateUserDto, actorId: string, actorIp: string) {
    await this.findById(id);
    const user = await usersRepository.update(id, dto);
    await auditRepository.insert({
      actorId,
      action: 'USER_UPDATED',
      targetType: 'User',
      targetId: id,
      metadata: { changes: dto },
      ipAddress: actorIp,
    });
    return user;
  },

  async softDelete(id: string, actorId: string, actorIp: string) {
    await this.findById(id);
    if (id === actorId) throw AppError.badRequest('You cannot delete your own account.');
    await usersRepository.softDelete(id);
    await auditRepository.insert({
      actorId,
      action: 'USER_DELETED',
      targetType: 'User',
      targetId: id,
      metadata: {},
      ipAddress: actorIp,
    });
  },
};
