# Reja 2 — Cloudflare backend (o'qish tomoni) va saytni API'ga ulash (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Mahsulotlar va kalkulyator sozlamalarini Cloudflare **D1** bazasidan beruvchi ommaviy API qurish, saytni statik importlardan API'ga o'tkazish va **Yangi/Ishlatilgan** alohida bo'limlarni chiqarish. Backend Cloudflare Pages Functions'da, hammasi bepul tarifda.

**Architecture:** Loyihaga `functions/` (Pages Functions) va `migrations/` (D1 sxema) qo'shiladi. Ommaviy API `GET /api/products` va `GET /api/settings` D1'dan o'qiydi. Frontend `src/api/store.ts` orqali ma'lumotni yuklaydi (API ishlamasa lokal NAMUNA ma'lumotga qaytadi), `App` uni proplar orqali komponentlarga uzatadi.

**Tech Stack:** Cloudflare Pages + Pages Functions, D1 (SQLite), R2, wrangler, `@cloudflare/workers-types`, React 19 + Vite 6, TypeScript strict.

## Global Constraints

- Strict TypeScript, `any` **ishlatilmaydi**. Lint frontend (`src`) va backend (`functions`) ni tekshiradi.
- Paket menejeri: **bun**; Cloudflare CLI `bunx wrangler ...` orqali.
- Commit formati: `feat:`, `fix:`, `chore:`, `docs:`.
- D1 binding nomi: `DB`. R2 binding nomi: `IMAGES`.
- API JSON kalitlari **camelCase** (`downPaymentPercent`, `cashPriceUzs`, `imageUrl`, `conditionNote`, `sortOrder`, `isActive`).
- Kalkulyator formulasi Reja 1 dagidek o'zgarmaydi.
- **Reja 1 bajarilgan bo'lishi shart** (foizli `InstallmentConfig`, `Product.condition`).

---

## File Structure

- `wrangler.toml` — Pages + D1 + R2 bindinglari (Create).
- `functions/tsconfig.json` — Functions uchun workers-types bilan alohida tsconfig (Create).
- `tsconfig.json` — `include`/`exclude` bilan `src`ga cheklash (Modify).
- `package.json` — devDeps + lint skript yangilanishi (Modify).
- `shared/types.ts` — frontend va backend uchun umumiy sof tiplar (Create).
- `functions/env.ts` — `Env` binding tipi (Create).
- `functions/lib/db.ts` — D1 qator ↔ API tip xaritalash yordamchilari (Create).
- `functions/api/products.ts` — `GET /api/products` (Create).
- `functions/api/settings.ts` — `GET /api/settings` (Create).
- `migrations/0001_init.sql` — sxema (Create).
- `migrations/0002_seed.sql` — NAMUNA ma'lumot (Create).
- `src/api/store.ts` — frontend ma'lumot yuklovchi + xaritalash + fallback (Create).
- `src/App.tsx` — ma'lumotni yuklab, proplar orqali uzatish, ikki katalog bo'limi (Modify).
- `src/components/Catalog.tsx` — proplar (`items`, `title`, `subtitle`, `config`), holat belgisi (Modify).
- `src/components/Calculator.tsx` — `products`/`config` proplari (Modify).
- `src/components/ApplicationForm.tsx` — `products`/`config` proplari (Modify).
- `src/locales.ts` — Yangi/Ishlatilgan bo'lim va belgi matnlari (Modify).

---

### Task 1: Cloudflare tooling va TypeScript sozlamalari

**Files:**
- Modify: `package.json`
- Create: `wrangler.toml`, `functions/tsconfig.json`
- Modify: `tsconfig.json`

**Interfaces:**
- Consumes: yo'q.
- Produces: `DB` (D1) va `IMAGES` (R2) bindinglari; `bunx wrangler pages dev` lokal muhiti; `bun run lint` `functions`ni ham tekshiradi.

- [x] **Step 1: Dev paketlarni qo'shish**

Run:
```bash
bun add -d wrangler @cloudflare/workers-types
```
Expected: ikkala paket `devDependencies`ga qo'shiladi.

- [x] **Step 2: D1 bazasi va R2 bucket yaratish**

Run:
```bash
bunx wrangler d1 create taqsit-store-db
bunx wrangler r2 bucket create taqsit-store-images
```
Expected: `d1 create` chiqishida `database_id = "..."` qiymati ko'rinadi — uni keyingi qadamda ishlatasiz. (Agar Cloudflare hisobiga login qilinmagan bo'lsa: `bunx wrangler login`.)

