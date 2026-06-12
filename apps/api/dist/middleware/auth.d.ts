import { Request, Response, NextFunction } from "express";
export interface AuthUser {
    id: string;
    email: string;
    role: string;
    wardId: string | null;
    name: string;
}
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}
export declare function authenticate(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>>>;
export declare function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=auth.d.ts.map