import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { authRouter } from './modules/auth/auth.router';
import { usersRouter } from './modules/users/users.router';
import { departmentsRouter } from './modules/departments/departments.router';
import { termsRouter } from './modules/terms/terms.router';
import { coursesRouter } from './modules/courses/courses.router';
import { offeringsRouter } from './modules/offerings/offerings.router';
import { enrollmentsRouter } from './modules/enrollments/enrollments.router';
import { formsRouter } from './modules/forms/forms.router';
import { evaluationsRouter } from './modules/evaluations/evaluations.router';
import { reportsRouter } from './modules/reports/reports.router';
import { notificationsRouter } from './modules/notifications/notifications.router';
import { auditRouter } from './modules/audit/audit.router';
import { setupSwagger } from './config/swagger';
import { env } from './config/env';

export function createApp() {
  const app = express();

  // ── Security middleware ──────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
        },
      },
      hsts: {
        maxAge: 63072000,
        includeSubDomains: true,
      },
    })
  );

  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // ── General middleware ───────────────────────────────────────
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(requestLogger);

  // ── Health check ─────────────────────────────────────────────
  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── API Routes ───────────────────────────────────────────────
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/departments', departmentsRouter);
  app.use('/api/v1/terms', termsRouter);
  app.use('/api/v1/courses', coursesRouter);
  app.use('/api/v1/offerings', offeringsRouter);
  app.use('/api/v1/enrollments', enrollmentsRouter);
  app.use('/api/v1/forms', formsRouter);
  app.use('/api/v1/evaluations', evaluationsRouter);
  app.use('/api/v1/reports', reportsRouter);
  app.use('/api/v1/notifications', notificationsRouter);
  app.use('/api/v1/audit', auditRouter);

  // ── API Documentation ────────────────────────────────────────
  if (env.ENABLE_SWAGGER) {
    setupSwagger(app);
  }

  // ── Error handling (must be last) ────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
