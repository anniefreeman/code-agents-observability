import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app';
import { WaitlistEntryResponseSchema } from '../src/features/waitlist/schemas';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const validSessionInput = (overrides: Record<string, unknown> = {}) => ({
  type: 'tennis' as const,
  title: 'Tennis night',
  startsAt: '2026-12-31T19:00:00.000Z',
  durationMinutes: 90,
  capacity: 12,
  location: { name: 'Albany Tennis Club' },
  hostName: 'Annie',
  ...overrides,
});

const createSession = async (overrides: Record<string, unknown> = {}): Promise<string> => {
  const r = await request(app).post('/sessions').send(validSessionInput(overrides));
  assert.equal(r.status, 201, 'session setup failed');
  return r.body.id;
};

// Create a session with capacity N and fill it with N confirmed bookings.
// Returns { sessionId, bookingIds } so tests can cancel a booking and verify
// auto-promotion. Uses unique attendee names to avoid the duplicate-booking
// guard.
const fillSession = async (
  capacity: number,
  prefix: string
): Promise<{ sessionId: string; bookingIds: string[] }> => {
  const sessionId = await createSession({ capacity });
  const bookingIds: string[] = [];
  for (let i = 0; i < capacity; i++) {
    const r = await request(app)
      .post('/bookings')
      .send({ sessionId, attendeeName: `${prefix}-filler-${i}` });
    assert.equal(r.status, 201, `filler booking ${i} failed`);
    bookingIds.push(r.body.id);
  }
  return { sessionId, bookingIds };
};

// ---------- POST /waitlist ----------

test('POST /waitlist on a full session returns 201 with status=waiting and position=1', async () => {
  const { sessionId } = await fillSession(1, 'wl-join');

  const r = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-join-eve' });

  assert.equal(r.status, 201);
  assert.doesNotThrow(() => WaitlistEntryResponseSchema.parse(r.body));
  assert.match(r.body.id, UUID_RE);
  assert.equal(r.body.sessionId, sessionId);
  assert.equal(r.body.attendeeName, 'wl-join-eve');
  assert.equal(r.body.status, 'waiting');
  assert.equal(r.body.position, 1);
  assert.equal(r.body.promotedAt, null);
  assert.equal(r.body.leftAt, null);
});

test('POST /waitlist on a session with open seats returns 409', async () => {
  const sessionId = await createSession({ capacity: 5 });

  const r = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-open-anyone' });

  assert.equal(r.status, 409);
});

test('POST /waitlist for a non-existent session returns 404', async () => {
  const r = await request(app)
    .post('/waitlist')
    .send({
      sessionId: '00000000-0000-0000-0000-000000000000',
      attendeeName: 'wl-ghost',
    });

  assert.equal(r.status, 404);
});

test('POST /waitlist with missing sessionId returns 400', async () => {
  const r = await request(app).post('/waitlist').send({ attendeeName: 'x' });
  assert.equal(r.status, 400);
});

test('POST /waitlist with unknown field returns 400 (strict mode)', async () => {
  const { sessionId } = await fillSession(1, 'wl-strict');

  const r = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-strict-x', foo: 'bar' });

  assert.equal(r.status, 400);
});

test('POST /waitlist rejects a duplicate waiting entry by the same attendee', async () => {
  const { sessionId } = await fillSession(1, 'wl-dup');

  const first = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-dup-carol' });
  assert.equal(first.status, 201);

  const dup = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-dup-carol' });
  assert.equal(dup.status, 409);
});

test('POST /waitlist allowed after leaving a previous entry', async () => {
  const { sessionId } = await fillSession(1, 'wl-rejoin');

  const first = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-rejoin-dee' });
  assert.equal(first.status, 201);

  const leave = await request(app).delete(`/waitlist/${first.body.id}`);
  assert.equal(leave.status, 204);

  const rejoin = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-rejoin-dee' });
  assert.equal(rejoin.status, 201);
  assert.equal(rejoin.body.position, 1);
});

// ---------- Position ordering ----------

