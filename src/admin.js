/**
 * Deen's admin panel — opened from the tiny lock button in the footer.
 * Edits a draft copy of the site content; "Save & publish" sends it to /api/content.
 */
import './admin.css';
import { escapeHtml as esc, preferFreshContent } from './content.js';

const TOKEN_KEY = 'deens-admin-token';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const clone = (v) => JSON.parse(JSON.stringify(v));

let root = null;
let draft = null;
let dirty = false;
let tab = 'menu';
const openCats = new Set();

/* ------------------------------------------------------------------ API */
async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem(TOKEN_KEY) || ''}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/api/login') {
    sessionStorage.removeItem(TOKEN_KEY);
    throw new Error('Your session expired — please log in again.');
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

/** Shrinks big phone photos before uploading (max 1600px, WebP/JPEG). */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      let url = canvas.toDataURL('image/webp', 0.86);
      if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/jpeg', 0.86);
      resolve(url);
    };
    img.onerror = () => reject(new Error('This file is not a picture we can read.'));
    img.src = URL.createObjectURL(file);
  });
}

function pickImage() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => resolve(input.files[0] || null);
    input.click();
  });
}

async function uploadImage() {
  const file = await pickImage();
  if (!file) return null;
  toast('Uploading picture…');
  const dataUrl = await compressImage(file);
  const { url } = await api('/api/upload', { method: 'POST', body: { dataUrl } });
  toast('Picture uploaded — remember to Save');
  return url;
}

/* ------------------------------------------------------------- helpers */
let toastTimer;
function toast(msg, isError = false) {
  const t = $('#adm-toast', root);
  t.textContent = msg;
  t.classList.toggle('is-error', isError);
  t.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-visible'), 3200);
}

function markDirty() {
  dirty = true;
  root.classList.add('is-dirty');
}

function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => o[k], obj);
  target[last] = value;
}

const slug = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'category';

function editableFields() {
  const seen = new Set();
  return $$('[data-edit]').filter((el) => !seen.has(el.dataset.edit) && seen.add(el.dataset.edit));
}
function editableImages() {
  const seen = new Set();
  return $$('[data-edit-img]').filter((el) => !seen.has(el.dataset.editImg) && seen.add(el.dataset.editImg));
}
function marqueeKeys() {
  const seen = new Map();
  $$('[data-marquee-key]').forEach((el) => { if (!seen.has(el.dataset.marqueeKey)) seen.set(el.dataset.marqueeKey, el.dataset.default); });
  return seen;
}

/* --------------------------------------------------------------- login */
function renderLogin() {
  root.innerHTML = `
    <div class="adm-login">
      <form class="adm-login__card" id="adm-login-form">
        <img src="/images/deens-logo.webp" alt="" width="72" height="68" />
        <h2>Admin access</h2>
        <p>Enter the password to edit the website.</p>
        <input type="password" id="adm-pass" placeholder="Password" autocomplete="current-password" required />
        <p class="adm-login__error" id="adm-login-error" hidden></p>
        <button type="submit" class="adm-btn adm-btn--gold" id="adm-login-btn">Log in</button>
        <button type="button" class="adm-btn adm-btn--ghost" data-action="close">Cancel</button>
      </form>
    </div>
    <div class="adm-toast" id="adm-toast"></div>`;
  setTimeout(() => $('#adm-pass', root)?.focus(), 50);
  $('#adm-login-form', root).addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#adm-login-btn', root);
    const err = $('#adm-login-error', root);
    btn.disabled = true;
    btn.textContent = 'Checking…';
    try {
      const { token } = await api('/api/login', { method: 'POST', body: { password: $('#adm-pass', root).value } });
      sessionStorage.setItem(TOKEN_KEY, token);
      renderPanel();
    } catch (ex) {
      err.hidden = false;
      err.textContent = ex.message === 'Wrong password' ? 'Wrong password, try again.' : ex.message;
      btn.disabled = false;
      btn.textContent = 'Log in';
    }
  });
}

