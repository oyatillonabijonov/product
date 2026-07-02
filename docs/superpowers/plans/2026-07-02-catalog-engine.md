# Catalog Engine (3-bo'lak) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** URL-driven filtr/saralash/paginatsiya, `/katalog`, `/brand/:slug`, `/chegirmalar` sahifalari, kategoriya/qidiruv sahifalariga filtr — hammasi SSR.

**Architecture:** Pure filtr-parsing/fallback-filtr `app/lib/catalog.ts`da (TDD). Server tarafda yagona `queryProducts(env, filters)` (`app/lib/loaders.ts`) — dinamik WHERE + COUNT + fasetlar (`SELECT * FROM (SELECT ${PRODUCT_COLS}...)` o'rami orqali `min_variant_price` WHERE'da ishlatiladi). UI: `FilterPanel`/`SortSelect`/`ActiveFilterChips`/`Pagination` + `CatalogView` kompozitsiyasi — holat URL query'da (`useSearchParams`), filtr o'zgarsa `page` reset. SEO: param bor sahifada `noindex,follow` + canonical toza yo'lga; brend/katalog/chegirmalar sitemap'da.

**Tech Stack:** React Router v7 SSR (Cloudflare Workers + D1), React 19, TypeScript strict, bun, vitest.

## Global Constraints

- **bun**; strict TS, **`any` yo'q**; har taskdan keyin `bun run lint` toza; mavjud 23 test buzilmasin.
- Filtr param'lari (aynan): `brand` (vergulli slug/id ro'yxati), `narx` (`min-max`, ikkalasi ixtiyoriy), `holat` (`yangi`|`ishlatilgan`), `cat` (faqat /katalog), `sort` (`arzon`|`qimmat`|`yangi`, default sort_order), `page` (1-based). **PAGE_SIZE = 24.**
- Narx filtri/saralash **effektiv narx** bo'yicha: `COALESCE(min_variant_price, cash_price_uzs)`.
- Noto'g'ri param qiymatlari jimgina default'ga tushadi (`page=abc`→1, noma'lum sort→default).
- Ichki storefront havolalar lokalga mos (`LocaleLink`/`localizedPath`); komponent holati emas — **URL holat manbai**.
- i18n: yangi kalitlar **4 tilda ham** bo'lishi shart (aks holda `Translation` compile fail).
- Chegirma sahifasi sharti: `old_price_uzs IS NOT NULL AND old_price_uzs > cash_price_uzs`.
- Variant tanlash UI, atribut-fasetlar, aksiya/banner modeli — **qo'shilmaydi**.
- Commit formati: `feat:`/`fix:`/`chore:`/`docs:`.

---

## File Structure

- Create: `app/lib/catalog.ts`, `app/lib/catalog.test.ts`, `src/store/FilterPanel.tsx`, `src/store/SortSelect.tsx`, `src/store/ActiveFilterChips.tsx`, `src/store/Pagination.tsx`, `src/store/CatalogView.tsx`, `app/routes/catalog.tsx`, `app/routes/brand.tsx`, `app/routes/deals.tsx`
- Modify: `app/lib/loaders.ts` (queryProducts), `src/locales.ts`, `app/routes.ts`, `app/routes/category.tsx`, `app/routes/search.tsx`, `src/store/CategoryPage.tsx`, `src/store/SearchPage.tsx`, `src/store/Header.tsx` (Katalog tugmasi → `/katalog` link), `app/routes/sitemap[.]xml.tsx`

---

### Task 1: `app/lib/catalog.ts` — filtr parsing + fallback filtr (TDD)

**Files:**
- Create: `app/lib/catalog.ts`, `app/lib/catalog.test.ts`

**Interfaces:**
- Consumes: `Product`, `fallbackCategoryOf` (`src/data/products.ts`).
- Produces (keyingi tasklar tayanadi):
  - `PAGE_SIZE = 24`; `SORTS = ['default','arzon','qimmat','yangi'] as const`; `SortKey`.
  - `interface CatalogFilters { category: string | null; brands: string[]; priceMin: number | null; priceMax: number | null; condition: 'yangi' | 'ishlatilgan' | null; q: string | null; sort: SortKey; page: number; onlyDeals: boolean }`
  - `parseCatalogFilters(sp: URLSearchParams, base?: Partial<CatalogFilters>): CatalogFilters`
  - `hasActiveParams(sp: URLSearchParams): boolean` (brand/narx/holat/cat/sort/page/q dan birortasi bormi)
  - `interface CatalogFacets { brandCounts: Record<string, number>; priceMin: number; priceMax: number }`
  - `interface CatalogResult { items: Product[]; total: number; facets: CatalogFacets }`
  - `applyFilters(products: Product[], filters: CatalogFilters): CatalogResult` (pure fallback: filtr+sort+sahifa+fasetlar)

