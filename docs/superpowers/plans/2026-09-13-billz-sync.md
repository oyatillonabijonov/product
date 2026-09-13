# Billz sinxronizatsiyasi — amalga oshirish rejasi

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Billz katalogi (tovar, narx, qoldiq, rasm) saytga bir yo'nalishda, avtomatik va admin tugmasi bilan sinxronlanadi; Billz'ga hech narsa yozilmaydi.

**Architecture:** Sof moslashtirish va Billz tiplari `shared/billz.ts`da (testli); runner `server/billz-sync.ts` (qulf + rejalashtirgich, `Env` orqali SQL/rasm); `server/index.ts` runner'ni yaratib route'larga `context.billz` sifatida beradi; admin route `api/admin/billz` holat/ishga tushirish/do'konlar; admin UI — token+do'kon (SiteConfigForm), holat paneli (BillzPanel), "Rasm kerak" belgisi (ProductList).

**Tech Stack:** Node 22 (`fetch`, type-stripping), Express + React Router v7, SQLite (`Env.DB`), disk `ImageStore`, vitest.

**Spec:** `docs/superpowers/specs/2026-09-13-billz-sync-design.md`

## Global Constraints

- Billz'ga faqat `POST /v1/auth/login` va `GET` so'rovlar. Yozuvchi endpoint kodda bo'lmaydi.
- API chegarasi 2 so'rov/s → so'rovlar orasida ≥ 500 ms; `429` → 2 s kutib qayta, ≤ 3 marta.
- Sirlar faqat `site_config`da; `billz_secret_token` `publicSiteConfig`da bo'shatiladi; env var yo'q.
- Rasm yuklab olish: faqat `https:`, host `fra1.digitaloceanspaces.com`, `redirect: 'manual'`, ≤ 5 MB, `content-type` `image/*`.
- Docker `functions/`ni tashimaydi → `server/` faqat `server/` va `shared/`dan import qiladi.
- Strict TypeScript, `any` yo'q; `bun run lint` va `bun run test` har commit'dan oldin toza.
- Commit formati `feat:`/`fix:`/`chore:`/`docs:`, xabar o'zbekcha, oxirida `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Har sinxronizatsiyada qayta yoziladigan ustunlar: `name, category, cash_price_uzs, old_price_uzs, brand_id, category_id, type, description, billz_stock, is_active, product_specs` (+ `image_url`/`product_images` faqat Billz'da rasm bo'lsa). Tegilmaydi: `slug, condition, condition_note, sort_order, rating_avg, review_count, created_at`.

---

### Task 1: Migratsiya 0029, tiplar, mapper'lar, site-config maydonlari

**Files:**
- Create: `migrations/0029_billz.sql`
- Modify: `shared/types.ts` (ApiProduct, ApiSiteConfig)
- Modify: `functions/lib/db.ts` (ProductRow/rowToProduct, SiteConfigRow/rowToSiteConfig)
- Modify: `functions/lib/validate.ts` (ProductInput Omit, parseSiteConfigInput)
- Modify: `app/routes/api.admin.site-config.tsx` (UPDATE)
- Modify: `app/lib/loaders.ts` (publicSiteConfig, staticSiteConfigAsApi)
- Test: `functions/lib/validate.test.ts`

**Interfaces:**
- Produces: `ApiProduct.billzId: string | null`, `ApiProduct.billzStock: number | null`; `ApiSiteConfig.billzSecretToken`, `billzShopId`, `billzLastSync` (string, JSON yoki `''`).

- [ ] **Step 1: Migratsiya**

`migrations/0029_billz.sql`:
```sql
-- Billz (billz.io) integratsiyasi — faqat o'qish sinxronizatsiyasi.
-- Sozlamalar site_config'da (token SIR), tovar bog'lanishi products.billz_id.
ALTER TABLE site_config ADD COLUMN billz_secret_token TEXT NOT NULL DEFAULT '';
ALTER TABLE site_config ADD COLUMN billz_shop_id      TEXT NOT NULL DEFAULT '';
ALTER TABLE site_config ADD COLUMN billz_last_sync    TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN billz_id    TEXT;
ALTER TABLE products ADD COLUMN billz_stock INTEGER;
CREATE UNIQUE INDEX idx_products_billz_id ON products(billz_id) WHERE billz_id IS NOT NULL;
```
Run: `bun run migrate` → `✓ 0029_billz.sql`.

- [ ] **Step 2: Testni yozish (validate)**

`functions/lib/validate.test.ts`, `describe('parseSiteConfigInput')` ichiga:
```ts
  it('billz maydonlari: token trim, billzLastSync body\'dan kelmaydi', () => {
    const c = parseSiteConfigInput({ name: 'Store', phone: '+998900000000', billzSecretToken: ' abc ', billzShopId: 'shop-1', billzLastSync: '{"ok":true}' });
    expect(c.billzSecretToken).toBe('abc');
    expect(c.billzShopId).toBe('shop-1');
    expect(c.billzLastSync).toBe('');
  });
```
Run: `bunx vitest run functions/lib/validate.test.ts` → FAIL (maydonlar `undefined`).

- [ ] **Step 3: Tiplar va mapper'lar**

`shared/types.ts` — `ApiProduct`ga (`reviewCount`dan keyin):
```ts
  /** Billz tovar UUID'si — sinxronizatsiya bog'lanishi; qo'lda kiritilgan mahsulotda `null`. */
  billzId: string | null;
  /** Billz'dagi qoldiq (tanlangan do'kon); qo'lda kiritilganda `null`. */
  billzStock: number | null;
```
`ApiSiteConfig`ga (`yandexMetricaId`dan keyin):
```ts
  /** Billz integratsiya kaliti. SIR. */
  billzSecretToken: string;
  /** Billz do'koni (shop UUID) — narx va qoldiq shu do'kondan. */
  billzShopId: string;
  /** Oxirgi sinxronizatsiya natijasi (JSON) — server yozadi, admin o'qiydi. */
  billzLastSync: string;
```
`functions/lib/db.ts` — `ProductRow`ga `billz_id: string | null; billz_stock: number | null;`, `rowToProduct`ga `billzId: row.billz_id ?? null, billzStock: row.billz_stock ?? null,`. `SiteConfigRow`ga `billz_secret_token: string; billz_shop_id: string; billz_last_sync: string;`, `rowToSiteConfig`ga `billzSecretToken: r.billz_secret_token ?? '', billzShopId: r.billz_shop_id ?? '', billzLastSync: r.billz_last_sync ?? '',`.

`functions/lib/validate.ts`:
```ts
export type ProductInput = Omit<ApiProduct, 'id' | 'minPriceUzs' | 'billzId' | 'billzStock'> & {
```
(`billz_id` admin PUT'ida yozilmaydi — UPDATE ustunlar ro'yxati aniq.) `parseSiteConfigInput` return'iga:
```ts
    billzSecretToken: opt('billzSecretToken'),
    billzShopId: opt('billzShopId'),
    // Server mulki (runner yozadi) — body'dan kelmaydi.
    billzLastSync: '',
```
`app/routes/api.admin.site-config.tsx` UPDATE: `..., yandex_metrica_id=?, billz_secret_token=?, billz_shop_id=? WHERE id=1` va bind oxiriga `input.billzSecretToken, input.billzShopId`.

`app/lib/loaders.ts`: `publicSiteConfig` → `{ ...cfg, telegramBotToken: '', googleClientSecret: '', customerSessionSecret: '', billzSecretToken: '' }`; `staticSiteConfigAsApi()` literal'iga `billzSecretToken: '', billzShopId: '', billzLastSync: ''`.

`grep -rn "customerSessionSecret:" app src functions shared` — ApiSiteConfig literal yasaydigan boshqa joy bo'lsa (testlar) yangi maydonlarni qo'shing.

- [ ] **Step 4: Tekshirish**

Run: `bun run lint && bun run test` → toza, validate testi PASS.

- [ ] **Step 5: Commit**

```bash
git add migrations/0029_billz.sql shared/types.ts functions/lib/db.ts functions/lib/validate.ts functions/lib/validate.test.ts app/routes/api.admin.site-config.tsx app/lib/loaders.ts
git commit -m "feat(billz): migratsiya 0029 — site_config token/do'kon, products.billz_id"
```

---

### Task 2: `imagesAndSpecsStatements` → `shared/product-statements.ts`, `ImageStore.has`