test('Waitlist positions reflect join order', async () => {
  const { sessionId } = await fillSession(1, 'wl-pos');

  const a = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-pos-a' });
  const b = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-pos-b' });
  const c = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-pos-c' });

  assert.equal(a.body.position, 1);
  assert.equal(b.body.position, 2);
  assert.equal(c.body.position, 3);

  const list = await request(app).get('/waitlist').query({ sessionId });
  assert.equal(list.status, 200);
  const byName = Object.fromEntries(
    list.body.map((e: { attendeeName: string; position: number }) => [
      e.attendeeName,
      e.position,
    ])
  );
  assert.equal(byName['wl-pos-a'], 1);
  assert.equal(byName['wl-pos-b'], 2);
  assert.equal(byName['wl-pos-c'], 3);
});

// ---------- GET /waitlist ----------

test('GET /waitlist returns 200 and an array of WaitlistEntryResponses', async () => {
  const { sessionId } = await fillSession(1, 'wl-list');
  await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-list-x' });

  const r = await request(app).get('/waitlist');

  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body));
  for (const e of r.body) {
    assert.doesNotThrow(() => WaitlistEntryResponseSchema.parse(e));
  }
});

test('GET /waitlist?sessionId=X filters to that session only', async () => {
  const { sessionId: a } = await fillSession(1, 'wl-flt-a');
  const { sessionId: b } = await fillSession(1, 'wl-flt-b');

  await request(app).post('/waitlist').send({ sessionId: a, attendeeName: 'on-a' });
  await request(app).post('/waitlist').send({ sessionId: b, attendeeName: 'on-b' });

  const r = await request(app).get('/waitlist').query({ sessionId: a });

  assert.equal(r.status, 200);
  assert.equal(r.body.length, 1);
  assert.equal(r.body[0].sessionId, a);
});

test('GET /waitlist/:id for unknown id returns 404', async () => {
  const r = await request(app).get('/waitlist/00000000-0000-0000-0000-000000000000');
  assert.equal(r.status, 404);
});

// ---------- DELETE /waitlist/:id ----------

test('DELETE /waitlist/:id returns 204 and GET shows status=left, position=null', async () => {
  const { sessionId } = await fillSession(1, 'wl-leave');
  const joined = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-leave-gina' });

  const del = await request(app).delete(`/waitlist/${joined.body.id}`);
  assert.equal(del.status, 204);

  const after = await request(app).get(`/waitlist/${joined.body.id}`);
  assert.equal(after.status, 200);
  assert.equal(after.body.status, 'left');
  assert.ok(after.body.leftAt);
  assert.equal(after.body.position, null);
});

test('DELETE /waitlist/:id for unknown id returns 404', async () => {
  const r = await request(app).delete(
    '/waitlist/00000000-0000-0000-0000-000000000000'
  );
  assert.equal(r.status, 404);
});

// ---------- Auto-promotion on booking cancellation ----------

test('Cancelling a confirmed booking promotes the oldest waiting entry', async () => {
  const { sessionId, bookingIds } = await fillSession(1, 'wl-promo');

  const wA = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-promo-anna' });
  const wB = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-promo-bo' });
  assert.equal(wA.status, 201);
  assert.equal(wB.status, 201);

  // Cancel the only confirmed booking — Anna should be promoted.
  const cancel = await request(app).delete(`/bookings/${bookingIds[0]}`);
  assert.equal(cancel.status, 204);

  // Anna's waitlist entry is now 'promoted'.
  const annaAfter = await request(app).get(`/waitlist/${wA.body.id}`);
  assert.equal(annaAfter.status, 200);
  assert.equal(annaAfter.body.status, 'promoted');
  assert.ok(annaAfter.body.promotedAt);
  assert.equal(annaAfter.body.position, null);

  // Bo is still waiting and is now at position 1 (Anna is no longer waiting).
  const boAfter = await request(app).get(`/waitlist/${wB.body.id}`);
  assert.equal(boAfter.body.status, 'waiting');
  assert.equal(boAfter.body.position, 1);

  // A confirmed booking exists for Anna on this session.
  const annaBookings = await request(app)
    .get('/bookings')
    .query({ attendeeName: 'wl-promo-anna' });
  assert.equal(annaBookings.status, 200);
  const confirmed = annaBookings.body.filter(
    (b: { sessionId: string; status: string }) =>
      b.sessionId === sessionId && b.status === 'confirmed'
  );
  assert.equal(confirmed.length, 1);
});

