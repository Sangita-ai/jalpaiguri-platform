"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const zod_1 = require("zod");
function errorHandler(err, _req, res, _next) {
    // Zod validation
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({
            error: 'Validation failed',
            details: err.errors.map(e => ({
                field: e.path.join('.'),
                message: e.message,
            })),
        });
    }
    // Generic Error
    const message = err instanceof Error
        ? err.message
        : 'Internal server error';
    const status = typeof err === 'object' &&
        err !== null &&
        'status' in err
        ? Number(err.status)
        : 500;
    if (status >= 500) {
        console.error('[Server Error]', err);
    }
    return res.status(status).json({
        error: message,
    });
}
exports.errorHandler = errorHandler;
//# sourceMappingURL=error.js.map