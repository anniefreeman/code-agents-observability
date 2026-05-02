import { randomUUID } from 'node:crypto';
import type { SessionInput, SessionStored, SessionResponse } from './schemas';

// Translate a validated client input into a fresh stored session.
// Server-controlled fields (id, status, bookedCount, timestamps) are set here.
export const toStored = (input: SessionInput): SessionStored => {
  const now = new Date().toISOString();
  return {
    ...input,
    id: randomUUID(),
    status: 'scheduled',
    bookedCount: 0,
    createdAt: now,
    updatedAt: now,
  };
};

// Apply a validated input to an existing stored session.
// Server-controlled fields (id, createdAt, status, bookedCount) are preserved;
// updatedAt is bumped.
export const applyUpdate = (
  existing: SessionStored,
  input: SessionInput
): SessionStored => ({
  ...existing,
  ...input,
  id: existing.id,
  status: existing.status,
  bookedCount: existing.bookedCount,
  createdAt: existing.createdAt,
  updatedAt: new Date().toISOString(),
});

// Domain predicates. Pulled out so the service can use them for capacity
// checks (e.g. once /bookings lands) without re-deriving the maths.
export const availableSpots = (s: SessionStored): number =>
  Math.max(0, s.capacity - s.bookedCount);

export const isFull = (s: SessionStored): boolean => s.bookedCount >= s.capacity;

// Translate a stored session into the response shape, adding computed fields.
export const toResponse = (stored: SessionStored): SessionResponse => ({
  ...stored,
  availableSpots: availableSpots(stored),
  isFull: isFull(stored),
});
