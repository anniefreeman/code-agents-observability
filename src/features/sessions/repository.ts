import type { SessionStored } from './schemas';

// Repository contract — the port the service depends on. Async-shaped because
// real adapters (Postgres) hit the network; the in-memory adapter satisfies
// the same Promise return type via Promise.resolve.
export type SessionRepository = {
  all(): Promise<SessionStored[]>;
  get(id: string): Promise<SessionStored | undefined>;
  save(session: SessionStored): Promise<SessionStored>;
  remove(id: string): Promise<boolean>;
};

export const createInMemoryRepository = (): SessionRepository => {
  const sessions = new Map<string, SessionStored>();
  return {
    all: async () => Array.from(sessions.values()),
    get: async (id) => sessions.get(id),
    save: async (session) => {
      sessions.set(session.id, session);
      return session;
    },
    remove: async (id) => sessions.delete(id),
  };
};
