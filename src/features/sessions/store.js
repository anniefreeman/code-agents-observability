const sessions = new Map();
let nextId = 1;

exports.all = () => Array.from(sessions.values());

exports.get = (id) => sessions.get(id);

exports.create = (data) => {
  const id = String(nextId++);
  const session = { id, ...data };
  sessions.set(id, session);
  return session;
};

exports.update = (id, data) => {
  const existing = sessions.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...data, id: existing.id };
  sessions.set(id, updated);
  return updated;
};

exports.remove = (id) => sessions.delete(id);
