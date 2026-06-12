import { Request } from 'express';
export declare function getPagination(req: Request, defaultLimit?: number): {
    page: number;
    limit: number;
    skip: number;
};
export declare function paginatedResponse<T>(data: T[], total: number, page: number, limit: number): {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
};
//# sourceMappingURL=paginate.d.ts.map