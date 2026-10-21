// Netlify Function: /api/content, /api/login, /api/upload, /api/order-number and /uploads/<picture>
import { getStore } from '@netlify/blobs';
import { handle } from '../../server/core.js';
import { createNetlifyStore } from '../../server/store-netlify.js';

// Menu, texts, order counter and uploaded pictures all live in this site's Netlify Blobs
const uploads = () => getStore({ name: 'uploads', consistency: 'strong' });
const store = createNetlifyStore();

const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

export default async (req) => {
  const url = new URL(req.url);

  if (url.pathname.startsWith('/uploads/')) {
    const name = decodeURIComponent(url.pathname.slice('/uploads/'.length));
    const found = await uploads().getWithMetadata(name, { type: 'arrayBuffer' });
    if (!found) return new Response('Not found', { status: 404 });
    return new Response(found.data, {
      headers: {
        'Content-Type': (found.metadata && found.metadata.contentType) || 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  try {
    let body = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try { body = await req.json(); } catch { /* empty or invalid body */ }
    }
    const { status, body: out } = await handle(
      { method: req.method, path: url.pathname, headers: Object.fromEntries(req.headers), body },
      store
    );
    // Visitors get the menu from Netlify's CDN (refreshed every 5 min); the admin's reload after
    // saving adds ?fresh=… and always gets the newest version.
    const publicContent = req.method === 'GET' && url.pathname === '/api/content' && status === 200 && !url.searchParams.has('fresh');
    return json(status, out, publicContent
      ? { 'Cache-Control': 'public, max-age=0, must-revalidate', 'Netlify-CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400', 'Netlify-Vary': 'query=fresh' }
      : { 'Cache-Control': 'no-store' });
  } catch (err) {
    console.error(err);
    return json(500, { error: 'Server error' }, { 'Cache-Control': 'no-store' });
  }
};

export const config = { path: ['/api/*', '/uploads/*'] };
