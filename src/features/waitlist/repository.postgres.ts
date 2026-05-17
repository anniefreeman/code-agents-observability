import { eq } from 'drizzle-orm';
import type { WaitlistEntryStored } from './schemas';
import type { WaitlistRepository } from './repository';
import { waitlistEntries } from '../../db/schema/waitlist';
import type { Db } from '../../db';

type Row = typeof waitlistEntries.$inferSelect;

const toIso = (pgTimestamp: string): string => new Date(pgTimestamp).toISOString();

const toStored = (row: Row): WaitlistEntryStored => ({
  id: row.id,
  sessionId: row.sessionId,
  attendeeName: row.attendeeName,
  status: row.status,
  createdAt: toIso(row.createdAt),
  promotedAt: row.promotedAt === null ? null : toIso(row.promotedAt),
  leftAt: row.leftAt === null ? null : toIso(row.leftAt),
});

export const createPostgresRepository = (db: Db): WaitlistRepository => ({
  all: async () => (await db.select().from(waitlistEntries)).map(toStored),

  get: async (id) => {
    const rows = await db
      .select()
      .from(waitlistEntries)
      .where(eq(waitlistEntries.id, id))
      .limit(1);
    return rows[0] ? toStored(rows[0]) : undefined;
  },

  save: async (entry) => {
    // Upsert covers join (insert) and the terminal-state transitions
    // (promote / leave) — both written through save().
    const [row] = await db
      .insert(waitlistEntries)
      .values(entry)
      .onConflictDoUpdate({
        target: waitlistEntries.id,
        set: {
          status: entry.status,
          promotedAt: entry.promotedAt,
          leftAt: entry.leftAt,
        },
      })
      .returning();
    return toStored(row);
  },
});
