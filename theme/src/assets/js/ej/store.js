/**
 * The only file that talks to Salla's Twilight SDK (window.salla).
 * Everything else in the theme goes through these helpers, so a Salla API change is fixed here once.
 * Method names follow @salla.sa/twilight typings: cart.addItem / updateItem / deleteItem / details / submit,
 * cart.event.onUpdated / onItemAdded, salla.money, salla.event.dispatch.
 */

const sdk = () => window.salla;
const META_KEY = 'ej:product-meta';

/** Run once Salla is ready (falls back to DOM ready when the SDK is missing). */
export function ready(cb) {
  const run = () => (sdk()?.onReady ? sdk().onReady(cb) : cb());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
}

const DIGITS = '٠١٢٣٤٥٦٧٨٩';
export const arabicDigits = (v) => String(v).replace(/[0-9]/g, (d) => DIGITS[d]);

export function money(n) {
  const value = Number(n) || 0;
  if (sdk()?.money) return sdk().money(value);
  const s = value % 1 === 0 ? value.toLocaleString('en-US') : value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${arabicDigits(s).replace(/,/g, '٬').replace(/\./g, '٫')} ر.س`;
}

/* Product name/image cache: cart APIs may return only ids, cards know the rest. */
function readMeta() {
  try { return JSON.parse(localStorage.getItem(META_KEY)) || {}; } catch { return {}; }
}
export function rememberProduct(id, meta) {
  if (!id || !meta) return;
  try {
    const all = readMeta();
    all[id] = { ...all[id], ...meta };
    localStorage.setItem(META_KEY, JSON.stringify(all));
  } catch { /* private mode: the drawer falls back to API fields */ }
}

/** Normalise a Salla CartSummary into what the UI needs. */
export function normalizeCart(cart) {
  const meta = readMeta();
  const items = (cart?.items || []).map((item) => {
    const m = meta[item.product_id] || {};
    const price = Number(item.product_price ?? item.price ?? m.price ?? 0);
    const quantity = Number(item.quantity) || 1;
    return {
      id: item.id,
      productId: item.product_id,
      name: item.product_name || item.name || m.name || '',
      image: item.product_image || item.image || m.image || '',
      url: item.url || m.url || '#',
      quantity,
      price,
      total: Number(item.total ?? price * quantity),
    };
  });
  const count = Number(cart?.count ?? items.reduce((s, i) => s + i.quantity, 0));
  return {
    count,
    subTotal: Number(cart?.sub_total ?? cart?.total ?? 0),
    total: Number(cart?.total ?? cart?.sub_total ?? 0),
    freeShipping: cart?.free_shipping_bar || null,
    items,
  };
}

const cartOf = (response) => normalizeCart(response?.data?.cart || response?.data || response);

export async function details() {
  if (!sdk()?.cart?.details) return normalizeCart(null);
  try {
    return cartOf(await sdk().cart.details());
  } catch {
    return normalizeCart(null);
  }
}

export async function add(productId, quantity = 1, meta) {
  rememberProduct(productId, meta);
  const response = await sdk().cart.addItem({ id: Number(productId), quantity: Number(quantity) || 1 });
  return cartOf(response);
}

export async function update(itemId, quantity) {
  return cartOf(await sdk().cart.updateItem({ id: Number(itemId), quantity: Number(quantity) }));
}

export async function remove(itemId) {
  return cartOf(await sdk().cart.deleteItem(Number(itemId)));
}

export function checkout() {
  return sdk()?.cart?.submit?.();
}

/** Fires with a normalised summary whenever Salla reports a cart change (from any source). */
export function onChange(cb) {
  sdk()?.cart?.event?.onUpdated?.((summary) => cb(normalizeCart(summary)));
}

export function openSearch() {
  sdk()?.event?.dispatch?.('search::open');
}
