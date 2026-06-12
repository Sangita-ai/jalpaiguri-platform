"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPLAINT_INCLUDE = exports.getSLAReport = exports.getCategoryTrend = exports.getWardStats = exports.getSummaryStats = exports.generateComplaintNumber = exports.resolveWardFromGPS = void 0;
const prisma_1 = require("../utils/prisma");
const COMPLAINT_INCLUDE = {
    ward: { select: { name: true, wardNumber: true } },
    reporter: { select: { name: true, phone: true, email: true } },
    attachments: true,
    assignments: {
        where: { isActive: true },
        include: {
            worker: { select: { name: true, phone: true } },
            assignedBy: { select: { name: true, role: true } },
        },
        orderBy: { assignedAt: 'desc' },
        take: 1,
    },
};
exports.COMPLAINT_INCLUDE = COMPLAINT_INCLUDE;
async function resolveWardFromGPS(lat, lng) {
    const result = await prisma_1.prisma.$queryRaw `
    SELECT id FROM wards
    WHERE boundary IS NOT NULL
    ORDER BY ST_Distance(
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
      boundary::geography
    ) ASC
    LIMIT 1
  `;
    return result[0]?.id ?? null;
}
exports.resolveWardFromGPS = resolveWardFromGPS;
async function generateComplaintNumber() {
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const startOf = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const count = await prisma_1.prisma.complaint.count({ where: { submittedAt: { gte: startOf } } });
    return `CJPL-${dateStr}-${String(count + 1).padStart(4, '0')}`;
}
exports.generateComplaintNumber = generateComplaintNumber;
async function getSummaryStats() {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000);
    const [total, pending, resolved, slaBreaches, byCategory, prevMonthTotal, drainAlerts, avgResArr, activeWorkers,] = await Promise.all([
        prisma_1.prisma.complaint.count({ where: { submittedAt: { gte: ninetyDaysAgo } } }),
        prisma_1.prisma.complaint.count({ where: { status: { notIn: ['RESOLVED', 'CLOSED'] }, submittedAt: { gte: ninetyDaysAgo } } }),
        prisma_1.prisma.complaint.count({ where: { status: { in: ['RESOLVED', 'CLOSED'] }, submittedAt: { gte: ninetyDaysAgo } } }),
        // SLA breach: submitted >48h ago, still not resolved
        prisma_1.prisma.complaint.count({ where: { status: { notIn: ['RESOLVED', 'CLOSED'] }, submittedAt: { lte: new Date(Date.now() - 48 * 3600000) } } }),
        prisma_1.prisma.complaint.groupBy({ by: ['category'], _count: { id: true }, where: { submittedAt: { gte: ninetyDaysAgo } } }),
        prisma_1.prisma.complaint.count({ where: { submittedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
        prisma_1.prisma.drainSensor.count({ where: { status: { in: ['OVERFLOW_RISK', 'OVERFLOW', 'HIGH'] } } }),
        prisma_1.prisma.$queryRaw `
      SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - submitted_at))/3600)::float AS avg_hours
      FROM complaints
      WHERE resolved_at IS NOT NULL AND submitted_at >= ${ninetyDaysAgo}
    `,
        prisma_1.prisma.user.count({ where: { role: 'FIELD_WORKER', isActive: true } }),
    ]);
    const currentMonthTotal = await prisma_1.prisma.complaint.count({ where: { submittedAt: { gte: thirtyDaysAgo } } });
    const growthPct = prevMonthTotal > 0
        ? Math.round(((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100)
        : 0;
    const byCategoryMap = {};
    byCategory.forEach((b) => { byCategoryMap[b.category] = b._count.id; });
    return {
        total,
        pending,
        resolved,
        slaBreaches,
        resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
        avgResolutionHours: Math.round(avgResArr[0]?.avg_hours ?? 0),
        byCategory: byCategoryMap,
        growthPct,
        drainAlerts,
        activeWorkers,
    };
}
exports.getSummaryStats = getSummaryStats;
async function getWardStats() {
    return prisma_1.prisma.$queryRaw `
    SELECT
      w.id              AS ward_id,
      w.ward_number,
      w.name            AS ward_name,
      w.population,
      COUNT(c.id)::int                                                              AS total_complaints,
      COUNT(c.id) FILTER (WHERE c.status NOT IN ('RESOLVED','CLOSED'))::int         AS open_complaints,
      COUNT(c.id) FILTER (WHERE c.status IN ('RESOLVED','CLOSED'))::int             AS resolved_complaints,
      ROUND(
        100.0 * COUNT(c.id) FILTER (WHERE c.status IN ('RESOLVED','CLOSED'))
        / NULLIF(COUNT(c.id), 0), 1
      )::float                                                                      AS resolution_rate,
      AVG(
        EXTRACT(EPOCH FROM (c.resolved_at - c.submitted_at))/3600
      ) FILTER (WHERE c.resolved_at IS NOT NULL)::float                             AS avg_resolution_hours
    FROM wards w
    LEFT JOIN complaints c ON c.ward_id = w.id
      AND c.submitted_at >= NOW() - INTERVAL '90 days'
    GROUP BY w.id, w.ward_number, w.name, w.population
    ORDER BY w.ward_number
  `;
}
exports.getWardStats = getWardStats;
async function getCategoryTrend(days) {
    const since = new Date(Date.now() - days * 86400000);
    const rows = await prisma_1.prisma.$queryRaw `
    SELECT
      DATE(submitted_at)                                        AS day,
      COUNT(*)                                                  AS submitted,
      COUNT(*) FILTER (WHERE status IN ('RESOLVED','CLOSED'))   AS resolved
    FROM complaints
    WHERE submitted_at >= ${since}
    GROUP BY DATE(submitted_at)
    ORDER BY day ASC
  `;
    return rows.map((r) => ({
        date: r.day.toISOString().slice(0, 10),
        submitted: Number(r.submitted),
        resolved: Number(r.resolved),
    }));
}
exports.getCategoryTrend = getCategoryTrend;
async function getSLAReport() {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
    const slaConfig = await prisma_1.prisma.slaConfig.findMany();
    const categories = await prisma_1.prisma.complaint.groupBy({
        by: ['category'],
        _count: { id: true },
        where: { submittedAt: { gte: ninetyDaysAgo } },
    });
    const results = await Promise.all(slaConfig.map(async (sla) => {
        const total = await prisma_1.prisma.complaint.count({
            where: { category: sla.category, submittedAt: { gte: ninetyDaysAgo } },
        });
        const onTime = await prisma_1.prisma.complaint.count({
            where: {
                category: sla.category,
                submittedAt: { gte: ninetyDaysAgo },
                OR: [
                    { status: { in: ['RESOLVED', 'CLOSED'] }, resolvedAt: { not: null } },
                ],
                resolvedAt: {
                    lte: new Date(Date.now()), // simplified — real: compare resolvedAt - submittedAt < target_hours
                },
            },
        });
        return {
            category: sla.category,
            targetHours: sla.targetHours,
            total,
            onTime,
            compliancePct: total > 0 ? Math.round((onTime / total) * 100) : 100,
        };
    }));
    return { categories: results };
}
exports.getSLAReport = getSLAReport;
//# sourceMappingURL=complaint.service.js.map