- [ ] **Step 1: Failing testlarni yozish** — `app/lib/catalog.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseCatalogFilters, applyFilters, hasActiveParams, PAGE_SIZE } from './catalog';
import type { Product } from '../../src/data/products';

const sp = (s: string) => new URLSearchParams(s);

describe('parseCatalogFilters', () => {
  it('defaults on empty params', () => {
    const f = parseCatalogFilters(sp(''));
    expect(f).toEqual({ category: null, brands: [], priceMin: null, priceMax: null, condition: null, q: null, sort: 'default', page: 1, onlyDeals: false });
  });
  it('parses full params', () => {
    const f = parseCatalogFilters(sp('brand=apple,samsung&narx=9000000-20000000&holat=yangi&cat=telefonlar&sort=arzon&page=3&q=iphone'));
    expect(f.brands).toEqual(['apple', 'samsung']);
    expect(f.priceMin).toBe(9000000);
    expect(f.priceMax).toBe(20000000);
    expect(f.condition).toBe('yangi');
    expect(f.category).toBe('telefonlar');
    expect(f.sort).toBe('arzon');
    expect(f.page).toBe(3);
    expect(f.q).toBe('iphone');
  });
  it('open-ended price ranges', () => {
    expect(parseCatalogFilters(sp('narx=9000000-')).priceMax).toBeNull();
    expect(parseCatalogFilters(sp('narx=9000000-')).priceMin).toBe(9000000);
    expect(parseCatalogFilters(sp('narx=-20000000')).priceMin).toBeNull();
    expect(parseCatalogFilters(sp('narx=-20000000')).priceMax).toBe(20000000);
  });
  it('invalid values fall back silently', () => {
    const f = parseCatalogFilters(sp('page=abc&sort=zzz&holat=broken&narx=xx-yy'));
    expect(f.page).toBe(1);
    expect(f.sort).toBe('default');
    expect(f.condition).toBeNull();
    expect(f.priceMin).toBeNull();
    expect(f.priceMax).toBeNull();
  });
  it('base overrides merge (onlyDeals, category)', () => {
    const f = parseCatalogFilters(sp('sort=yangi'), { onlyDeals: true, category: 'telefonlar' });
    expect(f.onlyDeals).toBe(true);
    expect(f.category).toBe('telefonlar');
    expect(f.sort).toBe('yangi');
  });
});

describe('hasActiveParams', () => {
  it('false on empty, true on filter params', () => {
    expect(hasActiveParams(sp(''))).toBe(false);
    expect(hasActiveParams(sp('brand=apple'))).toBe(true);
    expect(hasActiveParams(sp('page=2'))).toBe(true);
    expect(hasActiveParams(sp('utm_source=x'))).toBe(false);
  });
});

const P = (o: Partial<Product> & { id: string; cashPriceUzs: number; minPriceUzs: number }): Product => ({
  name: o.id, category: 'iphone', condition: 'yangi', image: '', ...o,
});
const items: Product[] = [
  P({ id: 'a', cashPriceUzs: 10, minPriceUzs: 8, brandId: 'apple' }),
  P({ id: 'b', cashPriceUzs: 20, minPriceUzs: 20, brandId: 'samsung', condition: 'ishlatilgan' }),
  P({ id: 'c', cashPriceUzs: 30, minPriceUzs: 30, brandId: 'apple', oldPriceUzs: 40 }),
];
const base = parseCatalogFilters(sp(''));

describe('applyFilters', () => {
  it('filters by brand and condition', () => {
    expect(applyFilters(items, { ...base, brands: ['apple'] }).items.map((x) => x.id)).toEqual(['a', 'c']);
    expect(applyFilters(items, { ...base, condition: 'ishlatilgan' }).items.map((x) => x.id)).toEqual(['b']);
  });
  it('filters by effective price (minPriceUzs)', () => {
    expect(applyFilters(items, { ...base, priceMin: 10, priceMax: 25 }).items.map((x) => x.id)).toEqual(['b']);
  });
  it('deals only', () => {
    expect(applyFilters(items, { ...base, onlyDeals: true }).items.map((x) => x.id)).toEqual(['c']);
  });
  it('sorts by price asc/desc', () => {
    expect(applyFilters(items, { ...base, sort: 'arzon' }).items.map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(applyFilters(items, { ...base, sort: 'qimmat' }).items.map((x) => x.id)).toEqual(['c', 'b', 'a']);
  });
  it('paginates and reports total + facets', () => {
    const many: Product[] = Array.from({ length: PAGE_SIZE + 2 }, (_, i) => P({ id: `p${i}`, cashPriceUzs: i + 1, minPriceUzs: i + 1, brandId: 'apple' }));
    const r1 = applyFilters(many, base);
    expect(r1.items).toHaveLength(PAGE_SIZE);
    expect(r1.total).toBe(PAGE_SIZE + 2);
    const r2 = applyFilters(many, { ...base, page: 2 });
    expect(r2.items).toHaveLength(2);
    expect(r2.facets.brandCounts.apple).toBe(PAGE_SIZE + 2);
    expect(r2.facets.priceMin).toBe(1);
    expect(r2.facets.priceMax).toBe(PAGE_SIZE + 2);
  });
});
```

