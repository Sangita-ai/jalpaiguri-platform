import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { serverError, badRequest } from '../utils/response';

const router = Router();

const JWT_SECRET         = process.env.JWT_SECRET         || 'dev-secret-change-me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
const ACCESS_EXPIRY      = '8h';
const REFRESH_EXPIRY     = '7d';

function signTokens(user: { id: string; email: string; role: string; wardId: string | null; name: string }) {
  const payload = { id: user.id, email: user.email, role: user.role, wardId: user.wardId, name: user.name };
  return {
    accessToken:  jwt.sign(payload, JWT_SECRET,         { expiresIn: ACCESS_EXPIRY }),
    refreshToken: jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY }),
  };
}

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/login
router.post('/login', validate(LoginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where:  { email: email.toLowerCase().trim() },
      select: { id: true, email: true, passwordHash: true, role: true, wardId: true, name: true, isActive: true },
    });

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.isActive) return res.status(401).json({ error: 'Account inactive. Contact administrator.' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const { accessToken, refreshToken } = signTokens(user);
    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role, wardId: user.wardId, name: user.name },
    });
  } catch (e) { serverError(res, e); }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return badRequest(res, 'Refresh token required');
  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { id: string };
    const user    = await prisma.user.findUnique({
      where:  { id: payload.id },
      select: { id: true, email: true, role: true, wardId: true, name: true, isActive: true },
    });
    if (!user || !user.isActive) return res.status(401).json({ error: 'User not found' });
    const tokens = signTokens(user);
    res.json(tokens);
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, (_req: Request, res: Response) => {
  // Stateless JWT — client removes tokens. Add blocklist here for stricter security.
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user!.id },
      select: {
        id: true, email: true, name: true, phone: true,
        role: true, wardId: true, avatarUrl: true, lastLoginAt: true,
        ward: { select: { name: true, wardNumber: true } },
      },
    });
    res.json(user);
  } catch (e) { serverError(res, e); }
});

// PATCH /api/auth/change-password
router.patch('/change-password', authenticate, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return badRequest(res, 'Both passwords required');
    if (newPassword.length < 8) return badRequest(res, 'New password must be at least 8 characters');

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Current password incorrect' });

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user!.id }, data: { passwordHash: hash } });
    res.json({ message: 'Password changed successfully' });
  } catch (e) { serverError(res, e); }
});

export default router;