**Files:**
- Create: `shared/product-statements.ts`
- Modify: `functions/lib/db.ts` (funksiya o'chadi, re-export qoladi)
- Modify: `shared/runtime.ts`, `server/images.ts`

**Interfaces:**
- Produces: `specsStatements(env, productId, specs)`, `imagesStatements(env, productId, images)`, `imagesAndSpecsStatements(env, productId, images, specs)` — hammasi `SqlStatement[]`; `ImageStore.has(key): Promise<boolean>`.

- [ ] **Step 1: shared/product-statements.ts**

```ts
import type { Env, SqlStatement } from './runtime';

/**
 * Mahsulotning rasm va xususiyat qatorlari — replace-all builder'lar.
 * `shared/`da turadi: admin route'lar (`functions/`) ham, Billz sinxronizatsiyasi
 * (`server/`, Docker'da `functions/` yo'q) ham bitta SQL'ni ishlatadi.
 */
export function specsStatements(env: Env, productId: string, specs: { label: string; value: string }[]): SqlStatement[] {
  const stmts: SqlStatement[] = [env.DB.prepare('DELETE FROM product_specs WHERE product_id = ?').bind(productId)];
  for (let i = 0; i < specs.length; i++) {
    stmts.push(
      env.DB.prepare('INSERT INTO product_specs (id, product_id, label, value, sort_order) VALUES (?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), productId, specs[i].label, specs[i].value, i),
    );
  }
  return stmts;
}

export function imagesStatements(env: Env, productId: string, images: string[]): SqlStatement[] {
  const stmts: SqlStatement[] = [env.DB.prepare('DELETE FROM product_images WHERE product_id = ?').bind(productId)];
  for (let i = 0; i < images.length; i++) {
    stmts.push(
      env.DB.prepare('INSERT INTO product_images (id, product_id, image_url, sort_order) VALUES (?, ?, ?, ?)')
        .bind(crypto.randomUUID(), productId, images[i], i),
    );
  }
  return stmts;
}

export function imagesAndSpecsStatements(
  env: Env, productId: string, images: string[], specs: { label: string; value: string }[],
): SqlStatement[] {
  return [...imagesStatements(env, productId, images), ...specsStatements(env, productId, specs)];
}
```
`functions/lib/db.ts`: eski `imagesAndSpecsStatements` tanasi o'chadi, o'rniga `export { imagesAndSpecsStatements } from '../../shared/product-statements';` (chaqiruvchilar o'zgarmaydi).

- [ ] **Step 2: ImageStore.has**

`shared/runtime.ts` `ImageStore`ga: `/** Fayl bormi — sinxronizatsiya rasmni qayta yuklamaslik uchun. */ has(key: string): Promise<boolean>;`
`server/images.ts` `openImageStore` qaytaradigan obyektga: `async has(key) { const file = pathFor(dir, key); return file !== null && existsSync(file); },`.

- [ ] **Step 3: Tekshirish va commit**

Run: `bun run lint && bun run test` → toza (DELETE/INSERT tartibi eski bilan bir xil: rasm DELETE, spec DELETE, rasm INSERT'lar, spec INSERT'lar — tartib farqi natijaga ta'sir qilmaydi).
```bash
git add shared/product-statements.ts shared/runtime.ts server/images.ts functions/lib/db.ts
git commit -m "chore: rasm/xususiyat statement builder'lari shared/ga, ImageStore.has"
```

---

### Task 3: Tur registri — Billz aliaslari

**Files:**
- Modify: `shared/product-types.ts`
- Modify: `vitest.config.ts` (`'shared/**/*.test.ts'` include'ga)
- Test: `shared/product-types.test.ts`

**Interfaces:**
- Produces: `ProductType.billz?: string[]`; `typeForBillzCategory(categoryId: string | null, billzName: string): string | null`.

- [ ] **Step 1: vitest include** — `include: ['src/**/*.test.ts', 'functions/**/*.test.ts', 'app/**/*.test.ts', 'shared/**/*.test.ts']`.

- [ ] **Step 2: Test**

`shared/product-types.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { typeForBillzCategory } from './product-types';

describe('typeForBillzCategory', () => {
  it('label va alias, katta-kichik harfsiz', () => {
    expect(typeForBillzCategory('apple', 'iPhone')).toBe('iphone');
    expect(typeForBillzCategory('apple', 'Air Pods')).toBe('airpods');
    expect(typeForBillzCategory('pc', 'ddr5')).toBe('ram');
    expect(typeForBillzCategory('pc', 'PC Case')).toBe('korpus');
  });
  it('bir nom yo\'nalishga qarab boshqa turga tushadi', () => {
    expect(typeForBillzCategory('apple', 'Case')).toBe('aksessuar');
    expect(typeForBillzCategory('pc', 'Case')).toBe('korpus');
  });
  it('noma\'lum nom yoki yo\'nalish → null', () => {
    expect(typeForBillzCategory('pc', 'Glasspad Deluxe')).toBeNull();
    expect(typeForBillzCategory(null, 'iPhone')).toBeNull();
  });
});
```
Run: `bunx vitest run shared/product-types.test.ts` → FAIL (funksiya yo'q).

- [ ] **Step 3: Aliaslar va funksiya**

`ProductType`ga `/** Billz kategoriya nomlari (katta-kichik harfsiz) — sinxronizatsiya shu orqali turga tushadi. */ billz?: string[];`. Har yozuvga spec §6 jadvalidagi ro'yxat, masalan:
```ts
    { id: 'ipad', label: 'iPad', labelRu: 'iPad', billz: ['iPad Pro', 'iPad Air', 'iPad mini'] },
    { id: 'macbook', label: 'MacBook', labelRu: 'MacBook', billz: ['MacBook Pro', 'MacBook Air'] },
    { id: 'mac-mini', label: 'Mac mini', labelRu: 'Mac mini', billz: ['Mac Studio', 'Mac Pro'] },
    { id: 'apple-watch', label: 'Apple Watch', labelRu: 'Apple Watch', billz: ['iWatch', 'Watch'] },
    { id: 'airpods', label: 'AirPods', labelRu: 'AirPods', billz: ['Air Pods'] },
    { id: 'aksessuar', label: 'Aksessuar', labelRu: 'Аксессуары', billz: ['Phone Case', 'Case', 'Cable', 'Glass', 'Charger', 'Adapter', 'Bag', 'Trackpad', 'Keyboard', 'Mouse', 'Magic Mouse', 'Magic Keyboard', 'Pencil', 'HUB', 'Kronshteyn', 'Combo', 'Speaker', 'Headset', 'Mousepad', 'Apple TV', 'Chair'] },
```
pc: `noutbuk: ['Laptop','Notebook']`, `tayyor-pc: ['PC','Monoblock','Mini PC']`, `cpu: ['Processor']`, `gpu: ['Videokarta','Video Card']`, `ram: ['DDR4','DDR5']`, `xotira: ['SSD','SSD M2','SSD M.2','NVMe','HDD','External SSD','External HDD']`, `korpus: ['PC Case','Case']`, `psu: ['Power Supply']`, `sovutish: ['Liquid Cooler','CPU Cooler','Cooler','Fan','Fans']`, `aksessuar: ['Mouse','Keyboard','Mousepad','Glasspad','Headset','Speaker','Cable','HUB','Kronshteyn','Combo','Chair','Bag','Webcam','Microphone','Glass']`. (`label`ning o'zi ham mos keladi — `iPhone`, `CPU`, `GPU`, `Motherboard`, `Monitor`, `Noutbuk`, `iMac` uchun alias shart emas.)

```ts
/** Billz kategoriya nomi → shu yo'nalishdagi tur id'si; mos kelmasa `null`. */
export function typeForBillzCategory(categoryId: string | null, billzName: string): string | null {
  const needle = billzName.trim().toLowerCase();
  if (!needle) return null;
  for (const t of typesFor(categoryId)) {
    if (t.label.toLowerCase() === needle) return t.id;
    if (t.billz?.some((a) => a.toLowerCase() === needle)) return t.id;
  }
  return null;
}
```

- [ ] **Step 4: Tekshirish va commit**

Run: `bun run lint && bun run test` → PASS.
```bash
git add shared/product-types.ts shared/product-types.test.ts vitest.config.ts
git commit -m "feat(billz): tur registriga Billz kategoriya aliaslari"
```

---

### Task 4: `shared/billz.ts` — Billz tiplari, sof yordamchilar, moslashtirish

**Files:**
- Create: `shared/billz.ts`
- Test: `shared/billz.test.ts`

**Interfaces:**
- Produces (runner va admin ishlatadi):
  - `BILLZ_BASE = 'https://api-admin.billz.ai'`, `BILLZ_CDN_HOSTS: string[]`, `BILLZ_PAGE_SIZE = 200`
  - `productsUrl(page: number, since?: string): string`, `utcStamp(d: Date): string` → `'YYYY-MM-DD HH:MM:SS'`
  - `interface BillzProduct`, `BillzProductsPage {count; products}`, `BillzShop {id; name}`
  - `toUzs(amount: number, currency: string, rate: number): number | null`
  - `htmlToText(html: string): string`, `asciiSlug(s: string): string`, `photoKey(url: string): string | null`
  - `hiddenIds(dbIds: Iterable<string>, seen: ReadonlySet<string>): string[]`
  - `interface MapContext { shopId; usdToUzs; categoryIds: ReadonlySet<string>; brandsByName: ReadonlyMap<string, string>; existingImage: string | null }`
  - `interface MappedProduct { billzId; name; slug; categoryId; legacyCategory; type; brandId; newBrand; cashPriceUzs; oldPriceUzs; stock; description; specs; photos: {url; key}[]; imageUrl; gallery: string[]; isActive }`
  - `mapBillzProduct(raw: BillzProduct, ctx: MapContext): MappedProduct | null`
  - `interface BillzSyncResult { at; mode: 'full' | 'delta'; ok; count; seen; inserted; updated; hidden; photos; skipped; error?: string; note?: string }`, `interface BillzSyncStatus { configured; running; last: BillzSyncResult | null }`

- [ ] **Step 1: Test**

`shared/billz.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { toUzs, htmlToText, asciiSlug, photoKey, hiddenIds, productsUrl, utcStamp, mapBillzProduct, type BillzProduct, type MapContext } from './billz';

const SHOP = 'shop-1';
const ctx: MapContext = {
  shopId: SHOP, usdToUzs: 12600,
  categoryIds: new Set(['apple', 'pc', 'audio', 'video']),
  brandsByName: new Map([['apple', 'apple'], ['asus', 'asus']]),
  existingImage: null,
};
const raw = (over: Partial<BillzProduct> = {}): BillzProduct => ({
  id: '2ce40c63-4527-4898-a975-7c30c255fd50', name: 'iPhone 17 Pro 256GB Cosmic Orange', brand_name: 'Apple',
  categories: [{ id: 'c1', name: 'iPhone' }], description: '', updated_at: '2026-09-09 21:22:28',
  main_image_url_full: '', photos: [],
  custom_fields: [
    { custom_field_name: 'Nad Kategoriya', custom_field_value: 'Apple' },
    { custom_field_name: 'Память', custom_field_value: '256GB' },
    { custom_field_name: 'Цвет', custom_field_value: 'Cosmic Orange' },
    { custom_field_name: 'Состояние', custom_field_value: 'A19 Pro' },
    { custom_field_name: 'Postavshik', custom_field_value: 'YATT' },
  ],
  product_attributes: [],
  shop_prices: [{ shop_id: SHOP, retail_price: 1497, retail_currency: 'USD', promo_price: 0 }],
  shop_measurement_values: [{ shop_id: SHOP, active_measurement_value: 3 }],
  ...over,
});
const CDN = 'https://fra1.digitaloceanspaces.com/billz2-minio-billz/7b57f5e0-c9c7-44f3-9f58-93f1a9564b11.jpg';

describe('yordamchilar', () => {
  it('toUzs: USD kurs bilan 1000 ga yaxlitlanadi, UZS yaxlitlanadi, boshqasi null', () => {
    expect(toUzs(1497, 'USD', 12600)).toBe(18862000);
    expect(toUzs(710, 'USD', 12600)).toBe(8946000);
    expect(toUzs(1234567, 'UZS', 12600)).toBe(1235000);
    expect(toUzs(10, 'EUR', 12600)).toBeNull();
    expect(toUzs(0, 'USD', 12600)).toBeNull();
  });
  it('htmlToText: Lexical HTML → matn', () => {
    expect(htmlToText('<p class="x" dir="ltr"><span>Salom&nbsp;dunyo</span></p><p>Ikki<br>uch</p><p></p><p></p><p>&amp;</p>')).toBe('Salom dunyo\nIkki\nuch\n\n&');
    expect(htmlToText('<p></p>')).toBe('');
  });
  it('asciiSlug', () => {
    expect(asciiSlug('iPhone 17 Pro 256GB / Cosmic Orange')).toBe('iphone-17-pro-256gb-cosmic-orange');
    expect(asciiSlug('Клавиатура')).toBe('');
  });
  it('photoKey: faqat CDN host, uuid nomi, ruxsat etilgan kengaytma', () => {
    expect(photoKey(CDN)).toBe('products/billz-7b57f5e0-c9c7-44f3-9f58-93f1a9564b11.jpg');
    expect(photoKey('https://fra1.digitaloceanspaces.com/b/x.gif')).toBeNull();
    expect(photoKey('https://evil.example/7b57f5e0-c9c7-44f3-9f58-93f1a9564b11.jpg')).toBeNull();
    expect(photoKey('http://fra1.digitaloceanspaces.com/b/7b57f5e0-c9c7-44f3-9f58-93f1a9564b11.jpg')).toBeNull();
    expect(photoKey('https://fra1.digitaloceanspaces.com/b/photo one.png')).toMatch(/^products\/billz-[0-9a-f]{8}\.png$/);
  });
  it('hiddenIds: bazada bor, Billz\'da ko\'rinmaganlar', () => {
    expect(hiddenIds(['a', 'b', 'c'], new Set(['b']))).toEqual(['a', 'c']);
  });
  it('productsUrl va utcStamp', () => {
    expect(productsUrl(2)).toBe('https://api-admin.billz.ai/v2/products?limit=200&page=2');
    expect(productsUrl(1, '2026-09-13 10:00:00')).toBe('https://api-admin.billz.ai/v2/products?limit=200&page=1&last_updated_date=2026-09-13%2010%3A00%3A00');
    expect(utcStamp(new Date(Date.UTC(2026, 8, 13, 7, 5, 9)))).toBe('2026-09-13 07:05:09');
  });
});

describe('mapBillzProduct', () => {
  it('to\'liq namuna', () => {
    const m = mapBillzProduct(raw({ photos: [
      { photo_url: 'https://fra1.digitaloceanspaces.com/b/aaaaaaaa-0000-0000-0000-000000000002.jpg', sequence: 1, is_main: false },
      { photo_url: 'https://fra1.digitaloceanspaces.com/b/aaaaaaaa-0000-0000-0000-000000000001.jpg', sequence: 0, is_main: true },
    ] }), ctx);
    expect(m).not.toBeNull();
    expect(m?.billzId).toBe('2ce40c63-4527-4898-a975-7c30c255fd50');
    expect(m?.slug).toBe('iphone-17-pro-256gb-cosmic-orange-2ce40c63');
    expect(m?.categoryId).toBe('apple');
    expect(m?.legacyCategory).toBe('iphone');
    expect(m?.type).toBe('iphone');
    expect(m?.brandId).toBe('apple');
    expect(m?.newBrand).toBeNull();
    expect(m?.cashPriceUzs).toBe(18862000);
    expect(m?.oldPriceUzs).toBeNull();
    expect(m?.stock).toBe(3);
    expect(m?.description).toBeNull();
    expect(m?.specs).toEqual([{ label: 'Xotira', value: '256GB' }, { label: 'Rang', value: 'Cosmic Orange' }, { label: 'Chip', value: 'A19 Pro' }]);
    expect(m?.photos.map((p) => p.key)).toEqual(['products/billz-aaaaaaaa-0000-0000-0000-000000000001.jpg', 'products/billz-aaaaaaaa-0000-0000-0000-000000000002.jpg']);
    expect(m?.imageUrl).toBe('/images/products/billz-aaaaaaaa-0000-0000-0000-000000000001.jpg');
    expect(m?.gallery).toEqual(['/images/products/billz-aaaaaaaa-0000-0000-0000-000000000002.jpg']);
    expect(m?.isActive).toBe(true);
  });
  it('promo: chegirma narx + eski narx', () => {
    const m = mapBillzProduct(raw({ shop_prices: [{ shop_id: SHOP, retail_price: 1000, retail_currency: 'USD', promo_price: 900 }] }), ctx);
    expect(m?.cashPriceUzs).toBe(11340000);
    expect(m?.oldPriceUzs).toBe(12600000);
  });
  it('yo\'nalish katta-kichik harfsiz, noma\'lum → null; tur yo\'nalishsiz null', () => {
    expect(mapBillzProduct(raw({ custom_fields: [{ custom_field_name: 'Nad Kategoriya', custom_field_value: 'Pc' }], categories: [{ id: 'c', name: 'DDR5' }] }), ctx)?.type).toBe('ram');
    const m = mapBillzProduct(raw({ custom_fields: [{ custom_field_name: 'Nad Kategoriya', custom_field_value: 'Gaming' }] }), ctx);
    expect(m?.categoryId).toBeNull();
    expect(m?.type).toBeNull();
    expect(m?.legacyCategory).toBe('pc');
  });
  it('yangi brend', () => {
    const m = mapBillzProduct(raw({ brand_name: 'ADAM Audio' }), ctx);
    expect(m?.brandId).toBe('adam-audio');
    expect(m?.newBrand).toEqual({ id: 'adam-audio', name: 'ADAM Audio' });
    expect(mapBillzProduct(raw({ brand_name: '' }), ctx)?.brandId).toBeNull();
  });
  it('rasm yo\'q: admin rasmi saqlanadi, ko\'rinish rasmga bog\'liq', () => {
    expect(mapBillzProduct(raw(), ctx)?.imageUrl).toBe('');
    expect(mapBillzProduct(raw(), ctx)?.isActive).toBe(false);
    const kept = mapBillzProduct(raw(), { ...ctx, existingImage: '/images/products/admin.webp' });
    expect(kept?.imageUrl).toBe('/images/products/admin.webp');
    expect(kept?.isActive).toBe(true);
    expect(mapBillzProduct(raw({ shop_measurement_values: [{ shop_id: SHOP, active_measurement_value: 0 }] }), { ...ctx, existingImage: '/x.jpg' })?.isActive).toBe(false);
  });
  it('do\'kon narxi yo\'q / nom bo\'sh → null', () => {
    expect(mapBillzProduct(raw({ shop_prices: [{ shop_id: 'other', retail_price: 1, retail_currency: 'USD', promo_price: 0 }] }), ctx)).toBeNull();
    expect(mapBillzProduct(raw({ name: '  ' }), ctx)).toBeNull();
  });
  it('tavsif HTML → matn; product_attributes rangi custom field bo\'lmasa qo\'shiladi; bo\'sh qiymatlar tashlanadi', () => {
    const m = mapBillzProduct(raw({
      description: '<p>Yaxshi <b>telefon</b></p>',
      custom_fields: [{ custom_field_name: 'Nad Kategoriya', custom_field_value: 'Apple' }, { custom_field_name: 'Память', custom_field_value: '___' }],
      product_attributes: [{ attribute_name: 'Цвет', attribute_value: 'Black' }],
    }), ctx);
    expect(m?.description).toBe('Yaxshi telefon');
    expect(m?.specs).toEqual([{ label: 'Rang', value: 'Black' }]);
  });
});
```
Run: `bunx vitest run shared/billz.test.ts` → FAIL (modul yo'q).

- [ ] **Step 2: Implementatsiya**

`shared/billz.ts`:
```ts
import { typeForBillzCategory } from './product-types';

/**
 * Billz (billz.io) — faqat o'qish. Bu fayl sof: tarmoq va baza yo'q, shuning
 * uchun to'liq testlanadi. Runner (`server/billz-sync.ts`) shu qoidalarni
 * ishlatadi, admin (`src/admin`) tiplarni.
 */
export const BILLZ_BASE = 'https://api-admin.billz.ai';
/** Rasm faqat shu hostlardan yuklanadi (SSRF'ga yo'l yo'q). */
export const BILLZ_CDN_HOSTS = ['fra1.digitaloceanspaces.com'];
export const BILLZ_PAGE_SIZE = 200;

export interface BillzPhoto { photo_url: string; sequence: number; is_main: boolean }
export interface BillzShopPrice { shop_id: string; retail_price: number; retail_currency: string; promo_price: number }
export interface BillzShopStock { shop_id: string; active_measurement_value: number }
export interface BillzProduct {
  id: string;
  name: string;
  brand_name: string;
  categories: { id: string; name: string }[] | null;
  description: string | null;
  updated_at: string;
  main_image_url_full: string;
  photos: BillzPhoto[] | null;
  custom_fields: { custom_field_name: string; custom_field_value: string }[] | null;
  product_attributes: { attribute_name: string; attribute_value: string }[] | null;
  shop_prices: BillzShopPrice[] | null;
  shop_measurement_values: BillzShopStock[] | null;
}
export interface BillzProductsPage { count: number; products: BillzProduct[] }
export interface BillzShop { id: string; name: string }

export interface BillzSyncResult {
  at: string; mode: 'full' | 'delta'; ok: boolean;
  count: number; seen: number; inserted: number; updated: number; hidden: number; photos: number; skipped: number;
  error?: string; note?: string;
}
export interface BillzSyncStatus { configured: boolean; running: boolean; last: BillzSyncResult | null }

export function productsUrl(page: number, since?: string): string {
  const u = new URL('/v2/products', BILLZ_BASE);
  u.searchParams.set('limit', String(BILLZ_PAGE_SIZE));
  u.searchParams.set('page', String(page));
  if (since) u.searchParams.set('last_updated_date', since);
  return u.toString();
}

/** Billz kutadigan UTC vaqt: `YYYY-MM-DD HH:MM:SS`. */
export function utcStamp(d: Date): string {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

/** Billz narxi → so'm, 1 000 ga yaxlitlab. Noma'lum valyuta yoki nol → null. */
export function toUzs(amount: number, currency: string, rate: number): number | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const uzs = currency === 'USD' ? amount * rate : currency === 'UZS' ? amount : NaN;
  if (!Number.isFinite(uzs)) return null;
  return Math.round(uzs / 1000) * 1000;
}

/** Rich-editor HTML → oddiy matn (`ProductPage` `whitespace-pre-line` bilan ko'rsatadi). */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function asciiSlug(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const PHOTO_EXT = new Set(['jpg', 'jpeg', 'png', 'webp']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

/** CDN URL → ombor kaliti (`products/billz-<uuid>.<ext>`); yaroqsiz URL → null. */
export function photoKey(url: string): string | null {
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== 'https:' || !BILLZ_CDN_HOSTS.includes(u.hostname)) return null;
  const base = decodeURIComponent(u.pathname.split('/').pop() ?? '');
  const dot = base.lastIndexOf('.');
  if (dot < 0) return null;
  const ext = base.slice(dot + 1).toLowerCase();
  if (!PHOTO_EXT.has(ext)) return null;
  const stem = base.slice(0, dot);
  const name = UUID.test(stem) ? stem.toLowerCase() : fnv1a(url);
  return `products/billz-${name}.${ext}`;
}

/** Bazada Billz'dan kelgan, lekin to'liq sinxronizatsiyada ko'rinmagan tovarlar. */
export function hiddenIds(dbIds: Iterable<string>, seen: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const id of dbIds) if (!seen.has(id)) out.push(id);
  return out;
}

export interface MapContext {
  shopId: string;
  usdToUzs: number;
  categoryIds: ReadonlySet<string>;
  /** kichik harfli brend nomi → brand id */
  brandsByName: ReadonlyMap<string, string>;
  /** Saytdagi joriy rasm (admin yuklagan bo'lishi mumkin) — Billz'da rasm bo'lmasa saqlanadi. */
  existingImage: string | null;
}

export interface MappedProduct {
  billzId: string;
  name: string;
  slug: string;
  categoryId: string | null;
  legacyCategory: 'iphone' | 'ipad' | 'mac' | 'pc';
  type: string | null;
  brandId: string | null;
  newBrand: { id: string; name: string } | null;
  cashPriceUzs: number;
  oldPriceUzs: number | null;
  stock: number;
  description: string | null;
  specs: { label: string; value: string }[];
  /** Billz rasmlari, asosiysi birinchi; bo'sh bo'lsa saytdagi rasm qoladi. */
  photos: { url: string; key: string }[];
  imageUrl: string;
  gallery: string[];
  isActive: boolean;
}

const SPEC_LABELS: Record<string, string> = { 'Память': 'Xotira', 'Цвет': 'Rang', 'Состояние': 'Chip' };
const JUNK = /^[\s_—–-]*$/;

export function mapBillzProduct(raw: BillzProduct, ctx: MapContext): MappedProduct | null {
  const name = (raw.name ?? '').trim();
  if (!name) return null;
  const price = raw.shop_prices?.find((p) => p.shop_id === ctx.shopId);
  if (!price) return null;
  const retail = toUzs(price.retail_price, price.retail_currency, ctx.usdToUzs);
  if (retail === null) return null;
  const promo = price.promo_price > 0 ? toUzs(price.promo_price, price.retail_currency, ctx.usdToUzs) : null;
  const cashPriceUzs = promo ?? retail;
  const oldPriceUzs = promo !== null ? retail : null;

  const stockRow = raw.shop_measurement_values?.find((m) => m.shop_id === ctx.shopId);
  const stock = Math.max(0, Math.floor(stockRow?.active_measurement_value ?? 0));

  const fields = raw.custom_fields ?? [];
  const field = (n: string) => fields.find((f) => f.custom_field_name === n)?.custom_field_value ?? '';
  const dir = field('Nad Kategoriya').trim().toLowerCase();
  const categoryId = ctx.categoryIds.has(dir) ? dir : null;
  const type = categoryId ? typeForBillzCategory(categoryId, raw.categories?.[0]?.name ?? '') : null;
  const legacyCategory: MappedProduct['legacyCategory'] =
    categoryId === 'apple' ? (type === 'iphone' ? 'iphone' : type === 'ipad' ? 'ipad' : 'mac') : 'pc';

  const brandName = (raw.brand_name ?? '').trim();
  let brandId: string | null = null;
  let newBrand: MappedProduct['newBrand'] = null;
  if (brandName) {
    brandId = ctx.brandsByName.get(brandName.toLowerCase()) ?? null;
    if (!brandId) { brandId = asciiSlug(brandName) || 'brand'; newBrand = { id: brandId, name: brandName }; }
  }

  const specs: { label: string; value: string }[] = [];
  for (const f of fields) {
    const label = SPEC_LABELS[f.custom_field_name];
    const value = (f.custom_field_value ?? '').trim();
    if (label && !JUNK.test(value)) specs.push({ label, value });
  }
  if (!specs.some((s) => s.label === 'Rang')) {
    const color = raw.product_attributes?.find((a) => a.attribute_name === 'Цвет')?.attribute_value?.trim();
    if (color && !JUNK.test(color)) specs.push({ label: 'Rang', value: color });
  }

  const photos = [...(raw.photos ?? [])]
    .sort((a, b) => Number(b.is_main) - Number(a.is_main) || a.sequence - b.sequence)
    .flatMap((p) => { const key = photoKey(p.photo_url); return key ? [{ url: p.photo_url, key }] : []; });
  const imageUrl = photos[0] ? `/images/${photos[0].key}` : (ctx.existingImage ?? '');
  const gallery = photos.slice(1).map((p) => `/images/${p.key}`);
  const description = htmlToText(raw.description ?? '') || null;

  return {
    billzId: raw.id, name, slug: `${asciiSlug(name) || 'tovar'}-${raw.id.slice(0, 8)}`,
    categoryId, legacyCategory, type, brandId, newBrand,
    cashPriceUzs, oldPriceUzs, stock, description, specs, photos, imageUrl, gallery,
    isActive: stock > 0 && imageUrl !== '',
  };
}
```
Run: `bunx vitest run shared/billz.test.ts` → PASS (bir-ikkita kutilgan qiymat farq qilsa — masalan `toUzs(710,'USD',12600)` = 8 946 000 — testdagi sonni hisoblab tuzating, mantiqni emas).

- [ ] **Step 3: Commit**

```bash
bun run lint && bun run test
git add shared/billz.ts shared/billz.test.ts
git commit -m "feat(billz): sof moslashtirish — narx, yo'nalish, tur, brend, rasm kalitlari"
```

---

### Task 5: Runner `server/billz-sync.ts`, `server/index.ts`, load context

**Files:**
- Create: `server/billz-sync.ts`
- Modify: `server/index.ts`, `app/load-context.d.ts`

**Interfaces:**
- Consumes: `shared/billz.ts` (Task 4), `shared/product-statements.ts` + `ImageStore.has` (Task 2), ustunlar (Task 1).
- Produces: `createBillzSync(env: Env): BillzSyncHandle` — `{ status(): Promise<BillzSyncStatus>; run(mode: 'full' | 'delta'): Promise<'started' | 'sync_running' | 'not_configured'>; shops(): Promise<BillzShop[]>; start(): void }`; `context.billz` route'larda.

- [ ] **Step 1: Brands sxemasini tekshirish**

Run: `sqlite3 data/store.db ".schema brands"` — INSERT ustunlari shu bilan mos bo'lsin (kutilgan: `id, name, slug, logo_url, sort_order`).

- [ ] **Step 2: Runner**

`server/billz-sync.ts`:
```ts
import type { Env, SqlStatement } from '../shared/runtime';
import {
  BILLZ_BASE, productsUrl, utcStamp, hiddenIds, mapBillzProduct,
  type BillzProductsPage, type BillzShop, type BillzSyncResult, type BillzSyncStatus, type MapContext, type MappedProduct,
} from '../shared/billz';
import { imagesStatements, specsStatements } from '../shared/product-statements';

/**
 * Billz → sayt sinxronizatsiyasi (faqat o'qish).
 *
 * Bitta jarayonda bitta runner: rejalashtirgich ham, admin tugmasi ham shu
 * obyektni chaqiradi, `running` qulfi ikki run'ni bir vaqtda yurgizmaydi.
 * JWT diskka yozilmaydi (xotirada, 401 → qayta login). Delta kursori ham
 * xotirada — restart to'liq run bilan boshlanadi (o'chirilganlarni ham ushlaydi).
 */
export interface BillzSyncHandle {
  status(): Promise<BillzSyncStatus>;
  run(mode: 'full' | 'delta'): Promise<'started' | 'sync_running' | 'not_configured'>;
  shops(): Promise<BillzShop[]>;
  start(): void;
}

const DELTA_EVERY_MS = 30 * 60 * 1000;
const FULL_EVERY_MS = 6 * 60 * 60 * 1000;
const BOOT_DELAY_MS = 10 * 1000;
const MIN_GAP_MS = 500; // 2 so'rov/s
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_PARALLEL = 4;

interface Config { token: string; shopId: string; usdToUzs: number }

class BillzError extends Error {
  constructor(public code: string, message?: string) { super(message ?? code); }
}

export function createBillzSync(env: Env): BillzSyncHandle {
  let running = false;
  let jwt: { token: string; expiresAt: number } | null = null;
  let lastSyncedAt: string | null = null; // UTC 'YYYY-MM-DD HH:MM:SS'
  let lastRequestAt = 0;

  async function config(): Promise<Config | null> {
    const cfg = await env.DB.prepare('SELECT billz_secret_token AS token, billz_shop_id AS shopId FROM site_config WHERE id = 1')
      .first<{ token: string; shopId: string }>();
    const s = await env.DB.prepare('SELECT usd_to_uzs AS usdToUzs FROM settings WHERE id = 1').first<{ usdToUzs: number }>();
    if (!cfg?.token || !cfg.shopId || !s?.usdToUzs) return null;
    return { token: cfg.token, shopId: cfg.shopId, usdToUzs: s.usdToUzs };
  }

  async function throttle(): Promise<void> {
    const wait = lastRequestAt + MIN_GAP_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequestAt = Date.now();
  }

  async function login(secret: string): Promise<string> {
    await throttle();
    const res = await fetch(`${BILLZ_BASE}/v1/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret_token: secret }),
    });
    if (!res.ok) throw new BillzError('login_failed', `login http_${res.status}`);
    const body = (await res.json()) as { data?: { access_token?: string; expires_in?: number } };
    const token = body.data?.access_token;
    if (!token) throw new BillzError('login_failed', 'login: token yo\'q');
    jwt = { token, expiresAt: Date.now() + ((body.data?.expires_in ?? 3600) - 60) * 1000 };
    return token;
  }

  /** GET JSON: throttle, 401 → bir marta qayta login, 429 → kutib qayta (3 marta). */
  async function get<T>(url: string, secret: string, retried = false): Promise<T> {
    const token = jwt && jwt.expiresAt > Date.now() ? jwt.token : await login(secret);
    for (let attempt = 0; ; attempt++) {
      await throttle();
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 429 && attempt < 3) { await new Promise((r) => setTimeout(r, 2000)); continue; }
      if (res.status === 401 && !retried) { jwt = null; return get<T>(url, secret, true); }
      if (!res.ok) throw new BillzError(`http_${res.status}`, `${url} → ${res.status}`);
      return (await res.json()) as T;
    }
  }

  async function fetchPhoto(url: string, key: string): Promise<boolean> {
    if (await env.IMAGES.has(key)) return false;
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('image/')) return false;
      const buf = await res.arrayBuffer();
      if (buf.byteLength === 0 || buf.byteLength > MAX_PHOTO_BYTES) return false;
      await env.IMAGES.put(key, buf);
      return true;
    } catch {
      return false;
    }
  }

  /** Sahifadagi barcha rasmlar, PHOTO_PARALLEL tadan; muvaffaqiyatli yuklanganlar soni. */
  async function fetchPhotos(items: MappedProduct[]): Promise<{ downloaded: number; failed: Set<string> }> {
    const jobs = items.flatMap((m) => m.photos);
    const failed = new Set<string>();
    let downloaded = 0;
    let i = 0;
    await Promise.all(Array.from({ length: PHOTO_PARALLEL }, async () => {
      while (i < jobs.length) {
        const job = jobs[i++];
        if (await env.IMAGES.has(job.key)) continue;
        if (await fetchPhoto(job.url, job.key)) downloaded++;
        else failed.add(job.key);
      }
    }));
    return { downloaded, failed };
  }

  function upsertStatements(m: MappedProduct, existing: { id: string } | undefined, photosOk: boolean): { stmts: SqlStatement[]; id: string } {
    const id = existing?.id ?? crypto.randomUUID();
    const stmts: SqlStatement[] = [];
    if (existing) {
      stmts.push(env.DB.prepare(
        'UPDATE products SET name=?, category=?, cash_price_uzs=?, old_price_uzs=?, brand_id=?, category_id=?, type=?, description=?, billz_stock=?, is_active=?, image_url=? WHERE id=?',
      ).bind(m.name, m.legacyCategory, m.cashPriceUzs, m.oldPriceUzs, m.brandId, m.categoryId, m.type, m.description, m.stock, m.isActive ? 1 : 0, m.imageUrl, id));
    } else {
      stmts.push(env.DB.prepare(
        `INSERT INTO products (id, name, category, condition, condition_note, cash_price_uzs, image_url, sort_order, is_active, category_id, type, old_price_uzs, description, brand_id, slug, rating_avg, review_count, created_at, billz_id, billz_stock)
         VALUES (?, ?, ?, 'yangi', NULL, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, NULL, 0, unixepoch(), ?, ?)`,
      ).bind(id, m.name, m.legacyCategory, m.cashPriceUzs, m.imageUrl, m.isActive ? 1 : 0, m.categoryId, m.type, m.oldPriceUzs, m.description, m.brandId, m.slug, m.billzId, m.stock));
    }
    stmts.push(...specsStatements(env, id, m.specs));
    // Galereya faqat Billz'da rasm bo'lsa qayta yoziladi — admin yuklagan galereya rasmsiz tovarda qoladi.
    if (m.photos.length > 0 && photosOk) stmts.push(...imagesStatements(env, id, m.gallery));
    return { stmts, id };
  }

  async function execute(mode: 'full' | 'delta', cfg: Config): Promise<BillzSyncResult> {
    const startedAt = new Date();
    const result: BillzSyncResult = { at: startedAt.toISOString(), mode, ok: false, count: 0, seen: 0, inserted: 0, updated: 0, hidden: 0, photos: 0, skipped: 0 };
    const since = mode === 'delta' && lastSyncedAt ? lastSyncedAt : undefined;
    if (mode === 'delta' && !since) result.mode = 'full';

    const cats = await env.DB.prepare('SELECT id FROM categories').all<{ id: string }>();
    const brands = await env.DB.prepare('SELECT id, name FROM brands').all<{ id: string; name: string }>();
    const brandsByName = new Map(brands.results.map((b) => [b.name.toLowerCase(), b.id]));
    const brandIds = new Set(brands.results.map((b) => b.id));
    const existingRows = await env.DB.prepare('SELECT id, billz_id, image_url FROM products WHERE billz_id IS NOT NULL')
      .all<{ id: string; billz_id: string; image_url: string }>();
    const existing = new Map(existingRows.results.map((r) => [r.billz_id, { id: r.id, image: r.image_url }]));
    const seen = new Set<string>();

    for (let page = 1; ; page++) {
      const data = await get<BillzProductsPage>(productsUrl(page, since), cfg.token);
      result.count = data.count;
      const products = data.products ?? [];
      if (products.length === 0) break;

      const mapped: MappedProduct[] = [];
      for (const raw of products) {
        const ex = existing.get(raw.id);
        const ctx: MapContext = { shopId: cfg.shopId, usdToUzs: cfg.usdToUzs, categoryIds: new Set(cats.results.map((c) => c.id)), brandsByName, existingImage: ex?.image || null };
        const m = mapBillzProduct(raw, ctx);
        if (!m) { result.skipped++; continue; }
        mapped.push(m);
      }

      const { downloaded, failed } = await fetchPhotos(mapped);
      result.photos += downloaded;

      const stmts: SqlStatement[] = [];
      for (const m of mapped) {
        if (m.newBrand && !brandIds.has(m.newBrand.id)) {
          stmts.push(env.DB.prepare('INSERT INTO brands (id, name, slug, logo_url, sort_order) VALUES (?, ?, ?, \'\', 0)').bind(m.newBrand.id, m.newBrand.name, m.newBrand.id));
          brandIds.add(m.newBrand.id);
          brandsByName.set(m.newBrand.name.toLowerCase(), m.newBrand.id);
        }
        // Asosiy rasm yuklanmagan bo'lsa saytdagi rasm qoladi (bo'sh bo'lsa tovar ko'rinmaydi).
        const mainOk = m.photos.length === 0 || !failed.has(m.photos[0].key);
        const eff: MappedProduct = mainOk ? m : { ...m, imageUrl: existing.get(m.billzId)?.image ?? '', isActive: false };
        if (!mainOk) eff.isActive = eff.stock > 0 && eff.imageUrl !== '';
        const ex = existing.get(m.billzId);
        const { stmts: s, id } = upsertStatements(eff, ex, mainOk);
        stmts.push(...s);
        if (ex) result.updated++; else { result.inserted++; existing.set(m.billzId, { id, image: eff.imageUrl }); }
        seen.add(m.billzId);
      }
      if (stmts.length) await env.DB.batch(stmts);
      result.seen += products.length;
      if (result.seen >= data.count) break;
    }

    if (result.mode === 'full') {
      if (result.seen === result.count) {
        const gone = hiddenIds(existingRows.results.map((r) => r.billz_id), seen);
        if (gone.length) {
          await env.DB.batch(gone.map((bid) => env.DB.prepare('UPDATE products SET is_active = 0, billz_stock = 0 WHERE billz_id = ?').bind(bid)));
        }
        result.hidden = gone.length;
      } else {
        result.note = 'count_mismatch';
      }
    }
    lastSyncedAt = utcStamp(startedAt);
    result.ok = true;
    return result;
  }

  async function saveResult(r: BillzSyncResult): Promise<void> {
    await env.DB.prepare('UPDATE site_config SET billz_last_sync = ? WHERE id = 1').bind(JSON.stringify(r)).run();
    console.log(`billz sync ${r.mode}: ${r.ok ? 'ok' : 'XATO ' + r.error} seen=${r.seen}/${r.count} +${r.inserted} ~${r.updated} -${r.hidden} photos=${r.photos} skipped=${r.skipped}`);
  }

  async function run(mode: 'full' | 'delta'): Promise<'started' | 'sync_running' | 'not_configured'> {
    if (running) return 'sync_running';
    const cfg = await config();
    if (!cfg) return 'not_configured';
    running = true;
    void (async () => {
      let result: BillzSyncResult;
      try {
        result = await execute(mode, cfg);
      } catch (err) {
        const code = err instanceof BillzError ? err.code : 'network';
        console.error('billz sync xato:', err);
        result = { at: new Date().toISOString(), mode, ok: false, count: 0, seen: 0, inserted: 0, updated: 0, hidden: 0, photos: 0, skipped: 0, error: code };
      } finally {
        running = false;
      }
      await saveResult(result).catch((e) => console.error('billz natijani saqlash:', e));
    })();
    return 'started';
  }

  return {
    async status() {
      const row = await env.DB.prepare('SELECT billz_secret_token AS token, billz_shop_id AS shopId, billz_last_sync AS last FROM site_config WHERE id = 1')
        .first<{ token: string; shopId: string; last: string }>();
      let last: BillzSyncResult | null = null;
      try { last = row?.last ? (JSON.parse(row.last) as BillzSyncResult) : null; } catch { last = null; }
      return { configured: Boolean(row?.token && row.shopId), running, last };
    },
    run,
    async shops() {
      const row = await env.DB.prepare('SELECT billz_secret_token AS token FROM site_config WHERE id = 1').first<{ token: string }>();
      if (!row?.token) throw new BillzError('not_configured');
      const data = await get<{ shops: BillzShop[] }>(`${BILLZ_BASE}/v1/shop`, row.token);
      return (data.shops ?? []).map((s) => ({ id: s.id, name: s.name }));
    },
    start() {
      const tick = (mode: 'full' | 'delta') => { void run(mode); };
      setTimeout(() => tick('full'), BOOT_DELAY_MS).unref();
      setInterval(() => tick('delta'), DELTA_EVERY_MS).unref();
      setInterval(() => tick('full'), FULL_EVERY_MS).unref();
    },
  };
}
```
Eslatma: `shops()` `not_configured` xatosini route `400`ga, `login_failed`/`http_401`ni `billz_auth`ga aylantiradi (Task 6).

- [ ] **Step 3: server/index.ts va load context**

`server/index.ts`: `import { createBillzSync } from './billz-sync.ts';` → `const env = createEnv();` dan keyin `const billz = createBillzSync(env); billz.start();` va ikkala `getLoadContext: () => ({ env, billz })`.
`app/load-context.d.ts`:
```ts
import type { Env } from '../shared/runtime';
import type { BillzSyncHandle } from '../server/billz-sync';

