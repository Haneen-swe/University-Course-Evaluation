import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.enum(['student', 'instructor', 'dept_head', 'admin']),
  departmentId: z.string().uuid().optional(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain number')
    .optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
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
