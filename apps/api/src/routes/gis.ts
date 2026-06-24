import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../utils/prisma';

const router = Router();

router.use(authenticate);

/*
----------------------------------
COMPLAINT POINTS
----------------------------------
*/
router.get('/complaints/points', async (_req, res) => {
  const complaints = await prisma.complaint.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
    },
  });

  res.json({
    type: 'FeatureCollection',
    features: complaints.map((c) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [c.longitude, c.latitude],
      },
      properties: {
        id: c.id,
        complaintNumber: c.complaint_no,
        category: c.category,
        status: c.status,
      },
    })),
  });
});

/*
----------------------------------
HEATMAP
----------------------------------
*/
router.get('/complaints/heatmap', async (_req, res) => {
  const complaints = await prisma.complaint.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
    },
  });

  res.json({
    type: 'FeatureCollection',
    features: complaints.map((c) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [c.longitude, c.latitude],
      },
      properties: {
        weight: c.priority_score || 1,
      },
    })),
  });
});

/*
----------------------------------
DRAINS
----------------------------------
*/
router.get('/drains', async (_req, res) => {
  const drains = await prisma.drainSensor.findMany();

  res.json({
    type: 'FeatureCollection',
    features: drains.map((d) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [d.longitude, d.latitude],
      },
      properties: {
        sensorCode: d.sensor_code,
        status: d.status,
        fillPct: d.overflow_risk_pct,
      },
    })),
  });
});

/*
----------------------------------
TREES
----------------------------------
*/
router.get('/trees', async (_req, res) => {
  const trees = await prisma.tree.findMany();

  res.json({
    type: 'FeatureCollection',
    features: trees.map((t) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [t.longitude, t.latitude],
      },
      properties: {
        id: t.id,
        species: t.common_name,
        health: t.health_status,
      },
    })),
  });
});

/*
----------------------------------
WATER PIPES
----------------------------------
*/
router.get('/water-pipes', async (_req, res) => {
  const pipes = await prisma.waterPipe.findMany();

  res.json({
    type: 'FeatureCollection',
    features: [],
    pipes,
  });
});

export default router;