declare module 'react-router' {
  interface AppLoadContext {
    /** Baza va rasm ombori — `server/index.ts` uzatadi. */
    env: Env;
    /** Billz sinxronizatsiya runner'i (holat / ishga tushirish) — `server/index.ts` yaratadi. */
    billz: BillzSyncHandle;
  }
}

export {};
```

- [ ] **Step 4: Tekshirish va commit**

Run: `bun run lint` → toza (`server/` root tsconfig'da). `bun run dev`ni ishga tushirib logda 10 s dan keyin `billz sync full: XATO not_configured` **chiqmasligi** kerak — `run` `not_configured` qaytaradi va hech narsa yozmaydi (token bo'sh).
```bash
git add server/billz-sync.ts server/index.ts app/load-context.d.ts
git commit -m "feat(billz): sinxronizatsiya runner'i — qulf, rejalashtirgich, rasm keshi"
```

---

### Task 6: Admin API `api/admin/billz`, client, errText

**Files:**
- Create: `app/routes/api.admin.billz.tsx`
- Modify: `app/routes.ts`, `src/admin/api.ts`, `src/admin/errText.ts`

**Interfaces:**
- Produces: `GET /api/admin/billz` → `BillzSyncStatus`; `GET /api/admin/billz?shops=1` → `BillzShop[]`; `POST /api/admin/billz {mode}` → `202 {started:true}` | `409 {error:'sync_running'}` | `400 {error:'not_configured'}`. Client: `getBillzStatus()`, `getBillzShops()`, `runBillzSync(mode)`.

- [ ] **Step 1: Route**

```ts
import type { Route } from './+types/api.admin.billz';
import { json } from '../../functions/lib/db';
import { requireAdmin } from './api.admin.guard';

