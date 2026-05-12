import { eq } from 'drizzle-orm';
import type { SessionStored } from './schemas';
import type { SessionRepository } from './repository';
import { sessions } from '../../db/schema/sessions';
import type { Db } from '../../db';

// Postgres adapter for SessionRepository. Same contract as the in-memory
// adapter; the service has no idea which one it's holding.
//
// Drizzle returns timestamp columns as ISO strings (we configured
// `mode: 'string'` in the schema) so no Date<->string conversion is needed.

type Row = typeof sessions.$inferSelect;

// Postgres returns timestamptz as native SQL format ("YYYY-MM-DD HH:MM:SS+TZ");
// the Stored shape expects ISO 8601. Normalise on the way out.
const toIso = (pgTimestamp: string): string => new Date(pgTimestamp).toISOString();

const toStored = (row: Row): SessionStored => ({
  id: row.id,
  type: row.type,
  title: row.title,
  description: row.description ?? undefined,
  startsAt: toIso(row.startsAt),
  durationMinutes: row.durationMinutes,
  capacity: row.capacity,
  location: row.location,
  hostName: row.hostName,
  priceCents: row.priceCents ?? undefined,
  status: row.status,
  createdAt: toIso(row.createdAt),
  updatedAt: toIso(row.updatedAt),
});

export const createPostgresRepository = (db: Db): SessionRepository => ({
  all: async () => (await db.select().from(sessions)).map(toStored),

  get: async (id) => {
    const rows = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
    return rows[0] ? toStored(rows[0]) : undefined;
  },

  save: async (session) => {
    // INSERT ... ON CONFLICT (id) DO UPDATE — covers both create and update,
    // matching the in-memory adapter's upsert semantics.
    const [row] = await db
      .insert(sessions)
      .values(session)
      .onConflictDoUpdate({
        target: sessions.id,
        set: {
          type: session.type,
          title: session.title,
          description: session.description ?? null,
          startsAt: session.startsAt,
          durationMinutes: session.durationMinutes,
          capacity: session.capacity,
          location: session.location,
          hostName: session.hostName,
          priceCents: session.priceCents ?? null,
          status: session.status,
          updatedAt: session.updatedAt,
        },
      })
      .returning();
    return toStored(row);
  },

  remove: async (id) => {
    const result = await db.delete(sessions).where(eq(sessions.id, id)).returning({ id: sessions.id });
    return result.length > 0;
  },
});
