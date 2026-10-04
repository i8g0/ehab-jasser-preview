/**
 * Salla simulator for the Vercel preview ONLY — never copy this into the Salla theme.
 * On a real Salla store, `window.salla` (Twilight SDK) and the <salla-*> web components are injected by Salla.
 * This file implements the small subset the theme uses, with a cart kept in localStorage.
 */
(function () {
  const DATA = window.__EJ_PREVIEW__ || { products: [], menus: {}, comments: {} };
  const KEY = 'ej-preview-cart';
  const FREE_SHIPPING = 500;
  const byId = Object.fromEntries(DATA.products.map((p) => [String(p.id), p]));
  const listeners = {};
  const on = (name, cb) => { (listeners[name] = listeners[name] || []).push(cb); };
  const emit = (name, ...args) => (listeners[name] || []).forEach((cb) => { try { cb(...args); } catch (e) { console.error(e); } });

  const DIGITS = '٠١٢٣٤٥٦٧٨٩';
  const ar = (s) => String(s).replace(/[0-9]/g, (d) => DIGITS[d]).replace(/,/g, '٬').replace(/\./g, '٫');
  const money = (n) => {
    const v = Math.round(Number(n) * 100) / 100;
    const s = v % 1 === 0 ? v.toLocaleString('en-US') : v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${ar(s)} ر.س`;
  };

  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const write = (lines) => { try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* ignore */ } };

  function summary() {
    const lines = read().filter((l) => byId[l.product_id]);
    const items = lines.map((l) => {
      const p = byId[l.product_id];
      return {
        id: l.id, product_id: p.id, product_name: p.name, product_image: p.image, url: p.url,
        product_price: p.price, price: p.price, quantity: l.quantity, total: p.price * l.quantity, is_available: true,
      };
    });
    const sub = items.reduce((s, i) => s + i.total, 0);
    const count = items.reduce((s, i) => s + i.quantity, 0);
    return {
      id: 1, count, sub_total: sub, total: sub, discount: 0, items,
      free_shipping_bar: { minimum_amount: FREE_SHIPPING, has_free_shipping: sub >= FREE_SHIPPING, percent: Math.min(100, Math.round((sub / FREE_SHIPPING) * 100)), remaining: Math.max(0, FREE_SHIPPING - sub) },
    };
  }
  const respond = (extra) => {
    const cart = summary();
    setTimeout(() => emit('cart::updated', cart), 0);
    return Promise.resolve({ success: true, data: { cart, ...extra } });
  };
  const delay = (v) => new Promise((r) => setTimeout(() => r(v), 260));

  const cart = {
    details: () => delay().then(() => ({ success: true, data: { cart: summary() } })),
    latest: () => cart.details(),
    addItem: ({ id, quantity = 1 }) => delay().then(() => {
      const lines = read();
      const line = lines.find((l) => String(l.product_id) === String(id));
      if (line) line.quantity = Math.min(10, line.quantity + Number(quantity));
      else lines.push({ id: Date.now(), product_id: Number(id), quantity: Number(quantity) });
      write(lines);
      return respond({ product_id: id }).then((r) => { emit('cart::item.added', r, id); return r; });
    }),
    updateItem: ({ id, quantity }) => delay().then(() => {
      write(read().map((l) => (String(l.id) === String(id) ? { ...l, quantity: Math.max(1, Math.min(10, Number(quantity))) } : l)));
      return respond();
    }),
    deleteItem: (id) => delay().then(() => { write(read().filter((l) => String(l.id) !== String(id))); return respond(); }),
    submit: () => checkoutNotice(),
    addCoupon: () => Promise.reject(new Error('preview')),
    event: {
      onUpdated: (cb) => on('cart::updated', cb),
      onItemAdded: (cb) => on('cart::item.added', cb),
      onItemAddedFailed: () => {},
    },
  };

  window.salla = {
    onReady(cb) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => cb()); else setTimeout(cb, 0); return Promise.resolve(); },
    money,
    cart,
    config: { get: (k) => (k === 'theme.is_rtl' ? true : undefined) },
    event: { dispatch: (name, ...a) => emit(name, ...a), on },
    lang: { get: (k) => k },
    notify: { success: console.info, error: console.warn },
  };

  /* ---------- checkout stand-in ---------- */
  function checkoutNotice() {
    const el = document.createElement('div');
    el.className = 'pv-modal';
    el.innerHTML = `<div class="pv-modal__box"><span class="pv-modal__eyebrow">SALLA CHECKOUT</span><h3>هنا تبدأ صفحة الدفع في سلة</h3><p>في المتجر الحقيقي ينتقل العميل لصفحة الدفع الرسمية في سلة (مدى، Apple Pay، تمارا، الدفع عند الاستلام). هذه نسخة معاينة.</p><button type="button">تمام</button></div>`;
    el.addEventListener('click', (e) => { if (e.target === el || e.target.tagName === 'BUTTON') el.remove(); });
    document.body.appendChild(el);
  }

  /* ---------- web component stand-ins ---------- */
  const define = (name, cls) => { if (!customElements.get(name)) customElements.define(name, cls); };

  define('salla-menu', class extends HTMLElement {
    connectedCallback() {
      const items = DATA.menus[this.getAttribute('source') || 'header'] || [];
      this.innerHTML = `<ul>${items.map((m) => `<li><a href="${m.url}">${m.title}</a></li>`).join('')}</ul>`;
    }
  });

  define('salla-installment', class extends HTMLElement {
    static get observedAttributes() { return ['price']; }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { this.render(); }
    render() {
      const price = Number(this.getAttribute('price')) || 0;
      this.innerHTML = price ? `<span class="pv-tamara">أو ٤ دفعات بقيمة <b>${money(price / 4)}</b> بدون فوائد مع <i>tamara</i></span>` : '';
    }
  });

  const cardHTML = (p) => `
    <article class="ej-card ej-card--tall" data-ej-card>
      <a class="ej-card__stage" href="${p.url}" data-tilt aria-label="${p.name}">
        <span class="ej-card__frame" aria-hidden="true"></span>
        ${p.promotion_title ? `<span class="ej-card__badge">${p.promotion_title}</span>` : ''}
        <img class="ej-card__img" src="${p.image}" alt="${p.name}" loading="lazy" data-ej-fly-src>
        <span class="ej-card__floor" aria-hidden="true"></span><span class="ej-card__sheen" aria-hidden="true"></span>
      </a>
      <button class="ej-card__add" type="button" data-ej-add="${p.id}" data-name="${p.name}" data-image="${p.image}" data-url="${p.url}" data-price="${p.price}" aria-label="أضف للسلة: ${p.name}">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
      </button>
      <a class="ej-card__meta" href="${p.url}" tabindex="-1">
        <span class="ej-card__latin ej-latin">${p.subtitle}</span><span class="ej-card__name">${p.name}</span>
        <span class="ej-card__rule" aria-hidden="true"></span><span class="ej-card__price">${money(p.price)}</span>
      </a>
    </article>`;

  define('salla-products-slider', class extends HTMLElement {
    connectedCallback() {
      const self = byId[this.getAttribute('source-value')];
      const related = DATA.products.filter((p) => self && p.id !== self.id && p.category === self.category);
      const pool = [...related, ...DATA.products.filter((p) => self && p.id !== self.id && p.category !== self.category)].slice(0, 8);
      this.innerHTML = `<div class="pv-rail ej-snap">${pool.map(cardHTML).join('')}</div>`;
    }
  });

  define('salla-comments', class extends HTMLElement {
    connectedCallback() {
      const p = byId[this.getAttribute('item-id')];
      const list = (p && DATA.comments[p.slug]) || [];
      if (!list.length) { this.innerHTML = '<p class="pv-empty">لا توجد تقييمات بعد — كن أول من يكتب رأيه.</p>'; return; }
      this.innerHTML = `<div class="pv-comments">${list.map((c, i) => `
        <article class="pv-comment" data-reveal style="--i:${i}">
          <header><strong>${c.name}</strong><span>${c.when}</span></header>
          <span class="ej-stars" style="--stars:${c.stars}" aria-label="${c.stars}/5">★★★★★</span>
          <p>${c.text}</p>
          ${c.badge ? `<small>${c.badge}</small>` : ''}
          ${c.reply ? `<blockquote>${c.reply}</blockquote>` : ''}
        </article>`).join('')}</div>`;
    }
  });

  define('salla-search', class extends HTMLElement {
    connectedCallback() {
      this.innerHTML = `
        <div class="pv-search" hidden>
          <div class="pv-search__box">
            <div class="pv-search__bar"><input type="search" placeholder="ابحث عن عطرك…" aria-label="بحث"><button type="button" aria-label="إغلاق">✕</button></div>
            <div class="pv-search__hint">الأكثر بحثًا: ${['ڤيلور', '1926', 'إيست', 'مود', 'العود'].map((t) => `<button type="button" data-q="${t}">${t}</button>`).join('')}</div>
            <div class="pv-search__results"></div>
          </div>
        </div>`;
      const wrap = this.querySelector('.pv-search');
      const input = this.querySelector('input');
      const results = this.querySelector('.pv-search__results');
      const run = () => {
        const q = input.value.trim().toLowerCase();
        const found = q ? DATA.products.filter((p) => `${p.name} ${p.subtitle} ${p.category}`.toLowerCase().includes(q)) : [];
        results.innerHTML = found.map((p) => `<a href="${p.url}"><img src="${p.image}" alt=""><span><b>${p.name}</b><small>${p.category} · ${money(p.price)}</small></span></a>`).join('')
          || (q ? '<p>ما لقينا شي بهالاسم.. جرّب كلمة ثانية</p>' : '');
      };
      input.addEventListener('input', run);
      this.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => { input.value = b.dataset.q; run(); }));
      const close = () => { wrap.classList.remove('is-open'); setTimeout(() => { wrap.hidden = true; }, 300); };
      this.querySelector('.pv-search__bar button').addEventListener('click', close);
      wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
      on('search::open', () => { wrap.hidden = false; requestAnimationFrame(() => wrap.classList.add('is-open')); setTimeout(() => input.focus(), 50); });
    }
  });
})();
