import { PaginationQuery, PaginatedResult } from '../types';

export function parsePagination(query: PaginationQuery): {
skip: number;
take: number;
page: number;
limit: number;
} {
const page = Math.max(1, Number(query.page) || 1);
const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
return {
skip: (page - 1) * limit,
take: limit,
page,
limit,
};
}

export function buildPaginatedResult<T>(
data: T[],
total: number,
page: number,
limit: number
): PaginatedResult<T> {
return {
data,
pagination: {
page,
limit,
total,
totalPages: Math.ceil(total / limit),
},
};
}