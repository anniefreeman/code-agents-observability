import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAuthService } from '../src/features/auth/service';
import { createInMemoryRepository } from '../src/features/auth/repository';

// Service-level tests that probe behaviour the HTTP suite can't see directly —
// specifically, that the password is actually hashed before storage and that
// the resulting hash verifies. Same factory+in-mem-repo pattern as
// sessions/waitlist service tests.

const setup = () => {
  const repo = createInMemoryRepository();
  const service = createAuthService(repo);
  return { repo, service };
};

test('signup stores a hashed password, not the plaintext', async () => {
  const { repo, service } = setup();
  const password = 'correct-horse-battery';

  const user = await service.signup({
    email: 'hash-check@example.com',
    password,
  });

  const stored = await repo.getByEmail('hash-check@example.com');
  assert.ok(stored, 'user should be persisted');
  assert.notEqual(
    stored.passwordHash,
    password,
    'password must not be stored in plaintext'
  );
  // Response shape never includes the hash (defence in depth — also
  // covered at the HTTP layer).
  assert.equal((user as { passwordHash?: unknown }).passwordHash, undefined);
});

test('verifyPassword accepts the original plaintext against the stored hash', async () => {
  const { repo, service } = setup();
  const password = 'correct-horse-battery';

  await service.signup({ email: 'verify@example.com', password });
  const stored = await repo.getByEmail('verify@example.com');
  assert.ok(stored);

  // Proves the hash is a *valid* hash of the input, not just any string that
  // happens to be != plaintext. Wrong passwords must fail.
  assert.equal(await service.verifyPassword(password, stored.passwordHash), true);
  assert.equal(
    await service.verifyPassword('wrong-password', stored.passwordHash),
    false
  );
});
