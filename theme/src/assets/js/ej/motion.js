/**
 * Scroll choreography: reveals (play once), word splits, letter splits, number count-up, parallax,
 * card tilt + sheen, magnetic buttons and the gold cursor glow. All of it respects reduced motion.
 */
import { arabicDigits } from './store.js';

const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

/* Arabic must be split by words (never letters) so the joined script stays intact. */
function splitWords(el) {
  if (el.dataset.splitDone) return;
  el.dataset.splitDone = '1';
  let i = 0;
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          const outer = document.createElement('span');
          outer.className = 'ej-w';
          const inner = document.createElement('span');
          inner.textContent = part;
          inner.style.setProperty('--wi', i++);
          outer.appendChild(inner);
          frag.appendChild(outer);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1 && child.tagName !== 'BR') {
        walk(child);
      }
    });
  };
  walk(el);
}

/* Latin wordmarks (VELOUR) can be split by letter. */
function splitLetters(el) {
  if (el.dataset.lettersDone) return;
  el.dataset.lettersDone = '1';
  const text = el.textContent.trim();
  el.setAttribute('aria-label', text);
  el.innerHTML = [...text].map((c, i) => `<span class="ej-l" aria-hidden="true" style="--li:${i}">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
}

function countUp(el) {
  const target = parseInt(el.dataset.count, 10);
  if (!target || reduced) return;
  const from = Math.max(0, target - 26);
  const start = performance.now();
  const dur = 1600;
  const latin = el.classList.contains('ej-latin');
  const tick = (now) => {
    const p = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - p, 4);
    const v = Math.round(from + (target - from) * eased);
    el.textContent = latin ? v : arabicDigits(v);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function reveals(root = document) {
  $$('[data-split]', root).forEach(splitWords);
  $$('[data-words]', root).forEach(splitWords);
  $$('[data-letters]', root).forEach(splitLetters);

  const targets = $$('[data-reveal], [data-split], [data-mask-reveal], [data-arch-reveal], [data-sign], [data-letters], [data-count]', root)
    .filter((el) => !el.classList.contains('is-in'));
  if (reduced || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('is-in');
      if (el.hasAttribute('data-count')) countUp(el);
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
  targets.forEach((el) => io.observe(el));
}

/* ---------- parallax: one rAF loop, transform only ---------- */
export function parallax() {
  if (reduced) return;
  const items = $$('[data-parallax]').map((el) => ({ el, k: parseFloat(el.dataset.parallax) || 0.1 }));
  if (!items.length) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    const vh = innerHeight;
    items.forEach(({ el, k }) => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const offset = (r.top + r.height / 2 - vh / 2) * -k;
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    });
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();
}

/* ---------- tilt + sheen on product stages (desktop pointers) ---------- */
export function tilt(root = document) {
  if (reduced || !finePointer) return;
  $$('[data-tilt]', root).forEach((el) => {
    if (el.dataset.tiltOn) return;
    el.dataset.tiltOn = '1';
    let raf;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--rx', `${((0.5 - y) * 7).toFixed(2)}deg`);
        el.style.setProperty('--ry', `${((x - 0.5) * 9).toFixed(2)}deg`);
        el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
        el.classList.add('is-tilting');
      });
    });
    el.addEventListener('pointerleave', () => {
      cancelAnimationFrame(raf);
      el.classList.remove('is-tilting');
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    });
  });
}

/* ---------- magnetic buttons ---------- */
export function magnetic(root = document) {
  if (reduced || !finePointer) return;
  $$('[data-magnetic]', root).forEach((el) => {
    if (el.dataset.magOn) return;
    el.dataset.magOn = '1';
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${(x * 0.18).toFixed(1)}px, ${(y * 0.3).toFixed(1)}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}

/* ---------- gold glow that trails the cursor ---------- */
export function cursor() {
  const el = document.querySelector('.ej-cursor');
  if (!el || reduced || !finePointer || window.EJ_SETTINGS?.cursor === false) return;
  let x = innerWidth / 2;
  let y = innerHeight / 2;
  let cx = x;
  let cy = y;
  addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; el.classList.add('is-on'); }, { passive: true });
  document.addEventListener('pointerleave', () => el.classList.remove('is-on'));
  const loop = () => {
    cx += (x - cx) * 0.14;
    cy += (y - cy) * 0.14;
    el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    requestAnimationFrame(loop);
  };
  loop();
  document.addEventListener('pointerover', (e) => {
    el.classList.toggle('is-link', !!e.target.closest('a, button, [data-tilt]'));
  });
}

/* ---------- horizontal rails: drag with the mouse on desktop ---------- */
export function dragRails(root = document) {
  if (!finePointer) return;
  $$('.ej-snap', root).forEach((rail) => {
    if (rail.dataset.dragOn) return;
    rail.dataset.dragOn = '1';
    let down = false;
    let startX = 0;
    let startLeft = 0;
    let moved = false;
    rail.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || rail.scrollWidth <= rail.clientWidth) return;
      down = true; moved = false; startX = e.clientX; startLeft = rail.scrollLeft;
      rail.classList.add('is-dragging');
    });
    addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      rail.scrollLeft = startLeft - dx;
    });
    addEventListener('pointerup', () => { down = false; rail.classList.remove('is-dragging'); });
    rail.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  });
}
