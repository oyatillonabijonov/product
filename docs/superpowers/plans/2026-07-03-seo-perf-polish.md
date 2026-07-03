# 7 — SEO & performance polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rich Product/Breadcrumb JSON-LD, D1-driven meta title/description across all storefront routes, home payload cap, footer/admin polish and mobile-sheet a11y.

**Architecture:** Pure JSON-LD builders + `storeConfigFrom(matches)` duck-type helper in `app/lib/seo.ts` (routes read the store layout loader's `siteConfig` via RR v7 meta `matches` — zero extra D1 reads). `loadStore` gains an optional LIMIT. Admin gets an error-code→Uzbek map and client-side validation.

**Tech Stack:** React Router v7 SSR on Cloudflare Workers, D1, vitest.

## Global Constraints

- bun/bunx only, never npm. Strict TypeScript, **no `any`**. `bun run lint` + `bun run test` (+ `bun run build` where stated) green after every task.
- i18n: yangi kalit `breadcrumbHome` **4 til blokiga ham** qo'shiladi (`Translation` pariteti lint'da).
- No `@types/react`; `key` oluvchi komponentlar `FC<{...}>`.
- Meta konvensiya: `pageTitle(title?, suffix?)` — suffix berilmasa statik `siteConfig.seo.titleSuffix`. JSON-LD meta'da `'script:ld+json'` kaliti bilan.
- Admin UI Uzbek-only. Mavjud 77 test buzilmaydi.
- Commit format `feat:`/`fix:`; body oxiri `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: JSON-LD helperlar (TDD) + product meta boyitish

**Files:**
- Modify: `app/lib/seo.ts` (append: `productJsonLd`, `breadcrumbJsonLd`, `storeConfigFrom`; `pageTitle`ga suffix parametri)
- Test: `app/lib/seo.test.ts` (yangi)
- Modify: `app/routes/product.tsx` (loader `locale` qaytaradi; meta boyitiladi)
- Modify: `src/locales.ts` (4 blokka `breadcrumbHome`)

**Interfaces:**
- Consumes: `ProductDetail` (`app/lib/loaders.ts`, type-only), `ApiSiteConfig`, `localeToLang`/`translations`, `localizedPath`.
- Produces: `pageTitle(title?: string, suffix?: string): string`; `storeConfigFrom(matches: unknown): ApiSiteConfig | undefined`; `productJsonLd(p: ProductDetail, url: string): object`; `breadcrumbJsonLd(items: {name: string; url: string}[]): object`. i18n kaliti `breadcrumbHome`.

- [ ] **Step 1: Failing tests** — create `app/lib/seo.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { pageTitle, productJsonLd, breadcrumbJsonLd, storeConfigFrom } from './seo';
import type { ProductDetail } from './loaders';

function makeDetail(over: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: 'p1', name: 'iPhone 15', category: 'iphone', condition: 'yangi',
    image: '/i.webp', cashPriceUzs: 1000, oldPriceUzs: null, minPriceUzs: 900,
    brandId: null, categoryId: null, description: null, images: ['/i.webp'],
    specs: [], brand: null, options: [], variants: [],
    ...over,
  };
}

describe('pageTitle suffix', () => {
  it('uses the given suffix', () => {
    expect(pageTitle('Katalog', 'Yangi Do\'kon')).toBe("Katalog — Yangi Do'kon");
    expect(pageTitle(undefined, 'Yangi Do\'kon')).toBe("Yangi Do'kon");
  });
  it('falls back to static suffix without one', () => {
    expect(pageTitle('X')).toContain('X — ');
  });
});

describe('productJsonLd', () => {
  it('builds offer from minPriceUzs, InStock for variantless', () => {
    const ld = productJsonLd(makeDetail(), '/product/p1') as {
      offers: { price: number; priceCurrency: string; availability: string; url: string };
      name: string; image: string[];
    };
    expect(ld.name).toBe('iPhone 15');
    expect(ld.offers.price).toBe(900);
    expect(ld.offers.priceCurrency).toBe('UZS');
    expect(ld.offers.availability).toBe('https://schema.org/InStock');
    expect(ld.offers.url).toBe('/product/p1');
  });
  it('OutOfStock when all variants out of stock, InStock when any in stock', () => {
    const v = (inStock: boolean) => ({ id: 'v', sku: null, cashPriceUzs: 900, oldPriceUzs: null, imageUrl: null, inStock, sortOrder: 0, optionValueIds: [] });
    const out = productJsonLd(makeDetail({ variants: [v(false), v(false)] }), '/p') as { offers: { availability: string } };
    expect(out.offers.availability).toBe('https://schema.org/OutOfStock');
    const okay = productJsonLd(makeDetail({ variants: [v(false), v(true)] }), '/p') as { offers: { availability: string } };
    expect(okay.offers.availability).toBe('https://schema.org/InStock');
  });
  it('includes brand and description only when present', () => {
    const bare = productJsonLd(makeDetail(), '/p') as Record<string, unknown>;
    expect('brand' in bare).toBe(false);
    expect('description' in bare).toBe(false);
    const rich = productJsonLd(makeDetail({
      description: 'Tavsif',
      brand: { id: 'b', name: 'Apple', slug: 'apple', logoUrl: '', sortOrder: 0 },
    }), '/p') as { brand: { name: string }; description: string };
    expect(rich.brand.name).toBe('Apple');
    expect(rich.description).toBe('Tavsif');
  });
});

