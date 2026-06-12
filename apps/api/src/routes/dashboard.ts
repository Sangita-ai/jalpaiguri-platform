import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireMinRole } from '../middleware/rbac';
import { getSummaryStats, getWardStats, getCategoryTrend, getSLAReport } from '../services/complaint.service';
import { serverError } from '../utils/response';
import { prisma } from '../utils/prisma';

const router = Router();
router.use(authenticate, requireMinRole('DEPT_HEAD'));

// GET /api/dashboard/summary
router.get('/summary', async (_req: Request, res: Response) => {
  try { res.json(await getSummaryStats()); }
  catch (e) { serverError(res, e); }
});

// GET /api/dashboard/ward-stats
router.get('/ward-stats', async (_req: Request, res: Response) => {
  try { res.json(await getWardStats()); }
  catch (e) { serverError(res, e); }
});

// GET /api/dashboard/category-trend?days=30
router.get('/category-trend', async (req: Request, res: Response) => {
  try {
    const days = Math.min(90, Math.max(7, parseInt(String(req.query.days ?? '30'))));
    res.json(await getCategoryTrend(days));
  } catch (e) { serverError(res, e); }
});

// GET /api/dashboard/sla-report
router.get('/sla-report', async (_req: Request, res: Response) => {
  try { res.json(await getSLAReport()); }
  catch (e) { serverError(res, e); }
});

// GET /api/dashboard/workers
router.get('/workers', async (_req: Request, res: Response) => {
  try {
    const [workers, openTasks, completedToday] = await Promise.all([
      prisma.user.count({ where: { role: 'FIELD_WORKER', isActive: true } }),
      prisma.assignment.count({ where: { isActive: true, completedAt: null } }),
      prisma.assignment.count({
        where: {
          completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);
    res.json({ active: workers, openTasks, completedToday });
  } catch (e) { serverError(res, e); }
});

export default router;
