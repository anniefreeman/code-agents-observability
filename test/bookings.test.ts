import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app';
import { BookingResponseSchema } from '../src/features/bookings/schemas';

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

const validBookingInput = async (overrides: Record<string, unknown> = {}) => ({
  sessionId: await createSession(),
  attendeeName: 'Annie',
  ...overrides,
});

// ---------- POST /bookings ----------

test('POST /bookings with valid body returns 201 and a BookingResponse', async () => {
  const body = await validBookingInput();
  const r = await request(app).post('/bookings').send(body);

  assert.equal(r.status, 201);
  assert.doesNotThrow(() => BookingResponseSchema.parse(r.body));
  assert.match(r.body.id, UUID_RE);
  assert.equal(r.body.sessionId, body.sessionId);
  assert.equal(r.body.attendeeName, body.attendeeName);
  assert.equal(r.body.status, 'confirmed');
  assert.equal(r.body.cancelledAt, null);
  assert.ok(r.body.createdAt);
});

test('POST /bookings with missing sessionId returns 400', async () => {
  const r = await request(app).post('/bookings').send({ attendeeName: 'Annie' });

  assert.equal(r.status, 400);
  assert.ok(Array.isArray(r.body.issues));
});

test('POST /bookings with non-uuid sessionId returns 400', async () => {
  const r = await request(app)
    .post('/bookings')
    .send({ sessionId: 'not-a-uuid', attendeeName: 'Annie' });

  assert.equal(r.status, 400);
});

test('POST /bookings with unknown field returns 400 (strict mode)', async () => {
  const body = await validBookingInput();
  const r = await request(app).post('/bookings').send({ ...body, foo: 'bar' });

  assert.equal(r.status, 400);
});

test('POST /bookings rejects attempt to set server-controlled fields', async () => {
  const body = await validBookingInput();
  const r = await request(app)
    .post('/bookings')
    .send({ ...body, id: 'malicious', status: 'cancelled', createdAt: '2020-01-01T00:00:00.000Z' });

  assert.equal(r.status, 400);
});

test('POST /bookings for non-existent sessionId returns 404', async () => {
  const r = await request(app)
    .post('/bookings')
    .send({
      sessionId: '00000000-0000-0000-0000-000000000000',
      attendeeName: 'Annie',
    });

  assert.equal(r.status, 404);
});

test('POST /bookings for a full session returns 409', async () => {
  const sessionId = await createSession({ capacity: 1 });

  const first = await request(app)
    .post('/bookings')
    .send({ sessionId, attendeeName: 'Annie' });
  assert.equal(first.status, 201);

  const second = await request(app)
    .post('/bookings')
    .send({ sessionId, attendeeName: 'Bob' });
  assert.equal(second.status, 409);
});

test('POST /bookings rejects a duplicate confirmed booking by the same attendee', async () => {
  const sessionId = await createSession({ capacity: 5 });

  const first = await request(app)
    .post('/bookings')
    .send({ sessionId, attendeeName: 'Carol' });
  assert.equal(first.status, 201);

  const dup = await request(app)
    .post('/bookings')
    .send({ sessionId, attendeeName: 'Carol' });
  assert.equal(dup.status, 409);
});

test('POST /bookings allowed if a previous booking on the same session was cancelled', async () => {
  const sessionId = await createSession({ capacity: 5 });

  const first = await request(app)
    .post('/bookings')
    .send({ sessionId, attendeeName: 'Dee' });
  assert.equal(first.status, 201);

  const cancel = await request(app).delete(`/bookings/${first.body.id}`);
  assert.equal(cancel.status, 204);

  const rebook = await request(app)
    .post('/bookings')
    .send({ sessionId, attendeeName: 'Dee' });
  assert.equal(rebook.status, 201);
});

// ---------- GET /bookings ----------

test('GET /bookings returns 200 and an array of BookingResponses', async () => {
  const body = await validBookingInput({ attendeeName: 'Eve' });
  await request(app).post('/bookings').send(body);

  const r = await request(app).get('/bookings');

  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body));
  for (const b of r.body) {
    assert.doesNotThrow(() => BookingResponseSchema.parse(b));
  }
});

test('GET /bookings?attendeeName=X returns only bookings for that attendee', async () => {
  // Unique names to avoid bleed from other tests sharing the in-memory store.
  await request(app).post('/bookings').send(await validBookingInput({ attendeeName: 'Iris-1' }));
  await request(app).post('/bookings').send(await validBookingInput({ attendeeName: 'Iris-1' }));
  await request(app).post('/bookings').send(await validBookingInput({ attendeeName: 'Joe-1' }));

  const r = await request(app).get('/bookings').query({ attendeeName: 'Iris-1' });

  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body));
  assert.equal(r.body.length, 2);
  for (const b of r.body) {
    assert.equal(b.attendeeName, 'Iris-1');
  }
});

test('GET /bookings?attendeeName=Nobody returns an empty array', async () => {
  const r = await request(app).get('/bookings').query({ attendeeName: 'Nobody-Ever' });

  assert.equal(r.status, 200);
  assert.deepEqual(r.body, []);
});

test('GET /bookings?attendeeName=X includes cancelled bookings (full history)', async () => {
  const body = await validBookingInput({ attendeeName: 'Lou-1' });
  const created = await request(app).post('/bookings').send(body);
  await request(app).delete(`/bookings/${created.body.id}`);

  const r = await request(app).get('/bookings').query({ attendeeName: 'Lou-1' });

  assert.equal(r.status, 200);
  assert.equal(r.body.length, 1);
  assert.equal(r.body[0].status, 'cancelled');
});

test('GET /bookings/:id returns the BookingResponse', async () => {
  const body = await validBookingInput({ attendeeName: 'Frank' });
  const created = await request(app).post('/bookings').send(body);

  const r = await request(app).get(`/bookings/${created.body.id}`);

  assert.equal(r.status, 200);
  assert.doesNotThrow(() => BookingResponseSchema.parse(r.body));
  assert.equal(r.body.id, created.body.id);
});

test('GET /bookings/:id for unknown id returns 404', async () => {
  const r = await request(app).get('/bookings/00000000-0000-0000-0000-000000000000');

  assert.equal(r.status, 404);
});

// ---------- DELETE /bookings/:id ----------

test('DELETE /bookings/:id returns 204 and a subsequent GET shows status=cancelled', async () => {
  const body = await validBookingInput({ attendeeName: 'Gina' });
  const created = await request(app).post('/bookings').send(body);

  const del = await request(app).delete(`/bookings/${created.body.id}`);
  assert.equal(del.status, 204);

  const after = await request(app).get(`/bookings/${created.body.id}`);
  assert.equal(after.status, 200);
  assert.equal(after.body.status, 'cancelled');
  assert.ok(after.body.cancelledAt);
});

test('DELETE /bookings/:id for unknown id returns 404', async () => {
  const r = await request(app).delete('/bookings/00000000-0000-0000-0000-000000000000');

  assert.equal(r.status, 404);
});

// ---------- PUT not allowed ----------

test('PUT /bookings/:id is not registered', async () => {
  const body = await validBookingInput({ attendeeName: 'Hank' });
  const created = await request(app).post('/bookings').send(body);

  const r = await request(app)
    .put(`/bookings/${created.body.id}`)
    .send({ sessionId: created.body.sessionId, attendeeName: 'Hank' });

  // Express returns 404 for an unmatched (path, method) pair by default.
  assert.notEqual(r.status, 200);
  assert.notEqual(r.status, 201);
});
