// Global test setup — runs once before all tests
export default async function globalSetup() {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
  process.env.JWT_SECRET = 'test_jwt_secret_not_for_production_use_32chars';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_not_for_production_32c';
  process.env.LOG_LEVEL = 'error'; // suppress logs during tests
}
