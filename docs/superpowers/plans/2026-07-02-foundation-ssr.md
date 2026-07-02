# Foundation & SSR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Storefront'ni React Router v7 framework mode (SSR) + Cloudflare Workers'ga ko'chirish, mavjud biznes-logikani (`functions/lib`) qayta ishlatgan holda; admin logikasi/UI'ini buzmasdan.

**Architecture:** Deploy Cloudflare Pages → Workers. Yagona Worker RR v7 orqali storefront'ni SSR qiladi va mavjud API'ni yupqa RR resource route'lar sifatida ochadi. Storefront `loader`'lari D1'ni to'g'ridan (`functions/lib`) o'qiydi; lokal dev'da sample-data fallback. Til URL-prefiks orqali (`/`, `/ru`, `/en`, `/uz-cyrl`). Vizual komponentlar `src/store/*`da qoladi; `app/routes/*` — loader/meta bilan yupqa route modullari.

**Tech Stack:** React 19, React Router v7 (`@react-router/dev`), `@cloudflare/vite-plugin`, Cloudflare Workers + D1 + R2, Tailwind v4, TypeScript strict, bun, vitest, wrangler.

## Global Constraints

- Paket menejeri: **bun**; Cloudflare: **`bunx wrangler`**.
- Strict TypeScript, `any` **ishlatilmaydi**. Har taskdan keyin `bun run lint` toza.
- Mavjud pure-logic testlar (`bun run test`, 10/10) **buzilmasin**.
- **Admin UI (`src/admin/*`) va biznes-logika (`functions/lib/*`, `shared/types.ts`, `src/lib/installment.ts`, `src/locales.ts`) tegilmaydi** — faqat import qilinadi/qayta ochiladi.
- API URL'lari o'zgarmaydi: `/api/products`, `/api/products/:id`, `/api/categories`, `/api/settings`, `/api/admin/*`, `/images/*`.
- Ruxsat etilgan lokallar: `uz` (default, prefikssiz), `ru`, `en`, `uz-cyrl`. `LangKey` ↔ locale xaritasi bitta joyda.
- Commit formati: `feat:`, `fix:`, `chore:`, `docs:`.
- Migratsiya fayllariga tegilmaydi; `wrangler.toml` binding nomlari (`DB`, `IMAGES`, `database_name`, `bucket_name`) saqlanadi.

---

## File Structure

