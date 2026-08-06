import { describe, it, expect } from '@jest/globals';
import { AppError } from '../../../src/shared/errors/AppError';

describe('AppError', () => {
  it('creates error with correct properties', () => {
    const err = new AppError(400, 'BAD_REQUEST', 'Test error');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BAD_REQUEST');
    expect(err.message).toBe('Test error');
    expect(err.isOperational).toBe(true);
  });

  it('static helpers return correct status codes', () => {
    expect(AppError.unauthorized().statusCode).toBe(401);
    expect(AppError.forbidden().statusCode).toBe(403);
    expect(AppError.notFound('User').statusCode).toBe(404);
    expect(AppError.conflict('Conflict').statusCode).toBe(409);
    expect(AppError.internal().statusCode).toBe(500);
  });

  it('is an instance of Error', () => {
    const err = AppError.badRequest('bad input');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });
});
