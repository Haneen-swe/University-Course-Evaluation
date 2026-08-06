import { describe, it, expect } from '@jest/globals';
import { parsePagination, buildPaginatedResult } from '../../src/shared/utils/pagination';

describe('pagination utils', () => {
  describe('parsePagination()', () => {
    it('returns defaults when no params given', () => {
      const result = parsePagination({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
    });

    it('caps limit at 100', () => {
      const result = parsePagination({ limit: 999 });
      expect(result.limit).toBe(100);
    });

    it('computes correct skip for page 3, limit 10', () => {
      const result = parsePagination({ page: 3, limit: 10 });
      expect(result.skip).toBe(20);
      expect(result.take).toBe(10);
    });
  });

  describe('buildPaginatedResult()', () => {
    it('calculates totalPages correctly', () => {
      const result = buildPaginatedResult(['a', 'b', 'c'], 23, 1, 10);
      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.total).toBe(23);
      expect(result.data).toHaveLength(3);
    });
  });
});
