/**
 * Mini-cart experience shared by every page: fly-to-cart, badge bump, toast, floating pill and drawer.
 * Any element with [data-ej-add="<product id>"] becomes an add-to-cart button.
 */
import * as store from './store.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const S = () => window.EJ_SETTINGS || {};
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

let current = store.normalizeCart(null);
let toastTimer;
let audio;

/* ---------- rendering ---------- */

export function lineHTML(item) {
  const i18n = S().i18n || {};
  return `
    <div class="ej-line" data-item-id="${item.id}" data-product-id="${item.productId}" data-price="${item.price}">
      <a class="ej-line__img" href="${item.url}"><img src="${item.image}" alt="${escapeHTML(item.name)}" loading="lazy"></a>
      <div class="ej-line__body">
        <div class="ej-line__top">
          <a class="ej-line__name" href="${item.url}">${escapeHTML(item.name)}</a>
          <strong class="ej-line__total">${store.money(item.total)}</strong>
        </div>
        <div class="ej-line__bottom">
          <div class="ej-qty ej-qty--sm">
            <button type="button" data-ej-line-step="1" aria-label="${i18n.increase || '+'}">+</button>
            <span data-ej-line-qty>${store.arabicDigits(item.quantity)}</span>
            <button type="button" data-ej-line-step="-1" aria-label="${i18n.decrease || '-'}">−</button>
          </div>
          <button type="button" class="ej-line__remove" data-ej-line-remove>${i18n.remove || '×'}</button>
        </div>
      </div>
    </div>`;
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function renderFreeShipping(root, cart) {
  const box = $('[data-ej-free]', root);
  if (!box) return;
  const bar = cart.freeShipping;
  if (!bar || !cart.count) { box.hidden = true; return; }
  const i18n = S().i18n || {};
  box.hidden = false;
  box.classList.toggle('is-done', !!bar.has_free_shipping);
  $('[data-ej-free-text]', box).textContent = bar.has_free_shipping
    ? i18n.freeDone
    : (i18n.freeLeft || '{amount}').replace('{amount}', store.money(bar.remaining));
  $('[data-ej-free-fill]', box).style.width = `${Math.min(100, Number(bar.percent) || 0)}%`;
}

export function render(cart) {
  current = cart;
  const count = cart.count;
  $$('[data-ej-cart-count]').forEach((el) => { el.textContent = store.arabicDigits(count); el.hidden = !count; });
  $$('[data-ej-cart-count-text]').forEach((el) => { el.textContent = store.arabicDigits(count); });
  $$('[data-ej-subtotal]').forEach((el) => { el.textContent = store.money(cart.subTotal); });
  $$('[data-ej-installment]').forEach((el) => el.setAttribute('price', cart.total));

  const pill = $('[data-ej-pill]');
  if (pill) pill.hidden = !count || document.body.classList.contains('page-cart');

  const drawer = $('[data-ej-drawer]');
  if (!drawer) return;
  $('[data-ej-lines]', drawer).innerHTML = cart.items.map(lineHTML).join('');
  $('[data-ej-empty]', drawer).hidden = count > 0;
  $('[data-ej-foot]', drawer).hidden = count === 0;
  renderFreeShipping(drawer, cart);
}

/* ---------- motion ---------- */

function bump() {
  $$('[data-ej-cart-count]').forEach((el) => {
    el.classList.remove('is-bump');
    void el.offsetWidth;
    el.classList.add('is-bump');
  });
}

function chime() {
  if (!S().sound) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audio = audio || new Ctx();
    const t = audio.currentTime;
    [[1046.5, 0], [1568, 0.09]].forEach(([f, d]) => {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t + d);
      g.gain.setValueAtTime(0.0001, t + d);
      g.gain.exponentialRampToValueAtTime(0.05, t + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.6);
      o.connect(g).connect(audio.destination);
      o.start(t + d);
      o.stop(t + d + 0.65);
    });
  } catch { /* audio is a nicety */ }
  navigator.vibrate?.(12);
}

