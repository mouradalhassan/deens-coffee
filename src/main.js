import './style.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { buildMenu, formatPrice } from './menu.js';
import { createCart, buildWhatsAppMessage, whatsappUrl } from './cart.js';
import { initHero } from './hero.js';
import { initNav } from './nav.js';
import { loadContent, defaultContent, captureDefaults, applyContent, escapeHtml as esc } from './content.js';

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

gsap.registerPlugin(ScrollTrigger);

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

// Category navigation state
let isProgrammaticCategoryScroll = false;
let categoryScrollUnlockTimer = null;

// Initialize cart store
const cart = createCart();
let siteContent = null;
let menuCategories = [];

// Store customer details in localStorage
const CUSTOMER_STORAGE = 'deens-cust-info';

/* ==========================================================================
   DOM ELEMENTS
   ========================================================================== */
const cartToggle = $('#cart-toggle');
const cartDrawer = $('#cart-drawer');
const drawerOverlay = $('#drawer-overlay');
const cartClose = $('#cart-close');
const cartLines = $('#cart-lines');
const cartEmpty = $('#cart-empty');
const cartBrowse = $('#cart-browse');
const cartCount = $('#cart-count');
const cartTotalHeader = $('#cart-total-header');
const cartSubtitle = $('#cart-subtitle');
const sumCount = $('#sum-count');
const sumTotal = $('#sum-total');
const checkoutForm = $('#checkout-form');
const checkoutBtn = $('#checkout-btn');
const cartBar = $('#cart-bar');
const barCount = $('#bar-count');
const barTotal = $('#bar-total');
const toast = $('#toast');
const toastText = $('#toast-text');
const sentModal = $('#sent-modal');
const sentRetry = $('#sent-retry');
const sentClear = $('#sent-clear');
const sentKeep = $('#sent-keep');
const menuSearch = $('#menu-search');
const searchWrap = $('#search-wrap');
const searchClear = $('#search-clear');
const menuList = $('#menu-list');
const menuEmpty = $('#menu-empty');
const catScroller = $('#cat-scroller');
const catPrev = $('#cat-prev');
const catNext = $('#cat-next');
const cursor = $('#cursor');

/* ==========================================================================
   POPULATE MARQUEE
   ========================================================================== */
function populateMarquee() {
$$('[data-marquee]').forEach((track) => {
  const items = track.getAttribute('data-marquee').split('|').map((t) => t.trim()).filter(Boolean);
  track.innerHTML = items
    .map(
      (text) =>
        `<span>${esc(text)}</span><svg width="22" height="22" style="--bean-line:currentColor" aria-hidden="true"><use href="#i-bean"/></svg>`
    )
    .join('');
});
}

/* ==========================================================================
   RENDER CATEGORY NAVIGATION CHIPS
   ========================================================================== */
function setActiveCategoryChip(catId, scrollIntoView = true) {
  const chips = $$('.cat-chip', catScroller);
  let activeChip = null;
  chips.forEach((c) => {
    const isTarget = c.id === `chip-${catId}` || c.dataset.catTarget === `cat-${catId}`;
    c.classList.toggle('is-active', isTarget);
    if (isTarget) activeChip = c;
  });
  // Only scroll the chip row sideways — never the page (scrollIntoView would yank the window)
  if (scrollIntoView && activeChip && catScroller) {
    const left = activeChip.offsetLeft - (catScroller.clientWidth - activeChip.offsetWidth) / 2;
    catScroller.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }
}

