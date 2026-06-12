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
// GET /api/drains
router.get('/', async (req, res) => {
    try {
        const { wardId, status } = req.query;
        const where = {};
        if (wardId)
            where.wardId = wardId;
        if (status)
            where.status = status;
        const sensors = await prisma_1.prisma.drainSensor.findMany({
            where,
            include: {
                ward: { select: { name: true, wardNumber: true } },
                _count: { select: { readings: true } },
            },
            orderBy: [
                { status: 'asc' }, // OFFLINE last
                { currentLevelCm: 'desc' },
            ],
        });
        res.json(sensors);
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// GET /api/drains/alerts
router.get('/alerts', async (_req, res) => {
    try {
        res.json(await (0, sensor_service_1.getDrainAlerts)());
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// GET /api/drains/:id
router.get('/:id', async (req, res) => {
    try {
        const sensor = await prisma_1.prisma.drainSensor.findUnique({
            where: { id: req.params.id },
            include: { ward: { select: { name: true, wardNumber: true } } },
        });
        if (!sensor)
            return (0, response_1.notFound)(res, 'Sensor not found');
        res.json(sensor);
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// GET /api/drains/:id/history?hours=72
router.get('/:id/history', async (req, res) => {
    try {
        const hours = Math.min(168, Math.max(1, parseInt(String(req.query.hours ?? '72'))));
        const since = new Date(Date.now() - hours * 3600 * 1000);
        const readings = await prisma_1.prisma.drainReading.findMany({
            where: { sensorId: req.params.id, recordedAt: { gte: since } },
            orderBy: { recordedAt: 'asc' },
            select: { levelCm: true, rainfallMm: true, status: true, recordedAt: true },
        });
        // Downsample to max 200 points for chart performance
        const step = Math.max(1, Math.floor(readings.length / 200));
        const sampled = readings.filter((_, i) => i % step === 0);
        res.json(sampled.map((r) => ({
            levelCm: r.levelCm,
            rainfallMm: r.rainfallMm,
            status: r.status,
            hour: new Date(r.recordedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            timestamp: r.recordedAt,
        })));
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
exports.default = router;
//# sourceMappingURL=drains.js.map