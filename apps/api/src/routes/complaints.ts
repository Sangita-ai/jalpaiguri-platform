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
  locationLat: z.coerce.number().optional(),
  locationLng: z.coerce.number().optional(),
  address:     z.string().optional(),
  wardId:      z.string().uuid().optional(),
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
    const { status, category, wardId, priority, search, from, to, sortBy = 'submittedAt', sortOrder = 'desc' } =
      req.query as Record<string, string>;

    const where: any = {};
    if (status)   where.status   = status;
    if (category) where.category = category;
    if (wardId)   where.wardId   = wardId;
    if (priority === 'high') where.priorityScore = { gte: 70 };
    if (from || to) {
      where.submittedAt = {};
      if (from) where.submittedAt.gte = new Date(from);
      if (to)   where.submittedAt.lte = new Date(to);
    }
    if (search) {
      where.OR = [
        { description:     { contains: search, mode: 'insensitive' } },
        { complaintNumber: { contains: search, mode: 'insensitive' } },
        { address:         { contains: search, mode: 'insensitive' } },
      ];
    }

    const validSortFields = ['submittedAt','priorityScore','status','category'];
    const orderField = validSortFields.includes(sortBy) ? sortBy : 'submittedAt';
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
        where:   { reporterId: req.user!.id },
        include: COMPLAINT_INCLUDE,
        orderBy: { submittedAt: 'desc' },
        skip, take: limit,
      }),
      prisma.complaint.count({ where: { reporterId: req.user!.id } }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (e) { serverError(res, e); }
});

// ── GET /api/complaints/track/:number — public ────────────────
router.get('/track/:number', optionalAuth, async (req: Request, res: Response) => {
  try {
    const c = await prisma.complaint.findUnique({
      where:   { complaintNumber: req.params.number },
      include: {
        ward:        { select: { name: true, wardNumber: true } },
        assignments: {
          where:   { isActive: true },
          select:  { assignedAt: true, completedAt: true, completionNotes: true, completionPhotoUrl: true },
          take: 1,
        },
        attachments: { select: { s3Url: true, capturedAt: true, mimeType: true } },
      },
    });
    if (!c) return notFound(res, 'Complaint not found');
    res.json({
      complaintNumber:  c.complaintNumber,
      category:         c.category,
      status:           c.status,
      wardName:         c.ward.name,
      submittedAt:      c.submittedAt,
      acknowledgedAt:   c.acknowledgedAt,
      resolvedAt:       c.resolvedAt,
      address:          c.address,
      assignment:       c.assignments[0] ?? null,
      attachmentCount:  c.attachments.length,
    });
  } catch (e) { serverError(res, e); }
});

// ── GET /api/complaints/:id ───────────────────────────────────
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const c = await prisma.complaint.findUnique({
      where:   { id: req.params.id },
      include: {
        ...COMPLAINT_INCLUDE,
        assignments: {
          include: {
            worker:     { select: { name: true, phone: true, email: true } },
            assignedBy: { select: { name: true, role: true } },
          },
          orderBy: { assignedAt: 'desc' },
        },
      },
    });
    if (!c) return notFound(res, 'Complaint not found');
    if (req.user!.role === 'CITIZEN' && c.reporterId !== req.user!.id) {
      return forbidden(res);
    }
    res.json(c);
  } catch (e) { serverError(res, e); }
});

// ── POST /api/complaints ──────────────────────────────────────
router.post('/',
  authenticate,
  multiUpload,
  async (req: Request, res: Response) => {
    try {
      // Validate body
      const parsed = CreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: parsed.error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
        });
      }
      const { category, description, locationLat, locationLng, address, wardId: bodyWardId } = parsed.data;

      // Resolve ward
      let wardId = bodyWardId;
      if (!wardId && locationLat && locationLng) {
        wardId = (await resolveWardFromGPS(locationLat, locationLng)) ?? undefined;
      }
      if (!wardId) {
        const first = await prisma.ward.findFirst({ orderBy: { wardNumber: 'asc' } });
        wardId = first!.id;
      }

      // AI triage
      const ai = await aiTriageComplaint(description, category);

      // Generate complaint number
      const complaintNumber = await generateComplaintNumber();

      // Create complaint
      const complaint = await prisma.complaint.create({
        data: {
          complaintNumber,
          reporterId:    req.user!.id,
          wardId,
          category,
          description,
          locationLat:   locationLat ?? null,
          locationLng:   locationLng ?? null,
          address:       address ?? null,
          aiCategory:    ai.category,
          aiConfidence:  ai.confidence,
          aiNotes:       ai.notes,
          priorityScore: ai.priorityScore,
          isDuplicate:   ai.isDuplicate,
          duplicateOf:   ai.duplicateOfId ?? undefined,
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
              complaintId: complaint.id,
              s3Key:       key,
              s3Url:       url,
              mimeType:    file.mimetype,
              sizeBytes:   file.size,
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
  auditLog('UPDATE_STATUS', 'complaint'),
  async (req: Request, res: Response) => {
    try {
      const { status, notes } = req.body;
      const existing = await prisma.complaint.findUnique({ where: { id: req.params.id } });
      if (!existing) return notFound(res, 'Complaint not found');

      const updateData: any = { status };
      if (status === 'RESOLVED') updateData.resolvedAt    = new Date();
      if (status === 'CLOSED')   updateData.closedAt      = new Date();
      if (status === 'ASSIGNED') updateData.acknowledgedAt = new Date();

      const updated = await prisma.complaint.update({
        where:   { id: req.params.id },
        data:    updateData,
        include: COMPLAINT_INCLUDE,
      });

      if (['RESOLVED','CLOSED'].includes(status)) {
        await prisma.assignment.updateMany({
          where: { complaintId: req.params.id, isActive: true },
          data:  { completedAt: new Date(), completionNotes: notes },
        });
      }

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
      await prisma.assignment.updateMany({
        where: { complaintId: req.params.id, isActive: true },
        data:  { isActive: false },
      });

      const assignment = await prisma.assignment.create({
        data: {
          complaintId:  req.params.id,
          workerId,
          assignedById: req.user!.id,
          dueAt:        dueAt ? new Date(dueAt) : new Date(Date.now() + 48 * 3600000),
          isActive:     true,
        },
        include: { worker: { select: { name: true, phone: true } } },
      });

      await prisma.complaint.update({
        where: { id: req.params.id },
        data:  { status: 'ASSIGNED', acknowledgedAt: new Date() },
      });

      res.json(assignment);
    } catch (e) { serverError(res, e); }
  }
);

export default router;