/* --------------------------------------------------------------- panel */
const TABS = [
  ['menu', 'Menu & prices'],
  ['texts', 'Texts'],
  ['pictures', 'Pictures'],
  ['gallery', 'Gallery'],
  ['settings', 'Settings'],
];

function renderPanel() {
  root.innerHTML = `
    <div class="adm-panel">
      <header class="adm-bar">
        <div class="adm-bar__title"><img src="/images/deens-logo.webp" alt="" width="36" height="34" /><span>Deen's Admin</span></div>
        <span class="adm-bar__status">Unsaved changes</span>
        <div class="adm-bar__actions">
          <button type="button" class="adm-btn adm-btn--ghost" data-action="close">Close</button>
          <button type="button" class="adm-btn adm-btn--gold" data-action="save" id="adm-save">Save &amp; publish</button>
        </div>
      </header>
      <nav class="adm-tabs">${TABS.map(([id, label]) => `<button type="button" class="adm-tab" data-tab="${id}">${label}</button>`).join('')}</nav>
      <main class="adm-body" id="adm-body"></main>
      <div class="adm-confirm" id="adm-confirm" hidden>
        <p>You have unsaved changes.</p>
        <button type="button" class="adm-btn adm-btn--danger" data-action="discard">Discard &amp; close</button>
        <button type="button" class="adm-btn adm-btn--ghost" data-action="stay">Keep editing</button>
      </div>
    </div>
    <div class="adm-toast" id="adm-toast"></div>`;
  renderTab();
}

function renderTab() {
  $$('.adm-tab', root).forEach((b) => b.classList.toggle('is-active', b.dataset.tab === tab));
  const body = $('#adm-body', root);
  body.innerHTML = { menu: menuTab, texts: textsTab, pictures: picturesTab, gallery: galleryTab, settings: settingsTab }[tab]();
  if (tab === 'texts') $$('textarea', body).forEach(autoGrow);
}

/* ---- Menu tab */
function priceInput(path, value) {
  return `<input class="adm-input adm-input--price" type="number" inputmode="decimal" step="0.01" min="0" data-bind="${path}" data-type="price" value="${value == null ? '' : value}" placeholder="—" />`;
}

function menuTab() {
  return `
    <p class="adm-help">Tap a category to open it. Change names and prices directly, then press <strong>Save &amp; publish</strong>. Leave a price empty if that size is not available.</p>
    <div class="adm-cats">
      ${draft.categories.map((cat, ci) => {
        const count = (cat.groups || []).reduce((n, g) => n + (g.items || []).length, 0);
        return `
        <section class="adm-cat ${openCats.has(ci) ? 'is-open' : ''}" data-ci="${ci}">
          <div class="adm-cat__head">
            <button type="button" class="adm-cat__toggle" data-action="toggle-cat" data-ci="${ci}">
              <img src="${esc(cat.image || '/images/deens-logo.webp')}" alt="" />
              <span><strong>${esc(cat.name || 'New category')}</strong><small>${count} item${count === 1 ? '' : 's'}</small></span>
            </button>
            <div class="adm-cat__tools">
              <button type="button" class="adm-icon" data-action="cat-up" data-ci="${ci}" aria-label="Move up" ${ci === 0 ? 'disabled' : ''}>↑</button>
              <button type="button" class="adm-icon" data-action="cat-down" data-ci="${ci}" aria-label="Move down" ${ci === draft.categories.length - 1 ? 'disabled' : ''}>↓</button>
              <button type="button" class="adm-icon adm-icon--danger" data-action="cat-delete" data-ci="${ci}" aria-label="Delete category">✕</button>
            </div>
          </div>
          ${openCats.has(ci) ? catEditor(cat, ci) : ''}
        </section>`;
      }).join('')}
    </div>
    <button type="button" class="adm-btn adm-btn--teal adm-add" data-action="cat-add">+ Add category</button>`;
}