function renderCategoryNav() {
  catScroller.innerHTML = menuCategories
    .map(
      (cat, idx) => `
      <button type="button" class="cat-chip ${idx === 0 ? 'is-active' : ''}" data-cat-target="cat-${cat.id}" id="chip-${cat.id}">
        <img src="${esc(cat.image)}" alt="" width="46" height="46" decoding="async" />
        <span>${esc(cat.short || cat.name)}</span>
      </button>
    `
    )
    .join('');

  $$('.cat-chip', catScroller).forEach((chip) => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = chip.dataset.catTarget;
      const catId = targetId.replace(/^cat-/, '');
      const targetEl = document.getElementById(targetId);

      // 1. Instantly highlight the clicked chip and center it in the scroller
      setActiveCategoryChip(catId, true);

      if (targetEl) {
        // 2. Lock scrollspy so intermediate blocks don't flash while smooth scrolling
        isProgrammaticCategoryScroll = true;
        clearTimeout(categoryScrollUnlockTimer);
        categoryScrollUnlockTimer = setTimeout(() => {
          isProgrammaticCategoryScroll = false;
        }, 900);

        // 3. Scroll to exact top of the category section below sticky header & catnav
        const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72;
        const catH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--catnav-h')) || 68;
        const targetPos = Math.round(targetEl.getBoundingClientRect().top + window.scrollY - (headerH + catH + 12));
        window.scrollTo({ top: targetPos, behavior: 'smooth' });
      }
    });
  });

  if (!catArrowsWired) {
    catArrowsWired = true;
    catPrev?.addEventListener('click', () => {
      catScroller.scrollBy({ left: -260, behavior: 'smooth' });
    });
    catNext?.addEventListener('click', () => {
      catScroller.scrollBy({ left: 260, behavior: 'smooth' });
    });
  }
}
let catArrowsWired = false;

/* ==========================================================================
   RENDER MENU ITEMS
   ========================================================================== */
// State to track selected size index for each item card
const selectedSizes = new Map();

function getItemCurrentOption(item) {
  const selectedIdx = selectedSizes.get(item.id) ?? 0;
  return item.options[selectedIdx] || item.options[0];
}

function renderMenu() {
  menuList.innerHTML = menuCategories
    .map((cat, catIdx) => {
      const idxStr = String(catIdx + 1).padStart(2, '0');
      const totalInCat = cat.items.length;
      const allSizes = Array.from(new Set((cat.groups || []).flatMap((g) => g.sizes || []).filter(Boolean)));

      return `
      <section class="cat-block" id="cat-${cat.id}" data-cat-id="${cat.id}">
        <div class="cat-visual">
          <img src="${esc(cat.image)}" alt="${esc(cat.name)}" style="object-position: ${esc(cat.focus || '50% 50%')}" decoding="async" fetchpriority="low" />
          <span class="cat-visual__index">${idxStr} / ${String(menuCategories.length).padStart(2, '0')}</span>
          <span class="cat-visual__count">${totalInCat} items</span>
          <div class="cat-visual__body">
            <h3 class="cat-visual__title">${esc(cat.name)}</h3>
            ${cat.tagline ? `<p class="cat-visual__tagline">${esc(cat.tagline)}</p>` : ''}
            ${
              allSizes.length > 0
                ? `<div class="cat-visual__sizes">${allSizes.map((s) => `<span>${esc(s)}</span>`).join('')}</div>`
                : ''
            }
          </div>
        </div>

        <div class="items-grid">
          ${
            cat.note
              ? `<div class="items-note">
                  <svg width="20" height="20" class="shrink-0 text-gold-600"><use href="#i-info"/></svg>
                  <span>${esc(cat.note)}</span>
                </div>`
              : ''
          }
          ${cat.items.map((item) => renderItemCard(item, cat)).join('')}
        </div>
      </section>
    `;
    })
    .join('');

  attachItemListeners();
}

function renderItemCard(item, cat) {
  const currentOpt = getItemCurrentOption(item);
  const qtyInCart = cart.qtyOf(item.id, currentOpt.label);
  const isInCart = qtyInCart > 0;
  const hasMultipleSizes = item.options.length > 1;

  return `
    <article class="item-card ${isInCart ? 'in-cart' : ''}" id="card-${item.id}" data-item-id="${item.id}" data-name="${esc(item.name.toLowerCase())}">
      <div class="item-card__top">
        <div>
          <h4 class="item-card__name">${esc(item.name)}</h4>
          <span class="item-card__cat">${esc(cat.short || cat.name)}</span>
        </div>
        <div class="item-card__price" id="price-${item.id}">${formatPrice(currentOpt.price)}</div>
      </div>

      <div class="item-card__bottom">
        ${
          hasMultipleSizes
            ? `<div class="sizes" role="radiogroup" aria-label="Select size for ${item.name}">
                ${item.options
                  .map(
                    (opt, optIdx) => `
                  <button type="button" role="radio"
                    class="size-opt"
                    aria-checked="${optIdx === (selectedSizes.get(item.id) ?? 0) ? 'true' : 'false'}"
                    data-item-id="${item.id}"
                    data-opt-idx="${optIdx}"
                    aria-label="${esc(opt.label)} - ${formatPrice(opt.price)}">
                    <span>${esc(opt.label)}</span>
                    <small>${formatPrice(opt.price)}</small>
                  </button>
                `
                  )
                  .join('')}
              </div>`
            : item.options[0]?.label
            ? `<span class="size-tag">${esc(item.options[0].label)}</span>`
            : `<span></span>`
        }

        <div class="card-action" id="action-${item.id}">
          ${
            isInCart
              ? `<div class="stepper" aria-label="Quantity for ${item.name}">
                  <button type="button" class="btn-step-minus" data-item-id="${item.id}" aria-label="Decrease quantity"><svg width="14" height="14"><use href="#i-minus"/></svg></button>
                  <output aria-live="polite">${qtyInCart}</output>
                  <button type="button" class="btn-step-plus" data-item-id="${item.id}" aria-label="Increase quantity"><svg width="14" height="14"><use href="#i-plus"/></svg></button>
                </div>`
              : `<button type="button" class="add-btn" data-item-id="${item.id}" aria-label="Add ${item.name} to order">
                  <svg width="16" height="16"><use href="#i-plus"/></svg>
                  <span>Add</span>
                </button>`
          }
        </div>
      </div>
    </article>
  `;
}

