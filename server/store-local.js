/** File-based store for local development: .data/content.json + .data/uploads/ */
import fs from 'node:fs/promises';
import path from 'node:path';

export function createLocalStore(root) {
  const dir = path.join(root, '.data');
  const uploads = path.join(dir, 'uploads');
  const file = path.join(dir, 'content.json');

  const counterFile = path.join(dir, 'order-counter.json');
  let queue = Promise.resolve(); // serialises claims so two orders never share a number

  return {
    uploadsDir: uploads,
    claimOrderNumber(day) {
      const run = queue.then(async () => {
        let c = { day, last: 0 };
        try { c = JSON.parse(await fs.readFile(counterFile, 'utf8')); } catch { /* first order */ }
        const next = c.day === day ? c.last + 1 : 1;
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(counterFile, JSON.stringify({ day, last: next }));
        return next;
      });
      queue = run.catch(() => {});
      return run;
    },
    async readContent() {
      try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return null; }
    },
    async writeContent(json) {
      await fs.mkdir(dir, { recursive: true });
      try { await fs.copyFile(file, path.join(dir, `content.backup-${Date.now()}.json`)); } catch { /* first save */ }
      await fs.writeFile(file, json);
    },
    async saveImage(name, buf) {
      await fs.mkdir(uploads, { recursive: true });
      await fs.writeFile(path.join(uploads, name), buf);
      return `/uploads/${name}`;
    },
  };
}