- [x] **Step 3: `wrangler.toml` yaratish**

Create `wrangler.toml` (`database_id`ni 2-qadamdagi haqiqiy qiymatga almashtiring):

```toml
name = "taqsit-store"
compatibility_date = "2024-11-01"
pages_build_output_dir = "dist"

[[d1_databases]]
binding = "DB"
database_name = "taqsit-store-db"
database_id = "PASTE_DATABASE_ID_FROM_STEP_2"

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "taqsit-store-images"
```

- [x] **Step 4: Functions uchun tsconfig yaratish**

Create `functions/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "esModuleInterop": true
  },
  "include": ["**/*.ts", "../shared/**/*.ts"]
}
```

- [x] **Step 5: Root tsconfig'ni `src`ga cheklash**

`tsconfig.json`ga `include` va `exclude` qo'shing (Functions alohida tsconfig bilan tekshiriladi):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "allowJs": true,
    "jsx": "react-jsx",
    "paths": { "@/*": ["./*"] },
    "allowImportingTsExtensions": true,
    "noEmit": true
  },
  "include": ["src", "shared"],
  "exclude": ["functions", "dist", "node_modules"]
}
```

- [x] **Step 6: Lint skriptini ikki tsconfig'ni tekshiradigan qilish**

`package.json` `scripts` ichida `lint`ni yangilang:

```json
    "lint": "tsc --noEmit && tsc --noEmit -p functions/tsconfig.json",
```

- [x] **Step 7: `.gitignore`ga wrangler lokal fayllarini qo'shish**

`.gitignore` oxiriga qo'shing (fayl bo'lmasa yarating):

```
.wrangler
.dev.vars
```

- [x] **Step 8: Lint toza ekanini tekshirish**

Run:
```bash
bun run lint
```
Expected: xatosiz (hali `functions/`da ts fayl yo'q, `src` avvalgidek toza).

- [x] **Step 9: Commit**

```bash
git add package.json bun.lockb wrangler.toml functions/tsconfig.json tsconfig.json .gitignore
git commit -m "chore: add cloudflare pages tooling (wrangler, d1, r2)"
```

---

### Task 2: D1 sxema va NAMUNA ma'lumot (migratsiyalar)

**Files:**
- Create: `migrations/0001_init.sql`, `migrations/0002_seed.sql`

**Interfaces:**
- Consumes: Task 1 `DB` bindingi.
- Produces: `products` va `settings` jadvallari; NAMUNA qatorlar.

- [x] **Step 1: Sxema migratsiyasini yozish**

Create `migrations/0001_init.sql`:

```sql
CREATE TABLE products (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  category       TEXT NOT NULL,
  condition      TEXT NOT NULL,
  condition_note TEXT,
  cash_price_uzs INTEGER NOT NULL,
  image_url      TEXT NOT NULL DEFAULT '',
  sort_order     INTEGER NOT NULL DEFAULT 0,
  is_active      INTEGER NOT NULL DEFAULT 1,
  created_at     INTEGER NOT NULL
);

CREATE TABLE settings (
  id                   INTEGER PRIMARY KEY CHECK (id = 1),
  down_payment_percent REAL NOT NULL,
  usd_to_uzs           INTEGER NOT NULL,
  terms                TEXT NOT NULL
);
```

- [x] **Step 2: NAMUNA ma'lumot migratsiyasini yozish**

Create `migrations/0002_seed.sql`:

```sql
INSERT INTO settings (id, down_payment_percent, usd_to_uzs, terms) VALUES
  (1, 20, 12600, '[{"months":3,"markup":0.1},{"months":6,"markup":0.22},{"months":12,"markup":0.42}]');