test('Cancelling a booking on a session with no waitlist is a no-op for the queue', async () => {
  const sessionId = await createSession({ capacity: 2 });
  const booked = await request(app)
    .post('/bookings')
    .send({ sessionId, attendeeName: 'wl-noop-x' });
  assert.equal(booked.status, 201);

  const cancel = await request(app).delete(`/bookings/${booked.body.id}`);
  assert.equal(cancel.status, 204);

  // No entries on this session's queue.
  const r = await request(app).get('/waitlist').query({ sessionId });
  assert.equal(r.status, 200);
  assert.equal(r.body.length, 0);
});

test('Cancelling an already-cancelled booking does not promote', async () => {
  const { sessionId, bookingIds } = await fillSession(1, 'wl-double-cancel');
  const wA = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-dc-anna' });
  assert.equal(wA.status, 201);

  // First cancellation promotes Anna.
  await request(app).delete(`/bookings/${bookingIds[0]}`);
  const annaAfter1 = await request(app).get(`/waitlist/${wA.body.id}`);
  assert.equal(annaAfter1.body.status, 'promoted');

  // Add a second waiting entry, then re-cancel the already-cancelled booking.
  const wB = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-dc-bo' });
  assert.equal(wB.status, 201);

  await request(app).delete(`/bookings/${bookingIds[0]}`);

  // Bo must still be waiting — second cancel was a no-op for the queue.
  const boAfter = await request(app).get(`/waitlist/${wB.body.id}`);
  assert.equal(boAfter.body.status, 'waiting');
});

// ---------- Position numbering edge cases ----------

test('Positions shift up when an earlier waiting entry leaves', async () => {
  const { sessionId } = await fillSession(1, 'wl-leave-shift');
  const a = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-ls-a' });
  const b = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-ls-b' });
  const c = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-ls-c' });
  assert.equal(a.body.position, 1);
  assert.equal(b.body.position, 2);
  assert.equal(c.body.position, 3);

  // A leaves — B should now be 1, C should be 2.
  const del = await request(app).delete(`/waitlist/${a.body.id}`);
  assert.equal(del.status, 204);

  const bAfter = await request(app).get(`/waitlist/${b.body.id}`);
  const cAfter = await request(app).get(`/waitlist/${c.body.id}`);
  assert.equal(bAfter.body.position, 1);
  assert.equal(cAfter.body.position, 2);
});

test('Positions ignore terminal (left/promoted) entries interleaved with waiting', async () => {
  const { sessionId, bookingIds } = await fillSession(1, 'wl-mixed-pos');
  const a = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-mp-a' });
  const b = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-mp-b' });
  const c = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-mp-c' });

  // B leaves; cancelling the only booking then promotes A.
  await request(app).delete(`/waitlist/${b.body.id}`);
  await request(app).delete(`/bookings/${bookingIds[0]}`);

  const aAfter = await request(app).get(`/waitlist/${a.body.id}`);
  const bAfter = await request(app).get(`/waitlist/${b.body.id}`);
  const cAfter = await request(app).get(`/waitlist/${c.body.id}`);
  assert.equal(aAfter.body.status, 'promoted');
  assert.equal(aAfter.body.position, null);
  assert.equal(bAfter.body.status, 'left');
  assert.equal(bAfter.body.position, null);
  // C is the only still-waiting entry, so position must be 1 — terminal rows
  // (A promoted, B left) must be skipped, not counted.
  assert.equal(cAfter.body.status, 'waiting');
  assert.equal(cAfter.body.position, 1);
});

// ---------- Auto-promotion: capacity > 1 ----------

