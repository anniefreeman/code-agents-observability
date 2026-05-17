import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { WaitlistEntryStoredSchema } from './stored';

extendZodWithOpenApi(z);

// Response = Stored + a computed `position` field. Position is the 1-based
// rank of this entry among the still-waiting entries on the same session,
// derived from createdAt order. It's null for entries that aren't 'waiting'
// (promoted or left have no queue position).
export const WaitlistEntryResponseSchema = WaitlistEntryStoredSchema.extend({
  position: z.number().int().positive().nullable(),
}).openapi('WaitlistEntry');

export type WaitlistEntryResponse = z.infer<typeof WaitlistEntryResponseSchema>;
