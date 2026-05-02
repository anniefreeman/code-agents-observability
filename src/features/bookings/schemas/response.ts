import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { BookingStoredSchema } from './stored';

extendZodWithOpenApi(z);

// Response shape mirrors Stored today — there are no booking-level computed
// fields (capacity etc. live on the session, not the booking). This file
// exists for symmetry with sessions and to leave room for future computed
// fields (e.g. a denormalised session summary, refundEligibleUntil).
export const BookingResponseSchema = BookingStoredSchema.openapi('Booking');

export type BookingResponse = z.infer<typeof BookingResponseSchema>;
