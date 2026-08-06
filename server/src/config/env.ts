import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  APP_URL: z.string().url().default('http://localhost:3001'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.string().transform((v) => v === 'true').default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('UCES <noreply@uni.edu>'),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  ENABLE_SWAGGER: z.string().transform((v) => v !== 'false').default('true'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌  Invalid environment configuration:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
