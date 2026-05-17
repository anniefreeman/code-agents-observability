import { pgTable, uuid, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

// Mirror the zod UserStored shape. Email is the natural key (used by login
// and by the duplicate-signup check); the DB unique constraint is the safety
// net for concurrent signups racing past the service-layer read check.

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex('users_email_unique_idx').on(table.email),
  })
);
