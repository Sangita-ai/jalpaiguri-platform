"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLog = void 0;
const prisma_1 = require("../utils/prisma");
function auditLog(action, entityType) {
    return async (req, _res, next) => {
        // Fire-and-forget audit after route completes
        const userId = req.user?.id;
        if (!userId)
            return next();
        const entityId = req.params?.id;
        setImmediate(() => {
            prisma_1.prisma.auditLog.create({
                data: {
                    userId,
                    action,
                    entityType,
                    entityId: entityId || undefined,
                    newValues: req.body ? JSON.parse(JSON.stringify(req.body)) : undefined,
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent'] ?? undefined,
                },
            }).catch(() => { }); // non-blocking
        });
        next();
    };
}
exports.auditLog = auditLog;
//# sourceMappingURL=audit.js.map