import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionService } from '../src/features/sessions/service';
import { createInMemoryRepository } from '../src/features/sessions/repository';
import { NotFoundError } from '../src/errors';
import { availableSpots, isFull, toStored } from '../src/features/sessions/mappers';
import type { SessionInput, SessionStored } from '../src/features/sessions/schemas';

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

const setup = () => {
  const repo = createInMemoryRepository();
  const service = createSessionService(repo);
  return { repo, service };
};

test('service.create returns a stored session with server-set fields populated', () => {
  const { service } = setup();
  const input = buildInput();

  const created = service.create(input);

  assert.match(created.id, UUID_RE);
  assert.equal(created.status, 'scheduled');
  assert.equal(created.bookedCount, 0);
  assert.ok(created.createdAt);
  assert.ok(created.updatedAt);
  assert.equal(created.title, input.title);
  assert.equal(created.type, input.type);
  assert.equal(created.capacity, input.capacity);
});

test('service.create persists the session to the repo', () => {
  const { repo, service } = setup();

  const created = service.create(buildInput());

  assert.deepEqual(repo.get(created.id), created);
});

test('service.list returns an empty array when no sessions exist', () => {
  const { service } = setup();

  assert.deepEqual(service.list(), []);
});

test('service.list returns all created sessions', () => {
  const { service } = setup();
  const a = service.create(buildInput({ title: 'A' }));
  const b = service.create(buildInput({ title: 'B' }));

  const all = service.list();

  assert.equal(all.length, 2);
  assert.ok(all.some((s) => s.id === a.id));
  assert.ok(all.some((s) => s.id === b.id));
});

test('service.get returns the session by id', () => {
  const { service } = setup();
  const created = service.create(buildInput());

  const found = service.get(created.id);

  assert.deepEqual(found, created);
});

test('service.get throws NotFoundError when the id is unknown', () => {
  const { service } = setup();

  assert.throws(() => service.get('00000000-0000-0000-0000-000000000000'), NotFoundError);
});

test('service.update applies input changes, bumps updatedAt, preserves server-set fields', async () => {
  const { service } = setup();
  const created = service.create(buildInput({ title: 'Before' }));

  // node:test uses sub-millisecond ticks; nudge the clock so updatedAt differs.
  await new Promise((resolve) => setTimeout(resolve, 5));

  const updated = service.update(created.id, buildInput({ title: 'After' }));

  assert.equal(updated.id, created.id);
  assert.equal(updated.title, 'After');
  assert.equal(updated.status, created.status);
  assert.equal(updated.bookedCount, created.bookedCount);
  assert.equal(updated.createdAt, created.createdAt);
  assert.notEqual(updated.updatedAt, created.updatedAt);
});

test('service.update throws NotFoundError when the id is unknown', () => {
  const { service } = setup();

  assert.throws(
    () => service.update('00000000-0000-0000-0000-000000000000', buildInput()),
    NotFoundError
  );
});

test('service.remove deletes the session', () => {
  const { service } = setup();
  const created = service.create(buildInput());

  service.remove(created.id);

  assert.throws(() => service.get(created.id), NotFoundError);
});

test('service.remove throws NotFoundError when the id is unknown', () => {
  const { service } = setup();

  assert.throws(
    () => service.remove('00000000-0000-0000-0000-000000000000'),
    NotFoundError
  );
});

const withCounts = (capacity: number, bookedCount: number): SessionStored => ({
  ...toStored(buildInput({ capacity })),
  bookedCount,
});

test('availableSpots = capacity - bookedCount', () => {
  assert.equal(availableSpots(withCounts(12, 3)), 9);
  assert.equal(availableSpots(withCounts(12, 0)), 12);
});

test('availableSpots is clamped to 0 when overbooked', () => {
  assert.equal(availableSpots(withCounts(12, 15)), 0);
});

test('isFull is true when bookedCount >= capacity', () => {
  assert.equal(isFull(withCounts(12, 12)), true);
  assert.equal(isFull(withCounts(12, 13)), true);
});

test('isFull is false when there are spots remaining', () => {
  assert.equal(isFull(withCounts(12, 11)), false);
  assert.equal(isFull(withCounts(12, 0)), false);
});
