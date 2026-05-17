import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

// Input — what a client may POST to join a session's waitlist. Mirrors the
// BookingInput shape on purpose: an attendee who tried to book a full session
// should be able to retry the same payload against /waitlist without rewiring.
//
// attendeeName is a stand-in for "user" until auth lands, matching bookings.
export const WaitlistEntryInputSchema = z
  .object({
    sessionId: z.string().uuid(),
    attendeeName: z.string().min(1),
  })
  .strict()
  .openapi('NewWaitlistEntry');

export type WaitlistEntryInput = z.infer<typeof WaitlistEntryInputSchema>;
