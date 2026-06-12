import { Response } from 'express';

export function ok(res: Response, data: unknown, status = 200) {
  return res.status(status).json(data);
}

export function created(res: Response, data: unknown) {
  return res.status(201).json(data);
}

export function notFound(res: Response, msg = 'Not found') {
  return res.status(404).json({ error: msg });
}

export function badRequest(res: Response, msg: string) {
  return res.status(400).json({ error: msg });
}

export function forbidden(res: Response, msg = 'Forbidden') {
  return res.status(403).json({ error: msg });
}

export function serverError(res: Response, err: unknown) {
  const msg = err instanceof Error ? err.message : 'Internal server error';
  console.error('[API Error]', err);
  return res.status(500).json({ error: msg });
}
