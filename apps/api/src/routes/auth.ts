import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { serverError, badRequest } from '../utils/response';

const router = Router();

const JWT_SECRET =
  process.env.JWT_SECRET || 'dev-secret-change-me';

const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';

const ACCESS_EXPIRY = '8h';
const REFRESH_EXPIRY = '7d';

function signTokens(user: {
  id: string;
  email: string;
  role: string;
  ward_id: number | null;
  full_name: string;
}) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    ward_id: user.ward_id,
    full_name: user.full_name,
  };

  return {
    accessToken: jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_EXPIRY,
    }),

    refreshToken: jwt.sign(
      { id: user.id },
      JWT_REFRESH_SECRET,
      {
        expiresIn: REFRESH_EXPIRY,
      }
    ),
  };
}

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// LOGIN
router.post(
  '/login',
  validate(LoginSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({
        where: {
          email: email.toLowerCase().trim(),
        },

        select: {
          id: true,
          email: true,
          password_hash: true,
          role: true,
          ward_id: true,
          full_name: true,
          is_active: true,
        },
      });
      
      if (!user) {
        return res.status(401).json({
          error: 'Invalid credentials',
        });
      }

      if (!user.is_active) {
        return res.status(401).json({
          error: 'Account inactive',
        });
      }

      const valid = await bcrypt.compare(
        password,
        user.password_hash
      );
      

      if (!valid) {
        return res.status(401).json({
          error: 'Invalid credentials',
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          last_login_at: new Date(),
        },
      });

      const { accessToken, refreshToken } =
        signTokens(user);

      res.json({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          ward_id: user.ward_id,
          full_name: user.full_name,
        },
      });
    } catch (e) {
      serverError(res, e);
    }
  }
);

// REFRESH
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return badRequest(res, 'Refresh token required');
  }

  try {
    const payload = jwt.verify(
      refreshToken,
      JWT_REFRESH_SECRET
    ) as { id: string };

    const user = await prisma.user.findUnique({
      where: {
        id: payload.id,
      },
      select: {
        id: true,
        email: true,
        role: true,
        ward_id: true,
        full_name: true,
        is_active: true,
      },
    });

    if (!user || !user.is_active) {
      return res.status(401).json({
        error: 'User not found',
      });
    }

    const tokens = signTokens(user);

    res.json(tokens);
  } catch {
    res.status(401).json({
      error: 'Invalid refresh token',
    });
  }
});

// LOGOUT
router.post(
  '/logout',
  authenticate,
  (_req: Request, res: Response) => {
    res.json({
      message: 'Logged out successfully',
    });
  }
);

// CURRENT USER
router.get(
  '/me',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const user = await prisma.user.findUnique({
        where: {
          id: req.user!.id,
        },
        select: {
          id: true,
          email: true,
          full_name: true,
          phone: true,
          role: true,
          ward_id: true,
          avatar_url: true,
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

      res.json(user);
    } catch (e) {
      serverError(res, e);
    }
  }
);

// CHANGE PASSWORD
router.patch(
  '/change-password',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } =
        req.body;

      if (!currentPassword || !newPassword) {
        return badRequest(
          res,
          'Both passwords required'
        );
      }

      if (newPassword.length < 8) {
        return badRequest(
          res,
          'Password must be at least 8 characters'
        );
      }

      const user = await prisma.user.findUnique({
        where: {
          id: req.user!.id,
        },
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
        });
      }

      const valid = await bcrypt.compare(
        currentPassword,
        user.password_hash
      );

      if (!valid) {
        return res.status(401).json({
          error: 'Current password incorrect',
        });
      }

      const hash = await bcrypt.hash(
        newPassword,
        10
      );

      await prisma.user.update({
        where: {
          id: req.user!.id,
        },
        data: {
          password_hash: hash,
        },
      });

      res.json({
        message: 'Password changed successfully',
      });
    } catch (e) {
      serverError(res, e);
    }
  }
);

export default router;