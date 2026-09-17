# Admin qayta qurilishi — 4a-bosqich (Kontent mexanizmi) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Saytning marketing matnlari va rasm/videolarini admin'dan boshqariladigan qiladigan mexanizm — registr, validatsiya, admin API, saytdagi matn va rasm overlay'i; `TermsBento` o'chiriladi, video yuklash va `/images/products` Range bilan beriladi. Admin ekranlari (landing muharriri, Sahifalar, kontent ro'yxatlari) — keyingi 4b rejasi.

**Architecture:** Registr `src/lib/site-content.ts` (sof, testli) qaysi `Translation` kaliti va qaysi rasm/video kaliti tahrirlanishini aytadi. `site_texts`/`site_assets` jadvallari migratsiya `0035`da allaqachon bor. Admin API ikkala jadvalni o'qiydi/yozadi. Store layout loader'i joriy tilning o'zgarishlarini yuboradi, komponent ularni `locales.ts` ustiga qo'yadi (`t` kontekst orqali hamma joyga yetadi); `meta()`da kerak matnlar loader'da `loadT` bilan olinadi. Rasm/videolar `StoreLayout`dagi React context (`SiteAssetsProvider` / `useAssets`) orqali, standartlari `ASSET_DEFAULTS`da.

**Tech Stack:** React Router v7 (SSR, route `loader`/`meta`), Express (`express.static`), SQLite (`env.DB`), vitest.

**Spec:** `docs/superpowers/specs/2026-09-15-admin-redesign-design.md` (§1 qarorlar, §2 YAGNI, §6 ma'lumotlar, matn va rasm registri, API, §7 sayt tomonidagi o'zgarishlar, §8 xavfsizlik, §9 test, §10 4-bosqich).

## Global Constraints

