/**
 * Renders the Salla theme (theme/) into a static site (dist/) for the Vercel preview.
 * It plays Salla's part: loads twilight.json defaults, fills them with the demo store,
 * provides Salla's Twig helpers (asset, money, trans, link, component, hook) and injects
 * the SDK stand-in. The theme folder itself stays untouched and ships to Salla as-is.
 *
 *   npm run build         one build
 *   npm run dev           rebuild on change + serve at http://localhost:5500
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Twig from 'twig';
import * as esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THEME = path.join(ROOT, 'theme');
const VIEWS = path.join(THEME, 'src', 'views');
const ASSETS = path.join(THEME, 'src', 'assets');
const PREVIEW = path.join(ROOT, 'preview');
const DIST = path.join(ROOT, 'dist');

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true })
  .flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));

/* fs.cpSync kills the process on Windows paths with Arabic folder names, so copy by hand. */
const copyDir = (from, to) => walk(from).forEach((file) => {
  const dest = path.join(to, path.relative(from, file));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(file, dest);
});

/* ---------- Salla's Twig dialect ---------- */

function sallaTwig(locale) {
  Twig.cache(false);
  const DIGITS = '٠١٢٣٤٥٦٧٨٩';
  const ar = (s) => String(s).replace(/[0-9]/g, (d) => DIGITS[d]);
  Twig.extendFilter('asset', (name) => `/assets/${name}`);
  Twig.extendFilter('cdn', (url) => url);
  Twig.extendFilter('money', (n) => {
    const v = Number(n) || 0;
    const s = v % 1 === 0 ? v.toLocaleString('en-US') : v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${ar(s).replace(/,/g, '٬').replace(/\./g, '٫')} ر.س`;
  });
  Twig.extendFunction('trans', (key) => key.split('.').reduce((o, k) => (o ? o[k] : undefined), locale) ?? key);
  Twig.extendFunction('link', (name) => ({ cart: '/cart', home: '/' }[name] ?? `/${name}`));
  Twig.extendFunction('__hook', (name) => HOOKS[name] || '');
}

/* Salla tags → plain Twig the JS engine understands. */
const preprocess = (src) => src
  .replace(/{%\s*component\s+home\s*%}/g, '{% for __c in __home %}{% include __c.path with __c.ctx %}{% endfor %}')
  .replace(/{%\s*component\s+'([\w.-]+)'\s*%}/g, "{% include 'components.$1' %}")
  .replace(/{%\s*hook\s+'?([\w:.-]+)'?\s*%}/g, "{{ __hook('$1') }}");

function loadTemplates() {
  const files = walk(VIEWS).filter((f) => f.endsWith('.twig'));
  files.forEach((file) => {
    const id = path.relative(VIEWS, file).replace(/\.twig$/, '').split(path.sep).join('.');
    Twig.twig({ id, data: preprocess(fs.readFileSync(file, 'utf8')), allowInlineIncludes: true, rethrow: true });
  });
  return files.length;
}

/* ---------- twilight.json defaults + merchant values ---------- */

const pickValue = (field) => {
  if (field.type === 'collection') {
    return (field.value || []).map((row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k.split('.').pop(), v])));
  }
  if (field.format === 'dropdown-list' && field.source === 'Manual') return field.selected?.[0]?.value ?? null;
  if (field.type === 'items') return field.value ?? [];
  return field.value ?? null;
};

function componentContext(def, values, index) {
  const component = {};
  def.fields.filter((f) => f.type !== 'static').forEach((f) => { component[f.id] = pickValue(f); });
  Object.entries(values).forEach(([k, v]) => {
    if (Array.isArray(v) && Array.isArray(component[k]) && v.length && typeof v[0] === 'object' && !v[0].id) {
      component[k] = v.map((row, i) => ({ ...(component[k][i] || {}), ...row }));
    } else {
      component[k] = v;
    }
  });
  return { component, componentId: `${def.path}-${index}`, position: index };
}

/* ---------- build ---------- */

let HOOKS = {};

async function build() {
  const started = Date.now();
  const twilight = JSON.parse(fs.readFileSync(path.join(THEME, 'twilight.json'), 'utf8'));
  const locale = JSON.parse(fs.readFileSync(path.join(THEME, 'src', 'locales', 'ar.json'), 'utf8'));
  const dataUrl = `${pathToFileURL(path.join(PREVIEW, 'store', 'data.mjs')).href}?t=${Date.now()}`;
  const { store, products, home, menus, comments } = await import(dataUrl);

  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(path.join(DIST, 'assets'), { recursive: true });

  /* theme assets: same entry points as Raed (app/home/product/cart) */
  await esbuild.build({
    entryPoints: ['app', 'home', 'product', 'cart'].map((n) => path.join(ASSETS, 'js', `${n}.js`)),
    outdir: path.join(DIST, 'assets'),
    bundle: true,
    minify: true,
    format: 'iife',
    target: ['es2019', 'safari14'],
    logLevel: 'warning',
  });
  await esbuild.build({
    entryPoints: [path.join(ASSETS, 'styles', 'app.css')],
    outfile: path.join(DIST, 'assets', 'app.css'),
    bundle: true,
    minify: true,
    logLevel: 'warning',
  });
  copyDir(path.join(ASSETS, "images"), path.join(DIST, "assets", "images"));
  copyDir(path.join(PREVIEW, "store", "media"), path.join(DIST, "media"));
  fs.mkdirSync(path.join(DIST, 'preview'), { recursive: true });
  fs.copyFileSync(path.join(PREVIEW, 'salla-mock.js'), path.join(DIST, 'preview', 'salla-mock.js'));
  fs.copyFileSync(path.join(PREVIEW, 'salla-mock.css'), path.join(DIST, 'preview', 'salla-mock.css'));

  /* what Salla would inject through hooks */
  const catalog = products.map((p) => ({
    id: p.id, slug: p.slug, name: p.name, subtitle: p.subtitle, price: p.price, image: p.image.url,
    url: p.url, category: p.category.name, promotion_title: p.promotion_title,
  }));
  HOOKS = {
    'head:start': [
      '<title>__TITLE__</title>',
      '<meta name="description" content="عطور إيهاب الجاسر — علامة سعودية تهتم بكل ما هو مختص في عالم الأناقة والجمال.">',
      `<link rel="icon" href="${store.logo}">`,
      `<script>window.__EJ_PREVIEW__=${JSON.stringify({ products: catalog, menus, comments })};</script>`,
      '<script src="/preview/salla-mock.js"></script>',
      '<link rel="stylesheet" href="/preview/salla-mock.css">',
    ].join('\n    '),
    'body:end': '<span class="pv-badge" aria-hidden="true">SALLA THEME PREVIEW</span>',
  };

  sallaTwig(locale);
  const count = loadTemplates();

  const theme = {
    is_rtl: true,
    color: { primary: '#17120E' },
    settings: {
      get: (key, fallback = null) => {
        const f = twilight.settings.find((s) => s.id === key);
        return f && f.value !== undefined && f.value !== null ? f.value : fallback;
      },
      set: () => '',
    },
  };
  const base = { store, theme, language: { code: 'ar' }, user: { type: 'guest' } };

  const render = (id, ctx, out) => {
    const title = ctx.page.slug === 'index' ? `${store.name} — العطر قصيدة بليّا حروف` : `${ctx.page.title} — ${store.name}`;
    const html = Twig.twig({ ref: id }).render({ ...base, ...ctx }).replace('__TITLE__', title);
    const file = path.join(DIST, out);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, html);
  };

  const __home = home.map((entry, i) => {
    const def = twilight.components.find((c) => c.path === entry.path);
    if (!def) throw new Error(`Unknown component ${entry.path}`);
    return { path: `components.${entry.path}`, ctx: componentContext(def, entry.values, i) };
  });
  render('pages.index', { page: { title: store.name, slug: 'index' }, __home }, 'index.html');

  products.forEach((product) => {
    render('pages.product.single', { page: { title: product.name, slug: 'product.single' }, product }, `product/${product.slug}.html`);
  });

  render('pages.cart', {
    page: { title: 'السلة', slug: 'cart' },
    cart: { items: [], sub_total: 0, total: 0, count: 0, free_shipping_bar: null },
  }, 'cart.html');

  console.log(`✓ built ${count} templates → ${products.length + 2} pages in ${Date.now() - started}ms`);
}

/* ---------- dev server ---------- */

function serve(port = 5500) {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json' };
  http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    let file = path.join(DIST, p);
    if (!path.extname(file) && fs.existsSync(`${file}.html`)) file = `${file}.html`;
    if (!file.startsWith(DIST) || !fs.existsSync(file)) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  }).listen(port, () => console.log(`→ http://localhost:${port}`));
}

await build();

if (process.argv.includes('--watch')) {
  serve(Number(process.env.PORT) || 5500);
  let timer;
  [THEME, PREVIEW].forEach((dir) => fs.watch(dir, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => build().catch((e) => console.error('✗', e.message)), 150);
  }));
}