function updateCardState(itemId) {
  const card = $(`#card-${itemId}`);
  if (!card) return;

  const item = menuCategories.flatMap((c) => c.items).find((i) => i.id === itemId);
  if (!item) return;

  const currentOpt = getItemCurrentOption(item);
  const qtyInCart = cart.qtyOf(item.id, currentOpt.label);
  const isInCart = qtyInCart > 0;

  card.classList.toggle('in-cart', isInCart);

  // Update price display
  const priceEl = $(`#price-${itemId}`, card);
  if (priceEl) priceEl.textContent = formatPrice(currentOpt.price);

  // Update size options radio state
  $$('.size-opt', card).forEach((btn) => {
    const idx = parseInt(btn.dataset.optIdx, 10);
    const active = idx === (selectedSizes.get(itemId) ?? 0);
    btn.setAttribute('aria-checked', active ? 'true' : 'false');
  });

  // Update action button (Add vs Stepper)
  const actionContainer = $(`#action-${itemId}`, card);
  if (actionContainer) {
    if (isInCart) {
      actionContainer.innerHTML = `
        <div class="stepper" aria-label="Quantity for ${item.name}">
          <button type="button" class="btn-step-minus" data-item-id="${item.id}" aria-label="Decrease quantity"><svg width="14" height="14"><use href="#i-minus"/></svg></button>
          <output aria-live="polite">${qtyInCart}</output>
          <button type="button" class="btn-step-plus" data-item-id="${item.id}" aria-label="Increase quantity"><svg width="14" height="14"><use href="#i-plus"/></svg></button>
        </div>
      `;
    } else {
      actionContainer.innerHTML = `
        <button type="button" class="add-btn" data-item-id="${item.id}" aria-label="Add ${item.name} to order">
          <svg width="16" height="16"><use href="#i-plus"/></svg>
          <span>Add</span>
        </button>
      `;
    }
  }
}

let itemListenersWired = false;
function attachItemListeners() {
  if (itemListenersWired) return;
  itemListenersWired = true;
  menuList.addEventListener('click', (e) => {
    // Size option button clicked
    const sizeBtn = e.target.closest('.size-opt');
    if (sizeBtn) {
      const itemId = sizeBtn.dataset.itemId;
      const optIdx = parseInt(sizeBtn.dataset.optIdx, 10);
      selectedSizes.set(itemId, optIdx);
      updateCardState(itemId);
      return;
    }

    // Add button clicked
    const addBtn = e.target.closest('.add-btn');
    if (addBtn) {
      const itemId = addBtn.dataset.itemId;
      const item = menuCategories.flatMap((c) => c.items).find((i) => i.id === itemId);
      const cat = menuCategories.find((c) => c.id === item.categoryId);
      if (item) {
        const option = getItemCurrentOption(item);
        cart.add(item, option, cat?.image);
        updateCardState(itemId);
        animateFlyToCart(addBtn);
        showToast(`Added ${item.name}${option.label ? ` (${option.label})` : ''}`);
      }
      return;
    }

    // Stepper Plus clicked
    const plusBtn = e.target.closest('.btn-step-plus');
    if (plusBtn) {
      const itemId = plusBtn.dataset.itemId;
      const item = menuCategories.flatMap((c) => c.items).find((i) => i.id === itemId);
      if (item) {
        const option = getItemCurrentOption(item);
        const key = cart.keyOf(item.id, option.label);
        cart.change(key, 1);
        updateCardState(itemId);
      }
      return;
    }

    // Stepper Minus clicked
    const minusBtn = e.target.closest('.btn-step-minus');
    if (minusBtn) {
      const itemId = minusBtn.dataset.itemId;
      const item = menuCategories.flatMap((c) => c.items).find((i) => i.id === itemId);
      if (item) {
        const option = getItemCurrentOption(item);
        const key = cart.keyOf(item.id, option.label);
        cart.change(key, -1);
        updateCardState(itemId);
      }
      return;
    }
  });
}

