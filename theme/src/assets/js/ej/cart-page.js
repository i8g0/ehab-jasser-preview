/**
 * Cart page: quantity / remove on server-rendered lines, live totals, free-shipping bar and checkout.
 * When the page arrives without lines but the cart has items (the Vercel preview), lines are drawn client-side.
 */
import * as store from './store.js';
import { lineHTML, render as renderMini, renderFreeShipping } from './cart-ui.js';

const $ = (s, r = document) => r.querySelector(s);

export function cartPage() {
  const root = $('[data-ej-cartpage]');
  if (!root) return;
  const lines = $('[data-ej-cart-lines]', root);
  const empty = $('[data-ej-cart-empty]', root);
  let cart = store.normalizeCart(null);

  const paint = (next, { redraw = false } = {}) => {
    cart = next;
    if (redraw || (!lines.children.length && next.items.length)) lines.innerHTML = next.items.map(lineHTML).join('');
    next.items.forEach((item) => {
      const line = lines.querySelector(`[data-item-id="${item.id}"]`);
      if (!line) return;
      line.querySelector('[data-ej-line-qty]').textContent = store.arabicDigits(item.quantity);
      line.querySelector('.ej-line__total').textContent = store.money(item.total);
    });
    [...lines.children].forEach((line) => {
      if (!next.items.some((i) => String(i.id) === line.dataset.itemId)) {
        line.classList.add('is-leaving');
        setTimeout(() => line.remove(), 420);
      }
    });
    empty.hidden = next.count > 0;
    $('[data-ej-summary]', root).classList.toggle('is-empty', next.count === 0);
    $('[data-ej-sum-sub]', root).textContent = store.money(next.subTotal);
    $('[data-ej-sum-total]', root).textContent = store.money(next.total);
    renderFreeShipping(root, next);
    renderMini(next);
  };

  lines.addEventListener('click', async (e) => {
    const line = e.target.closest('.ej-line');
    if (!line) return;
    const step = e.target.closest('[data-ej-line-step]');
    const removing = e.target.closest('[data-ej-line-remove]');
    if (!step && !removing) return;
    const item = cart.items.find((i) => String(i.id) === line.dataset.itemId);
    const next = removing ? 0 : (item?.quantity || 1) + Number(step.dataset.ejLineStep);
    line.classList.add('is-busy');
    try {
      const result = next < 1 ? await store.remove(line.dataset.itemId) : await store.update(line.dataset.itemId, next);
      paint(result.items.length || next < 1 ? result : await store.details());
    } finally {
      line.classList.remove('is-busy');
    }
  });

  $('[data-ej-checkout]', root)?.addEventListener('click', () => store.checkout());
  document.addEventListener('ej:cart', (e) => paint(e.detail, { redraw: true }));

  store.ready(async () => paint(await store.details()));
}
