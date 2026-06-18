import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, optionalAuth } from '../middleware/auth';
import { requireMinRole } from '../middleware/rbac';
import { multiUpload } from '../middleware/upload';
import { validate } from '../middleware/validate';
import { auditLog } from '../middleware/audit';
import { prisma } from '../utils/prisma';
import { uploadToS3 } from '../utils/s3';
import { aiTriageComplaint } from '../services/ai.service';
import {
  resolveWardFromGPS,
  generateComplaintNumber,
  COMPLAINT_INCLUDE,
} from '../services/complaint.service';
import { getPagination, paginatedResponse } from '../utils/paginate';
import { serverError, notFound, badRequest, created, forbidden } from '../utils/response';

const router = Router();

const CreateSchema = z.object({
  category:    z.enum(['GARBAGE','WATER_LEAKAGE','WATER_SUPPLY','DRAINAGE','ROAD_DAMAGE','STREETLIGHT_FAILURE','ILLEGAL_DUMPING','OTHER']),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  location_lat: z.coerce.number().optional(),
  location_lng: z.coerce.number().optional(),
  address:     z.string().optional(),
  wardId: z.coerce.number().optional(),
});

const StatusSchema = z.object({
  status: z.enum(['SUBMITTED','ASSIGNED','IN_PROGRESS','RESOLVED','CLOSED']),
  notes:  z.string().optional(),
});

const AssignSchema = z.object({
  workerId: z.string().uuid(),
  dueAt:    z.string().datetime().optional(),
});

// ── GET /api/complaints ───────────────────────────────────────
router.get('/', authenticate, requireMinRole('DEPT_HEAD'), async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const { status, category, wardId, priority, search, from, to, sortBy = 'submitted_at', sortOrder = 'desc' } =
      req.query as Record<string, string>;

    const where: any = {};
    if (status)   where.status   = status;
    if (category) where.category = category;
    if (wardId)   where.wardId   =  Number(wardId);
    if (priority === 'high') where.priority_score = { gte: 70 };
    if (from || to) {
      where.submitted_at = {};
      if (from) where.submitted_at.gte = new Date(from);
      if (to)   where.submitted_at.lte = new Date(to);
    }
    if (search) {
      where.OR = [
        { description:     { contains: search, mode: 'insensitive' } },
        { complaint_no: { contains: search, mode: 'insensitive' } },
        { address:         { contains: search, mode: 'insensitive' } },
      ];
    }

    const validSortFields = ['submitted_at','priority_score','status','category'];
    const orderField = validSortFields.includes(sortBy) ? sortBy : 'submitted_at';
    const orderDir   = sortOrder === 'asc' ? 'asc' : 'desc';

    const [data, total] = await Promise.all([
      prisma.complaint.findMany({
        where,
        include:  COMPLAINT_INCLUDE,
        orderBy:  { [orderField]: orderDir },
        skip, take: limit,
      }),
      prisma.complaint.count({ where }),
    ]);

    res.json(paginatedResponse(data, total, page, limit));
  } catch (e) { serverError(res, e); }
});

// ── GET /api/complaints/mine ──────────────────────────────────
router.get('/mine', authenticate, async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const [data, total] = await Promise.all([
      prisma.complaint.findMany({
        where:   { citizen_id: req.user!.id },
        include: COMPLAINT_INCLUDE,
        orderBy: { submitted_at: 'desc' },
        skip, take: limit,
      }),
      prisma.complaint.count({ where: { citizen_id: req.user!.id } }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (e) { serverError(res, e); }
});

// ── GET /api/complaints/track/:number — public ────────────────
router.get('/track/:number', optionalAuth, async (req: Request, res: Response) => {
  try {
    const c = await prisma.complaint.findFirst({
      where:   { complaint_no: req.params.number },
      include: {
        ward:        { select: { name: true } },
        assignment: {
          select:  { assigned_at: true, completed_at: true, completion_notes: true, completion_photo_url: true },
          
        },
        attachments: { select: { s3_url: true, captured_at: true} },
      },
    });
    if (!c) return notFound(res, 'Complaint not found');
    const assignment = c.assignment ?? null;
    res.json({
      complaintNumber:  c.complaint_no,
      category:         c.category,
      status:           c.status,
      wardName:         c.ward.name,
      submittedAt:      c.submitted_at,
      acknowledgedAt:   c.acknowledged_at,
      resolvedAt:       c.resolved_at,
      address:          c.address,
      assignment: assignment
    ? {
        assignedAt: assignment.assigned_at,
        completedAt: assignment.completed_at,
        completionNotes: assignment.completion_notes,
        completionPhoto: assignment.completion_photo_url,
      }
    : null,
      attachmentCount: c.attachments?.length ?? 0,
    });
  } catch (e) { serverError(res, e); }
});

// ── GET /api/complaints/:id ───────────────────────────────────
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const c = await prisma.complaint.findUnique({
  where: {
    id: req.params.id,
  },
  include: {
    ward: {
      select: {
        name: true,
      },
    },

    assignment: {
      select: {
        assigned_at: true,
        completed_at: true,
        completion_notes: true,
        completion_photo_url: true,
      },
    },

    attachments: {
      select: {
        s3_url: true,
        captured_at: true,
      },
    },
  },
});
    if (!c) return notFound(res, 'Complaint not found');
    if (req.user!.role === 'CITIZEN' && c.citizen_id !== req.user!.id) {
      return forbidden(res);
    }
    res.json(c);
  } catch (e) { serverError(res, e); }
});

