# 4-bo'lak — Mahsulot tajribasi (variant UI) — Design Spec

**Sana:** 2026-07-02
**Status:** Approved (brainstorm)
**Bo'lak:** Platforma qayta qurishning 4-bo'lagi (2a variant modeli va 3-bo'lak katalog TUGADI)

---

## 1. Maqsad

2a'da qurilgan variant ma'lumotini (options/variants — `loadProductDetail` allaqachon qaytaradi) mahsulot sahifasida jonlantirish: olcha-uslub rang/xotira/SIM chip-tanlash; narx, chegirma, rasm, kalkulyator va lead xabari tanlangan variantga mos. Plus o'xshash mahsulotlar bo'limi.

## 2. Variant tanlash semantikasi (pure logika, TDD)

`src/lib/variants.ts` — komponentdan ajratilgan, testlanadigan:

- `VariantSelection = Record<string, string>` — har option nomi → tanlangan qiymat.
- `defaultSelection(options, variants): VariantSelection | null` — **eng arzon sotuvdagi** variantning tanlovi (karta narxi `minPriceUzs` bilan izchil); sotuvda hech biri bo'lmasa eng arzon variant; variantlar bo'sh bo'lsa `null`.
- `resolveVariant(options, variants, selection): ApiVariant | null` — tanlovga aynan mos variant (`optionValueIds` ↔ option/value nomlari orqali).
- `isValueAvailable(options, variants, selection, optionName, value): boolean` — joriy tanlovda shu qiymatga almashtirilsa mos variant mavjudmi (mavjud bo'lmasa chip **disabled**).
- `selectionLabel(options, selection): string` — `"Xotira: 256GB, Rang: Qora"` (options tartibida) — lead xabari uchun.

Tanlov doim to'liq (default'dan boshlanadi, bitta option almashtiriladi) — shuning uchun resolve deterministik.

## 3. ProductPage o'zgarishlari

- **Chip-qatorlar:** har option uchun nom + qiymat chiplari (narx blokidan keyin, kalkulyatordan oldin). Tanlangan = to'ldirilgan uslub; mavjud emas = grayed/disabled. Faqat `options.length > 0` bo'lsa ko'rinadi.
- **Narx bloki:** `variant.cashPriceUzs`/`variant.oldPriceUzs` (variant bor bo'lsa), chegirma badge variantnikidan.
- **Kalkulyator:** `calcInstallment({ ...product, cashPriceUzs: variantNarx }, term, config)` — formula o'zgarmaydi.
- **Galereya:** variantda `imageUrl` bo'lsa u birinchi/faol rasm (`key={variant.id}` bilan remount — ichki active-state reset).
- **Stock:** tanlangan variant `inStock === false` → "Sotuvda yo'q" belgisi, Telegram/WhatsApp CTA disabled.
- **Lead:** `composeLeadMessage`ga `product: "iPhone 17 Pro (Xotira: 256GB, Rang: Qora)"` (variant bor bo'lsa).
- **Variantsiz mahsulot:** hech narsa o'zgarmaydi (orqaga moslik).

## 4. O'xshash mahsulotlar

`product.tsx` loader'ida: joriy mahsulot `categoryId` bo'yicha (`loadProductsBy`), joriy id chiqariladi, birinchi 4 tasi. `categoryId` null → bo'sh (bo'lim ko'rinmaydi). ProductPage oxirida: `t.similarProducts` sarlavha + mavjud `ProductGrid`.

## 5. i18n — yangi kalitlar (4 tilda)

`similarProducts` ("O'xshash mahsulotlar"), `inStock` ("Sotuvda bor"), `outOfStock` ("Sotuvda yo'q").

## 6. Testlar

`src/lib/variants.test.ts` (TDD): defaultSelection (arzon-sotuvdagi/fallback/bo'sh), resolveVariant (aniq moslik, topilmasa null), isValueAvailable (bor/yo'q kombinatsiya), selectionLabel (tartib). Mavjud 34 test buzilmaydi.

## 7. Chegaralar (YO'Q)

Cart (5-bo'lak), stock miqdori, sharh/reyting, zoom-galereya, variant-URL sinxronizatsiyasi (?variant= param — hozircha kerak emas).