/* ==========================================================================
   LIVE SEARCH
   ========================================================================== */
function setupSearch() {
  const handleSearch = () => {
    const q = menuSearch.value.trim().toLowerCase();
    searchWrap.classList.toggle('has-value', q.length > 0);

    let totalVisible = 0;

    $$('.cat-block').forEach((catBlock) => {
      let visibleInCat = 0;
      $$('.item-card', catBlock).forEach((card) => {
        const name = card.dataset.name || '';
        const match = !q || name.includes(q);
        card.style.display = match ? '' : 'none';
        if (match) visibleInCat++;
      });

      catBlock.style.display = visibleInCat > 0 ? '' : 'none';
      totalVisible += visibleInCat;
    });

    menuEmpty.classList.toggle('is-visible', totalVisible === 0);
  };

  menuSearch?.addEventListener('input', handleSearch);
  searchClear?.addEventListener('click', () => {
    menuSearch.value = '';
    handleSearch();
    menuSearch.focus();
  });
}

/* ==========================================================================
   CATEGORY NAVIGATION SCROLLSPY
   ========================================================================== */
function setupCategoryScrollspy() {
  let ticking = false;

  const updateActiveOnScroll = () => {
    if (isProgrammaticCategoryScroll) return;
    const blocks = $$('.cat-block'); // re-read: the menu can be re-rendered when saved content arrives
    if (blocks.length === 0) return;

    const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72;
    const catH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--catnav-h')) || 68;
    const triggerY = window.scrollY + headerH + catH + 40;

    // Find the current active block: the last block whose top is above triggerY
    let currentBlock = blocks[0];
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const top = block.getBoundingClientRect().top + window.scrollY;
      if (top <= triggerY) {
        currentBlock = block;
      } else {
        break;
      }
    }

    if (currentBlock) {
      const changed = !$(`#chip-${currentBlock.dataset.catId}`)?.classList.contains('is-active');
      if (changed) setActiveCategoryChip(currentBlock.dataset.catId, true);
    }
  };

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateActiveOnScroll();
          ticking = false;
        });
        ticking = true;
      }
    },
    { passive: true }
  );

  // When user manually scrolls with wheel or touch, immediately release programmatic lock
  window.addEventListener('wheel', () => { isProgrammaticCategoryScroll = false; }, { passive: true });
  window.addEventListener('touchstart', () => { isProgrammaticCategoryScroll = false; }, { passive: true });
}

/* ==========================================================================
   CART DRAWER & INTERACTIONS
   ========================================================================== */
