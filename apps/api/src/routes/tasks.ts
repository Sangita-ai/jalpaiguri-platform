import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { uploadToS3 } from '../utils/s3';
import { multiUpload } from '../middleware/upload';
import { serverError, notFound } from '../utils/response';

const router = Router();

router.use(authenticate);

// GET /api/tasks/mine
router.get('/mine', async (req: Request, res: Response) => {
  try {
    const tasks = await prisma.assignment.findMany({
      where: {
        worker_id: req.user!.id,
      },
      include: {
        complaint: {
          include: {
            ward: {
              select: {
                name: true,
                name_bn: true,
              },
            },
            attachments: {
              take: 1,
            },
          },
        },
      },
      orderBy: [
        { completed_at: 'asc' },
        { assigned_at: 'desc' },
      ],
    });

    res.json(tasks);
  } catch (e) {
    serverError(res, e);
  }
});

// POST /api/tasks/:id/start
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: req.params.id },
    });

    if (!assignment) {
      return notFound(res, 'Assignment not found');
    }

    if (assignment.worker_id !== req.user!.id) {
      return res.status(403).json({
        error: 'Not your assignment',
      });
    }

    const [updated] = await Promise.all([
      prisma.assignment.update({
        where: { id: req.params.id },
        data: {
          started_at: new Date(),
        },
      }),

      prisma.complaint.update({
        where: {
          id: assignment.complaint_id,
        },
        data: {
          status: 'IN_PROGRESS',
        },
      }),
    ]);

    res.json(updated);
  } catch (e) {
    serverError(res, e);
  }
});

// POST /api/tasks/:id/complete
router.post(
  '/:id/complete',
  multiUpload,
  async (req: Request, res: Response) => {
    try {
      const assignment = await prisma.assignment.findUnique({
        where: { id: req.params.id },
      });

      if (!assignment) {
        return notFound(res, 'Assignment not found');
      }

      if (assignment.worker_id !== req.user!.id) {
        return res.status(403).json({
          error: 'Not your assignment',
        });
      }

      const { notes } = req.body;

      let photoUrl: string | undefined;

      const files = req.files as Express.Multer.File[] | undefined;

      if (files?.length) {
        const file = files[0];

        const key = `completions/${assignment.id}/${Date.now()}-${file.originalname}`;

        photoUrl = await uploadToS3(
          key,
          file.buffer,
          file.mimetype
        );

        for (const f of files.slice(1)) {
          const k = `complaints/${assignment.complaint_id}/${Date.now()}-${f.originalname}`;

          const u = await uploadToS3(
            k,
            f.buffer,
            f.mimetype
          );

          await prisma.complaintAttachment.create({
            data: {
              complaint_id: assignment.complaint_id,
              s3_key: k,
              s3_url: u,
              file_name: f.originalname,
              file_type: f.mimetype,
              file_size_kb: Math.ceil(f.size / 1024),
            },
          });
        }
      }

      const [updatedAssignment] = await Promise.all([
        prisma.assignment.update({
          where: {
            id: req.params.id,
          },
          data: {
            completed_at: new Date(),
            completion_notes: notes,
            completion_photo_url: photoUrl,
          },
        }),

        prisma.complaint.update({
          where: {
            id: assignment.complaint_id,
          },
          data: {
            status: 'RESOLVED',
            resolved_at: new Date(),
          },
        }),
      ]);

      res.json(updatedAssignment);
    } catch (e) {
      serverError(res, e);
    }
  }
);

export default router;
