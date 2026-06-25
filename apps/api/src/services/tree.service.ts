import { prisma } from '../utils/prisma';

export async function getTreeStats() {
  const [total, byHealth, bySpecies, byWard, carbonTotal] = await Promise.all([
    prisma.tree.count(),
    prisma.tree.groupBy({
      by: ['health_status'],
      _count: { id: true },
    }),
    prisma.tree.groupBy({
      by: ['species_name'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
    prisma.$queryRaw<Array<{ ward_name: string; tree_count: bigint; total_carbon: number; green_cover_ha: number }>>`
      SELECT
        w.name                   AS ward_name,
        COUNT(t.id)::int         AS tree_count,
        COALESCE(SUM(t.carbon_kg), 0)::float AS total_carbon,
        ROUND((COUNT(t.id) * 15.0 / 10000)::numeric, 2)::float AS green_cover_ha
      FROM wards w
      LEFT JOIN trees t ON t.ward_id = w.id
      GROUP BY w.id, w.name, w.ward_number
      ORDER BY w.ward_number
    `,
    prisma.tree.aggregate({
      _sum: { carbon_kg: true },
    }),
  ]);

  const healthMap: Record<string, number> = {};
  byHealth.forEach((b) => { healthMap[b.health_status] = b._count.id; });

  const speciesMap = bySpecies.map((b) => ({ species: b.species_name, count: b._count.id }));

  return {
    total,
    byHealth:  healthMap,
    bySpecies: speciesMap,
    byWard:    byWard.map((w) => ({
      wardName:     w.ward_name,
      treeCount:    Number(w.tree_count),
      totalCarbon:  Math.round(w.total_carbon),
      greenCoverHa: w.green_cover_ha,
    })),
    totalCarbonKg:    Math.round(carbonTotal._sum.carbon_kg ?? 0),
    totalCarbonTonnes: +((carbonTotal._sum.carbon_kg ?? 0) / 1000).toFixed(1),
  };
}
