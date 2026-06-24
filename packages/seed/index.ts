// packages/seed/index.ts
// Run: npx ts-node packages/seed/index.ts

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { WARDS, JALPAIGURI_CENTER, wardPolygon } from "./wards.seed";
import { DEMO_USERS, DEFAULT_PASSWORD_HASH } from "./users.seed";

const prisma = new PrismaClient();

// ─── helpers ────────────────────────────────────────────────

const rnd = (min: number, max: number) => min + Math.random() * (max - min);
const rndInt = (min: number, max: number) => Math.floor(rnd(min, max + 1));
const pick = <T>(arr: T[]): T => arr[rndInt(0, arr.length - 1)];
const weightedPick = <T>(items: T[], weights: number[]): T => {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
};

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

function jitterCoord(lat: number, lng: number, radiusDeg = 0.006) {
  const angle = Math.random() * 2 * Math.PI;
  const r = Math.random() * radiusDeg;
  return {
    lat: +(lat + Math.sin(angle) * r).toFixed(6),
    lng: +(lng + Math.cos(angle) * r).toFixed(6),
  };
}

// ─── constants ──────────────────────────────────────────────

const COMPLAINT_CATEGORIES = [
  "GARBAGE", "WATER_LEAKAGE", "WATER_SUPPLY", "DRAINAGE",
  "ROAD_DAMAGE", "STREETLIGHT_FAILURE", "ILLEGAL_DUMPING", "OTHER",
] as const;

const CATEGORY_WEIGHTS = [32, 14, 8, 13, 18, 7, 5, 3];

