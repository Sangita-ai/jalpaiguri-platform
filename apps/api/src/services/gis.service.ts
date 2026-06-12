import { prisma } from '../utils/prisma';

const CATEGORY_COLORS: Record<string, string> = {
  GARBAGE:             '#ef4444',
  WATER_LEAKAGE:       '#3b82f6',
  WATER_SUPPLY:        '#06b6d4',
  DRAINAGE:            '#8b5cf6',
  ROAD_DAMAGE:         '#f97316',
  STREETLIGHT_FAILURE: '#eab308',
  ILLEGAL_DUMPING:     '#ec4899',
  OTHER:               '#6b7280',
};

// ── Ward boundaries + live stats ──────────────────────────────
export async function getWardsGeoJSON() {
  // Pull ward stats to colour-code by complaint density
  const wardStats = await prisma.$queryRaw<Array<{
    ward_id: string; ward_number: number; name: string;
    population: number; area_hectares: number | null;
    open_complaints: bigint; resolved_complaints: bigint;
    total_complaints: bigint; resolution_rate: number | null;
  }>>`
    SELECT
      w.id             AS ward_id,
      w.ward_number,
      w.name,
      w.population,
      w.area_hectares,
      COUNT(c.id) FILTER (WHERE c.status NOT IN ('RESOLVED','CLOSED'))::bigint AS open_complaints,
      COUNT(c.id) FILTER (WHERE c.status IN ('RESOLVED','CLOSED'))::bigint     AS resolved_complaints,
      COUNT(c.id)::bigint                                                       AS total_complaints,
      ROUND(100.0 * COUNT(c.id) FILTER (WHERE c.status IN ('RESOLVED','CLOSED'))
        / NULLIF(COUNT(c.id),0),1)::float                                       AS resolution_rate
    FROM wards w
    LEFT JOIN complaints c ON c.ward_id = w.id
      AND c.submitted_at >= NOW() - INTERVAL '90 days'
    GROUP BY w.id, w.ward_number, w.name, w.population, w.area_hectares
    ORDER BY w.ward_number
  `;

  // Ward centroids (approximate — matches seed / frontend GeoJSON)
  const CENTERS: Record<number, [number, number]> = {
    1:[88.7050,26.5510],2:[88.7110,26.5495],3:[88.7180,26.5480],4:[88.7220,26.5460],
    5:[88.7260,26.5440],6:[88.7300,26.5420],7:[88.7340,26.5400],8:[88.7270,26.5380],
    9:[88.7210,26.5360],10:[88.7150,26.5340],11:[88.7090,26.5320],12:[88.7030,26.5300],
    13:[88.6980,26.5360],14:[88.6950,26.5400],15:[88.6990,26.5440],16:[88.7020,26.5480],
    17:[88.7120,26.5520],18:[88.7180,26.5560],19:[88.7280,26.5500],20:[88.7380,26.5460],
  };

  const WARD_POLYGONS: Record<number, number[][][]> = {
    1:[[[88.6990,26.5480],[88.7010,26.5480],[88.7040,26.5488],[88.7065,26.5495],[88.7075,26.5510],[88.7068,26.5528],[88.7050,26.5538],[88.7025,26.5535],[88.7005,26.5525],[88.6992,26.5510],[88.6990,26.5480]]],
    2:[[[88.7075,26.5480],[88.7105,26.5478],[88.7130,26.5482],[88.7148,26.5492],[88.7152,26.5508],[88.7142,26.5522],[88.7118,26.5528],[88.7095,26.5524],[88.7075,26.5512],[88.7068,26.5496],[88.7075,26.5480]]],
    3:[[[88.7148,26.5465],[88.7175,26.5462],[88.7200,26.5468],[88.7218,26.5478],[88.7220,26.5494],[88.7210,26.5505],[88.7188,26.5510],[88.7162,26.5505],[88.7148,26.5492],[88.7145,26.5476],[88.7148,26.5465]]],
    4:[[[88.7200,26.5440],[88.7232,26.5438],[88.7258,26.5445],[88.7272,26.5458],[88.7270,26.5474],[88.7255,26.5485],[88.7230,26.5488],[88.7205,26.5480],[88.7192,26.5468],[88.7192,26.5452],[88.7200,26.5440]]],
    5:[[[88.7248,26.5420],[88.7278,26.5418],[88.7302,26.5425],[88.7312,26.5438],[88.7308,26.5455],[88.7292,26.5465],[88.7265,26.5465],[88.7245,26.5455],[88.7238,26.5440],[88.7242,26.5425],[88.7248,26.5420]]],
    6:[[[88.7290,26.5400],[88.7318,26.5398],[88.7340,26.5405],[88.7350,26.5418],[88.7345,26.5435],[88.7328,26.5445],[88.7302,26.5443],[88.7285,26.5432],[88.7280,26.5416],[88.7285,26.5402],[88.7290,26.5400]]],
    7:[[[88.7325,26.5380],[88.7352,26.5378],[88.7372,26.5385],[88.7382,26.5398],[88.7378,26.5415],[88.7360,26.5425],[88.7335,26.5423],[88.7318,26.5412],[88.7315,26.5395],[88.7320,26.5382],[88.7325,26.5380]]],
    8:[[[88.7248,26.5360],[88.7278,26.5358],[88.7305,26.5365],[88.7318,26.5378],[88.7315,26.5395],[88.7298,26.5405],[88.7270,26.5405],[88.7248,26.5395],[88.7238,26.5378],[88.7240,26.5362],[88.7248,26.5360]]],
    9:[[[88.7185,26.5338],[88.7220,26.5335],[88.7252,26.5342],[88.7268,26.5358],[88.7265,26.5378],[88.7245,26.5390],[88.7212,26.5390],[88.7188,26.5378],[88.7175,26.5360],[88.7178,26.5342],[88.7185,26.5338]]],
    10:[[[88.7122,26.5318],[88.7158,26.5315],[88.7188,26.5322],[88.7202,26.5338],[88.7198,26.5358],[88.7178,26.5370],[88.7145,26.5368],[88.7120,26.5355],[88.7108,26.5338],[88.7112,26.5320],[88.7122,26.5318]]],
    11:[[[88.7065,26.5300],[88.7095,26.5298],[88.7122,26.5305],[88.7135,26.5318],[88.7130,26.5338],[88.7112,26.5348],[88.7082,26.5346],[88.7060,26.5335],[88.7050,26.5318],[88.7055,26.5302],[88.7065,26.5300]]],
    12:[[[88.7005,26.5280],[88.7032,26.5278],[88.7058,26.5285],[88.7068,26.5300],[88.7062,26.5318],[88.7042,26.5328],[88.7015,26.5325],[88.6998,26.5312],[88.6992,26.5295],[88.6998,26.5282],[88.7005,26.5280]]],
    13:[[[88.6958,26.5338],[88.6988,26.5335],[88.7015,26.5342],[88.7028,26.5358],[88.7025,26.5378],[88.7005,26.5390],[88.6975,26.5388],[88.6952,26.5375],[88.6942,26.5358],[88.6948,26.5340],[88.6958,26.5338]]],
    14:[[[88.6928,26.5380],[88.6958,26.5378],[88.6985,26.5385],[88.6998,26.5398],[88.6995,26.5418],[88.6975,26.5428],[88.6948,26.5426],[88.6928,26.5415],[88.6918,26.5398],[88.6922,26.5382],[88.6928,26.5380]]],
    15:[[[88.6968,26.5420],[88.6998,26.5418],[88.7022,26.5425],[88.7035,26.5438],[88.7030,26.5455],[88.7010,26.5465],[88.6982,26.5462],[88.6962,26.5450],[88.6952,26.5434],[88.6958,26.5422],[88.6968,26.5420]]],
    16:[[[88.6998,26.5460],[88.7028,26.5458],[88.7055,26.5465],[88.7068,26.5480],[88.7065,26.5498],[88.7045,26.5508],[88.7015,26.5506],[88.6992,26.5495],[88.6982,26.5478],[88.6988,26.5462],[88.6998,26.5460]]],
    17:[[[88.7098,26.5500],[88.7128,26.5498],[88.7152,26.5505],[88.7165,26.5518],[88.7160,26.5535],[88.7140,26.5545],[88.7112,26.5542],[88.7092,26.5530],[88.7082,26.5514],[88.7088,26.5502],[88.7098,26.5500]]],
    18:[[[88.7155,26.5538],[88.7188,26.5535],[88.7215,26.5542],[88.7228,26.5558],[88.7222,26.5575],[88.7200,26.5585],[88.7170,26.5582],[88.7148,26.5570],[88.7138,26.5552],[88.7145,26.5540],[88.7155,26.5538]]],
    19:[[[88.7258,26.5480],[88.7288,26.5478],[88.7312,26.5485],[88.7325,26.5498],[88.7320,26.5518],[88.7300,26.5528],[88.7272,26.5525],[88.7252,26.5512],[88.7242,26.5495],[88.7248,26.5482],[88.7258,26.5480]]],
    20:[[[88.7358,26.5440],[88.7388,26.5438],[88.7410,26.5445],[88.7422,26.5458],[88.7418,26.5475],[88.7398,26.5485],[88.7370,26.5482],[88.7350,26.5470],[88.7342,26.5452],[88.7348,26.5442],[88.7358,26.5440]]],
  };

  const features = wardStats.map((w) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: WARD_POLYGONS[w.ward_number] ?? [[]],
    },
    properties: {
      id:                  w.ward_id,
      wardNumber:          w.ward_number,
      name:                w.name,
      population:          w.population,
      areaHa:              w.area_hectares,
      center:              CENTERS[w.ward_number] ?? [88.7179, 26.5428],
      open_complaints:     Number(w.open_complaints),
      resolved_complaints: Number(w.resolved_complaints),
      total_complaints:    Number(w.total_complaints),
      resolution_rate:     w.resolution_rate,
    },
  }));

  return { type: 'FeatureCollection' as const, features };
}

