import type { ApiSiteText } from '../../shared/types';
import type { Translation } from '../locales';

/**
 * Sayt kontenti registri (spec §6) — admin'da tahrirlanadigan matnlar (`site_texts`) va rasm/videolar
 * (`site_assets`). Registr tartibi = admin'dagi maydon tartibi; `group` — admin sahifasi, `section` — shu
 * sahifadagi karta sarlavhasi. Matn kaliti `locales.ts`dagi `Translation` kaliti: u yerda kalit o'chsa, lint
 * registrni ham yiqitadi — etim kalit qolmaydi. Registrga qator qo'shish = matnni tahrirlanadigan qilish.
 */
export type TextKey = keyof Translation;
export type ContentGroup = 'home' | 'store' | 'contact' | 'about' | 'careers' | 'legal' | 'seo';

export interface TextField {
  key: TextKey;
  group: ContentGroup;
  section: string;
  label: string;
  kind: 'text' | 'textarea';
  hint?: string;
}

const inSection = (group: ContentGroup, section: string) =>
  (key: TextKey, label: string, kind: TextField['kind'] = 'text', hint?: string): TextField => ({ key, group, section, label, kind, hint });

const NEW_LINE = 'Enter — yangi qator';
const TOPIC = 'Konsultatsiya formasidagi mavzu tugmasi';
const MUTED = 'Och rangda chiqadi';

const heroCards = inSection('home', "Yo'nalish kartalari");
const services = inSection('home', "Xizmat va'dalari");
const consult = inSection('home', 'Konsultatsiya');
const homeTitles = inSection('home', 'Sarlavhalar');
const productPage = inSection('store', 'Mahsulot sahifasi');
const orderCookie = inSection('store', 'Buyurtma va cookie');
const contact = inSection('contact', 'Manzil va ish vaqti');
const aboutIntro = inSection('about', 'Kirish');
const aboutExperts = inSection('about', 'Mutaxassislar');
const aboutWarranty = inSection('about', 'Kafolat va servis');
const aboutBuy = inSection('about', 'Qulay xarid');
const aboutPersonal = inSection('about', 'Shaxsiy yondashuv');
const aboutNear = inSection('about', 'Doim yaqinda');
const aboutNews = inSection('about', 'Yangiliklar');
const careersSeo = inSection('careers', 'Qidiruv tizimlari');
const careersHero = inSection('careers', 'Hero va kirish');
const careersWork = inSection('careers', "ProDuct'da ishlash");
const careersLife = inSection('careers', 'Jamoadagi hayot');
const careersWhy = inSection('careers', 'Bizda ish qanday');
const careersRoles = inSection('careers', 'Vakansiyalar va ariza');
const legal = inSection('legal', 'Hero izohi');
const seo = inSection('seo', 'Katalog sahifalari');

