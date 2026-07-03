# 6 — Home kompozitsiyasi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Home page composed of admin-managed banner slider, deals/latest product rails and a brand strip, on top of the existing blocks.

**Architecture:** Pure `safeHref` helper + server-side `linkUrl` validation guard banner links. `loadRail` adds two light D1 queries with sample fallback. Three presentational components (`BannerSlider`, `ProductRail`, `BrandStrip`) reuse `ProductCard`/`LocaleLink`; `HomePage` recomposes; the home route loader fans out with `Promise.all`.

**Tech Stack:** React Router v7 SSR on Cloudflare Workers, D1, Tailwind v4, vitest.

## Global Constraints

- bun/bunx only, never npm. Strict TypeScript, **no `any`**. `bun run lint` + `bun run test` + `bun run build` green after every task.
- No `@types/react`: any component receiving `key` must be `FC<{...}>`-style.
- i18n: new keys MUST be added to **all 4 language blocks** of `src/locales.ts` (`O'zbek tili`, `Rus tili`, `English`, `O'zbek tili (Cyrillic)`) or the `Translation` type fails lint.
- Storefront internal links must be locale-aware: `LocaleLink` (inside Outlet) or `localizedPath`.
- Loader fallback convention: try D1 → `console.error('loadX fallback:', err)` → sample data.
- Commit format `feat:`/`fix:`; body ends with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Deals condition (single source of truth wording): `old_price_uzs IS NOT NULL AND old_price_uzs > cash_price_uzs`. Latest ordering: `created_at DESC`.

---

### Task 1: `safeHref` (TDD) + i18n kalitlari + `parseBannerInput` linkUrl validatsiyasi

**Files:**
- Create: `src/lib/safe-href.ts`
- Test: `src/lib/safe-href.test.ts`
- Modify: `src/locales.ts` (4 blokka 4 kalit)
- Modify: `functions/lib/validate.ts` (`parseBannerInput` linkUrl guard)
- Test: `functions/lib/validate.test.ts` (append)

**Interfaces:**
- Produces: `safeHref(url: string): string | null` — trimmed URL if it starts with `/`, `http://` or `https://` (scheme case-insensitive), else `null`; empty/whitespace → `null`. Translation keys `railDeals`, `railNew`, `railAll`, `homeBrands`. `parseBannerInput` rejects unsafe non-empty linkUrl with `ValidationError('link_invalid')`.

- [ ] **Step 1: Failing tests** — create `src/lib/safe-href.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { safeHref } from './safe-href';

describe('safeHref', () => {
  it('accepts internal paths and http(s) URLs', () => {
    expect(safeHref('/chegirmalar')).toBe('/chegirmalar');
    expect(safeHref('https://t.me/store')).toBe('https://t.me/store');
    expect(safeHref('http://example.com')).toBe('http://example.com');
    expect(safeHref('HTTPS://EXAMPLE.COM')).toBe('HTTPS://EXAMPLE.COM');
    expect(safeHref('  /katalog  ')).toBe('/katalog');
  });
  it('rejects unsafe or empty values', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('data:text/html,x')).toBeNull();
    expect(safeHref('mailto:a@b.c')).toBeNull();
    expect(safeHref('')).toBeNull();
    expect(safeHref('   ')).toBeNull();
    expect(safeHref('katalog')).toBeNull();
    expect(safeHref('//evil.com')).toBeNull();
  });
});
```

Append to `functions/lib/validate.test.ts` (inside a new describe or extending the existing `parseBannerInput` one):

```ts
describe('parseBannerInput linkUrl', () => {
  it('accepts empty, internal and http(s) links', () => {
    expect(parseBannerInput({ imageUrl: '/i.webp' }).linkUrl).toBe('');
    expect(parseBannerInput({ imageUrl: '/i.webp', linkUrl: '/katalog' }).linkUrl).toBe('/katalog');
    expect(parseBannerInput({ imageUrl: '/i.webp', linkUrl: 'https://t.me/x' }).linkUrl).toBe('https://t.me/x');
  });
  it('rejects unsafe schemes', () => {
    expect(() => parseBannerInput({ imageUrl: '/i.webp', linkUrl: 'javascript:alert(1)' })).toThrow('link_invalid');
  });
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `bunx vitest run src/lib/safe-href.test.ts functions/lib/validate.test.ts`
Expected: safe-href module missing; `link_invalid` test fails.

- [ ] **Step 3: Implement** — create `src/lib/safe-href.ts`:

```ts
const SAFE_HREF_RE = /^(\/(?!\/)|https?:\/\/)/i; // (?!\/) — '//evil.com' protocol-relative emas

