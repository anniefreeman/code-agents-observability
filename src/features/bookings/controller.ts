import type { Request, Response } from 'express';
import { z } from 'zod';
import { BookingInputSchema } from './schemas';
import { bookingService } from './service';
import { toResponse } from './mappers';

type IdParam = { id: string };

// Query schema — only attendeeName for now. Unknown query keys are stripped
// (not strict) so client tracking params (utm_*, etc.) don't 400.
const ListQuerySchema = z.object({
  attendeeName: z.string().min(1).optional(),
});

export const list = async (req: Request, res: Response): Promise<void> => {
  const result = ListQuerySchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid query', issues: result.error.issues });
    return;
  }
  const bookings = await bookingService.list(result.data);
  res.json(bookings.map(toResponse));
};

export const get = async (req: Request<IdParam>, res: Response): Promise<void> => {
  const booking = await bookingService.get(req.params.id);
  res.json(toResponse(booking));
};

export const create = async (req: Request, res: Response): Promise<void> => {
  const result = BookingInputSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid input', issues: result.error.issues });
    return;
  }
  const created = await bookingService.create(result.data);
  res.status(201).json(toResponse(created));
};

export const remove = async (req: Request<IdParam>, res: Response): Promise<void> => {
  await bookingService.remove(req.params.id);
  res.status(204).end();
};
