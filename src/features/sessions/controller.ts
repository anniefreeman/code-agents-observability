import type { Request, Response } from 'express';
import { SessionInputSchema } from './schemas';
import * as store from './store';
import * as mappers from './mappers';

type IdParam = { id: string };

export const list = (_req: Request, res: Response): void => {
  res.json(store.all().map(mappers.toResponse));
};

export const get = (req: Request<IdParam>, res: Response): void => {
  const session = store.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(mappers.toResponse(session));
};

export const create = (req: Request, res: Response): void => {
  const result = SessionInputSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid input', issues: result.error.issues });
    return;
  }
  const stored = mappers.toStored(result.data);
  store.save(stored);
  res.status(201).json(mappers.toResponse(stored));
};

export const update = (req: Request<IdParam>, res: Response): void => {
  const existing = store.get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const result = SessionInputSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid input', issues: result.error.issues });
    return;
  }
  const updated = mappers.applyUpdate(existing, result.data);
  store.save(updated);
  res.json(mappers.toResponse(updated));
};

export const remove = (req: Request<IdParam>, res: Response): void => {
  if (!store.remove(req.params.id)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.status(204).end();
};
