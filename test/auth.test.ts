import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app';
import { UserResponseSchema } from '../src/features/auth/schemas';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

// Each test uses a unique email to avoid cross-test contamination via the
// in-memory adapter's singleton — same pattern as bookings/waitlist tests.
const uniqueEmail = (label: string) =>
  `auth-${label}-${Math.random().toString(36).slice(2, 10)}@example.com`;

const validSignup = (overrides: Record<string, unknown> = {}) => ({
  email: uniqueEmail('signup'),
  password: 'correct-horse-battery',
  ...overrides,
});

test('POST /auth/signup with valid credentials returns 201 and a UserResponse', async () => {
  const payload = validSignup();

  const r = await request(app).post('/auth/signup').send(payload);

  assert.equal(r.status, 201);
  assert.doesNotThrow(() => UserResponseSchema.parse(r.body));
  assert.match(r.body.id, UUID_RE);
  assert.equal(r.body.email, payload.email);
  assert.match(r.body.createdAt, ISO_RE);

  // Critical: the response must never leak the password (plaintext or hashed).
  assert.equal(r.body.password, undefined, 'response must not echo plaintext password');
  assert.equal(r.body.passwordHash, undefined, 'response must not leak the hash');
});

test('POST /auth/signup with malformed email returns 400', async () => {
  const r = await request(app)
    .post('/auth/signup')
    .send({ email: 'not-an-email', password: 'correct-horse-battery' });

  assert.equal(r.status, 400);
});

test('POST /auth/signup with missing email returns 400', async () => {
  const r = await request(app)
    .post('/auth/signup')
    .send({ password: 'correct-horse-battery' });

  assert.equal(r.status, 400);
});

test('POST /auth/signup with password shorter than 8 chars returns 400', async () => {
  const r = await request(app)
    .post('/auth/signup')
    .send({ email: uniqueEmail('short'), password: 'short' });

  assert.equal(r.status, 400);
});

test('POST /auth/signup with an unknown field returns 400 (strict mode)', async () => {
  // Mass-assignment protection — the input schema must reject extra fields
  // so a client can't sneak in role='admin' or id=... at signup time.
  const r = await request(app)
    .post('/auth/signup')
    .send({ ...validSignup(), role: 'admin' });

  assert.equal(r.status, 400);
});

test('POST /auth/signup with a duplicate email returns 409', async () => {
  const email = uniqueEmail('dup');

  const first = await request(app)
    .post('/auth/signup')
    .send({ email, password: 'correct-horse-battery' });
  assert.equal(first.status, 201);

  const dup = await request(app)
    .post('/auth/signup')
    .send({ email, password: 'a-different-password' });
  assert.equal(dup.status, 409);
});
