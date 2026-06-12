"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginatedResponse = exports.getPagination = void 0;
function getPagination(req, defaultLimit = 20) {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1')));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? String(defaultLimit)))));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}
exports.getPagination = getPagination;
function paginatedResponse(data, total, page, limit) {
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
exports.paginatedResponse = paginatedResponse;
//# sourceMappingURL=paginate.js.map