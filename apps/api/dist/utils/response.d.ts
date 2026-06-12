import { Response } from 'express';
export declare function ok(res: Response, data: unknown, status?: number): Response<any, Record<string, any>>;
export declare function created(res: Response, data: unknown): Response<any, Record<string, any>>;
export declare function notFound(res: Response, msg?: string): Response<any, Record<string, any>>;
export declare function badRequest(res: Response, msg: string): Response<any, Record<string, any>>;
export declare function forbidden(res: Response, msg?: string): Response<any, Record<string, any>>;
export declare function serverError(res: Response, err: unknown): Response<any, Record<string, any>>;
//# sourceMappingURL=response.d.ts.map