- [ ] **Step 2: Fail** — Run: `bunx vitest run app/lib/catalog.test.ts` — Expected: FAIL (`./catalog` yo'q).

- [ ] **Step 3: Implementatsiya** — `app/lib/catalog.ts`:

```ts
import type { Product } from '../../src/data/products';
import { fallbackCategoryOf } from '../../src/data/products';

export const PAGE_SIZE = 24;
export const SORTS = ['default', 'arzon', 'qimmat', 'yangi'] as const;
export type SortKey = (typeof SORTS)[number];
const CONDITIONS = ['yangi', 'ishlatilgan'] as const;
const FILTER_PARAMS = ['brand', 'narx', 'holat', 'cat', 'sort', 'page', 'q'] as const;

export interface CatalogFilters {
  category: string | null;
  brands: string[];
  priceMin: number | null;
  priceMax: number | null;
  condition: 'yangi' | 'ishlatilgan' | null;
  q: string | null;
  sort: SortKey;
  page: number;
  onlyDeals: boolean;
}

export interface CatalogFacets { brandCounts: Record<string, number>; priceMin: number; priceMax: number }
export interface CatalogResult { items: Product[]; total: number; facets: CatalogFacets }

function posInt(v: string | null): number | null {
  if (v === null || v.trim() === '' || !/^\d+$/.test(v.trim())) return null;
  const n = Number(v.trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseCatalogFilters(sp: URLSearchParams, base?: Partial<CatalogFilters>): CatalogFilters {
  const brandsRaw = sp.get('brand');
  const brands = brandsRaw ? brandsRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];
  let priceMin: number | null = null;
  let priceMax: number | null = null;
  const narx = sp.get('narx');
  if (narx && narx.includes('-')) {
    const [lo, hi] = narx.split('-', 2);
    priceMin = posInt(lo);
    priceMax = posInt(hi);
  }
  const holat = sp.get('holat');
  const condition = holat && (CONDITIONS as readonly string[]).includes(holat) ? (holat as CatalogFilters['condition']) : null;
  const sortRaw = sp.get('sort');
  const sort: SortKey = sortRaw && (SORTS as readonly string[]).includes(sortRaw) ? (sortRaw as SortKey) : 'default';
  const page = posInt(sp.get('page')) ?? 1;
  const qRaw = sp.get('q');
  const q = qRaw && qRaw.trim() !== '' ? qRaw.trim() : null;
  const cat = sp.get('cat');
  return {
    category: base?.category ?? (cat && cat.trim() !== '' ? cat.trim() : null),
    brands, priceMin, priceMax, condition, q, sort, page,
    onlyDeals: base?.onlyDeals ?? false,
  };
}

export function hasActiveParams(sp: URLSearchParams): boolean {
  return FILTER_PARAMS.some((k) => sp.get(k) !== null && sp.get(k) !== '');
}

const effective = (p: Product): number => p.minPriceUzs;

export function applyFilters(products: Product[], f: CatalogFilters): CatalogResult {
  let xs = products;
  if (f.category) xs = xs.filter((p) => fallbackCategoryOf(p) === f.category);
  if (f.condition) xs = xs.filter((p) => p.condition === f.condition);
  if (f.q) { const q = f.q.toLowerCase(); xs = xs.filter((p) => p.name.toLowerCase().includes(q)); }
  if (f.onlyDeals) xs = xs.filter((p) => p.oldPriceUzs != null && p.oldPriceUzs > p.cashPriceUzs);
  // fasetlar brend filtridan OLDIN (brend hisoblagichlari boshqa filtrlar bo'yicha)
  const brandCounts: Record<string, number> = {};
  let priceLo = Infinity;
  let priceHi = 0;
  for (const p of xs) {
    if (p.brandId) brandCounts[p.brandId] = (brandCounts[p.brandId] ?? 0) + 1;
    const e = effective(p);
    if (e < priceLo) priceLo = e;
    if (e > priceHi) priceHi = e;
  }
  if (f.brands.length > 0) xs = xs.filter((p) => p.brandId != null && f.brands.includes(p.brandId));
  if (f.priceMin !== null) xs = xs.filter((p) => effective(p) >= (f.priceMin as number));
  if (f.priceMax !== null) xs = xs.filter((p) => effective(p) <= (f.priceMax as number));
  const sorted = [...xs];
  if (f.sort === 'arzon') sorted.sort((a, b) => effective(a) - effective(b));
  else if (f.sort === 'qimmat') sorted.sort((a, b) => effective(b) - effective(a));
  // 'yangi'/'default' — sample tartibi saqlanadi (created_at fallbackda yo'q)
  const total = sorted.length;
  const start = (f.page - 1) * PAGE_SIZE;
  return {
    items: sorted.slice(start, start + PAGE_SIZE),
    total,
    facets: { brandCounts, priceMin: priceLo === Infinity ? 0 : priceLo, priceMax: priceHi },
  };
}
```

- [ ] **Step 4: Pass + suite** — Run: `bunx vitest run app/lib/catalog.test.ts && bun run test && bun run lint` — Expected: yangi 11 + jami 34; lint toza.

- [ ] **Step 5: Commit**

```bash
git add app/lib/catalog.ts app/lib/catalog.test.ts
git commit -m "feat: catalog filter parsing and pure fallback filtering with tests"
```

---

### Task 2: `queryProducts` server loader

**Files:**
- Modify: `app/lib/loaders.ts`

**Interfaces:**
- Consumes: `CatalogFilters`/`CatalogResult`/`applyFilters`/`PAGE_SIZE` (catalog.ts), `PRODUCT_COLS`/`rowToProduct` (db.ts), `fallbackProducts`, `mapProduct`.
- Produces: `queryProducts(env: Env, filters: CatalogFilters): Promise<CatalogResult>`.

- [ ] **Step 1: Implementatsiya** — `loaders.ts`ga (importlar + fayl oxiriga):

```ts
import { applyFilters, PAGE_SIZE, type CatalogFilters, type CatalogResult } from './catalog';

const EFFECTIVE = 'COALESCE(min_variant_price, cash_price_uzs)';

function buildConds(f: CatalogFilters, opts: { skipBrands?: boolean; skipPrice?: boolean } = {}): { sql: string; binds: unknown[] } {
  const conds: string[] = ['is_active = 1'];
  const binds: unknown[] = [];
  if (f.category) { conds.push('category_id = ?'); binds.push(f.category); }
  if (f.condition) { conds.push('condition = ?'); binds.push(f.condition); }
  if (f.q) { conds.push('name LIKE ?'); binds.push(`%${f.q}%`); }
  if (f.onlyDeals) conds.push('old_price_uzs IS NOT NULL AND old_price_uzs > cash_price_uzs');
  if (!opts.skipBrands && f.brands.length > 0) {
    conds.push(`brand_id IN (${f.brands.map(() => '?').join(',')})`);
    binds.push(...f.brands);
  }
  if (!opts.skipPrice) {
    if (f.priceMin !== null) { conds.push(`${EFFECTIVE} >= ?`); binds.push(f.priceMin); }
    if (f.priceMax !== null) { conds.push(`${EFFECTIVE} <= ?`); binds.push(f.priceMax); }
  }
  return { sql: conds.join(' AND '), binds };
}

const ORDERS: Record<CatalogFilters['sort'], string> = {
  default: 'sort_order ASC, created_at ASC',
  arzon: `${EFFECTIVE} ASC`,
  qimmat: `${EFFECTIVE} DESC`,
  yangi: 'created_at DESC',
};

export async function queryProducts(env: Env, f: CatalogFilters): Promise<CatalogResult> {
  try {
    const inner = `SELECT ${PRODUCT_COLS} FROM products`;
    const w = buildConds(f);
    const offset = (f.page - 1) * PAGE_SIZE;
    const [list, count, brandFacet, priceFacet] = await Promise.all([
      env.DB.prepare(`SELECT * FROM (${inner}) WHERE ${w.sql} ORDER BY ${ORDERS[f.sort]} LIMIT ? OFFSET ?`)
        .bind(...w.binds, PAGE_SIZE, offset).all<ProductRow>(),
      env.DB.prepare(`SELECT COUNT(*) AS cnt FROM (${inner}) WHERE ${w.sql}`)
        .bind(...w.binds).first<{ cnt: number }>(),
      (() => {
        const wb = buildConds(f, { skipBrands: true });
        return env.DB.prepare(`SELECT brand_id, COUNT(*) AS cnt FROM (${inner}) WHERE ${wb.sql} AND brand_id IS NOT NULL GROUP BY brand_id`)
          .bind(...wb.binds).all<{ brand_id: string; cnt: number }>();
      })(),
      (() => {
        const wp = buildConds(f, { skipPrice: true });
        return env.DB.prepare(`SELECT MIN(${EFFECTIVE}) AS lo, MAX(${EFFECTIVE}) AS hi FROM (${inner}) WHERE ${wp.sql}`)
          .bind(...wp.binds).first<{ lo: number | null; hi: number | null }>();
      })(),
    ]);
    const brandCounts: Record<string, number> = {};
    for (const r of brandFacet.results) brandCounts[r.brand_id] = r.cnt;
    return {
      items: list.results.map(rowToProduct).map(mapProduct),
      total: count?.cnt ?? 0,
      facets: { brandCounts, priceMin: priceFacet?.lo ?? 0, priceMax: priceFacet?.hi ?? 0 },
    };
  } catch (err) {
    console.error('queryProducts fallback:', err);
    return applyFilters(fallbackProducts, f);
  }
}
```

- [ ] **Step 2: Lint + test + commit**

```bash
bun run lint && bun run test && bun run build
git add app/lib/loaders.ts
git commit -m "feat: queryProducts server loader with filters, sort, pagination and facets"
```

---

### Task 3: i18n kalitlar (4 tilda)

**Files:**
- Modify: `src/locales.ts`

**Interfaces:**
- Produces: 16 yangi kalit har 4 til blokida (kalitlar aynan): `catalogAll, dealsTitle, filterTitle, filterBrand, filterPrice, filterPriceFrom, filterPriceTo, filterCondition, filterAll, filterClear, filterApply, sortLabel, sortDefault, sortCheap, sortExpensive, sortNew, resultsCount` (17 ta — resultsCount bilan).

- [ ] **Step 1: Kalitlarni qo'shish** — har til blokining oxiriga (mavjud `searchResults`/`viewAll` uslubida):

O'zbek: `catalogAll: "Barcha mahsulotlar", dealsTitle: "Chegirmalar", filterTitle: "Filtr", filterBrand: "Brend", filterPrice: "Narx (so'm)", filterPriceFrom: "dan", filterPriceTo: "gacha", filterCondition: "Holati", filterAll: "Barchasi", filterClear: "Tozalash", filterApply: "Ko'rsatish", sortLabel: "Saralash", sortDefault: "Tavsiya etilgan", sortCheap: "Arzon → qimmat", sortExpensive: "Qimmat → arzon", sortNew: "Yangi kelganlar", resultsCount: "mahsulot"`

