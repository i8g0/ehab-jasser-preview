/**
 * Demo store for the Vercel preview. Shapes follow Salla's Twig variables (store.*, product.*),
 * so the theme templates render exactly as they will on Salla. None of this ships with the theme:
 * on Salla, products and media come from the merchant dashboard.
 */

import fs from 'node:fs';

const media = (f) => `/media/${f}`;
/* Drop a file named like this into preview/store/media/ and the scene picks it up; missing files fall back to the photo. */
const video = (f) => (fs.existsSync(new URL(`./media/${f}`, import.meta.url)) ? media(f) : null);

export const store = {
  id: 1,
  name: 'إيهاب الجاسر',
  url: '/',
  logo: media('logo.png'),
  settings: { tax: { number: '310117805100003' } },
  social: { instagram: 'https://instagram.com/', snapchat: 'https://snapchat.com/', tiktok: 'https://tiktok.com/' },
};

export const menus = {
  header: [
    { title: 'الرئيسية', url: '/' },
    { title: 'الجديد', url: '/#new' },
    { title: 'المتجر', url: '/#shop' },
    { title: 'مود', url: '/#mood' },
    { title: 'ڤيلور', url: '/product/velour' },
    { title: 'السلة', url: '/cart' },
  ],
  footer: [
    { title: 'About EJ', url: '#' },
    { title: 'سياسة الاستبدال', url: '#' },
    { title: 'الخصوصية', url: '#' },
    { title: 'تواصل معنا', url: '#' },
  ],
};

const cat = (name) => ({ name, url: '/#shop' });
const desc = (collection) => `<p>من مجموعة ${collection} لدى إيهاب الجاسر.</p><p>الوصف الكامل والمكونات تُضاف من لوحة سلة.</p>`;

let nextId = 101;
const product = (slug, name, subtitle, price, category, extra = {}) => {
  const id = nextId++;
  const image = { url: media(`${slug === 'p1926' ? '1926' : slug}.jpg`), alt: name };
  return {
    id,
    slug,
    name,
    subtitle,
    price,
    regular_price: price,
    sale_price: price,
    is_on_sale: false,
    is_available: true,
    status: 'sale',
    max_quantity: 10,
    url: `/product/${slug}`,
    image,
    images: [image],
    category: cat(category),
    tags: [],
    promotion_title: '',
    rating: null,
    description: desc(category),
    ...extra,
  };
};

export const products = [
  product('velour', 'ڤيلور', 'VELOUR', 695, 'الجديد', {
    tags: [{ name: 'tone-amber' }],
    rating: { stars: 5, count: 4 },
    images: [
      { url: media('velour.jpg'), alt: 'قارورة ڤيلور' },
      { url: media('velour-studio.jpg'), alt: 'ڤيلور في مرسم' },
      { url: media('hero-velour.jpg'), alt: 'لحظة مع ڤيلور' },
      { url: media('hero-hands.jpg'), alt: 'ڤيلور بين يدين' },
      { url: media('hero-couple.jpg'), alt: 'ڤيلور مع 1926' },
    ],
    description: [
      '<p>إحساسٌ مخملي، صيغ ليكون أثرًا لا يُنسى.</p>',
      '<ul>',
      '<li>المقدمة: برغموت · توت مثلج — أول ما تلمس بشرتك: إشراقة البرغموت ولمسة باردة من التوت المثلج.</li>',
      '<li>القلب: روز · ياسمين — بعد دقائق تنكشف رقة الروز والياسمين، قلب العطر الحقيقي.</li>',
      '<li>القاعدة: باتشولي · مسك — ومع استقرار العطر يظهر عمقه من الباتشولي والمسك، دفء وأناقة هادئة.</li>',
      '</ul>',
      '<p>الحجم ١٠٠ مل · أو دو بارفان · رقم الموديل 6288005161153</p>',
    ].join(''),
  }),
  product('p1926', '1926', '1926', 970, 'الجديد', { promotion_title: 'إصدار حصري', tags: [{ name: 'tone-amber' }],
    images: [{ url: media('1926.jpg'), alt: '1926' }, { url: media('banner-1926.jpg'), alt: '1926 في صندوقه' }, { url: media('hero-couple.jpg'), alt: '1926 وڤيلور' }] }),
  product('east', 'إيست', 'EAST', 245, 'اتجاهات', { promotion_title: 'الأكثر طلبًا' }),
  product('south', 'ساوث', 'SOUTH', 245, 'اتجاهات'),
  product('west', 'ويست', 'WEST', 245, 'اتجاهات'),
  product('devilish', 'متمرد', 'DEVILISH', 165, 'مود', { tags: [{ name: 'tone-ember' }] }),
  product('average', 'معتدل', 'AVERAGE', 165, 'مود'),
  product('angelic', 'ملائكي', 'ANGELIC', 165, 'مود', { tags: [{ name: 'tone-pearl' }] }),
  product('years-3', 'ثري ييرز', 'THREE YEARS', 420, 'سنوات', { tags: [{ name: 'tone-noir' }] }),
  product('years-4', 'فور ييرز', 'FOUR YEARS', 420, 'سنوات', { tags: [{ name: 'tone-noir' }] }),
  product('years-5', 'فايف ييرز', 'FIVE YEARS', 420, 'سنوات', { tags: [{ name: 'tone-noir' }] }),
  product('oasis', 'اويسس', 'OASIS', 490, 'العود والخاص'),
  product('washm', 'وشم', 'WASHM', 150, 'العود والخاص'),
];

