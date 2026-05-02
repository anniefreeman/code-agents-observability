import { z } from 'zod';
import { BookingInputSchema } from './input';

// Bookings use soft delete: cancellation flips status to 'cancelled' and sets
// cancelledAt. The row stays for audit / capacity history. Capacity counts
// only consider status === 'confirmed'.
const BookingStatusSchema = z.enum(['confirmed', 'cancelled']);

export const BookingStoredSchema = BookingInputSchema.extend({
  id: z.string().uuid(),
  status: BookingStatusSchema,
  createdAt: z.string().datetime(),
  cancelledAt: z.string().datetime().nullable(),
});

export type BookingStored = z.infer<typeof BookingStoredSchema>;