describe('breadcrumbJsonLd', () => {
  it('numbers positions from 1', () => {
    const ld = breadcrumbJsonLd([
      { name: 'Bosh sahifa', url: '/' },
      { name: 'iPhone 15', url: '/product/p1' },
    ]) as { itemListElement: { position: number; name: string; item: string }[] };
    expect(ld.itemListElement).toHaveLength(2);
    expect(ld.itemListElement[0].position).toBe(1);
    expect(ld.itemListElement[1]).toEqual({ '@type': 'ListItem', position: 2, name: 'iPhone 15', item: '/product/p1' });
  });
});

describe('storeConfigFrom', () => {
  const cfg = { seoTitleSuffix: 'S', seoDescription: 'D', name: 'N', phone: '', phoneDisplay: '', telegram: '', instagram: '', whatsapp: '', mapLl: '', mapLabel: '', ogImage: '' };
  it('finds siteConfig in matches array', () => {
    expect(storeConfigFrom([{ data: undefined }, { data: { siteConfig: cfg } }])).toEqual(cfg);
  });
  it('returns undefined for junk', () => {
    expect(storeConfigFrom(undefined)).toBeUndefined();
    expect(storeConfigFrom([{ data: { x: 1 } }, null])).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify FAIL** — `bunx vitest run app/lib/seo.test.ts` (exportlar yo'q).

- [ ] **Step 3: Implement** — `app/lib/seo.ts`:

`pageTitle`ni almashtir:

```ts
export function pageTitle(title?: string, suffix?: string): string {
  const sfx = suffix ?? siteConfig.seo.titleSuffix;
  return title ? `${title} — ${sfx}` : sfx;
}
```

Append (importlarga `import type { ApiSiteConfig } from '../../shared/types';` allaqachon bor — 2b'da qo'shilgan; `import type { ProductDetail } from './loaders';` qo'shilsin):

```ts
export function storeConfigFrom(matches: unknown): ApiSiteConfig | undefined {
  if (!Array.isArray(matches)) return undefined;
  for (const m of matches) {
    const c = (m as { data?: { siteConfig?: ApiSiteConfig } } | null | undefined)?.data?.siteConfig;
    if (c && typeof c.seoTitleSuffix === 'string') return c;
  }
  return undefined;
}

export function productJsonLd(p: ProductDetail, url: string) {
  const inStock = p.variants.length === 0 || p.variants.some((v) => v.inStock);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    image: p.images,
    ...(p.description ? { description: p.description } : {}),
    ...(p.brand ? { brand: { '@type': 'Brand', name: p.brand.name } } : {}),
    offers: {
      '@type': 'Offer',
      price: p.minPriceUzs,
      priceCurrency: 'UZS',
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url,
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem', position: i + 1, name: it.name, item: it.url,
    })),
  };
}
```

- [ ] **Step 4: Run to verify PASS** — `bunx vitest run app/lib/seo.test.ts`.

- [ ] **Step 5: i18n** — `src/locales.ts` 4 blokka (masalan `homeCategories` yonига): uz `breadcrumbHome: "Bosh sahifa",` · ru `breadcrumbHome: "Главная",` · en `breadcrumbHome: "Home",` · cyrl `breadcrumbHome: "Бош саҳифа",`.

- [ ] **Step 6: product route** — `app/routes/product.tsx`: loader return'iga `locale` qo'shilsin (`resolveLocale` natijasi allaqachon bor — `const locale = resolveLocale(params.lang); if (!locale) throw ...` shakliga keltirib, `return { product, config, similar, locale };`). Meta almashtirilsin (importlarga `storeConfigFrom, productJsonLd, breadcrumbJsonLd` seo'dan, `localizedPath, localeToLang` i18n'dan, `translations` `../../src/locales`dan qo'shilsin):

```ts
export function meta({ data, matches }: Route.MetaArgs) {
  const cfg = storeConfigFrom(matches);
  if (!data) return [{ title: pageTitle(undefined, cfg?.seoTitleSuffix) }];
  const t = translations[localeToLang(data.locale)];
  const path = localizedPath(data.locale, `/product/${data.product.id}`);
  const desc = (data.product.conditionNote ?? data.product.description?.split('\n')[0] ?? '').slice(0, 160);
  return [
    { title: pageTitle(data.product.name, cfg?.seoTitleSuffix) },
    ...(desc ? [{ name: 'description', content: desc }] : []),
    { 'script:ld+json': productJsonLd(data.product, path) },
    { 'script:ld+json': breadcrumbJsonLd([
      { name: t.breadcrumbHome, url: localizedPath(data.locale, '/') },
      { name: data.product.name, url: path },
    ]) },
  ];
}
```

- [ ] **Step 7: Verify + commit** — `bun run lint` clean, `bun run test` all pass (77 + 8 yangi = 85).

```bash
git add app/lib/seo.ts app/lib/seo.test.ts app/routes/product.tsx src/locales.ts
git commit -m "feat: product and breadcrumb JSON-LD with config-aware page titles"
```

---

### Task 2: Title suffiksi/description D1'dan (8 route) + `firstParagraph` ul-fallback

**Files:**
- Modify: `app/routes/{home,category,search,cart,catalog,brand,deals,page}.tsx` (faqat `meta` + kerakli import)
- Modify: `src/lib/markdown.ts` (`firstParagraph`)
- Test: `src/lib/markdown.test.ts` (append)

**Interfaces:**
- Consumes: `storeConfigFrom`, ikkinchi-parametrli `pageTitle` (Task 1).
- Produces: barcha storefront metalari D1 `seoTitleSuffix`dan foydalanadi; `firstParagraph` ro'yxat-fallback'li.

- [ ] **Step 1: Failing test** — `src/lib/markdown.test.ts`dagi `firstParagraph` describe'iga:

```ts
  it('falls back to the first list item when there is no paragraph', () => {
    expect(firstParagraph('- Birinchi **shart**\n- Ikkinchi')).toBe('Birinchi shart');
  });
```

Run: `bunx vitest run src/lib/markdown.test.ts` → FAIL.

- [ ] **Step 2: Implement** — `src/lib/markdown.ts`da `firstParagraph`ni almashtir:

```ts
export function firstParagraph(src: string): string {
  const blocks = renderMarkdown(src);
  for (const b of blocks) {
    if (b.type === 'p') return b.inlines.map((s) => s.text).join('');
  }
  for (const b of blocks) {
    if (b.type === 'ul' && b.items.length > 0) return b.items[0].map((s) => s.text).join('');
  }
  return '';
}
```

Run: `bunx vitest run src/lib/markdown.test.ts` → PASS.

- [ ] **Step 3: Route metalari.** Har faylda `storeConfigFrom` seo importiga qo'shiladi va meta quyidagicha bo'ladi (faqat meta o'zgaradi):

`home.tsx`:
```ts
export function meta({ matches }: Route.MetaArgs) {
  const cfg = storeConfigFrom(matches);
  return [
    { title: pageTitle(undefined, cfg?.seoTitleSuffix) },
    { name: 'description', content: cfg?.seoDescription ?? siteConfig.seo.description },
  ];
}
```

`category.tsx`, `catalog.tsx`, `brand.tsx`, `deals.tsx` (to'rttasida bir xil naqsh; brand'da sarlavha `data.brand.name`, category'da `data.title`, qolganlarida `data.metaTitle`):
```ts
export function meta({ data, matches }: Route.MetaArgs) {
  const sfx = storeConfigFrom(matches)?.seoTitleSuffix;
  if (!data) return [{ title: pageTitle(undefined, sfx) }];
  return catalogMeta(pageTitle(data.metaTitle, sfx), data.requestUrl);
}
```

`search.tsx`:
```ts
export function meta({ data, matches }: Route.MetaArgs) {
  const sfx = storeConfigFrom(matches)?.seoTitleSuffix;
  return [{ title: pageTitle(data?.q ? `"${data.q}"` : undefined, sfx) }, { name: 'robots', content: 'noindex' }];
}
```

`cart.tsx`:
```ts
export function meta({ data, matches }: Route.MetaArgs) {
  const sfx = storeConfigFrom(matches)?.seoTitleSuffix;
  return [
    { title: pageTitle(data?.metaTitle, sfx) },
    { name: 'robots', content: 'noindex' },
  ];
}
```

`page.tsx` (mavjud tanaga faqat `sfx` qo'shiladi):
```ts
export function meta({ data, matches }: Route.MetaArgs) {
  const sfx = storeConfigFrom(matches)?.seoTitleSuffix;
  if (!data) return [{ title: pageTitle(undefined, sfx) }];
  const key = localeToTextKey(data.locale);
  const desc = firstParagraph(data.page.content[key]);
  return [
    { title: pageTitle(data.page.title[key], sfx) },
    ...(desc ? [{ name: 'description', content: desc }] : []),
  ];
}
```

- [ ] **Step 4: Verify + commit** — `bun run lint` clean, `bun run test` all pass (86).

```bash
git add app/routes/home.tsx app/routes/category.tsx app/routes/search.tsx app/routes/cart.tsx app/routes/catalog.tsx app/routes/brand.tsx app/routes/deals.tsx app/routes/page.tsx src/lib/markdown.ts src/lib/markdown.test.ts
git commit -m "feat: D1-driven meta title suffix across storefront and list-aware descriptions"
```

---

### Task 3: Home payload cap + footer polish

**Files:**
- Modify: `app/lib/loaders.ts` (`loadStore` limit opsiyasi)
- Modify: `app/routes/home.tsx` (limit: 12)
- Modify: `src/store/HomePage.tsx` (featured sarlavhasiga "Hammasi" link)
- Modify: `src/store/Footer.tsx` (bo'sh kontaktlarni tushirish, iframe title)

**Interfaces:**
- Produces: `loadStore(env: Env, opts?: { limit?: number })` — limit berilsa SQLga ` LIMIT ?` qo'shiladi va fallback ham `slice(0, limit)`; berilmasa hozirgidek to'liq (sitemap shunga tayanadi).

- [ ] **Step 1: loadStore** — `app/lib/loaders.ts`da signature `export async function loadStore(env: Env, opts?: { limit?: number })` bo'lsin; products IIFE ichi:

```ts
      try {
        const limit = opts?.limit;
        const sql = `SELECT ${PRODUCT_COLS} FROM products WHERE is_active = 1 ORDER BY sort_order ASC, created_at ASC${limit ? ' LIMIT ?' : ''}`;
        const stmt = limit ? env.DB.prepare(sql).bind(limit) : env.DB.prepare(sql);
        const { results } = await stmt.all<ProductRow>();
        if (results.length === 0) throw new Error('empty');
        return results.map(rowToProduct).map(mapProduct);
      } catch (err) {
        console.error('loadStore products fallback:', err);
        return opts?.limit ? fallbackProducts.slice(0, opts.limit) : fallbackProducts;
      }
```

- [ ] **Step 2: home loader** — `app/routes/home.tsx`da `loadStore(env)` → `loadStore(env, { limit: 12 })`.

- [ ] **Step 3: HomePage featured sarlavhasi** — `src/store/HomePage.tsx`dagi featured section sarlavha qatori quyidagicha bo'lsin (`LocaleLink` va `ChevronRight` import qilinadi):

```tsx
      <section id="featured" className="scroll-mt-24">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-[24px] md:text-[32px] font-semibold tracking-[-0.02em]">{t.homeFeatured}</h2>
          <LocaleLink to="/katalog" className="text-[14px] font-semibold text-[#0071E3] hover:underline inline-flex items-center gap-0.5">
            {t.railAll} <ChevronRight className="w-4 h-4" />
          </LocaleLink>
        </div>
        <ProductGrid t={t} items={products} config={config} />
      </section>
```

- [ ] **Step 4: Footer polish** — `src/store/Footer.tsx`:
  - Telefon qatori `{config.phone && (<a ...>...</a>)}` bilan o'raladi; Telegram qatori `{config.telegram && (...)}`; Instagram qatori `{config.instagram && (...)}` (handle hisoblashlar joyida qoladi — bo'sh bo'lsa render bo'lmaydi).
  - iframe atributi: `title={config.mapLabel || 'Store location'}` (hozirgi hardcoded matn o'rniga).

- [ ] **Step 5: Verify + commit** — `bun run lint` clean, `bun run test` all pass, `bun run build` succeeds. loadStore chaqiruvlarini tekshir: `grep -rn "loadStore(" app/ | grep -v loaders.ts` — faqat home limitli, sitemap limitsiz.

```bash
git add app/lib/loaders.ts app/routes/home.tsx src/store/HomePage.tsx src/store/Footer.tsx
git commit -m "feat: cap home featured payload and polish footer contacts"
```

---

### Task 4: Admin polish (errText + klient validatsiya + catch) va mobil sheet a11y

**Files:**
- Create: `src/admin/errText.ts`
- Modify: `src/admin/BannerForm.tsx`, `src/admin/PageForm.tsx`, `src/admin/SiteConfigForm.tsx`, `src/admin/BannerList.tsx`, `src/admin/PageList.tsx`
- Modify: `src/store/CatalogView.tsx` (sheet a11y)

**Interfaces:**
- Produces: `errText(e: unknown): string` — server xato kodini o'zbekcha xabarga aylantiradi; nomalum kod → kodning o'zi yoki "Xatolik yuz berdi".

- [ ] **Step 1: errText** — create `src/admin/errText.ts`:

```ts
const MESSAGES: Record<string, string> = {
  imageUrl_required: 'Banner rasmi majburiy',
  link_invalid: "Link '/' yoki 'https://' bilan boshlanishi kerak",
  slug_required: 'Slug majburiy',
  slug_invalid: "Slug faqat kichik lotin harflari, raqam va '-' dan iborat bo'lishi kerak",
  slug_taken: 'Bu slug band — boshqasini tanlang',
  title_uz_required: "Sarlavha (o'zbek lotin) majburiy",
  title_ru_required: 'Sarlavha (rus) majburiy',
  title_en_required: 'Sarlavha (ingliz) majburiy',
  title_uzCyrl_required: 'Sarlavha (kirill) majburiy',
  name_required: "Do'kon nomi majburiy",
  phone_required: 'Telefon majburiy',
};

export function errText(e: unknown): string {
  const code = e instanceof Error ? e.message : '';
  return MESSAGES[code] ?? (code || 'Xatolik yuz berdi');
}
```

- [ ] **Step 2: Formalar catch'lari** — uchchala formada `catch (e) { ... }` ichidagi `e instanceof Error ? e.message : 'Xatolik'` iboralari `errText(e)` bilan almashtiriladi (`import { errText } from './errText';`). `SiteConfigForm`dagi `setMsg(e instanceof Error ? e.message : 'Xatolik')` ham `setMsg(errText(e))`.

- [ ] **Step 3: PageForm klient validatsiyasi** — `save()` boshiga (fetch'dan oldin):

```ts
    const SLUG_RE = /^[a-z0-9-]+$/;
    if (!SLUG_RE.test(slug.trim())) { setError(errText(new Error(slug.trim() ? 'slug_invalid' : 'slug_required'))); return; }
    for (const l of LANGS) {
      if (!title[l.key].trim()) { setError(`Sarlavha (${l.label}) majburiy`); return; }
    }
```

`SiteConfigForm.save()` boshiga: `if (!form.name.trim() || !form.phone.trim()) { setMsg(errText(new Error(!form.name.trim() ? 'name_required' : 'phone_required'))); return; }`.

- [ ] **Step 4: List catch'lari** — `BannerList` va `PageList`da `refresh()`:

```ts
  const [error, setError] = useState('');
  async function refresh() {
    setLoading(true);
    try {
      setItems(await listBanners()); // PageList'da listPages()
      setError('');
    } catch {
      setError("Yuklashda xatolik (migratsiya qo'llanganmi?)");
    } finally {
      setLoading(false);
      setEditing(null);
      setCreating(false);
    }
  }
```

va render boshida `if (loading) ...`dan keyin: `if (error) return <p className="text-[#E8462D]">{error}</p>;`

- [ ] **Step 5: Sheet a11y** — `src/store/CatalogView.tsx`:
  - Importlarga `useEffect, useRef` (react'dan) qo'shilsin.
  - Komponent ichiga:

```ts
  const closeBtn = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!sheetOpen) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheetOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheetOpen]);
```

  - Sheet panel div'i (`absolute bottom-0 inset-x-0 bg-white ...`) atributlari: `role="dialog" aria-modal="true" aria-label={t.filterTitle}`.
  - Yopish tugmasi: `ref={closeBtn}` qo'shiladi (mavjud `aria-label` qoladi).

- [ ] **Step 6: Verify + commit** — `bun run lint` clean, `bun run test` all pass, `bun run build` succeeds.

```bash
git add src/admin/errText.ts src/admin/BannerForm.tsx src/admin/PageForm.tsx src/admin/SiteConfigForm.tsx src/admin/BannerList.tsx src/admin/PageList.tsx src/store/CatalogView.tsx
git commit -m "feat: uzbek admin error messages, client validation and filter sheet a11y"
```
