import type { SessionStored } from './schemas';

// Repository contract — the port the service depends on.
// In-memory today; a SQL-backed adapter would satisfy the same shape.
export type SessionRepository = {
  all(): SessionStored[];
  get(id: string): SessionStored | undefined;
  save(session: SessionStored): SessionStored;
  remove(id: string): boolean;
};

export const createInMemoryRepository = (): SessionRepository => {
  const sessions = new Map<string, SessionStored>();
  return {
    all: () => Array.from(sessions.values()),
    get: (id) => sessions.get(id),
    save: (session) => {
      sessions.set(session.id, session);
      return session;
    },
    remove: (id) => sessions.delete(id),
  };
};
