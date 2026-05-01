// Placeholder Session shape — will be replaced with proper schema-derived
// types in the next commit (the model-layer work).
export type Session = Record<string, unknown> & { id: string };

const sessions = new Map<string, Session>();
let nextId = 1;

export const all = (): Session[] => Array.from(sessions.values());

export const get = (id: string): Session | undefined => sessions.get(id);

export const create = (data: Record<string, unknown>): Session => {
  const id = String(nextId++);
  const session: Session = { ...data, id };
  sessions.set(id, session);
  return session;
};

export const update = (
  id: string,
  data: Record<string, unknown>
): Session | null => {
  const existing = sessions.get(id);
  if (!existing) return null;
  const updated: Session = { ...existing, ...data, id: existing.id };
  sessions.set(id, updated);
  return updated;
};

export const remove = (id: string): boolean => sessions.delete(id);
