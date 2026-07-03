# 7-bo'lak — SEO & performance polish — Design Spec

**Sana:** 2026-07-03
**Status:** Approved (foydalanuvchi "davom et qolgan vazifalarda")
**Bo'lak:** Platforma qayta qurishning 7-bo'lagi (6-bo'lak home kompozitsiyasi TUGADI)

---

## 1. Maqsad

SEO'ni boyitish (Product/Breadcrumb JSON-LD, D1-boshqariladigan title/description), oldingi bo'laklardan qolgan perf/UX/a11y backlog'ini yopish. Sitemap/hreflang/Organization JSON-LD allaqachon bor — tegilmaydi.

## 2. Boy JSON-LD — mahsulot sahifasi

- `app/lib/seo.ts`ga pure helperlar (TDD, yangi `app/lib/seo.test.ts`):
  - `productJsonLd(p: ProductDetail, url: string, suffixBrand?: string)` → `{'@type':'Product', name, image: p.images, description?, brand: {'@type':'Brand', name}?, offers: {'@type':'Offer', price: p.minPriceUzs, priceCurrency: 'UZS', availability: InStock|OutOfStock, url}}`. Availability: variantsiz mahsulot yoki kamida bitta `inStock` variant → `https://schema.org/InStock`, aks holda `OutOfStock`.
  - `breadcrumbJsonLd(items: {name: string; url: string}[])` → `BreadcrumbList` (position 1'dan).
- `app/routes/product.tsx` meta: title (mavjud) + `description` (`conditionNote ?? description birinchi qatori`, ≤160) + ikkita `'script:ld+json'` yozuvi (Product, Breadcrumb: Bosh sahifa → kategoriya → mahsulot; URLlar locale-prefiksli absolute emas — path yetarli).

## 3. Title suffiksi va description D1'dan (rebrand deploy'siz)

- `pageTitle(title?, suffix?)` — ikkinchi parametr; default statik qoladi.
- `storeConfigFrom(matches: unknown): ApiSiteConfig | undefined` (seo.ts) — RR v7 `meta({ matches })`dan `routes/store` loader'ining `siteConfig`ini duck-typing bilan topadi (2b'da store loader uni qaytaradi).
- Barcha 9 storefront route metasi (`home, category, search, cart, catalog, brand, deals, page, product`) `pageTitle(x, storeConfigFrom(matches)?.seoTitleSuffix)` ishlatadi; home description `storeConfigFrom(matches)?.seoDescription ?? siteConfig.seo.description`.
- `firstParagraph` (markdown.ts) ul-fallback: paragraf bo'lmasa birinchi ro'yxat elementining matni (2b final-review backlog). TDD.

## 4. Performance

- Home featured grid: to'liq `products` o'rniga **12 ta** — `loadStore(env, { limit? })` ixtiyoriy LIMIT (SQLda), home loader `limit: 12` beradi; sitemap/boshqa chaqiruvlar limitisiz qoladi (to'liq ro'yxat kerak). Grid ostiga "Hammasi" → `/katalog` `LocaleLink` (t.railAll qayta ishlatiladi).
- Rasm lazy-loading allaqachon bor; qo'shimcha pipeline YO'Q.

## 5. Footer/site polish (2b backlog)

- Bo'sh social link (`config.telegram === ''` va h.k.) va bo'sh telefon renderdan tushiriladi (hozir `@` + `href=""` chiqadi).
- Xarita iframe `title={config.mapLabel || 'Store location'}` (hardcoded matn o'rniga; `mapLabel` nihoyat ishlatiladi).

## 6. Admin polish (2b backlog)

- `src/admin/errText.ts`: server xato kodlari → o'zbekcha xabarlar xaritasi (`link_invalid`, `slug_invalid`, `slug_taken`, `title_uz/ru/en/uzCyrl_required`, `name_required`, `phone_required`, `imageUrl_required`, default: kod o'zi). Formalar (`BannerForm`, `PageForm`, `SiteConfigForm`) catch'da `errText(e)` ko'rsatadi.
- `PageForm` klient validatsiyasi: submit'dan oldin slug (`/^[a-z0-9-]+$/`) va 4 title bo'sh emasligi tekshiriladi, aniq o'zbekcha xabar. `SiteConfigForm`: name/phone bo'sh bo'lsa xabar.
- `BannerList`/`PageList` `refresh()` catch: xato holatida "Yuklashda xatolik (migratsiya qo'llanganmi?)" matni (abadiy "Yuklanmoqda…" o'rniga).

## 7. a11y

- Mobil filtr sheet (`CatalogView`): `role="dialog"` + `aria-modal="true"` + `aria-label`, **Escape** yopadi, ochilganda yopish tugmasiga focus. (Slider dot a11y 6-bo'lakda tuzatilgan.)

## 8. Chegaralar (YO'Q)

FAQPage/ItemList/Review JSON-LD, rasm optimizatsiya pipeline, service worker, Lighthouse CI, focus-trap kutubxonasi (oddiy Escape+focus yetarli), admin formalarning to'liq i18n'i (admin Uzbek-only).

## 9. Testlar

`app/lib/seo.test.ts` (yangi): productJsonLd (variantli in/out-of-stock, variantsiz, brend bor/yo'q), breadcrumbJsonLd (positionlar), pageTitle suffix parametri, storeConfigFrom (topadi/topmaydi). `src/lib/markdown.test.ts`: firstParagraph ul-fallback. Mavjud 77 buzilmaydi.
