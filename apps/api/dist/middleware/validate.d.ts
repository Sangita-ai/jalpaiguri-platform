import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
export declare function validate(schema: ZodSchema, target?: 'body' | 'query' | 'params'): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
//# sourceMappingURL=validate.d.ts.map