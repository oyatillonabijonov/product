# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev            # React Router dev server at http://localhost:5173 — FULL app (SSR + /api/* + local D1/R2 via .dev.vars)
bun run build          # production build → build/ (client assets + SSR worker)
bun run start          # wrangler dev on the built output (production-like Workers runtime)
bun run deploy         # build + wrangler deploy (Cloudflare Workers)
bun run lint           # react-router typegen && tsc --noEmit && tsc --noEmit -p functions/tsconfig.json
bun run test           # vitest run (pure-logic tests: installment calc, auth, i18n)

bunx wrangler d1 migrations apply taqsit-store-db --local    # apply migrations to local D1 (run once before dev to get real data)
bunx vitest run app/lib/i18n.test.ts                         # run a single test file
```

Unlike the old Vite SPA, `bun run dev` now serves the **whole app** — SSR pages, `/api/*`, and admin — because `@cloudflare/vite-plugin` runs the Worker (with D1/R2 bindings and `.dev.vars` secrets) in dev. Loaders still fall back to sample data (`src/data/products.ts`) when D1 is empty, so pages render even without migrations applied.

## Architecture

**Taqsit Store** — an Apple & PC store in Tashkent selling devices on **halol installment** (muddatli to'lov: passport + down payment, 3/6/12 months, no riba, no penalties). **No online payment** — every order goes out as a Telegram/WhatsApp deep link (`composeLeadMessage` + `telegramShareUrl`/`whatsappUrl`).

This repo is being built as a **reusable, SEO-optimized platform for electronics installment stores**, with Taqsit Store as the first instance. The guiding split: a **stable core** (routing/IA, data model, business logic, admin, i18n, SEO) that stays constant, and a **per-store skin** (visual components + theme-token values + assets) that gets rebuilt per company. Design changes per store; structure/content/logic do not. The multi-part roadmap and per-part designs live in `docs/superpowers/specs/` and `docs/superpowers/plans/` — read the relevant spec before extending a subsystem.

Deployed on **Cloudflare Workers**: React Router v7 framework-mode SSR + **D1** (SQLite) + **R2** (images), all in one Worker (`workers/app.ts`).

### Framework: React Router v7 (framework mode / SSR) on Cloudflare Workers
- `react-router.config.ts` (`ssr: true`), `vite.config.ts` (`cloudflare()` + `reactRouter()` + `tailwindcss()`), `workers/app.ts` — the Worker `fetch` entry that wraps `createRequestHandler` and exposes bindings to loaders as `context.cloudflare.env` (typed `Env` from `functions/env.ts`).
- `app/root.tsx` — the HTML document (`<html lang>` resolved server-side from the store loader; imports `app/styles.css`; renders hreflang `<link>`s + Organization JSON-LD, gated to storefront routes).
- `app/routes.ts` — explicit route config. Storefront routes live under a `layout('routes/store.tsx', …)` block, each registered twice (bare + `:lang`-prefixed) pointing at the same module. Resource routes (`api.*`, `api.admin.*`, `images.$`, `sitemap[.]xml`, `robots[.]txt`, `admin/*`) are top-level.
- `app/lib/` — the core, framework-agnostic logic: `loaders.ts` (server D1 reads + sample fallback: `loadStore`/`loadConfig`/`loadProductsBy`/`loadProductDetail`/`loadCategories`), `i18n.ts` (locale ↔ `LangKey`, `resolveLocale`, `localizedPath`, `stripLocale`), `seo.ts` (`pageTitle`/`organizationJsonLd`/`hreflangLinks`), `site.config.ts` (**the rebrand seam** — brand name, contacts, socials, map, SEO; all store-specific values live here).

### Data flow (SSR)
Route modules in `app/routes/` are thin: a `loader` (reads D1 via `context.cloudflare.env`, using `functions/lib/db.ts` mappers) + a `meta` export, rendering a **presentational component from `src/store/`** with loader data passed as props. The layout route (`routes/store.tsx`) resolves the locale and provides `StoreContext { t, lang, locale }` via `Outlet` context; pages read it with `useOutletContext`. There is no client-side data fetching on storefront pages (except `Header`'s category dropdown, which uses `src/api/store.ts`'s lone remaining `fetchCategories`). Internal storefront links must be locale-aware — use `src/store/LocaleLink.tsx` (or `localizedPath` with the `locale` prop in `Header`), never a raw `<Link>`.

### Backend: React Router resource routes (reusing `functions/lib/`)
The old `functions/api/*` Pages Functions were removed; their logic is re-exposed at the **same URLs** as RR resource routes in `app/routes/`, all reusing the retained `functions/lib/` modules:
- **Public read:** `api.products.tsx` (`?category=`, `?q=`), `api.products.$id.tsx` (detail), `api.categories.tsx`, `api.settings.tsx`. `images.$.tsx` streams R2 objects (`/images/products/<uuid>.<ext>`). `sitemap[.]xml.tsx` / `robots[.]txt.tsx`.
- **Admin write:** `api.admin.*.tsx` — every route guarded by `requireAdmin` (`app/routes/api.admin.guard.ts`, HMAC session-cookie check) **except** `login`. Product/category CRUD, settings, R2 `upload`, plus `login`/`logout`/`me`. `resource route`s use `loader` for GET, `action` for POST/PUT/DELETE (branch on `request.method` for the `$id` routes).
- `functions/lib/db.ts` — D1 row (snake_case) ↔ API type (camelCase) mappers + `buildProductDetail` + `writeImagesAndSpecs` + `json()`. `functions/lib/validate.ts` — body validation (throws `ValidationError` → 400). `functions/lib/auth.ts` — SHA-256, HMAC session cookies (unit-tested). `functions/env.ts` — the `Env` binding type.

### Admin panel (`src/admin/`, unchanged by the SSR migration)
Password-protected SPA (tabs: Products, Categories, Settings), mounted at `/admin/*` via `app/routes/admin.tsx` and **client-rendered** (its initial SSR output is the loading shell; `getMe()` runs in `useEffect`). `src/admin/api.ts` is its fetch client hitting the `/api/admin/*` resource routes. Uzbek-only UI, `noindex`.

### The installment calculator (the business core)
`src/lib/installment.ts` — pure, tested helpers. Formula (re-derived in `SettingsForm` preview and `ProductPage`):
```
total   = cashPriceUzs * (1 + markup)               // markup on the FULL price
down    = cashPriceUzs * (downPaymentPercent/100)   // down payment is a PERCENT of price
monthly = max(0, (total - down) / months)
```
`downPaymentPercent`, `usdToUzs`, and per-term `markup` live in the D1 `settings` row and are **admin-editable**. `discountPercent(cash, old)` drives the strikethrough/`-N%` badge.

### Data model (D1)
Migrations in `migrations/` (numbered; **never edit an applied migration — add a new one**): `0001` schema (`products`, `settings`), `0002` seed, `0003` storefront (`categories`, `product_images`, `product_specs`, + `products.category_id/old_price_uzs/description`). `shared/types.ts` is the API contract (camelCase); `src/data/products.ts` holds frontend types + sample-fallback data. Prices/markups are **placeholder (NAMUNA)** — replaced via the admin panel.

## TypeScript projects & the no-`@types/react` shims

Two tsconfigs, both run by `bun run lint`: the root `tsconfig.json` covers `app`/`workers`/`src`/`shared` (+ generated `.react-router/types`); `functions/tsconfig.json` covers `functions/` with `@cloudflare/workers-types`. Route types come from `react-router typegen` (imported as `./+types/<route>`) — run it (via `bun run lint`) after changing routes.

**No `@types/react` is installed** — React/JSX is implicitly-any-typed. Minimal ambient shims fill the gaps: `app/react-types.d.ts` (`React.ReactNode` etc. for SSR) and `src/admin/react-events.d.ts` (event handler types). Keep strict TypeScript; **do not introduce `any`**.

## i18n

`src/locales.ts` — `translations` keyed by language name (`"O'zbek tili"`, `"Rus tili"`, `"English"`, `"O'zbek tili (Cyrillic)"`); exports `Translation` and `LangKey`. **Every key must exist in all 4 languages** or `Translation` fails compilation. Locale is now **URL-prefixed** (`/` = uz default, `/ru`, `/en`, `/uz-cyrl`) and resolved server-side in the store layout loader; `app/lib/i18n.ts` maps locale ↔ `LangKey`. Each page emits `hreflang` alternates. Admin UI is Uzbek-only.

## Design system & rebrand seam

Clean premium palette (olcha *structure*, not its red brand). Tailwind v4 `@theme` tokens in `app/styles.css` (the live stylesheet — `src/index.css` is orphaned): `#1D1D1F` text · `#0071E3` accent · `#F5F5F7` fill · `#6E6E73` secondary · `#1B7A34` trust green · `#E8462D` discount. Font SF Pro / system; card shadows `--shadow-apple`/`--shadow-apple-hover`; `motion.div` hover-lift. **Brand-specific values (name, phone, telegram, instagram, map, SEO) live in `app/lib/site.config.ts`, not hardcoded** — this is the seam a new store's rebrand edits.

## Environment & deploy

- Local secrets in `.dev.vars` (git-ignored): `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` (SHA-256 hex of the password), `SESSION_SECRET`. `bun run dev` loads them. Production: `bunx wrangler secret put …`.
- `wrangler.toml` is **Workers mode** (`main = workers/app.ts`, `[assets] directory = build/client`), binds `DB` (D1) and `IMAGES` (R2). `database_id` is a **placeholder** until `bunx wrangler d1 create taqsit-store-db` is run and its id pasted in.
- Product images are `.webp`, uploaded via the admin panel to R2, served at `/images/...`; below-the-fold images use `loading="lazy"`.

## Known dead code (safe to remove in a cleanup pass)
`src/components/` (legacy single-page landing sections — `Catalog`, `Calculator`, `ApplicationForm`, `HowItWorks`, `Conditions`, `Faq`; superseded by `src/store/`, imported by nothing) and `src/index.css` (superseded by `app/styles.css`). Do not extend these — build on `app/` + `src/store/`.
