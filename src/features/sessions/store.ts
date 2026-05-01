import type { SessionStored } from './schemas';

const sessions = new Map<string, SessionStored>();

export const all = (): SessionStored[] => Array.from(sessions.values());

export const get = (id: string): SessionStored | undefined => sessions.get(id);

// save covers both create and update — the store doesn't care which.
// The controller decides whether the caller is creating new or updating
// existing (by calling get first).
export const save = (session: SessionStored): SessionStored => {
  sessions.set(session.id, session);
  return session;
};

export const remove = (id: string): boolean => sessions.delete(id);
