import type { Request, Response } from 'express';
import * as store from './store';

type IdParam = { id: string };

export const list = (_req: Request, res: Response): void => {
  res.json(store.all());
};

export const get = (req: Request<IdParam>, res: Response): void => {
  const session = store.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(session);
};

export const create = (req: Request, res: Response): void => {
  const session = store.create(req.body);
  res.status(201).json(session);
};

export const update = (req: Request<IdParam>, res: Response): void => {
  const updated = store.update(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(updated);
};

export const remove = (req: Request<IdParam>, res: Response): void => {
  if (!store.remove(req.params.id)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.status(204).end();
};