- **Migratsiya yo'q:** `site_texts (key, uz, ru)` va `site_assets (key, url)` `migrations/0035_product_types.sql`da bor; mavjud migratsiya fayllari o'zgartirilmaydi.
- **Standart o'zgarmaydi:** `site_texts`/`site_assets` bo'sh bo'lsa har sahifa hozirgidek chiziladi (yagona istisnolar: `muddatli-tolov` sahifasi har rejimda `LegalPage` shablonida; `site_config.whatsapp` to'ldirilgan bo'lsa mobil aloqa tugmasida WhatsApp).
- **`meta()` bazaga kira olmaydi:** registr kalitlarini (`TEXT_FIELDS`) `meta()` ichida `translations`dan o'qimang — matn loader'da `loadT(env, locale)` bilan olinib loader data'sida qaytariladi.
- **Xavfsizlik (spec §8):** yangi admin route'lar `requireAdmin` + `parseBody`; matnlar React orqali chiziladi (HTML emas); rasm/video yo'li faqat `/images/products/…`; SVG qabul qilinmaydi; video faqat `video/mp4`; sirlar `publicSiteConfig`da avvalgidek bo'shatiladi.
- **i18n:** `src/locales.ts`da har yangi kalit ikkala tilda (`O'zbek tili`, `Rus tili`) — `Translation` tipi parity'ni lint'da tekshiradi.
- **TS:** strict, `any` yo'q; `@types/react` yo'q — `useState(x as T)` + o'qishda cast, hook chaqiruvida generik yo'q, `createContext(x as T)` + `useContext(...) as T`; `key` faqat native element yoki `FC<{…}>`da.
- **`server/` fayllari** Node type-stripping bilan ishlaydi: `server/`dan import `.ts` kengaytmali (`./env.ts`), parametr-xususiyat (`constructor(public x)`) yo'q.
- **Dizayn tokenlari:** hex yo'q (ruxsat etilgan literal — `#25D366` WhatsApp va `white`); `text-[Npx]` yo'q; `shadow-*` yo'q; bosiladigan elementda `press`.
- `bun`/`bunx`, npm emas. Har task oxirida `bun run lint && bun run test` yashil. Implementer subagent chaqirmaydi, dev server ishga tushirmaydi va brauzer tekshiruvini qilmaydi — brauzer qadamlari **controller**niki (egasi Browser panelida kirgan holda). Sinov o'zgarishlari API orqali lokal bazaga yoziladi va qadam oxirida qaytariladi.
- Commit trailer: `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Rejadagi qarorlar (spec'dan farqlar)

1. Registr qatoriga `section` (admin kartasining sarlavhasi) qo'shildi — landing muharriri va Sozlamalar maydonlarni kartalarga shu bo'yicha bo'ladi.
2. Rasm/videolar store layout'da React context bilan (`SiteAssetsProvider` / `useAssets`) — `Header`, `LoginPanel`, `HeroNotch`, sahifa komponentlari prop orqali uzatishsiz oladi.
3. `loadT` ishlatadigan route'lar: `catalog`, `deals`, `brand`, `category`, `vakansiyalar`, `page`. Spec'dagi `home`, `product`, `blog` `meta()`da registr kalitini o'qimaydi (`sum`, `breadcrumbHome`, qotirilgan blog tavsifi) — ularga tegilmaydi; `brand` esa `metaCatalogDesc`ni o'qiydi — qo'shildi.
4. Organization JSON-LD manzili va ish vaqti store loader'ida hisoblanib (`orgContact`) `root.tsx`ga beriladi — root bundle'iga `locales.ts` qo'shilmaydi.
5. `termsLede` standarti neytral («Buyurtma, to'lov va yetkazib berish shartlari.»): sahifa endi har rejimda chiqadi va bazadagi matni naqd rejimdagi umumiy "Shartlar".
6. Konsultatsiya mavzularini yashirish (spec §5 «bo'sh qolsa chip chiqmaydi») qilinmadi: §2 «6 chip soni qat'iy, faqat mazmuni tahrirlanadi» va §6 «bo'sh = standart» qoidasi ustun.
7. `PUT /api/admin/texts` standartga teng tilni bo'sh deb saqlaydi (`planTextWrites`) — keyin `locales.ts` o'zgarsa eski nusxa uni yopib qo'ymasin.

## Fayl tuzilmasi

- `src/lib/site-content.ts` (+ `.test.ts`, yangi) — `TextKey`, `ContentGroup`, `TextField`, `TEXT_FIELDS` (94), `ASSET_KEYS` (26), `AssetKey`, `AssetField`, `ASSET_FIELDS`, `SiteTexts`, `SiteAssets`, `TextOverrides`, `TextsResponse`, `AssetsResponse`, `isAssetKey`, `textOverrides`, `mergeTexts`, `planTextWrites`.
- `src/locales.ts` — `heroApple`, `heroPc`, `heroAudio`, `heroVideo`, `seoOpeningHours`, `termsLede` (ikkala tilda).
- `functions/lib/validate.ts` (+ test) — `parseTextsInput`, `parseAssetsInput`. `shared/types.ts` — `ApiSiteText`.
- `app/lib/loaders.ts` — `readSiteTexts`, `loadSiteTexts`, `readSiteAssets`, `loadSiteAssets`, `loadT`.
- `app/routes/api.admin.texts.tsx`, `app/routes/api.admin.assets.tsx` (yangi); `app/routes.ts`; `src/admin/errText.ts`.
- `app/routes/store.tsx`, `app/root.tsx`, `app/lib/seo.ts` (+ test), `app/routes/{catalog,deals,brand,category,vakansiyalar,page}.tsx`; o'chadi `src/store/TermsBento.tsx`.
- `src/store/SiteAssets.tsx` (yangi), `src/store/hero-columns.ts` (+ `.test.ts`), `src/store/{HeroColumns,StoreLayout,Header,HeroNotch,LoginPanel,ConsultForm,PageHero,AboutPage,CareersPage,ContactFab}.tsx`.
- `server/images.ts`, `server/env.ts`, `server/index.ts`, `app/routes/api.admin.upload.tsx`, `deploy/nginx.conf`.
- Hujjat: `CLAUDE.md`, spec §6/§7.

---

### Task 1: Kontent registri va yangi matn kalitlari

**Files:**
- Create: `src/lib/site-content.ts`
- Test: `src/lib/site-content.test.ts`
- Modify: `src/locales.ts:20,56,144` (uz blok) va `:263,298,386` (ru blok)
- Modify: `shared/types.ts` (`export interface ApiDashboard {` dan oldin)

**Interfaces:**
- Consumes: `Translation` (`src/locales.ts`), `ApiSiteText` (`shared/types.ts`) — bu task'da tip qo'shiladi (Step 1).
- Produces (`src/lib/site-content.ts`):
  - `type TextKey = keyof Translation`; `type ContentGroup = 'home' | 'store' | 'contact' | 'about' | 'careers' | 'legal' | 'seo'`
  - `interface TextField { key: TextKey; group: ContentGroup; section: string; label: string; kind: 'text' | 'textarea'; hint?: string }`; `TEXT_FIELDS: TextField[]`
  - `ASSET_KEYS` (readonly tuple, 26 kalit); `type AssetKey`; `interface AssetField { key: AssetKey; group: ContentGroup; section: string; label: string; kind: 'image' | 'video'; hint?: string }`; `ASSET_FIELDS: AssetField[]`
  - `type SiteTexts = Record<string, ApiSiteText>`; `type SiteAssets = Partial<Record<AssetKey, string>>`; `type TextOverrides = Partial<Record<TextKey, string>>`
  - `interface TextsResponse { fields: (TextField & { defaults: ApiSiteText })[]; values: SiteTexts }`; `interface AssetsResponse { fields: AssetField[]; values: SiteAssets }`
  - `isAssetKey(key: string): key is AssetKey`
  - `textOverrides(overrides: SiteTexts, lang: 'uz' | 'ru'): TextOverrides`
  - `mergeTexts(base: Translation, overrides: SiteTexts, lang: 'uz' | 'ru'): Translation`
  - `planTextWrites(input: SiteTexts, uzBase: Translation, ruBase: Translation): { key: TextKey; uz: string; ru: string }[]`
- Produces (`src/locales.ts`): `heroApple`, `heroPc`, `heroAudio`, `heroVideo`, `seoOpeningHours`, `termsLede`.

- [ ] **Step 1: `shared/types.ts` — `ApiSiteText`.** `export interface ApiDashboard {` qatoridan oldin qo'shing:
```ts
/** Admin'da tahrirlangan sayt matni (`site_texts`); bo'sh til — `locales.ts`dagi standart. */
export interface ApiSiteText {
  uz: string;
  ru: string;
}

```

- [ ] **Step 2: `src/lib/site-content.test.ts` — muvaffaqiyatsiz test.**
```ts
import { describe, expect, it } from 'vitest';
import { translations } from '../locales';
import { ASSET_FIELDS, ASSET_KEYS, TEXT_FIELDS, isAssetKey, mergeTexts, planTextWrites, textOverrides } from './site-content';

const uz = translations["O'zbek tili"];
const ru = translations['Rus tili'];

describe('mergeTexts', () => {
  it("bo'sh bo'lmagan o'zgarish shu tildagi standartni almashtiradi", () => {
    expect(mergeTexts(uz, { proTitle: { uz: 'Yangi shior', ru: 'Новый слоган' } }, 'uz').proTitle).toBe('Yangi shior');
    expect(mergeTexts(ru, { proTitle: { uz: 'Yangi shior', ru: '' } }, 'ru').proTitle).toBe(ru.proTitle);
  });
  it("registrda yo'q kalit e'tiborsiz qoladi", () => {
    expect(mergeTexts(uz, { cartTitle: { uz: 'Savatcha', ru: '' } }, 'uz').cartTitle).toBe(uz.cartTitle);
  });
  it("o'zgarish bo'lmasa asl matnlar", () => {
    expect(mergeTexts(uz, {}, 'uz')).toEqual(uz);
  });
});

describe('textOverrides', () => {
  it("faqat shu tildagi bo'sh bo'lmagan qiymatlar", () => {
    expect(textOverrides({ proTitle: { uz: 'A', ru: '' }, newsTitle: { uz: '', ru: 'Б' } }, 'uz')).toEqual({ proTitle: 'A' });
    expect(textOverrides({ proTitle: { uz: 'A', ru: '' }, newsTitle: { uz: '', ru: 'Б' } }, 'ru')).toEqual({ newsTitle: 'Б' });
  });
});

describe('planTextWrites', () => {
  it("standartga teng til bo'sh deb yoziladi, registrdan tashqari kalit tashlanadi", () => {
    const rows = planTextWrites({ proTitle: { uz: uz.proTitle, ru: 'Свой слоган' }, cartTitle: { uz: 'x', ru: 'y' } }, uz, ru);
    expect(rows).toEqual([{ key: 'proTitle', uz: '', ru: 'Свой слоган' }]);
  });
});

describe('registr', () => {
  it('kalitlar takrorlanmaydi, rasm maydonlari ASSET_KEYS tartibida', () => {
    const keys = TEXT_FIELDS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(ASSET_FIELDS.map((f) => f.key)).toEqual([...ASSET_KEYS]);
  });
  it("yangi matnlarning standarti", () => {
    expect(uz.heroPc).toBe('Personal\nComputers');
    expect(ru.heroApple).toBe('Apple');
    expect(uz.seoOpeningHours).toBe('Mo-Su 10:00-21:00');
    expect(ru.seoOpeningHours).toBe('Mo-Su 10:00-21:00');
  });
  it('isAssetKey', () => {
    expect(isAssetKey('hero.pc.video1')).toBe(true);
    expect(isAssetKey('hero.tv.image')).toBe(false);
  });
});
```

- [ ] **Step 3: Muvaffaqiyatsizligini ko'ring.**
Run: `bunx vitest run src/lib/site-content.test.ts`
Expected: FAIL — `./site-content` moduli topilmadi.

- [ ] **Step 4: `src/locales.ts` — yangi kalitlar.**
  - uz blokda `    proTitle: "Professional yondashuv",` (20-qator) dan keyin:
```ts
    // Landing yo'nalish kartalari (admin → Kontent → Bosh sahifa); `\n` — yangi qator.
    heroApple: "Apple",
    heroPc: "Personal\nComputers",
    heroAudio: "Audio",
    heroVideo: "Video",
```
  - uz blokda `    footerTime: "Du–Yak, 10:00–21:00",` (56-qator) dan keyin:
```ts
    // Google (Organization JSON-LD) uchun ish vaqti — schema.org formati, ikkala tilda bir xil.
    seoOpeningHours: "Mo-Su 10:00-21:00",
```
  - uz blokda `    legalLedeReturns: "Tovarni qaytarish, almashtirish va kafolat tartibi.",` (144-qator) dan keyin:
```ts
    termsLede: "Buyurtma, to'lov va yetkazib berish shartlari.",
```
  - ru blokda `    proTitle: "Профессиональный подход",` (263-qator) dan keyin:
```ts
    heroApple: "Apple",
    heroPc: "Personal\nComputers",
    heroAudio: "Audio",
    heroVideo: "Video",
```
  - ru blokda `    footerTime: "Пн–Вс, 10:00–21:00",` (298-qator) dan keyin:
```ts
    seoOpeningHours: "Mo-Su 10:00-21:00",
```
  - ru blokda `    legalLedeReturns: "Порядок возврата, обмена и гарантийного обслуживания.",` (386-qator) dan keyin:
```ts
    termsLede: "Условия заказа, оплаты и доставки.",
```

- [ ] **Step 5: `src/lib/site-content.ts`.**
```ts
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
```

- [ ] **Step 6: O'tishini ko'ring.**
Run: `bunx vitest run src/lib/site-content.test.ts`
Expected: PASS (8 test).

- [ ] **Step 7: Hammasi.**
Run: `bun run lint && bun run test`
Expected: lint xatosiz (registrdagi har `key` `Translation`da bor — aks holda tsc yiqiladi); `Test Files 30 passed (30)`, `Tests 337 passed (337)`.

- [ ] **Step 8: Commit**
```bash
git add src/lib/site-content.ts src/lib/site-content.test.ts src/locales.ts shared/types.ts
git commit -m "feat(content): sayt matn va rasm registri, mergeTexts; yangi hero/ish vaqti/shartlar matnlari

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Validatsiya, loader'lar va admin API

**Files:**
- Modify: `functions/lib/validate.ts` (fayl oxiriga), `functions/lib/validate.test.ts` (import + fayl oxiriga)
- Modify: `app/lib/loaders.ts` (importlar + fayl oxiriga)
- Create: `app/routes/api.admin.texts.tsx`, `app/routes/api.admin.assets.tsx`
- Modify: `app/routes.ts:68` (upload route'idan keyin), `src/admin/errText.ts`

**Interfaces:**
- Consumes: Task 1 — `TEXT_FIELDS`, `ASSET_FIELDS`, `isAssetKey`, `mergeTexts`, `planTextWrites`, `SiteTexts`, `SiteAssets`, `TextsResponse`, `AssetsResponse`; `ApiSiteText`; `translations`, `Translation`; `localeToLang`, `Locale` (`app/lib/i18n.ts`); `requireAdmin`, `parseBody` (`app/routes/api.admin.guard.ts`); `json` (`functions/lib/db.ts`); `env.DB.prepare/batch`.
- Produces:
  - `parseTextsInput(body: unknown, keys: readonly string[]): Record<string, ApiSiteText>` — xatolar `body_not_object`, `key_invalid`, `text_too_long`.
  - `parseAssetsInput(body: unknown, fields: readonly { key: string; kind: 'image' | 'video' }[]): Record<string, string>` — xatolar `body_not_object`, `key_invalid`, `url_invalid`.
  - `readSiteTexts(env): Promise<SiteTexts>` (xato yuqoriga), `loadSiteTexts(env): Promise<SiteTexts>` (xato → `{}`), `readSiteAssets(env): Promise<SiteAssets>`, `loadSiteAssets(env): Promise<SiteAssets>`, `loadT(env, locale: Locale): Promise<Translation>`.
  - `GET /api/admin/texts` → `TextsResponse`; `PUT /api/admin/texts` body `{ [key]: { uz, ru } }` → `{ values: SiteTexts }`.
  - `GET /api/admin/assets` → `AssetsResponse`; `PUT /api/admin/assets` body `{ [key]: url | '' }` → `{ values: SiteAssets }`.

- [ ] **Step 1: `validate.test.ts` — muvaffaqiyatsiz testlar.** Importga `parseTextsInput,` va `parseAssetsInput,` qo'shing (`parseTypeInput,` qatoridan keyin). Fayl oxiriga:
```ts
describe('parseTextsInput', () => {
  const keys = ['proTitle', 'newsTitle'];
  it('ikkala til trim qilinadi', () => {
    expect(parseTextsInput({ proTitle: { uz: '  Shior ', ru: ' Слоган ' } }, keys)).toEqual({ proTitle: { uz: 'Shior', ru: 'Слоган' } });
  });
  it("yo'q til bo'sh satr bo'ladi", () => {
    expect(parseTextsInput({ newsTitle: { uz: 'Yangiliklar' } }, keys)).toEqual({ newsTitle: { uz: 'Yangiliklar', ru: '' } });
  });
  it("registrda yo'q kalit — key_invalid", () => {
    expect(() => parseTextsInput({ adminPassword: { uz: 'x', ru: '' } }, keys)).toThrow('key_invalid');
  });
  it('2000 belgidan uzun — text_too_long', () => {
    expect(() => parseTextsInput({ proTitle: { uz: 'a'.repeat(2001), ru: '' } }, keys)).toThrow('text_too_long');
    expect(parseTextsInput({ proTitle: { uz: 'a'.repeat(2000), ru: '' } }, keys).proTitle.uz).toHaveLength(2000);
  });
  it("obyekt bo'lmagan body va qiymat — body_not_object", () => {
    expect(() => parseTextsInput(null, keys)).toThrow('body_not_object');
    expect(() => parseTextsInput({ proTitle: 'matn' }, keys)).toThrow('body_not_object');
  });
});

describe('parseAssetsInput', () => {
  const fields = [
    { key: 'logo', kind: 'image' as const },
    { key: 'hero.apple.video1', kind: 'video' as const },
  ];
  it("yuklangan rasm va video yo'li qabul qilinadi, bo'sh — standartga qaytish", () => {
    expect(parseAssetsInput({ logo: ' /images/products/9f1c-2a.webp ', 'hero.apple.video1': '' }, fields))
      .toEqual({ logo: '/images/products/9f1c-2a.webp', 'hero.apple.video1': '' });
    expect(parseAssetsInput({ 'hero.apple.video1': '/images/products/abc.mp4' }, fields))
      .toEqual({ 'hero.apple.video1': '/images/products/abc.mp4' });
  });
  it("registrda yo'q kalit — key_invalid", () => {
    expect(() => parseAssetsInput({ 'hero.tv.image': '/images/products/a.webp' }, fields)).toThrow('key_invalid');
  });
  it("begona yoki yolg'on yo'l — url_invalid", () => {
    for (const url of [
      'https://evil.example/a.webp',
      '/images/products/../secret.webp',
      '/images/other/a.webp',
      '/images/products/a.svg',
      '/images/products/a.webp?x=1',
    ]) {
      expect(() => parseAssetsInput({ logo: url }, fields)).toThrow('url_invalid');
    }
  });
  it('rasm kalitiga video va aksincha — url_invalid', () => {
    expect(() => parseAssetsInput({ logo: '/images/products/a.mp4' }, fields)).toThrow('url_invalid');
    expect(() => parseAssetsInput({ 'hero.apple.video1': '/images/products/a.webp' }, fields)).toThrow('url_invalid');
  });
});
```

- [ ] **Step 2: Muvaffaqiyatsizligini ko'ring.**
Run: `bunx vitest run functions/lib/validate.test.ts`
Expected: FAIL — `parseTextsInput`/`parseAssetsInput` eksport qilinmagan.

- [ ] **Step 3: `validate.ts` — fayl oxiriga.** Fayl boshidagi `shared/types` importiga `ApiSiteText` tipini qo'shing (u yerda allaqachon `import type { … } from '../../shared/types';` bor — ro'yxatga `ApiSiteText` qo'shiladi). Keyin fayl oxiriga:
```ts
const MAX_SITE_TEXT = 2000;
// Faqat admin yuklagan fayl: `products/<uuid>.<ext>` (upload route kalitlari), so'rov qatori va `..` yo'q.
const SITE_ASSET_URL = /^\/images\/products\/[A-Za-z0-9-]+\.(webp|png|jpg|mp4)$/;

/**
 * Sayt matnlari (`PUT /api/admin/texts`): kalit registrda (`keys` — route `TEXT_FIELDS`dan beradi, `functions/`
 * `src/`ni ko'rmaydi), har til trim qilinadi va ≤ 2000 belgi; bo'sh til — standart matn.
 */
export function parseTextsInput(body: unknown, keys: readonly string[]): Record<string, ApiSiteText> {
  const o = asRecord(body);
  const out: Record<string, ApiSiteText> = {};
  for (const [key, raw] of Object.entries(o)) {
    if (!keys.includes(key)) throw new ValidationError('key_invalid');
    const v = asRecord(raw);
    const uz = typeof v.uz === 'string' ? v.uz.trim() : '';
    const ru = typeof v.ru === 'string' ? v.ru.trim() : '';
    if (uz.length > MAX_SITE_TEXT || ru.length > MAX_SITE_TEXT) throw new ValidationError('text_too_long');
    out[key] = { uz, ru };
  }
  return out;
}

/**
 * Sayt rasm/videolari (`PUT /api/admin/assets`): kalit registrda, yo'l faqat yuklangan fayl, video kalitiga faqat
 * `.mp4`, rasm kalitiga `.mp4` emas; bo'sh — standartga qaytish (qator o'chiriladi).
 */
export function parseAssetsInput(body: unknown, fields: readonly { key: string; kind: 'image' | 'video' }[]): Record<string, string> {
  const o = asRecord(body);
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(o)) {
    const field = fields.find((f) => f.key === key);
    if (!field) throw new ValidationError('key_invalid');
    const url = typeof raw === 'string' ? raw.trim() : '';
    if (url !== '' && (!SITE_ASSET_URL.test(url) || url.endsWith('.mp4') !== (field.kind === 'video'))) {
      throw new ValidationError('url_invalid');
    }
    out[key] = url;
  }
  return out;
}
```

- [ ] **Step 4: O'tishini ko'ring.**
Run: `bunx vitest run functions/lib/validate.test.ts`
Expected: PASS (yangi 9 test bilan).

- [ ] **Step 5: `app/lib/loaders.ts`.** Importlar oxiriga (`import { siteConfig as staticSiteConfig } from './site.config';` dan keyin):
```ts
import { translations, type Translation } from '../../src/locales';
import { isAssetKey, mergeTexts, type SiteAssets, type SiteTexts } from '../../src/lib/site-content';
import { localeToLang, type Locale } from './i18n';
```
Fayl oxiriga:
```ts
/** `site_texts` → kalit bo'yicha xarita. Xato yuqoriga uzatiladi — admin API shuni ishlatadi. */
export async function readSiteTexts(env: Env): Promise<SiteTexts> {
  const { results } = await env.DB.prepare('SELECT key, uz, ru FROM site_texts').all<{ key: string; uz: string; ru: string }>();
  return Object.fromEntries(results.map((r) => [r.key, { uz: r.uz, ru: r.ru }]));
}

/** Sayt uchun: xato bo'lsa bo'sh — sayt `locales.ts` matnlari bilan ishlayveradi. */
export async function loadSiteTexts(env: Env): Promise<SiteTexts> {
  try {
    return await readSiteTexts(env);
  } catch (err) {
    console.error('loadSiteTexts fallback:', err);
    return {};
  }
}

/** `site_assets` → registr kalitlari bo'yicha xarita (registrdan tashqari qatorlar tashlanadi). */
export async function readSiteAssets(env: Env): Promise<SiteAssets> {
  const { results } = await env.DB.prepare('SELECT key, url FROM site_assets').all<{ key: string; url: string }>();
  const out: SiteAssets = {};
  for (const r of results) if (isAssetKey(r.key)) out[r.key] = r.url;
  return out;
}

/** Sayt uchun: xato bo'lsa bo'sh — koddagi standart rasm/videolar chiqadi. */
export async function loadSiteAssets(env: Env): Promise<SiteAssets> {
  try {
    return await readSiteAssets(env);
  } catch (err) {
    console.error('loadSiteAssets fallback:', err);
    return {};
  }
}

/**
 * Joriy til matnlari admin o'zgarishlari bilan — `meta()` bazaga kira olmagani uchun registr kalitlarini meta'da
 * ishlatadigan route'lar matnni loader'da shu bilan oladi (spec §7).
 * ponytail: store layout ham `site_texts`ni o'qiydi — bir so'rovda ikki kichik SELECT; sekinlashsa so'rov darajasida kesh.
 */
export async function loadT(env: Env, locale: Locale): Promise<Translation> {
  return mergeTexts(translations[localeToLang(locale)], await loadSiteTexts(env), locale === 'ru' ? 'ru' : 'uz');
}
```

- [ ] **Step 6: `app/routes/api.admin.texts.tsx`.**
```tsx
import type { Route } from './+types/api.admin.texts';
import { json } from '../../functions/lib/db';
import { parseTextsInput } from '../../functions/lib/validate';
import { readSiteTexts } from '../lib/loaders';
import { translations } from '../../src/locales';
import { TEXT_FIELDS, planTextWrites, type TextsResponse } from '../../src/lib/site-content';
import { requireAdmin, parseBody } from './api.admin.guard';

const UZ = translations["O'zbek tili"];
const RU = translations['Rus tili'];

/** Sayt matnlari: registr maydonlari standart matnlari bilan va admin o'zgarishlari (`site_texts`). */
export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const body: TextsResponse = {
    fields: TEXT_FIELDS.map((f) => ({ ...f, defaults: { uz: UZ[f.key], ru: RU[f.key] } })),
    values: await readSiteTexts(env),
  };
  return json(body);
}

/** `PUT` — faqat yuborilgan kalitlar; standartga teng til bo'sh saqlanadi, ikkala til bo'sh — qator o'chadi. */
export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  if (request.method !== 'PUT') return json({ error: 'method_not_allowed' }, { status: 405 });
  const keys = TEXT_FIELDS.map((f) => f.key);
  const input = parseBody(await request.json().catch(() => null), (b) => parseTextsInput(b, keys));
  if (input instanceof Response) return input;
  await env.DB.batch(planTextWrites(input, UZ, RU).map((w) => (w.uz === '' && w.ru === ''
    ? env.DB.prepare('DELETE FROM site_texts WHERE key = ?').bind(w.key)
    : env.DB.prepare('INSERT OR REPLACE INTO site_texts (key, uz, ru) VALUES (?, ?, ?)').bind(w.key, w.uz, w.ru))));
  return json({ values: await readSiteTexts(env) });
}
```

- [ ] **Step 7: `app/routes/api.admin.assets.tsx`.**
```tsx
import type { Route } from './+types/api.admin.assets';
import { json } from '../../functions/lib/db';
import { parseAssetsInput } from '../../functions/lib/validate';
import { readSiteAssets } from '../lib/loaders';
import { ASSET_FIELDS, type AssetsResponse } from '../../src/lib/site-content';
import { requireAdmin, parseBody } from './api.admin.guard';

/** Sayt rasm/videolari: registr maydonlari va yuklanganlari (`site_assets`); standartlar klientda (`ASSET_DEFAULTS`). */
export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const body: AssetsResponse = { fields: ASSET_FIELDS, values: await readSiteAssets(env) };
  return json(body);
}

/** `PUT` — kalit → yuklangan fayl yo'li; bo'sh qiymat qatorni o'chiradi (standartga qaytadi). */
export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  if (request.method !== 'PUT') return json({ error: 'method_not_allowed' }, { status: 405 });
  const input = parseBody(await request.json().catch(() => null), (b) => parseAssetsInput(b, ASSET_FIELDS));
  if (input instanceof Response) return input;
  await env.DB.batch(Object.entries(input).map(([key, url]) => (url === ''
    ? env.DB.prepare('DELETE FROM site_assets WHERE key = ?').bind(key)
    : env.DB.prepare('INSERT OR REPLACE INTO site_assets (key, url) VALUES (?, ?)').bind(key, url))));
  return json({ values: await readSiteAssets(env) });
}
```

- [ ] **Step 8: `app/routes.ts`** — `  route('api/admin/upload', 'routes/api.admin.upload.tsx'),` qatoridan keyin:
```ts
  route('api/admin/texts', 'routes/api.admin.texts.tsx'),
  route('api/admin/assets', 'routes/api.admin.assets.tsx'),
```

- [ ] **Step 9: `src/admin/errText.ts`** — `MESSAGES` obyektining oxiriga (`employment_invalid` qatoridan keyin):
```ts
  key_invalid: "Noma'lum maydon",
  text_too_long: 'Matn 2000 belgidan oshmasin',
```

- [ ] **Step 10: Tekshiruv.**
Run: `bun run lint && bun run test`
Expected: lint xatosiz (typegen yangi route'lar uchun `./+types/api.admin.texts` va `./+types/api.admin.assets`ni yaratadi); `Test Files 30 passed (30)`, `Tests 346 passed (346)`.

- [ ] **Step 11: Commit**
```bash
git add functions/lib/validate.ts functions/lib/validate.test.ts app/lib/loaders.ts app/routes/api.admin.texts.tsx app/routes/api.admin.assets.tsx app/routes.ts src/admin/errText.ts
git commit -m "feat(content): sayt matnlari va rasmlari uchun admin API, validatsiya va loader'lar

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 12 (controller, brauzer — egasi Browser panelida admin'ga kirgan):** `/admin` tabida:
```js
const g = await (await fetch('/api/admin/texts')).json();
const def = (k) => g.fields.find((f) => f.key === k).defaults;
const bad = await fetch('/api/admin/texts', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nope: { uz: 'x' } }) });
const put = await (await fetch('/api/admin/texts', { method: 'PUT', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ proTitle: { uz: 'Sinov shiori', ru: def('proTitle').ru }, newsTitle: { uz: def('newsTitle').uz, ru: '' } }) })).json();
const a = await (await fetch('/api/admin/assets')).json();
const badA = await fetch('/api/admin/assets', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ logo: 'https://evil.example/x.png' }) });
({ fields: g.fields.length, first: g.fields[0], bad: [bad.status, await bad.json()], put, assetFields: a.fields.length, badA: [badA.status, await badA.json()] })
```
Kutiladi: `fields` 94, `first.defaults.uz` «Apple»; noto'g'ri kalit — 400 `key_invalid`; `put.values` faqat `{ proTitle: { uz: 'Sinov shiori', ru: '' } }` (standartga teng ru va newsTitle yozilmadi); `assetFields` 26; begona URL — 400 `url_invalid`. Oxirida qaytarish: `PUT /api/admin/texts` `{ "proTitle": { "uz": "", "ru": "" } }` → `values` `{}`. Kirmagan holatda (`fetch(..., { credentials: 'omit' })`) — 401.

---

### Task 3: Saytda matn overlay'i, meta matnlari va `TermsBento` o'chirilishi

**Files:**
- Modify: `app/lib/seo.ts:48-66`, `app/lib/seo.test.ts:109-121`
- Modify: `app/routes/store.tsx`, `app/root.tsx`
- Modify (to'liq almashtirish): `app/routes/catalog.tsx`, `app/routes/deals.tsx`, `app/routes/brand.tsx`, `app/routes/vakansiyalar.tsx`, `app/routes/page.tsx`
- Modify: `app/routes/category.tsx` (importlar, loader, meta)
- Delete: `src/store/TermsBento.tsx`

**Interfaces:**
- Consumes: Task 1 — `textOverrides`, `Translation` (`termsLede`, `seoOpeningHours` kalitlari); Task 2 — `loadSiteTexts`, `loadT`.
- Produces:
  - `app/lib/seo.ts`: `interface OrgContact { address: string; openingHours: string }`; `organizationJsonLd(config: ApiSiteConfig | undefined, origin: string | undefined, contact: OrgContact)`.
  - Store layout loader data: `texts: TextOverrides` (joriy til), `orgContact: OrgContact` (Task 4 bu loader'ga `assets` qo'shadi).

- [ ] **Step 1: `seo.test.ts` — muvaffaqiyatsiz test.** 109–121-qatorlardagi `describe('organizationJsonLd manzil', …)` blokini almashtiring:
```ts
describe('organizationJsonLd manzil', () => {
  it("manzil va ish vaqti sayt matnlaridan, sayt URL'i kiradi", () => {
    const ld = organizationJsonLd(
      { name: 'ProDuct', phone: '+998', telegram: 't', instagram: 'i', mapLl: '69.27,41.33', mapLabel: 'eski yozuv' } as never,
      'https://product.uz',
      { address: "O'zbekiston, Toshkent shahar, Tong Yulduzi MFY, 30-uy", openingHours: 'Mo-Sa 09:00-20:00' },
    ) as {
      address: { streetAddress: string; addressLocality: string }; openingHours: string; url: string; geo: { latitude: number; longitude: number };
    };
    expect(ld.address.streetAddress).toBe("O'zbekiston, Toshkent shahar, Tong Yulduzi MFY, 30-uy");
    expect(ld.address.addressLocality).toBe('Toshkent');
    expect(ld.openingHours).toBe('Mo-Sa 09:00-20:00');
    expect(ld.url).toBe('https://product.uz');
    expect(ld.geo).toMatchObject({ latitude: 41.33, longitude: 69.27 });
  });
});
```
Run: `bunx vitest run app/lib/seo.test.ts`
Expected: FAIL — `streetAddress` hali `mapLabel`dan («eski yozuv»), `openingHours` qotirilgan.

- [ ] **Step 2: `seo.ts` — `organizationJsonLd`.** `export function organizationJsonLd(config?: ApiSiteConfig, origin?: string) {` qatorini va funksiya ichidagi manzil/ish vaqti qatorlarini o'zgartiring; funksiyadan oldin interfeys qo'shing:
```ts
/** JSON-LD uchun manzil va ish vaqti — sayt matnlaridan (store loader `orgContact`), admin'da tahrirlanadi. */
export interface OrgContact {
  address: string;
  openingHours: string;
}

export function organizationJsonLd(config: ApiSiteConfig | undefined, origin: string | undefined, contact: OrgContact) {
```
Funksiya ichida `streetAddress: config?.mapLabel ?? siteConfig.map.label,` → `streetAddress: contact.address,`; `// Ish vaqti footer'dagi \`footerTime\` bilan bir xil (Du-Yak 10:00-21:00).` izohi va `openingHours: 'Mo-Su 10:00-21:00',` qatori → `openingHours: contact.openingHours,` (izoh o'chadi). Qolgan qismi o'zgarmaydi.
Run: `bunx vitest run app/lib/seo.test.ts` → PASS.

- [ ] **Step 3: `app/routes/store.tsx`.** Import qatorlari:
```ts
import { Outlet, isRouteErrorResponse, redirect, useLoaderData, useLocation, useRouteError } from 'react-router';
import type { Route } from './+types/store';
import { resolveLocale, localeToLang, localizedPath, DEFAULT_LOCALE, type Locale } from '../lib/i18n';
import { loadSiteConfig, loadPages, loadCategories, loadConfig, hasDeals, publicSiteConfig, loadSiteTexts, type PageLink } from '../lib/loaders';
import type { OrgContact } from '../lib/seo';
import { CURRENCY_COOKIE, parseCurrency } from '../../src/lib/currency';
import { textOverrides } from '../../src/lib/site-content';
import { loadCustomer } from '../../functions/lib/db';
import { getCookie, verifySession } from '../../functions/lib/auth';
import type { ApiCustomer } from '../../shared/types';
import { translations, type Translation } from '../../src/locales';
import StoreLayout from '../../src/store/StoreLayout';
```
Loader'da `const [siteConfig, pages, categories, deals, settings] = await Promise.all([...]);` qatorini almashtiring:
```ts
  const [siteConfig, pages, categories, deals, settings, siteTexts] = await Promise.all([
    loadSiteConfig(env), loadPages(env), loadCategories(env), hasDeals(env), loadConfig(env), loadSiteTexts(env),
  ]);
```
`const currency = parseCurrency(…);` qatoridan keyin, `return`dan oldin:
```ts
  // Admin'da o'zgartirilgan matnlar — faqat joriy til va registr kalitlari; komponent ularni `locales.ts` ustiga qo'yadi.
  const texts = textOverrides(siteTexts, locale === 'ru' ? 'ru' : 'uz');
  const tt: Translation = { ...translations[localeToLang(locale)], ...texts };
  // Organization JSON-LD (root.tsx) manzili va ish vaqti — sayt matnlaridan.
  const orgContact: OrgContact = { address: `${tt.footerAddressText1} ${tt.footerAddressText2}`, openingHours: tt.seoOpeningHours };
```
`return { … }` ga `texts, orgContact,` qo'shing (`usdRate: settings.usdToUzs,` dan keyin). Komponentda:
```tsx
export default function StoreRoot() {
  const { locale, siteConfig, pageLinks, categories, customer, deals, currency, usdRate, texts } = useLoaderData<typeof loader>();
  const lang = localeToLang(locale);
  const t: Translation = { ...translations[lang], ...texts };
```
(`return (` va qolgan JSX o'zgarmaydi; `ErrorBoundary` o'zgarmaydi.)

- [ ] **Step 4: `app/root.tsx`.** Import: `import { hreflangLinks, organizationJsonLd, type OrgContact } from './lib/seo';`. `Layout` ichida:
```tsx
  const storeData = useRouteLoaderData('routes/store') as { locale?: Locale; siteConfig?: ApiSiteConfig; origin?: string; orgContact?: OrgContact } | undefined;
  const lang = htmlLang(storeData?.locale ?? DEFAULT_LOCALE);
  const location = useLocation();
  const orgContact = storeData?.orgContact;
  const jsonLd = storeData && orgContact
    ? JSON.stringify(organizationJsonLd(storeData.siteConfig, storeData.origin, orgContact)).replace(/</g, '\\u003c')
    : '';
```
JSX'da `<script type="application/ld+json" …/>` va uning ustidagi `{/* eslint-disable-next-line react/no-danger */}` izohi `{jsonLd && ( … )}` ichiga o'raladi:
```tsx
            {jsonLd && (
              <>
                {/* eslint-disable-next-line react/no-danger */}
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
              </>
            )}
```

- [ ] **Step 5: `app/routes/catalog.tsx`** — faylni to'liq almashtiring:
```tsx
import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/catalog';
import { resolveLocale } from '../lib/i18n';
import { pageTitle, catalogMeta, storeConfigFrom } from '../lib/seo';
import { siteConfig } from '../lib/site.config';
import { parseCatalogFilters } from '../lib/catalog';
import { queryProducts, loadConfig, loadBrands, loadT } from '../lib/loaders';
import type { StoreContext } from '../../src/store/StoreLayout';
import CatalogView from '../../src/store/CatalogView';

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  const env = context.env;
  const filters = parseCatalogFilters(new URL(request.url).searchParams);
  const [result, config, brands, t] = await Promise.all([queryProducts(env, filters), loadConfig(env), loadBrands(env), loadT(env, locale)]);
  // `meta()` bazaga kira olmaydi — admin'da tahrirlangan tavsif shabloni shu yerda olinadi.
  return { result, config, brands, filters, requestUrl: request.url, metaTitle: t.catalogAll, metaDesc: t.metaCatalogDesc };
}

export function meta({ data, matches }: Route.MetaArgs) {
  const sfx = storeConfigFrom(matches)?.seoTitleSuffix;
  if (!data) return [{ title: pageTitle(undefined, sfx) }];
  const desc = data.metaDesc.replace('{title}', data.metaTitle).replace('{store}', storeConfigFrom(matches)?.name ?? siteConfig.name);
  return catalogMeta(pageTitle(data.metaTitle, sfx), data.requestUrl, desc);
}

export default function CatalogRoute() {
  const { result, config, brands, filters } = useLoaderData<typeof loader>();
  const { t } = useOutletContext<StoreContext>();
  return <CatalogView t={t} title={t.catalogAll} result={result} config={config} brands={brands} filters={filters} />;
}
```

- [ ] **Step 6: `app/routes/deals.tsx`** — faylni to'liq almashtiring:
```tsx
import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/deals';
import { resolveLocale } from '../lib/i18n';
import { pageTitle, catalogMeta, storeConfigFrom } from '../lib/seo';
import { siteConfig } from '../lib/site.config';
import { parseCatalogFilters } from '../lib/catalog';
import { queryProducts, loadConfig, loadBrands, loadT } from '../lib/loaders';
import type { StoreContext } from '../../src/store/StoreLayout';
import CatalogView from '../../src/store/CatalogView';

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  const env = context.env;
  const filters = parseCatalogFilters(new URL(request.url).searchParams, { onlyDeals: true });
  const [result, config, brands, t] = await Promise.all([queryProducts(env, filters), loadConfig(env), loadBrands(env), loadT(env, locale)]);
  // `meta()` bazaga kira olmaydi — admin'da tahrirlangan tavsif shabloni shu yerda olinadi.
  return { result, config, brands, filters, requestUrl: request.url, metaTitle: t.dealsTitle, metaDesc: t.metaCatalogDesc };
}

export function meta({ data, matches }: Route.MetaArgs) {
  const sfx = storeConfigFrom(matches)?.seoTitleSuffix;
  if (!data) return [{ title: pageTitle(undefined, sfx) }];
  const desc = data.metaDesc.replace('{title}', data.metaTitle).replace('{store}', storeConfigFrom(matches)?.name ?? siteConfig.name);
  return catalogMeta(pageTitle(data.metaTitle, sfx), data.requestUrl, desc);
}

export default function DealsRoute() {
  const { result, config, brands, filters } = useLoaderData<typeof loader>();
  const { t } = useOutletContext<StoreContext>();
  return <CatalogView t={t} title={t.dealsTitle} result={result} config={config} brands={brands} filters={filters} />;
}
```

- [ ] **Step 7: `app/routes/brand.tsx`** — faylni to'liq almashtiring:
```tsx
import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/brand';
import { resolveLocale } from '../lib/i18n';
import { pageTitle, catalogMeta, storeConfigFrom } from '../lib/seo';
import { siteConfig } from '../lib/site.config';
import { parseCatalogFilters } from '../lib/catalog';
import { queryProducts, loadConfig, loadBrands, loadT } from '../lib/loaders';
import type { StoreContext } from '../../src/store/StoreLayout';
import CatalogView from '../../src/store/CatalogView';

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  const env = context.env;
  const brands = await loadBrands(env);
  const brand = brands.find((b) => b.slug === params.slug);
  if (!brand) throw new Response('Not Found', { status: 404 });
  const filters = parseCatalogFilters(new URL(request.url).searchParams);
  filters.brands = [brand.id];
  const [result, config, t] = await Promise.all([queryProducts(env, filters), loadConfig(env), loadT(env, locale)]);
  // `meta()` bazaga kira olmaydi — admin'da tahrirlangan tavsif shabloni shu yerda olinadi.
  return { result, config, brand, brands, filters, requestUrl: request.url, metaDesc: t.metaCatalogDesc };
}

export function meta({ data, matches }: Route.MetaArgs) {
  const sfx = storeConfigFrom(matches)?.seoTitleSuffix;
  if (!data) return [{ title: pageTitle(undefined, sfx) }];
  const desc = data.metaDesc.replace('{title}', data.brand.name).replace('{store}', storeConfigFrom(matches)?.name ?? siteConfig.name);
  return catalogMeta(pageTitle(data.brand.name, sfx), data.requestUrl, desc);
}

export default function BrandRoute() {
  const { result, config, brand, brands, filters } = useLoaderData<typeof loader>();
  const { t } = useOutletContext<StoreContext>();
  return <CatalogView t={t} title={brand.name} result={result} config={config} brands={brands} filters={filters} hideBrands />;
}
```

- [ ] **Step 8: `app/routes/vakansiyalar.tsx`** — faylni to'liq almashtiring:
```tsx
import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/vakansiyalar';
import { resolveLocale } from '../lib/i18n';
import { pageTitle, catalogMeta, storeConfigFrom } from '../lib/seo';
import { siteConfig } from '../lib/site.config';
import { loadVacancies, loadT } from '../lib/loaders';
import type { StoreContext } from '../../src/store/StoreLayout';
import CareersPage from '../../src/store/CareersPage';

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  const [vacancies, t] = await Promise.all([loadVacancies(context.env), loadT(context.env, locale)]);
  // `meta()` bazaga kira olmaydi — admin'da tahrirlangan tavsif shu yerda olinadi.
  return { vacancies, requestUrl: request.url, metaTitle: t.footerCareers, metaDesc: t.careersMetaDesc };
}

export function meta({ data, matches }: Route.MetaArgs) {
  const cfg = storeConfigFrom(matches);
  if (!data) return [{ title: pageTitle(undefined, cfg?.seoTitleSuffix) }];
  const desc = data.metaDesc.replace('{store}', cfg?.name ?? siteConfig.name);
  return catalogMeta(pageTitle(data.metaTitle, cfg?.seoTitleSuffix), data.requestUrl, desc);
}

export default function VakansiyalarRoute() {
  const { vacancies } = useLoaderData<typeof loader>();
  const { t, locale } = useOutletContext<StoreContext>();
  return <CareersPage t={t} locale={locale} vacancies={vacancies} />;
}
```

- [ ] **Step 9: `app/routes/category.tsx`.**
  - 3-qator: `import { resolveLocale, categoryLabel } from '../lib/i18n';` (`localeToLang` chiqadi).
  - 7-qator: `import { queryProducts, loadConfig, loadCategories, loadBrands, loadTypes, loadProductsBy, loadT } from '../lib/loaders';`
  - 9-qator `import { translations } from '../../src/locales';` o'chiriladi.
  - Loader'da:
```ts
  const [result, config, brands, types, t] = await Promise.all([
    queryProducts(env, filters), loadConfig(env), loadBrands(env), loadTypes(env), loadT(env, locale),
  ]);
```
  va `return { result, config, title, brands, filters, requestUrl: request.url, category, tiles, parts, metaDesc: t.metaCatalogDesc };` (`locale` loader data'dan chiqadi — uni faqat `meta()` o'qirdi).
  - `meta`:
```ts
export function meta({ data, matches }: Route.MetaArgs) {
  const sfx = storeConfigFrom(matches)?.seoTitleSuffix;
  if (!data) return [{ title: pageTitle(undefined, sfx) }];
  const desc = data.metaDesc.replace('{title}', data.title).replace('{store}', storeConfigFrom(matches)?.name ?? siteConfig.name);
  return catalogMeta(pageTitle(data.title, sfx), data.requestUrl, desc);
}
```
  (Komponent bu task'da o'zgarmaydi.)

- [ ] **Step 10: `app/routes/page.tsx`** — faylni to'liq almashtiring:
```tsx
import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/page';
import { loadPage, loadT } from '../lib/loaders';
import { resolveLocale, localeToTextKey } from '../lib/i18n';
import { pageTitle, storeConfigFrom } from '../lib/seo';
import { firstParagraph } from '../../src/lib/markdown';
import type { Translation } from '../../src/locales';
import Markdown from '../../src/store/Markdown';
import AboutPage from '../../src/store/AboutPage';
import LegalPage from '../../src/store/LegalPage';
import type { StoreContext } from '../../src/store/StoreLayout';

/** "Biz haqimizda" — markdown o'rniga maxsus sahifa (matn sayt matnlarida); sarlavha va footer havolasi bazadagi yozuvdan. */
const ABOUT_SLUG = 'biz-haqimizda';

/**
 * Huquqiy hujjatlar va "Shartlar" (`muddatli-tolov`) `LegalPage` shablonida — matn bazadan, hero izohi va meta
 * description sayt matnlaridan. "Shartlar" to'lov rejimidan qat'i nazar shu shablonda (2026-09-17: `TermsBento` olib tashlandi).
 */
function legalLede(t: Translation, slug: string): string | undefined {
  const ledes: Record<string, string | undefined> = {
    oferta: t.legalLedeOferta,
    maxfiylik: t.legalLedePrivacy,
    qaytarish: t.legalLedeReturns,
    'muddatli-tolov': t.termsLede,
  };
  return ledes[slug];
}

export async function loader({ params, context }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  const slug = String(params.slug);
  const [page, t] = await Promise.all([loadPage(context.env, slug), loadT(context.env, locale)]);
  if (!page) throw new Response('Not Found', { status: 404 });
  // `meta()` bazaga kira olmaydi — admin'da tahrirlangan izoh shu yerda olinadi.
  const lede = slug === ABOUT_SLUG ? t.aboutLede : legalLede(t, slug) ?? null;
  return { page, locale, lede };
}

export function meta({ data, matches }: Route.MetaArgs) {
  const sfx = storeConfigFrom(matches)?.seoTitleSuffix;
  if (!data) return [{ title: pageTitle(undefined, sfx) }];
  const key = localeToTextKey(data.locale);
  const desc = data.lede ?? firstParagraph(data.page.content[key]);
  return [
    { title: pageTitle(data.page.title[key], sfx) },
    ...(desc ? [{ name: 'description', content: desc }] : []),
  ];
}

export default function ContentPage() {
  const { page, locale } = useLoaderData<typeof loader>();
  const { config, t } = useOutletContext<StoreContext>();
  const key = localeToTextKey(locale);

  if (page.slug === ABOUT_SLUG) return <AboutPage t={t} config={config} title={page.title[key]} />;

  const lede = legalLede(t, page.slug);
  if (lede) return <LegalPage t={t} title={page.title[key]} lede={lede} source={page.content[key]} />;

  return (
    <div className="max-w-[760px] mx-auto px-4 py-10 md:py-14">
      <h1 className="text-heading md:text-title font-semibold text-primary mb-6">{page.title[key]}</h1>
      <Markdown source={page.content[key]} />
    </div>
  );
}
```

- [ ] **Step 11: `TermsBento` o'chiriladi.**
```bash
git rm src/store/TermsBento.tsx
grep -rn "TermsBento" app src
```
Expected: `grep` hech narsa topmaydi. Yana `grep -rn "translations" app/routes/catalog.tsx app/routes/deals.tsx app/routes/brand.tsx app/routes/category.tsx app/routes/vakansiyalar.tsx app/routes/page.tsx` — hech narsa.

- [ ] **Step 12: Tekshiruv.**
Run: `bun run lint && bun run test`
Expected: lint xatosiz; `Test Files 30 passed (30)`, `Tests 346 passed (346)`.

- [ ] **Step 13: Commit**
```bash
git add app/lib/seo.ts app/lib/seo.test.ts app/routes/store.tsx app/root.tsx app/routes/catalog.tsx app/routes/deals.tsx app/routes/brand.tsx app/routes/vakansiyalar.tsx app/routes/category.tsx app/routes/page.tsx
git commit -m "feat(content): saytda admin matnlari — layout overlay, meta matnlari loader'da, JSON-LD manzili; TermsBento o'chirildi

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 14 (controller, brauzer):** admin tabida sinov matnlari yoziladi:
```js
await fetch('/api/admin/texts', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
  proTitle: { uz: 'Sinov shiori', ru: '' },
  metaCatalogDesc: { uz: 'SINOV {title} — {store}', ru: '' },
  aboutLede: { uz: 'Sinov: biz haqimizda izohi', ru: '' },
  termsLede: { uz: 'Sinov: shartlar izohi', ru: '' },
  footerAddressText2: { uz: 'Sinov ko\'chasi 1-uy', ru: '' },
}) });
```
Keyin tekshiriladi (proxy keshi dev'da yo'q): `/category/pc` — sarlavha davomi «Sinov shiori», `<meta name="description">` «SINOV PC — …»; `/ru/category/pc` — rus standartlari; `/katalog`, `/chegirmalar`, `/brand/<slug>` description «SINOV …»; `/page/biz-haqimizda` — hero izohi va description sinov matni; `/page/muddatli-tolov` — `LegalPage` (mundarija, hero izohi «Sinov: shartlar izohi»); footer manzili «Sinov ko'chasi 1-uy»; JSON-LD (`script[type="application/ld+json"]`) `streetAddress` shu manzil bilan, `openingHours` «Mo-Su 10:00-21:00»; `/vakansiyalar` description o'zgarmagan (standart). Konsolda yangi xato yo'q. Oxirida qaytarish — beshala kalit `{ "uz": "", "ru": "" }` bilan `PUT`, sahifalar standartga qaytadi.

---

### Task 4: Saytda rasm/videolar, landing kartalari va WhatsApp tugmasi

**Files:**
- Create: `src/store/SiteAssets.tsx`
- Modify (to'liq almashtirish): `src/store/hero-columns.ts`, `src/store/PageHero.tsx`, `src/store/ContactFab.tsx`
- Test: `src/store/hero-columns.test.ts`
- Modify: `src/store/HeroColumns.tsx:7,80-81,105`, `app/routes/category.tsx` (importlar, komponent), `src/store/StoreLayout.tsx`, `app/routes/store.tsx`, `app/root.tsx`
- Modify: `src/store/Header.tsx:11-12,68,279,281`, `src/store/HeroNotch.tsx:10,28,76`, `src/store/LoginPanel.tsx:5-6,29,48-49`, `src/store/ConsultForm.tsx:10,45,103`, `src/store/AboutPage.tsx:7,44,68,103,120`, `src/store/CareersPage.tsx:12,59,71,89,105`

**Interfaces:**
- Consumes: Task 1 — `AssetKey`, `SiteAssets`, `Translation` (`heroApple`…`heroVideo`); Task 2 — `loadSiteAssets`; Task 3 — store loader (`texts`, `orgContact`) va `root.tsx` cast tipi.
- Produces:
  - `src/store/SiteAssets.tsx`: `ASSET_DEFAULTS: Record<AssetKey, string>`; `SiteAssetsProvider: FC<{ assets: SiteAssets; children: ReactNode }>`; `useAssets(): (key: AssetKey) => string` (admin'da yuklangani, bo'lmasa standart; standart bo'sh bo'lishi mumkin — masalan PC videosi).
  - `src/store/hero-columns.ts`: `interface HeroColumn { key; label; primary; img: string; videos: string[]; poster: string; match: string[] }`; `heroColumns(t: Translation, asset: (key: AssetKey) => string): HeroColumn[]`; `columnHref(col, categories)`; `columnForCategory(columns: HeroColumn[], category: ApiCategory): HeroColumn | null`.
  - `StoreLayout` propi `assets: SiteAssets`; store loader data `assets`.

- [ ] **Step 1: `src/store/hero-columns.test.ts` — muvaffaqiyatsiz test.**
```ts
import { describe, expect, it } from 'vitest';
import type { ApiCategory } from '../../shared/types';
import { translations } from '../locales';
import type { AssetKey } from '../lib/site-content';
import { columnForCategory, columnHref, heroColumns } from './hero-columns';

