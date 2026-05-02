import type { BookingInput, BookingStored } from './schemas';
import { createInMemoryRepository, type BookingRepository } from './repository';
import * as mappers from './mappers';
import { NotFoundError, CapacityFullError, DuplicateBookingError } from '../../errors';
// Namespace import (not destructured) so the sessions module is referenced
// lazily — sessions/service.ts also imports this module, and we must not
// capture an export at module-load time when the other side may still be
// initialising.
import * as sessions from '../sessions/service';

// Bookings' typed view of a session. Today this is satisfied by an in-process
// adapter wrapping sessionService.get; tomorrow when sessions extracts into
// its own service, the same port is satisfied by an HTTP-backed adapter.
// Booking code (and tests) doesn't change either day.
//
// We declare a local structural type instead of importing SessionStored to
// keep features decoupled at the schema level (per CLAUDE.md). This shape is
// the SDK contract — only the fields bookings actually needs from sessions.
export type SessionForBooking = {
  id: string;
  capacity: number;
  status: 'scheduled' | 'cancelled' | 'completed';
};

export type SessionsPort = {
  // Throws NotFoundError if the id doesn't resolve.
  getSession(id: string): Promise<SessionForBooking>;
};

export type BookingListFilter = {
  attendeeName?: string;
};

export type BookingService = {
  list(filter?: BookingListFilter): Promise<BookingStored[]>;
  get(id: string): Promise<BookingStored>;
  create(input: BookingInput): Promise<BookingStored>;
  remove(id: string): Promise<void>;
};

export const createBookingService = (
  repo: BookingRepository,
  sessions: SessionsPort
): BookingService => ({
  list: async (filter) => {
    const all = repo.all();
    if (filter?.attendeeName !== undefined) {
      return all.filter((b) => b.attendeeName === filter.attendeeName);
    }
    return all;
  },
  get: async (id) => {
    const found = repo.get(id);
    if (!found) throw new NotFoundError(`Booking ${id} not found`);
    return found;
  },
  create: async (input) => {
    // 1. Session must exist. sessions.getSession throws NotFoundError if not,
    //    which the controller's middleware translates into 404.
    const session = await sessions.getSession(input.sessionId);

    // 2. Capacity is derived from confirmed booking records (option 4b in the
    //    design doc). bookedCount on the session schema is ignored for now;
    //    the source of truth is this filter over the booking repo.
    const confirmedForSession = repo
      .all()
      .filter((b) => b.sessionId === input.sessionId && b.status === 'confirmed');

    if (confirmedForSession.length >= session.capacity) {
      throw new CapacityFullError(`Session ${input.sessionId} is full`);
    }

    // 3. Uniqueness: an attendee can only hold one confirmed booking per
    //    session. Cancelled bookings don't count, so cancelling and rebooking
    //    is allowed.
    const duplicate = confirmedForSession.find(
      (b) => b.attendeeName === input.attendeeName
    );
    if (duplicate) {
      throw new DuplicateBookingError(
        `${input.attendeeName} already has a confirmed booking on session ${input.sessionId}`
      );
    }

    return repo.save(mappers.toStored(input));
  },
  remove: async (id) => {
    const existing = repo.get(id);
    if (!existing) throw new NotFoundError(`Booking ${id} not found`);
    repo.save(mappers.cancel(existing));
  },
});

// In-process adapter for the SessionsPort. When sessions extracts into its
// own service, this is the only place that changes — replace the body with
// an HTTP-backed call. Booking service code is unchanged.
const sessionsPort: SessionsPort = {
  getSession: async (id) => {
    const s = await sessions.sessionService.get(id);
    return { id: s.id, capacity: s.capacity, status: s.status };
  },
};

// Default singleton wired with the in-memory repo + in-process sessions port.
export const bookingService = createBookingService(
  createInMemoryRepository(),
  sessionsPort
);
