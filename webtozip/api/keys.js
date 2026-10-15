const { makeKey, parseKey, used, sameOrigin, S } = require('./lib/core');

module.exports = (req, res) => {
  if (!sameOrigin(req)) return res.status(403).json({ error: 'Akses ditolak' });
  if (req.method === 'POST') return res.status(200).json({ key: makeKey() });
  const id = parseKey(req.query.key);
  if (!id || S.dead.has(id)) return res.status(404).json({ error: 'Key tidak ditemukan' });
  if (req.method === 'DELETE') {
    S.dead.add(id);
    return res.status(200).json({ ok: true });
  }
  const n = used(id);
  res.status(200).json({ usedToday: n, limit: 75, remaining: 75 - n });
};