Rus: `"Все товары", "Скидки", "Фильтр", "Бренд", "Цена (сум)", "от", "до", "Состояние", "Все", "Сбросить", "Показать", "Сортировка", "Рекомендуемые", "Дешевле → дороже", "Дороже → дешевле", "Новинки", "товаров"`

English: `"All products", "Deals", "Filter", "Brand", "Price (UZS)", "from", "to", "Condition", "All", "Clear", "Show", "Sort", "Recommended", "Price: low → high", "Price: high → low", "New arrivals", "products"`

Kirill: `"Барча маҳсулотлар", "Чегирмалар", "Филтр", "Бренд", "Нарх (сўм)", "дан", "гача", "Ҳолати", "Барчаси", "Тозалаш", "Кўрсатиш", "Саралаш", "Тавсия этилган", "Арзон → қиммат", "Қиммат → арзон", "Янги келганлар", "маҳсулот"`

- [ ] **Step 2: Lint + commit**

```bash
bun run lint
git add src/locales.ts
git commit -m "feat: catalog filter and sort i18n keys (4 languages)"
```

---

### Task 4: UI komponentlar — Pagination, SortSelect, ActiveFilterChips, FilterPanel

**Files:**
- Create: `src/store/Pagination.tsx`, `src/store/SortSelect.tsx`, `src/store/ActiveFilterChips.tsx`, `src/store/FilterPanel.tsx`

