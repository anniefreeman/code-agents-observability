import { randomUUID } from 'node:crypto';
import type { UserStored, UserResponse } from './schemas';

// Pure transforms — no I/O. Hashing happens in the service (async) before
// calling toStored, which keeps this module deterministic and easy to unit
// test in isolation.

export const toStored = (input: {
  email: string;
  passwordHash: string;
}): UserStored => ({
  id: randomUUID(),
  email: input.email,
  passwordHash: input.passwordHash,
  createdAt: new Date().toISOString(),
});

export const toResponse = (stored: UserStored): UserResponse => ({
  id: stored.id,
  email: stored.email,
  createdAt: stored.createdAt,
});
