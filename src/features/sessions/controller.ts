import type { Request, Response } from 'express';
import { SessionInputSchema } from './schemas';
import { sessionService } from './service';
import { toResponse } from './mappers';

type IdParam = { id: string };

export const list = (_req: Request, res: Response): void => {
  res.json(sessionService.list().map(toResponse));
};

export const get = (req: Request<IdParam>, res: Response): void => {
  res.json(toResponse(sessionService.get(req.params.id)));
};

export const create = (req: Request, res: Response): void => {
  const result = SessionInputSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid input', issues: result.error.issues });
    return;
  }
  const created = sessionService.create(result.data);
  res.status(201).json(toResponse(created));
};

export const update = (req: Request<IdParam>, res: Response): void => {
  const result = SessionInputSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid input', issues: result.error.issues });
    return;
  }
  const updated = sessionService.update(req.params.id, result.data);
  res.json(toResponse(updated));
};

export const remove = (req: Request<IdParam>, res: Response): void => {
  sessionService.remove(req.params.id);
  res.status(204).end();
};