**Interfaces:**
- Consumes: `Translation`, `ApiBrand`, `CatalogFilters`/`CatalogFacets`/`SORTS`/`SortKey`/`PAGE_SIZE` (`app/lib/catalog`).
- Produces (CatalogView Task 5'da ishlatadi):
  - `Pagination: FC<{ page: number; total: number; onPage(n: number): void }>`
  - `SortSelect: FC<{ t: Translation; value: SortKey; onChange(v: SortKey): void }>`
  - `ActiveFilterChips: FC<{ t: Translation; filters: CatalogFilters; brands: ApiBrand[]; onRemove(kind: 'brand' | 'price' | 'condition', value?: string): void }>`
  - `FilterPanel: FC<{ t: Translation; brands: ApiBrand[]; facets: CatalogFacets; filters: CatalogFilters; onChange(next: Partial<CatalogFilters>): void; onClear(): void }>`

- [ ] **Step 1: `Pagination.tsx`**

```tsx
import type { FC } from 'react';
import { PAGE_SIZE } from '../../app/lib/catalog';

const Pagination: FC<{ page: number; total: number; onPage: (n: number) => void }> = ({ page, total, onPage }) => {
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pageCount <= 1) return null;
  const pages: number[] = [];
  for (let i = 1; i <= pageCount; i++) {
    if (i === 1 || i === pageCount || Math.abs(i - page) <= 1) pages.push(i);
  }
  const withGaps: (number | '…')[] = [];
  for (let i = 0; i < pages.length; i++) {
    if (i > 0 && pages[i] - pages[i - 1] > 1) withGaps.push('…');
    withGaps.push(pages[i]);
  }
  return (
    <nav className="flex items-center justify-center gap-1.5 mt-8">
      {withGaps.map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-2 text-[#86868B]">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPage(p)}
            disabled={p === page}
            className={`min-w-9 h-9 px-2 rounded-full text-[14px] font-semibold transition-colors ${
              p === page ? 'bg-[#0071E3] text-white' : 'bg-white border border-[#D2D2D7] hover:border-[#0071E3]'
            }`}
          >
            {p}
          </button>
        ),
      )}
    </nav>
  );
};
export default Pagination;
```

- [ ] **Step 2: `SortSelect.tsx`**

```tsx
import type { FC } from 'react';
import type { Translation } from '../locales';
import { SORTS, type SortKey } from '../../app/lib/catalog';

const SortSelect: FC<{ t: Translation; value: SortKey; onChange: (v: SortKey) => void }> = ({ t, value, onChange }) => {
  const labels: Record<SortKey, string> = {
    default: t.sortDefault, arzon: t.sortCheap, qimmat: t.sortExpensive, yangi: t.sortNew,
  };
  return (
    <label className="inline-flex items-center gap-2 text-[13px] text-[#6E6E73]">
      {t.sortLabel}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="border border-[#D2D2D7] rounded-xl px-3 py-2 text-[14px] text-[#1D1D1F] bg-white focus:outline-none focus:border-[#0071E3]"
      >
        {SORTS.map((s) => (
          <option key={s} value={s}>{labels[s]}</option>
        ))}
      </select>
    </label>
  );
};
export default SortSelect;
```

- [ ] **Step 3: `ActiveFilterChips.tsx`**

```tsx
import type { FC } from 'react';
import type { Translation } from '../locales';
import type { ApiBrand } from '../../shared/types';
import type { CatalogFilters } from '../../app/lib/catalog';
import { formatUzs } from '../lib/installment';

const Chip: FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <button onClick={onRemove} className="inline-flex items-center gap-1.5 bg-[#EAF3FF] text-[#0071E3] text-[13px] font-semibold px-3 py-1.5 rounded-full hover:bg-[#DCEBFF]">
    {label} <span aria-hidden>×</span>
  </button>
);

const ActiveFilterChips: FC<{
  t: Translation;
  filters: CatalogFilters;
  brands: ApiBrand[];
  onRemove: (kind: 'brand' | 'price' | 'condition', value?: string) => void;
}> = ({ t, filters, brands, onRemove }) => {
  const chips: { key: string; label: string; remove: () => void }[] = [];
  for (const b of filters.brands) {
    const name = brands.find((x) => x.id === b || x.slug === b)?.name ?? b;
    chips.push({ key: `b-${b}`, label: name, remove: () => onRemove('brand', b) });
  }
  if (filters.priceMin !== null || filters.priceMax !== null) {
    const lo = filters.priceMin !== null ? formatUzs(filters.priceMin) : '0';
    const hi = filters.priceMax !== null ? formatUzs(filters.priceMax) : '∞';
    chips.push({ key: 'price', label: `${lo} – ${hi}`, remove: () => onRemove('price') });
  }
  if (filters.condition) {
    chips.push({ key: 'cond', label: filters.condition === 'yangi' ? t.badgeNew : t.badgeUsed, remove: () => onRemove('condition') });
  }
  if (chips.length === 0) return null;
  return <div className="flex flex-wrap gap-2">{chips.map((c) => <Chip key={c.key} label={c.label} onRemove={c.remove} />)}</div>;
};
export default ActiveFilterChips;
```

- [ ] **Step 4: `FilterPanel.tsx`** — checkbox brendlar (hisoblagich bilan), narx min/max inputlar (local state, "Ko'rsatish" bosilganda onChange), holat radio, "Tozalash":

```tsx
import { useState } from 'react';
import type { FC } from 'react';
import type { Translation } from '../locales';
import type { ApiBrand } from '../../shared/types';
import type { CatalogFilters, CatalogFacets } from '../../app/lib/catalog';

const FilterPanel: FC<{
  t: Translation;
  brands: ApiBrand[];
  facets: CatalogFacets;
  filters: CatalogFilters;
  onChange: (next: Partial<CatalogFilters>) => void;
  onClear: () => void;
}> = ({ t, brands, facets, filters, onChange, onClear }) => {
  const [lo, setLo] = useState(filters.priceMin !== null ? String(filters.priceMin) : '');
  const [hi, setHi] = useState(filters.priceMax !== null ? String(filters.priceMax) : '');

  function toggleBrand(id: string) {
    const next = filters.brands.includes(id) ? filters.brands.filter((x) => x !== id) : [...filters.brands, id];
    onChange({ brands: next });
  }
  function applyPrice() {
    const pm = lo.trim() !== '' && /^\d+$/.test(lo.trim()) ? Number(lo.trim()) : null;
    const px = hi.trim() !== '' && /^\d+$/.test(hi.trim()) ? Number(hi.trim()) : null;
    onChange({ priceMin: pm, priceMax: px });
  }

  const visibleBrands = brands.filter((b) => (facets.brandCounts[b.id] ?? 0) > 0 || filters.brands.includes(b.id));
  const input = 'w-full border border-[#D2D2D7] rounded-xl px-3 py-2 text-[14px] focus:outline-none focus:border-[#0071E3]';
  return (
    <div className="flex flex-col gap-6">
      {visibleBrands.length > 0 && (
        <section>
          <h3 className="text-[13px] font-bold uppercase tracking-wide text-[#86868B] mb-3">{t.filterBrand}</h3>
          <div className="flex flex-col gap-2">
            {visibleBrands.map((b) => (
              <label key={b.id} className="flex items-center gap-2.5 text-[14px] cursor-pointer">
                <input type="checkbox" checked={filters.brands.includes(b.id)} onChange={() => toggleBrand(b.id)} />
                <span className="flex-1">{b.name}</span>
                <span className="text-[12px] text-[#86868B]">{facets.brandCounts[b.id] ?? 0}</span>
              </label>
            ))}
          </div>
        </section>
      )}
      <section>
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-[#86868B] mb-3">{t.filterPrice}</h3>
        <div className="flex items-center gap-2">
          <input inputMode="numeric" placeholder={t.filterPriceFrom} className={input} value={lo} onChange={(e) => setLo(e.target.value)} />
          <span className="text-[#86868B]">–</span>
          <input inputMode="numeric" placeholder={t.filterPriceTo} className={input} value={hi} onChange={(e) => setHi(e.target.value)} />
        </div>
        <button onClick={applyPrice} className="mt-2 w-full py-2 bg-[#1D1D1F] text-white text-[13px] font-semibold rounded-full hover:bg-[#0071E3] transition-colors">
          {t.filterApply}
        </button>
      </section>
      <section>
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-[#86868B] mb-3">{t.filterCondition}</h3>
        <div className="flex flex-col gap-2 text-[14px]">
          {([null, 'yangi', 'ishlatilgan'] as const).map((c) => (
            <label key={c ?? 'all'} className="flex items-center gap-2.5 cursor-pointer">
              <input type="radio" name="holat" checked={filters.condition === c} onChange={() => onChange({ condition: c })} />
              {c === null ? t.filterAll : c === 'yangi' ? t.badgeNew : t.badgeUsed}
            </label>
          ))}
        </div>
      </section>
      <button onClick={onClear} className="text-[13px] text-[#6E6E73] hover:text-[#E8462D] font-semibold text-left">
        {t.filterClear}
      </button>
    </div>
  );
};
export default FilterPanel;
```

- [ ] **Step 5: Lint + commit**

```bash
bun run lint
git add src/store/Pagination.tsx src/store/SortSelect.tsx src/store/ActiveFilterChips.tsx src/store/FilterPanel.tsx
git commit -m "feat: catalog ui components (filter panel, sort, chips, pagination)"
```

---

### Task 5: `CatalogView` + kategoriya/qidiruv sahifalarini qayta ulash

**Files:**
- Create: `src/store/CatalogView.tsx`
- Modify: `src/store/CategoryPage.tsx`, `src/store/SearchPage.tsx`, `app/routes/category.tsx`, `app/routes/search.tsx`

**Interfaces:**
- Consumes: Task 4 komponentlari, `queryProducts`, `loadBrands`, `loadConfig`, `parseCatalogFilters`, `CatalogResult`.
- Produces: `CatalogView: FC<{ t: Translation; title: string; result: CatalogResult; config: InstallmentConfig; brands: ApiBrand[]; filters: CatalogFilters }>` — URL yangilashni o'zi boshqaradi (`useSearchParams`); route loader'lar `{ result, config, brands, filters }` qaytaradi.

- [ ] **Step 1: `CatalogView.tsx`** — layout: sarlavha+soni, mobil "Filtr" tugmasi (sheet), desktop yon panel, sort o'ngda, chips, grid, paginatsiya. URL yangilash yagona joyda:

```tsx
import { useState } from 'react';
import type { FC } from 'react';
import { useSearchParams } from 'react-router';
import { SlidersHorizontal, X } from 'lucide-react';
import type { Translation } from '../locales';
import type { ApiBrand } from '../../shared/types';
import type { InstallmentConfig } from '../data/products';
import type { CatalogFilters, CatalogResult, SortKey } from '../../app/lib/catalog';
import ProductGrid from './ProductGrid';
import FilterPanel from './FilterPanel';
import SortSelect from './SortSelect';
import ActiveFilterChips from './ActiveFilterChips';
import Pagination from './Pagination';

const CatalogView: FC<{
  t: Translation;
  title: string;
  result: CatalogResult;
  config: InstallmentConfig;
  brands: ApiBrand[];
  filters: CatalogFilters;
}> = ({ t, title, result, config, brands, filters }) => {
  const [sp, setSp] = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);

  function update(next: Partial<CatalogFilters>, resetPage = true) {
    const p = new URLSearchParams(sp);
    if (next.brands !== undefined) { next.brands.length ? p.set('brand', next.brands.join(',')) : p.delete('brand'); }
    if (next.priceMin !== undefined || next.priceMax !== undefined) {
      const lo = next.priceMin !== undefined ? next.priceMin : filters.priceMin;
      const hi = next.priceMax !== undefined ? next.priceMax : filters.priceMax;
      lo === null && hi === null ? p.delete('narx') : p.set('narx', `${lo ?? ''}-${hi ?? ''}`);
    }
    if (next.condition !== undefined) { next.condition ? p.set('holat', next.condition) : p.delete('holat'); }
    if (next.sort !== undefined) { next.sort === 'default' ? p.delete('sort') : p.set('sort', next.sort); }
    if (next.page !== undefined) { next.page <= 1 ? p.delete('page') : p.set('page', String(next.page)); }
    else if (resetPage) p.delete('page');
    setSp(p, { preventScrollReset: false });
  }
  function clearAll() {
    const p = new URLSearchParams(sp);
    ['brand', 'narx', 'holat', 'sort', 'page'].forEach((k) => p.delete(k));
    setSp(p);
  }
  function removeChip(kind: 'brand' | 'price' | 'condition', value?: string) {
    if (kind === 'brand' && value) update({ brands: filters.brands.filter((b) => b !== value) });
    else if (kind === 'price') update({ priceMin: null, priceMax: null });
    else if (kind === 'condition') update({ condition: null });
  }

  const panel = (
    <FilterPanel t={t} brands={brands} facets={result.facets} filters={filters} onChange={(n) => { update(n); setSheetOpen(false); }} onClear={() => { clearAll(); setSheetOpen(false); }} />
  );

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[24px] md:text-[32px] font-semibold tracking-[-0.02em]">{title}</h1>
          <span className="text-[14px] text-[#86868B]">{result.total} {t.resultsCount}</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setSheetOpen(true)} className="lg:hidden inline-flex items-center gap-2 border border-[#D2D2D7] rounded-full px-4 py-2 text-[14px] font-semibold">
            <SlidersHorizontal className="w-4 h-4" /> {t.filterTitle}
          </button>
          <SortSelect t={t} value={filters.sort} onChange={(v: SortKey) => update({ sort: v })} />
        </div>
      </div>

      <div className="mb-4"><ActiveFilterChips t={t} filters={filters} brands={brands} onRemove={removeChip} /></div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
        <aside className="hidden lg:block">{panel}</aside>
        <div>
          <ProductGrid t={t} items={result.items} config={config} />
          <Pagination page={filters.page} total={result.total} onPage={(n) => update({ page: n }, false)} />
        </div>
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSheetOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-[24px] p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">{t.filterTitle}</h2>
              <button onClick={() => setSheetOpen(false)} aria-label={t.filterClear}><X className="w-5 h-5" /></button>
            </div>
            {panel}
          </div>
        </div>
      )}
    </div>
  );
};
export default CatalogView;
```
> Eslatma: `ProductGrid`ning 2-kolonna grid'i lg'da 4 → yon panel bilan torroq bo'ladi; hozircha o'zgartirilmaydi (skin bosqichi sozlaydi).

- [ ] **Step 2: `app/routes/category.tsx` loader'ini yangilash**

```tsx
import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/category';
import { resolveLocale } from '../lib/i18n';
import { pageTitle } from '../lib/seo';
import { parseCatalogFilters } from '../lib/catalog';
import { queryProducts, loadConfig, loadCategories, loadBrands } from '../lib/loaders';
import type { StoreContext } from '../../src/store/StoreLayout';
import CategoryPage from '../../src/store/CategoryPage';

export async function loader({ params, request, context }: Route.LoaderArgs) {
  if (!resolveLocale(params.lang)) throw new Response('Not Found', { status: 404 });
  const env = context.cloudflare.env;
  const slug = params.slug as string;
  const filters = parseCatalogFilters(new URL(request.url).searchParams, { category: slug });
  const [result, config, categories, brands] = await Promise.all([
    queryProducts(env, filters), loadConfig(env), loadCategories(env), loadBrands(env),
  ]);
  const title = categories.find((c) => c.id === slug)?.name ?? slug;
  return { result, config, title, brands, filters };
}

export function meta({ data }: Route.MetaArgs) {
  return [{ title: pageTitle(data?.title) }];
}

export default function CategoryRoute() {
  const { result, config, title, brands, filters } = useLoaderData<typeof loader>();
  const ctx = useOutletContext<StoreContext>();
  return <CategoryPage t={ctx.t} title={title} result={result} config={config} brands={brands} filters={filters} />;
}
```

- [ ] **Step 3: `CategoryPage.tsx` → CatalogView wrapper**

```tsx
import type { InstallmentConfig } from '../data/products';
import type { Translation } from '../locales';
import type { ApiBrand } from '../../shared/types';
import type { CatalogFilters, CatalogResult } from '../../app/lib/catalog';
import CatalogView from './CatalogView';

export default function CategoryPage({
  t, title, result, config, brands, filters,
}: { t: Translation; title: string; result: CatalogResult; config: InstallmentConfig; brands: ApiBrand[]; filters: CatalogFilters }) {
  return <CatalogView t={t} title={title} result={result} config={config} brands={brands} filters={filters} />;
}
```

- [ ] **Step 4: `search.tsx` + `SearchPage.tsx`** — xuddi shu pattern: loader `parseCatalogFilters(sp)` (q param avtomatik o'qiladi — `q` FILTER param'ida bor), `queryProducts` + `loadConfig` + `loadBrands`; `SearchPage` sarlavhani `t.searchResults: "q"` qilib `CatalogView`ga uzatadi (`title` prop). `SearchPage` props: `{ t, q, result, config, brands, filters }`.

- [ ] **Step 5: Build + lint + tekshirish + commit**

```bash
bun run build && bun run lint && bun run test
# dev (:5173):
curl -s "http://localhost:5173/category/telefonlar" | grep -o "mahsulot" | head -1
curl -s "http://localhost:5173/category/telefonlar?holat=yangi&sort=arzon" | grep -o "Tozalash" | head -1
git add src/store/CatalogView.tsx src/store/CategoryPage.tsx src/store/SearchPage.tsx app/routes/category.tsx app/routes/search.tsx
git commit -m "feat: catalog view with url-driven filters on category and search pages"
```

---

### Task 6: Yangi route'lar — /katalog, /brand/:slug, /chegirmalar + Header link

**Files:**
- Create: `app/routes/catalog.tsx`, `app/routes/brand.tsx`, `app/routes/deals.tsx`
- Modify: `app/routes.ts`, `src/store/Header.tsx`

**Interfaces:**
- Consumes: `queryProducts`, `loadBrands`, `loadConfig`, `parseCatalogFilters`, `CatalogView` (to'g'ridan — alohida sahifa komponenti shart emas), `pageTitle`, `localizedPath`.
- Produces: uch yangi sahifa (+ lang variantlari); Header "Katalog" tugmasi `/katalog`ga link.

- [ ] **Step 1: `app/routes/catalog.tsx`**

```tsx
import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/catalog';
import { resolveLocale } from '../lib/i18n';
import { pageTitle } from '../lib/seo';
import { parseCatalogFilters } from '../lib/catalog';
import { queryProducts, loadConfig, loadBrands } from '../lib/loaders';
import type { StoreContext } from '../../src/store/StoreLayout';
import CatalogView from '../../src/store/CatalogView';

export async function loader({ params, request, context }: Route.LoaderArgs) {
  if (!resolveLocale(params.lang)) throw new Response('Not Found', { status: 404 });
  const env = context.cloudflare.env;
  const filters = parseCatalogFilters(new URL(request.url).searchParams);
  const [result, config, brands] = await Promise.all([queryProducts(env, filters), loadConfig(env), loadBrands(env)]);
  return { result, config, brands, filters };
}

export function meta(_: Route.MetaArgs) {
  return [{ title: pageTitle('Katalog') }];
}

export default function CatalogRoute() {
  const { result, config, brands, filters } = useLoaderData<typeof loader>();
  const { t } = useOutletContext<StoreContext>();
  return <CatalogView t={t} title={t.catalogAll} result={result} config={config} brands={brands} filters={filters} />;
}
```

- [ ] **Step 2: `app/routes/brand.tsx`** — brendni slug bo'yicha topadi (topilmasa 404), `filters.brands = [brand.id]` bilan:

```tsx
import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/brand';
import { resolveLocale } from '../lib/i18n';
import { pageTitle } from '../lib/seo';
import { parseCatalogFilters } from '../lib/catalog';
import { queryProducts, loadConfig, loadBrands } from '../lib/loaders';
import type { StoreContext } from '../../src/store/StoreLayout';
import CatalogView from '../../src/store/CatalogView';

export async function loader({ params, request, context }: Route.LoaderArgs) {
  if (!resolveLocale(params.lang)) throw new Response('Not Found', { status: 404 });
  const env = context.cloudflare.env;
  const brands = await loadBrands(env);
  const brand = brands.find((b) => b.slug === params.slug);
  if (!brand) throw new Response('Not Found', { status: 404 });
  const filters = parseCatalogFilters(new URL(request.url).searchParams);
  filters.brands = [brand.id];
  const [result, config] = await Promise.all([queryProducts(env, filters), loadConfig(env)]);
  return { result, config, brand, brands, filters };
}

export function meta({ data }: Route.MetaArgs) {
  return [{ title: pageTitle(data?.brand.name) }];
}

export default function BrandRoute() {
  const { result, config, brand, brands, filters } = useLoaderData<typeof loader>();
  const { t } = useOutletContext<StoreContext>();
  return <CatalogView t={t} title={brand.name} result={result} config={config} brands={brands} filters={filters} />;
}
```
> Eslatma: brend sahifasida FilterPanel brend bo'limi ko'rinadi (joriy brend belgilangan) — qabul qilinadigan; foydalanuvchi boshqa brendni qo'shsa `?brand=` param ustuvor bo'lmaydi (loader `filters.brands`ni qayta yozadi). Bu 3-bo'lak uchun yetarli; ko'p-brend sahifa kerak bo'lsa `/katalog?brand=`.

- [ ] **Step 3: `app/routes/deals.tsx`** — `catalog.tsx` bilan bir xil, farqi: `parseCatalogFilters(sp, { onlyDeals: true })`, `title={t.dealsTitle}`, `meta` `pageTitle('Chegirmalar')`.

- [ ] **Step 4: `app/routes.ts`** — store layout ichiga (mavjud pattern bilan lang-variantlar):

```ts
route('katalog', 'routes/catalog.tsx'),
route('brand/:slug', 'routes/brand.tsx'),
route('chegirmalar', 'routes/deals.tsx'),
route(':lang/katalog', 'routes/catalog.tsx', { id: 'catalog-lang' }),
route(':lang/brand/:slug', 'routes/brand.tsx', { id: 'brand-lang' }),
route(':lang/chegirmalar', 'routes/deals.tsx', { id: 'deals-lang' }),
```
> DIQQAT: `:lang` route'lari `katalog`/`chegirmalar` bilan to'qnashmasin — statik segmentlar dinamikdan ustun (RR ranking), mavjud `search` misoli buni isbotlagan.

- [ ] **Step 5: `Header.tsx`** — "Katalog" tugmasi endi ham dropdown ochadi, ham sahifaga olib boradi: tugmani ikkiga ajratish o'rniga oddiy yechim — tugma bosilganda dropdown ochiladi (mavjud), dropdown ichiga birinchi qator sifatida `t.catalogAll` linki qo'shiladi (`localizedPath(locale, '/katalog')` bilan, mavjud kategoriya linklari uslubida, ajratuvchi chiziq bilan).

- [ ] **Step 6: Build + tekshirish + commit**

```bash
bun run build && bun run lint && bun run test
# dev (:5173):
curl -s http://localhost:5173/katalog | grep -o "Barcha mahsulotlar" | head -1
curl -s http://localhost:5173/brand/apple | grep -o "Apple" | head -1
curl -s http://localhost:5173/chegirmalar | grep -o "Chegirmalar" | head -1
curl -s http://localhost:5173/ru/katalog | grep -o "Все товары" | head -1
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/brand/nonexistent   # 404
git add app/routes/catalog.tsx app/routes/brand.tsx app/routes/deals.tsx app/routes.ts src/store/Header.tsx
git commit -m "feat: catalog, brand and deals pages with header link"
```

---

### Task 7: SEO — noindex param sahifalarda, canonical, sitemap

**Files:**
- Modify: `app/routes/catalog.tsx`, `app/routes/brand.tsx`, `app/routes/deals.tsx`, `app/routes/category.tsx`, `app/routes/search.tsx`, `app/routes/sitemap[.]xml.tsx`

**Interfaces:**
- Consumes: `hasActiveParams` (catalog.ts), `loadBrands`, `localizedPath`, `LOCALES`.
- Produces: param'li katalog sahifalarida `noindex,follow` + canonical toza yo'lga; sitemap'da `/katalog`, `/chegirmalar`, `/brand/:slug` (barcha lokallarda). Search sahifasi doim `noindex`.

- [ ] **Step 1: Meta helper** — `app/lib/seo.ts`ga qo'shing:

```ts
export function catalogMeta(title: string, requestUrl: string): Array<Record<string, string>> {
  const url = new URL(requestUrl);
  const metas: Array<Record<string, string>> = [{ title }];
  // hasActiveParams import from './catalog'
  if (hasActiveParams(url.searchParams)) {
    metas.push({ name: 'robots', content: 'noindex,follow' });
    metas.push({ tagName: 'link', rel: 'canonical', href: url.pathname });
  }
  return metas;
}
```
(`import { hasActiveParams } from './catalog';` — seo.ts boshiga.)

- [ ] **Step 2: Route meta'larini yangilash** — `catalog/brand/deals/category` route'larida `meta`da loader'dan `requestUrl`ni uzating (loader return'iga `requestUrl: request.url` qo'shing) va `return catalogMeta(pageTitle(...), data.requestUrl)`. `search.tsx`da esa doim `{ name: 'robots', content: 'noindex' }` qo'shing (qidiruv natijalari hech qachon indekslanmaydi).

- [ ] **Step 3: Sitemap** — `sitemap[.]xml.tsx` loader'ida `loadBrands` chaqirib, paths ro'yxatiga qo'shing:

```ts
const brands = await loadBrands(env);
const paths = ['/', '/katalog', '/chegirmalar',
  ...categories.map((c) => `/category/${c.id}`),
  ...brands.map((b) => `/brand/${b.slug}`),
  ...products.map((p) => `/product/${p.id}`)];
```

- [ ] **Step 4: Build + tekshirish + commit**

```bash
bun run build && bun run lint && bun run test
# dev:
curl -s "http://localhost:5173/katalog?holat=yangi" | grep -o 'noindex,follow'
curl -s "http://localhost:5173/katalog" | grep -c 'noindex' # 0 bo'lishi kerak
curl -s http://localhost:5173/sitemap.xml | grep -o "/brand/apple" | head -1
curl -s http://localhost:5173/sitemap.xml | grep -o "/katalog" | head -1
git add app/lib/seo.ts app/routes/catalog.tsx app/routes/brand.tsx app/routes/deals.tsx app/routes/category.tsx app/routes/search.tsx "app/routes/sitemap[.]xml.tsx"
git commit -m "feat: catalog seo (noindex on filtered pages, canonical, sitemap entries)"
```

---

## Self-Review

**Spec coverage (2026-07-02-catalog-engine-design.md):** §3 filtr modeli+parsing → T1; queryProducts+fasetlar+fallback → T2; §6 i18n → T3; §4 UI komponentlar → T4, CatalogView+category/search → T5; §2 yangi sahifalar+Header → T6; §5 SEO → T7; §7 testlar → T1 (TDD 11 test). §8 chegaralar — hech bir taskda variant UI/atribut-faset/2b elementi yo'q. ✔

**Placeholder scan:** TODO/TBD yo'q. T5 Step 4 va T6 Step 3/5 qisqa lekin aniq pattern-ishora bilan (aynan qaysi fayl/props/xatti-harakat). ✔

**Type consistency:** `CatalogFilters/CatalogResult/CatalogFacets/SortKey/PAGE_SIZE` T1'da e'lon, T2 (queryProducts), T4 (komponent props), T5/T6 (loader/view) bir xil nomlar bilan ishlatadi. `queryProducts` qaytarmasi `CatalogResult` — `CatalogView.result` prop'iga mos. `parseCatalogFilters(sp, base)` imzosi T5 (category: slug), T6 deals (onlyDeals: true) chaqiruvlariga mos. `update()` URL param nomlari (`brand,narx,holat,sort,page`) `parseCatalogFilters` o'qiydigan nomlar bilan bir xil. ✔

**Eslatma:** T2 `queryProducts`da 4 parallel so'rov (list/count/brandFacet/priceFacet) — D1 subquery-o'ram SQLite'da to'g'ri; agar D1 aliasga oid xato bersa, implementer WHERE'da to'liq subquery takrorlashga tushishi mumkin (deviation sifatida hujjatlashtiriladi).
