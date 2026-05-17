import type { UserStored } from './schemas';

// getByEmail is the duplicate-signup check today; it's also what login will
// call next slice. Email is the natural key — id is just for stable references
// from other tables.
export type UserRepository = {
  all(): Promise<UserStored[]>;
  get(id: string): Promise<UserStored | undefined>;
  getByEmail(email: string): Promise<UserStored | undefined>;
  save(user: UserStored): Promise<UserStored>;
};

export const createInMemoryRepository = (): UserRepository => {
  const users = new Map<string, UserStored>();
  return {
    all: async () => Array.from(users.values()),
    get: async (id) => users.get(id),
    getByEmail: async (email) =>
      Array.from(users.values()).find((u) => u.email === email),
    save: async (user) => {
      users.set(user.id, user);
      return user;
    },
  };
};
