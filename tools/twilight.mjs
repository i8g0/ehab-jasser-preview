/**
 * Writes the Ehab Jasser components and settings into theme/twilight.json.
 * Raed's own settings, components and features (used by the store's other pages) are kept as they are.
 *   node tools/twilight.mjs
 */
import fs from 'node:fs';
import crypto from 'node:crypto';

const key = () => crypto.randomUUID();
const text = (id, label, value = null, extra = {}) => ({ type: 'string', format: 'text', id, label, value, multilanguage: true, required: false, icon: 'sicon-format-text-alt', ...extra });
const area = (id, label, value = null) => ({ type: 'string', format: 'textarea', id, label, value, multilanguage: true, required: false, icon: 'sicon-typography' });
const image = (id, label, description = null) => ({ type: 'string', format: 'image', id, label, value: null, required: false, icon: 'sicon-image', description });
const toggle = (id, label, value = true, description = null) => ({ type: 'boolean', format: 'switch', id, label, value, selected: value, required: false, icon: 'sicon-toggle-off', description });
const products = (id, label, max, min = 1) => ({ type: 'items', format: 'dropdown-list', id, label, source: 'products', multichoice: true, searchable: true, minLength: min, maxLength: max, required: true, options: [], selected: [], value: [], icon: 'sicon-keyboard_arrow_down' });
const LINK_SOURCES = [
  ['منتج', 'products'], ['منتجات مع وسم', 'products_tags'], ['تصنيف', 'categories'], ['صفحة تعريفية', 'pages'],
  ['التخفيضات', 'offers_link'],
].map(([label, v]) => ({ label, key: v, value: v }));
const link = (id, label) => ({ type: 'items', format: 'variable-list', id, label, source: 'custom', sources: LINK_SOURCES, searchable: true, value: null, required: false, icon: 'sicon-link' });
const manual = (id, label, options, value) => {
  const opts = options.map(([label, value]) => ({ label, value, key: key() }));
  return { type: 'items', format: 'dropdown-list', id, label, source: 'Manual', options: opts, selected: opts.filter(o => o.value === value), required: true, icon: 'sicon-list' };
};
const collection = (id, label, item_label, fields, value, min = 1, max = 12) => ({
  type: 'collection', format: 'collection', id, label, item_label, required: true, minLength: min, maxLength: max,
  fields: fields.map(f => ({ ...f, id: `${id}.${f.id}`, key: key() })),
  value: value.map(v => Object.fromEntries(Object.entries(v).map(([k, val]) => [`${id}.${k}`, val]))),
});
const note = (value) => ({ type: 'static', format: 'description', id: `note-${key().slice(0, 8)}`, value: `<div>${value}</div>` });
const component = (path, ar, en, icon, fields) => ({ key: key(), title: { ar, en }, icon, path, fields });

