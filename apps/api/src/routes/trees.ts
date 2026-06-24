import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireMinRole } from '../middleware/rbac';
import { prisma } from '../utils/prisma';
import { getTreeStats } from '../services/tree.service';
import { getPagination, paginatedResponse } from '../utils/paginate';
import { serverError, notFound, created } from '../utils/response';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authenticate);

const CreateTreeSchema = z.object({
  wardId:            z.string().uuid(),
  speciesCommon:     z.string().min(1),
  speciesScientific: z.string().optional(),
  locationLat:       z.number().min(20).max(30),
  locationLng:       z.number().min(85).max(95),
  heightM:           z.number().positive().optional(),
  crownDiaM:         z.number().positive().optional(),
  trunkDiaCm:        z.number().positive().optional(),
  healthStatus:      z.enum(['EXCELLENT','GOOD','FAIR','POOR','DEAD']).optional(),
  canopyStatus:      z.enum(['FULL','PARTIAL','SPARSE','NONE']).optional(),
  plantedAt:         z.string().optional(),
  notes:             z.string().optional(),
});

// GET /api/trees
router.get('/', requireMinRole('DEPT_HEAD'), async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const { wardId, healthStatus, species } = req.query as Record<string, string>;
    const where: any = {};
    if (wardId)       where.wardId       = wardId;
    if (healthStatus) where.healthStatus = healthStatus;
    if (species)      where.speciesCommon = { contains: species, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      prisma.tree.findMany({
        where,
        include: { ward: { select: { name: true, wardNumber: true } } },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      prisma.tree.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (e) { serverError(res, e); }
});

// GET /api/trees/stats
router.get('/stats', requireMinRole('DEPT_HEAD'), async (_req: Request, res: Response) => {
  try { res.json(await getTreeStats()); }
  catch (e) { serverError(res, e); }
});

// GET /api/trees/carbon
router.get('/carbon', requireMinRole('DEPT_HEAD'), async (_req: Request, res: Response) => {
  try {
    const agg = await prisma.tree.aggregate({ _sum: { carbonKg: true }, _count: { id: true } });
    const totalKg = agg._sum.carbonKg ?? 0;
    res.json({
      totalKg:     Math.round(totalKg),
      totalTonnes: +(totalKg / 1000).toFixed(2),
      totalTrees:  agg._count.id,
      co2Offset:   +(totalKg * 3.67 / 1000).toFixed(2), // CO2 = C * 44/12
    });
  } catch (e) { serverError(res, e); }
});

// GET /api/trees/:id
router.get('/:id', requireMinRole('DEPT_HEAD'), async (req: Request, res: Response) => {
  try {
    const tree = await prisma.tree.findUnique({
      where:   { id: req.params.id },
      include: { ward: true, surveyedBy: { select: { name: true } } },
    });
    if (!tree) return notFound(res, 'Tree not found');
    res.json(tree);
  } catch (e) { serverError(res, e); }
});

// POST /api/trees
router.post('/', requireMinRole('FIELD_WORKER'), validate(CreateTreeSchema), async (req: Request, res: Response) => {
  try {
    const count   = await prisma.tree.count();
    const treeCode = `JLP-T-${String(count + 1).padStart(5, '0')}`;
    const tree = await prisma.tree.create({
      data: {
        ...req.body,
        treeCode,
        surveyedById: req.user!.id,
        lastSurveyed: new Date(),
      },
    });
    created(res, tree);
  } catch (e) { serverError(res, e); }
});

// PATCH /api/trees/:id
router.patch('/:id', requireMinRole('FIELD_WORKER'), async (req: Request, res: Response) => {
  try {
    const tree = await prisma.tree.update({
      where: { id: req.params.id },
      data:  { ...req.body, lastSurveyed: new Date(), surveyedById: req.user!.id },
    });
    res.json(tree);
  } catch (e) { serverError(res, e); }
});

export default router;
