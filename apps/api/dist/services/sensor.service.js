"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWaterLeakSummary = exports.getDrainAlerts = exports.updateSimulatedSensors = void 0;
const prisma_1 = require("../utils/prisma");
// Simulate sensor drift for live demo (called by WS broadcaster)
async function updateSimulatedSensors() {
    const sensors = await prisma_1.prisma.drainSensor.findMany({ where: { status: { not: 'OFFLINE' } } });
    const isMonsoon = [5, 6, 7, 8, 9].includes(new Date().getMonth());
    for (const sensor of sensors) {
        const baseNoise = (Math.random() - 0.5) * 4; // ±2 cm drift
        const monsoonBump = isMonsoon ? Math.random() * 3 : 0; // monsoon uplift
        const newLevel = Math.max(0, Math.min(sensor.capacityCm, sensor.currentLevelCm + baseNoise + monsoonBump));
        const newStatus = newLevel >= sensor.criticalThreshold ? 'OVERFLOW_RISK' :
            newLevel >= sensor.alertThreshold ? 'HIGH' :
                newLevel >= sensor.capacityCm * 0.5 ? 'ELEVATED' : 'NORMAL';
        await prisma_1.prisma.drainSensor.update({
            where: { id: sensor.id },
            data: {
                currentLevelCm: +newLevel.toFixed(1),
                status: newStatus,
                lastReading: new Date(),
            },
        });
        // Write time-series reading
        await prisma_1.prisma.drainReading.create({
            data: {
                sensorId: sensor.id,
                levelCm: +newLevel.toFixed(1),
                rainfallMm: isMonsoon && Math.random() < 0.2 ? +(Math.random() * 15).toFixed(1) : null,
                status: newStatus,
                recordedAt: new Date(),
            },
        });
    }
    // Update water sensors
    const waterSensors = await prisma_1.prisma.waterSensor.findMany({ where: { status: { not: 'OFFLINE' } } });
    for (const ws of waterSensors) {
        const pressureDrift = (Math.random() - 0.5) * 0.2;
        const flowDrift = (Math.random() - 0.5) * 5;
        const newPressure = Math.max(0.5, ws.pressureBar + pressureDrift);
        const newFlow = Math.max(0, ws.flowLpm + flowDrift);
        // Slow walk leak probability
        const leakDrift = (Math.random() - 0.48) * 0.02; // slight upward bias for demo
        const newLeakProb = Math.max(0, Math.min(1, ws.leakProbability + leakDrift));
        const newStatus = newLeakProb > 0.75 ? 'LEAK_CONFIRMED' :
            newLeakProb > 0.50 ? 'LEAK_SUSPECTED' :
                newLeakProb > 0.25 ? 'ANOMALY' : 'NORMAL';
        await prisma_1.prisma.waterSensor.update({
            where: { id: ws.id },
            data: {
                pressureBar: +newPressure.toFixed(2),
                flowLpm: +newFlow.toFixed(1),
                leakProbability: +newLeakProb.toFixed(3),
                status: newStatus,
                lastReading: new Date(),
            },
        });
    }
}
exports.updateSimulatedSensors = updateSimulatedSensors;
async function getDrainAlerts() {
    return prisma_1.prisma.drainSensor.findMany({
        where: { status: { in: ['HIGH', 'OVERFLOW_RISK', 'OVERFLOW'] } },
        include: { ward: { select: { name: true, wardNumber: true } } },
        orderBy: { currentLevelCm: 'desc' },
    });
}
exports.getDrainAlerts = getDrainAlerts;
async function getWaterLeakSummary() {
    const sensors = await prisma_1.prisma.waterSensor.findMany({
        where: { status: { in: ['LEAK_SUSPECTED', 'LEAK_CONFIRMED', 'ANOMALY'] } },
        include: {
            pipe: {
                include: { ward: { select: { name: true, wardNumber: true } } },
            },
        },
        orderBy: { leakProbability: 'desc' },
    });
    const totalLossLph = sensors.reduce((sum, s) => sum + (s.estimatedLossLph ?? 0), 0);
    const confirmed = sensors.filter(s => s.status === 'LEAK_CONFIRMED').length;
    const suspected = sensors.filter(s => s.status === 'LEAK_SUSPECTED').length;
    return { sensors, totalLossLph: Math.round(totalLossLph), confirmed, suspected };
}
exports.getWaterLeakSummary = getWaterLeakSummary;
//# sourceMappingURL=sensor.service.js.map