"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const prisma_1 = require("../utils/prisma");
const tree_service_1 = require("../services/tree.service");
const paginate_1 = require("../utils/paginate");
const response_1 = require("../utils/response");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
const CreateTreeSchema = zod_1.z.object({
    wardId: zod_1.z.string().uuid(),
    speciesCommon: zod_1.z.string().min(1),
    speciesScientific: zod_1.z.string().optional(),
    locationLat: zod_1.z.number().min(20).max(30),
    locationLng: zod_1.z.number().min(85).max(95),
    heightM: zod_1.z.number().positive().optional(),
    crownDiaM: zod_1.z.number().positive().optional(),
    trunkDiaCm: zod_1.z.number().positive().optional(),
    healthStatus: zod_1.z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DEAD']).optional(),
    canopyStatus: zod_1.z.enum(['FULL', 'PARTIAL', 'SPARSE', 'NONE']).optional(),
    plantedAt: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
// GET /api/trees
router.get('/', (0, rbac_1.requireMinRole)('DEPT_HEAD'), async (req, res) => {
    try {
        const { page, limit, skip } = (0, paginate_1.getPagination)(req);
        const { wardId, healthStatus, species } = req.query;
        const where = {};
        if (wardId)
            where.wardId = wardId;
        if (healthStatus)
            where.healthStatus = healthStatus;
        if (species)
            where.speciesCommon = { contains: species, mode: 'insensitive' };
        const [data, total] = await Promise.all([
            prisma_1.prisma.tree.findMany({
                where,
                include: { ward: { select: { name: true, wardNumber: true } } },
                orderBy: { createdAt: 'desc' },
                skip, take: limit,
            }),
            prisma_1.prisma.tree.count({ where }),
        ]);
        res.json((0, paginate_1.paginatedResponse)(data, total, page, limit));
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// GET /api/trees/stats
router.get('/stats', (0, rbac_1.requireMinRole)('DEPT_HEAD'), async (_req, res) => {
    try {
        res.json(await (0, tree_service_1.getTreeStats)());
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// GET /api/trees/carbon
router.get('/carbon', (0, rbac_1.requireMinRole)('DEPT_HEAD'), async (_req, res) => {
    try {
        const agg = await prisma_1.prisma.tree.aggregate({ _sum: { carbonKg: true }, _count: { id: true } });
        const totalKg = agg._sum.carbonKg ?? 0;
        res.json({
            totalKg: Math.round(totalKg),
            totalTonnes: +(totalKg / 1000).toFixed(2),
            totalTrees: agg._count.id,
            co2Offset: +(totalKg * 3.67 / 1000).toFixed(2), // CO2 = C * 44/12
        });
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// GET /api/trees/:id
router.get('/:id', (0, rbac_1.requireMinRole)('DEPT_HEAD'), async (req, res) => {
    try {
        const tree = await prisma_1.prisma.tree.findUnique({
            where: { id: req.params.id },
            include: { ward: true, surveyedBy: { select: { name: true } } },
        });
        if (!tree)
            return (0, response_1.notFound)(res, 'Tree not found');
        res.json(tree);
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// POST /api/trees
router.post('/', (0, rbac_1.requireMinRole)('FIELD_WORKER'), (0, validate_1.validate)(CreateTreeSchema), async (req, res) => {
    try {
        const count = await prisma_1.prisma.tree.count();
        const treeCode = `JLP-T-${String(count + 1).padStart(5, '0')}`;
        const tree = await prisma_1.prisma.tree.create({
            data: {
                ...req.body,
                treeCode,
                surveyedById: req.user.id,
                lastSurveyed: new Date(),
            },
        });
        (0, response_1.created)(res, tree);
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// PATCH /api/trees/:id
router.patch('/:id', (0, rbac_1.requireMinRole)('FIELD_WORKER'), async (req, res) => {
    try {
        const tree = await prisma_1.prisma.tree.update({
            where: { id: req.params.id },
            data: { ...req.body, lastSurveyed: new Date(), surveyedById: req.user.id },
        });
        res.json(tree);
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
exports.default = router;
//# sourceMappingURL=trees.js.map