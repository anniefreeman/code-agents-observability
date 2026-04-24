const items = new Map();
let nextId = 1;

exports.ping = (req, res) => {
  res.json({ message: 'pong' });
};

exports.health = (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
};

exports.listItems = (req, res) => {
  res.json(Array.from(items.values()));
};

exports.getItem = (req, res) => {
  const item = items.get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
};

exports.createItem = (req, res) => {
  const id = String(nextId++);
  const item = { id, ...req.body };
  items.set(id, item);
  res.status(201).json(item);
};

exports.updateItem = (req, res) => {
  const existing = items.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const updated = { ...existing, ...req.body, id: existing.id };
  items.set(existing.id, updated);
  res.json(updated);
};

exports.deleteItem = (req, res) => {
  if (!items.delete(req.params.id)) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.status(204).end();
};