/** Billz sinxronizatsiyasi: holat, do'konlar ro'yxati, qo'lda ishga tushirish. Faqat admin. */
export async function loader({ request, context }: Route.LoaderArgs) {
  const who = await requireAdmin(request, context.env);
  if (who instanceof Response) return who;
  if (new URL(request.url).searchParams.get('shops')) {
    try {
      return json(await context.billz.shops());
    } catch (err) {
      const code = err instanceof Error && err.message === 'not_configured' ? 'not_configured' : 'billz_auth';
      return json({ error: code }, { status: code === 'not_configured' ? 400 : 502 });
    }
  }
  return json(await context.billz.status());
}

export async function action({ request, context }: Route.ActionArgs) {
  const who = await requireAdmin(request, context.env);
  if (who instanceof Response) return who;
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });
  const body = (await request.json().catch(() => ({}))) as { mode?: string };
  const mode = body.mode === 'full' ? 'full' : 'delta';
  const r = await context.billz.run(mode);
  if (r === 'started') return json({ started: true }, { status: 202 });
  return json({ error: r }, { status: r === 'sync_running' ? 409 : 400 });
}
```
`BillzError.code` `message`ga ham yoziladi (`super(message ?? code)`) — `shops()` `not_configured`ni `new BillzError('not_configured')` bilan otadi, shuning uchun `err.message === 'not_configured'` ishlaydi.

`app/routes.ts`: `route('api/admin/billz', 'routes/api.admin.billz.tsx'),` (`api/admin/site-config`dan keyin).

- [ ] **Step 2: Client va xato matnlari**

`src/admin/api.ts` (oxiriga):
```ts
export async function getBillzStatus(): Promise<BillzSyncStatus> {
  return handle(await fetch('/api/admin/billz'));
}
export async function getBillzShops(): Promise<BillzShop[]> {
  return handle(await fetch('/api/admin/billz?shops=1'));
}
export async function runBillzSync(mode: 'full' | 'delta'): Promise<void> {
  await handle(await fetch('/api/admin/billz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode }) }));
}
```
+ `import type { BillzShop, BillzSyncStatus } from '../../shared/billz';`.
`src/admin/errText.ts`: `sync_running: "Sinxronizatsiya allaqachon ishlayapti"`, `not_configured: "Avval Billz tokeni va do'konini saqlang"`, `billz_auth: "Billz javob bermadi — tokenni tekshiring"`.

- [ ] **Step 3: Tekshirish va commit**

Run: `bun run lint` (typegen yangi route tipini yaratadi). `curl -s localhost:3000/api/admin/billz` → `{"error":"unauthorized"}` (guard ishlaydi).
```bash
git add app/routes/api.admin.billz.tsx app/routes.ts src/admin/api.ts src/admin/errText.ts
git commit -m "feat(billz): admin API — holat, do'konlar, qo'lda sinxronlash"
```

---

### Task 7: Admin UI — token/do'kon, Billz paneli, "Rasm kerak"

**Files:**
- Modify: `src/admin/SiteConfigForm.tsx`, `src/admin/AdminApp.tsx`, `src/admin/ProductList.tsx`, `src/admin/lib/product-filter.ts`, `src/admin/ProductForm.tsx`, `src/admin/SettingsForm.tsx`
- Create: `src/admin/BillzPanel.tsx`
- Test: `src/admin/lib/product-filter.test.ts`

- [ ] **Step 1: Test (filtr)**

`src/admin/lib/product-filter.test.ts` `describe` ichiga:
```ts
  it('status=needs_image → Billz\'dan kelgan, rasmsiz', () => {
    const withBillz = [
      p({ id: 'b1', billzId: 'x1', imageUrl: '' }),
      p({ id: 'b2', billzId: 'x2', imageUrl: '/images/products/a.jpg' }),
      p({ id: 'm1', billzId: null, imageUrl: '' }),
    ];
    expect(filterProducts(withBillz, { status: 'needs_image' }).map((x) => x.id)).toEqual(['b1']);
  });
```
Run → FAIL. `product-filter.ts`: `status?: string; // '' | 'active' | 'hidden' | 'needs_image'` va
```ts
    if (f.status === 'needs_image' && !(p.billzId && !p.imageUrl)) return false;
```
Run → PASS.

- [ ] **Step 2: SiteConfigForm — Billz guruhi va do'kon tanlovi**

`GROUPS`ga ("Mijoz kirishi"dan keyin):
```ts
  {
    title: 'Billz (ombor va narxlar)',
    desc: 'Tovarlar, narxlar, qoldiq va rasmlar Billz\'dan o\'zi keladi. Billz\'ga hech narsa yozilmaydi.',
    optional: true,
    fields: [
      { key: 'billzSecretToken', label: 'Integratsiya kaliti', secret: true, hint: 'Billz → Sozlamalar → Integratsiya → kalit yarating va shu yerga qo\'ying.' },
    ],
  },
```
Komponent ichida do'kon tanlovi (guruh `title === 'Billz (ombor va narxlar)'` bo'lganda, `paymentMode` select'i qanday qo'shilgan bo'lsa shunday):
```tsx
            {g.title === 'Billz (ombor va narxlar)' && (
              <label className="block text-[12.5px] font-medium text-muted">
                Do'kon
                {shops.length > 0 ? (
                  <select value={form.billzShopId} onChange={(e) => setForm({ ...form, billzShopId: e.target.value })} className={inputCls}>
                    <option value="">— tanlang —</option>
                    {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                ) : (
                  <input type="text" value={form.billzShopId} placeholder="shop UUID" onChange={(e) => setForm({ ...form, billzShopId: e.target.value })} className={inputCls} />
                )}
                <button type="button" onClick={loadShops} disabled={shopsBusy} className="press mt-1.5 text-[12px] font-semibold text-accent disabled:opacity-50">
                  {shopsBusy ? 'Yuklanmoqda…' : 'Do\'konlarni yuklash'}
                </button>
                <span className="block text-[11.5px] text-muted-2 font-normal mt-1">Avval kalitni saqlang, keyin ro'yxatni yuklang. Narx va qoldiq shu do'kondan olinadi.</span>
              </label>
            )}
```
State: `const [shops, setShops] = useState([] as BillzShop[]); const [shopsBusy, setShopsBusy] = useState(false);` va
```ts
  async function loadShops() {
    setShopsBusy(true); setMsg('');
    try { setShops(await getBillzShops()); }
    catch (e) { setMsg(errText(e)); }
    finally { setShopsBusy(false); }
  }
```
(`useState<T>` generic tushib qoladi — `[] as BillzShop[]` bilan cast; import `getBillzShops` + `type BillzShop`.)

- [ ] **Step 3: BillzPanel**

`src/admin/BillzPanel.tsx`:
```tsx
import { useEffect, useState } from 'react';
import type { BillzSyncStatus } from '../../shared/billz';
import { getBillzStatus, runBillzSync } from './api';
import { errText } from './errText';

/** Billz sinxronizatsiya holati va qo'lda ishga tushirish (Sozlamalar). */
export default function BillzPanel() {
  const [status, setStatus] = useState(null as BillzSyncStatus | null);
  const [msg, setMsg] = useState('');

  async function load() {
    try { setStatus(await getBillzStatus()); } catch (e) { setMsg(errText(e)); }
  }
  useEffect(() => { load(); }, []);
  // Ishlayotganda 3 s da bir yangilanadi — run fon vazifasi, javob darhol qaytadi.
  useEffect(() => {
    if (!status?.running) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [status?.running]);

  async function run(mode: 'full' | 'delta') {
    setMsg('');
    try { await runBillzSync(mode); setMsg('Boshlandi…'); await load(); }
    catch (e) { setMsg(errText(e)); }
  }

  const last = status?.last ?? null;
  const when = last ? new Date(last.at).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' }) : null;
  return (
    <section className="rounded-md bg-white border border-line-2 p-5">
      <h2 className="text-[20px] font-semibold text-primary">Billz sinxronizatsiyasi</h2>
      <p className="text-[13.5px] text-muted mt-0.5">Har 30 daqiqada o'zgarishlar, har 6 soatda to'liq katalog. Kerak bo'lsa hozir ishga tushiring.</p>
      <div className="mt-4 text-[14px] text-primary">
        {!status ? 'Yuklanmoqda…'
          : !status.configured ? <span className="text-danger">Sozlanmagan — «Sayt ma'lumotlari» bo'limida Billz kaliti va do'konini saqlang.</span>
          : status.running ? 'Ishlayapti…'
          : !last ? 'Hali sinxronlanmagan.'
          : last.ok
            ? <>Oxirgi: {when} · {last.mode === 'full' ? 'to\'liq' : 'delta'} · ko'rildi {last.seen}/{last.count} · yangi {last.inserted} · yangilandi {last.updated} · yashirildi {last.hidden} · rasm {last.photos}{last.skipped ? ` · o'tkazildi ${last.skipped}` : ''}{last.note ? ` · ${last.note}` : ''}</>
            : <span className="text-danger">Oxirgi urinish xato: {errText(new Error(last.error ?? 'network'))} ({when})</span>}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button onClick={() => run('delta')} disabled={!status?.configured || status.running} className="press px-5 py-2 bg-accent text-white font-semibold rounded-full text-[14px] disabled:opacity-50">Sinxronlash</button>
        <button onClick={() => run('full')} disabled={!status?.configured || status.running} className="press px-5 py-2 border border-line-2 font-semibold rounded-full text-[14px] disabled:opacity-50">To'liq sinxronlash</button>
        {msg && <span className="text-[13px] text-muted">{msg}</span>}
      </div>
      <p className="mt-4 text-[12.5px] text-muted-2">
        Billz'dan kelgan mahsulotlarning nomi, narxi, qoldig'i, turi va tavsifi har sinxronizatsiyada qayta yoziladi; reyting, sharhlar va tartib sizniki.
        Rasmsiz tovar saytda ko'rinmaydi — rasmni «Mahsulotlar → Rasm kerak» ro'yxatidan shu yerda yoki Billz'da qo'shing.
      </p>
    </section>
  );
}
```
`errText`ga `login_failed: "Billz kaliti noto'g'ri"`, `network: "Billz bilan aloqa yo'q"`, `count_mismatch` kerak emas (note). `AdminApp.tsx` settings tab: `SettingsForm` ostiga `<div className="mt-8"><BillzPanel /></div>` (SiteConfigForm'dan oldin), import.

- [ ] **Step 4: ProductList belgilari va filtr; ProductForm izohi; SettingsForm hint**

`ProductList.tsx` status select'iga `<option value="needs_image">Rasm kerak</option>`; nom katagida:
```tsx
                <td className="p-3">
                  <div className="font-semibold text-primary max-w-[240px] truncate">{p.name}</div>
                  {p.billzId && (
                    <div className="mt-0.5 flex gap-1.5 text-[11px] font-semibold">
                      <span className="rounded-full bg-bg px-2 py-0.5 text-muted-2">Billz</span>
                      {!p.imageUrl && <span className={`rounded-full px-2 py-0.5 ${(p.billzStock ?? 0) > 0 ? 'bg-danger/10 text-danger' : 'bg-bg text-muted-2'}`}>Rasm kerak</span>}
                      {(p.billzStock ?? 0) === 0 && <span className="rounded-full bg-bg px-2 py-0.5 text-muted-2">Qoldiq 0</span>}
                    </div>
                  )}
                </td>