const COMPLAINT_STATUSES = ["SUBMITTED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
const STATUS_WEIGHTS_RECENT = [30, 20, 25, 20, 5];
const STATUS_WEIGHTS_OLD    = [5,  5,  10, 50, 30];

const COMPLAINT_DESCRIPTIONS: Record<string, string[]> = {
  GARBAGE: [
    "Garbage heap not cleared for over a week near the main road. Foul smell affecting residents.",
    "Municipal dustbin overflowing on Ward Road. Garbage spilling on the footpath.",
    "Uncollected solid waste near the market area causing health hazard.",
    "Large pile of construction debris and domestic waste dumped illegally near the drain.",
    "Garbage vehicle has not visited our lane in 10 days. Urgent attention needed.",
  ],
  WATER_LEAKAGE: [
    "Water pipe burst near the junction. Water logging on the road causing inconvenience.",
    "Continuous water leakage from the supply main. Wastage for 3 days.",
    "Pipe fitting broken near house number 12. Water flooding the lane.",
    "Old pipeline leaking at multiple joints near the market. Roads waterlogged.",
    "Submersible pump leaking at the connection point. Need immediate repair.",
  ],
  WATER_SUPPLY: [
    "No water supply since yesterday morning. Residents facing acute shortage.",
    "Water pressure very low. Cannot fill tanks even after 4 hours of supply time.",
    "Muddy and discoloured water coming through taps. Not safe for drinking.",
    "Water supply timing irregular. Supply comes for only 20 minutes at odd hours.",
    "Complete water cut in the entire lane for 2 days. Urgent restoration needed.",
  ],
  DRAINAGE: [
    "Drain blocked with silt and garbage. Rainwater backing up into houses.",
    "Open drain near the school overflowing. Health hazard for children.",
    "Drain cover missing. Safety risk for pedestrians especially at night.",
    "Drain not cleaned for months. Mosquito breeding and foul smell.",
    "Drain pipe blocked near the junction causing flooding during light rain.",
  ],
  ROAD_DAMAGE: [
    "Large pothole on the main road causing accidents. Two-wheelers at risk.",
    "Road surface completely damaged after pipe work. Not repaired for 2 months.",
    "Speed breaker broken and protruding dangerously. Needs urgent attention.",
    "Road cave-in near house number 45. Deep hole poses risk to vehicles.",
    "Road markings faded. No visibility at night causing frequent accidents.",
  ],
  STREETLIGHT_FAILURE: [
    "Five consecutive street lights not working on the main road. Complete darkness at night.",
    "Street light post leaning dangerously after the storm. Needs urgent repair.",
    "Street light on since morning. Wasting electricity. Please fix the sensor.",
    "Entire stretch of 300 metres without lighting. Residents afraid to walk at night.",
    "Street light flickering continuously. Nearby transformer may be faulty.",
  ],
  ILLEGAL_DUMPING: [
    "Unknown persons dumping construction waste on the vacant government plot.",
    "Chemical waste being dumped illegally near the water body. Environmental hazard.",
    "Slaughterhouse waste dumped on the roadside overnight. Urgent removal needed.",
    "Medical waste found dumped near the park. Serious health risk.",
    "Large scale illegal dumping of plastic waste. Please take legal action.",
  ],
  OTHER: [
    "Stray dog menace increasing near the park. Biting incidents reported.",
    "Unauthorized encroachment on the footpath blocking pedestrian movement.",
    "Noise pollution from nearby construction work beyond permitted hours.",
    "Tree branch fallen on the road. Blocking traffic movement.",
    "Public toilet in dilapidated condition. Needs urgent repair and cleaning.",
  ],
};

const WB_TREE_SPECIES = [
  { common: "Mango",        scientific: "Mangifera indica" },
  { common: "Jackfruit",    scientific: "Artocarpus heterophyllus" },
  { common: "Banyan",       scientific: "Ficus benghalensis" },
  { common: "Peepal",       scientific: "Ficus religiosa" },
  { common: "Gulmohar",     scientific: "Delonix regia" },
  { common: "Neem",         scientific: "Azadirachta indica" },
  { common: "Krishnachura", scientific: "Delonix regia" },
  { common: "Shisum",       scientific: "Dalbergia sissoo" },
  { common: "Rain Tree",    scientific: "Samanea saman" },
  { common: "Arjun",        scientific: "Terminalia arjuna" },
  { common: "Bamboo",       scientific: "Bambusa vulgaris" },
  { common: "Coconut",      scientific: "Cocos nucifera" },
  { common: "Eucalyptus",   scientific: "Eucalyptus globulus" },
  { common: "Teak",         scientific: "Tectona grandis" },
  { common: "Ashok",        scientific: "Saraca asoca" },
];

const SPECIES_WEIGHTS = [18, 12, 8, 7, 9, 10, 6, 5, 4, 4, 5, 5, 3, 2, 2];

const DRAIN_NAMES = [
  "Karala Drain", "Daldali Drain", "Town Drain North", "Town Drain South",
  "Railway Drain", "Market Drain", "Hospital Drain", "School Road Drain",
  "Rajbari Nullah", "Station Road Drain", "Netaji Sarani Drain",
  "Ananda Para Drain", "Dinbazar Outfall", "Kotwali Drain",
  "South Ward Drain", "East Bypass Drain", "Industrial Drain",
  "Paschim Para Nullah", "Purba Ward Drain", "Central Town Drain",
];

// ─── main seed ──────────────────────────────────────────────

async function main() {
  console.log("🌱 Starting seed for Jalpaiguri Municipality Platform...\n");

  // 1. Wards
  console.log("📍 Seeding 20 wards...");
  const wardMap: Record<number, string> = {};

  for (const w of WARDS) {
    const poly = wardPolygon(w.lat, w.lng);
    const wktRing = poly.map(([x, y]) => `${x} ${y}`).join(", ");
    const ward = await prisma.ward.create({
      data: {
        wardNumber: w.wardNumber,
        name: w.name,
        population: w.population,
        areaHectares: rnd(12, 45),
        boundaryWkt: `POLYGON((${wktRing}))`,
      },
    });
    wardMap[w.wardNumber] = ward.id;
  }
  console.log("   ✓ 20 wards created");

  // 2. Users
  console.log("👥 Seeding users...");
  const userMap: Record<string, string> = {};
  const workerIds: string[] = [];
  const citizenIds: string[] = [];

  for (const u of DEMO_USERS) {
    const wardId = u.wardNumber ? wardMap[u.wardNumber] : undefined;
    const user = await prisma.user.create({
      data: {
        email: u.email,
        passwordHash: DEFAULT_PASSWORD_HASH,
        name: u.name,
        phone: u.phone,
        role: u.role as any,
        wardId: wardId ?? null,
      },
    });
    userMap[u.email] = user.id;
    if (u.role === "FIELD_WORKER") workerIds.push(user.id);
    if (u.role === "CITIZEN") citizenIds.push(user.id);
  }

  // Assign officers to wards
  for (const u of DEMO_USERS) {
    if (u.role === "MUNICIPAL_OFFICER" && u.wardNumber) {
      await prisma.ward.update({
        where: { id: wardMap[u.wardNumber] },
        data: { officerId: userMap[u.email] },
      });
    }
  }

  const officerIds = DEMO_USERS
    .filter(u => u.role === "MUNICIPAL_OFFICER" || u.role === "DEPT_HEAD")
    .map(u => userMap[u.email]);

  console.log(`   ✓ ${DEMO_USERS.length} users created`);

  // 3. Complaints (500)
  console.log("📋 Seeding 500 complaints...");
  const wardIds = Object.values(wardMap);
  const wardPopulations = WARDS.map(w => w.population);
  const totalPop = wardPopulations.reduce((a, b) => a + b, 0);

  for (let i = 0; i < 500; i++) {
    const daysBack = i < 100 ? rndInt(0, 7)
                   : i < 250 ? rndInt(0, 30)
                   : rndInt(0, 90);
    const wardIdx = weightedPick(
      Array.from({ length: 20 }, (_, i) => i),
      wardPopulations
    );
    const ward = WARDS[wardIdx];
    const wardId = wardMap[ward.wardNumber];
    const category = weightedPick(COMPLAINT_CATEGORIES as unknown as string[], CATEGORY_WEIGHTS) as typeof COMPLAINT_CATEGORIES[number];
    const isRecent = daysBack <= 30;
    const status = weightedPick(
      COMPLAINT_STATUSES as unknown as string[],
      isRecent ? STATUS_WEIGHTS_RECENT : STATUS_WEIGHTS_OLD
    ) as typeof COMPLAINT_STATUSES[number];
    const description = pick(COMPLAINT_DESCRIPTIONS[category]);
    const { lat, lng } = jitterCoord(ward.lat, ward.lng);
    const reporterId = pick([...citizenIds, pick(workerIds)]);
    const submittedAt = daysAgo(daysBack);
    submittedAt.setHours(rndInt(6, 22), rndInt(0, 59));
    const resolvedAt = (status === "RESOLVED" || status === "CLOSED")
      ? new Date(submittedAt.getTime() + rndInt(4, 120) * 3600 * 1000)
      : null;

    const priorityScore = category === "WATER_LEAKAGE" ? rndInt(70, 95)
      : category === "DRAINAGE" ? rndInt(60, 85)
      : category === "ROAD_DAMAGE" ? rndInt(55, 80)
      : rndInt(30, 70);

    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
    const complaintNumber = `CJPL-${dateStr}-${String(i+1).padStart(4,'0')}`;

    const complaint = await prisma.complaint.create({
      data: {
        complaintNumber,
        reporterId,
        wardId,
        category: category as any,
        status: status as any,
        priorityScore,
        description,
        locationLat: lat,
        locationLng: lng,
        address: `Ward ${ward.wardNumber}, ${ward.name}, Jalpaiguri`,
        aiCategory: category.toLowerCase(),
        aiConfidence: rnd(0.72, 0.98),
        submittedAt,
        resolvedAt,
        closedAt: status === "CLOSED" ? new Date(resolvedAt!.getTime() + rndInt(1,24)*3600000) : null,
      },
    });

    // Create assignment if not SUBMITTED
    if (status !== "SUBMITTED" && workerIds.length > 0) {
      const workerId = workerIds[wardIdx % workerIds.length];
      const officerId = pick(officerIds);
      await prisma.assignment.create({
        data: {
          complaintId: complaint.id,
          workerId,
          assignedById: officerId,
          assignedAt: new Date(submittedAt.getTime() + rndInt(1, 8) * 3600 * 1000),
          dueAt: new Date(submittedAt.getTime() + 48 * 3600 * 1000),
          completedAt: resolvedAt,
          completionNotes: resolvedAt ? `Issue resolved. Site inspected and work completed.` : null,
        },
      });
    }
  }
  console.log("   ✓ 500 complaints + assignments created");

  // 4. Trees (5000)
  console.log("🌳 Seeding 5000 trees...");
  const treeChunks: any[] = [];

  for (let i = 0; i < 5000; i++) {
    const wardIdx = rndInt(0, 19);
    const ward = WARDS[wardIdx];
    const { lat, lng } = jitterCoord(ward.lat, ward.lng, 0.009);
    const species = weightedPick(WB_TREE_SPECIES, SPECIES_WEIGHTS);
    const heightM = rnd(4, 22);
    const trunkDiaCm = rnd(8, 80);
    const crownDiaM = rnd(2, 12);
    const healthRoll = Math.random();
    const healthStatus = healthRoll < 0.45 ? "EXCELLENT"
      : healthRoll < 0.75 ? "GOOD"
      : healthRoll < 0.90 ? "FAIR"
      : healthRoll < 0.97 ? "POOR"
      : "DEAD";
    const plantedYearsAgo = rndInt(2, 40);
    const plantedAt = new Date();
    plantedAt.setFullYear(plantedAt.getFullYear() - plantedYearsAgo);

    treeChunks.push({
      treeCode: `JLP-T-${String(i + 1).padStart(5, "0")}`,
      wardId: wardMap[ward.wardNumber],
      speciesCommon: species.common,
      speciesScientific: species.scientific,
      locationLat: lat,
      locationLng: lng,
      heightM: +heightM.toFixed(1),
      crownDiaM: +crownDiaM.toFixed(1),
      trunkDiaCm: +trunkDiaCm.toFixed(1),
      healthStatus: healthStatus as any,
      canopyStatus: healthStatus === "DEAD" ? "NONE"
        : healthStatus === "POOR" ? "SPARSE"
        : healthStatus === "FAIR" ? "PARTIAL" : "FULL" as any,
      plantedAt,
      lastSurveyed: daysAgo(rndInt(30, 365)),
    });

    // batch insert every 500
    if (treeChunks.length === 500) {
      await prisma.tree.createMany({ data: treeChunks });
      process.stdout.write(".");
      treeChunks.length = 0;
    }
  }
  if (treeChunks.length > 0) await prisma.tree.createMany({ data: treeChunks });
  console.log("\n   ✓ 5000 trees created");

  // 5. Drain sensors (3 per ward = 60 total)
  console.log("🌊 Seeding drain sensors...");
  const drainSensorIds: string[] = [];

  for (let wardIdx = 0; wardIdx < 20; wardIdx++) {
    const ward = WARDS[wardIdx];
    for (let s = 0; s < 3; s++) {
      const { lat, lng } = jitterCoord(ward.lat, ward.lng, 0.006);
      const capacityCm = pick([80, 100, 120, 150]);
      const isMonsoon = new Date().getMonth() >= 5 && new Date().getMonth() <= 9;
      const baseLevel = isMonsoon ? rnd(0.3, 0.9) : rnd(0.1, 0.5);
      const levelCm = +(capacityCm * baseLevel).toFixed(1);
      const alertThreshold = +(capacityCm * 0.70).toFixed(1);
      const criticalThreshold = +(capacityCm * 0.85).toFixed(1);
      const status = levelCm >= criticalThreshold ? "CRITICAL"
        : levelCm >= alertThreshold ? "HIGH"
        : levelCm >= capacityCm * 0.5 ? "ELEVATED"
        : "NORMAL";

      const sensor = await prisma.drainSensor.create({
        data: {
          sensorCode: `DS-W${String(ward.wardNumber).padStart(2,"0")}-${String(s+1).padStart(2,"0")}`,
          wardId: wardMap[ward.wardNumber],
          locationLat: lat,
          locationLng: lng,
          drainName: `${ward.name} Drain ${s+1}`,
          capacityCm,
          currentLevelCm: levelCm,
          alertThreshold,
          criticalThreshold,
          status: status as any,
          lastReading: new Date(),
          installedAt: daysAgo(rndInt(100, 700)),
        },
      });
      drainSensorIds.push(sensor.id);

      // Seed 72h of readings (every 30 min = 144 readings per sensor)
      const readingRows: any[] = [];
      for (let h = 144; h >= 0; h--) {
        const t = new Date();
        t.setMinutes(t.getMinutes() - h * 30);
        const variation = Math.sin(h / 6) * capacityCm * 0.08;
        const rain = Math.random() < 0.15 ? rnd(0, 25) : 0;
        const lvl = Math.max(0, Math.min(capacityCm, levelCm + variation + rain * 0.3));
        const rdStatus = lvl >= criticalThreshold ? "HIGH"
          : lvl >= alertThreshold ? "ELEVATED"
          : "NORMAL";
        readingRows.push({
          sensorId: sensor.id,
          levelCm: +lvl.toFixed(1),
          rainfallMm: rain > 0 ? +rain.toFixed(1) : null,
          status: rdStatus as any,
          recordedAt: t,
        });
      }
      await prisma.drainReading.createMany({ data: readingRows });
    }
  }
  console.log(`   ✓ 60 drain sensors + 8640 readings created`);

  // 6. Water pipes (2 per ward = 40 pipes)
  console.log("💧 Seeding water pipes and sensors...");
  const pipeIds: string[] = [];

  for (let wardIdx = 0; wardIdx < 20; wardIdx++) {
    const ward = WARDS[wardIdx];
    for (let p = 0; p < 2; p++) {
      const { lat: slat, lng: slng } = jitterCoord(ward.lat, ward.lng, 0.005);
      const { lat: elat, lng: elng } = jitterCoord(ward.lat, ward.lng, 0.005);
      const materials = ["Cast Iron", "PVC", "Ductile Iron", "GI", "HDPE"];
      const installYear = rndInt(1985, 2020);
      const age = new Date().getFullYear() - installYear;
      const cond = age > 30 ? "CRITICAL" : age > 20 ? "POOR" : age > 10 ? "FAIR" : "GOOD";

      const pipe = await prisma.waterPipe.create({
        data: {
          pipeCode: `WP-W${String(ward.wardNumber).padStart(2,"0")}-${String(p+1).padStart(2,"0")}`,
          wardId: wardMap[ward.wardNumber],
          startLat: slat, startLng: slng,
          endLat: elat, endLng: elng,
          diameterMm: pick([100, 150, 200, 250, 300]),
          material: pick(materials),
          installationYear: installYear,
          pressureBarNominal: rnd(2.5, 5.0),
          condition: cond as any,
          lengthM: rnd(150, 800),
        },
      });
      pipeIds.push(pipe.id);

      // 1-2 sensors per pipe
      const numSensors = p === 0 ? 2 : 1;
      for (let sIdx = 0; sIdx < numSensors; sIdx++) {
        const { lat, lng } = jitterCoord((slat + elat) / 2, (slng + elng) / 2, 0.002);
        const isLeaking = (cond === "CRITICAL" && Math.random() < 0.7)
          || (cond === "POOR" && Math.random() < 0.35)
          || Math.random() < 0.08;
        const leakProb = isLeaking ? rnd(0.55, 0.97) : rnd(0, 0.3);
        const sensorStatus = leakProb > 0.75 ? "LEAK_CONFIRMED"
          : leakProb > 0.50 ? "LEAK_SUSPECTED"
          : leakProb > 0.25 ? "ANOMALY"
          : "NORMAL";

        await prisma.waterSensor.create({
          data: {
            sensorCode: `WS-W${String(ward.wardNumber).padStart(2,"0")}-P${p+1}-${sIdx+1}`,
            pipeId: pipe.id,
            locationLat: lat,
            locationLng: lng,
            pressureBar: rnd(1.8, 5.2),
            flowLpm: rnd(20, 120),
            leakProbability: +leakProb.toFixed(3),
            estimatedLossLph: isLeaking ? rnd(50, 800) : null,
            status: sensorStatus as any,
            lastReading: new Date(),
          },
        });
      }
    }
  }
  console.log(`   ✓ 40 water pipes + sensors created`);

  // Summary
  const counts = await Promise.all([
    prisma.ward.count(),
    prisma.user.count(),
    prisma.complaint.count(),
    prisma.tree.count(),
    prisma.drainSensor.count(),
    prisma.drainReading.count(),
    prisma.waterPipe.count(),
    prisma.waterSensor.count(),
  ]);

  console.log("\n✅ Seed complete!\n");
  console.log("─────────────────────────────────");
  console.log(`  Wards:           ${counts[0]}`);
  console.log(`  Users:           ${counts[1]}`);
  console.log(`  Complaints:      ${counts[2]}`);
  console.log(`  Trees:           ${counts[3]}`);
  console.log(`  Drain sensors:   ${counts[4]}`);
  console.log(`  Drain readings:  ${counts[5]}`);
  console.log(`  Water pipes:     ${counts[6]}`);
  console.log(`  Water sensors:   ${counts[7]}`);
  console.log("─────────────────────────────────");
  console.log("\n🔑 Demo credentials (all passwords: Demo@1234)");
  console.log("  Super Admin:  admin@jalpaigurimunicipality.gov.in");
  console.log("  Chairman:     chairman@jalpaigurimunicipality.gov.in");
  console.log("  Officer:      officer.north@jalpaigurimunicipality.gov.in");
  console.log("  Field Worker: worker.01@jalpaiguri.gov.in");
  console.log("  Citizen:      citizen.demo1@example.com");
}

main()
  .catch(e => { console.error(e); (process as any).exit(1); })
  .finally(() => prisma.$disconnect());
