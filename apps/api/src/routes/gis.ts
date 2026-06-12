import { Router, Request, Response } from 'express';
import { optionalAuth } from '../middleware/auth';
import { serverError } from '../utils/response';
import {
  getWardsGeoJSON,
  getComplaintHeatmap,
  getComplaintPoints,
  getDrainsGeoJSON,
  getTreesGeoJSON,
  getWaterPipesGeoJSON,
} from '../services/gis.service';

const router = Router();
router.use(optionalAuth);

// Cache headers — GIS data changes slowly
const GEO_CACHE    = 'public, max-age=60, stale-while-revalidate=300';
const SENSOR_CACHE = 'public, max-age=30, stale-while-revalidate=60';

router.get('/wards', async (_req: Request, res: Response) => {
  try {
    res.set('Cache-Control', GEO_CACHE);
    res.json(await getWardsGeoJSON());
  } catch (e) { serverError(res, e); }
});

router.get('/complaints/heatmap', async (_req: Request, res: Response) => {
  try {
    res.set('Cache-Control', GEO_CACHE);
    res.json(await getComplaintHeatmap());
  } catch (e) { serverError(res, e); }
});

router.get('/complaints/points', async (req: Request, res: Response) => {
  try {
    res.set('Cache-Control', GEO_CACHE);
    res.json(await getComplaintPoints(req.query as Record<string, string>));
  } catch (e) { serverError(res, e); }
});

router.get('/drains', async (_req: Request, res: Response) => {
  try {
    res.set('Cache-Control', SENSOR_CACHE);
    res.json(await getDrainsGeoJSON());
  } catch (e) { serverError(res, e); }
});

router.get('/trees', async (req: Request, res: Response) => {
  try {
    res.set('Cache-Control', GEO_CACHE);
    res.json(await getTreesGeoJSON(req.query.wardId as string | undefined));
  } catch (e) { serverError(res, e); }
});

// Returns both pipe lines AND sensor points
router.get('/water-pipes', async (_req: Request, res: Response) => {
  try {
    res.set('Cache-Control', SENSOR_CACHE);
    const data = await getWaterPipesGeoJSON();
    res.json(data.pipes);          // pipe LineString GeoJSON
  } catch (e) { serverError(res, e); }
});

router.get('/water-sensors', async (_req: Request, res: Response) => {
  try {
    res.set('Cache-Control', SENSOR_CACHE);
    const data = await getWaterPipesGeoJSON();
    res.json(data.sensors);        // sensor point GeoJSON
  } catch (e) { serverError(res, e); }
});

// Bounding box query — return complaints within map viewport
router.get('/complaints/bbox', async (req: Request, res: Response) => {
  try {
    const { west, south, east, north } = req.query as Record<string, string>;
    if (!west || !south || !east || !north) {
      return res.status(400).json({ error: 'west, south, east, north query params required' });
    }
    const { prisma } = await import('../utils/prisma');
    const features = await prisma.complaint.findMany({
      where: {
        locationLat: { gte: parseFloat(south), lte: parseFloat(north) },
        locationLng: { gte: parseFloat(west),  lte: parseFloat(east)  },
        locationLat_not: null,
      } as any,
      select: {
        id: true, complaintNumber: true, category: true, status: true,
        priorityScore: true, locationLat: true, locationLng: true,
        ward: { select: { name: true, wardNumber: true } },
      },
      take: 500,
    });
    res.json({
      type: 'FeatureCollection',
      features: features.map(c => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [c.locationLng!, c.locationLat!] },
        properties: c,
      })),
    });
  } catch (e) { serverError(res, e); }
});

export default router;
