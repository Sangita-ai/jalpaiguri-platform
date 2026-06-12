import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';

export function auditLog(action: string, entityType: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    // Fire-and-forget audit after route completes
    const userId = req.user?.id;
    if (!userId) return next();
    const entityId = req.params?.id;
    setImmediate(() => {
      prisma.auditLog.create({
        data: {
          userId,
          action,
          entityType,
          entityId: entityId || undefined,
          newValues: req.body ? JSON.parse(JSON.stringify(req.body)) : undefined,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] ?? undefined,
        },
      }).catch(() => {}); // non-blocking
    });
    next();
  };
}