const t = { ...translations["O'zbek tili"], heroPc: 'Kompyuterlar\nva noutbuklar' };
const uploaded: Partial<Record<AssetKey, string>> = {
  'hero.apple.image': '/a.webp',
  'hero.apple.video1': '/a1.mp4',
  'hero.pc.image': '/pc.webp',
  'hero.pc.video2': '/pc2.mp4',
};
const asset = (key: AssetKey) => uploaded[key] ?? '';
const cat = (id: string): ApiCategory => ({
  id, name: id, nameRu: '', iconUrl: '', icon: '', coverUrl: '', coverLede: '', coverLedeRu: '', sortOrder: 0,
});

describe('heroColumns', () => {
  it("4 ta yo'nalish qat'iy tartibda, nom sayt matnidan", () => {
    const cols = heroColumns(t, asset);
    expect(cols.map((c) => c.key)).toEqual(['apple', 'pc', 'audio', 'video']);
    expect(cols[0].label).toBe(translations["O'zbek tili"].heroApple);
    expect(cols[1].label).toBe('Kompyuterlar\nva noutbuklar');
  });
  it("rasm va poster asset'dan, bo'sh videolar tashlanadi", () => {
    const [apple, pc, audio] = heroColumns(t, asset);
    expect(apple.img).toBe('/a.webp');
    expect(apple.videos).toEqual(['/a1.mp4']);
    expect(pc.videos).toEqual(['/pc2.mp4']);
    expect(audio.videos).toEqual([]);
    expect(audio.poster).toBe('');
  });
});

