"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireMinRole = exports.requireRole = void 0;
const ROLE_HIERARCHY = {
    CITIZEN: 1,
    FIELD_WORKER: 2,
    DEPT_HEAD: 3,
    MUNICIPAL_OFFICER: 4,
    CHAIRMAN: 5,
    SUPER_ADMIN: 6,
};
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: "Insufficient permissions",
                required: roles,
                current: req.user.role,
            });
        }
        next();
    };
}
exports.requireRole = requireRole;
function requireMinRole(minRole) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }
        const userLevel = ROLE_HIERARCHY[req.user.role] ?? 0;
        const minLevel = ROLE_HIERARCHY[minRole];
        if (userLevel < minLevel) {
            return res.status(403).json({
                error: "Insufficient permissions",
                required: `>= ${minRole}`,
                current: req.user.role,
            });
        }
        next();
    };
}
exports.requireMinRole = requireMinRole;
//# sourceMappingURL=rbac.js.map