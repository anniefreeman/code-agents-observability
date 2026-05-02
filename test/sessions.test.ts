import { test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app';
import { SessionResponseSchema } from '../src/features/sessions/schemas';

const validInput = {
  type: 'tennis' as const,
  title: 'Tennis night',
  startsAt: '2026-12-31T19:00:00.000Z',
  durationMinutes: 90,
  capacity: 12,
  location: { name: 'Albany Tennis Club' },
  hostName: 'Annie',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

test('POST /sessions with valid body returns 201 and a SessionResponse', async () => {
  const r = await request(app).post('/sessions').send(validInput);

  assert.strictEqual(r.status, 201);
  assert.doesNotThrow(() => SessionResponseSchema.parse(r.body));
  assert.match(r.body.id, UUID_RE);
  assert.strictEqual(r.body.status, 'scheduled');
  assert.strictEqual(r.body.bookedCount, 0);
  assert.strictEqual(r.body.availableSpots, 12);
  assert.strictEqual(r.body.isFull, false);
  assert.ok(r.body.createdAt);
  assert.ok(r.body.updatedAt);
});

test('POST /sessions with missing required field returns 400', async () => {
  const { type: _omit, ...bad } = validInput;
  const r = await request(app).post('/sessions').send(bad);

  assert.strictEqual(r.status, 400);
  assert.ok(Array.isArray(r.body.issues));
});

test('POST /sessions with unknown field returns 400 (strict mode)', async () => {
  const r = await request(app).post('/sessions').send({ ...validInput, foo: 'bar' });

  assert.strictEqual(r.status, 400);
});

test('POST /sessions rejects attempt to set server-controlled fields', async () => {
  const r = await request(app).post('/sessions').send({
    ...validInput,
    id: 'malicious-id',
    status: 'completed',
    bookedCount: 9999,
  });

  assert.strictEqual(r.status, 400);
});

test('GET /sessions/:id returns the SessionResponse shape', async () => {
  const created = await request(app).post('/sessions').send(validInput);

  const r = await request(app).get(`/sessions/${created.body.id}`);

  assert.strictEqual(r.status, 200);
  assert.doesNotThrow(() => SessionResponseSchema.parse(r.body));
  assert.strictEqual(r.body.id, created.body.id);
});

test('GET /sessions returns 200 and an array of SessionResponses', async () => {
  await request(app).post('/sessions').send(validInput);

  const r = await request(app).get('/sessions');

  assert.strictEqual(r.status, 200);
  assert.ok(Array.isArray(r.body));
  assert.ok(r.body.length >= 1);
  for (const s of r.body) {
    assert.doesNotThrow(() => SessionResponseSchema.parse(s));
  }
});

test('PUT /sessions/:id preserves id and createdAt, updates updatedAt', async () => {
  const created = await request(app).post('/sessions').send(validInput);
  const before = created.body;

  await new Promise((resolve) => setTimeout(resolve, 5));

  const r = await request(app)
    .put(`/sessions/${before.id}`)
    .send({ ...validInput, title: 'Tennis matinee' });

  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.id, before.id);
  assert.strictEqual(r.body.title, 'Tennis matinee');
  assert.strictEqual(r.body.createdAt, before.createdAt);
  assert.notStrictEqual(r.body.updatedAt, before.updatedAt);
});

test('DELETE /sessions/:id removes a session and returns 204', async () => {
  const created = await request(app).post('/sessions').send(validInput);

  const r = await request(app).delete(`/sessions/${created.body.id}`);

  assert.strictEqual(r.status, 204);

  const after = await request(app).get(`/sessions/${created.body.id}`);
  assert.strictEqual(after.status, 404);
});

test('GET /sessions/:id reflects bookedCount derived from real confirmed bookings', async () => {
  const session = await request(app).post('/sessions').send({ ...validInput, capacity: 3 });
  await request(app)
    .post('/bookings')
    .send({ sessionId: session.body.id, attendeeName: 'Booker-A' });
  await request(app)
    .post('/bookings')
    .send({ sessionId: session.body.id, attendeeName: 'Booker-B' });

  const r = await request(app).get(`/sessions/${session.body.id}`);

  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.bookedCount, 2);
  assert.strictEqual(r.body.availableSpots, 1);
  assert.strictEqual(r.body.isFull, false);
});

test('GET /sessions/:id excludes cancelled bookings from bookedCount', async () => {
  const session = await request(app).post('/sessions').send({ ...validInput, capacity: 3 });
  const booking = await request(app)
    .post('/bookings')
    .send({ sessionId: session.body.id, attendeeName: 'Booker-C' });
  await request(app).delete(`/bookings/${booking.body.id}`);

  const r = await request(app).get(`/sessions/${session.body.id}`);

  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.bookedCount, 0);
  assert.strictEqual(r.body.availableSpots, 3);
});
