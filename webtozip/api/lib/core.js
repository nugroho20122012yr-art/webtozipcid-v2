const crypto = require('crypto');
const SECRET = process.env.KEY_SECRET || 'ganti-lewat-env-KEY_SECRET';
const sig = (id) => crypto.createHmac('sha256', SECRET).update(id).digest('hex').slice(0, 16);
const today = () => new Date().toISOString().slice(0, 10);
const S = globalThis.__w2z || (globalThis.__w2z = { use: new Map(), dead: new Set() });

const makeKey = () => {
  const id = crypto.randomBytes(8).toString('hex');
  return 'w2z_' + id + sig(id);
};
const parseKey = (k) => {
  const m = /^w2z_([a-f0-9]{16})([a-f0-9]{16})$/.exec(k || '');
  return m && m[2] === sig(m[1]) ? m[1] : null;
};
const used = (id) => {
  const r = S.use.get(id);
  return r && r.d === today() ? r.n : 0;
};
const spend = (req, cost) => {
  const key = req.headers['x-api-key'];
  let id, limit = 250;
  if (key) {
    id = parseKey(key);
    if (!id || S.dead.has(id)) return { status: 401, error: 'API key tidak valid' };
    limit = 75;
  } else {
    id = 'ip_' + String(req.headers['x-forwarded-for'] || 'x').split(',')[0].trim();
  }
  if (used(id) + cost > limit) return { status: 429, error: 'Poin harian habis' };
  S.use.set(id, { d: today(), n: used(id) + cost });
  return { left: limit - used(id) };
};
const sameOrigin = (req) => req.headers['sec-fetch-site'] === 'same-origin';

module.exports = { makeKey, parseKey, used, spend, sameOrigin, S };
