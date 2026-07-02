# Product Data Model (2a: brands, variants, options) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Brend + to'liq variant/atribut ma'lumot modeli (D1 sxema, API, admin boshqaruvi); storefront minimal moslashadi (eng-arzon-variant narxi), variant tanlash UI 4-bo'lakda.

**Architecture:** Yangi `0004` migratsiya (brands, product_options, product_option_values, product_variants, variant_option_values + products.brand_id/slug). `functions/lib/db.ts` mapperlar + `PRODUCT_COLS` (min-variant-narx subquery) + `writeOptionsAndVariants`. Public `/api/brands`; product list/detail boyitiladi. Admin: brands CRUD + ProductForm variant muharriri. Yozish semantikasi images/specs kabi **replace-all**.

**Tech Stack:** Cloudflare Workers + D1, React Router v7 resource routes, React 19, TypeScript strict, bun, vitest.

## Global Constraints

- Paket menejeri **bun**; Cloudflare `bunx wrangler`. Strict TS, **`any` yo'q**; har taskdan keyin `bun run lint` toza; mavjud testlar (15) buzilmasin.
- Mavjud migratsiyalar (`0001–0003`) tegilmaydi; faqat yangi `0004_product_model.sql`.
- API kalitlari camelCase, DB snake_case; mapperlar chegara. Admin API URL patternlari mavjudlariga mos (`/api/admin/brands`, `/api/admin/brands/:id`).
- Har admin route `requireAdmin` guard bilan (login patterni emas — bular yangi CRUD'lar).
- Kalkulyator (`src/lib/installment.ts`) **o'zgarmaydi**.
- Orqaga moslik: variantsiz mahsulot to'liq ishlaydi; ko'rsatiladigan narx `minPriceUzs = min(faol variant) ?? cashPriceUzs`.
- Variant validatsiyasi: narx > 0; option bor bo'lsa har variant har option'dan roppa-rosa bitta qiymat tanlaydi; option nomlari mahsulot ichida unique; buzilsa `ValidationError` → 400.
- Commit formati: `feat:`, `fix:`, `chore:`, `docs:`.

---

## File Structure

- Create: `migrations/0004_product_model.sql`, `functions/lib/validate.test.ts`, `app/routes/api.brands.tsx`, `app/routes/api.admin.brands.tsx`, `app/routes/api.admin.brands.$id.tsx`, `src/admin/BrandList.tsx`, `src/admin/BrandForm.tsx`, `src/admin/VariantEditor.tsx`
- Modify: `shared/types.ts`, `functions/lib/db.ts`, `functions/lib/validate.ts`, `app/routes.ts`, `app/routes/api.products.tsx`, `app/routes/api.admin.products.tsx`, `app/routes/api.admin.products.$id.tsx`, `app/lib/loaders.ts`, `src/data/products.ts`, `src/store/ProductCard.tsx`, `src/admin/api.ts`, `src/admin/AdminApp.tsx`, `src/admin/ProductForm.tsx`

---

### Task 1: Migratsiya 0004 (sxema + seed) + quruq ishga tushirish

**Files:**
- Create: `migrations/0004_product_model.sql`

**Interfaces:**
- Produces: `brands`, `product_options`, `product_option_values`, `product_variants`, `variant_option_values` jadvallari; `products.brand_id`/`products.slug`; seed (3 brend, apple biriktirish, slug=id).

- [ ] **Step 1: Migratsiyani yozish** — spec §3 dagi SQL'ni AYNAN ko'chiring (`docs/superpowers/specs/2026-07-02-product-data-model-design.md` §3 blokidagi to'liq SQL: CREATE TABLE brands/product_options/product_option_values/product_variants/variant_option_values, ALTER products (brand_id, slug), indekslar, INSERT brands, UPDATE products).

- [ ] **Step 2: Lokal sqlite quruq ishga tushirish**

```bash
TMP=$(mktemp -d); DB="$TMP/t.db"
for f in migrations/0001_init.sql migrations/0002_seed.sql migrations/0003_storefront.sql migrations/0004_product_model.sql; do sqlite3 "$DB" < "$f" || echo "FAIL: $f"; done
echo "brands: $(sqlite3 "$DB" 'SELECT count(*) FROM brands;')"
echo "apple products: $(sqlite3 "$DB" "SELECT count(*) FROM products WHERE brand_id='apple';")"
echo "slugged: $(sqlite3 "$DB" 'SELECT count(*) FROM products WHERE slug IS NOT NULL;')"
rm -rf "$TMP"
```
Expected: xatosiz; `brands: 3`; apple products ≥ 8; slugged = mahsulotlar soni.

- [ ] **Step 3: Lokal D1'ga qo'llash**

Run: `bunx wrangler d1 migrations apply taqsit-store-db --local`
Expected: `0004_product_model.sql` qo'llanadi.

- [ ] **Step 4: Commit**

```bash
git add migrations/0004_product_model.sql
git commit -m "feat: product model schema (brands, options, variants)"
```

---

### Task 2: Umumiy tiplar + DB mapperlar + writeOptionsAndVariants

**Files:**
- Modify: `shared/types.ts`, `functions/lib/db.ts`

**Interfaces:**
- Consumes: mavjud `ApiProduct`/`ApiProductDetail`, `ProductRow`, `rowToProduct`, `buildProductDetail`, `writeImagesAndSpecs` patterni.
- Produces:
  - `shared/types.ts`: `ApiBrand { id; name; slug; logoUrl; sortOrder }`, `ApiOptionValue { id; value; sortOrder }`, `ApiOption { id; name; sortOrder; values: ApiOptionValue[] }`, `ApiVariant { id; sku: string|null; cashPriceUzs; oldPriceUzs: number|null; imageUrl: string|null; inStock: boolean; sortOrder; optionValueIds: string[] }`; `ApiProduct` += `brandId: string|null; slug: string|null; minPriceUzs: number`; `ApiProductDetail` += `brand: ApiBrand|null; options: ApiOption[]; variants: ApiVariant[]`.
  - `functions/lib/db.ts`: `BrandRow`, `rowToBrand`, `PRODUCT_COLS` (SQL fragment), kengaytirilgan `ProductRow`/`rowToProduct`, kengaytirilgan `buildProductDetail`, `writeOptionsAndVariants(env, productId, options, variants)`, `OptionInput`/`VariantInput` tiplari.

- [ ] **Step 1: `shared/types.ts` kengaytirish** — yuqoridagi Produces bo'yicha yangi interfeyslarni fayl oxiriga, `ApiProduct`ga 3 maydon, `ApiProductDetail`ga 3 maydon qo'shing (aynan nomlar).

- [ ] **Step 2: `functions/lib/db.ts` — PRODUCT_COLS + ProductRow/rowToProduct**

```ts
export const PRODUCT_COLS =
  `*, (SELECT MIN(v.cash_price_uzs) FROM product_variants v WHERE v.product_id = products.id AND v.in_stock = 1) AS min_variant_price`;
```
`ProductRow`ga: `brand_id: string | null; slug: string | null; min_variant_price?: number | null;`
`rowToProduct` qaytarmasiga: `brandId: row.brand_id ?? null, slug: row.slug ?? null, minPriceUzs: row.min_variant_price ?? row.cash_price_uzs,`
> Eslatma: `min_variant_price` faqat `PRODUCT_COLS` bilan SELECT qilinganda keladi; `?? cash_price_uzs` fallback ikkala holatda ham to'g'ri.

- [ ] **Step 3: `BrandRow`/`rowToBrand` + variant row tiplar**

```ts
export interface BrandRow { id: string; name: string; slug: string; logo_url: string; sort_order: number }
export function rowToBrand(r: BrandRow): ApiBrand {
  return { id: r.id, name: r.name, slug: r.slug, logoUrl: r.logo_url, sortOrder: r.sort_order };
}
export interface OptionRow { id: string; product_id: string; name: string; sort_order: number }
export interface OptionValueRow { id: string; option_id: string; value: string; sort_order: number }
export interface VariantRow { id: string; product_id: string; sku: string | null; cash_price_uzs: number; old_price_uzs: number | null; image_url: string | null; in_stock: number; sort_order: number }
```

- [ ] **Step 4: `buildProductDetail` kengaytirish** — mavjud images/specs parallel so'roviga qo'shimcha: options (+values), variants (+`variant_option_values`), brand (agar `brand_id`). Qaytarmaga `brand`, `options` (values nested, sort_order bo'yicha), `variants` (`optionValueIds` yig'ilgan, `inStock: row.in_stock === 1`) qo'shing. Barcha so'rovlar `Promise.all`da.

- [ ] **Step 5: `writeOptionsAndVariants`**

```ts
export interface OptionInput { name: string; values: string[] }
export interface VariantInput { sku: string | null; cashPriceUzs: number; oldPriceUzs: number | null; imageUrl: string | null; inStock: boolean; optionValues: { optionName: string; value: string }[] }

export async function writeOptionsAndVariants(env: Env, productId: string, options: OptionInput[], variants: VariantInput[]): Promise<void>
```
Replace-all semantika: avval `variant_option_values` (variantlar orqali) → `product_variants` → `product_option_values` (optionlar orqali) → `product_options` DELETE; so'ng optionlarni INSERT qilib `{optionName -> {value -> option_value_id}}` xarita yig'ing; har variantni INSERT qilib `optionValues`ni xaritadan `variant_option_values`ga yozing. Har INSERT `crypto.randomUUID()` id, indeks bo'yicha `sort_order`. Agar variantning `optionValues`ida mavjud bo'lmagan option/value nomi kelsa — bu validatsiya bosqichida ushlangan bo'ladi (Task 3), bu funksiya xaritadan topilmasa `throw new Error('option_value_mismatch')`.

- [ ] **Step 6: Lint + test + commit**

```bash
bun run lint && bun run test
git add shared/types.ts functions/lib/db.ts
git commit -m "feat: product model api types and d1 mappers (brands, options, variants)"
```
Expected: lint toza; 15/15 (rowToProduct kengaymasi mavjud SELECT'larni buzmaydi — yangi maydonlar `?? null`/fallback bilan).

---

### Task 3: Validatsiya (TDD) — parseBrandInput + parseProductInput kengaytmasi

**Files:**
- Modify: `functions/lib/validate.ts`
- Create: `functions/lib/validate.test.ts`

**Interfaces:**
- Consumes: `asRecord`/`reqString`/`reqNumber`/`slugify` (mavjud, fayl ichida), `OptionInput`/`VariantInput` (db.ts — faqat tip sifatida takrorlanadi, import qilinmaydi: validate.ts o'z `ProductInput`ida e'lon qiladi).
- Produces: `parseBrandInput(body): BrandInput` (`{ id; name; slug; logoUrl; sortOrder }`); `ProductInput` += `brandId: string | null; slug: string | null; options: { name: string; values: string[] }[]; variants: { sku: string|null; cashPriceUzs: number; oldPriceUzs: number|null; imageUrl: string|null; inStock: boolean; optionValues: { optionName: string; value: string }[] }[]`.

- [ ] **Step 1: Failing testlarni yozish** — `functions/lib/validate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseProductInput, parseBrandInput, ValidationError } from './validate';

const base = { name: 'iPhone 17', category: 'iphone', condition: 'yangi', cashPriceUzs: 1000, imageUrl: '' };

describe('parseBrandInput', () => {
  it('parses and slugifies', () => {
    const b = parseBrandInput({ name: 'Apple Inc' });
    expect(b.name).toBe('Apple Inc');
    expect(b.slug).toBe('apple-inc');
  });
  it('rejects missing name', () => {
    expect(() => parseBrandInput({})).toThrow(ValidationError);
  });
});

describe('parseProductInput variants', () => {
  it('defaults: no brand/slug/options/variants', () => {
    const p = parseProductInput(base);
    expect(p.brandId).toBeNull();
    expect(p.options).toEqual([]);
    expect(p.variants).toEqual([]);
  });
  it('parses full options + variants', () => {
    const p = parseProductInput({
      ...base,
      brandId: 'apple', slug: 'iphone-17',
      options: [{ name: 'Xotira', values: ['256GB', '512GB'] }],
      variants: [{ cashPriceUzs: 1200, optionValues: [{ optionName: 'Xotira', value: '256GB' }], inStock: true }],
    });
    expect(p.options[0].values).toHaveLength(2);
    expect(p.variants[0].cashPriceUzs).toBe(1200);
    expect(p.variants[0].sku).toBeNull();
  });
  it('rejects variant price <= 0', () => {
    expect(() => parseProductInput({ ...base, variants: [{ cashPriceUzs: 0, optionValues: [] }] })).toThrow(ValidationError);
  });
  it('rejects incomplete combination when options exist', () => {
    expect(() =>
      parseProductInput({
        ...base,
        options: [{ name: 'Xotira', values: ['256GB'] }, { name: 'Rang', values: ['Qora'] }],
        variants: [{ cashPriceUzs: 100, optionValues: [{ optionName: 'Xotira', value: '256GB' }] }],
      }),
    ).toThrow(ValidationError);
  });
  it('rejects duplicate option names', () => {
    expect(() =>
      parseProductInput({ ...base, options: [{ name: 'Rang', values: ['Qora'] }, { name: 'Rang', values: ['Oq'] }] }),
    ).toThrow(ValidationError);
  });
  it('rejects unknown option value in variant', () => {
    expect(() =>
      parseProductInput({
        ...base,
        options: [{ name: 'Rang', values: ['Qora'] }],
        variants: [{ cashPriceUzs: 100, optionValues: [{ optionName: 'Rang', value: 'Yashil' }] }],
      }),
    ).toThrow(ValidationError);
  });
});
```

- [ ] **Step 2: Fail tekshirish** — Run: `bunx vitest run functions/lib/validate.test.ts` — Expected: FAIL (`parseBrandInput` yo'q).

- [ ] **Step 3: Implementatsiya** — `validate.ts`ga:

```ts
export interface BrandInput { id: string; name: string; slug: string; logoUrl: string; sortOrder: number }
export function parseBrandInput(body: unknown): BrandInput {
  const o = asRecord(body);
  const name = reqString(o, 'name');
  const slug = typeof o.slug === 'string' && o.slug.trim() !== '' ? slugify(o.slug) : slugify(name);
  const id = typeof o.id === 'string' && o.id.trim() !== '' ? o.id.trim() : slug || crypto.randomUUID();
  const logoUrl = typeof o.logoUrl === 'string' ? o.logoUrl.trim() : '';
  const sortOrder = typeof o.sortOrder === 'number' ? o.sortOrder : 0;
  if (!slug) throw new ValidationError('slug_invalid');
  return { id, name, slug, logoUrl, sortOrder };
}
```
`ProductInput` tipini Produces bo'yicha kengaytiring. `parseProductInput` ichida (return oldidan):
```ts
  const brandId = typeof o.brandId === 'string' && o.brandId.trim() !== '' ? o.brandId.trim() : null;
  const slug = typeof o.slug === 'string' && o.slug.trim() !== '' ? slugify(o.slug) : null;
  const options = Array.isArray(o.options)
    ? o.options.map((raw) => {
        const r = asRecord(raw);
        const name = reqString(r, 'name');
        const values = Array.isArray(r.values)
          ? r.values.filter((v): v is string => typeof v === 'string' && v.trim() !== '').map((v) => v.trim())
          : [];
        if (values.length === 0) throw new ValidationError('option_values_required');
        return { name, values };
      })
    : [];
  const optNames = options.map((x) => x.name);
  if (new Set(optNames).size !== optNames.length) throw new ValidationError('option_names_unique');
  const variants = Array.isArray(o.variants)
    ? o.variants.map((raw) => {
        const r = asRecord(raw);
        const cashPriceUzsV = reqNumber(r, 'cashPriceUzs');
        if (cashPriceUzsV <= 0) throw new ValidationError('variant_price_positive');
        const optionValues = Array.isArray(r.optionValues)
          ? r.optionValues.map((ov) => {
              const q = asRecord(ov);
              return { optionName: reqString(q, 'optionName'), value: reqString(q, 'value') };
            })
          : [];
        return {
          sku: typeof r.sku === 'string' && r.sku.trim() !== '' ? r.sku.trim() : null,
          cashPriceUzs: cashPriceUzsV,
          oldPriceUzs: typeof r.oldPriceUzs === 'number' && r.oldPriceUzs > 0 ? r.oldPriceUzs : null,
          imageUrl: typeof r.imageUrl === 'string' && r.imageUrl.trim() !== '' ? r.imageUrl.trim() : null,
          inStock: r.inStock === undefined ? true : Boolean(r.inStock),
          optionValues,
        };
      })
    : [];
  if (options.length > 0) {
    for (const v of variants) {
      if (v.optionValues.length !== options.length) throw new ValidationError('variant_combination_incomplete');
      for (const opt of options) {
        const ov = v.optionValues.find((x) => x.optionName === opt.name);
        if (!ov) throw new ValidationError('variant_combination_incomplete');
        if (!opt.values.includes(ov.value)) throw new ValidationError('variant_value_unknown');
      }
    }
  }
```
Va `return { ... }`ga `brandId, slug, options, variants,` qo'shing.

- [ ] **Step 4: Pass + to'liq suite** — Run: `bunx vitest run functions/lib/validate.test.ts && bun run test && bun run lint` — Expected: yangi 7 + jami 22 PASS; lint toza.

- [ ] **Step 5: Commit**

```bash
git add functions/lib/validate.ts functions/lib/validate.test.ts
git commit -m "feat: brand and variant validation with tests"
```

---

### Task 4: Public API — /api/brands + boyitilgan products

**Files:**
- Create: `app/routes/api.brands.tsx`
- Modify: `app/routes/api.products.tsx`, `app/routes.ts`

**Interfaces:**
- Consumes: `rowToBrand`/`BrandRow`/`PRODUCT_COLS`/`json` (db.ts).
- Produces: `GET /api/brands` → `ApiBrand[]`; `GET /api/products` har item `minPriceUzs/brandId/slug` bilan; `GET /api/products/:id` avtomatik boyigan (buildProductDetail Task 2'da kengaygan).

- [ ] **Step 1: `app/routes/api.brands.tsx`** — `api.categories.tsx` patterni:

```tsx
import type { Route } from './+types/api.brands';
import { json, rowToBrand, type BrandRow } from '../../functions/lib/db';

export async function loader({ context }: Route.LoaderArgs) {
  const { results } = await context.cloudflare.env.DB
    .prepare('SELECT * FROM brands ORDER BY sort_order ASC').all<BrandRow>();
  return json(results.map(rowToBrand), { headers: { 'cache-control': 'public, max-age=60' } });
}
```

- [ ] **Step 2: `api.products.tsx` SQL'ini PRODUCT_COLS bilan yangilash** — `let sql = 'SELECT * FROM products WHERE is_active = 1'` → `` let sql = `SELECT ${PRODUCT_COLS} FROM products WHERE is_active = 1` `` (import qo'shing). Filtrlar/tartib o'zgarmaydi. Ixtiyoriy `?brand=` filtri HOZIR qo'shilmaydi (3-bo'lak).

- [ ] **Step 3: `app/routes.ts`ga** `route('api/brands', 'routes/api.brands.tsx'),` (api/categories qatoridan keyin).

- [ ] **Step 4: Tekshirish + commit**

```bash
bun run build && bun run lint
# bun run dev (background, :5173), so'ng:
curl -s http://localhost:5173/api/brands | grep -o '"slug":"apple"'
curl -s http://localhost:5173/api/products | grep -o '"minPriceUzs"' | head -1
git add app/routes/api.brands.tsx app/routes/api.products.tsx app/routes.ts
git commit -m "feat: public brands api and min-variant price on product list"
```
Expected: ikkala grep topadi.

---

### Task 5: Admin brands CRUD API + admin products yozuvida options/variants

**Files:**
- Create: `app/routes/api.admin.brands.tsx`, `app/routes/api.admin.brands.$id.tsx`
- Modify: `app/routes/api.admin.products.tsx`, `app/routes/api.admin.products.$id.tsx`, `app/routes.ts`

**Interfaces:**
- Consumes: `requireAdmin` (`./api.admin.guard`), `parseBrandInput`/`ValidationError`, `rowToBrand`/`BrandRow`/`writeOptionsAndVariants`/`PRODUCT_COLS`.
- Produces: `GET/POST /api/admin/brands`, `PUT/DELETE /api/admin/brands/:id`; admin product create/update `options`/`variants`ni persist qiladi; admin list `minPriceUzs` bilan.

- [ ] **Step 1: `api.admin.brands.tsx`** — `api.admin.categories.tsx` patternini AYNAN takrorlang (guard + GET list + POST create), faqat jadval `brands`, parse `parseBrandInput`, INSERT `(id, name, slug, logo_url, sort_order)`. UNIQUE slug buzilishida D1 xato otadi — `try/catch`da `json({ error: 'slug_taken' }, { status: 400 })`.

- [ ] **Step 2: `api.admin.brands.$id.tsx`** — `api.admin.categories.$id.tsx` patterni: PUT (parseBrandInput `{...body, id}` bilan, UPDATE name/slug/logo_url/sort_order) va DELETE (avval `UPDATE products SET brand_id = NULL WHERE brand_id = ?`, so'ng `DELETE FROM brands WHERE id = ?`), method-branch `action`da, har ikkalasida guard.

- [ ] **Step 3: Admin products yozuvini kengaytirish** — `api.admin.products.tsx` (POST): INSERT ustunlariga `brand_id, slug` qo'shing (bind: `input.brandId, input.slug`); `writeImagesAndSpecs`dan keyin `await writeOptionsAndVariants(env, input.id, input.options, input.variants);`. `api.admin.products.$id.tsx` (PUT): UPDATE SET'ga `brand_id=?, slug=?` qo'shing; `writeImagesAndSpecs`dan keyin `writeOptionsAndVariants`. DELETE'ga products o'chirishdan oldin variant tozalash qo'shing:
```ts
await env.DB.prepare('DELETE FROM variant_option_values WHERE variant_id IN (SELECT id FROM product_variants WHERE product_id = ?)').bind(id).run();
await env.DB.prepare('DELETE FROM product_variants WHERE product_id = ?').bind(id).run();
await env.DB.prepare('DELETE FROM product_option_values WHERE option_id IN (SELECT id FROM product_options WHERE product_id = ?)').bind(id).run();
await env.DB.prepare('DELETE FROM product_options WHERE product_id = ?').bind(id).run();
```
Admin GET list SQL'ini ham `SELECT ${PRODUCT_COLS} FROM products ...`ga o'tkazing.

- [ ] **Step 4: `app/routes.ts`ga** brands admin route'larini qo'shing (`api/admin/brands`, `api/admin/brands/:id`).

- [ ] **Step 5: Tekshirish + commit**

```bash
bun run build && bun run lint && bun run test
# dev server bilan: guard 401
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/api/admin/brands   # 401
git add app/routes/api.admin.brands.tsx "app/routes/api.admin.brands.\$id.tsx" app/routes/api.admin.products.tsx "app/routes/api.admin.products.\$id.tsx" app/routes.ts
git commit -m "feat: admin brands crud and variant persistence on product write"
```

---

### Task 6: Loaders + sample data + ProductCard min narx

**Files:**
- Modify: `app/lib/loaders.ts`, `src/data/products.ts`, `src/store/ProductCard.tsx`

**Interfaces:**
- Consumes: `PRODUCT_COLS`, `rowToBrand`, kengaygan `buildProductDetail`.
- Produces: `Product` (frontend) += `minPriceUzs: number; brandId: string | null`; `loadBrands(env): Promise<ApiBrand[]>`; `ProductDetail` += `brand: ApiBrand | null; options: ApiOption[]; variants: ApiVariant[]`; ProductCard narxlari `minPriceUzs`dan.

- [ ] **Step 1: `src/data/products.ts`** — `Product` interfeysiga `minPriceUzs: number;` va `brandId?: string | null;` qo'shing. `brands` sample massivini qo'shing (`apple/samsung/xiaomi`, migratsiya seed'iga mos, `logoUrl:''`). Har sample mahsulotga `minPriceUzs: <cashPriceUzs bilan teng>` qo'shing; `iphone-17-pro`ga namunaviy variants strukturasi QO'SHILMAYDI (fallback detail'da options/variants bo'sh qoladi — YAGNI, dev'da variant ko'rish uchun admin/D1 bor).

- [ ] **Step 2: `app/lib/loaders.ts`** — `mapProduct`ga `minPriceUzs: p.minPriceUzs, brandId: p.brandId,` qo'shing (`ApiProduct` endi ikkalasini o'z ichiga oladi). Product SELECT'larida (`loadStore`, `loadProductsBy`) `SELECT ${PRODUCT_COLS} FROM products ...` ishlating (import). Fallback tarmoqlarida sample data allaqachon `minPriceUzs` bilan. `ProductDetail`ga `brand/options/variants` qo'shing va `loadProductDetail` muvaffaqiyat tarmog'ida `buildProductDetail` natijasidan o'tkazing; fallback tarmog'ida `brand: null, options: [], variants: []`. Yangi:
```ts
export async function loadBrands(env: Env): Promise<ApiBrand[]> {
  try {
    const { results } = await env.DB.prepare('SELECT * FROM brands ORDER BY sort_order ASC').all<BrandRow>();
    if (results.length === 0) throw new Error('empty');
    return results.map(rowToBrand);
  } catch (err) {
    console.error('loadBrands fallback:', err);
    return fallbackBrands;
  }
}
```
(`fallbackBrands` = `src/data/products.ts`dagi `brands`.)

- [ ] **Step 3: `src/store/ProductCard.tsx`** — oylik va naqd ko'rsatishda min narx: `lowestMonthly({ ...product, cashPriceUzs: product.minPriceUzs }, config)` va naqd `formatUzs(product.minPriceUzs)`. Chegirma badge mavjud `cashPriceUzs/oldPriceUzs` mantiqda qoladi (variant-daraja chegirma 4-bo'lakda).

- [ ] **Step 4: Tekshirish + commit**

```bash
bun run build && bun run lint && bun run test
# dev bilan: bosh sahifada narxlar render bo'ladi (regressiya yo'q)
curl -s http://localhost:5173/ | grep -o "Tavsiya etilgan" | head -1
git add app/lib/loaders.ts src/data/products.ts src/store/ProductCard.tsx
git commit -m "feat: min-variant pricing in loaders and product card"
```

---

### Task 7: Admin UI — Brendlar tabi + api client

**Files:**
- Create: `src/admin/BrandForm.tsx`, `src/admin/BrandList.tsx`
- Modify: `src/admin/api.ts`, `src/admin/AdminApp.tsx`

**Interfaces:**
- Consumes: `ApiBrand` (shared), `uploadImage`, mavjud CategoryForm/CategoryList/AdminApp patternlari.
- Produces: `listBrands/createBrand/updateBrand/deleteBrand` client funksiyalari; AdminApp'da 4-tab "Brendlar".

- [ ] **Step 1: `src/admin/api.ts`** — `ApiBrand` importi + kategoriya client patterni bilan `listBrands(): Promise<ApiBrand[]>` (`/api/admin/brands`), `createBrand(b: Partial<ApiBrand>)`, `updateBrand(id, b)`, `deleteBrand(id)`.

- [ ] **Step 2: `BrandForm.tsx`** — `CategoryForm.tsx`ni AYNAN pattern qilib (FC uslubi, `initial: ApiBrand | null`), maydonlar: Nomi, Slug (matn, ixtiyoriy — bo'sh qoldirilsa server nomdan yasaydi), Tartib raqami, logo yuklash (`uploadImage`, dumaloq preview). Saqlash `createBrand`/`updateBrand`.

- [ ] **Step 3: `BrandList.tsx`** — `CategoryList.tsx` patterni: ro'yxat (logo doira + nom + slug kulrang), Tahrir/O'chir, `window.confirm("...brendi o'chirilsinmi? (mahsulotlar brendsiz qoladi)")`.

- [ ] **Step 4: `AdminApp.tsx`** — `type Tab = 'products' | 'settings' | 'categories' | 'brands'`; "Brendlar" tugmasi (Kategoriyalar'dan keyin, bir xil class pattern); render zanjiriga `: tab === 'brands' ? <BrandList /> ...` qo'shing.

- [ ] **Step 5: Tekshirish + commit**

```bash
bun run build && bun run lint
git add src/admin/api.ts src/admin/BrandForm.tsx src/admin/BrandList.tsx src/admin/AdminApp.tsx
git commit -m "feat: admin brands tab (crud + logo upload)"
```

---

### Task 8: Admin UI — ProductForm: brend, slug, variant muharriri

**Files:**
- Create: `src/admin/VariantEditor.tsx`
- Modify: `src/admin/ProductForm.tsx`, `src/admin/api.ts`

**Interfaces:**
- Consumes: `listBrands`, `getProductDetail` (endi `options`/`variants` bilan keladi — `AdminProductDetail`ga qo'shiladi), `uploadImage`.
- Produces: `AdminProductInput` += `brandId?: string|null; slug?: string|null; options?: {name:string; values:string[]}[]; variants?: AdminVariantInput[]`; `AdminProductDetail` += `brand: ApiBrand|null; options: ApiOption[]; variants: ApiVariant[]`; ProductForm to'liq variant boshqaruvi bilan.

- [ ] **Step 1: `src/admin/api.ts` tiplarini kengaytirish**

```ts
export interface AdminVariantInput {
  sku?: string | null; cashPriceUzs: number; oldPriceUzs?: number | null;
  imageUrl?: string | null; inStock: boolean;
  optionValues: { optionName: string; value: string }[];
}
```
`AdminProductInput`ga `brandId?/slug?/options?/variants?`; `AdminProductDetail`ga `brand: ApiBrand | null; options: ApiOption[]; variants: ApiVariant[]` (importlarga `ApiBrand`, `ApiOption`, `ApiVariant`).

- [ ] **Step 2: `VariantEditor.tsx`** — mustaqil FC komponent, props:
```ts
{ options: { name: string; values: string[] }[];
  variants: EditableVariant[];   // AdminVariantInput bilan bir xil shakl
  onOptionsChange(next): void; onVariantsChange(next): void; }
```
UI: (a) Option'lar bo'limi — har option qatori: nom input + qiymatlar chip-input (matn + Enter/`+` bilan qo'shish, × bilan o'chirish) + option o'chirish; "+ option qo'shish". (b) "Kombinatsiyalarni generatsiya" tugmasi — barcha option qiymatlarining dekart ko'paytmasidan mavjud bo'lmagan kombinatsiyalar uchun yangi variant qatorlari yaratadi (narx 0 — admin to'ldiradi; mavjudlarini saqlab qoladi, kalit = optionValues JSON). (c) Variantlar jadvali — har qator: kombinatsiya select'lari (har option uchun `<select>` qiymatlar), narx input, eski narx input, SKU input, stock checkbox, rasm yuklash (kichik preview, `uploadImage`), qator o'chirish; "+ variant qo'shish" (option'siz mahsulot uchun ham ishlaydi — kombinatsiya bo'sh). Palitra/uslub mavjud admin formalar bilan bir xil (`border-[#D2D2D7] rounded-xl` inputlar).

- [ ] **Step 3: `ProductForm.tsx` integratsiyasi** — `FormState`ga `brandId: string | null; slug: string; options: {name:string; values:string[]}[]; variants: EditableVariant[]` qo'shing. `listBrands()` effect'da yuklab brend `<select>` ("— tanlang —" + brendlar), "Slug (ixtiyoriy)" matn input (Nomi qatori yonida). Tahrirlashda `getProductDetail`dan: `brandId: d.brandId`, `slug: d.slug ?? ''`, `options: d.options.map(o => ({ name: o.name, values: o.values.map(v => v.value) }))`, `variants: d.variants.map(v => ({ sku: v.sku, cashPriceUzs: v.cashPriceUzs, oldPriceUzs: v.oldPriceUzs, imageUrl: v.imageUrl, inStock: v.inStock, optionValues: optionValueIdsni option/value nomlariga aylantirish (d.options bo'ylab id → {optionName, value} xarita) }))`. `save()` payload'iga `brandId, slug: form.slug || null, options: form.options.filter(o => o.name.trim() && o.values.length), variants: form.variants.filter(v => v.cashPriceUzs > 0)` qo'shing. `<VariantEditor>` Xususiyatlar bo'limidan keyin joylashadi.

- [ ] **Step 4: Tekshirish + commit**

```bash
bun run build && bun run lint && bun run test
git add src/admin/VariantEditor.tsx src/admin/ProductForm.tsx src/admin/api.ts
git commit -m "feat: product form with brand, slug and variant editor"
```
> Qo'lda: dev serverda `/admin` — mahsulot ochib option ("Xotira": 256GB/512GB) + 2 variant yarating, saqlang, qayta oching (variantlar qaytib yuklanadi), `/api/products/:id`da `variants` ko'rinadi, bosh sahifada narx eng arzon variantga tushadi.

---

## Self-Review

**Spec coverage (2026-07-02-product-data-model-design.md):** §3 sxema→T1; §4 tiplar/mapperlar→T2, validatsiya→T3, public API→T4, admin API→T5; §5 storefront minimal (minPriceUzs, loadBrands, detail boyitish, sample)→T6; §6 admin (brends tab→T7, ProductForm/variant muharriri→T8); §7 testlar (validate TDD→T3, migratsiya dry-run→T1); §8 chegaralar — hech bir task variant tanlash UI/filtr UI/aksiya qo'shmaydi. ✔

**Placeholder scan:** TODO/TBD yo'q; T2 Step 4 va T8 Step 2-3 tavsifiy lekin aniq xatti-harakat + tip kontraktlari bilan (buildProductDetail so'rovlari, VariantEditor UI, mapping) — implementer uchun yetarli, kod blok talab qilinadigan joylarda berilgan. ✔

**Type consistency:** `OptionInput/VariantInput` (db.ts, T2) ↔ `ProductInput.options/variants` (validate, T3) ↔ `AdminProductInput` (T8) shakllari mos (`{name, values[]}` / `{sku, cashPriceUzs, oldPriceUzs, imageUrl, inStock, optionValues[{optionName, value}]}`). `minPriceUzs` zanjiri: PRODUCT_COLS→rowToProduct→ApiProduct→mapProduct→Product→ProductCard. `ApiVariant.optionValueIds` faqat o'qish tarafida; yozish nom-asosli (optionName/value) — writeOptionsAndVariants xaritasi bilan mos. ✔