INSERT INTO products (id, name, category, condition, condition_note, cash_price_uzs, image_url, sort_order, is_active, created_at) VALUES
  ('iphone-17-pro',   'iPhone 17 Pro',              'iphone', 'yangi',       NULL,         18500000, '', 10, 1, unixepoch()),
  ('iphone-16',       'iPhone 16',                  'iphone', 'yangi',       NULL,         12900000, '', 20, 1, unixepoch()),
  ('macbook-pro',     'MacBook Pro',                'mac',    'yangi',       NULL,         32000000, '', 30, 1, unixepoch()),
  ('macbook-air',     'MacBook Air',                'mac',    'yangi',       NULL,         19900000, '', 40, 1, unixepoch()),
  ('ipad-pro',        'iPad Pro',                   'ipad',   'yangi',       NULL,         14500000, '', 50, 1, unixepoch()),
  ('imac',            'iMac',                       'mac',    'yangi',       NULL,         24000000, '', 60, 1, unixepoch()),
  ('mac-mini',        'Mac Mini',                   'mac',    'yangi',       NULL,          9900000, '', 70, 1, unixepoch()),
  ('workstation',     'Workstation PC',             'pc',     'yangi',       NULL,         21000000, '', 80, 1, unixepoch()),
  ('iphone-15-used',  'iPhone 15 (ishlatilgan)',    'iphone', 'ishlatilgan', '95% holat',   9500000, '', 90, 1, unixepoch()),
  ('macbook-air-used','MacBook Air (ishlatilgan)',  'mac',    'ishlatilgan', '90% holat',  13900000, '',100, 1, unixepoch());
```

- [x] **Step 3: Migratsiyalarni lokal D1'ga qo'llash**

Run:
```bash
bunx wrangler d1 migrations apply taqsit-store-db --local
```
Expected: ikkala migratsiya qo'llanadi, "2 migrations applied" (yoki shunga o'xshash).

- [x] **Step 4: Lokal ma'lumotni tekshirish**

Run:
```bash
bunx wrangler d1 execute taqsit-store-db --local --command "SELECT count(*) AS n FROM products;"
```
Expected: `n = 10`.

- [x] **Step 5: Commit**

```bash
git add migrations/0001_init.sql migrations/0002_seed.sql
git commit -m "feat: add d1 schema and seed data"
```

---

### Task 3: Umumiy tiplar va Env

**Files:**
- Create: `shared/types.ts`, `functions/env.ts`, `functions/lib/db.ts`

**Interfaces:**
- Consumes: yo'q.
- Produces:
  - `shared/types.ts`: `Category`, `Condition`, `Term`, `ApiProduct` (`{ id: string; name: string; category: Category; condition: Condition; conditionNote: string | null; cashPriceUzs: number; imageUrl: string; sortOrder: number; isActive: boolean }`), `ApiSettings` (`{ downPaymentPercent: number; usdToUzs: number; terms: Term[] }`).
  - `functions/env.ts`: `interface Env { DB: D1Database; IMAGES: R2Bucket; ADMIN_USERNAME: string; ADMIN_PASSWORD_HASH: string; SESSION_SECRET: string }`.
  - `functions/lib/db.ts`: `rowToProduct(row: ProductRow): ApiProduct`, `rowToSettings(row: SettingsRow): ApiSettings`, `ProductRow`, `SettingsRow` tiplari, `json(data, init?)` yordamchisi.

- [x] **Step 1: Umumiy tiplarni yozish**

Create `shared/types.ts`:

```ts
export type Category = 'iphone' | 'mac' | 'ipad' | 'pc';
export type Condition = 'yangi' | 'ishlatilgan';

export interface Term {
  months: number;
  markup: number;
}