function renderCartDrawer(cartInstance) {
  const hasItems = cartInstance.lines.length > 0;

  // Header & drawer counter
  cartCount.textContent = cartInstance.count;
  cartTotalHeader.textContent = formatPrice(cartInstance.total);
  cartSubtitle.textContent = `${cartInstance.count} item${cartInstance.count === 1 ? '' : 's'}`;
  sumCount.textContent = `${cartInstance.count} item${cartInstance.count === 1 ? '' : 's'}`;
  sumTotal.textContent = formatPrice(cartInstance.total);

  // Floating mobile bar
  barCount.textContent = `${cartInstance.count} item${cartInstance.count === 1 ? '' : 's'}`;
  barTotal.textContent = formatPrice(cartInstance.total);
  cartBar.classList.toggle('is-visible', hasItems);
  document.body.classList.toggle('has-cart-bar', hasItems);

  // Cart button bump animation
  cartToggle.classList.remove('bump');
  void cartToggle.offsetWidth;
  if (hasItems) cartToggle.classList.add('bump');

  // Drawer lines
  cartEmpty.style.display = hasItems ? 'none' : 'block';
  checkoutForm.style.display = hasItems ? 'grid' : 'none';
  $('#cart-foot').style.display = hasItems ? 'block' : 'none';

  if (!hasItems) {
    cartLines.innerHTML = '';
    return;
  }

  cartLines.innerHTML = cartInstance.lines
    .map(
      (line) => `
    <div class="cart-line" data-cart-key="${line.key}">
      <img src="${esc(line.image || '/images/deens-logo.webp')}" alt="" class="cart-line__img" decoding="async" />
      <div class="min-w-0">
        <p class="cart-line__name">${esc(line.name)}</p>
        <p class="cart-line__meta">${line.size ? `${esc(line.size)} · ` : ''}${formatPrice(line.price)}</p>
        <button type="button" class="cart-line__remove mt-1" data-cart-key="${line.key}">Remove</button>
      </div>
      <div class="cart-line__right">
        <div class="stepper stepper--sm">
          <button type="button" class="cart-step-minus" data-cart-key="${line.key}" aria-label="Decrease quantity"><svg width="12" height="12"><use href="#i-minus"/></svg></button>
          <output>${line.qty}</output>
          <button type="button" class="cart-step-plus" data-cart-key="${line.key}" aria-label="Increase quantity"><svg width="12" height="12"><use href="#i-plus"/></svg></button>
        </div>
        <span class="cart-line__total">${formatPrice(line.qty * line.price)}</span>
      </div>
    </div>
  `
    )
    .join('');

  // Update all item cards in the menu to match current cart state
  menuCategories.flatMap((c) => c.items).forEach((i) => updateCardState(i.id));
}

function setupCartDrawer() {
  const openDrawer = () => {
    cartDrawer.classList.add('is-open');
    drawerOverlay.classList.add('is-open');
    cartDrawer.setAttribute('aria-hidden', 'false');
    cartToggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('is-locked');
  };

  const closeDrawer = () => {
    cartDrawer.classList.remove('is-open');
    drawerOverlay.classList.remove('is-open');
    cartDrawer.setAttribute('aria-hidden', 'true');
    cartToggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-locked');
  };

  cartToggle?.addEventListener('click', openDrawer);
  cartBar?.addEventListener('click', openDrawer);
  cartClose?.addEventListener('click', closeDrawer);
  drawerOverlay?.addEventListener('click', closeDrawer);
  cartBrowse?.addEventListener('click', () => {
    closeDrawer();
    const menuEl = document.getElementById('menu');
    if (menuEl) menuEl.scrollIntoView({ behavior: 'smooth' });
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cartDrawer.classList.contains('is-open')) closeDrawer();
  });

  // Drawer line events (plus, minus, remove)
  cartLines.addEventListener('click', (e) => {
    const keyBtn = e.target.closest('[data-cart-key]');
    if (!keyBtn) return;
    const key = keyBtn.dataset.cartKey;

    if (keyBtn.classList.contains('cart-step-plus')) {
      cart.change(key, 1);
    } else if (keyBtn.classList.contains('cart-step-minus')) {
      cart.change(key, -1);
    } else if (keyBtn.classList.contains('cart-line__remove')) {
      cart.remove(key);
      showToast('Item removed');
    }
  });

  // Subscribe to cart changes
  cart.subscribe(renderCartDrawer);
}

/* ==========================================================================
   CHECKOUT FORM & WHATSAPP INTEGRATION  (delivery only)
   ========================================================================== */
/** Next order number from the server (unique per day, restarts 4 AM Beirut). Never blocks the order. */
async function fetchOrderNumber() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch('/api/order-number', { method: 'POST', signal: ctrl.signal });
    const data = await res.json();
    if (!res.ok || !data.number) throw new Error('no number');
    return String(data.number);
  } catch (_) {
    const d = new Date();
    return `T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`; // time-based fallback
  } finally {
    clearTimeout(timer);
  }
}

