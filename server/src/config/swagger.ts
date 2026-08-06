import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'University Course Evaluation System API',
      version: '1.0.0',
      description:
        'RESTful API for the UCES platform. Supports student evaluations, course management, and analytics.',
    },
    servers: [{ url: `${env.APP_URL}/api/v1`, description: 'Current server' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/modules/**/*.router.ts'],
};

export function setupSwagger(app: Express) {
  const spec = swaggerJsdoc(options);
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));
  app.get('/api/docs.json', (_req, res) => res.json(spec));
}