export const TEXT_FIELDS: TextField[] = [
  heroCards('heroApple', 'Apple kartasi', 'textarea', NEW_LINE),
  heroCards('heroPc', 'PC kartasi', 'textarea', NEW_LINE),
  heroCards('heroAudio', 'Audio kartasi', 'textarea', NEW_LINE),
  heroCards('heroVideo', 'Video kartasi', 'textarea', NEW_LINE),

  services('svcTitle', "Bo'lim sarlavhasi"),
  services('heroCtaPrimary', 'Katalog tugmasi', 'text', 'Sarlavha yonidagi tugma'),
  services('svcWarrantyCard', 'Kafolat — sarlavha'),
  services('svcWarrantyDesc', 'Kafolat — matn', 'textarea'),
  services('svcDeliveryCard', 'Yetkazib berish — sarlavha'),
  services('svcDeliveryDesc', 'Yetkazib berish — matn', 'textarea'),
  services('svcServiceCard', 'Servis — sarlavha'),
  services('svcServiceDesc', 'Servis — matn', 'textarea'),

  consult('consultTitle', 'Sarlavha'),
  consult('consultLead', 'Izoh', 'textarea'),
  consult('consultTopicApple', '1-mavzu', 'text', TOPIC),
  consult('consultTopicPc', '2-mavzu', 'text', TOPIC),
  consult('consultTopicAudio', '3-mavzu', 'text', TOPIC),
  consult('consultTopicVideo', '4-mavzu', 'text', TOPIC),
  consult('consultTopicService', '5-mavzu', 'text', TOPIC),
  consult('consultTopicOther', '6-mavzu', 'text', TOPIC),
  consult('consultDoneTitle', 'Yuborilgandan keyin — sarlavha'),
  consult('consultDoneText', 'Yuborilgandan keyin — matn', 'textarea'),

  homeTitles('proTitle', 'Shior', 'text', "Yo'nalish sahifasida nomdan keyin chiqadi: «PC — Professional yondashuv»"),
  homeTitles('newsTitle', "Yangiliklar bo'limi"),
  homeTitles('homeBrands', 'Brendlar tasmasi'),

  productPage('svcDeliveryTitle', 'Yetkazish — nom'),
  productPage('svcDeliveryFact', 'Yetkazish — muddat'),
  productPage('feature3', 'Yetkazish — izoh'),
  productPage('svcWarrantyTitle', 'Kafolat — nom'),
  productPage('svcWarrantyFact', 'Kafolat — muddat'),
  productPage('feature2', 'Kafolat — izoh'),
  productPage('trustShort', "Muddatli to'lov qatori", 'text', "Faqat muddatli to'lov yoqilganda chiqadi"),
  productPage('helpTitle', 'Yordam — savol'),
  productPage('helpContact', 'Yordam — havola matni'),
  productPage('setupTitle', 'Apple sozlash — sarlavha', 'text', 'Faqat Apple mahsulotlarida, sahifa oxirida'),
  productPage('setupText', 'Apple sozlash — matn', 'textarea'),
  productPage('setupCta', 'Apple sozlash — tugma'),

  orderCookie('orderSuccessNote', 'Buyurtmadan keyingi xabar', 'textarea', "Qo'ng'iroq muddati va'dasi shu yerda"),
  orderCookie('cookieText', 'Cookie ogohlantirishi', 'textarea'),
  orderCookie('cookieAccept', 'Cookie tugmasi'),

  contact('footerAddressText1', 'Manzil — 1-qator', 'text', "Masalan: O'zbekiston, Toshkent shahar,"),
  contact('footerAddressText2', 'Manzil — 2-qator'),
  contact('footerTime', 'Ish vaqti', 'text', 'Saytda shunday chiqadi: Du–Yak, 10:00–21:00'),
  contact('seoOpeningHours', 'Google uchun ish vaqti', 'text', 'Format: Mo-Su 10:00-21:00 — ikkala tilda bir xil'),

  aboutIntro('aboutLede', 'Hero izohi', 'textarea', 'Qidiruv tizimlaridagi tavsif ham shu'),
  aboutIntro('aboutWhyTitle', "Bo'lim sarlavhasi"),
  aboutIntro('aboutWhyMuted', 'Sarlavha davomi', 'text', MUTED),
  aboutExperts('aboutExpertsLabel', 'Yorliq'),
  aboutExperts('aboutExpertsTitle', 'Sarlavha'),
  aboutExperts('aboutExpertsText', 'Matn', 'textarea'),
  aboutWarranty('aboutWarrantyTitle', 'Sarlavha'),
  aboutWarranty('aboutWarrantyText', 'Matn', 'textarea'),
  aboutBuy('aboutBuyTitle', 'Sarlavha'),
  aboutBuy('aboutBuyText', 'Matn', 'textarea'),
  aboutBuy('aboutTradeInLink', 'Trade-In havolasi'),
  aboutPersonal('aboutPersonalTitle', 'Sarlavha'),
  aboutPersonal('aboutPersonalText', 'Matn', 'textarea'),
  aboutNear('aboutNearTitle', 'Sarlavha'),
  aboutNear('aboutNearText', 'Matn', 'textarea'),
  aboutNews('aboutNewsTitle', 'Sarlavha'),
  aboutNews('aboutNewsText', 'Matn', 'textarea'),
  aboutNews('aboutBlogLink', 'Blog havolasi'),

  careersSeo('careersMetaDesc', 'Qidiruv tavsifi', 'textarea', "{store} o'z joyida qoladi — do'kon nomiga almashadi"),
  careersHero('careersHeroTitle', 'Sarlavha'),
  careersHero('careersHeroCta', 'Tugma'),
  careersHero('careersIntro', 'Kirish matni', 'textarea'),
  careersWork('careersWorkEyebrow', 'Yorliq'),
  careersWork('careersWorkTitle', 'Sarlavha'),
  careersWork('careersWorkText', 'Matn', 'textarea'),
  careersWork('careersWorkQuote', 'Iqtibos'),
  careersWork('careersQuoteBy', 'Iqtibos muallifi'),
  careersLife('careersLifeEyebrow', 'Yorliq'),
  careersLife('careersLifeTitle', 'Sarlavha'),
  careersLife('careersLifeText', 'Matn', 'textarea'),
  careersLife('careersLifeCard', 'Rasm ustidagi matn'),
  careersWhy('careersWhyTitle', 'Sarlavha'),
  careersWhy('careersWhyMuted', 'Sarlavha davomi', 'text', MUTED),
  careersWhy('careersWhyTechTitle', '1-karta — sarlavha'),
  careersWhy('careersWhyTechText', '1-karta — matn', 'textarea'),
  careersWhy('careersWhyClientTitle', '2-karta — sarlavha'),
  careersWhy('careersWhyClientText', '2-karta — matn', 'textarea'),
  careersWhy('careersWhyServiceTitle', '3-karta — sarlavha'),
  careersWhy('careersWhyServiceText', '3-karta — matn', 'textarea'),
  careersWhy('careersWhyTeamTitle', '4-karta — sarlavha'),
  careersWhy('careersWhyTeamText', '4-karta — matn', 'textarea'),
  careersRoles('careersRolesTitle', "Ro'yxat sarlavhasi"),
  careersRoles('careersRolesEmpty', "Vakansiya yo'q bo'lsa", 'textarea'),
  careersRoles('careersDoneTitle', 'Arizadan keyin — sarlavha'),
  careersRoles('careersDoneText', 'Arizadan keyin — matn', 'textarea'),

  legal('legalLedeOferta', 'Ommaviy oferta'),
  legal('legalLedePrivacy', 'Maxfiylik siyosati'),
  legal('legalLedeReturns', 'Qaytarish va almashtirish'),
  legal('termsLede', 'Shartlar', 'text', 'Sahifa: /page/muddatli-tolov'),

  seo('metaCatalogDesc', 'Tavsif shabloni', 'textarea', "{title} — sahifa nomi, {store} — do'kon nomi; ikkalasi o'z joyida qoladi"),
];

