import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

// Input — what a client may POST. .strict() rejects unknown fields, which
// blocks mass-assignment of server-controlled fields (id, status, createdAt)
// because they don't exist on this schema at all.
//
// sessionId is stored as a UUID string, not a nested SessionInput, to keep
// bookings decoupled from the sessions feature's schema.
//
// attendeeName is a stand-in for "user" until auth lands. Bookings will be
// re-keyed to userId at that point.
export const BookingInputSchema = z
  .object({
    sessionId: z.string().uuid(),
    attendeeName: z.string().min(1),
  })
  .strict()
  .openapi('NewBooking');

export type BookingInput = z.infer<typeof BookingInputSchema>;
