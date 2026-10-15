const JSZip = require('jszip');
const { spend, sameOrigin } = require('./lib/core');

const PRIVATE = /^(localhost|0\.|127\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1)|\.(local|internal)$/i;
const ASSET = /\.(css|js|mjs|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|otf|mp4|webm)(\?|$)/i;
const MAX_TOTAL = 3.8 * 1024 * 1024;
const UA_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36';
const UA_MOBILE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  res.setHeader('Access-Control-Expose-Headers', 'X-File-Count, X-Remaining-Points, X-Points-Cost');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan POST' });
  if (!sameOrigin(req) && !req.headers['x-api-key']) return res.status(403).json({ error: 'Akses ditolak' });

  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  let target;
  try { target = new URL(b.url); } catch { return res.status(400).json({ error: 'URL tidak valid' }); }
  if (!/^https?:$/.test(target.protocol) || PRIVATE.test(target.hostname)) {
    return res.status(400).json({ error: 'URL tidak diizinkan' });
  }

  const scrapeOnly = b.mode === 'scrape';
  const pay = spend(req, scrapeOnly ? 0 : 1);
  if (pay.error) return res.status(pay.status).json({ error: pay.error });

  const ua = b.mobileVersion ? UA_MOBILE : UA_DESKTOP;
  const get = async (url) => {
    const r = await fetch(url, { headers: { 'User-Agent': ua }, signal: AbortSignal.timeout(10000) });
    if (!r.ok || PRIVATE.test(new URL(r.url).hostname)) throw new Error('HTTP ' + r.status);
    return r;
  };

  try {
    let html = await (await get(target.href)).text();
    const found = new Map();
    const re = /(?:src|href)=["']([^"'#]+)["']|url\(["']?([^"')]+)["']?\)/gi;
    let m;
    while ((m = re.exec(html)) && found.size < 60) {
      const raw = m[1] || m[2];
      if (!ASSET.test(raw) || /^data:/i.test(raw)) continue;
      try { found.set(raw, new URL(raw, target.href)); } catch {}
    }
    if (scrapeOnly) {
      return res.status(200).json({ title: (/<title[^>]*>([^<]*)/i.exec(html) || [])[1] || '', assets: [...found.values()].map((u) => u.href) });
    }

    const zip = new JSZip();
    const items = [...found.entries()];
    let total = 0, count = 1, idx = 0;
    const work = async () => {
      while (idx < items.length) {
        const i = idx++;
        const [raw, u] = items[i];
        try {
          const r = await get(u.href);
          const ext = (/\.[a-z0-9]+$/i.exec(u.pathname) || ['.bin'])[0];
          if ((r.headers.get('content-type') || '').includes('text/html') && !/^\.html?$/.test(ext)) continue;
          const buf = Buffer.from(await r.arrayBuffer());
          if (total + buf.length > MAX_TOTAL) continue;
          total += buf.length;
          const local = b.renameAssets !== false
            ? 'assets/asset_' + String(i + 1).padStart(4, '0') + ext
            : b.saveStructure !== false
              ? 'assets/' + u.hostname + decodeURIComponent(u.pathname)
              : 'assets/' + u.pathname.split('/').pop();
          zip.file(local, buf);
          html = html.split(raw).join(local);
          count++;
        } catch {}
      }
    };
    await Promise.all(Array.from({ length: b.altAlgorithm ? 1 : 6 }, work));

    zip.file('index.html', html);
    zip.file('_info.txt', 'Source : ' + target.href + '\nDate   : ' + new Date().toISOString() + '\nFiles  : ' + count + '\n');
    const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('X-File-Count', count);
    res.setHeader('X-Points-Cost', 1);
    res.setHeader('X-Remaining-Points', pay.left);
    return res.status(200).send(out);
  } catch (e) {
    return res.status(502).json({ error: 'Gagal mengambil situs: ' + e.message });
  }
};