describe('columnForCategory / columnHref', () => {
  const cols = heroColumns(t, asset);
  it("kategoriya id'si bo'yicha o'z ustunini topadi", () => {
    expect(columnForCategory(cols, cat('audio'))?.key).toBe('audio');
    expect(columnForCategory(cols, cat('aksessuar'))).toBeNull();
  });
  it("mos kategoriya bo'lmasa katalogga olib boradi", () => {
    expect(columnHref(cols[0], [cat('apple')])).toBe('/category/apple');
    expect(columnHref(cols[0], [])).toBe('/katalog');
  });
});
```
Run: `bunx vitest run src/store/hero-columns.test.ts`
Expected: FAIL — `heroColumns` eksport qilinmagan.

- [ ] **Step 2: `src/store/hero-columns.ts`** — faylni to'liq almashtiring:
```ts
import type { ApiCategory } from '../../shared/types';
import type { Translation } from '../locales';
import type { AssetKey } from '../lib/site-content';

export interface HeroColumn {
  key: string;
  /** Kartadagi sarlavha; `\n` qatorga bo'ladi (whitespace-pre-line). */
  label: string;
  /** Cover shu kategoriyada ko'rsatiladi (yo'nalish id'si). */
  primary: string;
  img: string;
  /** Cover'da rasm o'rniga ketma-ket aylanadigan videolar; bo'sh — cover'da rasm turadi. */
  videos: string[];
  /** Video birinchi kadri — qora chaqnashsiz boshlansin; bo'sh — `img`. */
  poster: string;
  /**
   * Qaysi kategoriyaga ulanadi — id yoki nom (kichik harfda). Migratsiya 0025'dan
   * keyin kategoriya = yo'nalish, shuning uchun bitta id yetadi; nom o'zgarsa ham
   * id o'zgarmaydi. Topilmasa link `/katalog`ga tushadi.
   */
  match: string[];
}

