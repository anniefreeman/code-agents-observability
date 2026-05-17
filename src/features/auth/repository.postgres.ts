import { eq } from 'drizzle-orm';
import type { UserStored } from './schemas';
import type { UserRepository } from './repository';
import { users } from '../../db/schema/users';
import type { Db } from '../../db';

type Row = typeof users.$inferSelect;

const toIso = (pgTimestamp: string): string => new Date(pgTimestamp).toISOString();

const toStored = (row: Row): UserStored => ({
  id: row.id,
  email: row.email,
  passwordHash: row.passwordHash,
  createdAt: toIso(row.createdAt),
});

export const createPostgresRepository = (db: Db): UserRepository => ({
  all: async () => (await db.select().from(users)).map(toStored),

  get: async (id) => {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return rows[0] ? toStored(rows[0]) : undefined;
  },

  getByEmail: async (email) => {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return rows[0] ? toStored(rows[0]) : undefined;
  },

  // Plain insert — no upsert. Updates aren't a thing for users in this slice
  // (no profile editing yet). The unique-index on email is the concurrency
  // safety net for the service's pre-insert duplicate check.
  save: async (user) => {
    const [row] = await db.insert(users).values(user).returning();
    return toStored(row);
  },
});
