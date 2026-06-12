"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../utils/prisma");
async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing or invalid authorization header" });
    }
    const token = authHeader.slice(7);
    try {
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: payload.id },
            select: { id: true, email: true, role: true, wardId: true, name: true, isActive: true },
        });
        if (!user || !user.isActive) {
            return res.status(401).json({ error: "User not found or inactive" });
        }
        req.user = { id: user.id, email: user.email, role: user.role, wardId: user.wardId, name: user.name };
        next();
    }
    catch {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}
exports.authenticate = authenticate;
// Optional auth — attaches user if token present, does not block
async function optionalAuth(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer "))
        return next();
    const token = authHeader.slice(7);
    try {
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = payload;
    }
    catch { /* ignore */ }
    next();
}
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth.js.map