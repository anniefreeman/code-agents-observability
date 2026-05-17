import type { WaitlistEntryStored } from './schemas';

// Same upsert-by-id contract as bookings: state transitions (waiting →
// promoted, waiting → left) are expressed by saving a new version of the
// row, not by a dedicated method. Hard deletes aren't supported — terminal
// rows stay for audit and to back the attendee's history view.
export type WaitlistRepository = {
  all(): Promise<WaitlistEntryStored[]>;
  get(id: string): Promise<WaitlistEntryStored | undefined>;
  save(entry: WaitlistEntryStored): Promise<WaitlistEntryStored>;
};

export const createInMemoryRepository = (): WaitlistRepository => {
  const entries = new Map<string, WaitlistEntryStored>();
  return {
    all: async () => Array.from(entries.values()),
    get: async (id) => entries.get(id),
    save: async (entry) => {
      entries.set(entry.id, entry);
      return entry;
    },
  };
};
