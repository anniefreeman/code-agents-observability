import { randomUUID } from 'node:crypto';
import type { BookingInput, BookingStored, BookingResponse } from './schemas';

export const toStored = (input: BookingInput): BookingStored => ({
  ...input,
  id: randomUUID(),
  status: 'confirmed',
  createdAt: new Date().toISOString(),
  cancelledAt: null,
});

// Soft-delete: flip status, stamp cancelledAt. Idempotent on already-cancelled
// rows — service decides whether that's a domain error or a no-op.
export const cancel = (booking: BookingStored): BookingStored => ({
  ...booking,
  status: 'cancelled',
  cancelledAt: new Date().toISOString(),
});

export const toResponse = (stored: BookingStored): BookingResponse => stored;
