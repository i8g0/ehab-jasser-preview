/**
 * Hero: cross-fading slides with a slow push-in, word-by-word headline, progress tabs, swipe,
 * the header tone that follows the slide, and a light field of gold dust drifting upward.
 */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const INTERVAL = 6500;

export function hero() {
  const root = $('[data-ej-hero]');
  if (!root) return;
  const slides = $$('.ej-hero__slide', root);
  const tabs = $$('[data-ej-slide]', root);
  let index = 0;
  let timer;

  const tone = () => document.body.setAttribute('data-hero-tone', slides[index]?.dataset.tone || 'dark');

  const go = (next) => {
    if (next === index && slides[index].classList.contains('is-active')) return;
    slides[index].classList.remove('is-active');
    slides[index].setAttribute('aria-hidden', 'true');
    tabs[index]?.classList.remove('is-active');
    tabs[index]?.setAttribute('aria-selected', 'false');
    index = (next + slides.length) % slides.length;
    slides[index].classList.add('is-active');
    slides[index].setAttribute('aria-hidden', 'false');
    tabs[index]?.classList.add('is-active');
    tabs[index]?.setAttribute('aria-selected', 'true');
    tone();
    schedule();
  };

  const schedule = () => {
    clearTimeout(timer);
    root.style.setProperty('--interval', `${INTERVAL}ms`);
    if (root.dataset.autoplay === '1' && slides.length > 1 && !reduced) timer = setTimeout(() => go(index + 1), INTERVAL);
  };

  tabs.forEach((tab) => tab.addEventListener('click', () => go(Number(tab.dataset.ejSlide))));

  /* swipe (RTL: swiping left goes back) */
  let sx = null;
  root.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
  root.addEventListener('touchend', (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    sx = null;
    if (Math.abs(dx) < 50) return;
    const rtl = document.dir === 'rtl';
    go(index + ((dx > 0) === rtl ? 1 : -1));
  });

  /* pause while the hero is off screen */
  new IntersectionObserver(([entry]) => {
    root.classList.toggle('is-paused', !entry.isIntersecting);
    if (entry.isIntersecting) schedule(); else clearTimeout(timer);
  }).observe(root);

  /* scroll: the copy lifts and fades as you leave the hero */
  if (!reduced) {
    let ticking = false;
    addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const p = Math.min(1, Math.max(0, scrollY / (root.offsetHeight * 0.8)));
        root.style.setProperty('--leave', p.toFixed(3));
      });
    }, { passive: true });
  }

  tone();
  const start = () => { root.classList.add('is-ready'); schedule(); };
  if (document.documentElement.classList.contains('ej-intro-on')) document.addEventListener('ej:intro-done', start, { once: true });
  else requestAnimationFrame(start);

  dust($('[data-ej-dust]', root));
}

function dust(canvas) {
  if (!canvas || reduced) return;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, devicePixelRatio || 1);
  let w = 0;
  let h = 0;
  let parts = [];
  let running = true;
  const resize = () => {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(70, (w * h) / 14000));
    parts = Array.from({ length: n }, () => spawn(true));
  };
  const spawn = (anywhere) => ({
    x: Math.random() * w,
    y: anywhere ? Math.random() * h : h + 10,
    r: Math.random() * 1.6 + 0.4,
    v: Math.random() * 0.35 + 0.12,
    drift: (Math.random() - 0.5) * 0.25,
    a: Math.random() * 0.55 + 0.15,
    phase: Math.random() * Math.PI * 2,
  });
  const frame = (t) => {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    parts.forEach((p, i) => {
      p.y -= p.v;
      p.x += p.drift + Math.sin(t / 1600 + p.phase) * 0.15;
      if (p.y < -10) parts[i] = spawn(false);
      const tw = 0.6 + 0.4 * Math.sin(t / 700 + p.phase);
      ctx.beginPath();
      ctx.fillStyle = `rgba(232, 207, 168, ${(p.a * tw).toFixed(3)})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(frame);
  };
  resize();
  addEventListener('resize', resize);
  new IntersectionObserver(([e]) => {
    const was = running;
    running = e.isIntersecting;
    if (running && !was) requestAnimationFrame(frame);
  }).observe(canvas);
  requestAnimationFrame(frame);
}