function setupCheckout() {
  const addrField = $('#field-address');
  const nameField = $('#field-name');

  checkoutForm?.addEventListener('input', (e) => e.target.closest('.field')?.classList.remove('has-error'));

  // Load stored customer information
  try {
    const saved = JSON.parse(localStorage.getItem(CUSTOMER_STORAGE) || '{}');
    if (saved.name) $('#cust-name').value = saved.name;
    if (saved.address) $('#cust-address').value = saved.address;
  } catch (_) { /* ignore */ }

  const openSentModal = ({ url, number }) => {
    $('#sent-number').textContent = number;
    if (url) sentRetry.href = url;
    sentRetry.parentElement.hidden = !url;
    sentModal.classList.add('is-open');
    sentModal.setAttribute('aria-hidden', 'false');
  };

  let submitting = false;
  checkoutForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (cart.lines.length === 0 || submitting) return;

    const name = $('#cust-name').value.trim();
    const address = $('#cust-address').value.trim();
    const notes = $('#cust-notes').value.trim();

    nameField.classList.toggle('has-error', !name);
    addrField.classList.toggle('has-error', !address);
    const firstError = $('.field.has-error', checkoutForm);
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    try {
      localStorage.setItem(CUSTOMER_STORAGE, JSON.stringify({ name, address }));
    } catch (_) { /* ignore */ }

    // Open the tab now (inside the tap) so phones don't block it while we fetch the number
    const win = window.open('', '_blank');
    const btnLabel = checkoutBtn.innerHTML;
    submitting = true;
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Preparing your order…';

    let number;
    try {
      number = await fetchOrderNumber();
    } finally {
      submitting = false;
      checkoutBtn.disabled = false;
      checkoutBtn.innerHTML = btnLabel;
    }

    const message = buildWhatsAppMessage(cart, { orderNumber: number, name, address, notes });
    const url = whatsappUrl(message, siteContent.settings.whatsapp);

    if (win) {
      win.opener = null;
      win.location.href = url;
    } else {
      window.location.href = url;
    }
    openSentModal({ url, number });
  });

  const closeSent = () => {
    sentModal.classList.remove('is-open');
    sentModal.setAttribute('aria-hidden', 'true');
  };

  sentClear?.addEventListener('click', () => {
    cart.clear();
    closeSent();
    cartDrawer.classList.remove('is-open');
    drawerOverlay.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    showToast('Order started! Cart cleared.');
  });

  sentKeep?.addEventListener('click', closeSent);
}

/* ==========================================================================
   ANIMATIONS & UI POLISH
   ========================================================================== */
function animateFlyToCart(btn) {
  const rect = btn.getBoundingClientRect();
  const targetRect = cartToggle.getBoundingClientRect();

  const dot = document.createElement('div');
  dot.className = 'fly-dot';
  dot.style.left = `${rect.left + rect.width / 2}px`;
  dot.style.top = `${rect.top + rect.height / 2}px`;
  document.body.appendChild(dot);

  gsap.to(dot, {
    left: targetRect.left + targetRect.width / 2,
    top: targetRect.top + targetRect.height / 2,
    scale: 0.4,
    opacity: 0.2,
    duration: 0.65,
    ease: 'power2.in',
    onComplete: () => dot.remove(),
  });
}

let toastTimer;
function showToast(msg) {
  clearTimeout(toastTimer);
  toastText.textContent = msg;
  toast.classList.add('is-visible');
  toastTimer = setTimeout(() => {
    toast.classList.remove('is-visible');
  }, 2600);
}

function setupScrollAnimations() {
  // Reveal elements on scroll
  $$('.reveal').forEach((el) => {
    gsap.fromTo(
      el,
      { y: 35, autoAlpha: 0 },
      {
        y: 0,
        autoAlpha: 1,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          once: true,
        },
      }
    );
  });

  // Numbers counter for story stats
  const countItems = $$('.cat-block .item-card').length || 108;
  const countCats = menuCategories.length;

  $$('[data-count="items"]').forEach((el) => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        gsap.to({ v: 0 }, {
          v: countItems,
          duration: 1.5,
          ease: 'power2.out',
          onUpdate: function () {
            el.textContent = Math.round(this.targets()[0].v) + '+';
          },
        });
      },
    });
  });

  $$('[data-count="cats"]').forEach((el) => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        gsap.to({ v: 0 }, {
          v: countCats,
          duration: 1.2,
          ease: 'power2.out',
          onUpdate: function () {
            el.textContent = Math.round(this.targets()[0].v);
          },
        });
      },
    });
  });

  // Story image stack subtle parallax
  const stackImages = $$('#story-stack .stack__img');
  stackImages.forEach((img) => {
    const depth = parseFloat(img.dataset.depth || 1);
    gsap.fromTo(
      img,
      { y: -20 * depth },
      {
        y: 25 * depth,
        ease: 'none',
        scrollTrigger: {
          trigger: '#story-stack',
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1,
        },
      }
    );
  });
}

