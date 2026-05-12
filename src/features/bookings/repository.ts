import type { BookingStored } from './schemas';

// Repository contract. No remove() — bookings are soft-deleted (status flips
// to 'cancelled' via save). A future hard-delete flow would add it.
//
// Async-shaped because real adapters (Postgres) hit the network; the in-memory
// adapter satisfies the same Promise return type via Promise.resolve.
export type BookingRepository = {
  all(): Promise<BookingStored[]>;
  get(id: string): Promise<BookingStored | undefined>;
  save(booking: BookingStored): Promise<BookingStored>;
};

export const createInMemoryRepository = (): BookingRepository => {
  const bookings = new Map<string, BookingStored>();
  return {
    all: async () => Array.from(bookings.values()),
    get: async (id) => bookings.get(id),
    save: async (booking) => {
      bookings.set(booking.id, booking);
      return booking;
    },
  };
};