// ── POST /api/complaints ──────────────────────────────────────
router.post(
  '/',
  authenticate,
  multiUpload,
  async (req: Request, res: Response) => {
    try {

      console.log("REQUEST BODY:", req.body);

      const parsed = CreateSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: parsed.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      const { category, description, location_lat, location_lng, address, wardId: bodyWardId } = parsed.data;

      // Resolve ward
      let wardId = bodyWardId;
      if (!wardId && location_lat && location_lng) {
        wardId = (await resolveWardFromGPS(location_lat, location_lng)) ?? undefined;
      }
      if (!wardId) {
        const first = await prisma.ward.findFirst({ orderBy: { name_bn: 'asc' } });
        console.log("FIRST WARD =", first);
        wardId = first!.id;
      }

      // AI triage
      const ai = await aiTriageComplaint(description, category);

      // Generate complaint number
      const complaint_no = await generateComplaintNumber();

      // Create complaint
      const complaint = await prisma.complaint.create({
        data: {
          complaint_no,
          citizen_id:    req.user!.id,
          ward_id:       wardId,
          category,
          description,
          latitude:   location_lat ?? null,
          longitude:   location_lng ?? null,
          address:       address ?? null,
          ai_category:    ai.category as any,
          ai_summary:       ai.notes,
          priority_score: ai.priorityScore,
          is_duplicate:   ai.isDuplicate,
          duplicate_of:   ai.duplicateOfId ?? undefined,
        },
        include: COMPLAINT_INCLUDE,
      });

      // Upload photos
      const files = req.files as Express.Multer.File[] | undefined;
      if (files?.length) {
        await Promise.all(files.map(async (file) => {
          const key = `complaints/${complaint.id}/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const url = await uploadToS3(key, file.buffer, file.mimetype);
          await prisma.complaintAttachment.create({
            data: {
              complaint_id: complaint.id,
              s3_key: key,
              s3_url: url,
              file_name: file.originalname,
              file_type: file.mimetype,
              file_size_kb: Math.ceil(file.size / 1024),
            },
          });
        }));
      }

      // Broadcast to WebSocket subscribers
      if ((global as any).broadcastComplaintUpdate) {
        (global as any).broadcastComplaintUpdate(complaint);
      }

      const full = await prisma.complaint.findUnique({
        where: { id: complaint.id }, include: COMPLAINT_INCLUDE,
      });
      created(res, full);
    } catch (e) { serverError(res, e); }
  }
);

// ── PATCH /api/complaints/:id/status ─────────────────────────
router.patch('/:id/status',
  authenticate,
  requireMinRole('FIELD_WORKER'),
  validate(StatusSchema),
  auditLog('UPDATE', 'complaint'),
  async (req: Request, res: Response) => {
    try {
      const { status, notes } = req.body;
      const existing = await prisma.complaint.findUnique({
        where: { id: req.params.id }
      });
      if (!existing) return notFound(res, 'Complaint not found');

      const updateData: any = { status };
      if (status === 'RESOLVED') updateData.resolved_at    = new Date();
      if (status === 'CLOSED')   updateData.closed_at      = new Date();
      if (status === 'ASSIGNED') updateData.acknowledged_at = new Date();

      const updated = await prisma.complaint.update({
        where:   { id: req.params.id },
        data:    updateData,
        include: COMPLAINT_INCLUDE,
      });

      await prisma.assignment.updateMany({
  where: {
    complaint_id: req.params.id,
  },

  data: {
    completed_at: new Date(),
    completion_notes: notes,
  },
});

      if ((global as any).broadcastComplaintUpdate) {
        (global as any).broadcastComplaintUpdate(updated);
      }
      res.json(updated);
    } catch (e) { serverError(res, e); }
  }
);

// ── POST /api/complaints/:id/assign ──────────────────────────
router.post('/:id/assign',
  authenticate,
  requireMinRole('DEPT_HEAD'),
  validate(AssignSchema),
  auditLog('ASSIGN', 'complaint'),
  async (req: Request, res: Response) => {
    try {
      const { workerId, dueAt } = req.body;

      const [worker, complaint] = await Promise.all([
        prisma.user.findUnique({ where: { id: workerId, role: 'FIELD_WORKER' } }),
        prisma.complaint.findUnique({ where: { id: req.params.id } }),
      ]);
      if (!worker)    return notFound(res, 'Worker not found');
      if (!complaint) return notFound(res, 'Complaint not found');

      // Deactivate prior assignment
      await prisma.assignment.deleteMany({
        where: { complaint_id: req.params.id},
        
      });

      const assignment = await prisma.assignment.create({
        data: {
          complaint_id:  req.params.id,
          worker_id:      workerId,
          assigned_by: req.user!.id,
          due_at:           dueAt ? new Date(dueAt) : new Date(Date.now() + 48 * 3600000),
          
        },
        include: { worker: { select: { full_name: true, phone: true } } },
      });

      await prisma.complaint.update({
        where: { id: req.params.id },
        data:  { status: 'ASSIGNED', acknowledged_at: new Date() },
      });

      res.json(assignment);
    } catch (e) { serverError(res, e); }
  }
);

export default router;
