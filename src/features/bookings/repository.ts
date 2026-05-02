import type { BookingStored } from './schemas';

// Repository contract. No remove() — bookings are soft-deleted (status flips
// to 'cancelled' via save). A future hard-delete flow would add it.
export type BookingRepository = {
  all(): BookingStored[];
  get(id: string): BookingStored | undefined;
  save(booking: BookingStored): BookingStored;
};

export const createInMemoryRepository = (): BookingRepository => {
  const bookings = new Map<string, BookingStored>();
  return {
    all: () => Array.from(bookings.values()),
    get: (id) => bookings.get(id),
    save: (booking) => {
      bookings.set(booking.id, booking);
      return booking;
    },
  };
};