function setupCursor() {
  if (!cursor || window.matchMedia('(hover: none), (pointer: coarse)').matches) return;

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let curX = x;
  let curY = y;

  window.addEventListener('mousemove', (e) => {
    x = e.clientX;
    y = e.clientY;
    cursor.style.opacity = '1';
  });

  const render = () => {
    curX += (x - curX) * 0.18;
    curY += (y - curY) * 0.18;
    cursor.style.transform = `translate3d(${curX}px, ${curY}px, 0)`;
    requestAnimationFrame(render);
  };
  requestAnimationFrame(render);

  const hoverTargets = 'a, button, input, textarea, .cat-chip, .size-opt, .g-item';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(hoverTargets)) cursor.classList.add('is-hover');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(hoverTargets)) cursor.classList.remove('is-hover');
  });
}

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */
function renderGallery() {
  const grid = $('#gallery-grid');
  if (!grid) return;
  grid.innerHTML = siteContent.gallery
    .filter((g) => g && g.src)
    .map((g) => `
      <figure class="g-item ${g.size === 'tall' ? 'g-tall' : g.size === 'wide' ? 'g-wide' : ''} reveal">
        <img src="${esc(g.src)}" alt="${esc(g.caption || "Deen's Coffee Shop")}" decoding="async" fetchpriority="low" style="object-position:${esc(g.focus || '50% 50%')}" />
        ${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ''}
      </figure>`)
    .join('');
}

function setupAdminEntry() {
  $('#admin-open')?.addEventListener('click', async () => {
    // Edit the very latest saved version, not the CDN copy this page loaded
    const [{ openAdmin }, latest] = await Promise.all([import('./admin.js'), loadContent(true)]);
    openAdmin(latest);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wired = false;
let heavyRendered = false;

/** Cheap part: texts, pictures, menu data, event wiring. Runs before the intro. */
function mountLight(content) {
  siteContent = content;
  applyContent(content);
  menuCategories = buildMenu(content.categories);
  populateMarquee();
  if (!wired) {
    wired = true;
    setupSearch();
    setupCategoryScrollspy();
    setupCartDrawer();
    setupCheckout();
    setupCursor();
  }
}

/** Heavy part: ~100 menu cards, gallery and category buttons. Built right after the intro (or on the first touch/scroll). */
function mountHeavy() {
  performance.mark('heavy-start');
  renderGallery();
  renderCategoryNav();
  renderMenu();
  heavyRendered = true;
  renderCartDrawer(cart); // refresh cart + card states against the freshly rendered menu
  performance.mark('heavy-end');
}
window.__ensureMenu = () => { if (!heavyRendered) mountHeavy(); };

function init() {
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  initNav();
  setupAdminEntry();
  captureDefaults();

  // The saved content was requested from <head>; give it up to 700 ms, otherwise start with the
  // built-in menu and swap in the saved one the moment it arrives. The hero never waits on the network.
  const contentPromise = loadContent();
  const ready = (async () => {
    const saved = await Promise.race([contentPromise, sleep(700).then(() => null)]);
    mountLight(saved || defaultContent());
    if (!saved) {
      contentPromise.then((late) => {
        if (!late || !late.fromServer) return;
        mountLight(late);
        if (heavyRendered) { mountHeavy(); ScrollTrigger.refresh(); }
      });
    }
  })();

  // Someone who scrolls/taps before the intro ends still gets the menu instantly
  const early = () => window.__ensureMenu();
  ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach((t) => window.addEventListener(t, early, { once: true, passive: true }));

  initHero({
    ready,
    onIntroDone: () => {
      const run = () => {
        window.__ensureMenu();
        // let the freshly built menu lay out, then set up scroll effects
        requestAnimationFrame(() => {
          performance.mark('scroll-setup-start');
          setupScrollAnimations();
          ScrollTrigger.refresh();
          performance.mark('scroll-setup-end');
        });
      };
      if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 800 });
      else setTimeout(run, 200);
    },
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
