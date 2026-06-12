import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { aiTriageComplaint, checkDuplicate } from '../services/ai.service';
import { validate } from '../middleware/validate';
import { serverError } from '../utils/response';

const router = Router();
router.use(authenticate);

const TriageSchema = z.object({
  description: z.string().min(10),
  category:    z.string().optional(),
});

const DupSchema = z.object({
  description:  z.string().min(10),
  locationLat:  z.number().optional(),
  locationLng:  z.number().optional(),
});

// POST /api/ai/triage
router.post('/triage', validate(TriageSchema), async (req: Request, res: Response) => {
  try {
    const result = await aiTriageComplaint(req.body.description, req.body.category);
    res.json(result);
  } catch (e) { serverError(res, e); }
});

// POST /api/ai/duplicate-check
router.post('/duplicate-check', validate(DupSchema), async (req: Request, res: Response) => {
  try {
    const { description, locationLat, locationLng } = req.body;
    const result = await checkDuplicate(description, locationLat, locationLng);
    res.json(result);
  } catch (e) { serverError(res, e); }
});

export default router;