```
`ProductForm.tsx` — "Asosiy rasm" uploader'i ostiga (`initial?.billzId` bo'lsa):
```tsx
        {initial?.billzId && (
          <p className="mt-2 text-[12.5px] text-muted-2">
            Billz'dan kelgan mahsulot: nomi, narxi, qoldig'i, turi va tavsifi sinxronizatsiyada qayta yoziladi. Billz'da rasm bo'lmasa shu yerda yuklagan rasmingiz saqlanadi.
          </p>
        )}
```
`SettingsForm.tsx` USD kursi yorlig'i ostiga: `<span className="block text-[12px] text-muted-2 -mt-4 mb-5">Billz narxlari (USD) shu kurs bilan so'mga o'giriladi — kurs o'zgarsa keyingi sinxronizatsiyada narxlar yangilanadi.</span>` (mavjud label tuzilmasiga mos joylashtiring).

- [ ] **Step 5: Tekshirish va commit**

Run: `bun run lint && bun run test`. Brauzerda `/admin/settings`: Billz paneli "Sozlanmagan", "Sayt ma'lumotlari"da Billz guruhi ko'rinadi.
```bash
git add src/admin
git commit -m "feat(billz): admin — token/do'kon, sinxronizatsiya paneli, \"Rasm kerak\" belgisi"
```

