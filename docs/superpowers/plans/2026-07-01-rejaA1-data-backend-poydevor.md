# Reja A1 — Storefront ma'lumot + backend poydevori (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Storefront uchun ma'lumot modelini kengaytirish (kategoriyalar, galereya, xususiyatlar, eski narx) va ommaviy + admin API'larni shu ma'lumot bilan ta'minlash. Frontend (A2) va admin UI (A3) shu poydevorga tayanadi.

**Architecture:** Yangi D1 migratsiya (`0003`) `categories`, `product_images`, `product_specs` jadvallarini va `products` ustunlarini qo'shadi. `shared/types.ts` yangi Api tiplar bilan boyitiladi, `functions/lib/db.ts` mapperlar bilan. Ommaviy API kategoriya, mahsulot query filtri va to'liq mahsulot detali beradi; admin API kategoriya CRUD va boyitilgan mahsulot yozishni qo'shadi.

**Tech Stack:** Cloudflare Pages Functions, D1 (SQLite), TypeScript strict, bun, vitest.

## Global Constraints

- Strict TypeScript, `any` **ishlatilmaydi**. `bun run lint` (root + functions tsconfig), `bun run build`, `bun run test` toza (mavjud 10/10 test buzilmasin).
- Paket menejeri: **bun**; Cloudflare `bunx wrangler ...`.
- Commit formati: `feat:`, `fix:`, `chore:`.
- Mavjud migratsiyalarga (`0001`, `0002`) **tegilmaydi**; faqat yangi `0003` qo'shiladi.
- API JSON kalitlari **camelCase**; DB ustunlari **snake_case**; mapperlar chegara.
- Kalkulyator o'zgarmaydi: narx sifatida `cash_price_uzs` ishlatiladi (`old_price_uzs` faqat ko'rsatish).
- Deploy/provisioning (wrangler create/secret/deploy) **DEFERRED** — kod `lint`/`build` bilan tekshiriladi; SQL lokal sqlite bilan quruq ishga tushiriladi.
- `category` (eski matn ustuni: iphone/mac/ipad/pc) **saqlanadi va product input'da hamon majburiy** — buzilmasligi uchun; storefront yangi `category_id`ni ishlatadi.

---

## File Structure

- `migrations/0003_storefront.sql` — categories, product_images, product_specs, products ALTER, seed (Create).
- `shared/types.ts` — ApiCategory, ApiSpec, ApiProductDetail; ApiProduct kengaytmasi (Modify).
- `functions/lib/db.ts` — CategoryRow, SpecRow, ImageRow, rowToCategory, rowToSpec, rowToProduct kengaytmasi, buildProductDetail (Modify).
- `functions/api/categories.ts` — GET (Create).
- `functions/api/products.ts` — ?category & ?q query filtri (Modify).
- `functions/api/products/[id].ts` — GET detail (Create).
- `functions/lib/validate.ts` — parseProductInput kengaytmasi + parseCategoryInput (Modify).
- `functions/api/admin/categories.ts` + `functions/api/admin/categories/[id].ts` — CRUD (Create).
- `functions/api/admin/products.ts` + `functions/api/admin/products/[id].ts` — images/specs/category persist (Modify).

---

### Task 1: D1 migratsiya 0003 (storefront jadvallari + seed)

**Files:**
- Create: `migrations/0003_storefront.sql`

**Interfaces:**
- Consumes: mavjud `products` jadvali.
- Produces: `categories`, `product_images`, `product_specs` jadvallari; `products`ga `category_id`, `old_price_uzs`, `description` ustunlari; 5 kategoriya + mahsulot biriktirmalari.

- [x] **Step 1: Migratsiyani yozish**

Create `migrations/0003_storefront.sql`:

```sql
CREATE TABLE categories (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  icon_url   TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE product_images (
  id         TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  image_url  TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_product_images_product ON product_images(product_id);

CREATE TABLE product_specs (
  id         TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  label      TEXT NOT NULL,
  value      TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_product_specs_product ON product_specs(product_id);

ALTER TABLE products ADD COLUMN category_id TEXT;
ALTER TABLE products ADD COLUMN old_price_uzs INTEGER;
ALTER TABLE products ADD COLUMN description TEXT;

INSERT INTO categories (id, name, icon_url, sort_order) VALUES
  ('telefonlar',  'Telefonlar',  '', 10),
  ('noutbuklar',  'Noutbuklar',  '', 20),
  ('planshetlar', 'Planshetlar', '', 30),
  ('kompyuterlar','Kompyuterlar','', 40),
  ('aksessuarlar','Aksessuarlar','', 50);

UPDATE products SET category_id = 'telefonlar'  WHERE category = 'iphone';
UPDATE products SET category_id = 'noutbuklar'  WHERE category = 'mac' AND id LIKE '%macbook%';
UPDATE products SET category_id = 'planshetlar' WHERE category = 'ipad';
UPDATE products SET category_id = 'kompyuterlar' WHERE category = 'pc' OR (category = 'mac' AND id NOT LIKE '%macbook%');
```

- [x] **Step 2: Lokal sqlite'da barcha migratsiyalarni quruq ishga tushirish**

Run:
```bash
TMP=$(mktemp -d); DB="$TMP/t.db"
sqlite3 "$DB" < migrations/0001_init.sql
sqlite3 "$DB" < migrations/0002_seed.sql
sqlite3 "$DB" < migrations/0003_storefront.sql && echo "0003 OK"
echo "categories: $(sqlite3 "$DB" 'SELECT count(*) FROM categories;')"
echo "categorized products: $(sqlite3 "$DB" 'SELECT count(*) FROM products WHERE category_id IS NOT NULL;')"
sqlite3 "$DB" 'SELECT id, category, category_id FROM products;'
rm -rf "$TMP"
```
Expected: `0003 OK`; `categories: 5`; `categorized products: 10` (har mahsulotda `category_id` bor).

