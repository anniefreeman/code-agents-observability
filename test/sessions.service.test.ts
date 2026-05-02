import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionService, type BookingsPort } from '../src/features/sessions/service';
import { createInMemoryRepository } from '../src/features/sessions/repository';
import { NotFoundError } from '../src/errors';
import { availableSpots, isFull } from '../src/features/sessions/mappers';
import type { SessionInput } from '../src/features/sessions/schemas';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const buildInput = (overrides: Partial<SessionInput> = {}): SessionInput => ({
  type: 'tennis',
  title: 'Tennis night',
  startsAt: '2026-12-31T19:00:00.000Z',
  durationMinutes: 90,
  capacity: 12,
  location: { name: 'Albany Tennis Club' },
  hostName: 'Annie',
  ...overrides,
});

// Stub port — defaults to "no bookings exist". Individual tests can override
// the count to exercise bookedCount-derived response fields.
const makePort = (count = 0): BookingsPort => ({
  countConfirmed: async () => count,
});

const setup = (port: BookingsPort = makePort()) => {
  const repo = createInMemoryRepository();
  const service = createSessionService(repo, port);
  return { repo, service };
};

test('service.create returns a Response with server-set fields populated', async () => {
  const { service } = setup();
  const input = buildInput();

  const created = await service.create(input);

  assert.match(created.id, UUID_RE);
  assert.equal(created.status, 'scheduled');
  assert.equal(created.bookedCount, 0);
  assert.equal(created.availableSpots, input.capacity);
  assert.equal(created.isFull, false);
  assert.ok(created.createdAt);
  assert.ok(created.updatedAt);
  assert.equal(created.title, input.title);
  assert.equal(created.type, input.type);
  assert.equal(created.capacity, input.capacity);
});

test('service.create persists the session to the repo (Stored shape, no bookedCount)', async () => {
  const { repo, service } = setup();

  const created = await service.create(buildInput());
  const stored = repo.get(created.id);

  assert.ok(stored);
  assert.equal(stored.id, created.id);
  // Stored shape no longer carries bookedCount — derived at the Response layer.
  assert.equal('bookedCount' in stored, false);
});

test('service.list returns an empty array when no sessions exist', async () => {
  const { service } = setup();

  assert.deepEqual(await service.list(), []);
});

test('service.list returns all created sessions', async () => {
  const { service } = setup();
  const a = await service.create(buildInput({ title: 'A' }));
  const b = await service.create(buildInput({ title: 'B' }));

  const all = await service.list();

  assert.equal(all.length, 2);
  assert.ok(all.some((s) => s.id === a.id));
  assert.ok(all.some((s) => s.id === b.id));
});

test('service.get returns the Response by id', async () => {
  const { service } = setup();
  const created = await service.create(buildInput());

  const found = await service.get(created.id);

  assert.deepEqual(found, created);
});

test('service.get throws NotFoundError when the id is unknown', async () => {
  const { service } = setup();

  await assert.rejects(
    () => service.get('00000000-0000-0000-0000-000000000000'),
    NotFoundError
  );
});

test('service.update applies input changes, bumps updatedAt, preserves server-set fields', async () => {
  const { service } = setup();
  const created = await service.create(buildInput({ title: 'Before' }));

  await new Promise((resolve) => setTimeout(resolve, 5));

  const updated = await service.update(created.id, buildInput({ title: 'After' }));

  assert.equal(updated.id, created.id);
  assert.equal(updated.title, 'After');
  assert.equal(updated.status, created.status);
  assert.equal(updated.createdAt, created.createdAt);
  assert.notEqual(updated.updatedAt, created.updatedAt);
});

test('service.update throws NotFoundError when the id is unknown', async () => {
  const { service } = setup();

  await assert.rejects(
    () => service.update('00000000-0000-0000-0000-000000000000', buildInput()),
    NotFoundError
  );
});

test('service.remove deletes the session', async () => {
  const { service } = setup();
  const created = await service.create(buildInput());

  await service.remove(created.id);

  await assert.rejects(() => service.get(created.id), NotFoundError);
});

test('service.remove throws NotFoundError when the id is unknown', async () => {
  const { service } = setup();

  await assert.rejects(
    () => service.remove('00000000-0000-0000-0000-000000000000'),
    NotFoundError
  );
});

test('Response.bookedCount/availableSpots/isFull reflect the BookingsPort count', async () => {
  const { service } = setup(makePort(8));
  const created = await service.create(buildInput({ capacity: 12 }));

  assert.equal(created.bookedCount, 8);
  assert.equal(created.availableSpots, 4);
  assert.equal(created.isFull, false);
});

test('Response.isFull is true when bookings reach capacity', async () => {
  const { service } = setup(makePort(12));
  const created = await service.create(buildInput({ capacity: 12 }));

  assert.equal(created.isFull, true);
  assert.equal(created.availableSpots, 0);
});

test('availableSpots = capacity - bookedCount', () => {
  assert.equal(availableSpots(12, 3), 9);
  assert.equal(availableSpots(12, 0), 12);
});

test('availableSpots is clamped to 0 when overbooked', () => {
  assert.equal(availableSpots(12, 15), 0);
});

test('isFull is true when bookedCount >= capacity', () => {
  assert.equal(isFull(12, 12), true);
  assert.equal(isFull(12, 13), true);
});

test('isFull is false when there are spots remaining', () => {
  assert.equal(isFull(12, 11), false);
  assert.equal(isFull(12, 0), false);
});
