# 2b-bo'lak — Kontent & Config (banner, kontent sahifalar, site_config) — Design Spec

**Sana:** 2026-07-03
**Status:** Approved (foydalanuvchi "davom et qolgan vazifalarda" — tavsiya variantlar bilan)
**Bo'lak:** Platforma qayta qurishning 2b-bo'lagi (2a mahsulot modeli, 3 katalog, 4 variant UI, 5 savat TUGADI)

---

## 1. Maqsad va tanlovlar

Har bir do'kon **kod tegmasdan** o'z banner-slaydlarini, kontent sahifalarini (FAQ, shartlar, biz haqimizda, kontakt) va sayt ma'lumotlarini (nom, telefon, ijtimoiy tarmoqlar, SEO) admin orqali boshqaradi.

Qabul qilingan tanlovlar:
- **Aksiya = banner + chegirma.** Alohida aksiya-entity YO'Q — chegirma `old_price_uzs` orqali, `/chegirmalar` allaqachon ishlaydi. Bannerlar admin boshqaradigan slaydlar (home kompozitsiyasi 6-bo'lakda ulanadi; bu bo'lak model+admin+loader beradi).
- **Universal `pages` jadvali** — slug + 4 tilda sarlavha/matn (markdown-lite), admin CRUD, seed: `faq`, `muddatli-tolov`, `biz-haqimizda`, `kontakt`.
- **site_config D1'da** (bitta qator, `settings` patterni), admin "Sozlamalar" tabida tahrirlanadi; `app/lib/site.config.ts` statik fallback bo'lib qoladi (D1 bo'sh/xato → statik qiymatlar).

## 2. Data model — `migrations/0005_content_config.sql` (yangi fayl)

- `banners`: `id TEXT PK`, `image_url TEXT NOT NULL`, `link_url TEXT NOT NULL DEFAULT ''`, `alt_text TEXT NOT NULL DEFAULT ''`, `sort_order INTEGER NOT NULL DEFAULT 0`, `is_active INTEGER NOT NULL DEFAULT 1`. (Sarlavha rasm dizayni ichida — matn ustma-ust qo'yilmaydi, MVP.)
- `pages`: `id TEXT PK`, `slug TEXT NOT NULL UNIQUE`, `title_uz/title_ru/title_en/title_cyrl TEXT NOT NULL`, `content_uz/content_ru/content_en/content_cyrl TEXT NOT NULL` (markdown-lite), `sort_order INTEGER NOT NULL DEFAULT 0`, `is_active INTEGER NOT NULL DEFAULT 1`.
- `site_config`: `id INTEGER PK CHECK (id=1)`, `name`, `phone`, `phone_display`, `telegram`, `instagram`, `whatsapp`, `map_ll`, `map_label`, `seo_title_suffix`, `seo_description`, `og_image` — hammasi `TEXT NOT NULL`. Seed = hozirgi `siteConfig` qiymatlari.
- Seed: 4 sahifa (faq/muddatli-tolov/biz-haqimizda/kontakt) 4 tilda qisqa boshlang'ich matn bilan (NAMUNA, admin almashtiradi).

## 3. API kontrakt — `shared/types.ts`

- `LocalizedText = { uz: string; ru: string; en: string; uzCyrl: string }` + `app/lib/i18n.ts`da `localeToTextKey(locale): keyof LocalizedText`.
- `ApiBanner { id, imageUrl, linkUrl, altText, sortOrder, isActive }`.
- `ApiPage { id, slug, title: LocalizedText, content: LocalizedText, sortOrder, isActive }`.
- `ApiSiteConfig { name, phone, phoneDisplay, telegram, instagram, whatsapp, mapLl, mapLabel, seoTitleSuffix, seoDescription, ogImage }`.

## 4. Backend — validate + db + admin routes

- `functions/lib/validate.ts`: `parseBannerInput` (imageUrl bo'sh emas), `parsePageInput` (slug `[a-z0-9-]+`, 4 title bo'sh emas; content bo'sh bo'lishi mumkin), `parseSiteConfigInput` (name/phone bo'sh emas, qolganlari string) → `ValidationError` → 400. Testlar `functions/lib/validate.test.ts`ga qo'shiladi.
- `functions/lib/db.ts`: `rowToBanner/rowToPage/rowToSiteConfig` mapperlar.
- Admin routes (hammasi `requireAdmin`): `api.admin.banners.tsx` (GET/POST), `api.admin.banners.$id.tsx` (PUT/DELETE), `api.admin.pages.tsx` (GET/POST), `api.admin.pages.$id.tsx` (PUT/DELETE), `api.admin.site-config.tsx` (GET/PUT — UPSERT id=1).
- Public resource route YO'Q (YAGNI) — storefront SSR loader'lar D1'ni to'g'ridan-to'g'ri o'qiydi.

## 5. Markdown-lite — `src/lib/markdown.ts` (pure, TDD)

`renderMarkdown(src): MdBlock[]` — `MdBlock = {type:'h2'|'h3'|'p'|'ul', text?, items?}`; inline: `**qalin**` → `{bold}` segmentlar, `[matn](url)` → link segmentlar. XSS xavfsiz: HTML string emas, strukturaviy bloklar qaytadi, React o'zi escape qiladi. `src/store/Markdown.tsx` bloklarni render qiladi.

## 6. Storefront

- `app/lib/loaders.ts`: `loadBanners(env)` (faol, sort bo'yicha; xato → `[]`), `loadPages(env)` (faol, footer linklari uchun slug+title), `loadPage(env, slug)` (topilmasa null), `loadSiteConfig(env)` (D1 qator → ApiSiteConfig; xato/bo'sh → statik `siteConfig`dan hosil qilingan qiymat).
- Yangi route: `page/:slug` + `:lang/page/:slug` → loader (`loadPage` + `resolveLocale`; topilmasa 404), `meta` (lokalizatsiya qilingan title + description = kontentning birinchi paragrafi, indekslanadi), `PageView` komponenti (sarlavha + Markdown).
- `store.tsx` loader `loadSiteConfig` + `loadPages` qo'shadi → `StoreLayout` orqali `Header`/`Footer`ga prop. Footer: kontakt/karta qiymatlari propdan (statik import o'rniga), pastki qatorda sahifa linklari (`footerPrivacy/footerTerms` statik spanlar o'rniga haqiqiy `LocaleLink`lar).
- `root.tsx` / `seo.ts`: `organizationJsonLd(config?)` config-parametrli bo'ladi; root Layout store loader qaytargan config bilan chaqiradi (fallback statik). `pageTitle` suffiksi **bu bo'lakda statik qoladi** (har route meta'siga D1 o'qish qo'shmaslik uchun — 7-bo'lak SEO polishda ko'rib chiqiladi).
- `sitemap[.]xml.tsx`: faol sahifalar barcha locale'larda qo'shiladi.

## 7. Admin UI (`src/admin/`)

- Yangi tablar: **Bannerlar** (`BannerList` — jadval: rasm preview, link, tartib, faol toggle; forma: R2 upload qayta ishlatiladi) va **Sahifalar** (`PageList` + `PageForm` — slug, 4×sarlavha input, 4×kontent textarea, tartib, faol).
- **Sozlamalar** tabi ikki bo'lim: mavjud kalkulyator + yangi "Sayt ma'lumotlari" (`SiteConfigForm`).
- `src/admin/api.ts`: banner/page/siteConfig CRUD funksiyalari.

## 8. i18n

Yangi kalitlar (4 tilda): `pagesTitle` kerak emas — sahifa sarlavhasi DB'dan; footer uchun maxsus kalit talab qilinmaydi (linklar DB title'dan). Faqat `pageNotFound` ishlatilmaydi (404 mavjud). Yangi kalit minimal: yo'q bo'lsa qo'shilmaydi.

## 9. Chegaralar (YO'Q)

Aksiya-entity/muddatli aksiyalar, WYSIWYG editor (oddiy textarea + markdown-lite), banner jadval-sahifa navigatsiyasi (home'da ko'rsatish — 6-bo'lak), sahifalarni o'chirishda tarix, media kutubxona.

## 10. Testlar

`src/lib/markdown.test.ts` (yangi, TDD: h2/h3/p/ul, bold, link, aralash, bo'sh matn), `functions/lib/validate.test.ts`ga banner/page/site_config parserlar. Mavjud 56 test buzilmaydi.
