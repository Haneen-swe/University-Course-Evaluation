export type Role = 'student' | 'instructor' | 'dept_head' | 'admin';

export interface JwtPayload {
  sub: string;       // user UUID
  email: string;
  role: Role;
  departmentId?: string;
  jti: string;       // unique token ID (for deny-list)
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  departmentId?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  pagination?: PaginatedResult<T>['pagination'];
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