function catEditor(cat, ci) {
  const p = `categories.${ci}`;
  return `
    <div class="adm-cat__body">
      <div class="adm-cat__image">
        <img src="${esc(cat.image || '/images/deens-logo.webp')}" alt="" style="object-position:${esc(cat.focus || '50% 50%')}" />
        <button type="button" class="adm-btn adm-btn--small" data-action="cat-image" data-ci="${ci}">Change picture</button>
      </div>
      <div class="adm-grid">
        <label class="adm-field"><span>Category name</span><input class="adm-input" data-bind="${p}.name" value="${esc(cat.name || '')}" /></label>
        <label class="adm-field"><span>Short name (menu button)</span><input class="adm-input" data-bind="${p}.short" value="${esc(cat.short || '')}" /></label>
        <label class="adm-field adm-field--wide"><span>Tagline</span><input class="adm-input" data-bind="${p}.tagline" value="${esc(cat.tagline || '')}" /></label>
        <label class="adm-field adm-field--wide"><span>Note shown above the items (optional)</span><input class="adm-input" data-bind="${p}.note" value="${esc(cat.note || '')}" /></label>
      </div>
      ${(cat.groups || []).map((g, gi) => groupEditor(g, ci, gi, cat.groups.length)).join('')}
      <button type="button" class="adm-btn adm-btn--small adm-btn--ghost-dark" data-action="group-add" data-ci="${ci}">+ Add another size group</button>
    </div>`;
}

function groupEditor(g, ci, gi, groupCount) {
  const sizes = g.sizes && g.sizes.length ? g.sizes : null;
  const cols = sizes || ['Price'];
  const p = `categories.${ci}.groups.${gi}`;
  return `
    <div class="adm-group">
      <div class="adm-group__head">
        <label class="adm-field"><span>Sizes (comma separated — leave empty for one price)</span>
          <input class="adm-input" data-sizes="${ci}.${gi}" value="${esc((g.sizes || []).join(', '))}" placeholder="e.g. 8oz, 12oz" /></label>
        ${groupCount > 1 ? `<button type="button" class="adm-btn adm-btn--small adm-btn--danger-ghost" data-action="group-delete" data-ci="${ci}" data-gi="${gi}">Delete group</button>` : ''}
      </div>
      <div class="adm-table" style="--cols:${cols.length}">
        <div class="adm-table__row adm-table__row--head"><span>Item</span>${cols.map((c) => `<span>${esc(c)} ($)</span>`).join('')}<span></span></div>
        ${(g.items || []).map((item, ii) => `
          <div class="adm-table__row">
            <input class="adm-input" data-bind="${p}.items.${ii}.0" value="${esc(item[0] || '')}" placeholder="Item name" />
            ${cols.map((_, si) => priceInput(`${p}.items.${ii}.${si + 1}`, item[si + 1])).join('')}
            <button type="button" class="adm-icon adm-icon--danger" data-action="item-delete" data-ci="${ci}" data-gi="${gi}" data-ii="${ii}" aria-label="Delete item">✕</button>
          </div>`).join('')}
      </div>
      <button type="button" class="adm-btn adm-btn--small adm-btn--teal" data-action="item-add" data-ci="${ci}" data-gi="${gi}">+ Add item</button>
    </div>`;
}

/* ---- Texts tab */
function sectionOf(key) {
  return { hero: 'Top of page', marquee: 'Moving text bands', story: 'Our Story', menu: 'Menu', gallery: 'Gallery', order: 'How to order', footer: 'Footer' }[key.split('.')[0]] || 'Other';
}

