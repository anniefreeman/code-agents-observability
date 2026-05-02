import type { Request, Response } from 'express';
import { SessionInputSchema } from './schemas';
import { sessionService } from './service';

type IdParam = { id: string };

export const list = async (_req: Request, res: Response): Promise<void> => {
  res.json(await sessionService.list());
};

export const get = async (req: Request<IdParam>, res: Response): Promise<void> => {
  res.json(await sessionService.get(req.params.id));
};

export const create = async (req: Request, res: Response): Promise<void> => {
  const result = SessionInputSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid input', issues: result.error.issues });
    return;
  }
  res.status(201).json(await sessionService.create(result.data));
};

export const update = async (req: Request<IdParam>, res: Response): Promise<void> => {
  const result = SessionInputSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid input', issues: result.error.issues });
    return;
  }
  res.json(await sessionService.update(req.params.id, result.data));
};

export const remove = async (req: Request<IdParam>, res: Response): Promise<void> => {
  await sessionService.remove(req.params.id);
  res.status(204).end();
};