const IDS = ['apple', 'pc', 'audio', 'video'] as const;

/**
 * Landingning 4 yo'nalish kartasi — soni va id'lari kodda qat'iy (spec §2). Nomlar sayt matnlaridan (`hero*`),
 * rasm, poster va 2 ta video `asset` orqali: admin'da yuklangani yoki koddagi standart (`ASSET_DEFAULTS`).
 */
export function heroColumns(t: Translation, asset: (key: AssetKey) => string): HeroColumn[] {
  const labels: Record<(typeof IDS)[number], string> = { apple: t.heroApple, pc: t.heroPc, audio: t.heroAudio, video: t.heroVideo };
  return IDS.map((id) => ({
    key: id,
    label: labels[id],
    primary: id,
    match: [id],
    img: asset(`hero.${id}.image`),
    poster: asset(`hero.${id}.poster`),
    videos: [asset(`hero.${id}.video1`), asset(`hero.${id}.video2`)].filter((v) => v !== ''),
  }));
}

function matches(col: HeroColumn, c: ApiCategory): boolean {
  return col.match.includes(c.id.toLowerCase()) || col.match.includes(c.name.toLowerCase());
}

/** Ustun uchun lokalsiz yo'l — mos kategoriya topilmasa umumiy katalog. */
export function columnHref(col: HeroColumn, categories: ApiCategory[]): string {
  const hit = categories.find((c) => matches(col, c));
  return hit ? `/category/${hit.id}` : '/katalog';
}

/** Teskari qidiruv — kategoriya sahifasi o'z hero ustunini (cover uchun) topadi. */
export function columnForCategory(columns: HeroColumn[], category: ApiCategory): HeroColumn | null {
  return columns.find((col) => matches(col, category)) ?? null;
}
```
Run: `bunx vitest run src/store/hero-columns.test.ts` → PASS (4 test).

- [ ] **Step 3: `src/store/SiteAssets.tsx`.**
```tsx
import { createContext, useContext } from 'react';
import type { FC, ReactNode } from 'react';
import type { AssetKey, SiteAssets } from '../lib/site-content';
import logo from '../assets/logo.svg';
import logoDark from '../assets/hero/wordmark.webp';
import heroApple from '../assets/hero/apple.webp';
import heroPc from '../assets/hero/pc.webp';
import heroAudio from '../assets/hero/audio.webp';
import heroVideo from '../assets/hero/video.webp';
import appleVideo1 from '../assets/apple/cover-1.mp4';
import appleVideo2 from '../assets/apple/cover-2.mp4';
import applePoster from '../assets/apple/cover-poster.jpg';
import consultImage from '../assets/consult.webp';

/**
 * Koddagi standart rasm/videolar (spec §6 jadvali) — admin'da yuklanmagan kalit shularni oladi. Bo'sh qiymat —
 * standart yo'q (masalan PC/Audio/Video videolari): yuklanmaguncha o'sha joy chizilmaydi.
 */
export const ASSET_DEFAULTS: Record<AssetKey, string> = {
  logo,
  logoDark,
  favicon: '/favicon.svg',
  'hero.apple.image': heroApple,
  'hero.apple.poster': applePoster,
  'hero.apple.video1': appleVideo1,
  'hero.apple.video2': appleVideo2,
  'hero.pc.image': heroPc,
  'hero.pc.poster': '',
  'hero.pc.video1': '',
  'hero.pc.video2': '',
  'hero.audio.image': heroAudio,
  'hero.audio.poster': '',
  'hero.audio.video1': '',
  'hero.audio.video2': '',
  'hero.video.image': heroVideo,
  'hero.video.poster': '',
  'hero.video.video1': '',
  'hero.video.video2': '',
  'consult.image': consultImage,
  'about.hero': '/about/hero.webp',
  'about.experts': '/about/experts.webp',
  'about.delivery': '/about/delivery.webp',
  'about.news': '/about/news.webp',
  'careers.work': '/careers/work.webp',
  'careers.life': '/careers/life.webp',
};