/** Flies a copy of the product image into the cart icon along a curved path. */
function fly(sourceImg) {
  const target = $$('[data-ej-cart-target]').find((el) => el.offsetParent !== null);
  if (!sourceImg || !target || reduced()) return Promise.resolve();
  const from = sourceImg.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (!from.width) return Promise.resolve();
  const ghost = sourceImg.cloneNode();
  ghost.removeAttribute('data-ej-fly-src');
  ghost.className = 'ej-fly';
  Object.assign(ghost.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
  document.body.appendChild(ghost);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const anim = ghost.animate([
    { transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1 },
    { transform: `translate(${dx * 0.35}px, ${dy * 0.15 - 90}px) scale(.62) rotate(-8deg)`, opacity: 1, offset: 0.45 },
    { transform: `translate(${dx}px, ${dy}px) scale(.08) rotate(-28deg)`, opacity: 0.2 },
  ], { duration: 820, easing: 'cubic-bezier(.55,0,.25,1)' });
  /* never let a throttled/background tab hold the cart update hostage */
  const settle = Promise.race([anim.finished, new Promise((r) => setTimeout(r, 950))]);
  return settle.then(() => ghost.remove(), () => ghost.remove());
}

function toast(image) {
  const el = $('[data-ej-toast]');
  if (!el) return;
  $('[data-ej-toast-img]', el).src = image || '';
  el.hidden = false;
  el.classList.remove('is-out');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.add('is-out');
    setTimeout(() => { el.hidden = true; }, 400);
  }, 2800);
}

/* ---------- drawer ---------- */

let lastFocus;
export function openDrawer() {
  const drawer = $('[data-ej-drawer]');
  if (!drawer) return;
  lastFocus = document.activeElement;
  drawer.hidden = false;
  requestAnimationFrame(() => drawer.classList.add('is-open'));
  document.documentElement.classList.add('ej-locked');
  $('[data-ej-toast]')?.setAttribute('hidden', '');
  setTimeout(() => $('.ej-drawer__panel button', drawer)?.focus({ preventScroll: true }), 50);
}

export function closeDrawer() {
  const drawer = $('[data-ej-drawer]');
  if (!drawer || drawer.hidden) return;
  drawer.classList.remove('is-open');
  document.documentElement.classList.remove('ej-locked');
  setTimeout(() => { drawer.hidden = true; }, 520);
  lastFocus?.focus?.({ preventScroll: true });
}

/* ---------- wiring ---------- */

async function handleAdd(btn) {
  if (btn.classList.contains('is-busy')) return;
  const id = btn.dataset.ejAdd;
  let qty = 1;
  if (btn.hasAttribute('data-ej-with-qty')) qty = Number($('[data-ej-qty-input]')?.value) || 1;
  const box = btn.closest('[data-ej-card], .ej-heritage, .ej-year, [data-ej-mood], .ej-product, .ej-buybar');
  const img = box?.querySelector('[data-ej-fly-src]') || box?.querySelector('img');
  const meta = { name: btn.dataset.name, image: btn.dataset.image, url: btn.dataset.url, price: Number(btn.dataset.price) };

  btn.classList.add('is-busy');
  try {
    const flight = fly(img);
    const cart = await store.add(id, qty, meta);
    await flight;
    render(cart.items.length ? cart : await store.details());
    bump();
    chime();
    toast(meta.image);
    btn.classList.add('is-done');
    setTimeout(() => btn.classList.remove('is-done'), 1200);
  } catch (e) {
    console.warn('[EJ] add to cart failed', e);
  } finally {
    btn.classList.remove('is-busy');
  }
}

async function handleLineStep(line, step) {
  const qtyEl = $('[data-ej-line-qty]', line);
  const next = Number(qtyEl.dataset.qty || current.items.find((i) => String(i.id) === line.dataset.itemId)?.quantity || 1) + step;
  line.classList.add('is-busy');
  try {
    const cart = next < 1 ? await store.remove(line.dataset.itemId) : await store.update(line.dataset.itemId, next);
    const fresh = cart.items.length || next < 1 ? cart : await store.details();
    render(fresh);
    document.dispatchEvent(new CustomEvent('ej:cart', { detail: fresh }));
  } finally {
    line.classList.remove('is-busy');
  }
}

export function init() {
  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-ej-add]');
    if (add && !add.hasAttribute('data-mood-pick')) { e.preventDefault(); handleAdd(add); return; }

    const open = e.target.closest('[data-ej-cart-open]');
    if (open && !document.body.classList.contains('page-cart')) { e.preventDefault(); openDrawer(); return; }

    if (e.target.closest('[data-ej-cart-close]')) { closeDrawer(); return; }

    const drawerLine = e.target.closest('[data-ej-drawer] .ej-line');
    if (drawerLine) {
      const step = e.target.closest('[data-ej-line-step]');
      if (step) handleLineStep(drawerLine, Number(step.dataset.ejLineStep));
      if (e.target.closest('[data-ej-line-remove]')) handleLineStep(drawerLine, -999);
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

  store.ready(async () => {
    render(await store.details());
    store.onChange(async (summary) => {
      if (summary.count !== current.count || summary.total !== current.total) render(await store.details());
    });
  });
}

export const getCurrent = () => current;
