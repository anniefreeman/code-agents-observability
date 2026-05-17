import { pgTable, uuid, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { sessions } from './sessions';

// Mirror the zod WaitlistEntryStored shape.
//
// 'waiting'  — initial state, eligible for promotion when a seat frees up
// 'promoted' — a booking cancellation freed a seat and this entry was
//              converted into a confirmed booking (booking row created
//              separately; this entry is terminal)
// 'left'     — attendee explicitly withdrew from the waitlist

export const waitlistStatusEnum = pgEnum('waitlist_status', [
  'waiting',
  'promoted',
  'left',
]);

export const waitlistEntries = pgTable(
  'waitlist_entries',
  {
    id: uuid('id').primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'restrict' }),
    attendeeName: text('attendee_name').notNull(),
    status: waitlistStatusEnum('status').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
    promotedAt: timestamp('promoted_at', { withTimezone: true, mode: 'string' }),
    leftAt: timestamp('left_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => ({
    // Most reads are "oldest waiting entry for session X" (promotion) and
    // "all entries for session X" (listing). One btree covers both.
    sessionIdx: index('waitlist_session_id_idx').on(table.sessionId),
  })
);
