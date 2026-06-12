"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../utils/prisma");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const response_1 = require("../utils/response");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
const ACCESS_EXPIRY = '8h';
const REFRESH_EXPIRY = '7d';
function signTokens(user) {
    const payload = { id: user.id, email: user.email, role: user.role, wardId: user.wardId, name: user.name };
    return {
        accessToken: jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRY }),
        refreshToken: jsonwebtoken_1.default.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY }),
    };
}
const LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
// POST /api/auth/login
router.post('/login', (0, validate_1.validate)(LoginSchema), async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma_1.prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            select: { id: true, email: true, passwordHash: true, role: true, wardId: true, name: true, isActive: true },
        });
        if (!user)
            return res.status(401).json({ error: 'Invalid credentials' });
        if (!user.isActive)
            return res.status(401).json({ error: 'Account inactive. Contact administrator.' });
        const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!valid)
            return res.status(401).json({ error: 'Invalid credentials' });
        await prisma_1.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        const { accessToken, refreshToken } = signTokens(user);
        res.json({
            accessToken,
            refreshToken,
            user: { id: user.id, email: user.email, role: user.role, wardId: user.wardId, name: user.name },
        });
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken)
        return (0, response_1.badRequest)(res, 'Refresh token required');
    try {
        const payload = jsonwebtoken_1.default.verify(refreshToken, JWT_REFRESH_SECRET);
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: payload.id },
            select: { id: true, email: true, role: true, wardId: true, name: true, isActive: true },
        });
        if (!user || !user.isActive)
            return res.status(401).json({ error: 'User not found' });
        const tokens = signTokens(user);
        res.json(tokens);
    }
    catch {
        res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
});
// POST /api/auth/logout
router.post('/logout', auth_1.authenticate, (_req, res) => {
    // Stateless JWT — client removes tokens. Add blocklist here for stricter security.
    res.json({ message: 'Logged out successfully' });
});
// GET /api/auth/me
router.get('/me', auth_1.authenticate, async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true, email: true, name: true, phone: true,
                role: true, wardId: true, avatarUrl: true, lastLoginAt: true,
                ward: { select: { name: true, wardNumber: true } },
            },
        });
        res.json(user);
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// PATCH /api/auth/change-password
router.patch('/change-password', auth_1.authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword)
            return (0, response_1.badRequest)(res, 'Both passwords required');
        if (newPassword.length < 8)
            return (0, response_1.badRequest)(res, 'New password must be at least 8 characters');
        const user = await prisma_1.prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const valid = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
        if (!valid)
            return res.status(401).json({ error: 'Current password incorrect' });
        const hash = await bcryptjs_1.default.hash(newPassword, 10);
        await prisma_1.prisma.user.update({ where: { id: req.user.id }, data: { passwordHash: hash } });
        res.json({ message: 'Password changed successfully' });
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map