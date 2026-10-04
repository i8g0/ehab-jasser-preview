/**
 * Cinematic scenes (home hero). Every scene is one screen tall; while you scroll, the next scene
 * is uncovered from beneath with depth parallax, the leaving one sinks into shadow, and the scene
 * that owns the stage gets its title, a gold light sweep and its video playing.
 * Videos load lazily (desktop or mobile file), only the visible ones play.
 */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
/* tall screens (phones, portrait tablets) get the vertical cut, where the bottle is framed in the middle */
const portrait = matchMedia('(orientation: portrait)');

export function hero() {
  const root = $('[data-ej-scenes]');
  if (!root) return;
  const scenes = $$('.ej-scene', root);
  const dots = $$('[data-scene-go]', root);
  const progress = $('[data-scene-progress]', root);
  const nav = $('[data-scene-dots]', root);
  let current = -1;
  let ticking = false;

  /* ---------- video: lazy source, play only what is on screen ---------- */
  const videos = scenes.map((s) => $('video', s));
  const pickSrc = (v) => (portrait.matches && v.dataset.srcMobile) || v.dataset.src;
  const pickPoster = (v) => (portrait.matches && v.dataset.posterMobile) || v.dataset.poster || '';
  /* rotating the phone or resizing the window swaps to the right cut, keeping the playhead */
  const syncCut = () => videos.forEach((v) => {
    if (!v || !v.dataset.loaded) return;
    const next = pickSrc(v);
    if (!next || v.src.endsWith(next)) return;
    const t = v.currentTime;
    const wasPlaying = !v.paused;
    v.poster = pickPoster(v);
    v.src = next;
    v.addEventListener('loadedmetadata', () => { v.currentTime = t; if (wasPlaying) { const p = v.play(); if (p) p.catch(() => {}); } }, { once: true });
  });
  portrait.addEventListener('change', syncCut);
  let cutTimer;
  addEventListener('resize', () => { clearTimeout(cutTimer); cutTimer = setTimeout(syncCut, 200); });
  const load = (v) => {
    if (!v || v.dataset.loaded) return;
    const src = pickSrc(v);
    if (!src) return;
    v.dataset.loaded = '1';
    /* "loop from": the opening reveal plays once, then the clip loops on its steady part.
       Scenes after the first skip straight to that part so their copy is legible at once. */
    const loopFrom = parseFloat(v.dataset.loopStart) || 0;
    v.loop = !loopFrom;
    if (loopFrom) {
      v.addEventListener('ended', () => { v.currentTime = loopFrom; const p = v.play(); if (p) p.catch(() => {}); });
      if (scenes.indexOf(v.closest('.ej-scene')) > 0) {
        v.addEventListener('loadedmetadata', () => { v.currentTime = loopFrom; }, { once: true });
      }
    }
    /* iOS only autoplays inline, muted media: set it as properties, not just attributes */
    v.muted = true;
    v.defaultMuted = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.poster = pickPoster(v);
    v.src = src;
    v.preload = 'auto';
    v.addEventListener('playing', () => v.closest('.ej-scene').classList.add('has-video'), { once: true });
  };
  const play = (v) => {
    if (!v || reduced) return;
    load(v);
    /* wait for the opening curtain, so the first film is seen from its first frame */
    if (!v.paused || !root.classList.contains('is-ready') || v.dataset.blocked) return;
    const p = v.play();
    if (p) p.catch((err) => { if (err && err.name === 'NotAllowedError') { v.dataset.blocked = '1'; armUnlock(); } });
  };
  const onStage = (v) => {
    const r = v.closest('.ej-scene').getBoundingClientRect();
    return r.bottom > -innerHeight * 0.05 && r.top < innerHeight * 1.05;
  };
  /* Phones in Low Power Mode / data saver refuse every film until the visitor touches the page.
     The first touch, tap or key press "primes" all three films at once (play, then pause the ones
     off screen), so from then on they start on their own as you scroll, like on Patek. */
  const GESTURES = ['touchstart', 'touchend', 'pointerdown', 'click', 'keydown'];
  let armed = false;
  const unlock = () => {
    const tries = videos.filter(Boolean).map((v) => {
      load(v);
      delete v.dataset.blocked;
      const p = v.play();
      return Promise.resolve(p).then(() => { if (!onStage(v)) v.pause(); return true; }, () => false);
    });
    Promise.all(tries).then((ok) => {
      if (!ok.some(Boolean)) return; /* not a real gesture for this browser: keep listening */
      GESTURES.forEach((t) => removeEventListener(t, unlock, true));
      armed = false;
      root.classList.remove('needs-tap');
      frame();
    });
  };
  const armUnlock = () => {
    root.classList.add('needs-tap');
    if (armed) return;
    armed = true;
    GESTURES.forEach((t) => addEventListener(t, unlock, { capture: true, passive: true }));
  };
  /* a page opened in a background tab refuses playback too: retry when it comes to the front */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    videos.forEach((v) => { if (v) delete v.dataset.blocked; });
    frame();
  });
  const pause = (v) => { if (v && !v.paused) v.pause(); };

  /* ---------- the scene that owns the stage ---------- */
  const setCurrent = (i) => {
    if (i === current) return;
    current = i;
    scenes.forEach((s, j) => s.classList.toggle('is-current', j === i));
    dots.forEach((d, j) => {
      d.classList.toggle('is-active', j === i);
      d.setAttribute('aria-current', j === i ? 'true' : 'false');
    });
    document.body.setAttribute('data-hero-tone', scenes[i].dataset.tone || 'dark');
    load(videos[i + 1]);
  };

  /* ---------- per-frame choreography ---------- */
  const parts = scenes.map((s) => ({ media: s.firstElementChild, shade: $('.ej-scene__shade', s), copy: $('.ej-scene__copy', s) }));
  const frame = () => {
    ticking = false;
    const vh = innerHeight;
    let best = 0;
    let bestDist = Infinity;
    scenes.forEach((scene, i) => {
      const top = scene.getBoundingClientRect().top;
      const r = top / vh; /* 1 = waiting below, 0 = on stage, -1 = gone above */
      const dist = Math.abs(r);
      if (dist < bestDist) { bestDist = dist; best = i; }
      if (r > 1.05 || r < -1.05) { pause(videos[i]); return; }
      play(videos[i]);
      if (reduced) return;
      const { media, shade: shadeEl, copy } = parts[i];
      let y = 0;
      let scale = 1;
      let shade = 0;
      if (r > 0) { /* entering: the picture stays almost still while the frame slides up over it */
        y = -r * vh * 0.72;
        scale = 1 + r * 0.14;
      } else { /* leaving: sinks slower than the page and dims into the next scene */
        y = -r * vh * 0.42;
        scale = 1 - r * 0.06;
        shade = Math.min(0.72, -r * 0.9);
      }
      media.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
      if (shadeEl) shadeEl.style.opacity = shade.toFixed(3);
      const lift = Math.max(0, -r);
      if (copy) {
        copy.style.transform = `translate3d(0, ${(lift * -90).toFixed(1)}px, 0)`;
        copy.style.opacity = Math.max(0, 1 - lift * 1.6).toFixed(3);
      }
    });
    setCurrent(best);

    const rect = root.getBoundingClientRect();
    const span = rect.height - vh;
    const p = span > 0 ? Math.min(1, Math.max(0, -rect.top / span)) : 0;
    if (progress) progress.style.transform = `scaleY(${p.toFixed(4)})`;
    const inView = rect.top < vh * 0.5 && rect.bottom > vh * 0.5;
    nav?.classList.toggle('is-on', inView);
    root.classList.toggle('is-past', rect.bottom < vh * 0.6);
  };
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request);

  /* ---------- dots ---------- */
  dots.forEach((dot) => dot.addEventListener('click', () => {
    const target = scenes[Number(dot.dataset.sceneGo)];
    if (window.ejLenis) window.ejLenis.scrollTo(target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }));

  /* ---------- the picture drifts toward the cursor (desktop) ---------- */
  if (finePointer && !reduced) {
    let mx = 0;
    let my = 0;
    let cx = 0;
    let cy = 0;
    let raf = 0;
    const drift = () => {
      cx += (mx - cx) * 0.06;
      cy += (my - cy) * 0.06;
      root.style.setProperty('--dx', `${cx.toFixed(2)}px`);
      root.style.setProperty('--dy', `${cy.toFixed(2)}px`);
      raf = Math.abs(mx - cx) + Math.abs(my - cy) > 0.05 ? requestAnimationFrame(drift) : 0;
    };
    root.addEventListener('pointermove', (e) => {
      mx = (e.clientX / innerWidth - 0.5) * -26;
      my = (e.clientY / innerHeight - 0.5) * -18;
      if (!raf) raf = requestAnimationFrame(drift);
    });
  }

  /* ---------- opening ---------- */
  const start = () => {
    root.classList.add('is-ready');
    frame();
  };
  if (document.documentElement.classList.contains('ej-intro-on')) {
    document.addEventListener('ej:intro-done', start, { once: true });
    /* behind the curtain: may this phone start films on its own? */
    const first = videos.find(Boolean);
    if (first && !reduced) {
      load(first);
      const probe = first.play();
      if (probe) {
        probe.then(() => { first.pause(); first.currentTime = 0; }, (err) => {
          if (!err || err.name !== 'NotAllowedError') return;
          first.dataset.blocked = '1';
          armUnlock();
          document.dispatchEvent(new Event('ej:autoplay-blocked'));
        });
      }
    }
  } else setTimeout(start, 30);
  frame();

  dust($('[data-ej-dust]', root));

  /* ?debug-video shows each film's state on screen, to diagnose a phone without a cable */
  if (/debug-video/.test(location.search)) {
    const box = document.createElement('pre');
    box.style.cssText = 'position:fixed;z-index:9999;left:8px;bottom:8px;margin:0;padding:8px;font:11px/1.4 monospace;color:#0f0;background:rgba(0,0,0,.8);direction:ltr;text-align:left;pointer-events:none';
    document.body.appendChild(box);
    setInterval(() => {
      box.textContent = videos.map((v, i) => (v
        ? `${i + 1} ${(v.currentSrc || '-').split('/').pop()} rs=${v.readyState} ns=${v.networkState} err=${v.error ? v.error.code : 0} ${v.paused ? 'paused' : 'playing'} t=${v.currentTime.toFixed(1)}${v.dataset.blocked ? ' BLOCKED' : ''}`
        : `${i + 1} no video`)).join(String.fromCharCode(10));
    }, 500);
  }
}

function dust(canvas) {
  /* the floating dust is a desktop luxury; phones spend that budget on smooth video */
  if (!canvas || reduced || !finePointer) { canvas?.remove(); return; }
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, devicePixelRatio || 1);
  let w = 0;
  let h = 0;
  let parts = [];
  let running = true;
  const spawn = (anywhere) => ({
    x: Math.random() * w,
    y: anywhere ? Math.random() * h : h + 10,
    r: Math.random() * 1.6 + 0.4,
    v: Math.random() * 0.35 + 0.12,
    drift: (Math.random() - 0.5) * 0.25,
    a: Math.random() * 0.55 + 0.15,
    phase: Math.random() * Math.PI * 2,
  });
  const resize = () => {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    parts = Array.from({ length: Math.round(Math.min(70, (w * h) / 14000)) }, () => spawn(true));
  };
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
