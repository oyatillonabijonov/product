# 2a — Mahsulot ma'lumot modeli (brend, variant, atribut) — Design Spec

**Sana:** 2026-07-02
**Status:** Approved (brainstorm; variant modeli — Option/value + variantlar, user tasdiqlagan)
**Bo'lak:** Platforma qayta qurishning 2a-bo'lagi (2-bo'lak ikkiga bo'lindi: 2a — mahsulot modeli; 2b — kontent & config)

---

## 1. Kontekst

Foundation & SSR (1-bo'lak) tugadi: React Router v7 SSR Cloudflare Workers'da, loader'lar D1'ni to'g'ridan o'qiydi, admin API resource route'lar orqali, i18n URL-lokal, SEO karkas. Bu bo'lak platformaning **kontent modeli yadrosini** quradi: brendlar va to'liq variant tizimi (rang/xotira/SIM, har biri o'z narxi/rasmi bilan) — keyingi bo'laklar (3: katalog dvigateli/filtr UI, 4: mahsulot tajribasi/variant UI) shu asosga tayanadi.

**Qamrov:** D1 sxema + API + admin boshqaruvi. Storefront'da variant tanlash **UI** 4-bo'lakda; filtr UI 3-bo'lakda. Bu bo'lakda storefront faqat buzilmasligi va yangi ma'lumotni (brend, eng-arzon-variant narxi) ko'rsata olishi kerak.

## 2. Qarorlar

1. **Variant modeli — Option/value + variantlar** (tasdiqlangan): `product_options` (atribut o'qlari, mas. "Rang", "Xotira") + `product_option_values` (qiymatlar) + `product_variants` (har kombinatsiya o'z narxi/eski narxi/rasmi/stock/SKU bilan) + `variant_option_values` (bog'lam). Har kategoriya o'z atributlariga ega bo'la oladi; filtr/faset uchun to'g'ri asos.
2. **Stock** — sodda `in_stock` boolean (miqdor kuzatuvi yo'q).
3. **SKU** — ixtiyoriy matn.
4. **Faset chegarasi:** 2a faqat sxemani beradi; 3-bo'lak fasetlari brend + narx + holat + kategoriya. Atribut-bo'yicha faset — keyinroq (YAGNI).
5. **Orqaga moslik:** variantsiz mahsulot to'liq ishlaydi — `products.cash_price_uzs` implicit "default variant" bo'lib qoladi. Variantlar mavjud bo'lsa, ko'rsatiladigan narx = eng arzon faol variant narxi.

## 3. D1 sxema — migratsiya `0004_product_model.sql`

```sql
CREATE TABLE brands (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  logo_url   TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE products ADD COLUMN brand_id TEXT;   -- nullable, brands.id
ALTER TABLE products ADD COLUMN slug TEXT;        -- unique index quyida

CREATE UNIQUE INDEX idx_products_slug ON products(slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_products_brand ON products(brand_id);

CREATE TABLE product_options (
  id         TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  name       TEXT NOT NULL,            -- "Rang", "Xotira", "SIM"
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_product_options_product ON product_options(product_id);

CREATE TABLE product_option_values (
  id         TEXT PRIMARY KEY,
  option_id  TEXT NOT NULL,
  value      TEXT NOT NULL,            -- "Qora", "256GB"
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_option_values_option ON product_option_values(option_id);

CREATE TABLE product_variants (
  id            TEXT PRIMARY KEY,
  product_id    TEXT NOT NULL,
  sku           TEXT,                  -- ixtiyoriy
  cash_price_uzs INTEGER NOT NULL,
  old_price_uzs INTEGER,
  image_url     TEXT,                  -- bo'sh bo'lsa mahsulot rasmi
  in_stock      INTEGER NOT NULL DEFAULT 1,
  sort_order    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_variants_product ON product_variants(product_id);

CREATE TABLE variant_option_values (
  variant_id      TEXT NOT NULL,
  option_value_id TEXT NOT NULL,
  PRIMARY KEY (variant_id, option_value_id)
);

-- Seed: brendlar + mavjud mahsulotlarga brand/slug
INSERT INTO brands (id, name, slug, logo_url, sort_order) VALUES
  ('apple', 'Apple', 'apple', '', 10),
  ('samsung', 'Samsung', 'samsung', '', 20),
  ('xiaomi', 'Xiaomi', 'xiaomi', '', 30);
UPDATE products SET brand_id = 'apple' WHERE category IN ('iphone','mac','ipad');
UPDATE products SET slug = id;   -- mavjud id'lar allaqachon slug-shaklida
```

Mavjud migratsiyalarga (`0001–0003`) tegilmaydi.

## 4. API kontrakt (`shared/types.ts` kengaytmasi)

```ts
export interface ApiBrand { id: string; name: string; slug: string; logoUrl: string; sortOrder: number }
export interface ApiOptionValue { id: string; value: string; sortOrder: number }
export interface ApiOption { id: string; name: string; sortOrder: number; values: ApiOptionValue[] }
export interface ApiVariant {
  id: string; sku: string | null;
  cashPriceUzs: number; oldPriceUzs: number | null;
  imageUrl: string | null; inStock: boolean; sortOrder: number;
  optionValueIds: string[];           // variant_option_values
}
// ApiProduct kengaytmasi:
//   brandId: string | null; slug: string | null;
//   minPriceUzs: number;    // eng arzon faol variant narxi, variantsiz = cashPriceUzs (LIST javoblarida)
// ApiProductDetail kengaytmasi:
//   brand: ApiBrand | null; options: ApiOption[]; variants: ApiVariant[];
```

**Endpointlar:**
- `GET /api/brands` → `ApiBrand[]` (yangi, public).
- `GET /api/products` → har item `minPriceUzs` bilan (bitta qo'shimcha agregat query yoki JOIN).
- `GET /api/products/:id` → detail + `brand`, `options`, `variants` (buildProductDetail kengayadi).
- Admin: `GET/POST /api/admin/brands`, `PUT/DELETE /api/admin/brands/:id` (kategoriya CRUD patterni).
- Admin product yozish: `parseProductInput` kengayadi — `brandId`, `slug`(ixtiyoriy, bo'sh bo'lsa nomdan slugify), `options[]` (`{name, values[]}`), `variants[]` (`{sku?, cashPriceUzs, oldPriceUzs?, imageUrl?, inStock, optionValues: {optionName, value}[]}`). Yozish semantikasi — images/specs kabi **replace-all** (delete + insert), `writeOptionsAndVariants` helper `functions/lib/db.ts`da.

**Validatsiya qoidalari:** variant narxi > 0; har variant har option'dan roppa-rosa bitta qiymat tanlaydi; option nomlari mahsulot ichida unique; option'siz mahsulotda variants ham bo'sh bo'lishi shart emas (variant option'larsiz ham bo'lishi mumkin — masalan bitta "standart" variant), lekin option bor bo'lsa har variant to'liq kombinatsiya bo'lishi kerak. Buzilsa `ValidationError` → 400.

## 5. Storefront ta'siri (bu bo'lakda minimal)

- `app/lib/loaders.ts`: `loadProductsBy`/`loadStore` mahsulotga `minPriceUzs`ni qo'shadi; `ProductCard` narx ko'rsatishда `minPriceUzs`dan foydalanadi (variantsiz — o'zgarish yo'q, chunki `minPriceUzs = cashPriceUzs`); `loadProductDetail` `brand/options/variants`ni qaytaradi (UI 4-bo'lakda ishlatadi — hozircha faqat tip mavjudligi); yangi `loadBrands`.
- Kalkulyator formulasi o'zgarmaydi — 4-bo'lakda tanlangan variant narxi `cashPriceUzs` o'rnida uzatiladi.
- Sample fallback (`src/data/products.ts`): brendlar ro'yxati + 1-2 mahsulotga namunaviy variantlar (dev'da ko'rish uchun).

## 6. Admin

- **Brendlar tabi** (4-tab): CategoryList/CategoryForm patterni — ro'yxat, yaratish/tahrirlash (nom, slug, logo yuklash R2), o'chirish (mahsulotlar `brand_id = NULL`ga tushadi).
- **ProductForm kengaytmasi:** brend select; slug maydoni (ixtiyoriy); **variant muharriri**: option'lar ro'yxati (nom + qiymatlar chiplari), so'ng variantlar jadvali — har qator: kombinatsiya (har option uchun qiymat select), narx, eski narx, rasm (R2 upload), stock checkbox, SKU. "Kombinatsiyalarni generatsiya" tugmasi (barcha qiymat kombinatsiyalaridan bo'sh variantlar yaratadi) — qulaylik.
- Tahrirlashda mavjud options/variants `GET /api/products/:id`dan yuklanadi (admin `getProductDetail` allaqachon shu endpointni ishlatadi).

## 7. Testlar

- `functions/lib/validate.test.ts` (yangi): variant/option parsing — to'g'ri input, yetishmagan kombinatsiya → 400, narx ≤ 0 → 400, option'siz mahsulot o'tadi.
- Migratsiya quruq ishga tushirish (lokal sqlite): 0001→0004 ketma-ket, seed tekshiruvi.
- Mavjud testlar (15) buzilmaydi.

## 8. Chegaralar (bu bo'lakda YO'Q)
Variant tanlash UI (4-bo'lak), filtr/saralash UI (3-bo'lak), aksiya/banner/kontent sahifalar/site_config admin (2b), slug-asosidagi URL'ga o'tish (product route hozircha id bilan qoladi; slug maydon tayyorlanadi).
