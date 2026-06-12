import { Request, Response, NextFunction } from "express";
export type Role = "CITIZEN" | "FIELD_WORKER" | "DEPT_HEAD" | "MUNICIPAL_OFFICER" | "CHAIRMAN" | "SUPER_ADMIN";
export declare function requireRole(...roles: Role[]): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
export declare function requireMinRole(minRole: Role): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
//# sourceMappingURL=rbac.d.ts.map