const bySlug = Object.fromEntries(products.map((p) => [p.slug, p]));
const ids = (...slugs) => slugs.map((s) => bySlug[s]);

/** Reviews shown by the <salla-comments> stand-in on product pages. */
export const comments = {
  velour: [
    { name: 'Hind Bargawi', when: 'منذ ٣ أسابيع', text: 'زهري فاكهي.. يذكرني بعطر توم فورد روز دي تشين', badge: 'مشترية موثّقة', stars: 5 },
    { name: 'Naif', when: 'منذ ٦ أشهر', text: 'رائع جدًا', badge: 'مشتري موثّق', stars: 5 },
    { name: 'سامر', when: 'منذ ٤ أشهر', text: 'لا يوجد وصف لحجم العطر.. نأمل التوضيح', badge: '', stars: 4, reply: 'إيهاب الجاسر: العطر ١٠٠ مل' },
  ],
};

/**
 * The merchant's home page arrangement (what they'd set up in Salla's theme editor).
 * Text fields fall back to twilight.json defaults; here we only add images, links and products.
 */
export const home = [
  { path: 'home.ej-hero', values: { slides: [
    { tone: 'light', image: media('scene-1-poster.jpg'), image_mobile: media('scene-1-mobile-poster.jpg'), video: video('scene-1.mp4'), video_mobile: video('scene-1-mobile.mp4'), loop_start: 3,
      eyebrow: '1926 · EAU DE PARFUM', url: '#shop' },
    { tone: 'dark', image: media('scene-2-poster.jpg'), image_mobile: media('scene-2-mobile-poster.jpg'), video: video('scene-2.mp4'), video_mobile: video('scene-2-mobile.mp4'), loop_start: 0,
      eyebrow: 'YEARS · EAU DE PARFUM', button: 'اكتشف عطور سنوات', url: '#shop' },
    { tone: 'dark', image: media('scene-3-poster.jpg'), image_mobile: media('scene-3-mobile-poster.jpg'), video: video('scene-3.mp4'), video_mobile: video('scene-3-mobile.mp4'), loop_start: 0,
      url: '/product/velour', button: 'اكتشف ڤيلور · ٦٩٥ ر.س' },
  ] } },
  { path: 'home.ej-collections', values: { items: [
    { image: media('velour.jpg'), url: '#shop:الجديد' },
    { image: media('east.jpg'), url: '#shop:اتجاهات' },
    { image: media('years-3.jpg'), url: '#shop:سنوات' },
    { image: media('average.jpg'), url: '#mood' },
    { image: media('oasis.jpg'), url: '#shop:العود والخاص' },
  ] } },
  { path: 'home.ej-trust', values: {} },
  { path: 'home.ej-spotlight', values: { image: media('velour-studio.jpg'), product: ids('velour') } },
  { path: 'home.ej-heritage', values: { image: media('banner-1926.jpg'), product: ids('p1926') } },
  { path: 'home.ej-boutique', values: { products: ids('velour', 'p1926', 'east', 'south', 'west', 'devilish', 'average', 'angelic', 'years-3', 'years-4', 'years-5', 'oasis', 'washm') } },
  { path: 'home.ej-directions', values: { products: ids('south', 'east', 'west') } },
  { path: 'home.ej-mood', values: { products: ids('devilish', 'average', 'angelic') } },
  { path: 'home.ej-years', values: { products: ids('years-3', 'years-4', 'years-5') } },
  { path: 'home.ej-house', values: { image: media('hero-couple.jpg'), url: '#' } },
  { path: 'home.ej-words', values: {} },
  { path: 'home.ej-newsletter', values: {} },
];
