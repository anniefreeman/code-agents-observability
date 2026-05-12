import { pgTable, uuid, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { sessions } from './sessions';

// Mirror the zod BookingStored shape.

export const bookingStatusEnum = pgEnum('booking_status', ['confirmed', 'cancelled']);

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey(),
    // FK to sessions.id. We keep this a hard FK in the same database for now;
    // when sessions extracts into its own service, this becomes a soft
    // reference (UUID without a SQL constraint), since cross-service FKs
    // aren't enforceable.
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'restrict' }),
    attendeeName: text('attendee_name').notNull(),
    status: bookingStatusEnum('status').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => ({
    // Most service-side reads are "all confirmed bookings for session X"
    // (capacity check) and "all bookings for attendee Y" (filter endpoint).
    // Two cheap btree indexes cover both.
    sessionIdx: index('bookings_session_id_idx').on(table.sessionId),
    attendeeIdx: index('bookings_attendee_name_idx').on(table.attendeeName),
  })
);
