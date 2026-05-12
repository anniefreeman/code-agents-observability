import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';

// Mirror the zod SessionStored shape. Drizzle column types are the SQL
// representation; mapping back to the JSON-friendly Stored shape happens in
// repository.postgres.ts (e.g. timestamps -> ISO strings).
//
// bookedCount is intentionally absent — it's derived from confirmed bookings
// at response time, not stored on the session row.

export const sessionTypeEnum = pgEnum('session_type', [
  'tennis',
  'pilates',
  'dance',
  'hike',
  'climb',
  'pottery',
]);

export const sessionStatusEnum = pgEnum('session_status', [
  'scheduled',
  'cancelled',
  'completed',
]);

// Location is a small object {name, address?, lat?, lng?}. JSONB keeps the
// schema flexible while still queryable; once a Venue feature exists this
// becomes a venue_id FK and Location moves to its own table.
export type StoredLocation = {
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
};

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey(),
  type: sessionTypeEnum('type').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  startsAt: timestamp('starts_at', { withTimezone: true, mode: 'string' }).notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  capacity: integer('capacity').notNull(),
  location: jsonb('location').$type<StoredLocation>().notNull(),
  hostName: text('host_name').notNull(),
  priceCents: integer('price_cents'),
  status: sessionStatusEnum('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull(),
});
