import { z } from 'zod';
import { SessionInputSchema } from './input';

const SessionStatusSchema = z.enum(['scheduled', 'cancelled', 'completed']);

// Stored — Input plus server-set fields. Persistence types live here, not in
// repository.ts. bookedCount is NOT stored — it's derived from confirmed
// booking records via the BookingsPort and added at the Response layer.
export const SessionStoredSchema = SessionInputSchema.extend({
  id: z.string().uuid(),
  status: SessionStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type SessionStored = z.infer<typeof SessionStoredSchema>;
