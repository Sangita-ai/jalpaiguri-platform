import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {

  const wards = await prisma.ward.findMany();

  if (wards.length === 0) {
    console.log('No wards found');
    return;
  }

  // Trees
  for (const ward of wards) {
    for (let i = 0; i < 100; i++) {
      await prisma.tree.create({
        data: {
          ward_id: ward.id,
          species_name: 'Neem',
          common_name: 'Neem',
          latitude: 26.52 + Math.random() * 0.1,
          longitude: 88.72 + Math.random() * 0.1,
          height_m: 5 + Math.random() * 15,
          crown_dia_m: 2 + Math.random() * 6,
          trunk_dia_cm: 10 + Math.random() * 30,
          health_status: 'HEALTHY',
          carbon_kg: 50 + Math.random() * 300,
        },
      });
    }

    await prisma.greenCoverStat.create({
      data: {
        ward_id: ward.id,
        green_area_sqm: 50000,
        total_area_sqm: 200000,
        cover_pct: 25,
        tree_count: 100,
        carbon_total_kg: 20000,
      },
    });
  }

  // Drain Sensors
  for (let i = 0; i < 20; i++) {
    await prisma.drainSensor.create({
      data: {
        ward_id: wards[i % wards.length].id,
        sensor_code: `DRN-${i + 1}`,
        latitude: 26.52 + Math.random() * 0.1,
        longitude: 88.72 + Math.random() * 0.1,
        current_level_cm: Math.random() * 100,
        overflow_risk_pct: Math.random() * 100,
      },
    });
  }

  // Water Pipes + Sensors
  for (let i = 0; i < 20; i++) {

    const pipe = await prisma.waterPipe.create({
      data: {
        ward_id: wards[i % wards.length].id,
        pipe_code: `WP-${i + 1}`,
        material: 'PVC',
        length_m: 1000,
      },
    });

    await prisma.waterSensor.create({
      data: {
        pipe_id: pipe.id,
        sensor_code: `WS-${i + 1}`,
        latitude: 26.52 + Math.random() * 0.1,
        longitude: 88.72 + Math.random() * 0.1,
        pressure_bar: 3,
        flow_lpm: 50,
      },
    });
  }

  console.log('Seed complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());