function textsTab() {
  const rows = [];
  editableFields().forEach((el) => rows.push({ key: el.dataset.edit, label: el.dataset.label || el.dataset.edit, value: draft.texts[el.dataset.edit] ?? el.dataset.default, hl: !!el.dataset.hl, def: el.dataset.default }));
  marqueeKeys().forEach((def, key) => rows.push({ key, label: `Moving band ${key.split('.')[1]} — separate words with |`, value: draft.texts[key] ?? def, def }));
  const groups = {};
  rows.forEach((r) => (groups[sectionOf(r.key)] ||= []).push(r));
  return `
    <p class="adm-help">Change any text on the website. Put <strong>*stars*</strong> around words to make them gold, and press Enter for a new line.</p>
    ${Object.entries(groups).map(([section, list]) => `
      <h3 class="adm-section">${esc(section)}</h3>
      ${list.map((r) => `
        <label class="adm-field adm-field--text">
          <span>${esc(r.label)} ${r.value !== r.def ? `<button type="button" class="adm-link" data-action="text-reset" data-key="${esc(r.key)}">Reset</button>` : ''}</span>
          <textarea class="adm-input" rows="1" data-text="${esc(r.key)}">${esc(r.value)}</textarea>
        </label>`).join('')}
    `).join('')}`;
}

function autoGrow(t) {
  t.style.height = 'auto';
  t.style.height = t.scrollHeight + 2 + 'px';
}

/* ---- Pictures tab */
function picturesTab() {
  return `
    <p class="adm-help">Change the pictures used around the website. Category pictures are changed in <strong>Menu &amp; prices</strong>, gallery pictures in <strong>Gallery</strong>.</p>
    <div class="adm-pics">
      ${editableImages().map((img) => {
        const key = img.dataset.editImg;
        const src = draft.images[key] || img.dataset.default;
        return `
        <figure class="adm-pic">
          <img src="${esc(src)}" alt="" />
          <figcaption>${esc(img.dataset.label || key)}</figcaption>
          <div class="adm-pic__tools">
            <button type="button" class="adm-btn adm-btn--small" data-action="img-change" data-key="${esc(key)}">Change</button>
            ${draft.images[key] ? `<button type="button" class="adm-btn adm-btn--small adm-btn--ghost-dark" data-action="img-reset" data-key="${esc(key)}">Reset</button>` : ''}
          </div>
        </figure>`;
      }).join('')}
    </div>`;
}

