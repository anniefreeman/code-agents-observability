const store = require('./store');

exports.list = (req, res) => {
  res.json(store.all());
};

exports.get = (req, res) => {
  const session = store.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Not found' });
  res.json(session);
};

exports.create = (req, res) => {
  const session = store.create(req.body);
  res.status(201).json(session);
};

exports.update = (req, res) => {
  const updated = store.update(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
};

exports.remove = (req, res) => {
  if (!store.remove(req.params.id)) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.status(204).end();
};
