import type { ApiSiteText } from '../../shared/types';
import type { Translation } from '../locales';

/**
 * Sayt kontenti registri (spec §6) — admin'da tahrirlanadigan matnlar (`site_texts`) va rasm/videolar
 * (`site_assets`). Registr tartibi = admin'dagi maydon tartibi; `group` — admin sahifasi, `section` — shu
 * sahifadagi karta id'si. Matn kaliti `locales.ts`dagi `Translation` kaliti: u yerda kalit o'chsa, lint
 * registrni ham yiqitadi — etim kalit qolmaydi. Registrga qator qo'shish = matnni tahrirlanadigan qilish.
 * Maydon nomlari, izohlar va karta sarlavhalari admin tarjimasida (`src/admin/i18n/{uz,ru}/site.ts`), bu yerda
 * faqat tuzilma.
 */
export type TextKey = keyof Translation;
export type ContentGroup = 'home' | 'store' | 'contact' | 'about' | 'careers' | 'legal' | 'seo';
export type SiteSection =
  | 'heroApple' | 'heroPc' | 'heroAudio' | 'heroVideo' | 'services' | 'consult' | 'homeTitles'
  | 'productPage' | 'orderCookie' | 'logo' | 'contact'
  | 'aboutIntro' | 'aboutExperts' | 'aboutWarranty' | 'aboutBuy' | 'aboutPersonal' | 'aboutNear' | 'aboutNews'
  | 'careersSeo' | 'careersHero' | 'careersWork' | 'careersLife' | 'careersWhy' | 'careersRoles'
  | 'images' | 'legal' | 'seo';

export interface TextField {
  key: TextKey;
  group: ContentGroup;
  section: SiteSection;
  kind: 'text' | 'textarea';
}

const inSection = (group: ContentGroup, section: SiteSection) =>
  (key: TextKey, kind: TextField['kind'] = 'text'): TextField => ({ key, group, section, kind });

/** Landing'dagi har yo'nalish kartasi admin'da alohida karta: nom, rasm, poster, 2 video. */
const heroApple = inSection('home', 'heroApple');
const heroPc = inSection('home', 'heroPc');
const heroAudio = inSection('home', 'heroAudio');
const heroVideo = inSection('home', 'heroVideo');
const services = inSection('home', 'services');
const consult = inSection('home', 'consult');
const homeTitles = inSection('home', 'homeTitles');
const productPage = inSection('store', 'productPage');
const orderCookie = inSection('store', 'orderCookie');
const contact = inSection('contact', 'contact');
const aboutIntro = inSection('about', 'aboutIntro');
const aboutExperts = inSection('about', 'aboutExperts');
const aboutWarranty = inSection('about', 'aboutWarranty');
const aboutBuy = inSection('about', 'aboutBuy');
const aboutPersonal = inSection('about', 'aboutPersonal');
const aboutNear = inSection('about', 'aboutNear');
const aboutNews = inSection('about', 'aboutNews');
const careersSeo = inSection('careers', 'careersSeo');
const careersHero = inSection('careers', 'careersHero');
const careersWork = inSection('careers', 'careersWork');
const careersLife = inSection('careers', 'careersLife');
const careersWhy = inSection('careers', 'careersWhy');
const careersRoles = inSection('careers', 'careersRoles');
const legal = inSection('legal', 'legal');
const seo = inSection('seo', 'seo');