// ── Complaint heatmap ─────────────────────────────────────────
export async function getComplaintHeatmap() {
  const rows = await prisma.$queryRaw<Array<{ lat: number; lng: number; count: bigint; category: string }>>`
    SELECT
      ROUND(location_lat::numeric, 3)::float  AS lat,
      ROUND(location_lng::numeric, 3)::float  AS lng,
      COUNT(*)::bigint                        AS count,
      MODE() WITHIN GROUP (ORDER BY category) AS category
    FROM complaints
    WHERE location_lat IS NOT NULL
      AND location_lng IS NOT NULL
      AND submitted_at >= NOW() - INTERVAL '90 days'
    GROUP BY
      ROUND(location_lat::numeric, 3),
      ROUND(location_lng::numeric, 3)
    HAVING COUNT(*) >= 1
    ORDER BY count DESC
    LIMIT 800
  `;

  const features = rows.map((r) => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [r.lng, r.lat] },
    properties: {
      count:    Number(r.count),
      category: r.category,
      weight:   Math.min(1, Number(r.count) / 10),
    },
  }));

  return { type: 'FeatureCollection' as const, features };
}

// ── Complaint points (clustered source data) ──────────────────
export async function getComplaintPoints(filters: Record<string, string> = {}) {
  const where: any = {
    locationLat: { not: null },
    locationLng: { not: null },
  };
  if (filters.status)   where.status   = filters.status;
  if (filters.category) where.category = filters.category;
  if (filters.wardId)   where.wardId   = filters.wardId;
  if (filters.from || filters.to) {
    where.submittedAt = {};
    if (filters.from) where.submittedAt.gte = new Date(filters.from);
    if (filters.to)   where.submittedAt.lte = new Date(filters.to);
  }

  const complaints = await prisma.complaint.findMany({
    where,
    select: {
      id:              true,
      complaintNumber: true,
      category:        true,
      status:          true,
      priorityScore:   true,
      locationLat:     true,
      locationLng:     true,
      description:     true,
      submittedAt:     true,
      ward:            { select: { name: true, wardNumber: true } },
    },
    orderBy: { submittedAt: 'desc' },
    take:    3000,
  });

  const features = complaints.map((c) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [c.locationLng!, c.locationLat!],
    },
    properties: {
      id:              c.id,
      complaintNumber: c.complaintNumber,
      category:        c.category,
      status:          c.status,
      priorityScore:   c.priorityScore,
      description:     c.description.slice(0, 120),
      submittedAt:     c.submittedAt.toISOString(),
      wardNumber:      c.ward.wardNumber,
      wardName:        c.ward.name,
      color:           CATEGORY_COLORS[c.category] ?? '#6b7280',
    },
  }));

  return { type: 'FeatureCollection' as const, features };
}