export interface ApiProduct {
  id: string;
  name: string;
  category: Category;
  condition: Condition;
  conditionNote: string | null;
  cashPriceUzs: number;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ApiSettings {
  downPaymentPercent: number;
  usdToUzs: number;
  terms: Term[];
}
```

- [x] **Step 2: Env tipini yozish**

Create `functions/env.ts`:

```ts
export interface Env {
  DB: D1Database;
  IMAGES: R2Bucket;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD_HASH: string;
  SESSION_SECRET: string;
}
```

- [x] **Step 3: DB xaritalash yordamchilarini yozish**

Create `functions/lib/db.ts`:

```ts
import type { ApiProduct, ApiSettings, Category, Condition, Term } from '../../shared/types';

export interface ProductRow {
  id: string;
  name: string;
  category: string;
  condition: string;
  condition_note: string | null;
  cash_price_uzs: number;
  image_url: string;
  sort_order: number;
  is_active: number;
  created_at: number;
}

export interface SettingsRow {
  id: number;
  down_payment_percent: number;
  usd_to_uzs: number;
  terms: string;
}

export function rowToProduct(row: ProductRow): ApiProduct {
  return {
    id: row.id,
    name: row.name,
    category: row.category as Category,
    condition: row.condition as Condition,
    conditionNote: row.condition_note,
    cashPriceUzs: row.cash_price_uzs,
    imageUrl: row.image_url,
    sortOrder: row.sort_order,
    isActive: row.is_active === 1,
  };
}

export function rowToSettings(row: SettingsRow): ApiSettings {
  const terms = JSON.parse(row.terms) as Term[];
  return {
    downPaymentPercent: row.down_payment_percent,
    usdToUzs: row.usd_to_uzs,
    terms,
  };
}

export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(init?.headers ?? {}) },
  });
}
```

- [x] **Step 4: Lint tekshiruvi**

Run:
```bash
bun run lint
```
Expected: xatosiz.

- [x] **Step 5: Commit**

```bash
git add shared/types.ts functions/env.ts functions/lib/db.ts
git commit -m "feat: add shared api types and d1 mappers"
```

---

### Task 4: Ommaviy API — products va settings

**Files:**
- Create: `functions/api/products.ts`, `functions/api/settings.ts`

**Interfaces:**
- Consumes: Task 3 (`Env`, `rowToProduct`, `rowToSettings`, `json`, `ProductRow`, `SettingsRow`).
- Produces:
  - `GET /api/products` → `ApiProduct[]` (faqat `is_active = 1`, `sort_order` bo'yicha).
  - `GET /api/settings` → `ApiSettings`.

- [x] **Step 1: Products endpointini yozish**

Create `functions/api/products.ts`:

```ts
import type { Env } from '../env';
import { json, rowToProduct, type ProductRow } from '../lib/db';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    'SELECT * FROM products WHERE is_active = 1 ORDER BY sort_order ASC, created_at ASC',
  ).all<ProductRow>();
  return json(results.map(rowToProduct), {
    headers: { 'cache-control': 'public, max-age=60' },
  });
};
```

- [x] **Step 2: Settings endpointini yozish**

Create `functions/api/settings.ts`:

```ts
import type { Env } from '../env';
import { json, rowToSettings, type SettingsRow } from '../lib/db';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const row = await env.DB.prepare('SELECT * FROM settings WHERE id = 1').first<SettingsRow>();
  if (!row) {
    return json({ error: 'settings_not_found' }, { status: 404 });
  }
  return json(rowToSettings(row), {
    headers: { 'cache-control': 'public, max-age=60' },
  });
};
```

- [x] **Step 3: Lokal Pages dev serverni ishga tushirish**

Avval build (Functions D1 bindingi `wrangler pages dev` orqali ishlaydi):
```bash
bun run build
```
Keyin (alohida terminalda yoki fon rejimida):
```bash
bunx wrangler pages dev --local
```
Expected: `http://localhost:8788` da server ko'tariladi.

- [x] **Step 4: API'ni curl bilan tekshirish**

Run:
```bash
curl -s http://localhost:8788/api/products | head -c 300
curl -s http://localhost:8788/api/settings
```
Expected: `products` — 10 elementli JSON massiv (`imageUrl: ""`, `cashPriceUzs` sonlar bilan); `settings` — `{"downPaymentPercent":20,"usdToUzs":12600,"terms":[...]}`.

- [x] **Step 5: Lint va commit**

```bash
bun run lint
git add functions/api/products.ts functions/api/settings.ts
git commit -m "feat: public read api for products and settings"
```

---

### Task 5: Frontend ma'lumot yuklovchi qatlam (fetch + fallback)

**Files:**
- Create: `src/api/store.ts`

**Interfaces:**
- Consumes: `ApiProduct`/`ApiSettings` (`shared/types`), `Product`/`InstallmentConfig` (`src/data/products`), lokal `products`/`installmentConfig` (fallback).
- Produces: `fetchStore(): Promise<StoreData>` bu yerda `StoreData = { products: Product[]; config: InstallmentConfig }`.

- [x] **Step 1: `store.ts`ni yozish**

Create `src/api/store.ts`:

