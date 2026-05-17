import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  createWaitlistService,
  type SessionsPort,
  type BookingsPort,
  type SessionForWaitlist,
} from '../src/features/waitlist/service';
import { createInMemoryRepository } from '../src/features/waitlist/repository';
import { NotFoundError } from '../src/errors';
import type { WaitlistEntryStored } from '../src/features/waitlist/schemas';

// Service-level tests for edge cases that the public HTTP surface can't
// reach today. Session status is not mutable via PUT /sessions (input schema
// has no status field), so cancelled/completed scenarios live here. Stubbed
// SessionsPort + BookingsPort let us simulate those states deterministically.

const makeSessionsPort = (session: SessionForWaitlist): SessionsPort => ({
  getSession: async (id) => {
    if (id !== session.id) throw new NotFoundError(`Session ${id} not found`);
    return session;
  },
});

const makeBookingsPort = (overrides: Partial<BookingsPort> = {}): BookingsPort => ({
  countConfirmed: async () => 0,
  createConfirmedFromPromotion: async () => {},
  ...overrides,
});

const setup = (opts: {
  session?: SessionForWaitlist;
  bookings?: Partial<BookingsPort>;
} = {}) => {
  const session: SessionForWaitlist =
    opts.session ?? { id: randomUUID(), capacity: 1, status: 'scheduled' };
  const repo = createInMemoryRepository();
  const service = createWaitlistService(
    repo,
    makeSessionsPort(session),
    makeBookingsPort(opts.bookings)
  );
  return { repo, service, session };
};

const seedWaiting = async (
  repo: { save: (e: WaitlistEntryStored) => Promise<WaitlistEntryStored> },
  sessionId: string,
  attendeeName: string
): Promise<WaitlistEntryStored> =>
  repo.save({
    id: randomUUID(),
    sessionId,
    attendeeName,
    status: 'waiting',
    createdAt: new Date().toISOString(),
    promotedAt: null,
    leftAt: null,
  });

// ---------- Joining a non-scheduled session ----------
//
// These two pin the *desired* behavior: a cancelled or completed session
// should reject waitlist joins. Current service.join only checks existence
// + capacity (service.ts:103-115), so these tests surface a real gap. They
// will fail until the service consults session.status.

test('join on a cancelled session is rejected (does not silently queue)', async () => {
  const { service, session } = setup({
    session: { id: randomUUID(), capacity: 1, status: 'cancelled' },
    // Stub: session is "full" so the capacity gate doesn't accidentally fire
    // first — we want to prove the *status* gate works on its own.
    bookings: { countConfirmed: async () => 1 },
  });

  await assert.rejects(
    () => service.join({ sessionId: session.id, attendeeName: 'late-joiner' }),
    'joining a cancelled session should throw'
  );
});

test('join on a completed session is rejected', async () => {
  const { service, session } = setup({
    session: { id: randomUUID(), capacity: 1, status: 'completed' },
    bookings: { countConfirmed: async () => 1 },
  });

  await assert.rejects(
    () => service.join({ sessionId: session.id, attendeeName: 'late-joiner' }),
    'joining a completed session should throw'
  );
});

// ---------- promoteNext on a non-scheduled session ----------

test('promoteNext on a cancelled session does not create a confirmed booking', async () => {
  // If a session has since been cancelled, draining the waitlist into new
  // confirmed bookings is wrong — there's no event to attend. Current
  // promoteNext (service.ts:147-163) doesn't re-check session status before
  // calling createConfirmedFromPromotion. This test will fail until it does.
  let bookingCalls = 0;
  const sessionId = randomUUID();
  const { repo, service } = setup({
    session: { id: sessionId, capacity: 1, status: 'cancelled' },
    bookings: {
      createConfirmedFromPromotion: async () => {
        bookingCalls += 1;
      },
    },
  });
  await seedWaiting(repo, sessionId, 'queued-before-cancel');

  await service.promoteNext(sessionId);

  assert.equal(bookingCalls, 0, 'no booking should be created on a cancelled session');
});

// ---------- promoteNext failure mode ----------

test('promoteNext leaves the entry as promoted when createConfirmedFromPromotion throws', async () => {
  // Pins the documented asymmetry at service.ts:151-159: the entry is
  // flipped to 'promoted' before the booking is inserted, so an insert
  // failure leaves a "promoted but no booking" row. A transactional rewrite
  // would change this — this test is the canary.
  const sessionId = randomUUID();
  const { repo, service } = setup({
    session: { id: sessionId, capacity: 1, status: 'scheduled' },
    bookings: {
      createConfirmedFromPromotion: async () => {
        throw new Error('simulated booking insert failure');
      },
    },
  });
  const seeded = await seedWaiting(repo, sessionId, 'promote-fails');

  await assert.rejects(
    () => service.promoteNext(sessionId),
    /simulated booking insert failure/
  );

  const after = await repo.get(seeded.id);
  assert.ok(after);
  assert.equal(after.status, 'promoted');
  assert.ok(after.promotedAt, 'promotedAt should be stamped before the booking attempt');
  assert.equal(after.leftAt, null);
});

test('promoteNext on an empty queue is a no-op and returns null', async () => {
  // Sanity check that wasn't covered head-on in the HTTP suite.
  const sessionId = randomUUID();
  let bookingCalls = 0;
  const { service } = setup({
    session: { id: sessionId, capacity: 1, status: 'scheduled' },
    bookings: {
      createConfirmedFromPromotion: async () => {
        bookingCalls += 1;
      },
    },
  });

  const result = await service.promoteNext(sessionId);

  assert.equal(result, null);
  assert.equal(bookingCalls, 0);
});
