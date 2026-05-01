import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { SessionStoredSchema } from './stored';

extendZodWithOpenApi(z);

// Response — Stored plus computed fields. What clients actually see.
export const SessionResponseSchema = SessionStoredSchema.extend({
  availableSpots: z.number().int().nonnegative(),
  isFull: z.boolean(),
}).openapi('Session');

export type SessionResponse = z.infer<typeof SessionResponseSchema>;