export const ASSET_KEYS = [
  'logo', 'logoDark', 'favicon',
  'hero.apple.image', 'hero.apple.poster', 'hero.apple.video1', 'hero.apple.video2',
  'hero.pc.image', 'hero.pc.poster', 'hero.pc.video1', 'hero.pc.video2',
  'hero.audio.image', 'hero.audio.poster', 'hero.audio.video1', 'hero.audio.video2',
  'hero.video.image', 'hero.video.poster', 'hero.video.video1', 'hero.video.video2',
  'consult.image',
  'about.hero', 'about.experts', 'about.delivery', 'about.news',
  'careers.work', 'careers.life',
] as const;
export type AssetKey = (typeof ASSET_KEYS)[number];

export interface AssetField {
  key: AssetKey;
  group: ContentGroup;
  section: string;
  label: string;
  kind: 'image' | 'video';
  hint?: string;
}

const VIDEO_HINT = "Landing kartasida emas — yo'nalish sahifasining cover'ida aylanadi; bo'lmasa cover'da rasm turadi. MP4, 40 MB gacha";

function heroAssetFields(id: 'apple' | 'pc' | 'audio' | 'video', name: string): AssetField[] {
  const section = "Yo'nalish kartalari";
  return [
    { key: `hero.${id}.image`, group: 'home', section, label: `${name} — rasm`, kind: 'image', hint: "Landing kartasi va yo'nalish sahifasining cover'i" },
    { key: `hero.${id}.poster`, group: 'home', section, label: `${name} — video posteri`, kind: 'image', hint: 'Video yuklanguncha turadigan kadr' },
    { key: `hero.${id}.video1`, group: 'home', section, label: `${name} — 1-video`, kind: 'video', hint: VIDEO_HINT },
    { key: `hero.${id}.video2`, group: 'home', section, label: `${name} — 2-video`, kind: 'video', hint: VIDEO_HINT },
  ];
}

