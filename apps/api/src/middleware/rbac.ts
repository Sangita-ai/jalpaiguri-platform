// apps/api/src/middleware/rbac.ts
import { Request, Response, NextFunction } from "express";

export type Role =
  | "CITIZEN"
  | "FIELD_WORKER"
  | "DEPT_HEAD"
  | "MUNICIPAL_OFFICER"
  | "CHAIRMAN"
  | "SUPER_ADMIN";

const ROLE_HIERARCHY: Record<Role, number> = {
  CITIZEN: 1,
  FIELD_WORKER: 2,
  DEPT_HEAD: 3,
  MUNICIPAL_OFFICER: 4,
  CHAIRMAN: 5,
  SUPER_ADMIN: 6,
};

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!roles.includes(req.user.role as Role)) {
      return res.status(403).json({
        error: "Insufficient permissions",
        required: roles,
        current: req.user.role,
      });
    }
    next();
  };
}

export function requireMinRole(minRole: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const userLevel = ROLE_HIERARCHY[req.user.role as Role] ?? 0;
    const minLevel = ROLE_HIERARCHY[minRole];
    if (userLevel < minLevel) {
      return res.status(403).json({
        error: "Insufficient permissions",
        required: `>= ${minRole}`,
        current: req.user.role,
      });
    }
    next();
  };
}