export const TEXT_FIELDS: TextField[] = [
  heroApple('heroApple', 'textarea'),
  heroPc('heroPc', 'textarea'),
  heroAudio('heroAudio', 'textarea'),
  heroVideo('heroVideo', 'textarea'),

  services('svcTitle'),
  services('svcPrompt'),
  services('heroCtaPrimary'),
  services('svcWarrantyCard'),
  services('svcWarrantyDesc', 'textarea'),
  services('svcDeliveryCard'),
  services('svcDeliveryDesc', 'textarea'),
  services('svcServiceCard'),
  services('svcServiceDesc', 'textarea'),

  consult('consultTitle'),
  consult('consultLead', 'textarea'),
  consult('consultTopicApple'),
  consult('consultTopicPc'),
  consult('consultTopicAudio'),
  consult('consultTopicVideo'),
  consult('consultTopicService'),
  consult('consultTopicOther'),
  consult('consultDoneTitle'),
  consult('consultDoneText', 'textarea'),

  homeTitles('proTitle'),
  homeTitles('newsTitle'),
  homeTitles('homeBrands'),

  productPage('svcDeliveryTitle'),
  productPage('svcDeliveryFact'),
  productPage('feature3'),
  productPage('svcWarrantyTitle'),
  productPage('svcWarrantyFact'),
  productPage('feature2'),
  productPage('trustShort'),
  productPage('setupTitle'),
  productPage('setupText', 'textarea'),
  productPage('setupCta'),

  orderCookie('orderSuccessNote', 'textarea'),
  orderCookie('cookieText', 'textarea'),
  orderCookie('cookieAccept'),

  contact('footerAddressText1'),
  contact('footerAddressText2'),
  contact('footerTime'),
  contact('seoOpeningHours'),

  aboutIntro('aboutLede', 'textarea'),
  aboutIntro('aboutWhyTitle'),
  aboutIntro('aboutWhyMuted'),
  aboutExperts('aboutExpertsLabel'),
  aboutExperts('aboutExpertsTitle'),
  aboutExperts('aboutExpertsText', 'textarea'),
  aboutWarranty('aboutWarrantyTitle'),
  aboutWarranty('aboutWarrantyText', 'textarea'),
  aboutBuy('aboutBuyTitle'),
  aboutBuy('aboutBuyText', 'textarea'),
  aboutBuy('aboutTradeInLink'),
  aboutPersonal('aboutPersonalTitle'),
  aboutPersonal('aboutPersonalText', 'textarea'),
  aboutNear('aboutNearTitle'),
  aboutNear('aboutNearText', 'textarea'),
  aboutNews('aboutNewsTitle'),
  aboutNews('aboutNewsText', 'textarea'),
  aboutNews('aboutBlogLink'),

  careersSeo('careersMetaDesc', 'textarea'),
  careersHero('careersHeroTitle'),
  careersHero('careersHeroCta'),
  careersHero('careersIntro', 'textarea'),
  careersWork('careersWorkEyebrow'),
  careersWork('careersWorkTitle'),
  careersWork('careersWorkText', 'textarea'),
  careersWork('careersWorkQuote'),
  careersWork('careersQuoteBy'),
  careersLife('careersLifeEyebrow'),
  careersLife('careersLifeTitle'),
  careersLife('careersLifeText', 'textarea'),
  careersLife('careersLifeCard'),
  careersWhy('careersWhyTitle'),
  careersWhy('careersWhyMuted'),
  careersWhy('careersWhyTechTitle'),
  careersWhy('careersWhyTechText', 'textarea'),
  careersWhy('careersWhyClientTitle'),
  careersWhy('careersWhyClientText', 'textarea'),
  careersWhy('careersWhyServiceTitle'),
  careersWhy('careersWhyServiceText', 'textarea'),
  careersWhy('careersWhyTeamTitle'),
  careersWhy('careersWhyTeamText', 'textarea'),
  careersRoles('careersRolesTitle'),
  careersRoles('careersRolesEmpty', 'textarea'),
  careersRoles('careersDoneTitle'),
  careersRoles('careersDoneText', 'textarea'),

  legal('legalLedeOferta'),
  legal('legalLedePrivacy'),
  legal('legalLedeReturns'),
  legal('termsLede'),

  seo('metaCatalogDesc', 'textarea'),
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
  section: SiteSection;
  kind: 'image' | 'video';
}

const HERO_SECTION = { apple: 'heroApple', pc: 'heroPc', audio: 'heroAudio', video: 'heroVideo' } as const;

function heroAssetFields(id: 'apple' | 'pc' | 'audio' | 'video'): AssetField[] {
  const section = HERO_SECTION[id];
  return [
    { key: `hero.${id}.image`, group: 'home', section, kind: 'image' },
    { key: `hero.${id}.poster`, group: 'home', section, kind: 'image' },
    { key: `hero.${id}.video1`, group: 'home', section, kind: 'video' },
    { key: `hero.${id}.video2`, group: 'home', section, kind: 'video' },
  ];
}

export const ASSET_FIELDS: AssetField[] = [
  { key: 'logo', group: 'store', section: 'logo', kind: 'image' },
  { key: 'logoDark', group: 'store', section: 'logo', kind: 'image' },
  { key: 'favicon', group: 'store', section: 'logo', kind: 'image' },
  ...heroAssetFields('apple'),
  ...heroAssetFields('pc'),
  ...heroAssetFields('audio'),
  ...heroAssetFields('video'),
  { key: 'consult.image', group: 'home', section: 'consult', kind: 'image' },
  { key: 'about.hero', group: 'about', section: 'images', kind: 'image' },
  { key: 'about.experts', group: 'about', section: 'images', kind: 'image' },
  { key: 'about.delivery', group: 'about', section: 'images', kind: 'image' },
  { key: 'about.news', group: 'about', section: 'images', kind: 'image' },
  { key: 'careers.work', group: 'careers', section: 'images', kind: 'image' },
  { key: 'careers.life', group: 'careers', section: 'images', kind: 'image' },
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

/**
 * `PUT /api/admin/assets`dan keyin diskdan o'chiriladigan fayllar (ombor kaliti, `products/…`): video kalitining
 * almashtirilgan yoki olib tashlangan eski fayli, agar u boshqa kalitda ishlatilmasa. Rasmlar o'chirilmaydi — kichik,
 * proxy keshidagi sahifa (1–5 daqiqa) eski rasmni so'rab singan rasm ko'rsatardi; video yo'qolsa cover posterida qoladi.
 */
export function staleVideoFiles(before: SiteAssets, after: SiteAssets): string[] {
  const inUse = new Set(Object.values(after));
  const out = new Set<string>();
  for (const f of ASSET_FIELDS) {
    const old = before[f.key];
    if (f.kind !== 'video' || !old || old === after[f.key] || inUse.has(old) || !old.startsWith('/images/products/')) continue;
    out.add(old.slice('/images/'.length));
  }
  return [...out];
}