---

### Task 8: Real sinxronizatsiya, CLAUDE.md, yakuniy commit

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Lokal to'liq sinxronizatsiya (real token, faqat o'qish)**

`bun run dev` → `/admin` → Sozlamalar → "Sayt ma'lumotlari": kalitni kiriting, Saqlash → "Do'konlarni yuklash" → **ProDuct** → Saqlash. Billz panelida "To'liq sinxronlash". Kutilgan: `seen=1584/1584`, `inserted≈1584`, `photos≈482`, `skipped` kichik (do'kon narxi yo'q tovarlar). Ikkinchi "To'liq sinxronlash": `inserted=0`, `updated≈1584`, `photos=0`, `hidden=0`.
Tekshirish SQL: `sqlite3 data/store.db "select is_active, count(*) from products where billz_id is not null group by 1"` → faol ≈ 283.
Brauzer: `/category/apple`, `/category/pc` — tile qatori Billz turlari bilan, kartalarda rasmlar, narxlar so'mda; `/product/<slug>` — xususiyatlar Xotira/Rang/Chip, tavsif matn. Mahsulotlar → "Rasm kerak" ≈ 611. Bittasiga rasm yuklab saqlash → saytda paydo bo'ladi; keyingi delta run uni yashirmaydi.

- [ ] **Step 2: CLAUDE.md**

Qo'shiladigan joylar: (1) **Commands**: `shared/billz.test.ts` testlar ro'yxatiga; (2) **Architecture**da yangi bo'lim "**Billz sinxronizatsiyasi (2026-09)**": manba haqiqati, runner joyi (`server/`+`shared/` — Docker `functions/`ni tashimaydi), rejalar (30 daq / 6 soat / boot), ustun egaligi, ko'rinish qoidasi (`qoldiq>0 && rasm`), rasm keshi (`products/billz-<uuid>`), tur aliaslari, Billz'ga yozuv yo'q; (3) **Data model** migratsiyalar ro'yxatiga `0029`; (4) **Environment & deploy** sirlar ro'yxatiga `billz_secret_token`; (5) admin bo'limiga Billz paneli va "Rasm kerak".

- [ ] **Step 3: Yakuniy tekshirish va commit**

```bash
bun run lint && bun run test
git add CLAUDE.md
git commit -m "docs: Billz sinxronizatsiyasi CLAUDE.md'da"
```
Foydalanuvchiga hisobot: nima qilindi, sonlar, prod uchun qadamlar (Coolify deploy → admin'da **yangi** token + do'kon → to'liq sinxronlash; eski 33 mahsulotni qo'lda o'chirish).