export function safeHref(url: string): string | null {
  const u = url.trim();
  if (u === '' || !SAFE_HREF_RE.test(u)) return null;
  return u;
}
```

In `functions/lib/validate.ts`, inside `parseBannerInput`, replace the `linkUrl` line with:

```ts
  const linkUrl = typeof o.linkUrl === 'string' ? o.linkUrl.trim() : '';
  if (linkUrl !== '' && !/^(\/(?!\/)|https?:\/\/)/i.test(linkUrl)) throw new ValidationError('link_invalid');
```

- [ ] **Step 4: Run to verify PASS**

Run: `bunx vitest run src/lib/safe-href.test.ts functions/lib/validate.test.ts` → all pass.

- [ ] **Step 5: i18n kalitlari** — `src/locales.ts`ning **to'rtta** blokiga (masalan `homeFeatured` kaliti yonига) qo'shilsin:

`O'zbek tili`:
```ts
    railDeals: "Chegirmadagi mahsulotlar",
    railNew: "Yangi kelganlar",
    railAll: "Hammasi",
    homeBrands: "Brendlar",
```
`Rus tili`:
```ts
    railDeals: "Товары со скидкой",
    railNew: "Новинки",
    railAll: "Все",
    homeBrands: "Бренды",
```
`English`:
```ts
    railDeals: "Deals",
    railNew: "New arrivals",
    railAll: "See all",
    homeBrands: "Brands",
```
`O'zbek tili (Cyrillic)`:
```ts
    railDeals: "Чегирмадаги маҳсулотлар",
    railNew: "Янги келганлар",
    railAll: "Ҳаммаси",
    homeBrands: "Брендлар",
```

- [ ] **Step 6: Verify + commit**

Run: `bun run lint` → clean (Translation parity). `bun run test` → all pass (73 + 4 yangi ≈ 77).

```bash
git add src/lib/safe-href.ts src/lib/safe-href.test.ts src/locales.ts functions/lib/validate.ts functions/lib/validate.test.ts
git commit -m "feat: safe banner link helper, linkUrl validation and home rail i18n keys"
```

---

### Task 2: `loadRail` loader + `BannerSlider` / `ProductRail` / `BrandStrip` komponentlari

**Files:**
- Modify: `app/lib/loaders.ts` (append `loadRail`)
- Create: `src/store/BannerSlider.tsx`, `src/store/ProductRail.tsx`, `src/store/BrandStrip.tsx`

**Interfaces:**
- Consumes: `safeHref` (Task 1), `ApiBanner`/`ApiBrand`, `Product`/`InstallmentConfig`, `ProductCard` (`FC<{t, product, config}>`), `LocaleLink`, `localizedPath`, `PRODUCT_COLS`/`rowToProduct`/`mapProduct`/`fallbackProducts` (loaders ichida mavjud).
- Produces: `loadRail(env: Env, kind: 'deals' | 'latest', limit?: number): Promise<Product[]>` (default limit 8); `BannerSlider: FC<{ banners: ApiBanner[]; locale: Locale }>`; `ProductRail: FC<{ t: Translation; title: string; items: Product[]; config: InstallmentConfig; moreTo: string }>`; `BrandStrip: FC<{ title: string; brands: ApiBrand[] }>`.

- [ ] **Step 1: `loadRail`** — append to `app/lib/loaders.ts`:

```ts
export async function loadRail(env: Env, kind: 'deals' | 'latest', limit = 8): Promise<Product[]> {
  try {
    const where = kind === 'deals'
      ? 'is_active = 1 AND old_price_uzs IS NOT NULL AND old_price_uzs > cash_price_uzs'
      : 'is_active = 1';
    const order = kind === 'deals' ? 'sort_order ASC, created_at ASC' : 'created_at DESC';
    const { results } = await env.DB.prepare(
      `SELECT ${PRODUCT_COLS} FROM products WHERE ${where} ORDER BY ${order} LIMIT ?`,
    ).bind(limit).all<ProductRow>();
    return results.map(rowToProduct).map(mapProduct);
  } catch (err) {
    console.error('loadRail fallback:', err);
    const all = kind === 'deals'
      ? fallbackProducts.filter((p) => p.oldPriceUzs != null && p.oldPriceUzs > p.cashPriceUzs)
      : [...fallbackProducts].reverse();
    return all.slice(0, limit);
  }
}
```

- [ ] **Step 2: `BannerSlider`** — create `src/store/BannerSlider.tsx`:

