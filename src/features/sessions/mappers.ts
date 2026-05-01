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

// Translate a stored session into the response shape, adding computed fields.
export const toResponse = (stored: SessionStored): SessionResponse => ({
  ...stored,
  availableSpots: Math.max(0, stored.capacity - stored.bookedCount),
  isFull: stored.bookedCount >= stored.capacity,
});