- [x] **Step 3: Lokal D1'ga migratsiya qo'llash (agar wrangler local mavjud bo'lsa)**

Run:
```bash
bunx wrangler d1 migrations apply taqsit-store-db --local
```
Expected: `0003_storefront.sql` qo'llanadi. (Bajarilmasa — muammo emas, Step 2 quruq ishga tushirishi asosiy tekshiruv.)

- [x] **Step 4: Commit**

```bash
git add migrations/0003_storefront.sql
git commit -m "feat: add storefront schema (categories, images, specs, discounts)"
```

---

### Task 2: Umumiy tiplar va DB mapperlar

**Files:**
- Modify: `shared/types.ts`
- Modify: `functions/lib/db.ts`

**Interfaces:**
- Consumes: mavjud `ApiProduct`, `ProductRow`, `rowToProduct`, `json`.
- Produces:
  - `shared/types.ts`: `ApiCategory` (`{ id: string; name: string; iconUrl: string; sortOrder: number }`), `ApiSpec` (`{ label: string; value: string }`), `ApiProduct` kengaytmasi (`categoryId: string | null; oldPriceUzs: number | null`), `ApiProductDetail` (`ApiProduct & { description: string | null; images: string[]; specs: ApiSpec[] }`).
  - `functions/lib/db.ts`: `CategoryRow`, `SpecRow`, `ImageRow`, `rowToCategory(row): ApiCategory`, `rowToSpec(row): ApiSpec`, kengaytirilgan `ProductRow`/`rowToProduct`, `buildProductDetail(env, id): Promise<ApiProductDetail | null>`.

- [x] **Step 1: `shared/types.ts` ni kengaytirish**

`shared/types.ts` faylida `ApiProduct` interfeysiga ikki maydon qo'shing va oxiriga yangi tiplarni qo'shing:

`ApiProduct` ichiga (mavjud maydonlardan keyin):
```ts
  categoryId: string | null;
  oldPriceUzs: number | null;
```

Fayl oxiriga:
```ts
export interface ApiCategory {
  id: string;
  name: string;
  iconUrl: string;
  sortOrder: number;
}

export interface ApiSpec {
  label: string;
  value: string;
}

export interface ApiProductDetail extends ApiProduct {
  description: string | null;
  images: string[];
  specs: ApiSpec[];
}
```

- [x] **Step 2: `functions/lib/db.ts` — ProductRow va rowToProduct kengaytmasi**

`ProductRow` interfeysiga qo'shing:
```ts
  category_id: string | null;
  old_price_uzs: number | null;
  description: string | null;
```

`rowToProduct` ichida qaytariladigan obyektga qo'shing (mavjud maydonlardan keyin):
```ts
    categoryId: row.category_id,
    oldPriceUzs: row.old_price_uzs,
```

- [x] **Step 3: `functions/lib/db.ts` — yangi row tiplar va mapperlar**

`functions/lib/db.ts` importiga `ApiCategory`, `ApiSpec`, `ApiProductDetail` qo'shing va fayl oxiriga:
```ts
export interface CategoryRow {
  id: string;
  name: string;
  icon_url: string;
  sort_order: number;
}

export interface SpecRow {
  id: string;
  product_id: string;
  label: string;
  value: string;
  sort_order: number;
}

export interface ImageRow {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number;
}

export function rowToCategory(row: CategoryRow): ApiCategory {
  return { id: row.id, name: row.name, iconUrl: row.icon_url, sortOrder: row.sort_order };
}

export function rowToSpec(row: SpecRow): ApiSpec {
  return { label: row.label, value: row.value };
}

export async function buildProductDetail(
  env: { DB: D1Database },
  id: string,
): Promise<ApiProductDetail | null> {
  const row = await env.DB.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1')
    .bind(id)
    .first<ProductRow>();
  if (!row) return null;
  const [{ results: imgRows }, { results: specRows }] = await Promise.all([
    env.DB.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC')
      .bind(id)
      .all<ImageRow>(),
    env.DB.prepare('SELECT * FROM product_specs WHERE product_id = ? ORDER BY sort_order ASC')
      .bind(id)
      .all<SpecRow>(),
  ]);
  const base = rowToProduct(row);
  const gallery = imgRows.map((r) => r.image_url);
  const images = row.image_url ? [row.image_url, ...gallery] : gallery;
  return { ...base, description: row.description, images, specs: specRows.map(rowToSpec) };
}
```

- [x] **Step 4: Lint va test**

Run:
```bash
bun run lint && bun run test
```
Expected: xatosiz; 10/10 test (mavjud frontend `mapProduct` qo'shimcha maydonlarni e'tiborsiz qoldiradi).

- [x] **Step 5: Commit**

```bash
git add shared/types.ts functions/lib/db.ts
git commit -m "feat: storefront api types and d1 mappers (category, specs, detail)"
```

---

### Task 3: Ommaviy API — categories, products query, product detail

**Files:**
- Create: `functions/api/categories.ts`, `functions/api/products/[id].ts`
- Modify: `functions/api/products.ts`

**Interfaces:**
- Consumes: `Env`, `json`, `rowToProduct`, `rowToCategory`, `buildProductDetail`, `ProductRow`, `CategoryRow`.
- Produces:
  - `GET /api/categories` → `ApiCategory[]`.
  - `GET /api/products` → `ApiProduct[]`; `?category=slug` va `?q=matn` (nom LIKE) filtrlari.
  - `GET /api/products/:id` → `ApiProductDetail` (404 agar topilmasa/faol emas).

- [x] **Step 1: Categories endpointini yozish**

Create `functions/api/categories.ts`:
```ts
import type { Env } from '../env';
import { json, rowToCategory, type CategoryRow } from '../lib/db';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all<CategoryRow>();
  return json(results.map(rowToCategory), { headers: { 'cache-control': 'public, max-age=60' } });
};
```

- [x] **Step 2: Products endpointiga query filtrini qo'shish**

`functions/api/products.ts` faylini to'liq almashtiring:
```ts
import type { Env } from '../env';
import { json, rowToProduct, type ProductRow } from '../lib/db';

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const q = url.searchParams.get('q');

  let sql = 'SELECT * FROM products WHERE is_active = 1';
  const binds: unknown[] = [];
  if (category) {
    sql += ' AND category_id = ?';
    binds.push(category);
  }
  if (q && q.trim() !== '') {
    sql += ' AND name LIKE ?';
    binds.push(`%${q.trim()}%`);
  }
  sql += ' ORDER BY sort_order ASC, created_at ASC';

  const { results } = await env.DB.prepare(sql).bind(...binds).all<ProductRow>();
  return json(results.map(rowToProduct), { headers: { 'cache-control': 'public, max-age=60' } });
};
```

- [x] **Step 3: Product detail endpointini yozish**

Create `functions/api/products/[id].ts`:
```ts
import type { Env } from '../../env';
import { buildProductDetail, json } from '../../lib/db';

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const detail = await buildProductDetail(env, String(params.id));
  if (!detail) return json({ error: 'not_found' }, { status: 404 });
  return json(detail, { headers: { 'cache-control': 'public, max-age=60' } });
};
```

- [x] **Step 4: Lokal tekshiruv (agar wrangler pages dev mavjud bo'lsa) yoki lint**

Run:
```bash
bun run lint && bun run build
```
Expected: xatosiz. (Runtime curl tekshiruvi ixtiyoriy — deferred.)

- [x] **Step 5: Commit**

```bash
git add functions/api/categories.ts functions/api/products.ts "functions/api/products/[id].ts"
git commit -m "feat: public api for categories, product filters and product detail"
```

---

### Task 4: Admin kategoriya CRUD API

**Files:**
- Modify: `functions/lib/validate.ts`
- Create: `functions/api/admin/categories.ts`, `functions/api/admin/categories/[id].ts`

**Interfaces:**
- Consumes: `Env`, `json`, `rowToCategory`, `CategoryRow`, `ValidationError`.
- Produces:
  - `functions/lib/validate.ts`: `parseCategoryInput(body): CategoryInput` (`{ id: string; name: string; iconUrl: string; sortOrder: number }`).
  - `GET/POST /api/admin/categories`, `PUT/DELETE /api/admin/categories/:id`.

- [x] **Step 1: `parseCategoryInput` ni yozish**

`functions/lib/validate.ts` importiga `ApiCategory` qo'shing va fayl oxiriga:
```ts
export interface CategoryInput {
  id: string;
  name: string;
  iconUrl: string;
  sortOrder: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9Ѐ-ӿ]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseCategoryInput(body: unknown): CategoryInput {
  const o = asRecord(body);
  const name = reqString(o, 'name');
  const id =
    typeof o.id === 'string' && o.id.trim() !== '' ? o.id.trim() : slugify(name) || crypto.randomUUID();
  const iconUrl = typeof o.iconUrl === 'string' ? o.iconUrl.trim() : '';
  const sortOrder = typeof o.sortOrder === 'number' ? o.sortOrder : 0;
  return { id, name, iconUrl, sortOrder };
}
```

- [x] **Step 2: List + Create endpointini yozish**

Create `functions/api/admin/categories.ts`:
```ts
import type { Env } from '../../env';
import { json, rowToCategory, type CategoryRow } from '../../lib/db';
import { parseCategoryInput, ValidationError } from '../../lib/validate';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all<CategoryRow>();
  return json(results.map(rowToCategory));
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let input;
  try {
    input = parseCategoryInput(await request.json().catch(() => null));
  } catch (e) {
    if (e instanceof ValidationError) return json({ error: e.message }, { status: 400 });
    throw e;
  }
  await env.DB.prepare('INSERT INTO categories (id, name, icon_url, sort_order) VALUES (?, ?, ?, ?)')
    .bind(input.id, input.name, input.iconUrl, input.sortOrder)
    .run();
  const row = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(input.id).first<CategoryRow>();
  return json(row ? rowToCategory(row) : { error: 'insert_failed' }, { status: row ? 201 : 500 });
};
```

- [x] **Step 3: Update + Delete endpointini yozish**

Create `functions/api/admin/categories/[id].ts`:
```ts
import type { Env } from '../../../env';
import { json, rowToCategory, type CategoryRow } from '../../../lib/db';
import { parseCategoryInput, ValidationError } from '../../../lib/validate';

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = String(params.id);
  let input;
  try {
    input = parseCategoryInput({ ...((await request.json().catch(() => null)) ?? {}) as object, id });
  } catch (e) {
    if (e instanceof ValidationError) return json({ error: e.message }, { status: 400 });
    throw e;
  }
  await env.DB.prepare('UPDATE categories SET name=?, icon_url=?, sort_order=? WHERE id=?')
    .bind(input.name, input.iconUrl, input.sortOrder, id)
    .run();
  const row = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first<CategoryRow>();
  if (!row) return json({ error: 'not_found' }, { status: 404 });
  return json(rowToCategory(row));
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  const id = String(params.id);
  await env.DB.prepare('UPDATE products SET category_id = NULL WHERE category_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
  return json({ ok: true });
};
```

- [x] **Step 4: Lint va commit**

```bash
bun run lint && bun run test
git add functions/lib/validate.ts functions/api/admin/categories.ts "functions/api/admin/categories/[id].ts"
git commit -m "feat: admin category crud api"
```

---

### Task 5: Boyitilgan admin mahsulot yozish (category, old price, description, images, specs)

**Files:**
- Modify: `functions/lib/validate.ts`, `functions/api/admin/products.ts`, `functions/api/admin/products/[id].ts`

**Interfaces:**
- Consumes: `parseProductInput` (kengaytiriladi), `ImageRow`, `SpecRow`.
- Produces: `ProductInput` kengaytmasi (`categoryId: string | null; oldPriceUzs: number | null; description: string | null; images: string[]; specs: ApiSpec[]`); INSERT/UPDATE `category_id`/`old_price_uzs`/`description`ni saqlaydi va `product_images`/`product_specs`ni qayta yozadi.

- [x] **Step 1: `parseProductInput` ni kengaytirish**

`functions/lib/validate.ts`da `ProductInput` tipini va `parseProductInput` return'ini kengaytiring. `ProductInput` tipini quyidagiga almashtiring:
```ts
export type ProductInput = Omit<ApiProduct, 'id'> & {
  id: string;
  description: string | null;
  images: string[];
  specs: { label: string; value: string }[];
};
```

`parseProductInput` funksiyasida mavjud `return { ... }` dan oldin quyidagi parsingni qo'shing (mavjud `isActive` satridan keyin):
```ts
  const categoryId =
    typeof o.categoryId === 'string' && o.categoryId.trim() !== '' ? o.categoryId.trim() : null;
  const oldPriceUzs =
    typeof o.oldPriceUzs === 'number' && Number.isFinite(o.oldPriceUzs) && o.oldPriceUzs > 0
      ? o.oldPriceUzs
      : null;
  const description =
    typeof o.description === 'string' && o.description.trim() !== '' ? o.description.trim() : null;
  const images = Array.isArray(o.images)
    ? o.images.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim())
    : [];
  const specs = Array.isArray(o.specs)
    ? o.specs
        .map((raw) => asRecord(raw))
        .map((s) => ({ label: reqString(s, 'label'), value: reqString(s, 'value') }))
    : [];
```

Va `return { ... }` obyektiga (mavjud maydonlardan keyin) qo'shing:
```ts
    categoryId,
    oldPriceUzs,
    description,
    images,
    specs,
```

- [x] **Step 2: Create (POST) — yangi maydonlar + images/specs saqlash**

`functions/api/admin/products.ts`da import qatoriga `type ImageRow, type SpecRow` **kerak emas** (INSERT bilan yoziladi). `onRequestPost` ичida INSERT va u 'ndan keyingi qismni quyidagiga almashtiring (validatsiya bloki o'zgarmaydi):
```ts
  await env.DB.prepare(
    `INSERT INTO products (id, name, category, condition, condition_note, cash_price_uzs, image_url, sort_order, is_active, category_id, old_price_uzs, description, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`,
  )
    .bind(
      input.id,
      input.name,
      input.category,
      input.condition,
      input.conditionNote,
      input.cashPriceUzs,
      input.imageUrl,
      input.sortOrder,
      input.isActive ? 1 : 0,
      input.categoryId,
      input.oldPriceUzs,
      input.description,
    )
    .run();
  await writeImagesAndSpecs(env, input.id, input.images, input.specs);
  const row = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(input.id).first<ProductRow>();
  return json(row ? rowToProduct(row) : { error: 'insert_failed' }, { status: row ? 201 : 500 });
};

async function writeImagesAndSpecs(
  env: Env,
  productId: string,
  images: string[],
  specs: { label: string; value: string }[],
): Promise<void> {
  await env.DB.prepare('DELETE FROM product_images WHERE product_id = ?').bind(productId).run();
  await env.DB.prepare('DELETE FROM product_specs WHERE product_id = ?').bind(productId).run();
  for (let i = 0; i < images.length; i++) {
    await env.DB.prepare('INSERT INTO product_images (id, product_id, image_url, sort_order) VALUES (?, ?, ?, ?)')
      .bind(crypto.randomUUID(), productId, images[i], i)
      .run();
  }
  for (let i = 0; i < specs.length; i++) {
    await env.DB.prepare('INSERT INTO product_specs (id, product_id, label, value, sort_order) VALUES (?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), productId, specs[i].label, specs[i].value, i)
      .run();
  }
}
```
> `writeImagesAndSpecs` `products.ts` faylining pastida (export qilinmagan) yordamchi sifatida qo'shiladi va `[id].ts` PUT'da qayta ishlatish uchun **eksport** qilinadi: `export async function writeImagesAndSpecs(...)`. `products.ts`da uni `export` bilan e'lon qiling.

- [x] **Step 3: Update (PUT) — yangi maydonlar + images/specs qayta yozish**

`functions/api/admin/products/[id].ts` importiga qo'shing:
```ts
import { writeImagesAndSpecs } from '../products';
```
`onRequestPut` ичидаги UPDATE va undan keyingi qismni quyidagiga almashtiring (validatsiya bloki o'zgarmaydi):
```ts
  await env.DB.prepare(
    `UPDATE products SET name=?, category=?, condition=?, condition_note=?, cash_price_uzs=?, image_url=?, sort_order=?, is_active=?, category_id=?, old_price_uzs=?, description=? WHERE id=?`,
  )
    .bind(
      input.name,
      input.category,
      input.condition,
      input.conditionNote,
      input.cashPriceUzs,
      input.imageUrl,
      input.sortOrder,
      input.isActive ? 1 : 0,
      input.categoryId,
      input.oldPriceUzs,
      input.description,
      id,
    )
    .run();
  await writeImagesAndSpecs(env, id, input.images, input.specs);
  const row = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<ProductRow>();
  if (!row) return json({ error: 'not_found' }, { status: 404 });
  return json(rowToProduct(row));
};
```
> DELETE handler'ga (mahsulot o'chirilганда galereya/specs orphan qolmasligi uchun) qo'shing — mavjud `DELETE FROM products` dan oldin:
```ts
  await env.DB.prepare('DELETE FROM product_images WHERE product_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM product_specs WHERE product_id = ?').bind(id).run();
```

- [x] **Step 4: Lint, test, build**

Run:
```bash
bun run lint && bun run test && bun run build
```
Expected: xatosiz; 10/10 test.

- [x] **Step 5: Commit**

```bash
git add functions/lib/validate.ts functions/api/admin/products.ts "functions/api/admin/products/[id].ts"
git commit -m "feat: admin product write with category, discount, gallery and specs"
```

---

## Self-Review

**Spec coverage (Storefront A spec §3–4, §6):** Migratsiya (§3) — Task 1. Api tiplar + mapperlar (§4) — Task 2. Ommaviy API categories/query/detail (§4) — Task 3. Admin kategoriya CRUD (§6) — Task 4. Boyitilgan mahsulot yozish: images/specs/category/oldPrice/description (§6) — Task 5. Frontend sahifalar (§5) va admin UI (§6 UI) — **A2/A3 rejalarida** (qamrovdan tashqari).

**Placeholder scan:** TODO/TBD yo'q; barcha SQL/TS to'liq.

**Type consistency:** `ApiProduct` (categoryId/oldPriceUzs) ↔ `ProductRow` (category_id/old_price_uzs) `rowToProduct`da mos. `ApiProductDetail` (images/specs/description) `buildProductDetail`da yig'iladi. `ProductInput` kengaytmasi (images/specs/description/categoryId/oldPriceUzs) `parseProductInput` va INSERT/UPDATE bind'lari bilan mos. `writeImagesAndSpecs` `products.ts`da eksport, `[id].ts`da import.

**Eslatma:** `category` (eski matn ustuni) hamon majburiy — admin forma A3'da uni yubormasa 400 bermasligi uchun A3 `ProductForm` uni saqlaydi (yoki `category`ni `category_id`dan kelib chiqib to'ldiradi). A3 rejasida hisobga olinadi.