test('Multiple cancellations on a capacity>1 session promote the queue in FIFO order', async () => {
  const { sessionId, bookingIds } = await fillSession(3, 'wl-fifo');
  const w1 = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-fifo-a' });
  const w2 = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-fifo-b' });
  const w3 = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-fifo-c' });
  assert.equal(w1.body.position, 1);
  assert.equal(w2.body.position, 2);
  assert.equal(w3.body.position, 3);

  // Cancel one booking — only A promotes; B/C stay waiting, positions shift.
  await request(app).delete(`/bookings/${bookingIds[0]}`);
  const after1A = await request(app).get(`/waitlist/${w1.body.id}`);
  const after1B = await request(app).get(`/waitlist/${w2.body.id}`);
  const after1C = await request(app).get(`/waitlist/${w3.body.id}`);
  assert.equal(after1A.body.status, 'promoted');
  assert.equal(after1B.body.status, 'waiting');
  assert.equal(after1B.body.position, 1);
  assert.equal(after1C.body.status, 'waiting');
  assert.equal(after1C.body.position, 2);

  // Cancel a second booking — B promotes, C now at position 1.
  await request(app).delete(`/bookings/${bookingIds[1]}`);
  const after2A = await request(app).get(`/waitlist/${w1.body.id}`);
  const after2B = await request(app).get(`/waitlist/${w2.body.id}`);
  const after2C = await request(app).get(`/waitlist/${w3.body.id}`);
  assert.equal(after2A.body.status, 'promoted');
  assert.equal(after2B.body.status, 'promoted');
  assert.equal(after2C.body.status, 'waiting');
  assert.equal(after2C.body.position, 1);
});

test('Cancelling a booking when every waitlist entry has left is a no-op', async () => {
  const { sessionId, bookingIds } = await fillSession(1, 'wl-all-left');
  const a = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-al-a' });
  const b = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-al-b' });
  await request(app).delete(`/waitlist/${a.body.id}`);
  await request(app).delete(`/waitlist/${b.body.id}`);

  const cancel = await request(app).delete(`/bookings/${bookingIds[0]}`);
  assert.equal(cancel.status, 204);

  const aAfter = await request(app).get(`/waitlist/${a.body.id}`);
  const bAfter = await request(app).get(`/waitlist/${b.body.id}`);
  assert.equal(aAfter.body.status, 'left');
  assert.equal(bAfter.body.status, 'left');
});

// ---------- DELETE idempotency on terminal states ----------

test('DELETE /waitlist/:id on an already-left entry returns 204 and does not re-stamp leftAt', async () => {
  // Pins the documented "quiet no-op" behavior in service.ts:142-144.
  const { sessionId } = await fillSession(1, 'wl-double-leave');
  const e = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-dl-a' });

  const first = await request(app).delete(`/waitlist/${e.body.id}`);
  assert.equal(first.status, 204);
  const afterFirst = await request(app).get(`/waitlist/${e.body.id}`);
  assert.equal(afterFirst.body.status, 'left');
  const leftAt = afterFirst.body.leftAt;

  const second = await request(app).delete(`/waitlist/${e.body.id}`);
  assert.equal(second.status, 204);
  const afterSecond = await request(app).get(`/waitlist/${e.body.id}`);
  assert.equal(afterSecond.body.status, 'left');
  assert.equal(afterSecond.body.leftAt, leftAt);
});

test('DELETE /waitlist/:id on a promoted entry returns 204 and stays promoted', async () => {
  // Pins the documented "leave is a no-op on promoted entries" behavior in
  // service.ts:142-144 — the seat is theirs; they should cancel the booking
  // instead.
  const { sessionId, bookingIds } = await fillSession(1, 'wl-delete-promoted');
  const e = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-dp-a' });

  await request(app).delete(`/bookings/${bookingIds[0]}`);
  const beforeDel = await request(app).get(`/waitlist/${e.body.id}`);
  assert.equal(beforeDel.body.status, 'promoted');
  const promotedAt = beforeDel.body.promotedAt;

  const del = await request(app).delete(`/waitlist/${e.body.id}`);
  assert.equal(del.status, 204);

  const after = await request(app).get(`/waitlist/${e.body.id}`);
  assert.equal(after.body.status, 'promoted');
  assert.equal(after.body.leftAt, null);
  assert.equal(after.body.promotedAt, promotedAt);
});

// ---------- Duplicate-guard exact-match semantics ----------

test('Duplicate guard is exact-match: "Alice" and "alice" are treated as different attendees', async () => {
  // Pins current behavior (exact string match in service.ts:121-126). If
  // product later decides waitlist should be case-insensitive, this test
  // becomes the canary to flip.
  const { sessionId } = await fillSession(1, 'wl-case');
  const a = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'Alice' });
  assert.equal(a.status, 201);
  const b = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'alice' });
  assert.equal(b.status, 201);
});

