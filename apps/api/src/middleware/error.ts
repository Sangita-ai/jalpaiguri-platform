import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Zod validation
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Generic Error
  const message =
    err instanceof Error
      ? err.message
      : 'Internal server error';

  const status =
    typeof err === 'object' &&
    err !== null &&
    'status' in err
      ? Number((err as any).status)
      : 500;

  if (status >= 500) {
    console.error('[Server Error]', err);
  }

  return res.status(status).json({
    error: message,
  });
}