```ts
import type { ApiProduct, ApiSettings } from '../../shared/types';
import type { InstallmentConfig, Product } from '../data/products';
import { installmentConfig as fallbackConfig, products as fallbackProducts } from '../data/products';

export interface StoreData {
  products: Product[];
  config: InstallmentConfig;
}

function mapProduct(p: ApiProduct): Product {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    condition: p.condition,
    conditionNote: p.conditionNote ?? undefined,
    image: p.imageUrl,
    cashPriceUzs: p.cashPriceUzs,
  };
}

function mapConfig(s: ApiSettings): InstallmentConfig {
  return {
    downPaymentPercent: s.downPaymentPercent,
    usdToUzs: s.usdToUzs,
    terms: s.terms,
  };
}

export async function fetchStore(): Promise<StoreData> {
  try {
    const [pRes, sRes] = await Promise.all([fetch('/api/products'), fetch('/api/settings')]);
    if (!pRes.ok || !sRes.ok) throw new Error('api_error');
    const apiProducts = (await pRes.json()) as ApiProduct[];
    const apiSettings = (await sRes.json()) as ApiSettings;
    if (apiProducts.length === 0) throw new Error('empty');
    return { products: apiProducts.map(mapProduct), config: mapConfig(apiSettings) };
  } catch {
    // API mavjud emas (masalan `bun run dev` sof Vite) — NAMUNA ma'lumotga qaytamiz.
    return { products: fallbackProducts, config: fallbackConfig };
  }
}
```

- [x] **Step 2: Lint tekshiruvi**

Run:
```bash
bun run lint
```
Expected: xatosiz.

- [x] **Step 3: Commit**

```bash
git add src/api/store.ts
git commit -m "feat: frontend store data loader with fallback"
```

---

### Task 6: Komponentlarni proplarga o'tkazish (Catalog, Calculator, ApplicationForm)

**Files:**
- Modify: `src/components/Catalog.tsx`, `src/components/Calculator.tsx`, `src/components/ApplicationForm.tsx`

**Interfaces:**
- Consumes: `Product`, `InstallmentConfig` (proplar sifatida).
- Produces:
  - `Catalog` proplari: `{ t: Translation; items: Product[]; title: string; subtitle: string; config: InstallmentConfig; onSelect: (id: string) => void }`.
  - `Calculator` proplari: avvalgilariga qo'shimcha `products: Product[]; config: InstallmentConfig`.
  - `ApplicationForm` proplari: avvalgilariga qo'shimcha `products: Product[]; config: InstallmentConfig`.

- [x] **Step 1: `Catalog.tsx`ni proplar va holat belgisiga o'tkazish**

`src/components/Catalog.tsx` faylini to'liq quyidagiga almashtiring:

```tsx
import { motion } from 'motion/react';
import type { Translation } from '../locales';
import type { InstallmentConfig, Product } from '../data/products';
import { formatUzs, lowestMonthly } from '../lib/installment';

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

export default function Catalog({
  t,
  items,
  title,
  subtitle,
  config,
  onSelect,
}: {
  t: Translation;
  items: Product[];
  title: string;
  subtitle: string;
  config: InstallmentConfig;
  onSelect: (productId: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section id="catalog" className="w-full max-w-[920px] mx-auto px-4 md:px-0 pb-12 md:pb-20 pt-8 md:pt-10">
      <h2 className="text-[32px] md:text-[40px] font-semibold tracking-[-0.015em] text-center mb-2">
        {title}
      </h2>
      <p className="text-[17px] text-[#6E6E73] text-center mb-8 md:mb-10">{subtitle}</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {items.map((product) => (
          <motion.div
            key={product.id}
            variants={fadeIn}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            whileHover={{ y: -6 }}
            className="bg-[#F5F5F7] rounded-[22px] overflow-hidden flex flex-col shadow-[--shadow-apple] hover:shadow-[--shadow-apple-hover] transition-all duration-500"
          >
            <div className="h-[140px] md:h-[180px] w-full flex items-center justify-center p-4 relative">
              <span
                className={`absolute top-3 left-3 text-[11px] font-semibold px-2 py-1 rounded-full ${
                  product.condition === 'yangi'
                    ? 'bg-[#0071E3] text-white'
                    : 'bg-[#E8F5E9] text-[#1B7A34]'
                }`}
              >
                {product.condition === 'yangi' ? t.badgeNew : t.badgeUsed}
              </span>
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="max-w-full max-h-full object-contain"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-[#C7C7CC] text-[13px]">{product.name}</div>
              )}
            </div>
            <div className="p-4 md:p-5 flex flex-col flex-1">
              <h3 className="text-[15px] md:text-[17px] font-semibold tracking-[-0.01em] mb-1">
                {product.name}
              </h3>
              {product.conditionNote && (
                <div className="text-[12px] text-[#6E6E73] mb-2">{product.conditionNote}</div>
              )}
              <div className="text-[13px] text-[#6E6E73] mb-1">
                {t.catalogCashLabel}:{' '}
                <span className="text-[#1D1D1F] font-medium">{formatUzs(product.cashPriceUzs)}</span>
              </div>
              <div className="text-[13px] text-[#6E6E73] mb-4">
                {t.catalogMonthlyLabel}:{' '}
                <span className="text-[#0071E3] font-semibold">
                  {formatUzs(lowestMonthly(product, config))}
                </span>
              </div>
              <button
                onClick={() => onSelect(product.id)}
                className="mt-auto w-full py-2.5 bg-[#1D1D1F] text-white text-[14px] font-semibold rounded-full hover:bg-[#0071E3] transition-colors"
              >
                {t.catalogSelect}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
```

