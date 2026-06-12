import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { authenticate } from '../middleware/auth';
import { requireMinRole } from '../middleware/rbac';
import { prisma } from '../utils/prisma';
import { getPagination, paginatedResponse } from '../utils/paginate';
import { serverError, notFound, created, badRequest } from '../utils/response';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authenticate);

const CreateUserSchema = z.object({
  email:       z.string().email(),
  name:        z.string().min(2),
  phone:       z.string().optional(),
  role:        z.enum(['CITIZEN','FIELD_WORKER','DEPT_HEAD','MUNICIPAL_OFFICER','CHAIRMAN','SUPER_ADMIN']),
  wardNumber:  z.number().int().min(1).max(20).optional(),
  password:    z.string().min(8).default('Demo@1234'),
});

// GET /api/users
router.get('/', requireMinRole('DEPT_HEAD'), async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const { role, search, wardId } = req.query as Record<string, string>;
    const where: any = {};
    if (role)   where.role = role;
    if (wardId) where.wardId = wardId;
    if (search) {
      where.OR = [
        { name:  { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, name: true, phone: true,
          role: true, isActive: true, createdAt: true, lastLoginAt: true,
          ward:   { select: { name: true, wardNumber: true } },
          _count: { select: { assignedTasks: true, reportedComplaints: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      prisma.user.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (e) { serverError(res, e); }
});

// GET /api/users/:id
router.get('/:id', requireMinRole('DEPT_HEAD'), async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.params.id },
      select: {
        id: true, email: true, name: true, phone: true, role: true,
        isActive: true, createdAt: true, lastLoginAt: true, avatarUrl: true,
        ward:   { select: { name: true, wardNumber: true } },
        _count: { select: { assignedTasks: true, reportedComplaints: true } },
      },
    });
    if (!user) return notFound(res, 'User not found');
    res.json(user);
  } catch (e) { serverError(res, e); }
});

// POST /api/users
router.post('/', requireMinRole('MUNICIPAL_OFFICER'), validate(CreateUserSchema), async (req: Request, res: Response) => {
  try {
    const { email, name, phone, role, wardNumber, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return badRequest(res, 'Email already registered');

    let wardId: string | undefined;
    if (wardNumber) {
      const ward = await prisma.ward.findUnique({ where: { wardNumber } });
      if (!ward) return badRequest(res, `Ward ${wardNumber} not found`);
      wardId = ward.id;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name, phone, role, wardId, passwordHash },
      select: { id: true, email: true, name: true, role: true, wardId: true },
    });
    created(res, user);
  } catch (e) { serverError(res, e); }
});

// PATCH /api/users/:id
router.patch('/:id', requireMinRole('MUNICIPAL_OFFICER'), async (req: Request, res: Response) => {
  try {
    const { name, phone, role, wardNumber, isActive, password } = req.body;
    const updateData: any = {};
    if (name !== undefined)     updateData.name     = name;
    if (phone !== undefined)    updateData.phone    = phone;
    if (role !== undefined)     updateData.role     = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password)               updateData.passwordHash = await bcrypt.hash(password, 10);
    if (wardNumber) {
      const ward = await prisma.ward.findUnique({ where: { wardNumber: parseInt(wardNumber) } });
      if (ward) updateData.wardId = ward.id;
    }

    const user = await prisma.user.update({
      where:  { id: req.params.id },
      data:   updateData,
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
    res.json(user);
  } catch (e) { serverError(res, e); }
});

export default router;
