import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { SessionStoredSchema } from './stored';

extendZodWithOpenApi(z);

// Response — Stored plus computed fields. What clients actually see.
// bookedCount, availableSpots, and isFull are all derived from current
// booking state — they live here, not on Stored.
export const SessionResponseSchema = SessionStoredSchema.extend({
  bookedCount: z.number().int().nonnegative(),
  availableSpots: z.number().int().nonnegative(),
  isFull: z.boolean(),
}).openapi('Session');

export type SessionResponse = z.infer<typeof SessionResponseSchema>;
