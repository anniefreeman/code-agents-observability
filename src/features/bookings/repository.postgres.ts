import { eq } from 'drizzle-orm';
import type { BookingStored } from './schemas';
import type { BookingRepository } from './repository';
import { bookings } from '../../db/schema/bookings';
import type { Db } from '../../db';

// Postgres adapter for BookingRepository. Same contract as the in-memory
// adapter.

type Row = typeof bookings.$inferSelect;

// Normalise Postgres timestamptz ("YYYY-MM-DD HH:MM:SS+TZ") to ISO 8601.
const toIso = (pgTimestamp: string): string => new Date(pgTimestamp).toISOString();

const toStored = (row: Row): BookingStored => ({
  id: row.id,
  sessionId: row.sessionId,
  attendeeName: row.attendeeName,
  status: row.status,
  createdAt: toIso(row.createdAt),
  cancelledAt: row.cancelledAt === null ? null : toIso(row.cancelledAt),
});

export const createPostgresRepository = (db: Db): BookingRepository => ({
  all: async () => (await db.select().from(bookings)).map(toStored),

  get: async (id) => {
    const rows = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    return rows[0] ? toStored(rows[0]) : undefined;
  },

  save: async (booking) => {
    // Upsert covers both create and cancel (cancel flips status + cancelledAt
    // via mappers.cancel, then saves).
    const [row] = await db
      .insert(bookings)
      .values(booking)
      .onConflictDoUpdate({
        target: bookings.id,
        set: {
          status: booking.status,
          cancelledAt: booking.cancelledAt,
        },
      })
      .returning();
    return toStored(row);
  },
});
