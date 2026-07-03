# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev            # React Router dev server at http://localhost:5173 — FULL app (SSR + /api/* + local D1/R2 via .dev.vars)
bun run build          # production build → build/ (client assets + SSR worker)
bun run start          # wrangler dev on the built output (production-like Workers runtime)
bun run deploy         # build + wrangler deploy (Cloudflare Workers)
bun run lint           # react-router typegen && tsc --noEmit && tsc --noEmit -p functions/tsconfig.json
bun run test           # vitest run (87 pure-logic tests: installment, auth, i18n, validate, catalog, variants, cart, markdown, safe-href, seo)

bunx wrangler d1 migrations apply taqsit-store-db --local    # apply migrations to local D1 (run once before dev for real data)
bunx vitest run src/lib/cart.test.ts                         # run a single test file
```

`bun run dev` serves the **whole app** — SSR pages, `/api/*`, admin — because `@cloudflare/vite-plugin` runs the Worker (D1/R2 bindings + `.dev.vars` secrets) in dev. Loaders fall back to sample data (`src/data/products.ts`) when D1 is empty/unavailable, so pages render regardless.

## Architecture

**Taqsit Store** — an Apple & PC store in Tashkent selling devices on **halol installment** (muddatli to'lov: passport + down payment, 3/6/12 months, no riba, no penalties). **No online payment** — every order goes out as a Telegram/WhatsApp deep link, either per-product or as a combined cart lead.

This repo is a **reusable, SEO-optimized platform for electronics installment stores**; Taqsit Store is the first instance. The split: a **stable core** (routing/IA, data model, business logic, admin, i18n, SEO) that stays constant per store, and a **per-store skin** (visual components + theme-token values + assets) rebuilt per company. Roadmap and per-part designs live in `docs/superpowers/specs/` and `docs/superpowers/plans/` — read the relevant spec before extending a subsystem. **All 8 roadmap parts are built:** foundation/SSR, product data model (brands/variants), catalog engine, product experience (variant UI), cart→lead, content & config (banners/pages/site_config), home composition, SEO/perf polish, Taqsit skin (tokenization).

Deployed on **Cloudflare Workers**: React Router v7 framework-mode SSR + **D1** (SQLite) + **R2** (images), one Worker (`workers/app.ts`).

### Framework: React Router v7 (framework mode / SSR) on Cloudflare Workers
- `react-router.config.ts` (`ssr: true`), `vite.config.ts` (`cloudflare()` + `reactRouter()` + `tailwindcss()`), `workers/app.ts` — Worker `fetch` entry exposing bindings to loaders as `context.cloudflare.env` (typed `Env` from `functions/env.ts`).
- `app/root.tsx` — HTML document (`<html lang>` from the store loader; imports `app/styles.css`; hreflang `<link>`s + Organization JSON-LD, gated to storefront routes only).
- `app/routes.ts` — explicit route config. Storefront routes live under `layout('routes/store.tsx', …)`, each registered twice (bare + `:lang/...` variant with an explicit id). Resource routes (`api.*`, `api.admin.*`, `images.$`, `sitemap[.]xml`, `robots[.]txt`, `admin/*`) are top-level.
- Storefront pages: home (banner slider|hero fallback → trust bar → categories → deals/new rails → brand strip → featured grid capped at 12), `category/:slug`, `product/:id`, `search`, `katalog` (all products + filter panel), `brand/:slug`, `chegirmalar` (deals), `savat` (cart, noindex), `page/:slug` (admin-authored content pages, indexable).

### Core libraries (`app/lib/` server-shared, `src/lib/` client-shared — all pure & unit-tested)
- `app/lib/loaders.ts` — D1 reads + sample fallback: `loadStore` (optional `{limit}`; sitemap needs the unlimited call)/`loadConfig`/`loadProductsBy`/`loadProductDetail`/`loadCategories`/`loadBrands`/`queryProducts` (dynamic WHERE + COUNT + brand/price facets; effective price = `COALESCE(min_variant_price, cash_price_uzs)`)/`loadRail` (deals|latest, limit 8)/`loadBanners`/`loadPages`/`loadPage`/`loadSiteConfig` (D1 `site_config` row, static `site.config.ts` fallback).
- `app/lib/catalog.ts` — URL filter contract: params `brand,narx,holat,cat,sort,page` (+`q`), `parseCatalogFilters` (invalid → silent defaults), `applyFilters` (fallback filtering), `hasActiveParams` (SEO noindex gate), `PAGE_SIZE=24`.
- `app/lib/i18n.ts` — locale ↔ `LangKey`, `resolveLocale`, `localizedPath`, `stripLocale`, `localeToTextKey` (locale → `LocalizedText` key for 4-locale DB content). `app/lib/seo.ts` — `pageTitle(title?, suffix?)`/`organizationJsonLd(config?)`/`hreflangLinks`/`catalogMeta`/`productJsonLd`/`breadcrumbJsonLd`/`storeConfigFrom(matches)` (reads the store layout loader's `siteConfig` inside `meta()` — zero extra D1 reads; every storefront meta passes its suffix this way). `app/lib/site.config.ts` — static fallback for brand name, contacts, socials, map, SEO defaults; live values come from D1 `site_config` (admin-editable).
- `src/lib/markdown.ts` — markdown-lite for admin-authored page content: `renderMarkdown` returns structured blocks (h2/h3/p/ul + bold/link inlines — never HTML strings, React escapes; unsafe link schemes dropped), `firstParagraph` (meta descriptions, falls back to first list item). `src/lib/safe-href.ts` — `safeHref` allowlist (`/` not `//`, http(s)) gating banner `linkUrl` at render; the same regex guards `parseBannerInput` server-side (duplicated because `functions/` tsconfig can't import `src/`).
- `src/lib/installment.ts` — **the business core** (do not modify casually): `total = cash×(1+markup)`, `down = cash×downPct/100`, `monthly = max(0,(total−down)/months)`; markups/downPct/usdToUzs live in the D1 `settings` row (admin-editable). `discountPercent` drives the `-N%` badge.
- `src/lib/variants.ts` — variant resolution: `defaultSelection` (cheapest in-stock), `resolveVariant`, `isValueAvailable`, `selectionLabel`.
- `src/lib/cart.ts` — cart: merge by `productId+variantId` (MAX_QTY 99), localStorage (de)serialization (malformed-tolerant), `cartInstallment` (linearity: formula applied to summed cash), `composeCartLeadMessage`.

### Data flow (SSR) & client state
Route modules in `app/routes/` are thin: `loader` (D1 via `context.cloudflare.env`, `resolveLocale` guard → 404) + `meta`, rendering presentational components from `src/store/` with loader data as props. The layout route (`store.tsx`) loads `siteConfig` + page links once per request and provides `StoreContext { t, lang, locale }` via `Outlet` context; `StoreLayout` threads config into the topbar/Footer, and `root.tsx` reads it for Organization JSON-LD. Catalog state lives in the **URL** (`CatalogView` updates search params; filter change resets `page`). Cart state lives in `CartProvider` (`src/store/CartContext.tsx`) — SSR-safe: initial `[]`, localStorage read/write only in effects. Internal storefront links must be locale-aware: use `src/store/LocaleLink.tsx` (inside Outlet) or `localizedPath` + `locale` prop (Header).

### Backend: resource routes reusing `functions/lib/`
- **Public read:** `api.products.tsx` (`?category=`,`?q=`), `api.products.$id.tsx` (detail incl. brand/options/variants), `api.categories.tsx`, `api.brands.tsx`, `api.settings.tsx`; `images.$.tsx` streams R2 (`/images/products/<uuid>.<ext>`); `sitemap[.]xml.tsx` / `robots[.]txt.tsx`.
- **Admin write:** `api.admin.*.tsx` — every route guarded by `requireAdmin` (`app/routes/api.admin.guard.ts`, HMAC session cookie) **except** `login`. Product CRUD persists brand/slug/gallery/specs/**options+variants** (replace-all via `writeImagesAndSpecs`/`writeOptionsAndVariants` in db.ts); category, brand, **banner and content-page** CRUD; settings + **site-config** (`INSERT OR REPLACE`, id=1); R2 `upload`. Resource routes: `loader`=GET, `action`=non-GET (branch on `request.method` in `$id` routes).
- `functions/lib/db.ts` — D1 row (snake_case) ↔ API type (camelCase) mappers, `PRODUCT_COLS` (min-variant-price subquery — use it in every product SELECT), `buildProductDetail`, `json()`. `functions/lib/validate.ts` — body validation incl. variant rules (price>0, exactly-one-value-per-option, unique option names) → `ValidationError` → 400. `functions/lib/auth.ts` — SHA-256 + HMAC session cookies.

### Variants (the product model core)
`brands`, `product_options` (axes, e.g. "Xotira"), `product_option_values`, `product_variants` (each: own price/old-price/image/in_stock/sku), `variant_option_values`. Backward compat: variantless products work everywhere (`minPriceUzs = min in-stock variant ?? cashPriceUzs` is the displayed/list price). Product page: chips per option, unavailable combos disabled; selected variant drives price/discount/gallery/calculator/lead; out-of-stock disables CTAs.

### Admin panel (`src/admin/`, client-rendered SPA at `/admin/*`, noindex, Uzbek-only)
Tabs: Products (ProductForm with brand select, slug, gallery, specs, **VariantEditor** — options + chips + "Kombinatsiyalarni generatsiya" + per-variant price/image/stock), Categories, Brands, **Banners** (image via R2 upload, safe linkUrl, sort/active), **Pages** (slug + 4-locale title/markdown content), Settings (calculator config + "Sayt ma'lumotlari" site-config form). `src/admin/api.ts` is its fetch client; server error codes map to Uzbek messages via `src/admin/errText.ts` (extend it when adding validation codes). Admin UI convention: `FC<{...}>` components.

### Data model (D1)
Migrations in `migrations/` (numbered; **never edit an applied migration — add a new one**): `0001` products+settings, `0002` seed, `0003` storefront (categories, images, specs, category_id/old_price/description), `0004` product model (brands, options, variants, brand_id/slug), `0005` content & config (banners, pages with `_uz/_ru/_en/_cyrl` columns, single-row `site_config`). `shared/types.ts` is the API contract (`LocalizedText` keys `uz|ru|en|uzCyrl` ↔ those column suffixes); `src/data/products.ts` holds frontend types + sample fallback data (keep its `brands`/`categories` in sync with migration seeds). Prices/seed page texts are **placeholder (NAMUNA)** — replaced via admin.

## TypeScript projects & the no-`@types/react` shims

Two tsconfigs, both run by `bun run lint`: root covers `app`/`workers`/`src`/`shared` (+ generated `.react-router/types`); `functions/tsconfig.json` covers `functions/`. Route types come from `react-router typegen` (`./+types/<route>` imports) — regenerate via lint after route changes.

**No `@types/react`** — React/JSX is implicitly-any-typed. Ambient shims: `app/react-types.d.ts`, `src/admin/react-events.d.ts`. **`key` props only type-check on `FC<{...}>`-style components** — use that style for any component receiving `key`. Keep strict TypeScript; **no `any`**.

## i18n

`src/locales.ts` — `translations` keyed by language name; **every key must exist in all 4 languages** or the `Translation` type fails compilation (lint is the parity check). Locale is **URL-prefixed** (`/` = uz default, `/ru`, `/en`, `/uz-cyrl`), resolved server-side; each page emits hreflang alternates. Meta titles are localized in loaders via `translations[localeToLang(locale)]` (see `catalog.tsx`). Admin UI is Uzbek-only.

## SEO rules

Filtered/paginated catalog pages get `noindex,follow` + canonical to the clean path (`catalogMeta`); `/search` and `/savat` are always noindex; content pages (`/page/:slug`) are indexable with localized title + description (`firstParagraph`). Sitemap enumerates home/katalog/chegirmalar/categories/brands/products/pages across all locales. Product pages emit `Product` + 3-level `BreadcrumbList` JSON-LD via RR v7 `'script:ld+json'` meta descriptors (RR escapes them itself); Organization JSON-LD renders in `root.tsx`. Meta title suffix and home description come from D1 `site_config` via `storeConfigFrom(matches)` — use that pattern in any new route's `meta`.

## Design system & rebrand seam

Clean premium palette (olcha *structure*, not its red brand), fully tokenized as the first theme ("Taqsit skin"). The palette lives **only** in the `@theme` block of `app/styles.css` (the live stylesheet; `src/index.css` is orphaned) — 24 semantic `--color-*` tokens: `primary`/`body`/`muted`(-2/-3)/`disabled`(-2) text scale · `accent`(+`-hover`/`-soft`/`-soft-2`/`-bright`) · `bg`/`row-alt`/`fill-2` fills · `line`(-2/-3)/`divider`/`segment` borders · `trust`(+`-soft`) · `sale` · `danger` (admin). **Hex colors are banned in components** — new UI code uses the generated utilities (`text-muted`, `border-line/50`, `bg-accent-soft`, …). Allowed literals: white, `#25D366` (WhatsApp brand), rgba values inside shadows. SF Pro/system font; `--shadow-apple`(-hover); minimal `motion.div` hover effects. **A rebrand = `@theme` values + `app/lib/site.config.ts` (or the admin "Sayt ma'lumotlari" tab) + logo/images — never component code.**

## Environment & deploy

- Local secrets in `.dev.vars` (git-ignored): `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` (SHA-256 hex), `SESSION_SECRET`. Production: `bunx wrangler secret put …`.
- `wrangler.toml` is **Workers mode** (`main = workers/app.ts`, `[assets] directory = build/client`), binds `DB` (D1) + `IMAGES` (R2). `database_id` is a **placeholder** until `bunx wrangler d1 create taqsit-store-db` is run.
- Product images `.webp`, uploaded via admin to R2, served at `/images/...`; below-the-fold images use `loading="lazy"`.

## Known dead code (safe to remove in a cleanup pass)
`src/components/` (legacy landing sections — superseded by `src/store/`, imported by nothing) and `src/index.css`. Do not extend these.
