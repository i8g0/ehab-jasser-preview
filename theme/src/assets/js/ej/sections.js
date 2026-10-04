/**
 * Home sections: boutique filters (with a FLIP re-flow), the directions compass and the mood picker.
 */
import { tilt } from './motion.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- boutique ---------- */
export function boutique() {
  $$('[data-ej-boutique]').forEach((root) => {
    const tabs = $('[data-ej-tabs]', root);
    const grid = $('[data-ej-grid]', root);
    if (!tabs || !grid) return;
    const ink = $('[data-ej-ink]', tabs);
    const cards = $$('[data-ej-card]', grid);

    const moveInk = (btn) => {
      if (!ink || !btn) return;
      /* measure against the ink itself, so RTL scroll origins and scrolled rails never matter */
      const current = new DOMMatrixReadOnly(getComputedStyle(ink).transform).m41 || 0;
      const delta = btn.getBoundingClientRect().left - ink.getBoundingClientRect().left;
      ink.style.width = `${btn.offsetWidth}px`;
      ink.style.transform = `translateX(${current + delta}px)`;
    };

    const apply = (filter, btn) => {
      $$('[role="tab"]', tabs).forEach((t) => {
        const on = t === btn;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      moveInk(btn);
      btn.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduced ? 'auto' : 'smooth' });

      /* FLIP: remember positions, toggle, then animate from the old spot */
      const first = new Map(cards.map((c) => [c, c.getBoundingClientRect()]));
      cards.forEach((c) => {
        const show = filter === '*' || c.dataset.category === filter;
        c.classList.toggle('is-filtered', !show);
        c.classList.add('is-in');
      });
      if (reduced) return;
      cards.forEach((c, i) => {
        if (c.classList.contains('is-filtered')) return;
        const a = first.get(c);
        const b = c.getBoundingClientRect();
        if (!a.width) {
          c.animate([{ opacity: 0, transform: 'translateY(24px) scale(.96)' }, { opacity: 1, transform: 'none' }],
            { duration: 600, delay: i * 40, easing: 'cubic-bezier(.2,.75,.2,1)', fill: 'backwards' });
          return;
        }
        const dx = a.left - b.left;
        const dy = a.top - b.top;
        if (dx || dy) {
          c.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 650, easing: 'cubic-bezier(.2,.75,.2,1)' });
        }
      });
    };

    tabs.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-filter]');
      if (btn) apply(btn.dataset.filter, btn);
    });
    const realign = () => moveInk($('.is-active', tabs));
    requestAnimationFrame(realign);
    document.fonts?.ready.then(realign);
    addEventListener('resize', realign);

    /* entry links like "#shop" from collection rings can pre-select a tab: #shop:اتجاهات */
    const fromHash = decodeURIComponent(location.hash.split(':')[1] || '');
    if (fromHash) {
      const btn = $$('[data-filter]', tabs).find((b) => b.dataset.filter === fromHash);
      if (btn) apply(fromHash, btn);
    }
  });
}

/* ---------- compass ---------- */
const HEADINGS = { N: 0, E: 90, S: 180, W: 270 };

export function compass() {
  $$('[data-ej-compass]').forEach((root) => {
    const track = $('[data-ej-compass-track]', root);
    const needle = $('.ej-compass__needle', root);
    if (!track || !needle) return;
    const items = $$('[data-dir]', track);
    let angle = 0;

    const point = (letter) => {
      const target = HEADINGS[letter] ?? 0;
      /* shortest turn so the needle never spins the long way round */
      let delta = ((target - angle) % 360 + 540) % 360 - 180;
      angle += delta;
      needle.style.transform = `rotate(${angle}deg)`;
      $$('.ej-compass__l', root).forEach((l) => l.classList.toggle('is-on', l.dataset.l === letter));
      items.forEach((it) => it.classList.toggle('is-current', it.dataset.dir === letter));
    };

    /* phones: whichever card is centred in the rail */
    const phone = matchMedia('(max-width: 899px)');
    const io = new IntersectionObserver((entries) => {
      if (!phone.matches) return;
      entries.forEach((e) => { if (e.isIntersecting && e.intersectionRatio > 0.6) point(e.target.dataset.dir); });
    }, { root: track, threshold: [0.6] });
    items.forEach((it) => io.observe(it));

    /* desktop: hover or focus */
    items.forEach((it) => {
      it.addEventListener('pointerenter', () => point(it.dataset.dir));
      it.addEventListener('focusin', () => point(it.dataset.dir));
    });

    /* tapping a compass letter brings its perfume into view */
    $$('.ej-compass__l', root).forEach((l) => {
      l.addEventListener('click', () => {
        const it = items.find((i) => i.dataset.dir === l.dataset.l);
        if (!it) return;
        point(l.dataset.l);
        it.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
      });
    });

    const featured = items.find((it) => it.querySelector('.ej-card__badge')) || items[0];
    if (featured) {
      point(featured.dataset.dir);
      /* on phones, open the rail on the featured perfume */
      if (phone.matches) requestAnimationFrame(() => { track.scrollLeft += featured.getBoundingClientRect().left - (track.getBoundingClientRect().left + (track.clientWidth - featured.offsetWidth) / 2); });
    }
  });
}

/* ---------- mood ---------- */
export function mood() {
  $$('[data-ej-mood]').forEach((root) => {
    const buttons = $$('[data-mood-pick]', root);
    const imgs = $$('[data-mood-img]', root);
    const line = $('[data-ej-mood-line]', root);
    const cta = $('[data-ej-mood-cta]', root);

    const pick = (i) => {
      const b = buttons[i];
      if (!b) return;
      root.dataset.mood = String(i);
      buttons.forEach((x, j) => { x.classList.toggle('is-active', j === i); x.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
      imgs.forEach((img, j) => {
        img.classList.toggle('is-active', j === i);
        if (j === i) img.setAttribute('data-ej-fly-src', ''); else img.removeAttribute('data-ej-fly-src');
      });
      if (line) {
        line.classList.remove('is-swap');
        void line.offsetWidth;
        line.textContent = `«${b.dataset.line}»`;
        line.classList.add('is-swap');
      }
      if (cta) {
        ['ejAdd', 'name', 'image', 'url', 'price'].forEach((k) => { cta.dataset[k] = b.dataset[k]; });
        $('[data-ej-mood-name]', cta).textContent = b.dataset.name;
        $('[data-ej-mood-price]', cta).textContent = b.dataset.priceText;
      }
    };

    buttons.forEach((b, i) => b.addEventListener('click', () => pick(i)));

    /* swipe the bottle to change mood */
    const stage = $('.ej-mood__stage', root);
    let sx = null;
    stage?.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    stage?.addEventListener('touchend', (e) => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx;
      sx = null;
      if (Math.abs(dx) < 40) return;
      const cur = Number(root.dataset.mood) || 0;
      const step = (dx > 0) === (document.dir === 'rtl') ? 1 : -1;
      pick((cur + step + buttons.length) % buttons.length);
    });
  });
  tilt();
}