**Yangi (yaratiladi):**
- `react-router.config.ts` — `{ ssr: true }`.
- `workers/app.ts` — Worker fetch entry (`createRequestHandler` + `{ cloudflare: { env, ctx } }`).
- `app/root.tsx` — HTML shell, `<html lang>`, Meta/Links/Scripts, tema css importi.
- `app/entry.server.tsx`, `app/entry.client.tsx` — RR default entry'lar (scaffold).
- `app/routes.ts` — route konfiguratsiyasi (layout + child + resource route'lar).
- `app/lib/i18n.ts` — locale konstantalari, `LangKey`↔locale, `resolveLocale`, `localizedPath`, `hreflangLinks`.
- `app/lib/site.config.ts` — brend/kontakt/ijtimoiy/tillar/valyuta/xarita/SEO konfiguratsiyasi.
- `app/lib/loaders.ts` — server ma'lumot funksiyalari (`loadStore`, `loadCategories`, `loadProductsBy`, `loadProductDetail`) — D1 (`context`) + fallback.
- `app/lib/seo.ts` — `metaTags`, `organizationJsonLd` yordamchilari.
- `app/routes/store.tsx` — layout route (`StoreLayout` + `Outlet context={{t,lang}}`), lang loader.
- `app/routes/home.tsx`, `category.tsx`, `product.tsx`, `search.tsx`, `not-found.tsx` — storefront route modullari.
- `app/routes/admin.tsx` — `/admin/*` klient-render (`AdminApp`), `ssr:false`.
- `app/routes/api.*.tsx` — public API resource route'lar.
- `app/routes/api.admin.*.tsx` — admin API resource route'lar + guard.
- `app/routes/api.admin.guard.ts` — umumiy admin session guard (`functions/lib/auth`).
- `app/routes/images.$.tsx` — R2 stream resource route.
- `app/routes/sitemap[.]xml.tsx`, `app/routes/robots[.]txt.tsx` — SEO resource route'lar.

**O'zgartiriladi:**
- `package.json` — RR skriptlari + paketlar.
- `vite.config.ts` — `cloudflare()` + `reactRouter()` + `tailwindcss()`.
- `wrangler.toml` — Workers rejimi (`main`, `assets`).
- `tsconfig.json` — `app`/`workers` include, RR tiplar.
- `src/store/{HomePage,CategoryPage,ProductPage,SearchPage}.tsx` — `useEffect` fetch o'rniga `useLoaderData`.
- `src/store/Header.tsx` — til tanlagich URL navigatsiyasi; kontakt configdan.
- `src/store/{StoreLayout,Footer}.tsx` — kontakt/brend configdan.

**Qayta ishlatiladi (tegilmaydi):** `functions/lib/*`, `functions/env.ts`, `shared/types.ts`, `src/lib/installment.ts`, `src/locales.ts`, `src/data/products.ts`, `src/admin/*`, `src/index.css`.

**Oxirida o'chiriladi:** `src/main.tsx`, `src/App.tsx`, `index.html`, va resource route'larga ko'chirilgan `functions/api/*`, `functions/images/*`.

---

### Task 1: RR v7 + Cloudflare Workers scaffold (hello-world SSR)

**Files:**
- Create: `react-router.config.ts`, `workers/app.ts`, `app/root.tsx`, `app/entry.client.tsx`, `app/entry.server.tsx`, `app/routes.ts`, `app/routes/_hello.tsx`
- Modify: `package.json`, `vite.config.ts`, `wrangler.toml`, `tsconfig.json`

**Interfaces:**
- Consumes: mavjud `src/index.css`, `functions/env.ts` (`Env`).
- Produces: ishlaydigan RR v7 SSR Worker; `app/routes.ts` route registri; `workers/app.ts` `Env` context.

- [ ] **Step 1: Paketlarni o'rnatish**

```bash
bun add react-router@^7 @react-router/dev@^7 @react-router/node@^7 @react-router/serve@^7 isbot@^5
bun add -d @cloudflare/vite-plugin vite-tsconfig-paths
```
Expected: paketlar `package.json`ga qo'shiladi.

- [ ] **Step 2: `react-router.config.ts` yaratish**

```ts
import type { Config } from '@react-router/dev/config';

export default {
  ssr: true,
  appDirectory: 'app',
} satisfies Config;
```

- [ ] **Step 3: `vite.config.ts`ni almashtirish**

```ts
import { reactRouter } from '@react-router/dev/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    plugins: [
      cloudflare({ viteEnvironment: { name: 'ssr' } }),
      tailwindcss(),
      reactRouter(),
      tsconfigPaths(),
    ],
  };
});
```

- [ ] **Step 4: `workers/app.ts` yaratish (Env context bilan)**

```ts
import { createRequestHandler } from 'react-router';
import type { Env } from '../functions/env';

declare module 'react-router' {
  interface AppLoadContext {
    cloudflare: { env: Env; ctx: ExecutionContext };
  }
}

const requestHandler = createRequestHandler(
  () => import('virtual:react-router/server-build'),
  import.meta.env.MODE,
);

export default {
  fetch(request, env, ctx) {
    return requestHandler(request, { cloudflare: { env, ctx } });
  },
} satisfies ExportedHandler<Env>;
```

- [ ] **Step 5: `app/entry.client.tsx` va `app/entry.server.tsx` yaratish**

`app/entry.client.tsx`:
```tsx
import { HydratedRouter } from 'react-router/dom';
import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
  );
});
```

`app/entry.server.tsx`:
```tsx
import { renderToReadableStream } from 'react-dom/server';
import { ServerRouter } from 'react-router';
import type { EntryContext } from 'react-router';
import { isbot } from 'isbot';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
): Promise<Response> {
  const body = await renderToReadableStream(
    <ServerRouter context={routerContext} url={request.url} />,
    {
      signal: request.signal,
      onError(error) {
        responseStatusCode = 500;
        console.error(error);
      },
    },
  );
  if (isbot(request.headers.get('user-agent'))) {
    await body.allReady;
  }
  responseHeaders.set('Content-Type', 'text/html');
  return new Response(body, { status: responseStatusCode, headers: responseHeaders });
}
```

- [ ] **Step 6: `app/root.tsx` yaratish (HTML shell + tema css)**

```tsx
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';
import './styles.css';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return <Outlet />;
}
```

- [ ] **Step 7: Tema css'ni `app/styles.css` sifatida ulash**

Run:
```bash
cp src/index.css app/styles.css
```
(Task 6'da tokenlar shu faylga qo'shiladi.)

- [ ] **Step 8: `app/routes.ts` + vaqtinchalik hello route**

`app/routes.ts`:
```ts
import { type RouteConfig, index } from '@react-router/dev/routes';

export default [index('routes/_hello.tsx')] satisfies RouteConfig;
```

`app/routes/_hello.tsx`:
```tsx
export default function Hello() {
  return <h1>SSR OK</h1>;
}
```

- [ ] **Step 9: `wrangler.toml`ni Workers rejimiga o'tkazish**

```toml
name = "taqsit-store"
compatibility_date = "2024-11-01"
compatibility_flags = ["nodejs_compat"]
main = "./workers/app.ts"

[assets]
directory = "./build/client"

[[d1_databases]]
binding = "DB"
database_name = "taqsit-store-db"
database_id = "PLACEHOLDER_RUN_wrangler_d1_create"

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "taqsit-store-images"
```
> `pages_build_output_dir` olib tashlandi (endi Pages emas, Workers).

- [ ] **Step 10: `package.json` skriptlari**

`scripts`ni almashtiring:
```json
"scripts": {
  "dev": "react-router dev",
  "build": "react-router build",
  "start": "wrangler dev",
  "deploy": "bun run build && wrangler deploy",
  "typecheck": "react-router typegen && tsc --noEmit",
  "lint": "react-router typegen && tsc --noEmit && tsc --noEmit -p functions/tsconfig.json",
  "test": "vitest run"
}
```

- [ ] **Step 11: `tsconfig.json`ni yangilash**

`include` va tiplarni yangilang:
```json
{
  "include": ["app", "workers", "src", "shared", ".react-router/types/**/*"],
  "compilerOptions": {
    "types": ["@cloudflare/workers-types", "vite/client"],
    "rootDirs": [".", "./.react-router/types"]
  }
}
```
(mavjud `compilerOptions` maydonlarini saqlab, yuqoridagilarni qo'shing/birlashtiring.)

- [ ] **Step 12: Build va SSR tekshiruvi**

Run:
```bash
bun run build && bun run lint
```
Expected: build toza, lint toza.

Run (fon):
```bash
bunx wrangler dev --port 8788 &
sleep 4
curl -s http://localhost:8788/ | grep -o "SSR OK"
kill %1
```
Expected: `SSR OK` (server HTML'da matn bor — SSR ishlaydi).

- [ ] **Step 13: Commit**

```bash
git add react-router.config.ts vite.config.ts wrangler.toml tsconfig.json package.json bun.lock workers app
git commit -m "feat: scaffold react-router v7 ssr on cloudflare workers"
```

---

### Task 2: i18n locale foundation (pure logic, TDD)

**Files:**
- Create: `app/lib/i18n.ts`, `app/lib/i18n.test.ts`

**Interfaces:**
- Consumes: `src/locales.ts` (`translations`, `LangKey`).
- Produces:
  - `LOCALES: readonly ['uz','ru','en','uz-cyrl']`, `DEFAULT_LOCALE = 'uz'`, `Locale` tipi.
  - `localeToLang(locale: Locale): LangKey`, `langToLocale(lang: LangKey): Locale`.
  - `resolveLocale(param: string | undefined): Locale | null` (noto'g'ri → null).
  - `localizedPath(locale: Locale, path: string): string` (default → prefikssiz).
  - `htmlLang(locale: Locale): string` (`uz-cyrl` → `uz-Cyrl`).

- [ ] **Step 1: Failing test yozish**

`app/lib/i18n.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { resolveLocale, localizedPath, localeToLang, langToLocale, htmlLang, DEFAULT_LOCALE } from './i18n';

describe('i18n', () => {
  it('resolves valid and default locales', () => {
    expect(resolveLocale(undefined)).toBe('uz');
    expect(resolveLocale('ru')).toBe('ru');
    expect(resolveLocale('uz-cyrl')).toBe('uz-cyrl');
  });
  it('rejects unknown locale', () => {
    expect(resolveLocale('de')).toBeNull();
    expect(resolveLocale('product')).toBeNull();
  });
  it('builds localized paths (default has no prefix)', () => {
    expect(localizedPath('uz', '/category/telefonlar')).toBe('/category/telefonlar');
    expect(localizedPath('ru', '/category/telefonlar')).toBe('/ru/category/telefonlar');
    expect(localizedPath('ru', '/')).toBe('/ru');
  });
  it('maps locale to LangKey and back', () => {
    expect(localeToLang('ru')).toBe('Rus tili');
    expect(langToLocale("O'zbek tili (Cyrillic)")).toBe('uz-cyrl');
  });
  it('produces html lang codes', () => {
    expect(htmlLang('uz-cyrl')).toBe('uz-Cyrl');
    expect(htmlLang('en')).toBe('en');
    expect(DEFAULT_LOCALE).toBe('uz');
  });
});
```

- [ ] **Step 2: Testni ishga tushirib fail bo'lishini ko'rish**

Run: `bunx vitest run app/lib/i18n.test.ts`
Expected: FAIL (`./i18n` topilmaydi).

- [ ] **Step 3: `app/lib/i18n.ts` implementatsiyasi**

```ts
import type { LangKey } from '../../src/locales';

export const LOCALES = ['uz', 'ru', 'en', 'uz-cyrl'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'uz';

const LOCALE_TO_LANG: Record<Locale, LangKey> = {
  uz: "O'zbek tili",
  ru: 'Rus tili',
  en: 'English',
  'uz-cyrl': "O'zbek tili (Cyrillic)",
};
const LANG_TO_LOCALE = Object.fromEntries(
  Object.entries(LOCALE_TO_LANG).map(([l, k]) => [k, l as Locale]),
) as Record<LangKey, Locale>;

const HTML_LANG: Record<Locale, string> = { uz: 'uz', ru: 'ru', en: 'en', 'uz-cyrl': 'uz-Cyrl' };

export function localeToLang(locale: Locale): LangKey {
  return LOCALE_TO_LANG[locale];
}
export function langToLocale(lang: LangKey): Locale {
  return LANG_TO_LOCALE[lang];
}
export function resolveLocale(param: string | undefined): Locale | null {
  if (param === undefined) return DEFAULT_LOCALE;
  return (LOCALES as readonly string[]).includes(param) ? (param as Locale) : null;
}
export function localizedPath(locale: Locale, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return clean;
  return clean === '/' ? `/${locale}` : `/${locale}${clean}`;
}
export function htmlLang(locale: Locale): string {
  return HTML_LANG[locale];
}
```

- [ ] **Step 4: Test o'tishini tekshirish**

Run: `bunx vitest run app/lib/i18n.test.ts`
Expected: PASS (5 test).

- [ ] **Step 5: To'liq test to'plami buzilmaganini tekshirish**

Run: `bun run test`
Expected: barcha test PASS (mavjud 10 + yangi 5).

- [ ] **Step 6: Commit**

```bash
git add app/lib/i18n.ts app/lib/i18n.test.ts
git commit -m "feat: url-locale i18n foundation (locale <-> lang mapping, localized paths)"
```

---

### Task 3: Server data loaders (D1 + fallback)

**Files:**
- Create: `app/lib/loaders.ts`
- Consumes: `functions/lib/db.ts`, `functions/env.ts`, `src/data/products.ts`, `shared/types.ts`.

**Interfaces:**
- Produces (barchasi `env: Env` qabul qiladi):
  - `loadCategories(env): Promise<ApiCategory[]>`
  - `loadStore(env): Promise<{ products: Product[]; config: InstallmentConfig }>`
  - `loadProductsBy(env, { category?, q? }): Promise<Product[]>`
  - `loadProductDetail(env, id): Promise<ProductDetail | null>`
  - `Product`/`ProductDetail`/`InstallmentConfig` tiplari `src/api/store.ts`dagi bilan bir xil (o'sha fayldan re-export yoki ko'chirish).

> Bu `src/api/store.ts` mantig'ining serverli (D1 to'g'ridan) versiyasi. `mapProduct`/`mapConfig` va fallback shu yerga ko'chiriladi; klient HTTP fetch o'rniga D1.

- [ ] **Step 1: `app/lib/loaders.ts` yozish**

```ts
import type { Env } from '../../functions/env';
import type { ApiProduct, ApiSettings, ApiCategory, ApiSpec } from '../../shared/types';
import type { InstallmentConfig, Product } from '../../src/data/products';
import {
  installmentConfig as fallbackConfig,
  products as fallbackProducts,
  categories as fallbackCategories,
  fallbackCategoryOf,
} from '../../src/data/products';
import {
  rowToProduct, rowToCategory, buildProductDetail,
  type ProductRow, type CategoryRow, type SettingsRow, rowToSettings,
} from '../../functions/lib/db';

export interface ProductDetail extends Product {
  oldPriceUzs: number | null;
  description: string | null;
  images: string[];
  specs: ApiSpec[];
}

function mapProduct(p: ApiProduct): Product {
  return {
    id: p.id, name: p.name, category: p.category, condition: p.condition,
    conditionNote: p.conditionNote ?? undefined, image: p.imageUrl,
    cashPriceUzs: p.cashPriceUzs, oldPriceUzs: p.oldPriceUzs ?? null,
  };
}
function mapConfig(s: ApiSettings): InstallmentConfig {
  return { downPaymentPercent: s.downPaymentPercent, usdToUzs: s.usdToUzs, terms: s.terms };
}

export async function loadCategories(env: Env): Promise<ApiCategory[]> {
  try {
    const { results } = await env.DB.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all<CategoryRow>();
    if (results.length === 0) throw new Error('empty');
    return results.map(rowToCategory);
  } catch {
    return fallbackCategories;
  }
}

export async function loadStore(env: Env): Promise<{ products: Product[]; config: InstallmentConfig }> {
  const [products, config] = await Promise.all([
    (async () => {
      try {
        const { results } = await env.DB.prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY sort_order ASC, created_at ASC').all<ProductRow>();
        if (results.length === 0) throw new Error('empty');
        return results.map(rowToProduct).map(mapProduct);
      } catch {
        return fallbackProducts;
      }
    })(),
    (async () => {
      try {
        const row = await env.DB.prepare('SELECT * FROM settings WHERE id = 1').first<SettingsRow>();
        if (!row) throw new Error('no_settings');
        return mapConfig(rowToSettings(row));
      } catch {
        return fallbackConfig;
      }
    })(),
  ]);
  return { products, config };
}

export async function loadProductsBy(env: Env, params: { category?: string; q?: string }): Promise<Product[]> {
  try {
    let sql = 'SELECT * FROM products WHERE is_active = 1';
    const binds: unknown[] = [];
    if (params.category) { sql += ' AND category_id = ?'; binds.push(params.category); }
    if (params.q && params.q.trim() !== '') { sql += ' AND name LIKE ?'; binds.push(`%${params.q.trim()}%`); }
    sql += ' ORDER BY sort_order ASC, created_at ASC';
    const { results } = await env.DB.prepare(sql).bind(...binds).all<ProductRow>();
    return results.map(rowToProduct).map(mapProduct);
  } catch {
    let items = fallbackProducts;
    if (params.category) items = items.filter((p) => fallbackCategoryOf(p) === params.category);
    if (params.q) { const q = params.q.toLowerCase(); items = items.filter((p) => p.name.toLowerCase().includes(q)); }
    return items;
  }
}

export async function loadProductDetail(env: Env, id: string): Promise<ProductDetail | null> {
  try {
    const d = await buildProductDetail(env, id);
    if (!d) throw new Error('not_found');
    return { ...mapProduct(d), oldPriceUzs: d.oldPriceUzs, description: d.description, images: d.images, specs: d.specs };
  } catch {
    const p = fallbackProducts.find((x) => x.id === id);
    if (!p) return null;
    return { ...p, oldPriceUzs: p.oldPriceUzs ?? null, description: p.description ?? null, images: p.image ? [p.image, ...(p.gallery ?? [])] : (p.gallery ?? []), specs: p.specs ?? [] };
  }
}
```

- [ ] **Step 2: Lint**

Run: `bun run lint`
Expected: toza (`buildProductDetail` `env: { DB }` qabul qiladi — `Env` mos).

- [ ] **Step 3: Commit**

```bash
git add app/lib/loaders.ts
git commit -m "feat: server-side d1 data loaders with sample fallback"
```

---

### Task 4: site.config + SEO helpers

**Files:**
- Create: `app/lib/site.config.ts`, `app/lib/seo.ts`

**Interfaces:**
- Produces:
  - `siteConfig` (typed const): `name, logo, phone, phoneDisplay, telegram, instagram, whatsapp, map{ll,label}, currency, seo{titleSuffix,ogImage,description}`.
  - `seo.ts`: `pageTitle(title?: string): string`, `organizationJsonLd(): object`, `hreflangLinks(pathname: string): { tagName:'link'; rel:'alternate'; hrefLang:string; href:string }[]`.

- [ ] **Step 1: `app/lib/site.config.ts`**

```ts
export const siteConfig = {
  name: 'Taqsit Store',
  logo: '/logo.svg',
  phone: '+998886043636',
  phoneDisplay: '+998 (88) 604-36-36',
  telegram: 'https://t.me/Taqsit_store',
  instagram: 'https://www.instagram.com/taqsit.store/',
  whatsapp: 'https://wa.me/998886043636',
  map: { ll: '69.271481,41.338874', label: 'Malika Bozori, Toshkent' },
  currency: 'UZS',
  seo: {
    titleSuffix: 'Taqsit Store',
    ogImage: '/og.png',
    description: "Toshkentda Apple va PC mahsulotlarini halol muddatli to'lovga oling.",
  },
} as const;
```

- [ ] **Step 2: `app/lib/seo.ts`**

```ts
import { siteConfig } from './site.config';
import { LOCALES, htmlLang, localizedPath, DEFAULT_LOCALE } from './i18n';

export function pageTitle(title?: string): string {
  return title ? `${title} — ${siteConfig.seo.titleSuffix}` : siteConfig.seo.titleSuffix;
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: siteConfig.name,
    telephone: siteConfig.phone,
    sameAs: [siteConfig.telegram, siteConfig.instagram],
  };
}

export function hreflangLinks(pathname: string) {
  const bare = stripLocale(pathname);
  const links = LOCALES.map((loc) => ({
    tagName: 'link' as const, rel: 'alternate' as const,
    hrefLang: htmlLang(loc), href: localizedPath(loc, bare),
  }));
  links.push({ tagName: 'link', rel: 'alternate', hrefLang: 'x-default', href: localizedPath(DEFAULT_LOCALE, bare) });
  return links;
}

function stripLocale(pathname: string): string {
  const seg = pathname.split('/').filter(Boolean);
  if (seg[0] && (LOCALES as readonly string[]).includes(seg[0]) && seg[0] !== DEFAULT_LOCALE) {
    return '/' + seg.slice(1).join('/');
  }
  return pathname || '/';
}
```

- [ ] **Step 3: Lint va commit**

```bash
bun run lint
git add app/lib/site.config.ts app/lib/seo.ts
git commit -m "feat: site config and seo helpers (title, org json-ld, hreflang)"
```

---

### Task 5: Storefront layout + Home route (SSR)

**Files:**
- Create: `app/routes/store.tsx`, `app/routes/home.tsx`
- Modify: `app/routes.ts`, `src/store/HomePage.tsx`, `src/store/StoreLayout.tsx`

**Interfaces:**
- Consumes: `loadStore`, `loadCategories`, `i18n`, `seo`, `src/store/*` komponentlar.
- Produces: `($lang)` layout (lang'ni tekshiradi, `Outlet context={{t, lang}}` beradi) + Home route (loader `{products, config, categories}`).

- [ ] **Step 1: `app/routes.ts`ni layout+home bilan yangilash**

```ts
import { type RouteConfig, layout, route, index } from '@react-router/dev/routes';

export default [
  layout('routes/store.tsx', [
    index('routes/home.tsx'),
    route('category/:slug', 'routes/category.tsx'),
    route('product/:id', 'routes/product.tsx'),
    route('search', 'routes/search.tsx'),
    route(':lang', 'routes/home.tsx', { id: 'home-lang' }),
    route(':lang/category/:slug', 'routes/category.tsx', { id: 'category-lang' }),
    route(':lang/product/:id', 'routes/product.tsx', { id: 'product-lang' }),
    route(':lang/search', 'routes/search.tsx', { id: 'search-lang' }),
  ]),
  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig;
```
> `:lang` variant route'lar bir xil modulni ishlatadi; loader `params.lang`ni `resolveLocale` bilan tekshiradi.

- [ ] **Step 2: `app/routes/store.tsx` (layout route)**

```tsx
import { Outlet, useLoaderData, useRouteError } from 'react-router';
import type { Route } from './+types/store';
import { resolveLocale, localeToLang } from '../lib/i18n';
import { translations } from '../../src/locales';
import StoreLayout from '../../src/store/StoreLayout';

export async function loader({ params }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  return { locale };
}

export default function StoreRoot() {
  const { locale } = useLoaderData<typeof loader>();
  const lang = localeToLang(locale);
  const t = translations[lang];
  return (
    <StoreLayout locale={locale} lang={lang} t={t}>
      <Outlet context={{ t, lang, locale }} />
    </StoreLayout>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  return <div className="p-16 text-center text-[#6E6E73]">Xatolik yuz berdi.</div>;
}
```

- [ ] **Step 3: `src/store/StoreLayout.tsx`ni props qabul qiladigan qilib o'zgartirish**

`StoreLayout`ni `useState` lang o'rniga props (`locale, lang, t, children`) qabul qiladigan qiling; til holati endi URL'dan:
```tsx
import type { ReactNode } from 'react';
import { translations, type LangKey, type Translation } from '../locales';
import type { Locale } from '../../app/lib/i18n';
import Header from './Header';
import Footer from './Footer';

export interface StoreContext { t: Translation; lang: LangKey; locale: Locale }

export default function StoreLayout({
  locale, lang, t, children,
}: { locale: Locale; lang: LangKey; t: Translation; children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="bg-[#F5F5F7] text-[#6E6E73] text-[12px]">
        <div className="max-w-[1200px] mx-auto px-4 h-9 flex items-center gap-4">
          <span className="font-semibold text-[#1B7A34]">{t.utilInstallment}</span>
          <span className="hidden sm:inline">{t.utilDiscounts}</span>
          <a href="tel:+998886043636" className="ml-auto font-medium text-[#1D1D1F]">+998 (88) 604-36-36</a>
        </div>
      </div>
      <Header t={t} lang={lang} locale={locale} />
      <main className="flex-1">{children}</main>
      <Footer t={t} />
    </div>
  );
}
```
> `translations` importi tip uchun saqlanadi; kontakt Task 6'da configdan olinadi.

- [ ] **Step 4: `app/routes/home.tsx`**

```tsx
import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/home';
import { resolveLocale } from '../lib/i18n';
import { pageTitle } from '../lib/seo';
import { siteConfig } from '../lib/site.config';
import { loadStore, loadCategories } from '../lib/loaders';
import type { StoreContext } from '../../src/store/StoreLayout';
import HomePage from '../../src/store/HomePage';

export async function loader({ params, context }: Route.LoaderArgs) {
  if (!resolveLocale(params.lang)) throw new Response('Not Found', { status: 404 });
  const env = context.cloudflare.env;
  const [{ products, config }, categories] = await Promise.all([loadStore(env), loadCategories(env)]);
  return { products, config, categories };
}

export function meta(_: Route.MetaArgs) {
  return [{ title: pageTitle() }, { name: 'description', content: siteConfig.seo.description }];
}

export default function HomeRoute() {
  const { products, config, categories } = useLoaderData<typeof loader>();
  const ctx = useOutletContext<StoreContext>();
  return <HomePage t={ctx.t} products={products} config={config} categories={categories} />;
}
```

- [ ] **Step 5: `src/store/HomePage.tsx`ni props/loaderData'ga o'tkazish**

`useEffect`/`fetch`/`useOutletContext` o'rniga props:
```tsx
import type { ApiCategory } from '../../shared/types';
import type { InstallmentConfig, Product } from '../data/products';
import type { Translation } from '../locales';
import HeroBanner from './HeroBanner';
import TrustBar from './TrustBar';
import CategoryCircles from './CategoryCircles';
import ProductGrid from './ProductGrid';
import HowItWorks from './HowItWorks';

export default function HomePage({
  t, products, config, categories,
}: { t: Translation; products: Product[]; config: InstallmentConfig; categories: ApiCategory[] }) {
  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-10 flex flex-col gap-10 md:gap-14">
      <HeroBanner t={t} />
      <TrustBar t={t} />
      <section className="flex flex-col gap-6">
        <h2 className="text-[22px] md:text-[28px] font-semibold tracking-[-0.02em]">{t.homeCategories}</h2>
        <CategoryCircles categories={categories} />
      </section>
      <section id="featured" className="scroll-mt-24">
        <h2 className="text-[24px] md:text-[32px] font-semibold tracking-[-0.02em] mb-6">{t.homeFeatured}</h2>
        <ProductGrid t={t} items={products} config={config} />
      </section>
      <HowItWorks t={t} />
    </div>
  );
}
```
> SSR'da ma'lumot loader'dan keladi — skeleton shart emas (ma'lumot darhol mavjud).

- [ ] **Step 6: Build, lint, SSR tekshiruvi**

Run:
```bash
bunx wrangler d1 migrations apply taqsit-store-db --local
bun run build && bun run lint
bunx wrangler dev --port 8788 &
sleep 4
curl -s http://localhost:8788/ | grep -o "Tavsiya etilgan mahsulotlar"
curl -s http://localhost:8788/ru | grep -o "Рекомендуемые товары"
kill %1
```
Expected: ikkala `grep` mos matnni topadi (SSR + lokal ishlaydi).

- [ ] **Step 7: Commit**

```bash
git add app/routes.ts app/routes/store.tsx app/routes/home.tsx src/store/StoreLayout.tsx src/store/HomePage.tsx
git commit -m "feat: ssr store layout and home route with loaders"
```

---

### Task 6: Category, Product, Search, 404 routes (SSR + meta)

**Files:**
- Create: `app/routes/category.tsx`, `app/routes/product.tsx`, `app/routes/search.tsx`, `app/routes/not-found.tsx`
- Modify: `src/store/CategoryPage.tsx`, `src/store/ProductPage.tsx`, `src/store/SearchPage.tsx`

**Interfaces:**
- Consumes: `loadProductsBy`, `loadProductDetail`, `loadStore`, `loadCategories`, `pageTitle`.
- Produces: SSR route'lar + har biri `meta`.

- [ ] **Step 1: `app/routes/category.tsx`**

```tsx
import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/category';
import { resolveLocale } from '../lib/i18n';
import { pageTitle } from '../lib/seo';
import { loadProductsBy, loadStore, loadCategories } from '../lib/loaders';
import type { StoreContext } from '../../src/store/StoreLayout';
import CategoryPage from '../../src/store/CategoryPage';

export async function loader({ params, context }: Route.LoaderArgs) {
  if (!resolveLocale(params.lang)) throw new Response('Not Found', { status: 404 });
  const env = context.cloudflare.env;
  const slug = params.slug as string;
  const [products, { config }, categories] = await Promise.all([
    loadProductsBy(env, { category: slug }), loadStore(env), loadCategories(env),
  ]);
  const title = categories.find((c) => c.id === slug)?.name ?? slug;
  return { products, config, title };
}

export function meta({ data }: Route.MetaArgs) {
  return [{ title: pageTitle(data?.title) }];
}

export default function CategoryRoute() {
  const { products, config, title } = useLoaderData<typeof loader>();
  const ctx = useOutletContext<StoreContext>();
  return <CategoryPage t={ctx.t} title={title} products={products} config={config} />;
}
```

- [ ] **Step 2: `src/store/CategoryPage.tsx`ni props'ga o'tkazish**

```tsx
import type { InstallmentConfig, Product } from '../data/products';
import type { Translation } from '../locales';
import ProductGrid from './ProductGrid';

export default function CategoryPage({
  t, title, products, config,
}: { t: Translation; title: string; products: Product[]; config: InstallmentConfig }) {
  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-10">
      <div className="flex items-baseline gap-3 mb-6">
        <h1 className="text-[24px] md:text-[32px] font-semibold tracking-[-0.02em]">{title}</h1>
        <span className="text-[14px] text-[#86868B]">{products.length}</span>
      </div>
      <ProductGrid t={t} items={products} config={config} />
    </div>
  );
}
```

- [ ] **Step 3: `app/routes/product.tsx`**

```tsx
import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/product';
import { resolveLocale } from '../lib/i18n';
import { pageTitle } from '../lib/seo';
import { loadProductDetail, loadStore } from '../lib/loaders';
import type { StoreContext } from '../../src/store/StoreLayout';
import ProductPage from '../../src/store/ProductPage';

export async function loader({ params, context }: Route.LoaderArgs) {
  if (!resolveLocale(params.lang)) throw new Response('Not Found', { status: 404 });
  const env = context.cloudflare.env;
  const [product, { config }] = await Promise.all([
    loadProductDetail(env, params.id as string), loadStore(env),
  ]);
  if (!product) throw new Response('Not Found', { status: 404 });
  return { product, config };
}

export function meta({ data }: Route.MetaArgs) {
  return [{ title: pageTitle(data?.product.name) }];
}

export default function ProductRoute() {
  const { product, config } = useLoaderData<typeof loader>();
  const ctx = useOutletContext<StoreContext>();
  return <ProductPage t={ctx.t} product={product} config={config} />;
}
```

- [ ] **Step 4: `src/store/ProductPage.tsx`ni props'ga o'tkazish**

`useParams`/`useEffect`/`fetch`/loading-skeleton'ni olib tashlang; `product` va `config` props'dan keladi. Faylning boshini quyidagiga almashtiring (qolgan JSX — gallery/calc/CTA/specs — o'zgarmaydi, faqat `product`/`config`/`t` endi props):
```tsx
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Send, ShieldCheck, BadgeCheck, ChevronRight, Truck } from 'lucide-react';
import type { InstallmentConfig } from '../data/products';
import type { ProductDetail } from '../../app/lib/loaders';
import type { Translation } from '../locales';
import { calcInstallment, composeLeadMessage, discountPercent, formatUzs, telegramShareUrl, whatsappUrl } from '../lib/installment';
import Gallery from './Gallery';

export default function ProductPage({
  t, product, config,
}: { t: Translation; product: ProductDetail; config: InstallmentConfig }) {
  const [months, setMonths] = useState(12);
  const result = useMemo(() => {
    const term = config.terms.find((x) => x.months === months) ?? config.terms[config.terms.length - 1];
    return calcInstallment(product, term, config);
  }, [product, config, months]);
  const disc = discountPercent(product.cashPriceUzs, product.oldPriceUzs);

  function order(channel: 'telegram' | 'whatsapp') {
    if (!result) return;
    const msg = composeLeadMessage({ name: '', phone: '', product: product.name, months, monthly: formatUzs(result.monthly) });
    const url = channel === 'telegram' ? telegramShareUrl(msg) : whatsappUrl(msg);
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  // ... (mavjud JSX: breadcrumb, Gallery, sarlavha/narx, kalkulyator, CTA, spec/tavsif — o'zgarmaydi)
```
> `Link` importi `react-router-dom` o'rniga `react-router`dan (RR v7 birlashgan). `<Link to="/">` → breadcrumb.

- [ ] **Step 5: `app/routes/search.tsx` + `src/store/SearchPage.tsx`**

`app/routes/search.tsx`:
```tsx
import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/search';
import { resolveLocale } from '../lib/i18n';
import { pageTitle } from '../lib/seo';
import { loadProductsBy, loadStore } from '../lib/loaders';
import type { StoreContext } from '../../src/store/StoreLayout';
import SearchPage from '../../src/store/SearchPage';

export async function loader({ params, request, context }: Route.LoaderArgs) {
  if (!resolveLocale(params.lang)) throw new Response('Not Found', { status: 404 });
  const q = new URL(request.url).searchParams.get('q') ?? '';
  const env = context.cloudflare.env;
  const [products, { config }] = await Promise.all([loadProductsBy(env, { q }), loadStore(env)]);
  return { products, config, q };
}
export function meta({ data }: Route.MetaArgs) {
  return [{ title: pageTitle(data?.q ? `"${data.q}"` : undefined) }];
}
export default function SearchRoute() {
  const { products, config, q } = useLoaderData<typeof loader>();
  const ctx = useOutletContext<StoreContext>();
  return <SearchPage t={ctx.t} q={q} products={products} config={config} />;
}
```

`src/store/SearchPage.tsx` (props'ga):
```tsx
import type { InstallmentConfig, Product } from '../data/products';
import type { Translation } from '../locales';
import ProductGrid from './ProductGrid';

export default function SearchPage({
  t, q, products, config,
}: { t: Translation; q: string; products: Product[]; config: InstallmentConfig }) {
  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-10">
      <div className="flex items-baseline gap-3 mb-6">
        <h1 className="text-[20px] md:text-[26px] font-semibold">
          {t.searchResults}: <span className="text-[#6E6E73]">"{q}"</span>
        </h1>
        <span className="text-[14px] text-[#86868B]">{products.length}</span>
      </div>
      <ProductGrid t={t} items={products} config={config} />
    </div>
  );
}
```

- [ ] **Step 6: `app/routes/not-found.tsx`**

```tsx
import { Link } from 'react-router';

export function meta() {
  return [{ title: 'Sahifa topilmadi — Taqsit Store' }];
}

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
      <h1 className="text-[40px] font-semibold">404</h1>
      <p className="text-[#6E6E73]">Sahifa topilmadi.</p>
      <Link to="/" className="px-6 py-3 bg-[#0071E3] text-white font-semibold rounded-full">Bosh sahifa</Link>
    </div>
  );
}
```

- [ ] **Step 7: Skeleton faylini olib tashlash (endi kerak emas)**

Run: `git rm src/store/Skeleton.tsx`
> SSR'da ma'lumot loader'dan darhol keladi; skeleton (klient loading) endi ishlatilmaydi. `NotFoundPage.tsx` ham eski (App.tsx bilan) — `git rm src/store/NotFoundPage.tsx`.

- [ ] **Step 8: Build, lint, tekshiruv**

Run:
```bash
bun run build && bun run lint
bunx wrangler dev --port 8788 &
sleep 4
curl -s http://localhost:8788/product/iphone-16 | grep -o "iPhone 16"
curl -s http://localhost:8788/category/telefonlar | grep -o "Telefonlar"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8788/nonexistent-xyz
kill %1
```
Expected: mahsulot/kategoriya matni topiladi; noma'lum yo'l `404`.

- [ ] **Step 9: Commit**

```bash
git add app/routes src/store
git commit -m "feat: ssr category, product, search and 404 routes with meta"
```

---

### Task 7: Theme tokens + rebrand seam (site.config in components)

**Files:**
- Modify: `app/styles.css`, `src/store/Header.tsx`, `src/store/StoreLayout.tsx`, `src/store/Footer.tsx`

**Interfaces:**
- Consumes: `siteConfig`, `i18n` (`localizedPath`).
- Produces: kontakt/brend `siteConfig`dan; til tanlagich URL navigatsiyasi.

- [ ] **Step 1: `app/styles.css`ga brend tokenlarini qo'shish**

Mavjud `@theme` blokiga qo'shing (rang tokenlari — keyingi skinlar shularni almashtiradi):
```css
@theme {
  --color-primary: #1D1D1F;
  --color-accent: #0071E3;
  --color-bg: #F5F5F7;
  --color-trust: #1B7A34;
  --color-sale: #E8462D;
  --radius-card: 24px;
}
```

- [ ] **Step 2: `Header.tsx` — til tanlagich URL navigatsiyasi + `react-router` import**

`Header`ga `locale` prop qo'shing; til `<select>` `setLang` o'rniga `navigate(localizedPath(...))`; importlar `react-router-dom` → `react-router`; kontakt telefon `siteConfig.phone`. Til tanlagichni almashtiring:
```tsx
import { useNavigate, useLocation, Link } from 'react-router';
import { localizedPath, langToLocale, type Locale } from '../../app/lib/i18n';
import { siteConfig } from '../../app/lib/site.config';
// props: { t, lang, locale }
// select onChange:
const navigate = useNavigate();
const location = useLocation();
function switchLang(nextLang: LangKey) {
  const nextLocale = langToLocale(nextLang);
  const bare = stripLocalePath(location.pathname); // helper: joriy prefiksini olib tashlash
  navigate(localizedPath(nextLocale, bare) + location.search);
}
```
> `stripLocalePath` — `app/lib/i18n.ts`dagi `stripLocale`ga o'xshash; uni `i18n.ts` dan export qilib qayta ishlatish mumkin (Task 4 `seo.ts`dagi `stripLocale`ni `i18n.ts`ga ko'chirib export qiling — DRY).

- [ ] **Step 3: `stripLocale`ni `i18n.ts`ga ko'chirib export qilish**

`app/lib/i18n.ts`ga qo'shing va `seo.ts`da import qiling (ikki nusxa bo'lmasin):
```ts
export function stripLocale(pathname: string): string {
  const seg = pathname.split('/').filter(Boolean);
  if (seg[0] && (LOCALES as readonly string[]).includes(seg[0]) && seg[0] !== DEFAULT_LOCALE) {
    return '/' + seg.slice(1).join('/');
  }
  return pathname || '/';
}
```
`seo.ts`dagi mahalliy `stripLocale`ni olib tashlab, `import { stripLocale } from './i18n'` qiling.

- [ ] **Step 4: `Footer.tsx` va `StoreLayout.tsx` — kontakt configdan**

`Footer.tsx` va `StoreLayout.tsx`da qattiq-kodlangan `+998886043636`, telegram, instagram, xarita URL/label'larni `siteConfig`dan oling (masalan `href={\`tel:${siteConfig.phone}\`}`, `{siteConfig.phoneDisplay}`, `siteConfig.telegram`, `siteConfig.instagram`, `siteConfig.map.ll`).

- [ ] **Step 5: Barcha internal `Link`/link lokalga mos bo'lishi**

`ProductCard.tsx`, `CategoryCircles.tsx`, `Header.tsx` katalog dropdown, `ProductGrid`/`HomePage` ichidagi `<Link to=...>` yo'llari joriy `locale` bilan prefikslanishi kerak. Buning uchun `StoreContext.locale`ni ishlatib `localizedPath(locale, to)` bilan o'rang. Eng sodda yechim: `src/store/LocaleLink.tsx` yordamchi komponent yarating:
```tsx
import { Link, type LinkProps } from 'react-router';
import { useOutletContext } from 'react-router';
import { localizedPath } from '../../app/lib/i18n';
import type { StoreContext } from './StoreLayout';

export default function LocaleLink({ to, ...rest }: LinkProps & { to: string }) {
  const { locale } = useOutletContext<StoreContext>();
  return <Link to={localizedPath(locale, to)} {...rest} />;
}
```
`ProductCard`, `CategoryCircles`, `Header` (dropdown), `not-found` ichidagi ichki `Link`larni `LocaleLink`ga almashtiring (importni `react-router-dom` → `react-router` ham to'g'rilang).

- [ ] **Step 6: Build, lint, ko'p-til tekshiruvi**

Run:
```bash
bun run build && bun run lint
bunx wrangler dev --port 8788 &
sleep 4
curl -s http://localhost:8788/ru | grep -o "/ru/category" | head -1
kill %1
```
Expected: `/ru` sahifasida ichki havolalar `/ru/...` bilan prefikslangan.

- [ ] **Step 7: Commit**

```bash
git add app/styles.css app/lib/i18n.ts app/lib/seo.ts src/store
git commit -m "feat: theme tokens, site-config contacts and locale-aware links"
```

---

### Task 8: Public API resource routes + images

**Files:**
- Create: `app/routes/api.products.tsx`, `app/routes/api.products.$id.tsx`, `app/routes/api.categories.tsx`, `app/routes/api.settings.tsx`, `app/routes/images.$.tsx`
- Modify: `app/routes.ts`

**Interfaces:**
- Consumes: `functions/lib/db.ts`, `functions/env.ts`, `functions/images` mantig'i.
- Produces: `/api/products`, `/api/products/:id`, `/api/categories`, `/api/settings` (JSON, `rowTo*` bilan), `/images/*` (R2 stream). URL'lar eski API bilan bir xil.

- [ ] **Step 1: `app/routes.ts`ga resource route'larni qo'shish**

`export default [...]` massivига (layout'dan tashqarida) qo'shing:
```ts
route('api/products', 'routes/api.products.tsx'),
route('api/products/:id', 'routes/api.products.$id.tsx'),
route('api/categories', 'routes/api.categories.tsx'),
route('api/settings', 'routes/api.settings.tsx'),
route('images/*', 'routes/images.$.tsx'),
```

- [ ] **Step 2: `app/routes/api.products.tsx`**

```tsx
import type { Route } from './+types/api.products';
import { json, rowToProduct, type ProductRow } from '../../functions/lib/db';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const q = url.searchParams.get('q');
  let sql = 'SELECT * FROM products WHERE is_active = 1';
  const binds: unknown[] = [];
  if (category) { sql += ' AND category_id = ?'; binds.push(category); }
  if (q && q.trim() !== '') { sql += ' AND name LIKE ?'; binds.push(`%${q.trim()}%`); }
  sql += ' ORDER BY sort_order ASC, created_at ASC';
  const { results } = await env.DB.prepare(sql).bind(...binds).all<ProductRow>();
  return json(results.map(rowToProduct), { headers: { 'cache-control': 'public, max-age=60' } });
}
```

- [ ] **Step 3: `api.products.$id.tsx`, `api.categories.tsx`, `api.settings.tsx`**

`app/routes/api.products.$id.tsx`:
```tsx
import type { Route } from './+types/api.products.$id';
import { buildProductDetail, json } from '../../functions/lib/db';

export async function loader({ params, context }: Route.LoaderArgs) {
  const detail = await buildProductDetail(context.cloudflare.env, String(params.id));
  if (!detail) return json({ error: 'not_found' }, { status: 404 });
  return json(detail, { headers: { 'cache-control': 'public, max-age=60' } });
}
```

`app/routes/api.categories.tsx`:
```tsx
import type { Route } from './+types/api.categories';
import { json, rowToCategory, type CategoryRow } from '../../functions/lib/db';

export async function loader({ context }: Route.LoaderArgs) {
  const { results } = await context.cloudflare.env.DB
    .prepare('SELECT * FROM categories ORDER BY sort_order ASC').all<CategoryRow>();
  return json(results.map(rowToCategory), { headers: { 'cache-control': 'public, max-age=60' } });
}
```

`app/routes/api.settings.tsx`:
```tsx
import type { Route } from './+types/api.settings';
import { json, rowToSettings, type SettingsRow } from '../../functions/lib/db';

export async function loader({ context }: Route.LoaderArgs) {
  const row = await context.cloudflare.env.DB.prepare('SELECT * FROM settings WHERE id = 1').first<SettingsRow>();
  if (!row) return json({ error: 'settings_not_found' }, { status: 404 });
  return json(rowToSettings(row), { headers: { 'cache-control': 'public, max-age=60' } });
}
```

- [ ] **Step 4: `app/routes/images.$.tsx` (R2 stream)**

`functions/images/[[path]].ts` mantig'ini ko'chiring:
```tsx
import type { Route } from './+types/images.$';

export async function loader({ params, context }: Route.LoaderArgs) {
  const key = params['*'] as string;
  const obj = await context.cloudflare.env.IMAGES.get(key);
  if (!obj) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(obj.body, { headers });
}
```
> Aniq metadata mantig'ini `functions/images/[[path]].ts`dan tekshirib moslashtiring (path prefiksi va content-type).

- [ ] **Step 5: Build, lint, curl tekshiruvi**

Run:
```bash
bun run build && bun run lint
bunx wrangler dev --port 8788 &
sleep 4
curl -s http://localhost:8788/api/categories | grep -o "telefonlar"
curl -s http://localhost:8788/api/settings | grep -o "downPaymentPercent"
kill %1
```
Expected: JSON javoblar mos kalitlarni beradi.

- [ ] **Step 6: Commit**

```bash
git add app/routes.ts app/routes/api.products.tsx "app/routes/api.products.\$id.tsx" app/routes/api.categories.tsx app/routes/api.settings.tsx "app/routes/images.\$.tsx"
git commit -m "feat: public api and images as react-router resource routes"
```

---

### Task 9: Admin API resource routes + guard + mount admin SPA

**Files:**
- Create: `app/routes/api.admin.guard.ts`, `app/routes/api.admin.login.tsx`, `app/routes/api.admin.logout.tsx`, `app/routes/api.admin.me.tsx`, `app/routes/api.admin.products.tsx`, `app/routes/api.admin.products.$id.tsx`, `app/routes/api.admin.categories.tsx`, `app/routes/api.admin.categories.$id.tsx`, `app/routes/api.admin.settings.tsx`, `app/routes/api.admin.upload.tsx`, `app/routes/admin.tsx`
- Modify: `app/routes.ts`, `react-router.config.ts`

**Interfaces:**
- Consumes: `functions/lib/auth.ts`, `functions/lib/db.ts`, `functions/lib/validate.ts`, mavjud `functions/api/admin/*` mantig'i.
- Produces: `/api/admin/*` (login guarded), `/admin/*` klient-render `AdminApp`. **URL'lar va admin UI o'zgarmaydi.**

- [ ] **Step 1: `app/routes/api.admin.guard.ts` (umumiy session guard)**

`functions/api/admin/_middleware.ts` mantig'ini yordamchi funksiya sifatida:
```ts
import type { Env } from '../../functions/env';
import { json } from '../../functions/lib/db';
import { getCookie, verifySession } from '../../functions/lib/auth';

export async function requireAdmin(request: Request, env: Env): Promise<string | Response> {
  const token = getCookie(request, 'session');
  const username = token ? await verifySession(token, env.SESSION_SECRET, Math.floor(Date.now() / 1000)) : null;
  if (!username) return json({ error: 'unauthorized' }, { status: 401 });
  return username;
}
```

- [ ] **Step 2: `api.admin.login.tsx`, `logout`, `me`**

`app/routes/api.admin.login.tsx` (guardsiz):
```tsx
import type { Route } from './+types/api.admin.login';
import { json } from '../../functions/lib/db';
import { createSession, sessionCookie, sha256Hex } from '../../functions/lib/auth';

const TTL = 60 * 60 * 24 * 7;
export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const body = (await request.json().catch(() => null)) as { username?: string; password?: string } | null;
  if (!body?.username || !body?.password) return json({ error: 'missing_credentials' }, { status: 400 });
  const hash = await sha256Hex(body.password);
  if (body.username !== env.ADMIN_USERNAME || hash !== env.ADMIN_PASSWORD_HASH) {
    return json({ error: 'invalid_credentials' }, { status: 401 });
  }
  const token = await createSession(body.username, env.SESSION_SECRET, TTL, Math.floor(Date.now() / 1000));
  return json({ ok: true }, { headers: { 'set-cookie': sessionCookie(token, TTL) } });
}
```
`api.admin.logout.tsx`:
```tsx
import type { Route } from './+types/api.admin.logout';
import { json } from '../../functions/lib/db';
import { clearedSessionCookie } from '../../functions/lib/auth';
export async function action(_: Route.ActionArgs) {
  return json({ ok: true }, { headers: { 'set-cookie': clearedSessionCookie() } });
}
```
`api.admin.me.tsx`:
```tsx
import type { Route } from './+types/api.admin.me';
import { json } from '../../functions/lib/db';
import { requireAdmin } from './api.admin.guard';
export async function loader({ request, context }: Route.LoaderArgs) {
  const who = await requireAdmin(request, context.cloudflare.env);
  if (who instanceof Response) return who;
  return json({ username: who });
}
```

- [ ] **Step 3: Admin products/categories/settings/upload resource route'lar**

Har birida `requireAdmin` guard'ni chaqiring, so'ng mavjud `functions/api/admin/*` handler mantig'ini (INSERT/UPDATE/DELETE, `parseProductInput`/`parseCategoryInput`/`parseSettingsInput`, `writeImagesAndSpecs`) ko'chiring. Namuna — `app/routes/api.admin.products.tsx`:
```tsx
import type { Route } from './+types/api.admin.products';
import { json, rowToProduct, type ProductRow } from '../../functions/lib/db';
import { parseProductInput, ValidationError } from '../../functions/lib/validate';
import { requireAdmin } from './api.admin.guard';
// GET (list) -> loader; POST (create) -> action. Har ikkalasida requireAdmin.
export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const { results } = await env.DB.prepare('SELECT * FROM products ORDER BY sort_order ASC, created_at ASC').all<ProductRow>();
  return json(results.map(rowToProduct));
}
export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  // ... mavjud onRequestPost mantig'i (parseProductInput + INSERT + writeImagesAndSpecs)
}
```
> `writeImagesAndSpecs` hozir `functions/api/admin/products.ts`da eksport. Uni `functions/lib/db.ts`ga ko'chirib eksport qiling (DRY — `[id].ts` ekvivalenti ham ishlatadi), so'ng resource route'larda import qiling. `PUT`/`DELETE` uchun `api.admin.products.$id.tsx` `action`da `request.method`ni tekshiring (`PUT`→update, `DELETE`→delete).

- [ ] **Step 4: `/admin/*` ni klient-render qilib ulash**

`app/routes/admin.tsx`:
```tsx
import AdminApp from '../../src/admin/AdminApp';
export function meta() { return [{ title: 'Admin — Taqsit Store' }, { name: 'robots', content: 'noindex' }]; }
export default function AdminRoute() { return <AdminApp />; }
```
`app/routes.ts`ga qo'shing:
```ts
route('admin/*', 'routes/admin.tsx'),
route('api/admin/login', 'routes/api.admin.login.tsx'),
route('api/admin/logout', 'routes/api.admin.logout.tsx'),
route('api/admin/me', 'routes/api.admin.me.tsx'),
route('api/admin/products', 'routes/api.admin.products.tsx'),
route('api/admin/products/:id', 'routes/api.admin.products.$id.tsx'),
route('api/admin/categories', 'routes/api.admin.categories.tsx'),
route('api/admin/categories/:id', 'routes/api.admin.categories.$id.tsx'),
route('api/admin/settings', 'routes/api.admin.settings.tsx'),
route('api/admin/upload', 'routes/api.admin.upload.tsx'),
```
`AdminApp` klientda `getMe()` bilan sessiyani tekshiradi — SSR'da ma'lumot yo'q, shuning uchun `admin.tsx` да loader yo'q; komponent klientda ishlaydi (`AdminApp` `useEffect`ka tayanadi — o'zgarmaydi).

- [ ] **Step 5: `src/admin/api.ts` import to'g'rilash (agar kerak bo'lsa)**

`src/admin/*` `react-router-dom` ishlatmaydi (fetch bilan). O'zgarish shart emas — tekshiring: `grep -rn "react-router-dom" src/admin` bo'sh bo'lishi kerak.

- [ ] **Step 6: Build, lint, admin oqim tekshiruvi**

Run:
```bash
bun run build && bun run lint
bunx wrangler dev --port 8788 &
sleep 4
# login (invalid) -> 401
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8788/api/admin/me
# admin sahifa yuklanadi (klient shell)
curl -s http://localhost:8788/admin/ | grep -o "root\|admin" | head -1
kill %1
```
Expected: `/api/admin/me` guardsiz `401`; `/admin/` HTML qaytaradi.
> To'liq login+CRUD oqimini `.dev.vars` (ADMIN_USERNAME/HASH/SESSION_SECRET) va lokal D1 bilan brauzerda qo'lda tekshiring: `/admin`ga kiring, login qiling, mahsulot qo'shing/tahrirlang.

- [ ] **Step 7: Commit**

```bash
git add app/routes.ts app/routes/api.admin.* app/routes/admin.tsx functions/lib/db.ts
git commit -m "feat: admin api resource routes with session guard and mounted admin spa"
```

---

### Task 10: SEO — root meta/hreflang/Organization, sitemap, robots

**Files:**
- Create: `app/routes/sitemap[.]xml.tsx`, `app/routes/robots[.]txt.tsx`
- Modify: `app/root.tsx`, `app/routes.ts`, `app/routes/store.tsx`

**Interfaces:**
- Consumes: `seo.ts` (`organizationJsonLd`, `hreflangLinks`, `pageTitle`), `loadCategories`, `loadStore`.
- Produces: har sahifada hreflang + Organization JSON-LD; `/sitemap.xml`, `/robots.txt`.

- [ ] **Step 1: `root.tsx`ga `<html lang>` va default meta**

`root.tsx` `Layout`da `lang`ni store loader'idan olish qiyin (root global). Eng sodda: `store.tsx` layout `<html lang>`ni boshqarmaydi, lekin RR `root` `Layout` global. Shuning uchun til `<html lang>`ini `root`da `useRouteLoaderData('routes/store')` orqali o'qing:
```tsx
import { useRouteLoaderData } from 'react-router';
import { htmlLang, DEFAULT_LOCALE } from './lib/i18n';
// Layout ichida:
const storeData = useRouteLoaderData('routes/store') as { locale?: string } | undefined;
const lang = htmlLang((storeData?.locale as any) ?? DEFAULT_LOCALE);
// <html lang={lang}>
```

- [ ] **Step 2: `store.tsx` да hreflang + Organization JSON-LD (`links`/`meta`)**

`store.tsx`ga qo'shing:
```tsx
import { organizationJsonLd, hreflangLinks } from '../lib/seo';
export function links() { return []; } // hreflang meta orqali beriladi (quyida)
export function meta({ location }: Route.MetaArgs) {
  return [
    ...hreflangLinks(location?.pathname ?? '/'),
    { 'script:ld+json': organizationJsonLd() },
  ];
}
```
> RR v7 `meta` `link` (hreflang) va `script:ld+json` obyektlarini qo'llab-quvvatlaydi.

- [ ] **Step 3: `app/routes/robots[.]txt.tsx`**

```tsx
export function loader() {
  const body = ['User-agent: *', 'Disallow: /admin', 'Disallow: /api', '', 'Sitemap: /sitemap.xml', ''].join('\n');
  return new Response(body, { headers: { 'content-type': 'text/plain' } });
}
```

- [ ] **Step 4: `app/routes/sitemap[.]xml.tsx`**

```tsx
import type { Route } from './+types/sitemap[.]xml';
import { loadStore, loadCategories } from '../lib/loaders';
import { LOCALES, localizedPath } from '../lib/i18n';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const origin = new URL(request.url).origin;
  const [{ products }, categories] = await Promise.all([loadStore(env), loadCategories(env)]);
  const paths = ['/', ...categories.map((c) => `/category/${c.id}`), ...products.map((p) => `/product/${p.id}`)];
  const urls = paths.flatMap((p) => LOCALES.map((loc) => `${origin}${localizedPath(loc, p)}`));
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${u}</loc></url>`)
    .join('\n')}\n</urlset>`;
  return new Response(body, { headers: { 'content-type': 'application/xml' } });
}
```

- [ ] **Step 5: `app/routes.ts`ga qo'shish**

```ts
route('sitemap.xml', 'routes/sitemap[.]xml.tsx'),
route('robots.txt', 'routes/robots[.]txt.tsx'),
```

- [ ] **Step 6: Build, lint, SEO tekshiruvi**

Run:
```bash
bun run build && bun run lint
bunx wrangler dev --port 8788 &
sleep 4
curl -s http://localhost:8788/robots.txt | grep -o "Disallow: /admin"
curl -s http://localhost:8788/sitemap.xml | grep -o "/product/" | head -1
curl -s http://localhost:8788/ | grep -o 'hreflang="ru"'
curl -s http://localhost:8788/ | grep -o '"@type":"Store"'
kill %1
```
Expected: robots, sitemap URL'lari, hreflang teg, Organization JSON-LD topiladi.

- [ ] **Step 7: Commit**

```bash
git add app/root.tsx app/routes.ts app/routes/store.tsx "app/routes/sitemap[.]xml.tsx" "app/routes/robots[.]txt.tsx"
git commit -m "feat: seo scaffold (hreflang, organization json-ld, sitemap, robots)"
```

---

### Task 11: Cleanup + final verification

**Files:**
- Delete: `src/main.tsx`, `src/App.tsx`, `index.html`, `functions/api/**`, `functions/images/**`, `functions/api/admin/_middleware.ts`
- Modify: `functions/tsconfig.json` (agar `functions/api` o'chsa, faqat `lib`/`env` qoladi), `CLAUDE.md` (komandalar), `src/api/store.ts` (endi ishlatilmasa o'chirish)

**Interfaces:**
- Consumes: barcha oldingi tasklar.
- Produces: eski Pages/SPA qoldiqlarisiz toza kodbaza.

- [ ] **Step 1: Eski SPA entry va Pages Functions'ni olib tashlash**

```bash
git rm src/main.tsx src/App.tsx index.html
git rm -r functions/api functions/images
```
> `functions/lib/*`, `functions/env.ts`, `functions/lib/auth.test.ts` **QOLADI** (resource route'lar ishlatadi).

- [ ] **Step 2: `src/api/store.ts` holatini tekshirish**

Run: `grep -rn "api/store" app src` — agar hech qayerda import qilinmasa: `git rm src/api/store.ts`. (Loader'lar `app/lib/loaders.ts`ni ishlatadi.)

- [ ] **Step 3: `functions/tsconfig.json`ni yangilash**

`include`da faqat `functions/lib`, `functions/env.ts`, `shared` qolsin (agar `functions/api` o'chgan bo'lsa). `PagesFunction` tipiga bog'liq qatorlar qolmasin.

- [ ] **Step 4: `CLAUDE.md` komandalarini yangilash**

`## Commands` bo'limini yangi RR skriptlariga moslang: `bun run dev` (react-router dev), `bun run build`, `bun run start` (wrangler dev), `bun run deploy`, `bun run lint`, `bun run test`. Eski `wrangler pages dev` qatorini olib tashlang.

- [ ] **Step 5: To'liq verifikatsiya**

Run:
```bash
bun run lint && bun run test && bun run build
bunx wrangler dev --port 8788 &
sleep 4
echo "-- home ssr --";       curl -s http://localhost:8788/ | grep -oc "Tavsiya etilgan"
echo "-- ru --";             curl -s http://localhost:8788/ru | grep -oc "Рекомендуемые"
echo "-- product --";        curl -s http://localhost:8788/product/iphone-16 | grep -oc "iPhone 16"
echo "-- api --";            curl -s http://localhost:8788/api/categories | grep -oc "telefonlar"
echo "-- admin guard --";    curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8788/api/admin/me
echo "-- sitemap --";        curl -s http://localhost:8788/sitemap.xml | grep -oc "urlset"
kill %1
```
Expected: lint/test/build toza; home/ru/product SSR matni bor; api ishlaydi; admin guard `401`; sitemap bor.

- [ ] **Step 6: Brauzer qo'l tekshiruvi (SSR + admin)**

`bunx wrangler dev` bilan brauzerда:
- `/` — view-source'да mahsulotlar HTML'da bor (bo'sh root emas).
- Til almashtirish `/ru`, `/en`, `/uz-cyrl` ishlaydi; havolalar prefiksli.
- `/admin` — login, mahsulot/kategoriya/sozlama CRUD, rasm yuklash ishlaydi.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: remove legacy spa entry and pages functions after ssr migration"
```

---

## Self-Review

**Spec coverage (2026-07-02-foundation-ssr-design.md):**
- §3 Workers-unified RR v7 → Task 1 (scaffold), Task 5–6 (routes), Task 8–9 (API resource routes). ✔
- §3 loader'lar D1 to'g'ridan + fallback → Task 3. ✔
- §3 admin logika/UI tegilmaydi, API qayta ochiladi → Task 9. ✔
- §4 URL-prefiksli lokallar + hreflang → Task 2 (logic), Task 5 (routing), Task 7 (links), Task 10 (hreflang). ✔
- §5 tema-token + site.config → Task 4, Task 7. ✔
- §6 SEO (meta/canonical/hreflang/Organization/sitemap/robots) → Task 4, Task 10. ✔
- §2 muvaffaqiyat mezoni (SSR view-source, admin ishlaydi, test 10/10, har til URL) → Task 11 verifikatsiya. ✔
- §2 chegaralar (variant/filtr/cart yo'q) → planда hech biri qo'shilmagan. ✔

**Placeholder scan:** `wrangler.toml` `database_id` — mavjud placeholder (spec §8 bo'yicha real deploy'da to'ldiriladi, migratsiyaga tegilmaydi). `images.$.tsx` metadata "tekshirib moslashtiring" — mavjud `functions/images` mantig'iga aniq ishora (Task 8 Step 4). Boshqa TODO/TBD yo'q; kod bloklari to'liq.

**Type consistency:** `Env` (`functions/env.ts`) → `workers/app.ts` context → `Route.LoaderArgs['context'].cloudflare.env` hamma loader'da bir xil. `Locale`/`LangKey` xaritasi `i18n.ts`da yagona; `stripLocale` `i18n.ts`da (Task 7 DRY). `ProductDetail` `app/lib/loaders.ts`da e'lon, `ProductPage`/`product.tsx` import qiladi. `StoreContext` (`{t,lang,locale}`) `StoreLayout.tsx`da, route'lar `useOutletContext`da ishlatadi. `writeImagesAndSpecs` `functions/lib/db.ts`ga ko'chiriladi (Task 9) — admin products route'lari import qiladi.

**Eslatma (framework versiyasi):** RR v7 aniq API (`entry.*`, `Route.*` tiplar, `meta` `script:ld+json`) o'rnatilgan versiyaga qarab ozgina farq qilishi mumkin — har taskda `bun run build`/`typegen` bu farqlarni darhol ko'rsatadi. Task 1 rasmiy `@cloudflare/vite-plugin` + `@react-router/dev` shakliga asoslangan.