// react tipsiz — `createContext<T>` generigi tushib qoladi; qiymat cast bilan tiplanadi.
const AssetsCtx = createContext({} as SiteAssets);

/** Store layout admin'da yuklangan rasm/videolarni (`site_assets`) shu orqali beradi. */
export const SiteAssetsProvider: FC<{ assets: SiteAssets; children: ReactNode }> = ({ assets, children }) => (
  <AssetsCtx.Provider value={assets}>{children}</AssetsCtx.Provider>
);

/** `const asset = useAssets(); asset('logo')` — admin'da yuklangani, bo'lmasa koddagi standart. */
export function useAssets(): (key: AssetKey) => string {
  const assets = useContext(AssetsCtx) as SiteAssets;
  return (key) => assets[key] || ASSET_DEFAULTS[key];
}
```

- [ ] **Step 4: `src/store/HeroColumns.tsx`.**
  - 7-qator → `import { columnHref, heroColumns, type HeroColumn } from './hero-columns';` va undan keyin `import { useAssets } from './SiteAssets';`.
  - `export default function HeroColumns(...)` ichida `const { locale } = useOutletContext<StoreContext>();` qatorini almashtiring:
```tsx
  const { locale, t } = useOutletContext<StoreContext>();
  const asset = useAssets();
  const columns = heroColumns(t, asset);