/* ---- Gallery tab */
function galleryTab() {
  return `
    <p class="adm-help">Add, remove or reorder the pictures in the Gallery section. “Tall” and “Wide” make a picture take more space.</p>
    <div class="adm-pics">
      ${draft.gallery.map((g, i) => `
        <figure class="adm-pic">
          <img src="${esc(g.src)}" alt="" />
          <div class="adm-pic__fields">
            <input class="adm-input" data-bind="gallery.${i}.caption" value="${esc(g.caption || '')}" placeholder="Caption (optional)" />
            <select class="adm-input" data-bind="gallery.${i}.size">
              ${[['', 'Normal'], ['tall', 'Tall'], ['wide', 'Wide']].map(([v, l]) => `<option value="${v}" ${(g.size || '') === v ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </div>
          <div class="adm-pic__tools">
            <button type="button" class="adm-icon" data-action="gal-up" data-i="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Move earlier">←</button>
            <button type="button" class="adm-icon" data-action="gal-down" data-i="${i}" ${i === draft.gallery.length - 1 ? 'disabled' : ''} aria-label="Move later">→</button>
            <button type="button" class="adm-btn adm-btn--small" data-action="gal-change" data-i="${i}">Change</button>
            <button type="button" class="adm-icon adm-icon--danger" data-action="gal-delete" data-i="${i}" aria-label="Delete picture">✕</button>
          </div>
        </figure>`).join('')}
    </div>
    <button type="button" class="adm-btn adm-btn--teal adm-add" data-action="gal-add">+ Add picture</button>`;
}

/* ---- Settings tab */
function settingsTab() {
  return `
    <p class="adm-help">Orders are sent to this WhatsApp number. Write it with the country code, e.g. 96170991995.</p>
    <label class="adm-field"><span>WhatsApp number for orders</span>
      <input class="adm-input" inputmode="tel" data-bind="settings.whatsapp" value="${esc(draft.settings.whatsapp || '')}" /></label>
    <p class="adm-help mt">Logged in on this device until you close the browser. <button type="button" class="adm-link" data-action="logout">Log out</button></p>`;
}

/* ------------------------------------------------------------- actions */
function confirmDelete(btn, run) {
  if (btn.dataset.armed) return run();
  btn.dataset.armed = '1';
  const old = btn.innerHTML;
  btn.classList.add('is-armed');
  btn.innerHTML = 'Delete?';
  setTimeout(() => {
    if (!btn.isConnected) return;
    delete btn.dataset.armed;
    btn.classList.remove('is-armed');
    btn.innerHTML = old;
  }, 3000);
}

const swap = (arr, a, b) => { [arr[a], arr[b]] = [arr[b], arr[a]]; };

async function save() {
  const btn = $('#adm-save', root);
  btn.disabled = true;
  btn.textContent = 'Saving…';
  try {
    // Only keep texts/images that differ from the built-in defaults
    const texts = {};
    editableFields().forEach((el) => {
      const v = draft.texts[el.dataset.edit];
      if (typeof v === 'string' && v.trim() && v !== el.dataset.default) texts[el.dataset.edit] = v;
    });
    marqueeKeys().forEach((def, key) => {
      const v = draft.texts[key];
      if (typeof v === 'string' && v.trim() && v !== def) texts[key] = v;
    });
    const categories = draft.categories.map((c) => ({
      ...c,
      groups: (c.groups || []).map((g) => ({ ...g, items: (g.items || []).filter((it) => String(it[0] || '').trim()) })),
    }));
    await api('/api/content', { method: 'PUT', body: { content: { ...draft, texts, categories } } });
    dirty = false;
    root.classList.remove('is-dirty');
    preferFreshContent();
    toast('Saved! Live for everyone within a few minutes.');
    setTimeout(() => window.location.reload(), 900);
  } catch (ex) {
    toast(ex.message, true);
    if (!sessionStorage.getItem(TOKEN_KEY)) setTimeout(renderLogin, 1200);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save & publish';
  }
}

function close(force = false) {
  if (dirty && !force) {
    $('#adm-confirm', root).hidden = false;
    return;
  }
  root.remove();
  root = null;
  document.body.classList.remove('adm-open');
}

async function onClick(e) {
  const tabBtn = e.target.closest('[data-tab]');
  if (tabBtn) { tab = tabBtn.dataset.tab; renderTab(); return; }

  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action } = btn.dataset;
  const ci = Number(btn.dataset.ci);
  const gi = Number(btn.dataset.gi);
  const cats = draft?.categories;

  try {
    switch (action) {
      case 'close': return close();
      case 'discard': return close(true);
      case 'stay': $('#adm-confirm', root).hidden = true; return;
      case 'save': return save();
      case 'logout': sessionStorage.removeItem(TOKEN_KEY); return close(true);
      case 'toggle-cat': openCats.has(ci) ? openCats.delete(ci) : openCats.add(ci); break;
      case 'cat-up': swap(cats, ci, ci - 1); openCats.clear(); markDirty(); break;
      case 'cat-down': swap(cats, ci, ci + 1); openCats.clear(); markDirty(); break;
      case 'cat-delete': return confirmDelete(btn, () => { cats.splice(ci, 1); openCats.clear(); markDirty(); renderTab(); });
      case 'cat-add': {
        const name = 'New category';
        let id = slug(name);
        while (cats.some((c) => c.id === id)) id += '-1';
        cats.push({ id, name, short: name, tagline: '', image: '/images/deens-logo.webp', focus: '50% 50%', groups: [{ sizes: null, items: [['New item', 0]] }] });
        openCats.clear();
        openCats.add(cats.length - 1);
        markDirty();
        renderTab();
        $(`.adm-cat[data-ci="${cats.length - 1}"]`, root)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      case 'cat-image': {
        const url = await uploadImage();
        if (url) { cats[ci].image = url; markDirty(); }
        break;
      }
      case 'group-add': cats[ci].groups.push({ sizes: null, items: [['New item', 0]] }); markDirty(); break;
      case 'group-delete': return confirmDelete(btn, () => { cats[ci].groups.splice(gi, 1); markDirty(); renderTab(); });
      case 'item-add': {
        const g = cats[ci].groups[gi];
        const n = g.sizes && g.sizes.length ? g.sizes.length : 1;
        g.items.push(['', ...Array(n).fill(null)]);
        markDirty();
        renderTab();
        const rows = $$(`.adm-cat[data-ci="${ci}"] .adm-group`, root)[gi];
        $$('.adm-table__row', rows).pop()?.querySelector('input')?.focus();
        return;
      }
      case 'item-delete': return confirmDelete(btn, () => { cats[ci].groups[gi].items.splice(Number(btn.dataset.ii), 1); markDirty(); renderTab(); });
      case 'text-reset': delete draft.texts[btn.dataset.key]; markDirty(); break;
      case 'img-change': {
        const url = await uploadImage();
        if (url) { draft.images[btn.dataset.key] = url; markDirty(); }
        break;
      }
      case 'img-reset': delete draft.images[btn.dataset.key]; markDirty(); break;
      case 'gal-up': swap(draft.gallery, Number(btn.dataset.i), Number(btn.dataset.i) - 1); markDirty(); break;
      case 'gal-down': swap(draft.gallery, Number(btn.dataset.i), Number(btn.dataset.i) + 1); markDirty(); break;
      case 'gal-delete': return confirmDelete(btn, () => { draft.gallery.splice(Number(btn.dataset.i), 1); markDirty(); renderTab(); });
      case 'gal-change': {
        const url = await uploadImage();
        if (url) { draft.gallery[Number(btn.dataset.i)].src = url; markDirty(); }
        break;
      }
      case 'gal-add': {
        const url = await uploadImage();
        if (url) { draft.gallery.push({ src: url, caption: '', size: '', focus: '50% 50%' }); markDirty(); }
        break;
      }
      default: return;
    }
    renderTab();
  } catch (ex) {
    toast(ex.message, true);
  }
}

function onInput(e) {
  const t = e.target;
  if (t.dataset.bind) {
    let v = t.value;
    if (t.dataset.type === 'price') v = v === '' ? null : Math.max(0, Math.round(parseFloat(v) * 100) / 100);
    if (t.dataset.type === 'price' && Number.isNaN(v)) return;
    setPath(draft, t.dataset.bind, v);
    markDirty();
    // keep the category header in sync while typing
    const m = /^categories\.(\d+)\.name$/.exec(t.dataset.bind);
    if (m) {
      const head = $(`.adm-cat[data-ci="${m[1]}"] .adm-cat__toggle strong`, root);
      if (head) head.textContent = v || 'New category';
    }
  } else if (t.dataset.text) {
    draft.texts[t.dataset.text] = t.value;
    autoGrow(t);
    markDirty();
  }
}

function onChange(e) {
  const t = e.target;
  if (!t.dataset.sizes) return;
  const [ci, gi] = t.dataset.sizes.split('.').map(Number);
  const g = draft.categories[ci].groups[gi];
  const sizes = t.value.split(',').map((s) => s.trim()).filter(Boolean);
  const n = Math.max(1, sizes.length);
  g.sizes = sizes.length ? sizes : null;
  g.items = g.items.map(([name, ...prices]) => [name, ...Array.from({ length: n }, (_, i) => prices[i] ?? null)]);
  markDirty();
  renderTab();
}

/* --------------------------------------------------------------- entry */
export function openAdmin(content) {
  if (root) return;
  draft = clone(content);
  draft.texts ||= {};
  draft.images ||= {};
  draft.gallery ||= [];
  draft.settings ||= {};
  dirty = false;
  root = document.createElement('div');
  root.className = 'adm';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Admin panel');
  document.body.appendChild(root);
  document.body.classList.add('adm-open');
  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  root.addEventListener('change', onChange);
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  window.addEventListener('beforeunload', (e) => { if (root && dirty) { e.preventDefault(); e.returnValue = ''; } });

  if (sessionStorage.getItem(TOKEN_KEY)) renderPanel();
  else renderLogin();
}

