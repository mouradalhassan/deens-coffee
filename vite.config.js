import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import { handle } from './server/core.js';
import { createLocalStore } from './server/store-local.js';

/** Runs the same /api routes as production, backed by files in .data/ */
function localApi() {
  const store = createLocalStore(process.cwd());
  const middleware = async (req, res, next) => {
    const url = new URL(req.url, 'http://x');

    if (url.pathname.startsWith('/uploads/')) {
      const file = path.join(store.uploadsDir, path.basename(url.pathname));
      if (!fs.existsSync(file)) return next();
      const ext = path.extname(file).slice(1);
      res.setHeader('Content-Type', { webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png' }[ext] || 'application/octet-stream');
      return fs.createReadStream(file).pipe(res);
    }
    if (!url.pathname.startsWith('/api/')) return next();

    let raw = '';
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 5_000_000) { res.statusCode = 413; return res.end('{}'); }
    }
    let body = null;
    try { body = raw ? JSON.parse(raw) : null; } catch { /* invalid JSON */ }

    try {
      const out = await handle({ method: req.method, path: url.pathname, headers: req.headers, body }, store);
      res.statusCode = out.status;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(out.body));
    } catch (err) {
      console.error(err);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Server error' }));
    }
  };
  return {
    name: 'deens-local-api',
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); },
  };
}

export default defineConfig({
  plugins: [tailwindcss(), localApi()],
  server: { host: true, port: 5173, watch: { ignored: ['**/.data/**'] } },
  build: { target: 'es2019', cssMinify: true },
});