```tsx
import { useRef, useState } from 'react';
import type { FC } from 'react';
import { Link } from 'react-router';
import type { ApiBanner } from '../../shared/types';
import { localizedPath, type Locale } from '../../app/lib/i18n';
import { safeHref } from '../lib/safe-href';

const Slide: FC<{ banner: ApiBanner; locale: Locale; eager: boolean }> = ({ banner, locale, eager }) => {
  const img = (
    <img
      src={banner.imageUrl}
      alt={banner.altText}
      loading={eager ? undefined : 'lazy'}
      className="w-full h-full object-cover"
    />
  );
  const href = safeHref(banner.linkUrl);
  const cls = 'w-full shrink-0 snap-start aspect-[21/9] md:aspect-[3/1] block';
  if (!href) return <div className={cls}>{img}</div>;
  if (href.startsWith('/')) return <Link to={localizedPath(locale, href)} className={cls}>{img}</Link>;
  return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{img}</a>;
};

const BannerSlider: FC<{ banners: ApiBanner[]; locale: Locale }> = ({ banners, locale }) => {
  const track = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);

  function onScroll() {
    const el = track.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  }
  function goTo(i: number) {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  }

  if (banners.length === 0) return null;
  return (
    <div className="relative rounded-[24px] overflow-hidden shadow-[--shadow-apple]">
      <div
        ref={track}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
      >
        {banners.map((b, i) => (
          <Slide key={b.id} banner={b} locale={locale} eager={i === 0} />
        ))}
      </div>
      {banners.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
          {banners.map((b, i) => (
            <button
              key={b.id}
              onClick={() => goTo(i)}
              aria-label={`${i + 1}`}
              className={`w-2 h-2 rounded-full transition-colors ${i === active ? 'bg-white' : 'bg-white/45'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerSlider;
```

- [ ] **Step 3: `ProductRail`** — create `src/store/ProductRail.tsx`:

```tsx
import type { FC } from 'react';
import { ChevronRight } from 'lucide-react';
import type { InstallmentConfig, Product } from '../data/products';
import type { Translation } from '../locales';
import ProductCard from './ProductCard';
import LocaleLink from './LocaleLink';

const ProductRail: FC<{
  t: Translation; title: string; items: Product[]; config: InstallmentConfig; moreTo: string;
}> = ({ t, title, items, config, moreTo }) => {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[22px] md:text-[28px] font-semibold tracking-[-0.02em]">{title}</h2>
        <LocaleLink to={moreTo} className="text-[14px] font-semibold text-[#0071E3] hover:underline inline-flex items-center gap-0.5">
          {t.railAll} <ChevronRight className="w-4 h-4" />
        </LocaleLink>
      </div>
      <div className="flex overflow-x-auto snap-x gap-4 no-scrollbar pb-1 -mx-4 px-4">
        {items.map((p) => (
          <div key={p.id} className="w-[220px] md:w-[260px] shrink-0 snap-start">
            <ProductCard t={t} product={p} config={config} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default ProductRail;
```

- [ ] **Step 4: `BrandStrip`** — create `src/store/BrandStrip.tsx`:

```tsx
import type { FC } from 'react';
import type { ApiBrand } from '../../shared/types';
import LocaleLink from './LocaleLink';

const BrandStrip: FC<{ title: string; brands: ApiBrand[] }> = ({ title, brands }) => {
  if (brands.length === 0) return null;
  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-[22px] md:text-[28px] font-semibold tracking-[-0.02em]">{title}</h2>
      <div className="flex overflow-x-auto gap-3 no-scrollbar pb-1">
        {brands.map((b) => (
          <LocaleLink
            key={b.id}
            to={`/brand/${b.slug}`}
            className="shrink-0 h-16 min-w-[120px] px-6 bg-white border border-[#ECECEF] rounded-2xl flex items-center justify-center shadow-[--shadow-apple] hover:border-[#0071E3] transition-colors"
          >
            {b.logoUrl
              ? <img src={b.logoUrl} alt={b.name} loading="lazy" className="max-h-8 max-w-[96px] object-contain" />
              : <span className="text-[15px] font-semibold text-[#1D1D1F]">{b.name}</span>}
          </LocaleLink>
        ))}
      </div>
    </section>
  );
};

export default BrandStrip;
```

- [ ] **Step 5: Verify + commit**

Run: `bun run lint` → clean. `bun run test` → all pass. (Komponentlar hali ishlatilmaydi — keyingi task ulaydi; lint ishlatilmagan import bermasligi uchun komponentlar faqat o'z fayllarida to'liq.)

```bash
git add app/lib/loaders.ts src/store/BannerSlider.tsx src/store/ProductRail.tsx src/store/BrandStrip.tsx
git commit -m "feat: rail loader and banner slider, product rail, brand strip components"
```

---

### Task 3: Home yig'ilishi — route loader + `HomePage` kompozitsiyasi

**Files:**
- Modify: `app/routes/home.tsx`
- Modify: `src/store/HomePage.tsx`

**Interfaces:**
- Consumes: `loadBanners`/`loadBrands` (mavjud), `loadRail` + komponentlar (Task 1–2), i18n kalitlari (Task 1).
- Produces: home loader `{ products, config, categories, banners, deals, latest, brands, locale }`.

- [ ] **Step 1: Route loader** — `app/routes/home.tsx` to'liq yangi ko'rinishi:

```tsx
import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/home';
import { resolveLocale } from '../lib/i18n';
import { pageTitle } from '../lib/seo';
import { siteConfig } from '../lib/site.config';
import { loadStore, loadCategories, loadBanners, loadBrands, loadRail } from '../lib/loaders';
import type { StoreContext } from '../../src/store/StoreLayout';
import HomePage from '../../src/store/HomePage';

export async function loader({ params, context }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  const env = context.cloudflare.env;
  const [{ products, config }, categories, banners, deals, latest, brands] = await Promise.all([
    loadStore(env), loadCategories(env), loadBanners(env),
    loadRail(env, 'deals'), loadRail(env, 'latest'), loadBrands(env),
  ]);
  return { products, config, categories, banners, deals, latest, brands, locale };
}

export function meta(_: Route.MetaArgs) {
  return [{ title: pageTitle() }, { name: 'description', content: siteConfig.seo.description }];
}

export default function HomeRoute() {
  const { products, config, categories, banners, deals, latest, brands, locale } = useLoaderData<typeof loader>();
  const ctx = useOutletContext<StoreContext>();
  return (
    <HomePage
      t={ctx.t} products={products} config={config} categories={categories}
      banners={banners} deals={deals} latest={latest} brands={brands} locale={locale}
    />
  );
}
```

(Diqqat: `loadBrands` allaqachon `app/lib/loaders.ts`da bor — importga qo'shiladi xolos.)

- [ ] **Step 2: HomePage kompozitsiyasi** — `src/store/HomePage.tsx` to'liq yangi ko'rinishi:

```tsx
import type { ApiBanner, ApiBrand, ApiCategory } from '../../shared/types';
import type { InstallmentConfig, Product } from '../data/products';
import type { Translation } from '../locales';
import type { Locale } from '../../app/lib/i18n';
import HeroBanner from './HeroBanner';
import BannerSlider from './BannerSlider';
import TrustBar from './TrustBar';
import CategoryCircles from './CategoryCircles';
import ProductRail from './ProductRail';
import BrandStrip from './BrandStrip';
import ProductGrid from './ProductGrid';
import HowItWorks from './HowItWorks';

export default function HomePage({
  t, products, config, categories, banners, deals, latest, brands, locale,
}: {
  t: Translation; products: Product[]; config: InstallmentConfig; categories: ApiCategory[];
  banners: ApiBanner[]; deals: Product[]; latest: Product[]; brands: ApiBrand[]; locale: Locale;
}) {
  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-10 flex flex-col gap-10 md:gap-14">
      {banners.length > 0 ? <BannerSlider banners={banners} locale={locale} /> : <HeroBanner t={t} />}
      <TrustBar t={t} />
      <section className="flex flex-col gap-6">
        <h2 className="text-[22px] md:text-[28px] font-semibold tracking-[-0.02em]">{t.homeCategories}</h2>
        <CategoryCircles categories={categories} />
      </section>
      <ProductRail t={t} title={t.railDeals} items={deals} config={config} moreTo="/chegirmalar" />
      <ProductRail t={t} title={t.railNew} items={latest} config={config} moreTo="/katalog?sort=yangi" />
      <BrandStrip title={t.homeBrands} brands={brands} />
      <section id="featured" className="scroll-mt-24">
        <h2 className="text-[24px] md:text-[32px] font-semibold tracking-[-0.02em] mb-6">{t.homeFeatured}</h2>
        <ProductGrid t={t} items={products} config={config} />
      </section>
      <HowItWorks t={t} />
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `bun run lint` → clean. `bun run test` → all pass. `bun run build` → succeeds.
Smoke (faqat dev server :5173 tinglayotgan bo'lsa; o'zing server ishga tushirma): `curl -s http://localhost:5173/ | grep -c 'snap-start'` → >0 (banner/rail render), `curl -s http://localhost:5173/ru | grep -o 'Новинки'` → topiladi.

- [ ] **Step 4: Commit**

```bash
git add app/routes/home.tsx src/store/HomePage.tsx
git commit -m "feat: home composition with banner slider, rails and brand strip"
```
