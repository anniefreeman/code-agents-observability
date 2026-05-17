import type {
  WaitlistEntryInput,
  WaitlistEntryResponse,
  WaitlistEntryStored,
} from './schemas';
import { createInMemoryRepository, type WaitlistRepository } from './repository';
import { createPostgresRepository } from './repository.postgres';
import { getDb } from '../../db';
import * as mappers from './mappers';
import {
  NotFoundError,
  SessionNotFullError,
  DuplicateWaitlistError,
  SessionNotJoinableError,
} from '../../errors';
// Namespace imports for cross-feature services so this module stays cheap to
// import — the actual singletons are resolved at call time, dodging the
// cyclic-init pitfall that bookings/sessions also dance around.
import * as sessions from '../sessions/service';
import * as bookings from '../bookings/service';

// Waitlist's typed view of a session. Same shape bookings carries — only the
// fields needed to decide "is this session full?". Declared locally so the
// waitlist feature isn't coupled to the sessions schema.
export type SessionForWaitlist = {
  id: string;
  capacity: number;
  status: 'scheduled' | 'cancelled' | 'completed';
};

export type SessionsPort = {
  getSession(id: string): Promise<SessionForWaitlist>;
};

// Waitlist's typed view of bookings. We need two operations:
//   - countConfirmed: decide if the session is actually full
//   - createConfirmed: turn a promoted waitlist entry into a real booking
// The create path bypasses BookingService.create's full-session check because
// promotion happens *after* a seat frees up — using the public create() would
// race against the very capacity check it just freed up from.
export type BookingsPort = {
  countConfirmed(sessionId: string): Promise<number>;
  createConfirmedFromPromotion(
    sessionId: string,
    attendeeName: string
  ): Promise<void>;
};

export type WaitlistService = {
  list(filter?: { sessionId?: string; attendeeName?: string }): Promise<
    WaitlistEntryResponse[]
  >;
  get(id: string): Promise<WaitlistEntryResponse>;
  join(input: WaitlistEntryInput): Promise<WaitlistEntryResponse>;
  leave(id: string): Promise<void>;
  // Called by bookings when a confirmed booking is cancelled. Promotes the
  // oldest 'waiting' entry on the session into a confirmed booking. No-op
  // when the queue is empty. Returns the promoted entry if any.
  promoteNext(sessionId: string): Promise<WaitlistEntryStored | null>;
};

// Build a session-scoped queue, ordered by createdAt, of entries currently
// in 'waiting'. Position lookup uses this ordering.
const waitingFor = (
  all: WaitlistEntryStored[],
  sessionId: string
): WaitlistEntryStored[] =>
  all
    .filter((e) => e.sessionId === sessionId && e.status === 'waiting')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

export const createWaitlistService = (
  repo: WaitlistRepository,
  sessionsPort: SessionsPort,
  bookingsPort: BookingsPort
): WaitlistService => {
  const respond = async (
    entry: WaitlistEntryStored
  ): Promise<WaitlistEntryResponse> => {
    if (entry.status !== 'waiting') return mappers.toResponse(entry, null);
    const queue = waitingFor(await repo.all(), entry.sessionId);
    const idx = queue.findIndex((e) => e.id === entry.id);
    return mappers.toResponse(entry, idx === -1 ? null : idx + 1);
  };

  return {
    list: async (filter) => {
      const all = await repo.all();
      const filtered = all.filter((e) => {
        if (filter?.sessionId && e.sessionId !== filter.sessionId) return false;
        if (filter?.attendeeName && e.attendeeName !== filter.attendeeName)
          return false;
        return true;
      });
      return Promise.all(filtered.map(respond));
    },

    get: async (id) => {
      const found = await repo.get(id);
      if (!found) throw new NotFoundError(`Waitlist entry ${id} not found`);
      return respond(found);
    },

    join: async (input) => {
      // 1. Session must exist. Throws NotFoundError → 404.
      const session = await sessionsPort.getSession(input.sessionId);

      if (session.status !== 'scheduled') {
        throw new SessionNotJoinableError(
          `Session ${input.sessionId} is ${session.status}`
        );
      }

      // 2. Only join the waitlist when the session is actually full. If a
      //    seat is open, the client should hit POST /bookings instead. We
      //    return 409 (not 400) to mirror "can't queue here right now".
      const confirmed = await bookingsPort.countConfirmed(input.sessionId);
      if (confirmed < session.capacity) {
        throw new SessionNotFullError(
          `Session ${input.sessionId} has open seats — book directly`
        );
      }

      // 3. Don't queue the same attendee twice on the same session. Terminal
      //    entries ('left', 'promoted') don't block — leaving and rejoining,
      //    or rejoining after a prior promotion was cancelled, is allowed.
      const all = await repo.all();
      const duplicate = all.find(
        (e) =>
          e.sessionId === input.sessionId &&
          e.attendeeName === input.attendeeName &&
          e.status === 'waiting'
      );
      if (duplicate) {
        throw new DuplicateWaitlistError(
          `${input.attendeeName} is already on the waitlist for session ${input.sessionId}`
        );
      }

      const saved = await repo.save(mappers.toStored(input));
      return respond(saved);
    },

    leave: async (id) => {
      const existing = await repo.get(id);
      if (!existing) throw new NotFoundError(`Waitlist entry ${id} not found`);
      // Idempotent on terminal states: re-leaving a 'left' entry is a no-op
      // 204, and trying to 'leave' an already-promoted entry quietly succeeds
      // (the seat is theirs — they should cancel the booking instead).
      if (existing.status !== 'waiting') return;
      await repo.save(mappers.leave(existing));
    },

    promoteNext: async (sessionId) => {
      // Bail silently if the session is no longer scheduled — promotion is
      // invoked by the bookings cancel hook, which shouldn't blow up just
      // because the session was cancelled between booking and cancellation.
      const session = await sessionsPort.getSession(sessionId);
      if (session.status !== 'scheduled') return null;

      const queue = waitingFor(await repo.all(), sessionId);
      const next = queue[0];
      if (!next) return null;

      // Flip the entry to 'promoted' first, then create the booking. If the
      // booking insert fails the entry stays 'promoted' — that's the lesser
      // evil compared to a duplicate promotion if we did it in the other
      // order and the entry-save crashed. A real-world implementation would
      // wrap both in a transaction; the in-memory adapter has no notion of
      // one, so we accept the asymmetry here and document it.
      const promoted = await repo.save(mappers.promote(next));
      await bookingsPort.createConfirmedFromPromotion(
        promoted.sessionId,
        promoted.attendeeName
      );
      return promoted;
    },
  };
};

// In-process adapters. Same lazy resolution pattern as the sessions/bookings
// pair — capture the function, not the export, so module-load order doesn't
// matter.
const sessionsPort: SessionsPort = {
  getSession: async (id) => {
    const s = await sessions.sessionService.get(id);
    return { id: s.id, capacity: s.capacity, status: s.status };
  },
};

const bookingsPort: BookingsPort = {
  countConfirmed: async (sessionId) => {
    const all = await bookings.bookingService.list();
    return all.filter(
      (b) => b.sessionId === sessionId && b.status === 'confirmed'
    ).length;
  },
  createConfirmedFromPromotion: async (sessionId, attendeeName) => {
    await bookings.createBookingFromPromotion(sessionId, attendeeName);
  },
};

const db = getDb();
const waitlistRepo: WaitlistRepository = db
  ? createPostgresRepository(db)
  : createInMemoryRepository();

export const waitlistService = createWaitlistService(
  waitlistRepo,
  sessionsPort,
  bookingsPort
);
