/**
 * Page chrome: opening curtain, header states (transparent over hero, solid, hide on scroll down),
 * scroll progress, full-screen menu, search and newsletter.
 */
import { openSearch } from './store.js';

const $ = (s, r = document) => r.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function intro() {
  const el = $('[data-ej-intro]');
  if (!el) return;
  let seen = false;
  try { seen = sessionStorage.getItem('ej:intro') === '1'; } catch { /* storage blocked */ }
  if (seen || reduced) { el.remove(); return; }
  try { sessionStorage.setItem('ej:intro', '1'); } catch { /* storage blocked */ }
  document.documentElement.classList.add('ej-locked', 'ej-intro-on');
  const done = () => {
    el.classList.add('is-leaving');
    document.documentElement.classList.remove('ej-intro-on');
    setTimeout(() => {
      document.documentElement.classList.remove('ej-locked');
      el.remove();
      document.dispatchEvent(new Event('ej:intro-done'));
    }, 900);
  };
  requestAnimationFrame(() => el.classList.add('is-playing'));
  const timer = setTimeout(done, 2300);
  el.addEventListener('click', () => { clearTimeout(timer); done(); }, { once: true });
}

export function header() {
  const bar = $('[data-ej-header]');
  if (!bar) return;
  const progress = $('[data-ej-progress]', bar);
  const hero = $('[data-ej-scenes]');
  document.body.classList.toggle('has-hero', !!hero);
  let lastY = scrollY;
  let ticking = false;
  const update = () => {
    ticking = false;
    const y = scrollY;
    /* over the cinematic scenes the header stays transparent and present, like a title card */
    const heroEnd = hero ? hero.offsetTop + hero.offsetHeight - bar.offsetHeight : 40;
    bar.classList.toggle('is-solid', y > heroEnd);
    bar.classList.toggle('is-hidden', y > heroEnd + 400 && y > lastY + 2 && !document.documentElement.classList.contains('ej-locked'));
    if (y < lastY - 2) bar.classList.remove('is-hidden');
    lastY = y;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.transform = `scaleX(${max > 0 ? (y / max).toFixed(4) : 0})`;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

export function menu() {
  const panel = $('[data-ej-menu]');
  const openBtn = $('[data-ej-menu-open]');
  if (!panel || !openBtn) return;
  const close = () => {
    panel.classList.remove('is-open');
    openBtn.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('ej-locked');
    setTimeout(() => { panel.hidden = true; }, 600);
    openBtn.focus({ preventScroll: true });
  };
  openBtn.addEventListener('click', () => {
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('is-open'));
    openBtn.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('ej-locked');
    setTimeout(() => $('[data-ej-menu-close]', panel)?.focus({ preventScroll: true }), 80);
  });
  $('[data-ej-menu-close]', panel)?.addEventListener('click', close);
  panel.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) close(); });
}

export function search() {
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-ej-search]')) { e.preventDefault(); openSearch(); }
  });
}

export function newsletter() {
  document.querySelectorAll('[data-ej-letter]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const url = form.dataset.url;
      const value = form.querySelector('input')?.value.trim();
      if (!value) return;
      if (url) { window.open(url, '_blank', 'noopener'); }
      form.querySelector('[data-ej-letter-done]').hidden = false;
      form.classList.add('is-done');
    });
  });
}
