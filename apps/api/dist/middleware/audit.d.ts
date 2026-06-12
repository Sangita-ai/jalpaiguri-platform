import { Request, Response, NextFunction } from 'express';
export declare function auditLog(action: string, entityType: string): (req: Request, _res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=audit.d.ts.map