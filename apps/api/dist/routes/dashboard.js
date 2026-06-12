"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const complaint_service_1 = require("../services/complaint.service");
const response_1 = require("../utils/response");
const prisma_1 = require("../utils/prisma");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, rbac_1.requireMinRole)('DEPT_HEAD'));
// GET /api/dashboard/summary
router.get('/summary', async (_req, res) => {
    try {
        res.json(await (0, complaint_service_1.getSummaryStats)());
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// GET /api/dashboard/ward-stats
router.get('/ward-stats', async (_req, res) => {
    try {
        res.json(await (0, complaint_service_1.getWardStats)());
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// GET /api/dashboard/category-trend?days=30
router.get('/category-trend', async (req, res) => {
    try {
        const days = Math.min(90, Math.max(7, parseInt(String(req.query.days ?? '30'))));
        res.json(await (0, complaint_service_1.getCategoryTrend)(days));
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// GET /api/dashboard/sla-report
router.get('/sla-report', async (_req, res) => {
    try {
        res.json(await (0, complaint_service_1.getSLAReport)());
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// GET /api/dashboard/workers
router.get('/workers', async (_req, res) => {
    try {
        const [workers, openTasks, completedToday] = await Promise.all([
            prisma_1.prisma.user.count({ where: { role: 'FIELD_WORKER', isActive: true } }),
            prisma_1.prisma.assignment.count({ where: { isActive: true, completedAt: null } }),
            prisma_1.prisma.assignment.count({
                where: {
                    completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
                },
            }),
        ]);
        res.json({ active: workers, openTasks, completedToday });
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
exports.default = router;
//# sourceMappingURL=dashboard.js.map