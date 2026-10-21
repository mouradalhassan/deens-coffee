/**
 * Site content: defaults live in the HTML + menu.js; the admin panel saves
 * overrides to /api/content which are merged in here on every page load.
 */
import { categories as defaultCategories, WHATSAPP_NUMBER } from './menu.js';

export const DEFAULT_GALLERY = [
  { src: '/images/frappe-pour.webp', caption: 'Frappe', size: 'tall', focus: '50% 50%' },
  { src: '/images/croissant.webp', caption: 'Snacks', size: '', focus: '50% 40%' },
  { src: '/images/iced-americano.webp', caption: 'Iced Americano', size: 'tall', focus: '50% 50%' },
  { src: '/images/caramel-frappe.webp', caption: 'Caramel Frappe', size: '', focus: '50% 50%' },
  { src: '/images/carrot-cake.webp', caption: 'Desserts', size: '', focus: '50% 60%' },
  { src: '/images/milkshakes.webp', caption: 'Milkshakes', size: '', focus: '50% 45%' },
  { src: '/images/refreshers.webp', caption: 'Refreshers', size: 'wide', focus: '50% 28%' },
];

const clone = (v) => JSON.parse(JSON.stringify(v));

export function defaultContent() {
  return {
    settings: { whatsapp: WHATSAPP_NUMBER },
    texts: {},
    images: {},
    gallery: clone(DEFAULT_GALLERY),
    categories: clone(defaultCategories),
  };
}

const FRESH_KEY = 'deens-fresh-until';

/** Ask for the newest content, skipping the CDN copy (used right after the admin saves). */
export function preferFreshContent(minutes = 10) {
  try { sessionStorage.setItem(FRESH_KEY, String(Date.now() + minutes * 60e3)); } catch { /* ignore */ }
}

export async function loadContent(fresh = false) {
  const base = defaultContent();
  try { fresh = fresh || Number(sessionStorage.getItem(FRESH_KEY)) > Date.now(); } catch { /* ignore */ }
  try {
    let saved;
    if (!fresh && window.__deensContent) {
      saved = await window.__deensContent; // started by the inline script in <head>
      window.__deensContent = null;
      if (!saved) return base;
    } else {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(fresh ? `/api/content?fresh=${Date.now()}` : '/api/content', { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) return base;
      saved = await res.json();
    }
    return {
      fromServer: true,
      settings: { ...base.settings, ...(saved.settings || {}) },
      texts: saved.texts || {},
      images: saved.images || {},
      gallery: Array.isArray(saved.gallery) ? saved.gallery : base.gallery,
      categories: Array.isArray(saved.categories) && saved.categories.length ? saved.categories : base.categories,
    };
  } catch {
    return base;
  }
}

/* ---------- Editable text format: *gold words* and line breaks ---------- */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export { esc as escapeHtml };

export function htmlToEditable(el) {
  let out = '';
  el.childNodes.forEach((n) => {
    if (n.nodeType === 3) out += n.textContent;
    else if (n.nodeName === 'BR') out += '\n';
    else if (n.nodeName === 'SPAN') out += `*${n.textContent}*`;
    else out += n.textContent;
  });
  return out.replace(/\s*\n\s*/g, '\n').replace(/[ \t]+/g, ' ').trim();
}

export function editableToHtml(text, hlClass) {
  return esc(text)
    .replace(/\*([^*]+)\*/g, hlClass ? `<span class="${hlClass}">$1</span>` : '$1')
    .replace(/\n/g, '<br />');
}

/** Remember every editable element's original value so the admin can reset it. */
export function captureDefaults() {
  document.querySelectorAll('[data-edit]').forEach((el) => {
    if (el.dataset.default == null) el.dataset.default = htmlToEditable(el);
  });
  document.querySelectorAll('[data-edit-img]').forEach((img) => {
    if (img.dataset.default == null) img.dataset.default = img.getAttribute('src');
  });
  document.querySelectorAll('[data-marquee-key]').forEach((el) => {
    if (el.dataset.default == null) el.dataset.default = el.dataset.marquee;
  });
}

export function applyContent(content) {
  const { texts, images, settings } = content;
  document.querySelectorAll('[data-edit]').forEach((el) => {
    const v = texts[el.dataset.edit];
    if (typeof v === 'string' && v.trim()) el.innerHTML = editableToHtml(v, el.dataset.hl);
  });
  document.querySelectorAll('[data-edit-img]').forEach((img) => {
    const v = images[img.dataset.editImg];
    if (v) img.src = v;
  });
  document.querySelectorAll('[data-marquee-key]').forEach((el) => {
    const v = texts[el.dataset.marqueeKey];
    if (typeof v === 'string' && v.trim()) el.dataset.marquee = v;
  });

  const wa = String(settings.whatsapp || '').replace(/\D/g, '');
  if (wa) {
    document.querySelectorAll('[data-wa-link]').forEach((a) => { a.href = `https://wa.me/${wa}`; });
    const pretty = wa.startsWith('961') ? `+961 ${wa.slice(3, 5)} ${wa.slice(5, 8)} ${wa.slice(8)}`.trim() : `+${wa}`;
    document.querySelectorAll('[data-wa-display]').forEach((el) => { el.textContent = pretty; });
  }
}
