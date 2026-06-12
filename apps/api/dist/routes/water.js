"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const prisma_1 = require("../utils/prisma");
const sensor_service_1 = require("../services/sensor.service");
const response_1 = require("../utils/response");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, rbac_1.requireMinRole)('DEPT_HEAD'));
// GET /api/water — all water sensors with pipe info
router.get('/', async (req, res) => {
    try {
        const { status, wardId } = req.query;
        const where = {};
        if (status)
            where.status = status;
        const sensors = await prisma_1.prisma.waterSensor.findMany({
            where,
            include: {
                pipe: {
                    include: {
                        ward: { select: { name: true, wardNumber: true } },
                    },
                },
            },
            orderBy: { leakProbability: 'desc' },
        });
        // Filter by ward after join if needed
        const filtered = wardId
            ? sensors.filter((s) => s.pipe.wardId === wardId)
            : sensors;
        res.json(filtered);
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// GET /api/water/leaks — only sensors with leak probability > 0.5
router.get('/leaks', async (_req, res) => {
    try {
        res.json(await (0, sensor_service_1.getWaterLeakSummary)());
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// GET /api/water/summary
router.get('/summary', async (_req, res) => {
    try {
        const [total, leakConfirmed, leakSuspected, offline, pipes] = await Promise.all([
            prisma_1.prisma.waterSensor.count(),
            prisma_1.prisma.waterSensor.count({ where: { status: 'LEAK_CONFIRMED' } }),
            prisma_1.prisma.waterSensor.count({ where: { status: 'LEAK_SUSPECTED' } }),
            prisma_1.prisma.waterSensor.count({ where: { status: 'OFFLINE' } }),
            prisma_1.prisma.waterPipe.groupBy({ by: ['condition'], _count: { id: true } }),
        ]);
        const lossAgg = await prisma_1.prisma.waterSensor.aggregate({
            _sum: { estimatedLossLph: true },
            where: { status: { in: ['LEAK_CONFIRMED', 'LEAK_SUSPECTED'] } },
        });
        const pipeCondition = {};
        pipes.forEach((p) => { pipeCondition[p.condition] = p._count.id; });
        res.json({
            totalSensors: total,
            leakConfirmed,
            leakSuspected,
            normal: total - leakConfirmed - leakSuspected - offline,
            offline,
            estimatedDailyLossL: Math.round((lossAgg._sum.estimatedLossLph ?? 0) * 24),
            pipeCondition,
        });
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// GET /api/water/pipes
router.get('/pipes', async (_req, res) => {
    try {
        const pipes = await prisma_1.prisma.waterPipe.findMany({
            include: {
                ward: { select: { name: true, wardNumber: true } },
                sensors: { select: { leakProbability: true, status: true, pressureBar: true } },
            },
            orderBy: { condition: 'asc' },
        });
        res.json(pipes);
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
exports.default = router;
//# sourceMappingURL=water.js.map