test('Duplicate guard is exact-match: trailing whitespace is treated as a different attendee', async () => {
  // Same pinning intent as the casing test. attendeeName is not trimmed.
  const { sessionId } = await fillSession(1, 'wl-trim');
  const a = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'Bob' });
  assert.equal(a.status, 201);
  const b = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'Bob ' });
  assert.equal(b.status, 201);
});

// ---------- Input validation ----------

test('POST /waitlist with empty attendeeName returns 400', async () => {
  const { sessionId } = await fillSession(1, 'wl-empty-name');
  const r = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: '' });
  assert.equal(r.status, 400);
});

test('POST /waitlist with non-UUID sessionId returns 400', async () => {
  const r = await request(app)
    .post('/waitlist')
    .send({ sessionId: 'not-a-uuid', attendeeName: 'x' });
  assert.equal(r.status, 400);
});

// ---------- GET filters ----------

test('GET /waitlist?attendeeName=X filters to that attendee across sessions', async () => {
  const { sessionId: s1 } = await fillSession(1, 'wl-att-s1');
  const { sessionId: s2 } = await fillSession(1, 'wl-att-s2');
  await request(app).post('/waitlist').send({ sessionId: s1, attendeeName: 'wl-att-charlie' });
  await request(app).post('/waitlist').send({ sessionId: s2, attendeeName: 'wl-att-charlie' });
  await request(app).post('/waitlist').send({ sessionId: s1, attendeeName: 'wl-att-dora' });

  const r = await request(app).get('/waitlist').query({ attendeeName: 'wl-att-charlie' });

  assert.equal(r.status, 200);
  assert.equal(r.body.length, 2);
  for (const e of r.body) assert.equal(e.attendeeName, 'wl-att-charlie');
});

test('GET /waitlist with a non-UUID sessionId query returns 400', async () => {
  const r = await request(app).get('/waitlist').query({ sessionId: 'not-a-uuid' });
  assert.equal(r.status, 400);
});

// ---------- Concurrency ----------
//
// These tests pin desired behavior under concurrent requests. Both surface
// read-then-write races in the current in-memory service: the duplicate guard
// (service.ts:120-131) and promoteNext (service.ts:147-163) read state, decide,
// then write — with no lock or unique constraint between them. A real-world
// fix is a DB unique index + transactional promotion. These tests are kept as
// real assertions so the race is visible if/when it surfaces in CI; on a
// purely sequential microtask schedule they may still pass.

test('Two concurrent joins for the same attendee/session result in exactly one waiting entry', async () => {
  const { sessionId } = await fillSession(1, 'wl-race-join');

  const [r1, r2] = await Promise.all([
    request(app).post('/waitlist').send({ sessionId, attendeeName: 'wl-race-a' }),
    request(app).post('/waitlist').send({ sessionId, attendeeName: 'wl-race-a' }),
  ]);

  const statuses = [r1.status, r2.status].sort();
  assert.deepEqual(statuses, [201, 409], 'exactly one should succeed, the other should be a duplicate-conflict');

  const list = await request(app)
    .get('/waitlist')
    .query({ sessionId, attendeeName: 'wl-race-a' });
  assert.equal(list.body.length, 1);
});

test('Two concurrent booking cancellations promote two distinct waitlist entries', async () => {
  const { sessionId, bookingIds } = await fillSession(2, 'wl-race-promo');
  const a = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-rp-a' });
  const b = await request(app)
    .post('/waitlist')
    .send({ sessionId, attendeeName: 'wl-rp-b' });

  await Promise.all([
    request(app).delete(`/bookings/${bookingIds[0]}`),
    request(app).delete(`/bookings/${bookingIds[1]}`),
  ]);

  const aAfter = await request(app).get(`/waitlist/${a.body.id}`);
  const bAfter = await request(app).get(`/waitlist/${b.body.id}`);
  // Both must be promoted — a race that promotes A twice while leaving B
  // waiting is the exact failure mode this test is designed to catch.
  assert.equal(aAfter.body.status, 'promoted');
  assert.equal(bAfter.body.status, 'promoted');
});
