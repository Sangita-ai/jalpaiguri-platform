"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSensorBroadcast = void 0;
const prisma_1 = require("../utils/prisma");
const sensor_service_1 = require("../services/sensor.service");
function initSensorBroadcast(io) {
    io.on('connection', (socket) => {
        console.log(`[WS] Client connected: ${socket.id}`);
        socket.on('subscribe:sensors', () => {
            socket.join('sensors');
            console.log(`[WS] ${socket.id} subscribed to sensor feed`);
        });
        socket.on('subscribe:complaints', () => {
            socket.join('complaints');
        });
        socket.on('disconnect', () => {
            console.log(`[WS] Client disconnected: ${socket.id}`);
        });
    });
    // Broadcast sensor updates every 30 seconds
    setInterval(async () => {
        try {
            await (0, sensor_service_1.updateSimulatedSensors)();
            // Fetch updated drain alerts
            const drainAlerts = await prisma_1.prisma.drainSensor.findMany({
                where: { status: { in: ['HIGH', 'OVERFLOW_RISK', 'OVERFLOW'] } },
                include: { ward: { select: { name: true, wardNumber: true } } },
                orderBy: { currentLevelCm: 'desc' },
                take: 10,
            });
            // Fetch water leak alerts
            const waterAlerts = await prisma_1.prisma.waterSensor.findMany({
                where: { status: { in: ['LEAK_CONFIRMED', 'LEAK_SUSPECTED'] } },
                include: { pipe: { include: { ward: { select: { name: true } } } } },
                take: 10,
            });
            // All sensor summary
            const [drainSummary, waterSummary] = await Promise.all([
                prisma_1.prisma.drainSensor.groupBy({ by: ['status'], _count: { id: true } }),
                prisma_1.prisma.waterSensor.groupBy({ by: ['status'], _count: { id: true } }),
            ]);
            io.to('sensors').emit('sensor:update', {
                timestamp: new Date().toISOString(),
                drainAlerts,
                waterAlerts,
                drainSummary: Object.fromEntries(drainSummary.map(d => [d.status, d._count.id])),
                waterSummary: Object.fromEntries(waterSummary.map(w => [w.status, w._count.id])),
            });
        }
        catch (err) {
            console.error('[WS] Sensor broadcast error:', err);
        }
    }, 30000);
    // Broadcast complaint updates in real time (called by complaint route)
    global.broadcastComplaintUpdate = (complaint) => {
        io.to('complaints').emit('complaint:update', complaint);
    };
    console.log('[WS] Sensor broadcast initialized — 30s interval');
}
exports.initSensorBroadcast = initSensorBroadcast;
//# sourceMappingURL=sensor.broadcast.js.map