const components = [
  component('home.ej-hero', 'المشاهد السينمائية', 'Cinematic scenes', 'sicon-video', [
    note('مشاهد بملء الشاشة تتكشّف مع التمرير. لكل مشهد فيديو (رابط mp4 صامت، ٥–١٠ ثوانٍ، أقل من ٤ ميغا) وصورة تظهر قبل تحميله أو بدونه.'),
    collection('slides', 'المشاهد', 'مشهد', [
      text('video', 'رابط الفيديو للكمبيوتر (mp4 أفقي 16:9)', null, { multilanguage: false, icon: 'sicon-video' }),
      text('video_mobile', 'رابط الفيديو للجوال (mp4 عمودي 9:16)', null, { multilanguage: false, icon: 'sicon-video' }),
      { type: 'number', format: 'integer', id: 'loop_start', label: 'يبدأ التكرار من الثانية', description: 'الفيديو يُعرض كاملًا أول مرة، ثم يتكرر من هذه الثانية. 0 = تكرار عادي', value: 0, minimum: 0, maximum: 30, required: false, icon: 'sicon-repeat' },
      image('image', 'صورة المشهد (غلاف الفيديو أو بديله)'),
      image('image_mobile', 'صورة المشهد للجوال (عمودية 9:16)'),
      manual('tone', 'طابع المشهد', [['فاتح (صورة على خلفية بيضاء)', 'light'], ['داكن (صورة أو فيديو كامل)', 'dark']], 'dark'),
      text('eyebrow', 'سطر علوي (لاتيني)'),
      text('title', 'العنوان'),
      text('accent', 'السطر الملوّن'),
      text('button', 'نص الزر'),
      link('url', 'رابط الزر'),
    ], [
      { tone: 'light', eyebrow: 'EHAB JASSER · PARFUMS', title: 'العطر قصيدة', accent: 'بليّا حروف', button: 'تسوّق المجموعات' },
      { tone: 'dark', eyebrow: 'NOW COLLECTION', title: 'لكلٍّ أثره..', accent: 'ولكلّ أثرٍ عطر', button: 'اكتشف الجديد' },
      { tone: 'dark', eyebrow: 'VELOUR · EAU DE PARFUM', title: 'إحساسٌ مخملي', accent: 'صيغ ليكون أثرًا', button: 'اكتشف ڤيلور' },
    ], 1, 5),
  ]),
  component('home.ej-collections', 'حلقات المجموعات', 'Collection rings', 'sicon-circle', [
    collection('items', 'المجموعات', 'مجموعة', [image('image', 'صورة القارورة'), text('title', 'الاسم'), link('url', 'الرابط')],
      [{ title: 'الجديد' }, { title: 'اتجاهات' }, { title: 'سنوات' }, { title: 'مود' }, { title: 'العود والخاص' }], 2, 10),
  ]),
  component('home.ej-trust', 'شارات الثقة', 'Trust chips', 'sicon-shield', [
    collection('items', 'الشارات', 'شارة', [
      manual('icon', 'الأيقونة', [['بطاقة', 'card'], ['ساعة', 'clock'], ['شاحنة', 'truck'], ['هدية', 'gift'], ['درع', 'shield']], 'card'),
      text('text', 'النص'),
    ], [{ icon: 'card', text: 'دفع آمن' }, { icon: 'clock', text: 'تمارا ٤ دفعات' }, { icon: 'truck', text: 'الدفع عند الاستلام' }, { icon: 'gift', text: 'تغليف يليق بالهدية' }], 1, 6),
  ]),
  component('home.ej-spotlight', 'منتج مميّز بصورة كبيرة', 'Product spotlight', 'sicon-star', [
    text('eyebrow', 'سطر علوي', 'NEW COLLECTION'), text('title', 'العنوان', 'الجديد من'), text('accent', 'الجزء الملوّن', 'إيهاب الجاسر'),
    image('image', 'الصورة', 'صورة عمودية أو أفقية بجودة عالية'), text('name_latin', 'اسم العطر باللاتيني', 'VELOUR'),
    text('tagline', 'العبارة', 'الفخامة حين تُلامس الحواس'), text('button', 'نص الزر', 'تسوّق'), products('product', 'المنتج', 1),
  ]),
  component('home.ej-heritage', 'بنر الإرث', 'Heritage banner', 'sicon-award', [
    image('image', 'صورة البنر', 'تظهر كاملة بدون قص، المقاس المناسب 1110×430'),
    text('year', 'الرقم الكبير', '1926'), text('title', 'العنوان', 'قرنٌ من الإرث.. في قارورة'),
    text('caption', 'وصف قصير', 'الإصدار الأعلى من إيهاب الجاسر · ١٠٠ مل'), products('product', 'المنتج', 1),
  ]),
  component('home.ej-boutique', 'البوتيك (منتجات مع فلاتر)', 'Boutique', 'sicon-store', [
    note('تتكوّن الفلاتر تلقائيًا من تصنيفات المنتجات المختارة.'),
    text('eyebrow', 'سطر علوي', 'THE BOUTIQUE'), text('title', 'العنوان', 'ستّ قصائد،'), text('accent', 'السطر الملوّن', 'لكل واحدة صوت'),
    area('description', 'الوصف', 'كل مجموعة تحكي فكرة. اختر البيت اللي يشبهك، وخلّ العطر يكمّل الباقي.'),
    text('all_label', 'اسم فلتر الكل', 'الكل'), products('products', 'المنتجات', 24),
  ]),
  component('home.ej-directions', 'بوصلة الاتجاهات', 'Directions compass', 'sicon-location', [
    text('eyebrow', 'سطر علوي', 'DIRECTIONS'), text('title', 'العنوان', 'عطور اتجاهات'),
    area('description', 'الوصف', 'ثلاث جهات، ثلاث شخصيات. أي جهة تمشي لها؟'), products('products', 'المنتجات (حتى ٤)', 4),
  ]),
  component('home.ej-mood', 'وش مودك اليوم؟', 'Mood picker', 'sicon-sparkles', [
    note('اختر ثلاثة منتجات بالترتيب، وكل منتج يأخذ العبارة واللون المقابلين له.'),
    text('eyebrow', 'سطر علوي', 'MOOD · ٥٠ مل'), text('title', 'العنوان', 'وش مودك'), text('accent', 'الجزء الملوّن', 'اليوم؟'),
    products('products', 'المنتجات (٣)', 3, 3),
    text('line_1', 'عبارة المنتج الأول', 'للأيام اللي ما تشبه غيرها'), text('line_2', 'عبارة المنتج الثاني', 'توازن يرافقك من الصبح لآخر الليل'), text('line_3', 'عبارة المنتج الثالث', 'نعومة تهمس ولا تعلن'),
  ]),
  component('home.ej-years', 'سنوات (قوارير بأرقام)', 'Years', 'sicon-calendar', [
    text('eyebrow', 'سطر علوي', 'YEARS'), text('title', 'العنوان', 'عطور سنوات'),
    area('description', 'الوصف', 'ثلاث قوارير سوداء بختم ذهبي، كل رقم يحكي مرحلة.'), products('products', 'المنتجات', 6),
  ]),
  component('home.ej-house', 'قصة العلامة', 'The house', 'sicon-home', [
    image('image', 'الصورة (تظهر داخل قوس)'), text('eyebrow', 'سطر علوي', 'THE HOUSE'), text('title', 'العنوان', 'علامة صُنعت'), text('accent', 'السطر الملوّن', 'بعناية'),
    area('text', 'النص', 'علامة تجارية سعودية تهتم بكل ما هو مختص في عالم الأناقة والجمال. كل قارورة تُصمَّم لتكون قصيدة.. بليّا حروف.'),
    text('signature', 'التوقيع', 'Ehab Jasser'), text('button', 'نص الزر', 'About EJ'), link('url', 'رابط الزر'),
  ]),
  component('home.ej-words', 'قالوا عن العطر', 'Words', 'sicon-chat-bubbles', [
    text('eyebrow', 'سطر علوي', 'WORDS'), text('title', 'العنوان', 'قالوا عن العطر'),
    collection('reviews', 'الآراء', 'رأي', [area('text', 'الرأي'), text('name', 'الاسم'), text('city', 'المدينة أو الوصف')], [
      { text: 'متجر ممتاز ومتميز في عطوره، واسم مشرف للعطور السعودية', name: 'خالد الرويتع', city: 'الرياض' },
      { text: 'العطر وصل سليم، والبكج حلو', name: 'شيخة اليوسف', city: 'الدمام' },
      { text: 'رائع جدًا', name: 'نايف', city: 'مشتري موثّق · عن ڤيلور' },
      { text: 'عطر East يفوز', name: 'نايف الغشام', city: 'الدمام' },
    ], 1, 12),
  ]),
  component('home.ej-newsletter', 'القائمة الخاصة', 'Private list', 'sicon-mail', [
    text('eyebrow', 'سطر علوي', 'PRIVATE LIST'), text('title', 'العنوان', 'كن أول من يشمّ الإصدار القادم'),
    text('text', 'الوصف', 'إطلاقات محدودة وعروض خاصة لمشتركي القائمة.'), text('button', 'نص الزر', 'اشترك'), link('url', 'رابط الاشتراك (واتساب أو نموذج)'),
  ]),
];

