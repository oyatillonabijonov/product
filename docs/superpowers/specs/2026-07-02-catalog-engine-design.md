# 3-bo'lak — Katalog dvigateli — Design Spec

**Sana:** 2026-07-02
**Status:** Approved (brainstorm)
**Bo'lak:** Platforma qayta qurishning 3-bo'lagi (2a — mahsulot modeli TUGADI; 2b keyinroq)

---

## 1. Maqsad

To'liq katalog ko'rish tajribasi: filtr, saralash, paginatsiya, brend sahifasi, chegirmalar sahifasi, serverli qidiruv. Hammasi **SSR + URL-driven** (holat query param'larda — ulashiladigan, SEO'ga mos, komponent holatiga bog'lanmagan). 2a bergan ma'lumot asosiga (brendlar, `minPriceUzs`) quriladi.

## 2. Sahifalar / route'lar

| Route | Tavsif |
|---|---|
| `/katalog` (+ `:lang` variant) | Barcha mahsulotlar, to'liq filtr paneli. Header'dagi "Katalog" tugmasi shu sahifaga link bo'ladi (dropdown saqlanadi). |
| `/brand/:slug` (+ lang) | Brend sahifasi — brend nomi/logo sarlavha, filtrlangan grid. Sitemap'ga qo'shiladi. |
| `/chegirmalar` (+ lang) | Chegirmali mahsulotlar (`old_price_uzs IS NOT NULL AND old_price_uzs > cash_price_uzs`). 2b'siz ishlaydi. |
| `/category/:slug`, `/search` (mavjud) | Filtr/saralash/paginatsiya qo'shiladi. |

## 3. Filtr/saralash/paginatsiya modeli (URL query)

- `?brand=apple,samsung` — vergul bilan ko'p brend (slug bo'yicha)
- `?narx=9000000-20000000` — min-max (ikkalasi ham ixtiyoriy: `9000000-`, `-20000000`); **`minPriceUzs` bo'yicha** filtrlanadi
- `?holat=yangi|ishlatilgan`
- `?cat=telefonlar` — faqat `/katalog`da (kategoriya sahifasida slug allaqachon path'da)
- `?sort=arzon|qimmat|yangi` — default: `sort_order ASC, created_at ASC`; `arzon`/`qimmat` = minPriceUzs ASC/DESC; `yangi` = created_at DESC
- `?page=N` — 1-based; **24 mahsulot/sahifa**; raqamli paginatsiya (SEO)

**Server:** `app/lib/loaders.ts`ga yagona `queryProducts(env, filters): Promise<{ items: Product[]; total: number; facets: Facets }>`:
- WHERE dinamik quriladi (mavjud bind-pattern): `is_active = 1` + kategoriya + brend(lar) + holat + narx (min_variant_price subquery ustidan `COALESCE(min_variant_price, cash_price_uzs)`) + qidiruv (`name LIKE`).
- `total` — alohida `COUNT(*)` (bir xil WHERE bilan).
- `facets` — brend hisoblagichlari: joriy filtr (brenddan tashqari) bo'yicha har brendda nechta mahsulot: `SELECT brand_id, COUNT(*) ... GROUP BY brand_id`. Narx chegaralari (min/max) ham qaytariladi (slider/inputlar uchun).
- Fallback (D1 yo'q): sample data ustida xuddi shu filtr/saralash/paginatsiya JS'da.

**Filtr parsing** — pure funksiya `parseCatalogFilters(searchParams): CatalogFilters` (`app/lib/catalog.ts`, TDD): noto'g'ri qiymatlar jimgina e'tibordan chetda (`page=abc` → 1, noma'lum sort → default).

## 4. UI komponentlar (yadro-struktura; skin keyin)

- `FilterPanel` — desktop: chap yon panel; mobil: "Filtr" tugmasi → pastdan chiqadigan sheet. Bo'limlar: Brend (checkbox ro'yxati + hisoblagichlar), Narx (min/max inputlar), Holat (radio). "Tozalash" tugmasi.
- `SortSelect` — o'ng yuqorida select.
- `ActiveFilterChips` — tanlangan filtrlar chip'lar qatori, ×-bilan olib tashlash.
- `Pagination` — raqamli (1 … N), joriy sahifa belgilangan, `LocaleLink` bilan.
- Hammasi **URL'ni yangilaydi** (`useNavigate` yoki link) — holat URL'da. Filtr o'zgarganda `page` reset.
- `CategoryPage`/`SearchPage`/yangi sahifalar umumiy `CatalogView` kompozitsion komponentidan foydalanadi (sarlavha + panel + grid + paginatsiya) — dublikatsiya yo'q.

## 5. SEO

- Filtr/saralash/paginatsiya param'li sahifalar: `<meta name="robots" content="noindex,follow">` (param bor bo'lganda). Toza `/katalog`, `/category/:slug`, `/brand/:slug`, `/chegirmalar` indekslanadi.
- Canonical: param'li sahifada toza yo'lga ishora.
- `/brand/:slug` va `/katalog`, `/chegirmalar` sitemap'ga qo'shiladi (barcha lokallar).
- Sarlavhalar: brend sahifasi `pageTitle(brand.name)`, katalog `pageTitle(t.catalogAll)`, chegirmalar `pageTitle(t.dealsTitle)`.

## 6. i18n — yangi kalitlar (4 tilda)

`catalogAll` ("Barcha mahsulotlar"), `dealsTitle` ("Chegirmalar"), `filterTitle` ("Filtr"), `filterBrand` ("Brend"), `filterPrice` ("Narx"), `filterPriceFrom`/`filterPriceTo` ("dan"/"gacha"), `filterCondition` ("Holati"), `filterAll` ("Barchasi"), `filterClear` ("Tozalash"), `filterApply` ("Ko'rsatish"), `sortLabel` ("Saralash"), `sortDefault` ("Tavsiya"), `sortCheap` ("Arzon → qimmat"), `sortExpensive` ("Qimmat → arzon"), `sortNew` ("Yangi kelganlar"), `resultsCount` ("mahsulot") — barcha 4 til bloklariga.

## 7. Testlar

- `app/lib/catalog.test.ts` (TDD): `parseCatalogFilters` — to'g'ri parsing, noto'g'ri qiymatlar default'ga, narx oralig'i variantlari, page/sort validatsiya.
- `queryProducts` fallback filtri sample data ustida (pure qism) — narx/brend/holat/sort/paginatsiya kombinatsiyalari.
- Mavjud 23 test buzilmaydi.

## 8. Chegaralar (YO'Q)

Variant tanlash UI (4-bo'lak); atribut-fasetlar (xotira/RAM filtri — keyinroq); aksiya/banner modeli, kontent sahifalar, site_config admin (2b); infinite scroll; qidiruv sahifasida fuzzy-matching.
