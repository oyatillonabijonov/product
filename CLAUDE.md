# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev       # dev server at http://localhost:3001
bun run build     # production build
bun run lint      # TypeScript type check (tsc --noEmit)
bun run preview   # preview production build
```

## Architecture

Single-page landing site for **Taqsit Store** — an Apple & PC store in Tashkent (Malika Bozori, Block A, Shop 17) selling devices on **installment** (muddatli to'lov): passport + $30 down, 3–12 months. No routing; one page composed of sections.

**`src/App.tsx`** — root component. Holds the page layout (Header, Hero, Trust Badges, Apple/PC Showcase, Audience, CTA, Footer inline) and orchestrates the interactive installment flow by composing the components below. Lifts two state values shared across the flow: `selectedProductId` and `selectedMonths`. `scrollToId()` / `handleSelectProduct()` connect Catalog → Calculator → Form.

**`src/components/`** — installment-flow sections, each takes `t: Translation` (and flow props):
- `HowItWorks.tsx` — 4 steps. `Catalog.tsx` — product cards w/ prices, `onSelect(id)` preselects the calculator. `Calculator.tsx` — controlled by `productId`/`months` props + setters, live recalculation. `ApplicationForm.tsx` — name/phone + device/term (synced from calculator via `useEffect`), validates then opens Telegram/WhatsApp. `Conditions.tsx`, `Faq.tsx` (accordion).

**`src/data/products.ts`** — `Product`/`Term`/`InstallmentConfig` types, `installmentConfig` (downPayment $30, `usdToUzs`, terms 3/6/9/12 with `markup`), and the `products` array. **Prices and markups are placeholder (NAMUNA)** — owner replaces with real values here.

**`src/lib/installment.ts`** — pure helpers: `calcInstallment`, `lowestMonthly`, `formatUzs` (so'm formatting), `composeLeadMessage`, `telegramShareUrl`/`whatsappUrl`. No backend — leads go out via deep links (Telegram `share/url` prefills text; WhatsApp `wa.me` prefills reliably).

**`src/locales.ts`** — i18n object keyed by language name (`"O'zbek tili"`, `"Rus tili"`, `"English"`, `"O'zbek tili (Cyrillic)"`). Exports `Translation` type (used by component props) and `LangKey`. `t = translations[lang]` throughout. **Every key must exist in all 4 languages** — the `Translation` union type fails compilation otherwise. Switching languages triggers a blur+fade via `contentControls`.

**`src/index.css`** — Tailwind v4 (`@import "tailwindcss"`) with custom `@theme` tokens:
- `--font-sans`: SF Pro / system font stack
- `--shadow-apple` / `--shadow-apple-hover`: Apple-style card shadows

## Design System

Colors are hardcoded inline (no Tailwind config file — v4 uses CSS `@theme`):
- `#1D1D1F` — primary text
- `#0071E3` — accent blue
- `#F5F5F7` — light background / card fill
- `#6E6E73` — secondary text

Product cards use `motion.div` with `whileHover={{ y: -10 }}` and the `springConfig` object (`spring, damping: 30, stiffness: 80`). All product detail links point to `https://t.me/Taqsit_store`.

## Store Contact Info

- Phone: `+998(88)604-36-36` / `tel:+998886043636`
- Telegram: `https://t.me/Taqsit_store` — used for all product "Batafsil" buttons and CTA
- Instagram: `https://www.instagram.com/taqsit.store/`
- Map: Yandex widget at coordinates `ll=69.271481,41.338874` (Malika Bozori, Tashkent)

## Adding a New Language

Add a new key to the `translations` object in `src/locales.ts` matching the shape of existing entries, then add the same string to the `languages` array in `App.tsx`.

## Images

All product images are `.webp` in `src/assets/images/`. Showcase images are imported at the top of `App.tsx`; catalog images are imported in `src/data/products.ts` and referenced via `Product.image`. Above-the-fold images use `fetchPriority="high"`; below-the-fold use `loading="lazy"`.

## Environment

`GEMINI_API_KEY` is exposed via `vite.config.ts` → `process.env.GEMINI_API_KEY`. HMR is disabled when `DISABLE_HMR=true` (used in AI Studio).