- [x] **Step 2: `Calculator.tsx`ni proplarga o'tkazish**

`src/components/Calculator.tsx`da 4–5-qatordagi importni o'zgartiring — `products`, `installmentConfig`ni statik importdan olib tashlab, proplardan oling. Faqat quyidagi ikki joyni tahrirlang:

Importlar (4–5-qatorlar) o'rniga:
```tsx
import type { Translation } from '../locales';
import type { InstallmentConfig, Product } from '../data/products';
import { calcInstallment, formatUzs } from '../lib/installment';
```

Funksiya imzosiga `products` va `config` proplarini qo'shing va ichida `installmentConfig` o'rniga `config`, global `products` o'rniga prop `products`ni ishlating:
```tsx
export default function Calculator({
  t,
  products,
  config,
  productId,
  months,
  setProductId,
  setMonths,
  onApply,
}: {
  t: Translation;
  products: Product[];
  config: InstallmentConfig;
  productId: string;
  months: number;
  setProductId: (id: string) => void;
  setMonths: (m: number) => void;
  onApply: () => void;
}) {
  const product = products.find((p) => p.id === productId) ?? products[0];
  const term =
    config.terms.find((x) => x.months === months) ?? config.terms[config.terms.length - 1];
  const result = calcInstallment(product, term, config);
```

Va JSX ichidagi `installmentConfig.terms`ni `config.terms`ga almashtiring (muddat tugmalari `.map` qismida).

- [x] **Step 3: `ApplicationForm.tsx`ni proplarga o'tkazish**

`src/components/ApplicationForm.tsx`da 4-qatordagi `import { products, installmentConfig } from '../data/products';`ni olib tashlab, o'rniga tip importini qo'shing:
```tsx
import type { InstallmentConfig, Product } from '../data/products';
```

Funksiya imzosiga `products` va `config` proplarini qo'shing:
```tsx
export default function ApplicationForm({
  t,
  products,
  config,
  productId,
  months,
}: {
  t: Translation;
  products: Product[];
  config: InstallmentConfig;
  productId: string;
  months: number;
}) {
```

`buildMessage` ichida `installmentConfig.terms`ni `config.terms`ga, `calcInstallment(product, selectedTerm, installmentConfig)`ni `calcInstallment(product, selectedTerm, config)`ga almashtiring. JSX'dagi `products.map(...)` prop `products`ni ishlatadi (o'zgarmaydi).