// ── Drain sensors ─────────────────────────────────────────────
export async function getDrainsGeoJSON() {
  const sensors = await prisma.drainSensor.findMany({
    include: { ward: { select: { name: true, wardNumber: true } } },
    orderBy: { currentLevelCm: 'desc' },
  });

  const features = sensors.map((s) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [s.locationLng, s.locationLat],
    },
    properties: {
      id:             s.id,
      sensorCode:     s.sensorCode,
      drainName:      s.drainName,
      wardName:       s.ward.name,
      wardNumber:     s.ward.wardNumber,
      currentLevelCm: s.currentLevelCm,
      capacityCm:     s.capacityCm,
      alertThreshold: s.alertThreshold,
      criticalThreshold: s.criticalThreshold,
      status:         s.status,
      fillPct:        Math.round((s.currentLevelCm / s.capacityCm) * 100),
      lastReading:    s.lastReading?.toISOString() ?? null,
    },
  }));

  return { type: 'FeatureCollection' as const, features };
}

// ── Trees ─────────────────────────────────────────────────────
export async function getTreesGeoJSON(wardId?: string) {
  const trees = await prisma.tree.findMany({
    where:  wardId ? { wardId } : {},
    select: {
      id:            true,
      treeCode:      true,
      speciesCommon: true,
      locationLat:   true,
      locationLng:   true,
      heightM:       true,
      crownDiaM:     true,
      trunkDiaCm:    true,
      healthStatus:  true,
      canopyStatus:  true,
      carbonKg:      true,
      plantedAt:     true,
      wardId:        true,
    },
    take: 5000,
    orderBy: { healthStatus: 'asc' }, // show unhealthy on top in Z-order
  });

  const features = trees.map((t) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [t.locationLng, t.locationLat],
    },
    properties: {
      id:           t.id,
      treeCode:     t.treeCode,
      species:      t.speciesCommon,
      heightM:      t.heightM,
      crownDiaM:    t.crownDiaM,
      trunkDiaCm:   t.trunkDiaCm,
      healthStatus: t.healthStatus,
      canopyStatus: t.canopyStatus,
      carbonKg:     t.carbonKg,
      plantedAt:    t.plantedAt?.toISOString().slice(0, 10) ?? null,
    },
  }));

  return { type: 'FeatureCollection' as const, features };
}

