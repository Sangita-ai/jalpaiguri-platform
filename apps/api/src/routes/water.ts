import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireMinRole } from '../middleware/rbac';
import { prisma } from '../utils/prisma';
import { serverError } from '../utils/response';

const router = Router();

router.use(
  authenticate,
  requireMinRole('DEPT_HEAD')
);

/*
--------------------------------------------------
GET /api/water
--------------------------------------------------
*/
router.get('/', async (req: Request, res: Response) => {
  try {
    const { alertLevel, wardId } =
      req.query as Record<string, string>;

    const where: any = {};

    if (alertLevel) {
      where.alert_level = alertLevel;
    }

    const sensors =
      await prisma.waterSensor.findMany({
        where,
        include: {
          pipe: {
            include: {
              ward: {
                select: {
                  id: true,
                  name: true,
                  name_bn: true,
                },
              },
            },
          },
        },
        orderBy: {
          leak_probability: 'desc',
        },
      });

    const filtered = wardId
      ? sensors.filter(
          (s) =>
            s.pipe.ward_id === Number(wardId)
        )
      : sensors;

    res.json(filtered);
  } catch (e) {
    serverError(res, e);
  }
});

/*
--------------------------------------------------
GET /api/water/summary
--------------------------------------------------
*/
router.get(
  '/summary',
  async (_req: Request, res: Response) => {
    try {
      const [
        total,
        low,
        medium,
        high,
        critical,
        pipes,
      ] = await Promise.all([
        prisma.waterSensor.count(),

        prisma.waterSensor.count({
          where: {
            alert_level: 'LOW',
          },
        }),

        prisma.waterSensor.count({
          where: {
            alert_level: 'MEDIUM',
          },
        }),

        prisma.waterSensor.count({
          where: {
            alert_level: 'HIGH',
          },
        }),

        prisma.waterSensor.count({
          where: {
            alert_level: 'CRITICAL',
          },
        }),

        prisma.waterPipe.groupBy({
          by: ['status'],
          _count: {
            id: true,
          },
        }),
      ]);

      const lossAgg =
        await prisma.waterSensor.aggregate({
          _sum: {
            estimated_loss_lph: true,
          },
        });

      const pipeStatus: Record<
        string,
        number
      > = {};

      pipes.forEach((p) => {
        pipeStatus[p.status] =
          p._count.id;
      });

      res.json({
        totalSensors: total,
        low,
        medium,
        high,
        critical,
        estimatedDailyLossL:
          Math.round(
            (lossAgg._sum
              .estimated_loss_lph ?? 0) * 24
          ),
        pipeStatus,
      });
    } catch (e) {
      serverError(res, e);
    }
  }
);

/*
--------------------------------------------------
GET /api/water/pipes
--------------------------------------------------
*/
router.get(
  '/pipes',
  async (_req: Request, res: Response) => {
    try {
      const pipes =
        await prisma.waterPipe.findMany({
          include: {
            ward: {
              select: {
                id: true,
                name: true,
                name_bn: true,
              },
            },

            sensors: {
              select: {
                leak_probability: true,
                alert_level: true,
                pressure_bar: true,
                flow_lpm: true,
              },
            },
          },

          orderBy: {
            status: 'asc',
          },
        });

      res.json(pipes);
    } catch (e) {
      serverError(res, e);
    }
  }
);

export default router;
