"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTreeStats = void 0;
const prisma_1 = require("../utils/prisma");
async function getTreeStats() {
    const [total, byHealth, bySpecies, byWard, carbonTotal] = await Promise.all([
        prisma_1.prisma.tree.count(),
        prisma_1.prisma.tree.groupBy({
            by: ['healthStatus'],
            _count: { id: true },
        }),
        prisma_1.prisma.tree.groupBy({
            by: ['speciesCommon'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10,
        }),
        prisma_1.prisma.$queryRaw `
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
        prisma_1.prisma.tree.aggregate({
            _sum: { carbonKg: true },
        }),
    ]);
    const healthMap = {};
    byHealth.forEach((b) => { healthMap[b.healthStatus] = b._count.id; });
    const speciesMap = bySpecies.map((b) => ({ species: b.speciesCommon, count: b._count.id }));
    return {
        total,
        byHealth: healthMap,
        bySpecies: speciesMap,
        byWard: byWard.map((w) => ({
            wardName: w.ward_name,
            treeCount: Number(w.tree_count),
            totalCarbon: Math.round(w.total_carbon),
            greenCoverHa: w.green_cover_ha,
        })),
        totalCarbonKg: Math.round(carbonTotal._sum.carbonKg ?? 0),
        totalCarbonTonnes: +((carbonTotal._sum.carbonKg ?? 0) / 1000).toFixed(1),
    };
}
exports.getTreeStats = getTreeStats;
//# sourceMappingURL=tree.service.js.map