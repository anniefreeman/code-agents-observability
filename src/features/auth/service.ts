import bcrypt from 'bcrypt';
import type { SignupInput, UserResponse } from './schemas';
import { createInMemoryRepository, type UserRepository } from './repository';
import { createPostgresRepository } from './repository.postgres';
import { getDb } from '../../db';
import * as mappers from './mappers';
import { DuplicateEmailError } from '../../errors';

// Cost factor for bcrypt. 10 is the library default and a reasonable
// production starting point. If signup latency or test speed becomes an issue,
// tune via env var — for now the constant is fine.
const BCRYPT_ROUNDS = 10;

export type AuthService = {
  signup(input: SignupInput): Promise<UserResponse>;
  verifyPassword(plaintext: string, hash: string): Promise<boolean>;
};

export const createAuthService = (repo: UserRepository): AuthService => ({
  signup: async (input) => {
    const existing = await repo.getByEmail(input.email);
    if (existing) {
      throw new DuplicateEmailError(`Email ${input.email} is already registered`);
    }
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const stored = mappers.toStored({
      email: input.email,
      passwordHash,
    });
    const saved = await repo.save(stored);
    return mappers.toResponse(saved);
  },

  verifyPassword: (plaintext, hash) => bcrypt.compare(plaintext, hash),
});

const db = getDb();
const userRepo: UserRepository = db
  ? createPostgresRepository(db)
  : createInMemoryRepository();

export const authService = createAuthService(userRepo);
