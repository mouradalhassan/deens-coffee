import { WHATSAPP_NUMBER, formatPrice } from './menu.js';

const STORAGE_KEY = 'deens-cart-v1';

/** Tiny observable cart store, persisted to localStorage. */
export function createCart() {
  let lines = [];
  const listeners = new Set();

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (Array.isArray(saved)) lines = saved.filter((l) => l && l.key && l.qty > 0);
  } catch (_) { /* ignore */ }

  const emit = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lines)); } catch (_) { /* ignore */ }
    listeners.forEach((fn) => fn(api));
  };

  const keyOf = (itemId, size) => `${itemId}|${size || ''}`;

  const api = {
    get lines() { return lines; },
    get count() { return lines.reduce((n, l) => n + l.qty, 0); },
    get total() { return Math.round(lines.reduce((s, l) => s + l.qty * l.price, 0) * 100) / 100; },
    qtyOf(itemId, size) { const l = lines.find((x) => x.key === keyOf(itemId, size)); return l ? l.qty : 0; },
    add(item, option, image) {
      const key = keyOf(item.id, option.label);
      const existing = lines.find((l) => l.key === key);
      if (existing) existing.qty += 1;
      else lines.push({ key, itemId: item.id, name: item.name, category: item.category, size: option.label, price: option.price, qty: 1, image });
      emit();
    },
    setQty(key, qty) {
      const l = lines.find((x) => x.key === key);
      if (!l) return;
      if (qty <= 0) lines = lines.filter((x) => x.key !== key);
      else l.qty = Math.min(99, qty);
      emit();
    },
    change(key, delta) { const l = lines.find((x) => x.key === key); if (l) api.setQty(key, l.qty + delta); },
    remove(key) { lines = lines.filter((x) => x.key !== key); emit(); },
    clear() { lines = []; emit(); },
    subscribe(fn) { listeners.add(fn); fn(api); return () => listeners.delete(fn); },
    keyOf,
  };
  return api;
}

/** Builds the WhatsApp message — formatted so the shop can read it at a glance. */
export function buildWhatsAppMessage(cart, { orderNumber, name, address, notes }) {
  const now = new Date();
  const date = now.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const items = cart.lines.map((l, i) => {
    const title = l.size ? `${l.name} (${l.size})` : l.name;
    return `${i + 1}. *${title}*\n    ${l.qty} × ${formatPrice(l.price)} = ${formatPrice(l.qty * l.price)}\n    _${l.category}_`;
  });

  const parts = [
    `Hello Deen's Coffee Shop!`,
    `I'd like to place an order.`,
    ``,
    `*ORDER NUMBER: ${orderNumber}*`,
    `*DELIVERY*`,
    `${date}`,
    `━━━━━━━━━━━━━━`,
    ...items,
    `━━━━━━━━━━━━━━`,
    `Items: ${cart.count}`,
    `*TOTAL: ${formatPrice(cart.total)}*`,
    ``,
    `*Customer details*`,
    `Name: ${name}`,
  ];
  parts.push(`Address: ${address}`);
  if (notes) parts.push(`Notes: ${notes}`);
  parts.push('', 'Thank you!');
  return parts.join('\n');
}

export function whatsappUrl(message, number = WHATSAPP_NUMBER) {
  return `https://wa.me/${String(number).replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}
