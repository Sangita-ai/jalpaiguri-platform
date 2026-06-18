// import { Request, Response, NextFunction } from 'express';
// import { prisma } from '../utils/prisma';

// export function auditLog(action: string, entityType: string) {
//   return async (
//     req: Request,
//     _res: Response,
//     next: NextFunction
//   ) => {
//     const userId = req.user?.id;

//     if (!userId) {
//       return next();
//     }

//     const entityId = req.params?.id;

//     setImmediate(() => {
//       prisma.auditLog.create({
//         data: {
//           user_id: userId,
//           action,
//           entity_type: entityType,
//           entity_id: entityId ?? null,

//           new_values: req.body
//             ? JSON.parse(JSON.stringify(req.body))
//             : null,

//           ip_address: req.ip ?? null,

//           user_agent:
//             req.headers['user-agent']?.toString() ?? null,
//         },
//       }).catch(() => {});
//     });

//     next();
//   };
// }

import { Request, Response, NextFunction } from 'express';
import { AuditAction } from '@prisma/client';
import { prisma } from '../utils/prisma';

export function auditLog(
  action: AuditAction,
  entityType: string
) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ) => {
    const userId = req.user?.id;

    if (!userId) return next();

    setImmediate(() => {
      prisma.auditLog.create({
        data: {
          user_id: userId,
          action,
          entity_type: entityType,
        },
      }).catch(() => {});
    });

    next();
  };
}