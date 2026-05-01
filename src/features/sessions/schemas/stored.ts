import { z } from 'zod';
import { SessionInputSchema } from './input';

const SessionStatusSchema = z.enum(['scheduled', 'cancelled', 'completed']);

// Stored — Input plus server-set fields. Persistence types live here, not in store.ts.
export const SessionStoredSchema = SessionInputSchema.extend({
  id: z.string().uuid(),
  status: SessionStatusSchema,
  bookedCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type SessionStored = z.infer<typeof SessionStoredSchema>;