const settings = [
  { type: 'static', format: 'title', id: 'ej-top', value: 'الشريط العلوي' },
  text('announcement_1', 'رسالة ١', 'قسّطها على ٤ دفعات مع تمارا'),
  text('announcement_2', 'رسالة ٢', 'ادفع بأبل باي أو مدى'),
  text('announcement_3', 'رسالة ٣', 'الدفع عند الاستلام متاح'),
  { type: 'static', format: 'title', id: 'ej-motion', value: 'الحركة والتجربة' },
  toggle('enable_intro', 'شاشة افتتاحية بالشعار (مرة واحدة لكل زيارة)', true),
  toggle('enable_sound', 'نغمة خفيفة عند الإضافة للسلة', true),
  toggle('enable_cursor', 'توهج ذهبي يتبع المؤشر (كمبيوتر فقط)', true),
  { type: 'static', format: 'title', id: 'ej-footer', value: 'الفوتر' },
  area('footer_about', 'نبذة', 'علامة تجارية صنعت بعناية، تهتم بكل ما هو مختص في عالم الأناقة والجمال.'),
  text('payment_line', 'وسائل الدفع', 'mada · Apple Pay · VISA · tamara · COD'),
];

const file = new URL('../theme/twilight.json', import.meta.url);
const current = JSON.parse(fs.readFileSync(file, 'utf8'));
const ourIds = new Set(settings.map((s) => s.id));
const twilight = {
  ...current,
  name: { ar: 'إيهاب الجاسر', en: 'Ehab Jasser' },
  description: { ar: 'ثيم فاخر لعطور إيهاب الجاسر', en: 'A luxury perfume theme for Ehab Jasser' },
  repository: 'https://github.com/i8g0/ehab-jasser-preview',
  author_email: current.author_email === 'support@salla.sa' ? '' : current.author_email,
  settings: [...settings, ...current.settings.filter((s) => !ourIds.has(s.id))],
  components: [...components, ...current.components.filter((c) => !c.path.startsWith('home.ej-'))],
};

fs.writeFileSync(file, `${JSON.stringify(twilight, null, 2)}\n`);
console.log('ej components:', components.length, '| total components:', twilight.components.length, '| settings:', twilight.settings.length);
