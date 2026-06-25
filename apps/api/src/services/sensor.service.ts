import { prisma } from '../utils/prisma';

// Simulate sensor drift for live demo (called by WS broadcaster)
export async function updateSimulatedSensors() {
  const sensors = await prisma.drainSensor.findMany({ where: { status: { not: 'OFFLINE' } } });
  const isMonsoon = [5,6,7,8,9].includes(new Date().getMonth());

  for (const sensor of sensors) {
    const baseNoise   = (Math.random() - 0.5) * 4;           // ±2 cm drift
    const monsoonBump = isMonsoon ? Math.random() * 3 : 0;   // monsoon uplift
    const newLevel    = Math.max(0, Math.min(
      sensor.capacity_cm,
      sensor.current_level_cm + baseNoise + monsoonBump
    ));

    // const newStatus =
    //   newLevel >= sensor.criticalThreshold ? 'OVERFLOW_RISK' :
    //   newLevel >= sensor.alertThreshold    ? 'HIGH'          :
    //   newLevel >= sensor.capacityCm * 0.5  ? 'ELEVATED'      : 'NORMAL';

    await prisma.drainSensor.update({
      where: { id: sensor.id },
      data: {
        current_level_cm: +newLevel.toFixed(1),
        // status:         sensorStatus as any,
        last_reading:    new Date(),
      },
    });

    // Write time-series reading
    await prisma.drainReading.create({
      data: {
        sensor_id:   sensor.id,
        level_cm:    +newLevel.toFixed(1),
        rainfall_mm: isMonsoon && Math.random() < 0.2 ? +(Math.random() * 15).toFixed(1) : null,
        // status:     new_status as any,
        recorded_at: new Date(),
      },
    });
  }

  // Update water sensors
  const waterSensors = await prisma.waterSensor.findMany({ where: { is_active :  true } });
  for (const ws of waterSensors) {
    const pressureDrift = (Math.random() - 0.5) * 0.2;
    const flowDrift     = (Math.random() - 0.5) * 5;
    const newPressure   = Math.max(0.5, ws.pressure_bar + pressureDrift);
    const newFlow       = Math.max(0, ws.flow_lpm + flowDrift);
    // Slow walk leak probability
    const leakDrift = (Math.random() - 0.48) * 0.02; // slight upward bias for demo
    const newLeakProb = Math.max(0, Math.min(1, ws.leak_probability + leakDrift));
    const newStatus =
      newLeakProb > 0.75 ? 'LEAK_CONFIRMED' :
      newLeakProb > 0.50 ? 'LEAK_SUSPECTED' :
      newLeakProb > 0.25 ? 'ANOMALY'        : 'NORMAL';

    await prisma.waterSensor.update({
      where: { id: ws.id },
      data: {
        pressure_bar:     +newPressure.toFixed(2),
        flow_lpm:         +newFlow.toFixed(1),
        leak_probability: +newLeakProb.toFixed(3),
        // status:          newStatus as any,
        last_reading:     new Date(),
      },
    });
  }
}

export async function getDrainAlerts() {
  return prisma.drainSensor.findMany({
    where:   { status: { in: [ 'NORMAL', 'WARNING', 'CRITICAL', 'OFFLINE' ] } },
    include: { ward: { select: { name: true, name_bn : true } } },
    orderBy: { current_level_cm: 'desc' },
  });
}

export async function getWaterLeakSummary() {
  const sensors = await prisma.waterSensor.findMany({
    where:   { 
  leak_probability: {
    gt: 0.5
  } },
    include: {
      pipe: {
        include: { ward: { select: { name: true, name_bn : true } } },
      },
    },
    orderBy: { leak_probability: 'desc' },
  });

  const totalLossLph = sensors.reduce((sum, s) => sum + (s.estimated_loss_lph ?? 0), 0);
  const confirmed    = sensors.filter(s => s.leak_probability >= 0.8).length;
  const suspected    = sensors.filter(s => s.leak_probability >= 0.5 && s.leak_probability < 0.8).length;

  return { sensors, totalLossLph: Math.round(totalLossLph), confirmed, suspected };
}
