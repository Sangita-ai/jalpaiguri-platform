import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireMinRole } from '../middleware/rbac';
import { prisma } from '../utils/prisma';
import { getWaterLeakSummary } from '../services/sensor.service';
import { serverError } from '../utils/response';

const router = Router();
router.use(authenticate, requireMinRole('DEPT_HEAD'));

// GET /api/water — all water sensors with pipe info
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, wardId } = req.query as Record<string, string>;
    const where: any = {};
    if (status) where.status = status;

    const sensors = await prisma.waterSensor.findMany({
      where,
      include: {
        pipe: {
          include: {
            ward: { select: { name: true, wardNumber: true } },
          },
        },
      },
      orderBy: { leakProbability: 'desc' },
    });

    // Filter by ward after join if needed
    const filtered = wardId
      ? sensors.filter((s) => s.pipe.wardId === wardId)
      : sensors;

    res.json(filtered);
  } catch (e) { serverError(res, e); }
});

// GET /api/water/leaks — only sensors with leak probability > 0.5
router.get('/leaks', async (_req: Request, res: Response) => {
  try { res.json(await getWaterLeakSummary()); }
  catch (e) { serverError(res, e); }
});

// GET /api/water/summary
router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const [total, leakConfirmed, leakSuspected, offline, pipes] = await Promise.all([
      prisma.waterSensor.count(),
      prisma.waterSensor.count({ where: { status: 'LEAK_CONFIRMED' } }),
      prisma.waterSensor.count({ where: { status: 'LEAK_SUSPECTED' } }),
      prisma.waterSensor.count({ where: { status: 'OFFLINE' } }),
      prisma.waterPipe.groupBy({ by: ['condition'], _count: { id: true } }),
    ]);

    const lossAgg = await prisma.waterSensor.aggregate({
      _sum: { estimatedLossLph: true },
      where: { status: { in: ['LEAK_CONFIRMED', 'LEAK_SUSPECTED'] } },
    });

    const pipeCondition: Record<string, number> = {};
    pipes.forEach((p) => { pipeCondition[p.condition] = p._count.id; });

    res.json({
      totalSensors: total,
      leakConfirmed,
      leakSuspected,
      normal:  total - leakConfirmed - leakSuspected - offline,
      offline,
      estimatedDailyLossL: Math.round((lossAgg._sum.estimatedLossLph ?? 0) * 24),
      pipeCondition,
    });
  } catch (e) { serverError(res, e); }
});

// GET /api/water/pipes
router.get('/pipes', async (_req: Request, res: Response) => {
  try {
    const pipes = await prisma.waterPipe.findMany({
      include: {
        ward:    { select: { name: true, wardNumber: true } },
        sensors: { select: { leakProbability: true, status: true, pressureBar: true } },
      },
      orderBy: { condition: 'asc' },
    });
    res.json(pipes);
  } catch (e) { serverError(res, e); }
});

export default router;
