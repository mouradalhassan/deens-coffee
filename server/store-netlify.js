/**
 * Everything stored inside the site's own Netlify account (Netlify Blobs):
 *  - store "site":    key "content" = the menu/texts saved from the admin panel (+ dated backups)
 *  - store "orders":  key "<business day>" = { last } daily order counter
 *  - store "uploads": pictures uploaded from the admin panel
 * Order numbers use conditional writes (only-if-unchanged), so two simultaneous
 * orders can never receive the same number — the loser simply retries with n+1.
 */
import { getStore } from '@netlify/blobs';

const store = (name) => getStore({ name, consistency: 'strong' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createNetlifyStore() {
  return {
    async claimOrderNumber(day) {
      // Each number is its own entry "<day>/0001", created with onlyIfNew — that create is strictly
      // atomic, so a number can only ever be handed out once. "<day>/last" is just a hint of where
      // to start looking (it may lag behind; then we simply try a few more numbers).
      const orders = store('orders');
      const hint = await orders.get(`${day}/last`, { type: 'json' }).catch(() => null);
      let n = ((hint && hint.n) || 0) + 1;
      for (let attempt = 0; attempt < 200; attempt++, n++) {
        const { modified } = await orders.set(`${day}/${String(n).padStart(4, '0')}`, new Date().toISOString(), { onlyIfNew: true });
        if (modified) {
          await orders.setJSON(`${day}/last`, { n }).catch(() => {});
          return n;
        }
        if (attempt % 20 === 19) await sleep(20 + Math.random() * 60);
      }
      throw new Error('Could not reserve an order number');
    },
    async readContent() {
      return (await store('site').get('content', { type: 'json' })) || null;
    },
    async writeContent(json) {
      const site = store('site');
      const prev = await site.get('content', { type: 'text' });
      if (prev) await site.set(`backups/${new Date().toISOString()}`, prev);
      await site.set('content', json);
    },
    async saveImage(name, buf, contentType) {
      await store('uploads').set(name, buf, { metadata: { contentType } });
      return `/uploads/${name}`;
    },
  };
}
