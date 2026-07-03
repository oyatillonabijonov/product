# 6-bo'lak — Home kompozitsiyasi (banner slider, rail'lar, brend chizig'i) — Design Spec

**Sana:** 2026-07-03
**Status:** Approved (foydalanuvchi "davom et qolgan vazifalarda")
**Bo'lak:** Platforma qayta qurishning 6-bo'lagi (2b kontent & config TUGADI — banner modeli tayyor)

---

## 1. Maqsad

Home sahifasi konversion vitrinaga aylanadi: admin boshqaradigan **banner slaydlar** (2b `banners` jadvalidan), **chegirma** va **yangi mahsulot rail'lari**, **brend chizig'i**. Hozirgi bloklar (TrustBar, kategoriya doiralari, featured grid, HowItWorks) saqlanadi. Skin (8-bo'lak) faqat vizualni o'zgartiradi.

## 2. Banner slider

- `loadBanners(env)` (2b'da bor) home loader'iga qo'shiladi. Bannerlar **bo'lsa** — statik `HeroBanner` O'RNIDA `BannerSlider`; **bo'sh bo'lsa** — mavjud `HeroBanner` fallback qoladi (dev/migratsiyasiz rejim ham shu).
- `BannerSlider` (`src/store/BannerSlider.tsx`): CSS scroll-snap karusel (`overflow-x-auto snap-x snap-mandatory`), har slayd to'liq kenglik, `aspect-[21/9] md:aspect-[3/1]` rasm (`object-cover`, birinchisi eager, qolganlari `loading="lazy"`), pastda nuqta-indikatorlar (bosilsa scrollIntoView). Auto-play YO'Q (MVP; motion minimal).
- **linkUrl xavfsizligi:** `safeHref(url)` pure helper (`src/lib/safe-href.ts`, TDD) — faqat `/`, `http://`, `https://` bilan boshlangan URL o'tadi, aks holda `null` (slayd link bo'lmaydi). Ichki (`/...`) link `localizedPath(locale, url)` bilan `Link`; tashqi — `<a target="_blank" rel="noopener noreferrer">`. Server tomonda ham `parseBannerInput` `linkUrl`ni tekshiradi: `''` yoki safe-prefiks, aks holda `ValidationError('link_invalid')` (final-review backlog talabi).

## 3. Rail'lar — `ProductRail`

- `src/store/ProductRail.tsx`: `FC<{ t; title; items: Product[]; config; moreTo: string }>` — sarlavha + o'ngda "Hammasi →" `LocaleLink`; gorizontal scroll-snap qator (`flex overflow-x-auto snap-x gap-4 no-scrollbar`), har karta `w-[220px] md:w-[260px] shrink-0 snap-start`da mavjud `ProductCard` qayta ishlatiladi. `items.length === 0` → null.
- Ma'lumot: `loadRail(env, kind: 'deals' | 'latest', limit = 8)` (`app/lib/loaders.ts`):
  - `deals`: `WHERE is_active = 1 AND old_price_uzs IS NOT NULL AND old_price_uzs > cash_price_uzs ORDER BY sort_order ASC LIMIT ?` (katalogdagi `onlyDeals` sharti bilan bir xil);
  - `latest`: `WHERE is_active = 1 ORDER BY created_at DESC LIMIT ?` (katalog `yangi` sort bilan bir xil);
  - fallback: `fallbackProducts`dan xuddi shu mantiq bilan filtr/slice.
- Home'da ikkita rail: **Chegirmadagi mahsulotlar** → `/chegirmalar`; **Yangi kelganlar** → `/katalog?sort=yangi`.

## 4. Brend chizig'i — `BrandStrip`

`src/store/BrandStrip.tsx`: `loadBrands` natijasi; gorizontal qator, har brend — oq karta (logo bo'lsa `img`, bo'lmasa nom matni), `LocaleLink` → `/brand/:slug`. Bo'sh ro'yxat → null.

## 5. Home tartibi (yangi kompozitsiya)

BannerSlider|HeroBanner → TrustBar → Kategoriyalar → **Chegirma rail** → **Yangi rail** → **BrandStrip** → Featured grid (`homeFeatured`, qoladi) → HowItWorks. Loader: `Promise.all([loadStore, loadCategories, loadBanners, loadRail(deals), loadRail(latest), loadBrands])`.

## 6. i18n — 4 tilda yangi kalitlar

`railDeals` ("Chegirmadagi mahsulotlar"), `railNew` ("Yangi kelganlar"), `railAll` ("Hammasi"), `homeBrands` ("Brendlar").

## 7. Chegaralar (YO'Q)

Auto-play/interval, banner scheduling (muddat), per-kategoriya rail'lar, admin orqali rail konfiguratsiyasi, personalizatsiya, infinite scroll.

## 8. Testlar

`src/lib/safe-href.test.ts` (TDD: `/`, https, http o'tadi; `javascript:`, `data:`, bo'sh, `mailto:` → null); `functions/lib/validate.test.ts`ga `parseBannerInput` linkUrl testlari (bo'sh OK, `/katalog` OK, `javascript:` → `link_invalid`). Mavjud 73 test buzilmaydi.
