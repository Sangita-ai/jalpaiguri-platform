import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireMinRole } from '../middleware/rbac';
import { prisma } from '../utils/prisma';
import { uploadToS3 } from '../utils/s3';
import { multiUpload } from '../middleware/upload';
import { serverError, notFound } from '../utils/response';

const router = Router();
router.use(authenticate);

// GET /api/tasks/mine — field worker's active assignments
router.get('/mine', async (req: Request, res: Response) => {
  try {
    const tasks = await prisma.assignment.findMany({
      where: { workerId: req.user!.id, isActive: true },
      include: {
        complaint: {
          include: {
            ward:        { select: { name: true, wardNumber: true } },
            attachments: { take: 1 },
          },
        },
      },
      orderBy: [
        { completedAt: 'asc' }, // incomplete first
        { assignedAt:  'desc' },
      ],
    });
    res.json(tasks);
  } catch (e) { serverError(res, e); }
});

// POST /api/tasks/:id/start — field worker starts task
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const assignment = await prisma.assignment.findUnique({ where: { id: req.params.id } });
    if (!assignment) return notFound(res, 'Assignment not found');
    if (assignment.workerId !== req.user!.id) return res.status(403).json({ error: 'Not your assignment' });

    const [updated] = await Promise.all([
      prisma.assignment.update({
        where: { id: req.params.id },
        data:  { startedAt: new Date() },
      }),
      prisma.complaint.update({
        where: { id: assignment.complaintId },
        data:  { status: 'IN_PROGRESS' },
      }),
    ]);
    res.json(updated);
  } catch (e) { serverError(res, e); }
});

// POST /api/tasks/:id/complete — submit completion with photos
router.post('/:id/complete', multiUpload, async (req: Request, res: Response) => {
  try {
    const assignment = await prisma.assignment.findUnique({ where: { id: req.params.id } });
    if (!assignment) return notFound(res, 'Assignment not found');
    if (assignment.workerId !== req.user!.id) return res.status(403).json({ error: 'Not your assignment' });

    const { notes } = req.body;
    let photoUrl: string | undefined;

    // Upload first photo as completion photo
    const files = req.files as Express.Multer.File[] | undefined;
    if (files?.length) {
      const file = files[0];
      const key  = `completions/${assignment.id}/${Date.now()}-${file.originalname}`;
      photoUrl   = await uploadToS3(key, file.buffer, file.mimetype);

      // Also attach remaining photos to complaint
      for (const f of files.slice(1)) {
        const k = `complaints/${assignment.complaintId}/${Date.now()}-${f.originalname}`;
        const u = await uploadToS3(k, f.buffer, f.mimetype);
        await prisma.complaintAttachment.create({
          data: { complaintId: assignment.complaintId, s3Key: k, s3Url: u, mimeType: f.mimetype, sizeBytes: f.size },
        });
      }
    }

    const [updatedAssignment] = await Promise.all([
      prisma.assignment.update({
        where: { id: req.params.id },
        data: {
          completedAt:       new Date(),
          completionNotes:   notes,
          completionPhotoUrl: photoUrl,
        },
      }),
      prisma.complaint.update({
        where: { id: assignment.complaintId },
        data:  { status: 'RESOLVED', resolvedAt: new Date() },
      }),
    ]);

    res.json(updatedAssignment);
  } catch (e) { serverError(res, e); }
});

export default router;
