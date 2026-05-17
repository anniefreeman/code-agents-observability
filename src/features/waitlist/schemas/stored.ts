import { z } from 'zod';
import { WaitlistEntryInputSchema } from './input';

// Soft delete + terminal-state model, same shape as bookings:
//   waiting  — initial; eligible for promotion when a seat frees up
//   promoted — converted into a confirmed booking (terminal)
//   left     — attendee withdrew (terminal)
const WaitlistStatusSchema = z.enum(['waiting', 'promoted', 'left']);

export const WaitlistEntryStoredSchema = WaitlistEntryInputSchema.extend({
  id: z.string().uuid(),
  status: WaitlistStatusSchema,
  createdAt: z.string().datetime(),
  promotedAt: z.string().datetime().nullable(),
  leftAt: z.string().datetime().nullable(),
});

export type WaitlistEntryStored = z.infer<typeof WaitlistEntryStoredSchema>;
