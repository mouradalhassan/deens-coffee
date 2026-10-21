/**
 * Shared admin API logic — used by the Vite dev server (local file store, server/store-local.js)
 * and by the Netlify function in netlify/functions/api.mjs (Netlify Blobs, server/store-netlify.js).
 */
import crypto from 'node:crypto';

const PASSWORD = () => process.env.ADMIN_PASSWORD || '';
const SECRET = () => process.env.ADMIN_SECRET || crypto.createHash('sha256').update('deens|' + PASSWORD()).digest('hex');
const TOKEN_TTL = 12 * 60 * 60 * 1000; // 12 hours
const MAX_CONTENT_BYTES = 1_500_000;
const MAX_IMAGE_BYTES = 3_000_000;
const IMAGE_TYPES = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

const sign = (payload) => crypto.createHmac('sha256', SECRET()).update(payload).digest('base64url');

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function issueToken() {
  const payload = `admin.${Date.now() + TOKEN_TTL}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(header) {
  const token = String(header || '').replace(/^Bearer\s+/i, '');
  const i = token.lastIndexOf('.');
  if (i < 0) return false;
  const payload = token.slice(0, i);
  const exp = Number(payload.split('.')[1]);
  return safeEqual(token.slice(i + 1), sign(payload)) && exp > Date.now();
}

const reply = (status, body) => ({ status, body });

/**
 * Order numbers restart every day at 4:00 AM Lebanon time: shift the clock back
 * 4 hours, then take the Beirut calendar date (e.g. 02:30 on the 11th counts as the 10th).
 */
export function businessDay(now = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Beirut', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(now - 4 * 3600e3));
}

export async function handle({ method, path, headers, body }, store) {
  const route = path.replace(/^\/api\//, '').replace(/\/$/, '');

  if (route === 'content' && method === 'GET') {
    return reply(200, (await store.readContent()) || {});
  }

  if (route === 'order-number' && method === 'POST') {
    const day = businessDay();
    const number = await store.claimOrderNumber(day);
    return reply(200, { number, day });
  }

  if (route === 'login' && method === 'POST') {
    await new Promise((r) => setTimeout(r, 400)); // slow down guessing
    // no ADMIN_PASSWORD set = admin login disabled (never fall back to a built-in password)
    if (!PASSWORD() || !body || !safeEqual(body.password || '', PASSWORD())) return reply(401, { error: 'Wrong password' });
    return reply(200, { token: issueToken() });
  }

  if (!verifyToken(headers.authorization)) return reply(401, { error: 'Please log in again' });

  if (route === 'content' && method === 'PUT') {
    const c = body && body.content;
    if (!c || !Array.isArray(c.categories)) return reply(400, { error: 'Invalid content' });
    const json = JSON.stringify({ ...c, updatedAt: new Date().toISOString() });
    if (json.length > MAX_CONTENT_BYTES) return reply(413, { error: 'Content too large' });
    await store.writeContent(json);
    return reply(200, { ok: true });
  }

  if (route === 'upload' && method === 'POST') {
    const m = /^data:(image\/[a-z]+);base64,(.+)$/.exec((body && body.dataUrl) || '');
    if (!m || !IMAGE_TYPES[m[1]]) return reply(400, { error: 'Unsupported image' });
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > MAX_IMAGE_BYTES) return reply(413, { error: 'Image too large' });
    const name = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}.${IMAGE_TYPES[m[1]]}`;
    const url = await store.saveImage(name, buf, m[1]);
    return reply(200, { url });
  }

  return reply(404, { error: 'Not found' });
}