// ── Water pipes ───────────────────────────────────────────────
export async function getWaterPipesGeoJSON() {
  const pipes = await prisma.waterPipe.findMany({
    include: {
      sensors: { select: { leakProbability: true, status: true, sensorCode: true, locationLat: true, locationLng: true, pressureBar: true, flowLpm: true, estimatedLossLph: true } },
      ward:    { select: { name: true, wardNumber: true } },
    },
  });

  const pipeFeatures = pipes.map((p) => {
    const maxLeak = Math.max(0, ...p.sensors.map(s => s.leakProbability));
    return {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [p.startLng, p.startLat],
          [p.endLng,   p.endLat],
        ],
      },
      properties: {
        id:          p.id,
        pipeCode:    p.pipeCode,
        material:    p.material,
        diameterMm:  p.diameterMm,
        condition:   p.condition,
        wardName:    p.ward.name,
        wardNumber:  p.ward.wardNumber,
        maxLeakProb: maxLeak,
        hasLeak:     maxLeak > 0.5,
        lengthM:     p.lengthM,
        installYear: p.installationYear,
      },
    };
  });

  // Sensor points as separate layer data
  const sensorFeatures = pipes.flatMap(p =>
    p.sensors.map(s => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [s.locationLng, s.locationLat] },
      properties: {
        sensorCode:        s.sensorCode,
        pipeCode:          p.pipeCode,
        leakProbability:   s.leakProbability,
        status:            s.status,
        pressureBar:       s.pressureBar,
        flowLpm:           s.flowLpm,
        estimatedLossLph:  s.estimatedLossLph,
      },
    }))
  );

  return {
    pipes:   { type: 'FeatureCollection' as const, features: pipeFeatures },
    sensors: { type: 'FeatureCollection' as const, features: sensorFeatures },
  };
}