```
  - 105-qator `{HERO_COLUMNS.map((col, i) => (` → `{columns.map((col, i) => (`.

- [ ] **Step 5: `app/routes/category.tsx` — komponent.**
  - Importlar: `import { columnForCategory } from '../../src/store/hero-columns';` → `import { columnForCategory, heroColumns } from '../../src/store/hero-columns';` va undan keyin `import { useAssets } from '../../src/store/SiteAssets';`.
  - Komponentda `const ctx = useOutletContext<StoreContext>();` dan `const cover = …;` gacha bo'lgan blok:
```tsx
  const ctx = useOutletContext<StoreContext>();
  const asset = useAssets();
  // Cover — avval kategoriyaning o'z rasmi (admin → Kategoriyalar). Bo'lmasa landing ustuni, lekin faqat
  // o'zinikida: landing kartalari yo'nalishlar uchun, boshqa kategoriyada ularning rasmi yolg'on gapiradi.
  const col = columnForCategory(heroColumns(ctx.t, asset), category);
  const isOwnColumn = col !== null && col.primary === category.id;
  const own = category.coverUrl ? { img: category.coverUrl } : null;
  const base = own ?? (isOwnColumn ? { img: col.img } : null);
  // Video — yo'nalishning o'z san'ati (admin → Kontent → Bosh sahifa), shuning uchun kategoriya rasmi bo'lsa ham
  // u poster bo'lib qoladi, harakat esa videodan keladi.
  const cover = base && isOwnColumn && col.videos.length > 0
    ? { ...base, videos: col.videos, poster: col.poster || undefined }
    : base;
```
  (JSX o'zgarmaydi; `\`HERO_COLUMNS\`da emas` izohi → `landing kartalarida emas`.)

- [ ] **Step 6: `src/store/StoreLayout.tsx`.**
  - Importlarga: `import type { SiteAssets } from '../lib/site-content';` va `import { SiteAssetsProvider } from './SiteAssets';`.
  - Props: destrukturizatsiyaga `assets,` (`usdRate,` dan keyin) va tipga `assets: SiteAssets;` (`usdRate: number;` dan keyin).
  - `return (` ichidagi eng tashqi `<CartProvider>` … `</CartProvider>` `<SiteAssetsProvider assets={assets}>` … `</SiteAssetsProvider>` bilan o'raladi (`header` o'zgaruvchisi provider ichida chiziladi — `useAssets` Header ichida ishlaydi).

- [ ] **Step 7: `app/routes/store.tsx`.**
  - Loaders importiga `loadSiteAssets` qo'shing.
  - `Promise.all`:
```ts
  const [siteConfig, pages, categories, deals, settings, siteTexts, assets] = await Promise.all([
    loadSiteConfig(env), loadPages(env), loadCategories(env), hasDeals(env), loadConfig(env), loadSiteTexts(env), loadSiteAssets(env),
  ]);
```
  - `return`ga `assets,` (`orgContact,` dan keyin).
  - Komponent: destrukturizatsiyaga `assets` va `<StoreLayout … usdRate={usdRate} assets={assets}>`.

- [ ] **Step 8: `app/root.tsx` — favicon.**
  - Importga: `import type { SiteAssets } from '../src/lib/site-content';`.
  - Cast tipiga `assets?: SiteAssets;` qo'shing.
  - `const jsonLd = …` dan keyin: `const favicon = storeData?.assets?.favicon || '/favicon.svg';`
  - `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` → `<link rel="icon" href={favicon} type={favicon.endsWith('.svg') ? 'image/svg+xml' : undefined} />`

- [ ] **Step 9: logotiplar va rasmlar komponentlarda.** Har faylda import qo'shiladi: `import { useAssets } from './SiteAssets';`; hook komponent tanasining **birinchi** qatori: `const asset = useAssets();`.
  - `src/store/Header.tsx`: 11–12-qatorlar (`import logo …`, `import logoDark …`) o'chadi, o'rniga `useAssets` importi; `}) {` (68-qator) dan keyin `const asset = useAssets();` (`const [q, setQ] = useState('');` dan oldin); 279-qator `src={logo}` → `src={asset('logo')}`; 281-qator `src={logoDark}` → `src={asset('logoDark')}`.
  - `src/store/HeroNotch.tsx`: 10-qator (`import wordmark …`) → `useAssets` importi; `const [hover, setHover] = useState(false);` dan oldin `const asset = useAssets();`; 76-qator `src={wordmark}` → `src={asset('logoDark')}`.
  - `src/store/LoginPanel.tsx`: 5–6-qatorlar → `useAssets` importi; `const tgRef = useRef<HTMLDivElement>(null);` dan oldin `const asset = useAssets();`; 48-qator `src={logo}` → `src={asset('logo')}`; 49-qator `src={logoDark}` → `src={asset('logoDark')}`.
  - `src/store/ConsultForm.tsx`: 10-qator (`import consultArt …`) → `useAssets` importi; `const topics = [` dan oldin `const asset = useAssets();`; 103-qator `src={consultArt}` → `src={asset('consult.image')}`.
  - `src/store/AboutPage.tsx`: `import PageHero from './PageHero';` dan keyin `useAssets` importi; `const mapHref = …` dan oldin `const asset = useAssets();`; `src="/about/experts.webp"` → `src={asset('about.experts')}`; `src="/about/delivery.webp"` → `src={asset('about.delivery')}`; `src="/about/news.webp"` → `src={asset('about.news')}`.
  - `src/store/CareersPage.tsx`: 12-qator (`import wordmark …`) → `useAssets` importi; `const applying = applyingRaw as Applying;` dan keyin `const asset = useAssets();`; `src={wordmark}` → `src={asset('logoDark')}`; `src="/careers/work.webp"` → `src={asset('careers.work')}`; `src="/careers/life.webp"` → `src={asset('careers.life')}`.

- [ ] **Step 10: `src/store/PageHero.tsx`** — faylni to'liq almashtiring:
```tsx
import type { FC } from 'react';
import { useAssets } from './SiteAssets';

/**
 * Gradientli sahifa hero'si (apple.com Legal naqshi) — "Biz haqimizda" va huquqiy hujjatlar.
 * Fon egasining `bg_us` rasmi (standart `public/about/hero.webp`, admin'da almashtiriladi); qorong'i mavzuda
 * `dark-invert` uni to'q moviyga aylantiradi, shuning uchun matn oddiy tokenlar bilan ikkala mavzuda o'qiladi.
 * Mobilda ko'k chiziq matn ortidan o'tmasligi uchun kadr suriladi: baland hero'da `0%` (chiziq
 * burchakda), past hero'da rasm kichikroq masshtablanadi va `0%`da chiziq izoh ustiga tushardi — `85%`.
 * `compact` — hujjat sahifalari uchun past variant: o'quvchi matnga tezroq yetadi.
 */
const PageHero: FC<{ title: string; lede: string; compact?: boolean }> = ({ title, lede, compact }) => {
  const asset = useAssets();
  return (
    <section
      className={`shell-box relative isolate mt-4 flex items-center justify-center overflow-hidden rounded-xl px-6 text-center ${
        compact ? 'min-h-[240px] py-12 md:min-h-[320px]' : 'min-h-[360px] py-16 md:min-h-[480px]'
      }`}
    >
      <img
        src={asset('about.hero')}
        alt=""
        fetchPriority="high"
        className={`dark-invert absolute inset-0 -z-10 h-full w-full object-cover md:object-[35%_50%] ${compact ? 'object-[85%_50%]' : 'object-[0%_50%]'}`}
      />
      <div className="max-w-[760px]">
        <h1 className="text-heading font-semibold text-balance text-primary md:text-display">{title}</h1>
        <p className="mt-4 text-copy text-balance text-body md:mt-5 md:text-lede">{lede}</p>
      </div>
    </section>
  );
};

export default PageHero;
```

- [ ] **Step 11: `src/store/ContactFab.tsx`** — faylni to'liq almashtiring (WhatsApp — spec §7):
```tsx
import { useState } from 'react';
import type { FC } from 'react';
import { Phone, Send, MessageCircle, X } from 'lucide-react';
import type { Translation } from '../locales';
import type { ApiSiteConfig } from '../../shared/types';
import { safeHref } from '../lib/safe-href';
import { ymGoal } from '../lib/metrica';

/** Mobil suzuvchi aloqa tugmasi — bu bozorda mijozlarning katta qismi forma emas,
 * qo'ng'iroq/Telegram/WhatsApp'ni afzal ko'radi. Desktopda header/footer kontaktlari yetarli.
 * WhatsApp — faqat admin'da havola kiritilgan bo'lsa (`config.whatsapp`). */
const ContactFab: FC<{ t: Translation; config: ApiSiteConfig }> = ({ t, config }) => {
  const [open, setOpen] = useState(false);
  const tgHref = safeHref(config.telegram);
  const waHref = safeHref(config.whatsapp);
  if (!config.phone && !tgHref && !waHref) return null;

  return (
    <div className="md:hidden fixed bottom-5 right-4 z-40 flex flex-col items-end gap-2.5">
      {open && (
        <>
          <div className="fixed inset-0 -z-10" onClick={() => setOpen(false)} />
          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => ymGoal(config.yandexMetricaId, 'contact_whatsapp')}
              className=" press flex items-center gap-2 bg-surface border border-line-2 rounded-full pl-4 pr-1.5 py-1.5 text-label font-semibold text-primary"
            >
              WhatsApp
              <span className="w-9 h-9 rounded-full bg-[#25D366] text-white flex items-center justify-center"><MessageCircle className="w-4 h-4" /></span>
            </a>
          )}
          {tgHref && (
            <a
              href={tgHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => ymGoal(config.yandexMetricaId, 'contact_telegram')}
              className=" press flex items-center gap-2 bg-surface border border-line-2 rounded-full pl-4 pr-1.5 py-1.5 text-label font-semibold text-primary"
            >
              {t.orderContactTg}
              <span className="w-9 h-9 rounded-full bg-accent text-bg flex items-center justify-center"><Send className="w-4 h-4" /></span>
            </a>
          )}
          {config.phone && (
            <a
              href={`tel:${config.phone}`}
              onClick={() => ymGoal(config.yandexMetricaId, 'contact_call')}
              className=" press flex items-center gap-2 bg-surface border border-line-2 rounded-full pl-4 pr-1.5 py-1.5 text-label font-semibold text-primary"
            >
              {config.phoneDisplay || config.phone}
              <span className="w-9 h-9 rounded-full bg-trust text-bg flex items-center justify-center"><Phone className="w-4 h-4" /></span>
            </a>
          )}
        </>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t.footerContact}
        aria-expanded={open}
        className=" press w-13 h-13 min-w-[52px] min-h-[52px] rounded-full bg-accent text-bg flex items-center justify-center active:scale-95 transition-transform"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>
    </div>
  );
};

export default ContactFab;
```

- [ ] **Step 12: Tekshiruv.**
Run: `bun run lint && bun run test`
Expected: lint xatosiz; `Test Files 31 passed (31)`, `Tests 350 passed (350)`.
Run: `grep -rnE "HERO_COLUMNS|assets/hero/wordmark|assets/logo\.svg|assets/consult\.webp|/about/(hero|experts|delivery|news)\.webp|/careers/(work|life)\.webp" src app | grep -v -e "src/store/SiteAssets.tsx" -e "src/admin/"`
Expected: hech narsa (standartlar faqat `SiteAssets.tsx`da; admin o'z logolarini saqlaydi).

- [ ] **Step 13: Commit**
```bash
git add src/store/SiteAssets.tsx src/store/hero-columns.ts src/store/hero-columns.test.ts src/store/HeroColumns.tsx app/routes/category.tsx src/store/StoreLayout.tsx app/routes/store.tsx app/root.tsx src/store/Header.tsx src/store/HeroNotch.tsx src/store/LoginPanel.tsx src/store/ConsultForm.tsx src/store/PageHero.tsx src/store/AboutPage.tsx src/store/CareersPage.tsx src/store/ContactFab.tsx
git commit -m "feat(content): saytda admin rasm/videolari — SiteAssets context, heroColumns, favicon; mobil WhatsApp tugmasi

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 14 (controller, brauzer):** avval hech narsa yuklanmagan holatda landing, `/category/apple` (video aylanadi), `/category/pc`, `/page/biz-haqimizda`, `/vakansiyalar`, `/kirish`, header logosi (yorug' va qorong'i mavzu) — hammasi avvalgidek. Keyin admin tabida kichik PNG yasab yuklanadi va uchta kalitga yoziladi:
```js
const c = Object.assign(document.createElement('canvas'), { width: 64, height: 64 });
const g = c.getContext('2d'); g.fillStyle = '#e00'; g.fillRect(0, 0, 64, 64);
const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
const fd = new FormData(); fd.append('file', new File([blob], 'sinov.png', { type: 'image/png' }));
const { imageUrl } = await (await fetch('/api/admin/upload', { method: 'POST', body: fd })).json();
await fetch('/api/admin/assets', { method: 'PUT', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ 'hero.pc.image': imageUrl, logo: imageUrl, favicon: imageUrl }) });
imageUrl
```
Tekshiriladi: landing PC kartasi va `/category/pc` cover'i qizil kvadrat; yorug' mavzuda header logosi qizil kvadrat; `<link rel="icon">` `href` shu yo'l, `type` yo'q. Mobil 375px'da `site_config.whatsapp` bo'lsa aloqa tugmasida WhatsApp (bo'lmasa — admin Sozlamalar'da vaqtincha `https://wa.me/998000000000` yozib ko'rish va qaytarish). Oxirida `PUT /api/admin/assets` `{ "hero.pc.image": "", "logo": "", "favicon": "" }` va yuklangan faylni lokal diskdan o'chirish (`data/images/products/<nom>.png`).

---

### Task 5: Video yuklash, Range va hujjat

**Files:**
- Modify: `server/images.ts:15-22`, `server/env.ts`, `server/index.ts`, `app/routes/api.admin.upload.tsx`, `deploy/nginx.conf:21-22`, `src/admin/errText.ts`
- Modify: `CLAUDE.md`, `docs/superpowers/specs/2026-09-15-admin-redesign-design.md`

**Interfaces:**
- Consumes: mavjud `openImageStore`, `createEnv`, `requireAdmin`, `json`.
- Produces: `server/env.ts` `export const IMAGES_DIR: string`; `POST /api/admin/upload` `video/mp4` (≤ 40 MB) qabul qiladi, javob `{ imageUrl }` o'zgarmaydi; `GET /images/products/*` — `express.static` (Range, ETag, `Cache-Control: public, max-age=31536000, immutable`).

- [ ] **Step 1: `server/images.ts`** — `MIME` obyektiga `mp4: 'video/mp4',` qo'shing (`svg` qatoridan keyin) va fayl boshidagi izohdagi «rasm ombori» → «rasm va video ombori».

- [ ] **Step 2: `server/env.ts`** — faylni to'liq almashtiring:
```ts
import { openDatabase } from './sqlite.ts';
import { openImageStore } from './images.ts';
import type { Env } from '../shared/runtime';

const DATA_DIR = process.env.DATA_DIR ?? 'data';

/** Yuklangan rasm va videolar papkasi — `createEnv` va `server/index.ts`dagi statik `/images/products` shu yerdan. */
export const IMAGES_DIR = process.env.IMAGES_DIR ?? `${DATA_DIR}/images`;

/**
 * Ilova muhiti — loaderlarga `context.env` sifatida uzatiladi.
 *
 * Bindinglar o'rniga oddiy sozlamalar: baza fayli va rasm papkasi. Ikkalasi ham
 * `DATA_DIR` ostida, ya'ni zaxira nusxa olish bitta papkani nusxalash demak.
 */
export function createEnv(): Env {
  return {
    DB: openDatabase(process.env.DATABASE_PATH ?? `${DATA_DIR}/store.db`),
    IMAGES: openImageStore(IMAGES_DIR),
  };
}
```

- [ ] **Step 3: `server/index.ts`.**
  - Importlar: `import { join } from 'node:path';` (`import express from 'express';` dan oldin) va `import { createEnv } from './env.ts';` → `import { createEnv, IMAGES_DIR } from './env.ts';`.
  - Kesh middleware'idan keyin (`app.use((req, res, next) => { if (req.method !== 'GET') … });` blokidan keyin), `if (isProd) {` dan oldin:
```ts
// Yuklangan rasm va videolar diskdan to'g'ridan-to'g'ri: Range va ETag Express'dan (Safari `<video>` Range'siz
// o'ynamaydi). Fayl bo'lmasa keyingi qatlamga o'tadi — `images.$` route'i 404 beradi.
app.use('/images/products', express.static(join(IMAGES_DIR, 'products'), { immutable: true, maxAge: '1y', index: false, redirect: false }));
```

- [ ] **Step 4: `app/routes/api.admin.upload.tsx`** — faylni to'liq almashtiring:
```tsx
import type { Route } from './+types/api.admin.upload';
import { json } from '../../functions/lib/db';
import { requireAdmin } from './api.admin.guard';

const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
};

const MB = 1024 * 1024;
/** Rasm 5 MB gacha; video (yo'nalish cover'i) 40 MB gacha — spec §6. */
const maxSize = (type: string) => (type === 'video/mp4' ? 40 * MB : 5 * MB);

function isFile(obj: unknown): obj is { type: string; size: number; arrayBuffer(): Promise<ArrayBuffer> } {
  return typeof obj === 'object' && obj !== null && 'arrayBuffer' in obj;
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;

  // formData() butun body'ni xotiraga buferlaydi — undan OLDIN qo'pol chegara
  // (40 MB video + multipart overhead uchun zaxira).
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > 42 * MB) return json({ error: 'file_too_large' }, { status: 413 });

  const form = await request.formData();
  const file = form.get('file');
  if (!isFile(file)) return json({ error: 'file_required' }, { status: 400 });
  const ext = ALLOWED[file.type];
  if (!ext) return json({ error: 'unsupported_type' }, { status: 400 });
  if (file.size > maxSize(file.type)) return json({ error: 'file_too_large' }, { status: 400 });

  const key = `products/${crypto.randomUUID()}.${ext}`;
  await env.IMAGES.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });
  return json({ imageUrl: `/images/${key}` }, { status: 201 });
}
```

- [ ] **Step 5: `deploy/nginx.conf`** — 21–22-qatorlar:
```nginx
    # Yuklash chegarasi (app rasmni 5 MB, videoni 40 MB gacha tekshiradi, bu esa unga zaxira)
    client_max_body_size 45m;
```

- [ ] **Step 6: `src/admin/errText.ts`** — `MESSAGES` oxiriga (`text_too_long` qatoridan keyin):
```ts
  file_required: 'Fayl tanlanmagan',
  unsupported_type: 'Faqat JPG, PNG, WebP rasm yoki MP4 video',
  file_too_large: 'Fayl juda katta: rasm 5 MB, video 40 MB gacha',
```

- [ ] **Step 7: Tekshiruv va commit (kod).**
Run: `bun run lint && bun run test`
Expected: lint xatosiz; `Test Files 31 passed (31)`, `Tests 350 passed (350)`.
```bash
git add server/images.ts server/env.ts server/index.ts app/routes/api.admin.upload.tsx deploy/nginx.conf src/admin/errText.ts
git commit -m "feat(content): MP4 video yuklash (40 MB), /images/products Range bilan statik

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 8: `CLAUDE.md`** — aniq almashtirishlar (Edit, eski matn aynan; har biri faylda bir marta uchraydi):
  1. Eski:
```text
`muddatli-tolov` slug'i `TermsBento`ni **faqat `payment_mode !== 'cash'`** bo'lsa chizadi, naqd rejimda bazadagi matn;
```
  Yangi:
```text
`muddatli-tolov` slug'i ("Shartlar") huquqiy hujjatlar kabi `LegalPage` shablonida, hamma to'lov rejimida (2026-09-17, `TermsBento` o'chirildi);
```
  2. Eski: `` **huquqiy hujjatlar** (2026-09-15) — `oferta`, `maxfiylik`, `qaytarish` slug'lari `LegalPage` shablonida `` → Yangi: `` **huquqiy hujjatlar** (2026-09-15) — `oferta`, `maxfiylik`, `qaytarish` (2026-09-17'dan `muddatli-tolov` ham) slug'lari `LegalPage` shablonida ``
  3. Eski: `` shuning uchun `HERO_COLUMNS`da emas `locales.ts`da turadi `` → Yangi: `` shuning uchun landing kartalarida emas, sayt matnida (`proTitle`) turadi ``
  4. Eski: `` A category id matching a `HERO_COLUMNS` key is what gives every direction page its own cover art `` → Yangi: `` A category id matching a `heroColumns()` key (`apple`/`pc`/`audio`/`video`) is what gives every direction page its own cover art ``
  5. Eski: `` The 4 `HERO_COLUMNS` stay **landing artwork** `` → Yangi: `` The 4 `heroColumns()` stay **landing artwork** ``
  6. Eski:
```text
**Video cover:** `HERO_COLUMNS` yozuvida `videos?: string[]` + `poster?` bo'lsa (hozircha faqat `apple`), cover rasm o'rniga shu videolarni **ketma-ket** aylantiradi — biri tugagach `onEnded` keyingisiga o'tadi, oxirgisidan keyin yana birinchisiga.
```
  Yangi:
```text
**Video cover:** `heroColumns(t, asset)` ustunida `videos` bo'lsa (standart — faqat `apple`; admin'da har yo'nalishga 2 tagacha MP4, `site_assets` `hero.<id>.video1/2`), cover rasm o'rniga shu videolarni **ketma-ket** aylantiradi — biri tugagach `onEnded` keyingisiga o'tadi, oxirgisidan keyin yana birinchisiga.
```
  7. Eski: `` Fayllar `src/assets/apple/` da (Vite bundle qiladi, `immutable` kesh bilan chiqadi). `` → Yangi: `` Standart fayllar `src/assets/apple/` da (Vite bundle qiladi, `immutable` kesh bilan chiqadi); yuklanganlari `/images/products/*.mp4` — `server/index.ts`dagi `express.static` Range bilan beradi (Safari). ``
  8. Eski: `` `TermsBento` faqat muddatli rejimda chiziladi. `` → Yangi: `` `TermsBento` 2026-09-17'da o'chirildi — "Shartlar" ham `LegalPage`da. ``
  9. Eski: `` `contact_call`, `contact_telegram` `` → Yangi: `` `contact_call`, `contact_telegram`, `contact_whatsapp` ``
  10. Eski: `` `ContactFab` (mobil suzuvchi qo'ng'iroq/TG tugmasi, `md:hidden`) `` → Yangi: `` `ContactFab` (mobil suzuvchi qo'ng'iroq/Telegram/WhatsApp tugmasi, `md:hidden`; WhatsApp — `config.whatsapp` bo'lsa) ``
  11. Eski: `` `upload` (diskdagi `ImageStore`) `` → Yangi: `` `upload` (diskdagi `ImageStore`; rasm JPG/PNG/WebP ≤ 5 MB, video MP4 ≤ 40 MB, javob doim `{ imageUrl }`) ``
  12. Eski: `` Product images `.webp`, uploaded via admin to `DATA_DIR/images`, served at `/images/...` `` → Yangi: `` Product images `.webp`, uploaded via admin to `DATA_DIR/images` (`IMAGES_DIR`, `server/env.ts`), served at `/images/products/...` by `express.static` (Range/ETag, `immutable`; missing files fall through to `images.$`) ``
  13. Eski: `` `getLoadContext` → `{ env, billz, ip }`; `` → Yangi: `` `getLoadContext` → `{ env, billz, ip }`; `/images/products` — `express.static` (video uchun Range); ``
  14. Eski: `1-, 2a-, 2b- va 3-bosqich bajarildi)` → Yangi: `1-, 2a-, 2b-, 3-bosqich va 4a — kontent mexanizmi bajarildi)`
  15. Eski: `` `site_texts`/`site_assets` — 4-bosqich; `` → Yangi: `` `site_texts`/`site_assets` — sayt matnlari va rasmlari (4a'dan saytda o'qiladi); ``
  16. `### Billz sinxronizatsiyasi (2026-09, faqat o'qish)` sarlavhasidan **oldin** yangi bo'lim (ortidan bo'sh qator):
```markdown
### Sayt matnlari va rasmlari (2026-09-17, admin qayta qurilishi 4a)
Marketing qatlami kodga qotirilmaydi: **matnlarning** standarti `locales.ts`da, admin'da o'zgartirilgani `site_texts`da (`key`, `uz`, `ru`; bo'sh til — standart); **rasm/videolarning** standarti `ASSET_DEFAULTS`da (`src/store/SiteAssets.tsx`), yuklangani `site_assets`da (`key` → `/images/products/…`). Qaysi kalit tahrirlanadi — **registr** `src/lib/site-content.ts`: `TEXT_FIELDS` (`key` — `Translation` kaliti, `group` — admin sahifasi, `section` — admin kartasi, `label`/`kind`/`hint`) va `ASSET_KEYS`/`ASSET_FIELDS` (`kind: image | video`). Matnni tahrirlanadigan qilish = registrga qator; `locales.ts`dan kalit o'chsa lint registrni ham yiqitadi.
- **API** (`requireAdmin` + `parseBody`): `GET/PUT /api/admin/texts` (`parseTextsInput` — faqat registr kalitlari, har til ≤ 2000 belgi; `planTextWrites` standartga teng tilni bo'sh saqlaydi, ikkala til bo'sh — qator o'chadi) va `GET/PUT /api/admin/assets` (`parseAssetsInput` — faqat `/images/products/<nom>.<webp|png|jpg|mp4>`, video kalitiga faqat `.mp4`; bo'sh — standartga qaytadi). Admin o'qishi `readSiteTexts`/`readSiteAssets` (xato yuqoriga), sayt o'qishi `loadSiteTexts`/`loadSiteAssets` (xato → `{}`).
- **Sayt:** store layout loader'i faqat joriy tilning o'zgarishlarini (`textOverrides`) yuboradi, komponent `{ ...translations[lang], ...texts }` qiladi — `t` kontekst orqali hamma komponentga o'zi yetadi. **`meta()` bazaga kira olmaydi:** registr kalitini meta'da ishlatadigan route'lar (`catalog`, `deals`, `brand`, `category`, `vakansiyalar`, `page`) matnni loader'da `loadT(env, locale)` bilan oladi va loader data'sida qaytaradi — `meta()`da registr kalitini `translations`dan o'qimang. Rasm/videolar `StoreLayout`dagi `SiteAssetsProvider` orqali: komponentda `const asset = useAssets(); asset('logo')`. Landing kartalari — sof `heroColumns(t, asset)` (`src/store/hero-columns.ts`: nomlar `t.hero*`, rasm/poster/2 video `hero.<id>.*`). Organization JSON-LD manzili va ish vaqti store loader'ining `orgContact`idan (`footerAddressText1/2`, `seoOpeningHours`; `site_config.map_label` saytda ishlatilmaydi), favicon `site_assets.favicon`dan.
- Admin ekranlari (landing muharriri, Sahifalar, Sozlamalar) — 4b va 5-bosqich.
```

- [ ] **Step 9: Spec** (`docs/superpowers/specs/2026-09-15-admin-redesign-design.md`):
  - Eski: `` `{ key, group, label, kind: 'text' | 'textarea', hint? }`. Guruhlar va kalitlar: `` → Yangi: `` `{ key, group, section, label, kind: 'text' | 'textarea', hint? }` (`section` — admin kartasining sarlavhasi). Guruhlar va kalitlar: ``
  - `## 8. Xavfsizlik va kesh` sarlavhasidan oldin (bo'sh qator bilan) yangi xatboshi:
```markdown
4a qarorlari (2026-09-17): `loadT` ishlatadigan route'lar — `catalog`, `deals`, `brand`, `category`, `vakansiyalar`, `page`
(`home`, `product`, `blog` `meta()`da registr kalitini o'qimaydi); rasm/videolar store layout'da React context bilan
(`SiteAssetsProvider` / `useAssets`, standartlar `ASSET_DEFAULTS`); JSON-LD manzili va ish vaqti store loader'ida
(`orgContact`), root bundle'iga `locales.ts` qo'shilmaydi; `termsLede` standarti neytral («Buyurtma, to'lov va yetkazib
berish shartlari.») — sahifa har rejimda chiqadi; konsultatsiya mavzularini yashirish yo'q (§2 «chip soni qat'iy» va §6
«bo'sh = standart» ustun); `PUT /api/admin/texts` standartga teng tilni bo'sh saqlaydi.
```

- [ ] **Step 10: Commit (hujjat)**
```bash
git add CLAUDE.md docs/superpowers/specs/2026-09-15-admin-redesign-design.md
git commit -m "docs: CLAUDE.md va spec — 4a: sayt matnlari va rasmlari mexanizmi

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 11 (controller, brauzer):** dev server qayta ishga tushiriladi (`server/index.ts` va `server/env.ts` o'zgardi — `preview_stop` + `preview_start`). Admin tabida:
```js
const blob = await (await fetch('/src/assets/apple/cover-1.mp4')).blob();
const fd = new FormData(); fd.append('file', new File([blob], 'cover.mp4', { type: 'video/mp4' }));
const up = await fetch('/api/admin/upload', { method: 'POST', body: fd });
const { imageUrl } = await up.json();
const part = await fetch(imageUrl, { headers: { Range: 'bytes=0-99' } });
const svg = new FormData(); svg.append('file', new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' }));
const bad = await fetch('/api/admin/upload', { method: 'POST', body: svg });
await fetch('/api/admin/assets', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ 'hero.pc.video1': imageUrl }) });
({ status: up.status, imageUrl, range: part.status, contentRange: part.headers.get('content-range'), type: part.headers.get('content-type'), bytes: (await part.arrayBuffer()).byteLength, svg: [bad.status, await bad.json()] })
```
Kutiladi: 201; Range — 206, `bytes 0-99/760821`, `video/mp4`, 100 bayt; SVG — 400 `unsupported_type`. `/category/pc` cover'ida video aylanadi (`document.querySelector('video')?.src` shu yo'l bilan tugaydi), rasm poster bo'lib turadi; `/images/products/yoq.webp` — 404. Oxirida `PUT /api/admin/assets` `{ "hero.pc.video1": "" }` va yuklangan `.mp4` lokal diskdan o'chiriladi.

---

## O'z-o'zini tekshirish (reja yozilgandan keyin)

- **Spec qamrovi:** §6 matn registri (7 guruh, kalitlar ro'yxati aynan) va rasm/video registri (26 kalit, standartlar jadvali) — T1/T4; §6 API (`texts`, `assets`; `types`, `dashboard` 1–2a'da bor; upload `video/mp4` 40 MB) — T2/T5; `parseTextsInput`/`parseAssetsInput`, yangi xato kodlari — T2 (`icon_required` 2a'da bor); §7 `t` overlay, `loadT`, `meta()` qoidasi — T3; `assets` layout kontekstida, `heroColumns(t, assets)`, `columnHref`/`columnForCategory` — T4; `BrandStrip` va turlar — 2a'da bajarilgan; `TermsBento` o'chirish va `muddatli-tolov` `LegalPage`da, `termsLede` — T3; `ContactFab` WhatsApp — T4; `seo.ts` manzil/ish vaqti — T3; `/images/*` Range — T5; `locales.ts` yangi kalitlari — T1. §8 xavfsizlik — T2/T5. §9 test — `mergeTexts` (T1), parserlar (T2). Admin ekranlari (§5 Kontent, landing muharriri, Sahifalar, "Sahifa matni", Uploader `kind: video`) — 4b rejasi.
- **Tiplar izchilligi:** `SiteTexts`/`SiteAssets`/`TextOverrides` (T1) ↔ loader'lar (T2) ↔ store loader va `StoreLayout` (T3/T4); `AssetKey` ↔ `ASSET_DEFAULTS: Record<AssetKey, string>` (kalit yetishmasa lint yiqiladi) ↔ `heroColumns` shablon kalitlari; `OrgContact` (T3) ↔ `root.tsx`; `parseAssetsInput(fields)` ↔ `ASSET_FIELDS` (`key: AssetKey`, `kind`).
- **Test sonlari:** T1 +8 (30 fayl / 337), T2 +9 (346), T3 o'zgarmaydi (seo testi almashtirildi), T4 +4 (31 fayl / 350), T5 o'zgarmaydi.
- **Placeholder:** yo'q — har kod qadami to'liq kod yoki aniq eski → yangi matn bilan.

## Natija va qoldiqlar (bajarilgandan keyin, 2026-09-17)

Bajarildi: `feat/admin-4a` branch'ida 7 commit (`5ded7b3..d8ddc74`) — 5 task, har biri alohida review va brauzer tekshiruvi
(tuzatish raundlarisiz); yakuniy butun-branch review (fable) — "merge'ga tayyor", 0 jiddiy, 8 mayda izoh; to'rttasi bitta
to'lqinda tuzatildi (JSON-LD ko'cha manzili, video tavsiyasi, CLAUDE.md va spec aniqlashtirishlari), qayta review toza. Lint 0,
31 fayl / 350 test. Brauzerda egasi kirgan holda tekshirildi: admin API (94 matn va 26 rasm maydoni; noto'g'ri kalit va begona
URL rad etiladi; standartga teng matn saqlanmaydi; kirmagan so'rov 401); sinov matnlari bilan kategoriya, katalog, chegirma va
brend tavsiflari, "Biz haqimizda" va "Shartlar" hero izohlari, footer va JSON-LD manzili, rus sahifalari standartda; sinov rasmi
bilan favicon, yorug' logo, landing PC kartasi va cover'i; mobil WhatsApp tugmasi; MP4 yuklash, Range 206, SVG rad etilishi,
PC cover'ida video o'ynashi. Sinov yozuvlari va yuklangan fayllar oxirida o'chirildi.

Reja matnidan farqlar (ledger ruling'lari): grep kutilmalari izohlarni hisobga olmagan — `page.tsx` va `PageHero.tsx`
izohlaridagi eslatmalar qoldirildi; JSON-LD `streetAddress` faqat manzilning 2-qatori (spec §7 formulasi davlat va shaharni
takrorlardi — spec yangilandi); `VIDEO_HINT`ga hajm va davomiylik tavsiyasi qo'shildi; CLAUDE.md'ga yuklash chegaralari va
Traefik eslatmasi.

Qoldiqlar:

- **4b rejasiga (admin kontent ekranlari):** landing muharriri, Sahifalar ("Biz haqimizda" strukturali forma, huquqiy
  izohlar), bannerlar/yangiliklar/blog/vakansiyalar kit bilan va "Sahifa matni" kartasi; `api.ts`da
  `getTexts`/`saveTexts`/`getAssets`/`saveAssets`; favicon yuklashda WebP'ga o'girmaslik (Safari WebP favicon'ni
  ko'rsatmaydi); `kind: video` uploader (normalizatsiyasiz, hajm tavsiyasi ko'rinadi); `site_assets` kaliti almashganda eski
  faylni diskdan o'chirish (40 MB'lik videolar yig'ilmasin); `url_invalid` xabarini "Fayl yo'li noto'g'ri"ga umumlashtirish.
- **5-bosqich (Sozlamalar):** registrning `store`, `contact`, `seo` guruhlari va logo/favicon; `SiteConfigForm`dan
  `mapLabel` maydoni olib tashlanadi.
- **6-bosqich (tozalash):** bare-metal `deploy/nginx.conf`ga proxy keshisiz `location /images/`; registrdan chiqarilgan
  `site_texts` qatorlarini tozalash (API ularni o'chira olmaydi); yuklash route'ida `content-length`siz (chunked) so'rov 42 MB
  oldindan tekshiruvdan o'tib ketadi (faqat admin).
- **Mayda (qoldirildi):** `locales.ts` ru blokidagi takroriy izoh; layout va olti route'da `site_texts` ikki marta o'qiladi
  (`loadT` ponytail izohi); `method_not_allowed` xabarsiz.
- **Deploy kuni tekshiruv:** push'dan keyin `site_texts`/`site_assets` bo'sh holda sayt avvalgidek (landing, yo'nalish
  cover'lari, Apple videosi, "Biz haqimizda", vakansiyalar, favicon); `/page/muddatli-tolov` endi mundarijali shablonda;
  mobil aloqa tugmasida WhatsApp; admin orqali 35–40 MB'lik haqiqiy MP4'ni Coolify/Traefik zanjiri bilan bir marta yuklab
  ko'rish (lokal 760 KB bilan sinalgan).
