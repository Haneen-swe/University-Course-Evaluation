import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.enum(['student', 'instructor', 'dept_head', 'admin']),
  departmentId: z.string().uuid().optional(),
  // Password is required for local accounts. Omitting it creates a
  // locked account with no login path (no SSO is implemented).
  password: passwordSchema,
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  role: z.enum(['student', 'instructor', 'dept_head', 'admin']).optional(),
  departmentId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const userQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  role: z.enum(['student', 'instructor', 'dept_head', 'admin']).optional(),
  departmentId: z.string().uuid().optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type UserQueryDto = z.infer<typeof userQuerySchema>;
