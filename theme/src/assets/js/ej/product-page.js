/**
 * Product page: swipe gallery with counter + thumbnails, quantity stepper, sticky buy bar,
 * and the notes pyramid built from description lines ("المقدمة: …", "القلب: …", "القاعدة: …").
 */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function gallery() {
  const root = $('[data-ej-gallery]');
  if (!root) return;
  const track = $('[data-ej-gallery-track]', root);
  const slides = $$('.ej-gallery__slide', track);
  const thumbs = $$('[data-ej-thumb]', root);
  const counter = $('[data-ej-gallery-count]', root);
  const pad = (n) => String(n).padStart(2, '0');

  const setActive = (i) => {
    thumbs.forEach((t, j) => t.classList.toggle('is-active', i === j));
    if (counter) counter.textContent = `${pad(i + 1)} / ${pad(slides.length)}`;
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting && e.intersectionRatio > 0.55) setActive(slides.indexOf(e.target)); });
  }, { root: track, threshold: [0.55] });
  slides.forEach((s) => io.observe(s));

  thumbs.forEach((t) => t.addEventListener('click', () => {
    slides[Number(t.dataset.ejThumb)]?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
  }));

  /* hover zoom on desktop */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    slides.forEach((s) => {
      const img = $('img', s);
      s.addEventListener('pointermove', (e) => {
        const r = s.getBoundingClientRect();
        img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
        s.classList.add('is-zoom');
      });
      s.addEventListener('pointerleave', () => s.classList.remove('is-zoom'));
    });
  }
}

export function quantity() {
  const box = $('[data-ej-qty]');
  if (!box) return;
  const input = $('[data-ej-qty-input]', box);
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-step]');
    if (!b) return;
    const max = Number(input.max) || 99;
    input.value = Math.min(max, Math.max(1, (Number(input.value) || 1) + Number(b.dataset.step)));
  });
}

export function buybar() {
  const bar = $('[data-ej-buybar]');
  const main = $('.ej-buy__add');
  if (!bar || !main) return;
  new IntersectionObserver(([e]) => {
    const show = !e.isIntersecting && e.boundingClientRect.top < 0;
    bar.classList.toggle('is-on', show);
    bar.setAttribute('aria-hidden', show ? 'false' : 'true');
    bar.querySelector('button')?.setAttribute('tabindex', show ? '0' : '-1');
  }).observe(main);
}

const LAYERS = [
  { key: 'top', re: /^(المقدمة|مقدمة العطر|Top(?: notes)?)\s*[:：]\s*/i },
  { key: 'heart', re: /^(القلب|قلب العطر|Heart(?: notes)?)\s*[:：]\s*/i },
  { key: 'base', re: /^(القاعدة|قاعدة العطر|Base(?: notes)?)\s*[:：]\s*/i },
];

export function notes() {
  const desc = $('[data-ej-description]');
  const section = $('[data-ej-notes]');
  const pyramid = $('[data-ej-pyramid]');
  if (!desc || !section || !pyramid) return;

  const found = [];
  $$('p, li, div', desc).forEach((el) => {
    if (el.children.length) return;
    const text = el.textContent.trim();
    const layer = LAYERS.find((l) => l.re.test(text));
    if (!layer) return;
    const label = text.match(layer.re)[1];
    const [notesText, sentence = ''] = text.replace(layer.re, '').split(/\s+[—–-]\s+/);
    found.push({ ...layer, label, notes: notesText.trim(), sentence: sentence.trim() });
    el.remove();
  });
  $$('ul, ol', desc).forEach((list) => { if (!list.children.length) list.remove(); });
  if (!found.length) return;

  const order = ['top', 'heart', 'base'];
  found.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  pyramid.innerHTML = `
    <div class="ej-pyramid__shape" aria-hidden="true">
      ${found.map((f, i) => `<span class="ej-pyramid__tier ej-pyramid__tier--${f.key}" data-tier="${i}"></span>`).join('')}
    </div>
    <ol class="ej-pyramid__list">
      ${found.map((f, i) => `
        <li class="ej-pyramid__item" data-tier="${i}" tabindex="0" data-reveal style="--i:${i}">
          <span class="ej-pyramid__label">${f.label}</span>
          <strong class="ej-pyramid__notes">${f.notes}</strong>
          ${f.sentence ? `<span class="ej-pyramid__sentence">${f.sentence}</span>` : ''}
        </li>`).join('')}
    </ol>`;
  section.hidden = false;

  const setTier = (i) => $$('[data-tier]', pyramid).forEach((el) => el.classList.toggle('is-on', el.dataset.tier === String(i)));
  $$('.ej-pyramid__item', pyramid).forEach((li) => {
    li.addEventListener('pointerenter', () => setTier(li.dataset.tier));
    li.addEventListener('focus', () => setTier(li.dataset.tier));
  });
  setTier(0);
}
