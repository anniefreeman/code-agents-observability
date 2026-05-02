import type { SessionInput, SessionResponse, SessionStored } from './schemas';
import { createInMemoryRepository, type SessionRepository } from './repository';
import * as mappers from './mappers';
import { NotFoundError } from '../../errors';
// Namespace import (not destructured) so the bookings module is referenced
// lazily — this module and bookings/service.ts import each other, and we
// must not capture an export at module-load time when the other side may
// still be initialising.
import * as bookings from '../bookings/service';

// Sessions' typed view of bookings. Today an in-process adapter; later an
// HTTP-backed adapter when bookings extracts. Mirrors the SessionsPort that
// bookings uses on us.
export type BookingsPort = {
  countConfirmed(sessionId: string): Promise<number>;
};

export type SessionService = {
  list(): Promise<SessionResponse[]>;
  get(id: string): Promise<SessionResponse>;
  create(input: SessionInput): Promise<SessionResponse>;
  update(id: string, input: SessionInput): Promise<SessionResponse>;
  remove(id: string): Promise<void>;
};

export const createSessionService = (
  repo: SessionRepository,
  bookingsPort: BookingsPort
): SessionService => {
  const respond = async (stored: SessionStored): Promise<SessionResponse> =>
    mappers.toResponse(stored, await bookingsPort.countConfirmed(stored.id));

  return {
    list: async () => Promise.all(repo.all().map(respond)),
    get: async (id) => {
      const found = repo.get(id);
      if (!found) throw new NotFoundError(`Session ${id} not found`);
      return respond(found);
    },
    create: async (input) => respond(repo.save(mappers.toStored(input))),
    update: async (id, input) => {
      const existing = repo.get(id);
      if (!existing) throw new NotFoundError(`Session ${id} not found`);
      return respond(repo.save(mappers.applyUpdate(existing, input)));
    },
    remove: async (id) => {
      if (!repo.remove(id)) throw new NotFoundError(`Session ${id} not found`);
    },
  };
};

// Default singleton wired with the in-memory repo + in-process bookings port.
// Lazy: bookings.bookingService is resolved at call time, not at construction,
// because bookings/service.ts also imports from this module. By the time any
// HTTP request fires, both modules are fully initialised.
const bookingsPort: BookingsPort = {
  countConfirmed: async (sessionId) => {
    const all = await bookings.bookingService.list();
    return all.filter((b) => b.sessionId === sessionId && b.status === 'confirmed')
      .length;
  },
};

export const sessionService = createSessionService(
  createInMemoryRepository(),
  bookingsPort
);
