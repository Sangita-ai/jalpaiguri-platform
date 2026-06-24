// import { Router, Request, Response } from 'express';
// import { z } from 'zod';
// import bcrypt from 'bcryptjs';
// import { authenticate } from '../middleware/auth';
// import { requireMinRole } from '../middleware/rbac';
// import { prisma } from '../utils/prisma';
// import { getPagination, paginatedResponse } from '../utils/paginate';
// import { serverError, notFound, created, badRequest } from '../utils/response';
// import { validate } from '../middleware/validate';

// const router = Router();
// router.use(authenticate);

// const CreateUserSchema = z.object({
//   email:       z.string().email(),
//   name:        z.string().min(2),
//   phone:       z.string().optional(),
//   role:        z.enum(['CITIZEN','FIELD_WORKER','DEPT_HEAD','MUNICIPAL_OFFICER','CHAIRMAN','SUPER_ADMIN']),
//   wardNumber:  z.number().int().min(1).max(20).optional(),
//   password:    z.string().min(8).default('Demo@1234'),
// });

// // GET /api/users
// router.get('/', requireMinRole('DEPT_HEAD'), async (req: Request, res: Response) => {
//   try {
//     const { page, limit, skip } = getPagination(req);
//     const { role, search, wardId } = req.query as Record<string, string>;
//     const where: any = {};
//     if (role)   where.role = role;
//     if (wardId) where.ward_id = Number(wardId);
//     if (search) {
//       where.OR = [
//         { full_name:  { contains: search, mode: 'insensitive' } },
//         { email: { contains: search, mode: 'insensitive' } },
//       ];
//     }

//     const [data, total] = await Promise.all([
//       prisma.user.findMany({
//         where,
//         select: {
//           id: true, email: true, full_name: true, phone: true,
//           role: true, is_active: true, created_at: true, last_login_at: true,
//           ward:   { select: { name: true, ward_number: true } },
//           _count: { select: { assigned_tasks: true, reported_complaints: true } },
//         },
//         orderBy: { created_at: 'desc' },
//         skip, take: limit,
//       }),
//       prisma.user.count({ where }),
//     ]);
//     res.json(paginatedResponse(data, total, page, limit));
//   } catch (e) { serverError(res, e); }
// });

// // GET /api/users/:id
// router.get('/:id', requireMinRole('DEPT_HEAD'), async (req: Request, res: Response) => {
//   try {
//     const user = await prisma.user.findUnique({
//       where:  { id: req.params.id },
//       select: {
//   id: true,
//   email: true,
//   full_name: true,
//   phone: true,
//   role: true,
//   is_active: true,
//   created_at: true,
//   last_login_at: true,

//   ward: {
//     select: {
//       id: true,
//       name: true,
//       name_bn: true,
//     },
//   },

//   _count: {
//     select: {
//       assigned_tasks: true,
//       reported_complaints: true,
//     },
//   },
// },
//     });
//     if (!user) return notFound(res, 'User not found');
//     res.json(user);
//   } catch (e) { serverError(res, e); }
// });

// // POST /api/users
// router.post('/', requireMinRole('MUNICIPAL_OFFICER'), validate(CreateUserSchema), async (req: Request, res: Response) => {
//   try {
//     const { email, name, phone, role, wardNumber, password } = req.body;

//     const existing = await prisma.user.findUnique({ where: { email } });
//     if (existing) return badRequest(res, 'Email already registered');

//     let ward_id: number | undefined;
//     if (wardNumber) {
//       const ward = await prisma.ward.findUnique({ where: { id: wardNumber } });
//       if (!ward) return badRequest(res, `Ward ${wardNumber} not found`);
//       ward_id = ward.id;
//     }

//     const passwordHash = await bcrypt.hash(password, 10);
//     const user = await prisma.user.create({
//       data: { email, full_name: name, phone, role, ward_id, password_hash: passwordHash },
//       select: { id: true, email: true, full_name: true, role: true, ward_id: true },
//     });
//     created(res, user);
//   } catch (e) { serverError(res, e); }
// });

// // PATCH /api/users/:id
// router.patch('/:id', requireMinRole('MUNICIPAL_OFFICER'), async (req: Request, res: Response) => {
//   try {
//     const { name, phone, role, wardNumber, isActive, password } = req.body;
//     const updateData: any = {};
//     if (name !== undefined)     updateData.full_name     = name;
//     if (phone !== undefined)    updateData.phone    = phone;
//     if (role !== undefined)     updateData.role     = role;
//     if (isActive !== undefined) updateData.is_active = isActive;
//     if (password)               updateData.password_hash = await bcrypt.hash(password, 10);
//     if (wardNumber !== undefined && wardNumber !== null) {
//       const wardId = Number(wardNumber);
//       const ward = await prisma.ward.findUnique({ where: { id: wardId } });
//       if (ward) updateData.ward_id = ward.id;
//     }

//     const user = await prisma.user.update({
//       where:  { id: req.params.id },
//       data:   updateData,
//       select: { id: true, email: true, full_name: true, role: true, is_active: true },
//     });
//     res.json(user);
//   } catch (e) { serverError(res, e); }
// });

