import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireMinRole } from '../middleware/rbac';
import { prisma } from '../utils/prisma';
import { getDrainAlerts } from '../services/sensor.service';
import { getPagination, paginatedResponse } from '../utils/paginate';
import { serverError, notFound } from '../utils/response';

const router = Router();
router.use(authenticate, requireMinRole('DEPT_HEAD'));

// GET /api/drains
router.get('/', async (req: Request, res: Response) => {
  try {
    const { wardId, status } = req.query as Record<string, string>;
    const where: any = {};
    if (wardId) where.ward_id = Number(wardId)
    // if (status) where.status = status;

    const sensors = await prisma.drainSensor.findMany({
      where,
      include: {
        ward: { select: { name: true, name_bn: true } },
        _count: { select: { readings: true } },
      },
      orderBy: [
        // { status: 'asc' }, // OFFLINE last
        { current_level_cm: 'desc' },
      ],
    });
    res.json(sensors);
  } catch (e) { serverError(res, e); }
});

// GET /api/drains/alerts
router.get('/alerts', async (_req: Request, res: Response) => {
  try { res.json(await getDrainAlerts()); }
  catch (e) { serverError(res, e); }
});

// GET /api/drains/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const sensor = await prisma.drainSensor.findUnique({
      where:   { id: req.params.id },
      include: { ward: { select: { name: true, name_bn: true } } },
    });
    if (!sensor) return notFound(res, 'Sensor not found');
    res.json(sensor);
  } catch (e) { serverError(res, e); }
});

// GET /api/drains/:id/history?hours=72
router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const hours = Math.min(168, Math.max(1, parseInt(String(req.query.hours ?? '72'))));
    const since = new Date(Date.now() - hours * 3600 * 1000);

    const readings = await prisma.drainReading.findMany({
      where:   { sensor_id: req.params.id, recorded_at: { gte: since } },
      orderBy: { recorded_at: 'asc' },
      select:  { level_cm: true, rainfall_mm: true, recorded_at: true },
    });

    // Downsample to max 200 points for chart performance
    const step = Math.max(1, Math.floor(readings.length / 200));
    const sampled = readings.filter((_, i) => i % step === 0);

    res.json(sampled.map((r) => ({
      levelCm:    r.level_cm,
      rainfallMm: r.rainfall_mm,
      
      hour:       new Date(r.recorded_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      timestamp:  r.recorded_at,
    })));
  } catch (e) { serverError(res, e); }
});

export default router;