export const ASSET_FIELDS: AssetField[] = [
  { key: 'logo', group: 'store', section: 'Logo va favicon', label: "Logo — yorug' fon uchun", kind: 'image', hint: 'Shaffof PNG; header va kirish oynasida' },
  { key: 'logoDark', group: 'store', section: 'Logo va favicon', label: "Logo — qorong'i fon uchun", kind: 'image', hint: "Shaffof PNG; qorong'i mavzu, bosh sahifa va vakansiyalar" },
  { key: 'favicon', group: 'store', section: 'Logo va favicon', label: 'Favicon', kind: 'image', hint: 'Kvadrat PNG, kamida 512×512' },
  ...heroAssetFields('apple', 'Apple'),
  ...heroAssetFields('pc', 'PC'),
  ...heroAssetFields('audio', 'Audio'),
  ...heroAssetFields('video', 'Video'),
  { key: 'consult.image', group: 'home', section: 'Konsultatsiya', label: 'Rasm', kind: 'image' },
  { key: 'about.hero', group: 'about', section: 'Rasmlar', label: 'Hero foni', kind: 'image', hint: "Huquqiy sahifalar hero'sida ham; qorong'i mavzuda ranglari teskari aylanadi" },
  { key: 'about.experts', group: 'about', section: 'Rasmlar', label: 'Mutaxassislar fotosi', kind: 'image' },
  { key: 'about.delivery', group: 'about', section: 'Rasmlar', label: '«Doim yaqinda» fotosi', kind: 'image' },
  { key: 'about.news', group: 'about', section: 'Rasmlar', label: 'Yangiliklar rasmi', kind: 'image', hint: 'Shaffof PNG' },
  { key: 'careers.work', group: 'careers', section: 'Rasmlar', label: "«ProDuct'da ishlash» fotosi", kind: 'image' },
  { key: 'careers.life', group: 'careers', section: 'Rasmlar', label: '«Jamoadagi hayot» foni', kind: 'image', hint: "Qorong'i mavzuda ranglari teskari aylanadi" },
];

/** `site_texts` qatorlari: kalit → ikkala til. */
export type SiteTexts = Record<string, ApiSiteText>;
/** `site_assets` qatorlari: kalit → `/images/products/…`. */
export type SiteAssets = Partial<Record<AssetKey, string>>;
/** Bitta tildagi o'zgarishlar — `locales.ts` ustiga qo'yiladi. */
export type TextOverrides = Partial<Record<TextKey, string>>;

/** `GET /api/admin/texts` javobi — maydonlar standart matnlari bilan. */
export interface TextsResponse {
  fields: (TextField & { defaults: ApiSiteText })[];
  values: SiteTexts;
}
/** `GET /api/admin/assets` javobi. */
export interface AssetsResponse {
  fields: AssetField[];
  values: SiteAssets;
}

export function isAssetKey(key: string): key is AssetKey {
  return (ASSET_KEYS as readonly string[]).includes(key);
}

/** Bitta til uchun admin o'zgarishlari: faqat registr kalitlari, bo'sh qiymat tashlanadi (standart qoladi). */
export function textOverrides(overrides: SiteTexts, lang: 'uz' | 'ru'): TextOverrides {
  const out: TextOverrides = {};
  for (const f of TEXT_FIELDS) {
    const v = overrides[f.key]?.[lang];
    if (v) out[f.key] = v;
  }
  return out;
}

/** `locales.ts` matnlari ustiga admin o'zgarishlari (spec §6 ustma-ust qo'yish qoidasi). */
export function mergeTexts(base: Translation, overrides: SiteTexts, lang: 'uz' | 'ru'): Translation {
  return { ...base, ...textOverrides(overrides, lang) };
}

/**
 * `PUT /api/admin/texts` uchun yozuvlar: faqat registr kalitlari; standartga teng til bo'sh deb olinadi — keyin
 * `locales.ts` o'zgarsa, eski nusxa uni yopib qo'ymasin. Ikkala til bo'sh — qator o'chiriladi (route qaror qiladi).
 */
export function planTextWrites(input: SiteTexts, uzBase: Translation, ruBase: Translation): { key: TextKey; uz: string; ru: string }[] {
  return TEXT_FIELDS.filter((f) => f.key in input).map((f) => {
    const v = input[f.key];
    return { key: f.key, uz: v.uz === uzBase[f.key] ? '' : v.uz, ru: v.ru === ruBase[f.key] ? '' : v.ru };
  });
}