// export default router;
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
  email: z.string().email(),
  name: z.string().min(2),
  phone: z.string().optional(),
  role: z.enum([
    'CITIZEN',
    'FIELD_WORKER',
    'DEPT_HEAD',
    'MUNICIPAL_OFFICER',
    'CHAIRMAN',
    'SUPER_ADMIN',
  ]),
  wardNumber: z.number().int().optional(),
  password: z.string().min(8).default('Demo@1234'),
});

// GET /api/users
router.get(
  '/',
  requireMinRole('DEPT_HEAD'),
  async (req: Request, res: Response) => {
    try {
      const { page, limit, skip } = getPagination(req);

      const { role, search, wardId } =
        req.query as Record<string, string>;

      const where: any = {};

      if (role) where.role = role;

      if (wardId) {
        where.ward_id = Number(wardId);
      }

      if (search) {
        where.OR = [
          {
            full_name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ];
      }

      const [data, total] = await Promise.all([
        prisma.user.findMany({
          where,

          select: {
            id: true,
            email: true,
            full_name: true,
            phone: true,
            role: true,
            is_active: true,
            created_at: true,
            last_login_at: true,

            ward: {
              select: {
                id: true,
                name: true,
                name_bn: true,
              },
            },
          },

          orderBy: {
            created_at: 'desc',
          },

          skip,
          take: limit,
        }),

        prisma.user.count({ where }),
      ]);

      res.json(
        paginatedResponse(
          data,
          total,
          page,
          limit
        )
      );
    } catch (e) {
      serverError(res, e);
    }
  }
);

// GET /api/users/workers
router.get(
  '/workers',
  requireMinRole('DEPT_HEAD'),
  async (_req: Request, res: Response) => {
    try {
      const workers = await prisma.user.findMany({
        where: {
          role: 'FIELD_WORKER',
          is_active: true,
        },

        select: {
          id: true,
          full_name: true,
          email: true,

          ward: {
            select: {
              id: true,
              name: true,
              name_bn: true,
            },
          },
        },

        orderBy: {
          full_name: 'asc',
        },
      });

      res.json(workers);
    } catch (e) {
      serverError(res, e);
    }
  }
);

// GET /api/users/:id
router.get(
  '/:id',
  requireMinRole('DEPT_HEAD'),
  async (req: Request, res: Response) => {
    try {
      const user = await prisma.user.findUnique({
        where: {
          id: req.params.id,
        },

        select: {
          id: true,
          email: true,
          full_name: true,
          phone: true,
          role: true,
          is_active: true,
          created_at: true,
          last_login_at: true,

          ward: {
            select: {
              id: true,
              name: true,
              name_bn: true,
            },
          },
        },
      });

      if (!user) {
        return notFound(res, 'User not found');
      }

      res.json(user);
    } catch (e) {
      serverError(res, e);
    }
  }
);

// POST /api/users
router.post(
  '/',
  requireMinRole('MUNICIPAL_OFFICER'),
  validate(CreateUserSchema),
  async (req: Request, res: Response) => {
    try {
      const {
        email,
        name,
        phone,
        role,
        wardNumber,
        password,
      } = req.body;

      const existing = await prisma.user.findUnique({
        where: { email },
      });

      if (existing) {
        return badRequest(
          res,
          'Email already registered'
        );
      }

      let ward_id: number | null = null;

      if (wardNumber) {
        const ward = await prisma.ward.findUnique({
          where: {
            id: Number(wardNumber),
          },
        });

        if (!ward) {
          return badRequest(
            res,
            `Ward ${wardNumber} not found`
          );
        }

        ward_id = ward.id;
      }

      const password_hash = await bcrypt.hash(
        password,
        10
      );

      const user = await prisma.user.create({
        data: {
          email,
          full_name: name,
          phone,
          role,
          ward_id,
          password_hash,
        },

        select: {
          id: true,
          email: true,
          full_name: true,
          role: true,
          ward_id: true,
        },
      });

      created(res, user);
    } catch (e) {
      serverError(res, e);
    }
  }
);

// PATCH /api/users/:id
router.patch(
  '/:id',
  requireMinRole('MUNICIPAL_OFFICER'),
  async (req: Request, res: Response) => {
    try {
      const {
        name,
        phone,
        role,
        wardNumber,
        isActive,
        password,
      } = req.body;

      const updateData: any = {};

      if (name !== undefined) {
        updateData.full_name = name;
      }

      if (phone !== undefined) {
        updateData.phone = phone;
      }

      if (role !== undefined) {
        updateData.role = role;
      }

      if (isActive !== undefined) {
        updateData.is_active = isActive;
      }

      if (password) {
        updateData.password_hash =
          await bcrypt.hash(password, 10);
      }

      if (
        wardNumber !== undefined &&
        wardNumber !== null
      ) {
        const ward = await prisma.ward.findUnique({
          where: {
            id: Number(wardNumber),
          },
        });

        if (ward) {
          updateData.ward_id = ward.id;
        }
      }

      const user = await prisma.user.update({
        where: {
          id: req.params.id,
        },

        data: updateData,

        select: {
          id: true,
          email: true,
          full_name: true,
          role: true,
          is_active: true,
        },
      });

      res.json(user);
    } catch (e) {
      serverError(res, e);
    }
  }
);

export default router;