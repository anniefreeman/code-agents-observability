import type { Request, Response } from 'express';
import { z } from 'zod';
import { WaitlistEntryInputSchema } from './schemas';
import { waitlistService } from './service';

type IdParam = { id: string };

// Query schema — filter by sessionId, attendeeName, or both. Mirrors the
// bookings filter style: unknown query keys are stripped (not strict).
const ListQuerySchema = z.object({
  sessionId: z.string().uuid().optional(),
  attendeeName: z.string().min(1).optional(),
});

export const list = async (req: Request, res: Response): Promise<void> => {
  const result = ListQuerySchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid query', issues: result.error.issues });
    return;
  }
  const entries = await waitlistService.list(result.data);
  res.json(entries);
};

export const get = async (req: Request<IdParam>, res: Response): Promise<void> => {
  const entry = await waitlistService.get(req.params.id);
  res.json(entry);
};

export const join = async (req: Request, res: Response): Promise<void> => {
  const result = WaitlistEntryInputSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid input', issues: result.error.issues });
    return;
  }
  const created = await waitlistService.join(result.data);
  res.status(201).json(created);
};

export const leave = async (
  req: Request<IdParam>,
  res: Response
): Promise<void> => {
  await waitlistService.leave(req.params.id);
  res.status(204).end();
};