- [x] **Step 4: Lint (App hali yangilanmagani uchun xato bo'lishi mumkin — keyingi taskda tuzatiladi)**

Run:
```bash
bun run lint
```
Expected: `App.tsx`da `Catalog`/`Calculator`/`ApplicationForm`ga yangi proplar berilmagani uchun xato — bu **kutilgan**, Task 7 tuzatadi. (Agar mustaqil commit kerak bo'lsa, Task 7 bilan birga commit qiling.)

---

### Task 7: App'ni API'ga ulash va ikki katalog bo'limi + locales

**Files:**
- Modify: `src/App.tsx`, `src/locales.ts`

**Interfaces:**
- Consumes: `fetchStore` (Task 5), yangilangan komponent proplari (Task 6).
- Produces: ishlaydigan sayt — ma'lumot API'dan (yoki fallback), Yangi/Ishlatilgan alohida bo'limlar.

- [x] **Step 1: Locales'ga yangi kalitlarni qo'shish (4 tilda)**

`src/locales.ts`da har bir til blokiga (`catalogSelect` qatoridan keyin) quyidagi kalitlarni qo'shing.

`"O'zbek tili"` blokiga:
```ts
    catalogNewTitle: "Yangi mahsulotlar",
    catalogNewSubtitle: "Rasman yangi qurilmalar — muddatli to'lovga.",
    catalogUsedTitle: "Ishlatilgan mahsulotlar",
    catalogUsedSubtitle: "Tekshirilgan, ishonchli — arzon narxda.",
    badgeNew: "Yangi",
    badgeUsed: "Ishlatilgan",
```

`"Rus tili"` blokiga:
```ts
    catalogNewTitle: "Новые товары",
    catalogNewSubtitle: "Официально новые устройства — в рассрочку.",
    catalogUsedTitle: "Б/у товары",
    catalogUsedSubtitle: "Проверенные и надёжные — по выгодной цене.",
    badgeNew: "Новый",
    badgeUsed: "Б/у",
```

`"English"` blokiga:
```ts
    catalogNewTitle: "New products",
    catalogNewSubtitle: "Brand-new devices — on installment.",
    catalogUsedTitle: "Used products",
    catalogUsedSubtitle: "Checked and reliable — at a great price.",
    badgeNew: "New",
    badgeUsed: "Used",
```

`"O'zbek tili (Cyrillic)"` blokiga:
```ts
    catalogNewTitle: "Янги маҳсулотлар",
    catalogNewSubtitle: "Расман янги қурилмалар — муддатли тўловга.",
    catalogUsedTitle: "Ишлатилган маҳсулотлар",
    catalogUsedSubtitle: "Текширилган, ишончли — арзон нархда.",
    badgeNew: "Янги",
    badgeUsed: "Ишлатилган",
```

- [x] **Step 2: App'da ma'lumotni yuklab, proplarni uzatish**

`src/App.tsx`da 15-qatordagi `import { products } from './data/products';`ni quyidagiga almashtiring:
```tsx
import type { InstallmentConfig, Product } from './data/products';
import { fetchStore } from './api/store';
```

Komponent tepasida (26–27-qatordagi state yonida) ma'lumot state'ini qo'shing va `useEffect` bilan yuklang. `useState`/`useEffect` import qilinganiga ishonch hosil qiling (`import { useState, useEffect } from 'react';`):
```tsx
  const [store, setStore] = useState<{ products: Product[]; config: InstallmentConfig } | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedMonths, setSelectedMonths] = useState(12);

  useEffect(() => {
    fetchStore().then((data) => {
      setStore(data);
      setSelectedProductId((prev) => prev || data.products[0]?.id || '');
    });
  }, []);
```
> Eslatma: agar faylda allaqachon `const [selectedProductId, setSelectedProductId] = useState(products[0].id);` bo'lsa, uni yuqoridagi bo'sh string variantiga almashtiring (endi `products` importi yo'q).

- [x] **Step 3: Katalog/Kalkulyator/Forma render qismini yangilash**

`src/App.tsx`da 454–471-qatorlardagi bloklarni quyidagiga almashtiring (ma'lumot yuklanmaguncha `store` `null` bo'ladi):
```tsx
      {/* Catalog: Yangi va Ishlatilgan alohida */}
      {store && (
        <>
          <Catalog
            t={t}
            items={store.products.filter((p) => p.condition === 'yangi')}
            title={t.catalogNewTitle}
            subtitle={t.catalogNewSubtitle}
            config={store.config}
            onSelect={handleSelectProduct}
          />
          <Catalog
            t={t}
            items={store.products.filter((p) => p.condition === 'ishlatilgan')}
            title={t.catalogUsedTitle}
            subtitle={t.catalogUsedSubtitle}
            config={store.config}
            onSelect={handleSelectProduct}
          />

          <Calculator
            t={t}
            products={store.products}
            config={store.config}
            productId={selectedProductId}
            months={selectedMonths}
            setProductId={setSelectedProductId}
            setMonths={setSelectedMonths}
            onApply={() => scrollToId('application')}
          />

          <ApplicationForm
            t={t}
            products={store.products}
            config={store.config}
            productId={selectedProductId}
            months={selectedMonths}
          />
        </>
      )}
```
> Agar mavjud `<Calculator>` blokida qo'shimcha proplar (masalan `setProductId`/`setMonths`) boshqa nomlarda bo'lsa, ularni saqlab qoling — faqat `products={store.products}` va `config={store.config}` qo'shilishi va statik importlar olib tashlanishi muhim.

- [x] **Step 4: Lint va build**

Run:
```bash
bun run lint && bun run build
```
Expected: xatosiz — barcha proplar mos, statik import qoldiqlari yo'q.

- [x] **Step 5: Lokal to'liq oqimni tekshirish (Pages dev)**

Run:
```bash
bun run build
bunx wrangler pages dev --local
```
Brauzerda `http://localhost:8788`ni oching. Expected: "Yangi mahsulotlar" va "Ishlatilgan mahsulotlar" bo'limlari ko'rinadi (belgilar bilan), kalkulyator D1 sozlamalari bilan hisoblaydi.

- [x] **Step 6: Testlar hamon o'tishini tekshirish**

Run:
```bash
bun run test
```
Expected: Reja 1 testlari PASS (o'zgarmagan).

- [x] **Step 7: Commit**

```bash
git add src/App.tsx src/locales.ts src/components/Catalog.tsx src/components/Calculator.tsx src/components/ApplicationForm.tsx
git commit -m "feat: wire site to api with separate new/used catalog sections"
```

---

### Task 8: Ishlab chiqarishga migratsiya va deploy

**Files:** yo'q (infratuzilma qadamlari).

**Interfaces:**
- Consumes: `wrangler.toml`, migratsiyalar.
- Produces: Cloudflare'da ishlaydigan sayt + to'ldirilgan D1.

- [x] **Step 1: Ishlab chiqarish (remote) D1'ga migratsiya qo'llash**

Run:
```bash
bunx wrangler d1 migrations apply taqsit-store-db --remote
```
Expected: 2 migratsiya remote bazaga qo'llanadi.

- [x] **Step 2: Deploy**

Run:
```bash
bun run build
bunx wrangler pages deploy dist --project-name taqsit-store
```
Expected: deploy tugaydi, `*.pages.dev` URL beriladi. (Birinchi marta loyiha yaratishni so'rasa, `taqsit-store` nomi bilan tasdiqlang.)

- [x] **Step 3: Jonli API'ni tekshirish**

Run (`<URL>`ni deploy bergan manzilga almashtiring):
```bash
curl -s https://<URL>/api/products | head -c 200
```
Expected: 10 elementli JSON massiv.

- [x] **Step 4: Commit (agar konfiguratsiya o'zgargan bo'lsa)**

```bash
git add -A
git commit -m "chore: deploy taqsit store to cloudflare pages"
```
> Bindinglar Pages dashboardida yoki `wrangler.toml` orqali ulanganiga ishonch hosil qiling: Settings → Functions → D1/R2 bindings (`DB`, `IMAGES`).

---

## Self-Review

**Spec coverage:** Ommaviy o'qish API (PRD §6 `GET /api/products`, `GET /api/settings`) — Task 4. D1 sxema (PRD §3) — Task 2. Yangi/Ishlatilgan alohida bo'limlar (PRD §5) — Task 6–7. Bepul infratuzilma (PRD §2) — Cloudflare Pages/D1/R2. Yozish API (login, CRUD, upload) va admin UI — **Reja 3** (qamrovdan tashqari).

**Placeholder scan:** Yagona "to'ldiriladigan" qiymat — `wrangler.toml`dagi `database_id`, u haqiqiy komandadan (`wrangler d1 create`) olinadi (Task 1 Step 2–3). Boshqa TODO yo'q.

**Type consistency:** `ApiProduct`/`ApiSettings` (camelCase) ↔ `ProductRow`/`SettingsRow` (snake_case) `rowТо*` da xaritalanadi; frontend `mapProduct`/`mapConfig` `Product`/`InstallmentConfig`ga o'tkazadi. `condition`/`conditionNote`/`downPaymentPercent` nomlari Reja 1 tiplariga mos.

**Eslatma:** Task 6 oxirida (Step 4) lint atay xato beradi — bu Task 7'da tuzatiladi; ikki task bitta ishlaydigan holatga birga yetadi. Subagent-driven ijroda Task 6 va 7 ni ketma-ket, oraliqsiz deploysiz bajaring.
