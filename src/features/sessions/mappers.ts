import { randomUUID } from 'node:crypto';
import type { SessionInput, SessionStored, SessionResponse } from './schemas';

// Translate a validated client input into a fresh stored session.
// Server-controlled fields (id, status, timestamps) are set here. bookedCount
// is not stored — it's derived from booking records at response time.
export const toStored = (input: SessionInput): SessionStored => {
  const now = new Date().toISOString();
  return {
    ...input,
    id: randomUUID(),
    status: 'scheduled',
    createdAt: now,
    updatedAt: now,
  };
};

// Apply a validated input to an existing stored session.
// Server-controlled fields (id, createdAt, status) are preserved; updatedAt
// is bumped.
export const applyUpdate = (
  existing: SessionStored,
  input: SessionInput
): SessionStored => ({
  ...existing,
  ...input,
  id: existing.id,
  status: existing.status,
  createdAt: existing.createdAt,
  updatedAt: new Date().toISOString(),
});

// Domain predicates. Take a (capacity, bookedCount) pair so callers can use
// them with a count from any source — typically the BookingsPort.
export const availableSpots = (capacity: number, bookedCount: number): number =>
  Math.max(0, capacity - bookedCount);

export const isFull = (capacity: number, bookedCount: number): boolean =>
  bookedCount >= capacity;

// Translate a stored session into the response shape, adding the bookedCount
// (derived externally — typically from the BookingsPort) and the predicates.
export const toResponse = (
  stored: SessionStored,
  bookedCount: number
): SessionResponse => ({
  ...stored,
  bookedCount,
  availableSpots: availableSpots(stored.capacity, bookedCount),
  isFull: isFull(stored.capacity, bookedCount),
});
