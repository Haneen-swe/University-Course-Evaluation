import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

export const redis = new Redis(env.REDIS_URL, {
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  retryStrategy: (times) => {
    if (times > 3) {
      logger.error('Redis connection failed after 3 retries');
      return null;
    }
    return Math.min(times * 200, 2000);
  },
});

redis.on('error', (err) => {
  logger.error('Redis error:', err);
});

redis.on('connect', () => {
  logger.info('Redis connected');
});
