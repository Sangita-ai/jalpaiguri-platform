import { Request } from 'express';

export function getPagination(req: Request, defaultLimit = 20) {
  const page  = Math.max(1, parseInt(String(req.query.page  ?? '1')));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? String(defaultLimit)))));
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
}

export function paginatedResponse<T>(data: T[], total: number, page: number, limit: number) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}
