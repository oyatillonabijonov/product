# 2b — Kontent & Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin-managed banners, universal content pages (4-locale markdown-lite) with public `/page/:slug` routes, and D1-backed site_config threaded into layout/footer/JSON-LD.

**Architecture:** New migration `0005_content_config.sql` (banners, pages, site_config). Same layering as existing subsystems: `shared/types.ts` contract → `functions/lib/validate.ts` parsers + `functions/lib/db.ts` mappers → `api.admin.*` resource routes (requireAdmin) → `app/lib/loaders.ts` SSR reads with static fallback → thin route modules + `src/store/` components → `src/admin/` tabs.

**Tech Stack:** React Router v7 SSR on Cloudflare Workers, D1, R2, Tailwind v4, vitest.

## Global Constraints

- Use **bun/bunx**, never npm. Strict TypeScript, **no `any`**. `bun run lint` and `bun run test` must pass after every task.
- **Never edit applied migrations** (`0001`–`0004`) — only add `migrations/0005_content_config.sql`.
- No `@types/react`: any component receiving a `key` prop must be `FC<{...}>`-style (see `src/store/Gallery.tsx`).
- Every `api.admin.*` route is guarded by `requireAdmin` from `app/routes/api.admin.guard.ts` (login pattern: `if (who instanceof Response) return who;`).
- i18n: if you add keys to `src/locales.ts`, add them to **all 4 language blocks** (this task set adds none).
- Commit format `feat:`/`fix:`/`docs:`; commits end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Prices/texts seeded in migration are placeholder (NAMUNA) — admin replaces them.
- Locale keys: `Locale = 'uz' | 'ru' | 'en' | 'uz-cyrl'` (app/lib/i18n.ts); `LocalizedText` keys are `uz | ru | en | uzCyrl`; D1 column suffixes are `_uz | _ru | _en | _cyrl`.

---

### Task 1: Migration 0005 + shared types + `localeToTextKey`

**Files:**
- Create: `migrations/0005_content_config.sql`
- Modify: `shared/types.ts` (append)
- Modify: `app/lib/i18n.ts` (append)
- Test: `app/lib/i18n.test.ts` (append)

**Interfaces:**
- Produces: `LocalizedText`, `ApiBanner`, `ApiPage`, `ApiSiteConfig` (shared/types.ts); `localeToTextKey(locale: Locale): keyof LocalizedText` (app/lib/i18n.ts); D1 tables `banners`, `pages`, `site_config`.

- [ ] **Step 1: Write the failing test** — append to `app/lib/i18n.test.ts`:

```ts
describe('localeToTextKey', () => {
  it('maps every locale to a LocalizedText key', () => {
    expect(localeToTextKey('uz')).toBe('uz');
    expect(localeToTextKey('ru')).toBe('ru');
    expect(localeToTextKey('en')).toBe('en');
    expect(localeToTextKey('uz-cyrl')).toBe('uzCyrl');
  });
});
```

Add `localeToTextKey` to the existing import from `./i18n`.

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run app/lib/i18n.test.ts`
Expected: FAIL (localeToTextKey is not exported).

- [ ] **Step 3: Implement** — append to `shared/types.ts`:

```ts
export interface LocalizedText {
  uz: string;
  ru: string;
  en: string;
  uzCyrl: string;
}

export interface ApiBanner {
  id: string;
  imageUrl: string;
  linkUrl: string;
  altText: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ApiPage {
  id: string;
  slug: string;
  title: LocalizedText;
  content: LocalizedText;
  sortOrder: number;
  isActive: boolean;
}

export interface ApiSiteConfig {
  name: string;
  phone: string;
  phoneDisplay: string;
  telegram: string;
  instagram: string;
  whatsapp: string;
  mapLl: string;
  mapLabel: string;
  seoTitleSuffix: string;
  seoDescription: string;
  ogImage: string;
}
```

Append to `app/lib/i18n.ts`:

```ts
import type { LocalizedText } from '../../shared/types';

export function localeToTextKey(locale: Locale): keyof LocalizedText {
  switch (locale) {
    case 'ru': return 'ru';
    case 'en': return 'en';
    case 'uz-cyrl': return 'uzCyrl';
    default: return 'uz';
  }
}
```

(Place the import at the top of the file with the other imports.)

Create `migrations/0005_content_config.sql`:

```sql
-- 2b: banners, content pages, site_config
CREATE TABLE banners (
  id         TEXT PRIMARY KEY,
  image_url  TEXT NOT NULL,
  link_url   TEXT NOT NULL DEFAULT '',
  alt_text   TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE pages (
  id           TEXT PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  title_uz     TEXT NOT NULL,
  title_ru     TEXT NOT NULL,
  title_en     TEXT NOT NULL,
  title_cyrl   TEXT NOT NULL,
  content_uz   TEXT NOT NULL DEFAULT '',
  content_ru   TEXT NOT NULL DEFAULT '',
  content_en   TEXT NOT NULL DEFAULT '',
  content_cyrl TEXT NOT NULL DEFAULT '',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE site_config (
  id               INTEGER PRIMARY KEY CHECK (id = 1),
  name             TEXT NOT NULL,
  phone            TEXT NOT NULL,
  phone_display    TEXT NOT NULL,
  telegram         TEXT NOT NULL,
  instagram        TEXT NOT NULL,
  whatsapp         TEXT NOT NULL,
  map_ll           TEXT NOT NULL,
  map_label        TEXT NOT NULL,
  seo_title_suffix TEXT NOT NULL,
  seo_description  TEXT NOT NULL,
  og_image         TEXT NOT NULL
);

INSERT INTO site_config (id, name, phone, phone_display, telegram, instagram, whatsapp, map_ll, map_label, seo_title_suffix, seo_description, og_image) VALUES
(1, 'Taqsit Store', '+998886043636', '+998 (88) 604-36-36', 'https://t.me/Taqsit_store', 'https://www.instagram.com/taqsit.store/', 'https://wa.me/998886043636', '69.271481,41.338874', 'Malika Bozori, Toshkent', 'Taqsit Store', 'Toshkentda Apple va PC mahsulotlarini halol muddatli to''lovga oling.', '/og.png');

INSERT INTO pages (id, slug, title_uz, title_ru, title_en, title_cyrl, content_uz, content_ru, content_en, content_cyrl, sort_order, is_active) VALUES
('page-faq', 'faq',
 'Ko''p so''raladigan savollar', 'Часто задаваемые вопросы', 'FAQ', 'Кўп сўраладиган саволлар',
 '## Muddatli to''lov qanday ishlaydi?' || char(10) || 'Passport va boshlang''ich to''lov bilan 3, 6 yoki 12 oyga rasmiylashtiriladi. (NAMUNA matn — admin orqali almashtiring.)',
 '## Как работает рассрочка?' || char(10) || 'Оформляется по паспорту с первоначальным взносом на 3, 6 или 12 месяцев. (ОБРАЗЕЦ — замените в админке.)',
 '## How does installment work?' || char(10) || 'Issued with a passport and down payment for 3, 6 or 12 months. (SAMPLE — replace via admin.)',
 '## Муддатли тўлов қандай ишлайди?' || char(10) || 'Паспорт ва бошланғич тўлов билан 3, 6 ёки 12 ойга расмийлаштирилади. (НАМУНА — админ орқали алмаштиринг.)',
 0, 1),
('page-shartlar', 'muddatli-tolov',
 'Muddatli to''lov shartlari', 'Условия рассрочки', 'Installment terms', 'Муддатли тўлов шартлари',
 '- 21 yoshdan boshlab' || char(10) || '- Passport + boshlang''ich to''lov' || char(10) || '- 3 / 6 / 12 oy muddat' || char(10) || '- Ribosiz, jarimasiz (NAMUNA)',
 '- От 21 года' || char(10) || '- Паспорт + первоначальный взнос' || char(10) || '- Срок 3 / 6 / 12 месяцев' || char(10) || '- Без рибы и штрафов (ОБРАЗЕЦ)',
 '- From age 21' || char(10) || '- Passport + down payment' || char(10) || '- 3 / 6 / 12 month terms' || char(10) || '- No riba, no penalties (SAMPLE)',
 '- 21 ёшдан бошлаб' || char(10) || '- Паспорт + бошланғич тўлов' || char(10) || '- 3 / 6 / 12 ой муддат' || char(10) || '- Рибосиз, жаримасиз (НАМУНА)',
 1, 1),
('page-haqimizda', 'biz-haqimizda',
 'Biz haqimizda', 'О нас', 'About us', 'Биз ҳақимизда',
 'Toshkentdagi Apple va PC do''koni. Halol muddatli to''lov bilan ishlaymiz. (NAMUNA matn.)',
 'Магазин Apple и PC в Ташкенте. Работаем с честной рассрочкой. (ОБРАЗЕЦ.)',
 'Apple & PC store in Tashkent. We offer halal installment plans. (SAMPLE.)',
 'Тошкентдаги Apple ва PC дўкони. Ҳалол муддатли тўлов билан ишлаймиз. (НАМУНА.)',
 2, 1),
('page-kontakt', 'kontakt',
 'Kontakt', 'Контакты', 'Contact', 'Контакт',
 '**Manzil:** Malika Bozori, Toshkent' || char(10) || char(10) || '**Telefon:** +998 (88) 604-36-36 (NAMUNA)',
 '**Адрес:** Рынок Малика, Ташкент' || char(10) || char(10) || '**Телефон:** +998 (88) 604-36-36 (ОБРАЗЕЦ)',
 '**Address:** Malika Bazaar, Tashkent' || char(10) || char(10) || '**Phone:** +998 (88) 604-36-36 (SAMPLE)',
 '**Манзил:** Малика Бозори, Тошкент' || char(10) || char(10) || '**Телефон:** +998 (88) 604-36-36 (НАМУНА)',
 3, 1);
```

- [ ] **Step 4: Apply migration + run tests**

Run: `bunx wrangler d1 migrations apply taqsit-store-db --local`
Expected: `0005_content_config.sql` applied without error.
Run: `bunx vitest run app/lib/i18n.test.ts` → PASS. Run `bun run lint` → clean.

- [ ] **Step 5: Commit**

```bash
git add migrations/0005_content_config.sql shared/types.ts app/lib/i18n.ts app/lib/i18n.test.ts
git commit -m "feat: content & config data model (banners, pages, site_config)"
```

---

### Task 2: Validate parsers + db mappers + admin API routes

**Files:**
- Modify: `functions/lib/validate.ts` (append)
- Modify: `functions/lib/db.ts` (append)
- Test: `functions/lib/validate.test.ts` (append)
- Create: `app/routes/api.admin.banners.tsx`, `app/routes/api.admin.banners.$id.tsx`, `app/routes/api.admin.pages.tsx`, `app/routes/api.admin.pages.$id.tsx`, `app/routes/api.admin.site-config.tsx`
- Modify: `app/routes.ts` (register 5 routes)

**Interfaces:**
- Consumes: `LocalizedText`, `ApiBanner`, `ApiPage`, `ApiSiteConfig` (Task 1); existing `asRecord`/`reqString`/`reqNumber` helpers, `ValidationError`, `json()`, `requireAdmin`.
- Produces: `parseBannerInput(body: unknown): BannerInput`, `parsePageInput(body: unknown): PageInput`, `parseSiteConfigInput(body: unknown): ApiSiteConfig`; `BannerRow`/`PageRow`/`SiteConfigRow` + `rowToBanner`/`rowToPage`/`rowToSiteConfig`; admin endpoints `/api/admin/banners[/:id]`, `/api/admin/pages[/:id]`, `/api/admin/site-config`.

- [ ] **Step 1: Write failing tests** — append to `functions/lib/validate.test.ts` (extend the existing import from `./validate` with the three new parsers):

```ts
describe('parseBannerInput', () => {
  it('accepts minimal input and fills defaults', () => {
    const b = parseBannerInput({ imageUrl: '/images/banner.webp' });
    expect(b.imageUrl).toBe('/images/banner.webp');
    expect(b.linkUrl).toBe('');
    expect(b.altText).toBe('');
    expect(b.sortOrder).toBe(0);
    expect(b.isActive).toBe(true);
    expect(b.id.length).toBeGreaterThan(0);
  });
  it('rejects missing imageUrl', () => {
    expect(() => parseBannerInput({ linkUrl: '/katalog' })).toThrow('imageUrl_required');
  });
});

describe('parsePageInput', () => {
  const title = { uz: 'FAQ', ru: 'FAQ', en: 'FAQ', uzCyrl: 'FAQ' };
  it('accepts a valid page and defaults empty content', () => {
    const p = parsePageInput({ slug: 'faq', title });
    expect(p.slug).toBe('faq');
    expect(p.title.uzCyrl).toBe('FAQ');
    expect(p.content).toEqual({ uz: '', ru: '', en: '', uzCyrl: '' });
    expect(p.isActive).toBe(true);
  });
  it('rejects invalid slug', () => {
    expect(() => parsePageInput({ slug: 'Bad Slug!', title })).toThrow('slug_invalid');
  });
  it('rejects when a title locale is empty', () => {
    expect(() => parsePageInput({ slug: 'faq', title: { ...title, ru: '' } })).toThrow('title_ru_required');
  });
});

describe('parseSiteConfigInput', () => {
  it('requires name and phone, defaults the rest', () => {
    const c = parseSiteConfigInput({ name: 'Store', phone: '+998900000000' });
    expect(c.phoneDisplay).toBe('+998900000000');
    expect(c.seoTitleSuffix).toBe('Store');
    expect(c.telegram).toBe('');
  });
  it('rejects missing name', () => {
    expect(() => parseSiteConfigInput({ phone: '+998900000000' })).toThrow('name_required');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest run functions/lib/validate.test.ts`
Expected: FAIL (parsers not exported).

- [ ] **Step 3: Implement parsers** — append to `functions/lib/validate.ts` (add `LocalizedText`, `ApiSiteConfig` to the shared/types import):

```ts
export interface BannerInput {
  id: string;
  imageUrl: string;
  linkUrl: string;
  altText: string;
  sortOrder: number;
  isActive: boolean;
}

export function parseBannerInput(body: unknown): BannerInput {
  const o = asRecord(body);
  const imageUrl = reqString(o, 'imageUrl');
  const id = typeof o.id === 'string' && o.id.trim() !== '' ? o.id.trim() : crypto.randomUUID();
  const linkUrl = typeof o.linkUrl === 'string' ? o.linkUrl.trim() : '';
  const altText = typeof o.altText === 'string' ? o.altText.trim() : '';
  const sortOrder = typeof o.sortOrder === 'number' ? o.sortOrder : 0;
  const isActive = o.isActive === undefined ? true : Boolean(o.isActive);
  return { id, imageUrl, linkUrl, altText, sortOrder, isActive };
}

const PAGE_SLUG_RE = /^[a-z0-9-]+$/;
const TEXT_KEYS: (keyof LocalizedText)[] = ['uz', 'ru', 'en', 'uzCyrl'];

function localizedText(o: Record<string, unknown>, key: string, required: boolean): LocalizedText {
  const raw = o[key];
  const r = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const out = {} as LocalizedText;
  for (const k of TEXT_KEYS) {
    const v = r[k];
    const s = typeof v === 'string' ? v.trim() : '';
    if (required && s === '') throw new ValidationError(`${key}_${k}_required`);
    out[k] = s;
  }
  return out;
}

export interface PageInput {
  id: string;
  slug: string;
  title: LocalizedText;
  content: LocalizedText;
  sortOrder: number;
  isActive: boolean;
}

export function parsePageInput(body: unknown): PageInput {
  const o = asRecord(body);
  const slug = reqString(o, 'slug').toLowerCase();
  if (!PAGE_SLUG_RE.test(slug)) throw new ValidationError('slug_invalid');
  const title = localizedText(o, 'title', true);
  const content = localizedText(o, 'content', false);
  const id = typeof o.id === 'string' && o.id.trim() !== '' ? o.id.trim() : crypto.randomUUID();
  const sortOrder = typeof o.sortOrder === 'number' ? o.sortOrder : 0;
  const isActive = o.isActive === undefined ? true : Boolean(o.isActive);
  return { id, slug, title, content, sortOrder, isActive };
}

export function parseSiteConfigInput(body: unknown): ApiSiteConfig {
  const o = asRecord(body);
  const name = reqString(o, 'name');
  const phone = reqString(o, 'phone');
  const opt = (key: string): string => (typeof o[key] === 'string' ? (o[key] as string).trim() : '');
  return {
    name,
    phone,
    phoneDisplay: opt('phoneDisplay') || phone,
    telegram: opt('telegram'),
    instagram: opt('instagram'),
    whatsapp: opt('whatsapp'),
    mapLl: opt('mapLl'),
    mapLabel: opt('mapLabel'),
    seoTitleSuffix: opt('seoTitleSuffix') || name,
    seoDescription: opt('seoDescription'),
    ogImage: opt('ogImage'),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx vitest run functions/lib/validate.test.ts` → PASS.

- [ ] **Step 5: Add db mappers** — append to `functions/lib/db.ts` (add `ApiBanner`, `ApiPage`, `ApiSiteConfig` to the shared/types import):

```ts
export interface BannerRow {
  id: string; image_url: string; link_url: string; alt_text: string;
  sort_order: number; is_active: number;
}

export function rowToBanner(r: BannerRow): ApiBanner {
  return {
    id: r.id, imageUrl: r.image_url, linkUrl: r.link_url, altText: r.alt_text,
    sortOrder: r.sort_order, isActive: r.is_active === 1,
  };
}

export interface PageRow {
  id: string; slug: string;
  title_uz: string; title_ru: string; title_en: string; title_cyrl: string;
  content_uz: string; content_ru: string; content_en: string; content_cyrl: string;
  sort_order: number; is_active: number;
}

export function rowToPage(r: PageRow): ApiPage {
  return {
    id: r.id, slug: r.slug,
    title: { uz: r.title_uz, ru: r.title_ru, en: r.title_en, uzCyrl: r.title_cyrl },
    content: { uz: r.content_uz, ru: r.content_ru, en: r.content_en, uzCyrl: r.content_cyrl },
    sortOrder: r.sort_order, isActive: r.is_active === 1,
  };
}

export interface SiteConfigRow {
  id: number; name: string; phone: string; phone_display: string;
  telegram: string; instagram: string; whatsapp: string;
  map_ll: string; map_label: string;
  seo_title_suffix: string; seo_description: string; og_image: string;
}

export function rowToSiteConfig(r: SiteConfigRow): ApiSiteConfig {
  return {
    name: r.name, phone: r.phone, phoneDisplay: r.phone_display,
    telegram: r.telegram, instagram: r.instagram, whatsapp: r.whatsapp,
    mapLl: r.map_ll, mapLabel: r.map_label,
    seoTitleSuffix: r.seo_title_suffix, seoDescription: r.seo_description, ogImage: r.og_image,
  };
}
```

- [ ] **Step 6: Create admin routes.**

`app/routes/api.admin.banners.tsx`:

```tsx
import type { Route } from './+types/api.admin.banners';
import { json, rowToBanner, type BannerRow } from '../../functions/lib/db';
import { parseBannerInput, ValidationError } from '../../functions/lib/validate';
import { requireAdmin } from './api.admin.guard';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const { results } = await env.DB.prepare('SELECT * FROM banners ORDER BY sort_order ASC').all<BannerRow>();
  return json(results.map(rowToBanner));
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;

  let input;
  try {
    input = parseBannerInput(await request.json().catch(() => null));
  } catch (e) {
    if (e instanceof ValidationError) return json({ error: e.message }, { status: 400 });
    throw e;
  }
  await env.DB.prepare('INSERT INTO banners (id, image_url, link_url, alt_text, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(input.id, input.imageUrl, input.linkUrl, input.altText, input.sortOrder, input.isActive ? 1 : 0)
    .run();
  const row = await env.DB.prepare('SELECT * FROM banners WHERE id = ?').bind(input.id).first<BannerRow>();
  return json(row ? rowToBanner(row) : { error: 'insert_failed' }, { status: row ? 201 : 500 });
}
```

`app/routes/api.admin.banners.$id.tsx`:

```tsx
import type { Route } from './+types/api.admin.banners.$id';
import { json, rowToBanner, type BannerRow } from '../../functions/lib/db';
import { parseBannerInput, ValidationError } from '../../functions/lib/validate';
import { requireAdmin } from './api.admin.guard';

export async function action({ request, context, params }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const id = String(params.id);

  if (request.method === 'PUT') {
    let input;
    try {
      input = parseBannerInput({ ...(((await request.json().catch(() => null)) ?? {}) as object), id });
    } catch (e) {
      if (e instanceof ValidationError) return json({ error: e.message }, { status: 400 });
      throw e;
    }
    await env.DB.prepare('UPDATE banners SET image_url=?, link_url=?, alt_text=?, sort_order=?, is_active=? WHERE id=?')
      .bind(input.imageUrl, input.linkUrl, input.altText, input.sortOrder, input.isActive ? 1 : 0, id)
      .run();
    const row = await env.DB.prepare('SELECT * FROM banners WHERE id = ?').bind(id).first<BannerRow>();
    if (!row) return json({ error: 'not_found' }, { status: 404 });
    return json(rowToBanner(row));
  }

  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM banners WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }

  return json({ error: 'method_not_allowed' }, { status: 405 });
}
```

`app/routes/api.admin.pages.tsx`:

```tsx
import type { Route } from './+types/api.admin.pages';
import { json, rowToPage, type PageRow } from '../../functions/lib/db';
import { parsePageInput, ValidationError, type PageInput } from '../../functions/lib/validate';
import { requireAdmin } from './api.admin.guard';

// route moduldan qo'shimcha export qilinmaydi (RR v7 route API konvensiyasi) — lokal funksiya:
function pageBindValues(p: PageInput): [string, string, string, string, string, string, string, string, string, string, number, number] {
  return [p.id, p.slug, p.title.uz, p.title.ru, p.title.en, p.title.uzCyrl,
    p.content.uz, p.content.ru, p.content.en, p.content.uzCyrl, p.sortOrder, p.isActive ? 1 : 0];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const { results } = await env.DB.prepare('SELECT * FROM pages ORDER BY sort_order ASC, slug ASC').all<PageRow>();
  return json(results.map(rowToPage));
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;

  let input;
  try {
    input = parsePageInput(await request.json().catch(() => null));
  } catch (e) {
    if (e instanceof ValidationError) return json({ error: e.message }, { status: 400 });
    throw e;
  }
  try {
    await env.DB.prepare(
      'INSERT INTO pages (id, slug, title_uz, title_ru, title_en, title_cyrl, content_uz, content_ru, content_en, content_cyrl, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(...pageBindValues(input)).run();
  } catch (e) {
    if (e instanceof Error && e.message.includes('UNIQUE')) return json({ error: 'slug_taken' }, { status: 400 });
    throw e;
  }
  const row = await env.DB.prepare('SELECT * FROM pages WHERE id = ?').bind(input.id).first<PageRow>();
  return json(row ? rowToPage(row) : { error: 'insert_failed' }, { status: row ? 201 : 500 });
}
```

`app/routes/api.admin.pages.$id.tsx`:

```tsx
import type { Route } from './+types/api.admin.pages.$id';
import { json, rowToPage, type PageRow } from '../../functions/lib/db';
import { parsePageInput, ValidationError } from '../../functions/lib/validate';
import { requireAdmin } from './api.admin.guard';

export async function action({ request, context, params }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const id = String(params.id);

  if (request.method === 'PUT') {
    let input;
    try {
      input = parsePageInput({ ...(((await request.json().catch(() => null)) ?? {}) as object), id });
    } catch (e) {
      if (e instanceof ValidationError) return json({ error: e.message }, { status: 400 });
      throw e;
    }
    try {
      await env.DB.prepare(
        'UPDATE pages SET slug=?, title_uz=?, title_ru=?, title_en=?, title_cyrl=?, content_uz=?, content_ru=?, content_en=?, content_cyrl=?, sort_order=?, is_active=? WHERE id=?',
      ).bind(input.slug, input.title.uz, input.title.ru, input.title.en, input.title.uzCyrl,
        input.content.uz, input.content.ru, input.content.en, input.content.uzCyrl,
        input.sortOrder, input.isActive ? 1 : 0, id).run();
    } catch (e) {
      if (e instanceof Error && e.message.includes('UNIQUE')) return json({ error: 'slug_taken' }, { status: 400 });
      throw e;
    }
    const row = await env.DB.prepare('SELECT * FROM pages WHERE id = ?').bind(id).first<PageRow>();
    if (!row) return json({ error: 'not_found' }, { status: 404 });
    return json(rowToPage(row));
  }

  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM pages WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }

  return json({ error: 'method_not_allowed' }, { status: 405 });
}
```

`app/routes/api.admin.site-config.tsx`:

```tsx
import type { Route } from './+types/api.admin.site-config';
import { json, rowToSiteConfig, type SiteConfigRow } from '../../functions/lib/db';
import { parseSiteConfigInput, ValidationError } from '../../functions/lib/validate';
import { requireAdmin } from './api.admin.guard';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const row = await env.DB.prepare('SELECT * FROM site_config WHERE id = 1').first<SiteConfigRow>();
  if (!row) return json({ error: 'not_found' }, { status: 404 });
  return json(rowToSiteConfig(row));
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  if (request.method !== 'PUT') return json({ error: 'method_not_allowed' }, { status: 405 });

  let input;
  try {
    input = parseSiteConfigInput(await request.json().catch(() => null));
  } catch (e) {
    if (e instanceof ValidationError) return json({ error: e.message }, { status: 400 });
    throw e;
  }
  await env.DB.prepare(
    'INSERT OR REPLACE INTO site_config (id, name, phone, phone_display, telegram, instagram, whatsapp, map_ll, map_label, seo_title_suffix, seo_description, og_image) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).bind(input.name, input.phone, input.phoneDisplay, input.telegram, input.instagram, input.whatsapp,
    input.mapLl, input.mapLabel, input.seoTitleSuffix, input.seoDescription, input.ogImage).run();
  return json(input);
}
```

Register in `app/routes.ts` after the `api/admin/upload` line:

```ts
  route('api/admin/banners', 'routes/api.admin.banners.tsx'),
  route('api/admin/banners/:id', 'routes/api.admin.banners.$id.tsx'),
  route('api/admin/pages', 'routes/api.admin.pages.tsx'),
  route('api/admin/pages/:id', 'routes/api.admin.pages.$id.tsx'),
  route('api/admin/site-config', 'routes/api.admin.site-config.tsx'),
```

- [ ] **Step 7: Lint + full tests**

Run: `bun run lint` → clean (typegen generates the new `+types/*`). Run: `bun run test` → all pass.

- [ ] **Step 8: Commit**

```bash
git add functions/lib/validate.ts functions/lib/validate.test.ts functions/lib/db.ts app/routes/api.admin.banners.tsx 'app/routes/api.admin.banners.$id.tsx' app/routes/api.admin.pages.tsx 'app/routes/api.admin.pages.$id.tsx' app/routes/api.admin.site-config.tsx app/routes.ts
git commit -m "feat: admin API for banners, pages and site config"
```

---

### Task 3: Markdown-lite renderer (TDD) + `Markdown` component

**Files:**
- Create: `src/lib/markdown.ts`
- Test: `src/lib/markdown.test.ts`
- Create: `src/store/Markdown.tsx`

**Interfaces:**
- Produces: `MdInline = { text: string; bold?: boolean; href?: string }`; `MdBlock = { type: 'h2' | 'h3' | 'p'; inlines: MdInline[] } | { type: 'ul'; items: MdInline[][] }`; `renderMarkdown(src: string): MdBlock[]`; `firstParagraph(src: string): string`; default-export component `Markdown: FC<{ source: string }>`.
- Security: no HTML string output — structured blocks only, React escapes text.

- [ ] **Step 1: Write failing tests** — create `src/lib/markdown.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { renderMarkdown, firstParagraph } from './markdown';

describe('renderMarkdown', () => {
  it('parses headings, paragraphs and lists', () => {
    const blocks = renderMarkdown('## Sarlavha\n\nBirinchi xat boshi.\n\n- Bir\n- Ikki\n\n### Kichik');
    expect(blocks.map((b) => b.type)).toEqual(['h2', 'p', 'ul', 'h3']);
    const ul = blocks[2];
    if (ul.type !== 'ul') throw new Error('expected ul');
    expect(ul.items).toHaveLength(2);
    expect(ul.items[0][0].text).toBe('Bir');
  });

  it('joins consecutive lines into one paragraph', () => {
    const blocks = renderMarkdown('Birinchi qator\nikkinchi qator');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('p');
  });

  it('parses bold and link inlines', () => {
    const blocks = renderMarkdown('Oddiy **qalin** va [link](/katalog) matn');
    if (blocks[0].type === 'ul') throw new Error('expected inline block');
    const inl = blocks[0].inlines;
    expect(inl.find((s) => s.bold)?.text).toBe('qalin');
    expect(inl.find((s) => s.href)?.href).toBe('/katalog');
    expect(inl[inl.length - 1].text).toBe(' matn');
  });

  it('returns [] for empty/whitespace input', () => {
    expect(renderMarkdown('')).toEqual([]);
    expect(renderMarkdown('  \n\n  ')).toEqual([]);
  });

  it('never emits HTML — raw tags stay as plain text', () => {
    const blocks = renderMarkdown('<script>alert(1)</script>');
    if (blocks[0].type === 'ul') throw new Error('expected p');
    expect(blocks[0].inlines[0].text).toBe('<script>alert(1)</script>');
  });
});

describe('firstParagraph', () => {
  it('returns the first paragraph text without markup', () => {
    expect(firstParagraph('## H\n\nSalom **dunyo**.\n\nIkkinchi.')).toBe('Salom dunyo.');
  });
  it('returns empty string when there is no paragraph', () => {
    expect(firstParagraph('## Faqat sarlavha')).toBe('');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest run src/lib/markdown.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement** — create `src/lib/markdown.ts`:

```ts
export interface MdInline {
  text: string;
  bold?: boolean;
  href?: string;
}

export type MdBlock =
  | { type: 'h2' | 'h3' | 'p'; inlines: MdInline[] }
  | { type: 'ul'; items: MdInline[][] };

const INLINE_RE = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

export function parseInlines(src: string): MdInline[] {
  const out: MdInline[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(src)) !== null) {
    if (m.index > last) out.push({ text: src.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ text: m[1], bold: true });
    else out.push({ text: m[2], href: m[3] });
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push({ text: src.slice(last) });
  return out;
}

export function renderMarkdown(src: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  let para: string[] = [];
  let list: MdInline[][] | null = null;

  const flushPara = () => {
    if (para.length > 0) {
      blocks.push({ type: 'p', inlines: parseInlines(para.join(' ')) });
      para = [];
    }
  };
  const flushList = () => {
    if (list && list.length > 0) blocks.push({ type: 'ul', items: list });
    list = null;
  };

  for (const raw of src.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '') { flushPara(); flushList(); continue; }
    if (line.startsWith('### ')) { flushPara(); flushList(); blocks.push({ type: 'h3', inlines: parseInlines(line.slice(4)) }); continue; }
    if (line.startsWith('## ')) { flushPara(); flushList(); blocks.push({ type: 'h2', inlines: parseInlines(line.slice(3)) }); continue; }
    if (line.startsWith('- ')) { flushPara(); (list ??= []).push(parseInlines(line.slice(2))); continue; }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  return blocks;
}

export function firstParagraph(src: string): string {
  for (const b of renderMarkdown(src)) {
    if (b.type === 'p') return b.inlines.map((s) => s.text).join('');
  }
  return '';
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx vitest run src/lib/markdown.test.ts` → PASS (7/7).

- [ ] **Step 5: Create the component** — `src/store/Markdown.tsx` (FC-style — children receive `key`):

```tsx
import type { FC } from 'react';
import { renderMarkdown, type MdInline } from '../lib/markdown';

const Inlines: FC<{ inlines: MdInline[] }> = ({ inlines }) => (
  <>
    {inlines.map((seg, i) => {
      if (seg.href) {
        const external = !seg.href.startsWith('/');
        return (
          <a key={i} href={seg.href} className="text-[#0071E3] hover:underline"
            target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>
            {seg.text}
          </a>
        );
      }
      if (seg.bold) return <strong key={i} className="font-semibold text-[#1D1D1F]">{seg.text}</strong>;
      return <span key={i}>{seg.text}</span>;
    })}
  </>
);

const Markdown: FC<{ source: string }> = ({ source }) => (
  <div className="flex flex-col gap-4">
    {renderMarkdown(source).map((b, i) => {
      if (b.type === 'h2') return <h2 key={i} className="text-[24px] font-semibold text-[#1D1D1F] tracking-[-0.02em] mt-4"><Inlines inlines={b.inlines} /></h2>;
      if (b.type === 'h3') return <h3 key={i} className="text-[18px] font-semibold text-[#1D1D1F] mt-2"><Inlines inlines={b.inlines} /></h3>;
      if (b.type === 'ul') {
        return (
          <ul key={i} className="list-disc pl-6 flex flex-col gap-1.5 text-[15px] text-[#3A3A3C]">
            {b.items.map((item, j) => <li key={j}><Inlines inlines={item} /></li>)}
          </ul>
        );
      }
      return <p key={i} className="text-[15px] text-[#3A3A3C] leading-relaxed"><Inlines inlines={b.inlines} /></p>;
    })}
  </div>
);

export default Markdown;
```

- [ ] **Step 6: Lint + commit**

Run: `bun run lint` → clean.

```bash
git add src/lib/markdown.ts src/lib/markdown.test.ts src/store/Markdown.tsx
git commit -m "feat: markdown-lite renderer with structured (XSS-safe) blocks"
```

---

### Task 4: Loaders + public `/page/:slug` route + sitemap

**Files:**
- Modify: `app/lib/loaders.ts` (append)
- Create: `app/routes/page.tsx`
- Modify: `app/routes.ts` (2 storefront registrations)
- Modify: `app/routes/sitemap[.]xml.tsx`

**Interfaces:**
- Consumes: `rowToBanner`/`rowToPage`/`rowToSiteConfig` + rows (Task 2), `localeToTextKey` (Task 1), `firstParagraph` + `Markdown` (Task 3), existing `resolveLocale`, `pageTitle`, `StoreContext`.
- Produces: `loadBanners(env): Promise<ApiBanner[]>`, `loadPages(env): Promise<ApiPage[]>`, `loadPage(env, slug): Promise<ApiPage | null>`, `loadSiteConfig(env): Promise<ApiSiteConfig>`, `staticSiteConfigAsApi(): ApiSiteConfig`, `export interface PageLink { slug: string; title: LocalizedText }` — all exported from `app/lib/loaders.ts`. Route `/page/:slug` (+ `:lang/page/:slug`, id `page-lang`).

- [ ] **Step 1: Add loaders** — append to `app/lib/loaders.ts` (extend the shared/types import with `ApiBanner, ApiPage, ApiSiteConfig, LocalizedText`; extend the db import with `rowToBanner, rowToPage, rowToSiteConfig, type BannerRow, type PageRow, type SiteConfigRow`; add `import { siteConfig as staticSiteConfig } from './site.config';`):

```ts
export interface PageLink {
  slug: string;
  title: LocalizedText;
}

export function staticSiteConfigAsApi(): ApiSiteConfig {
  return {
    name: staticSiteConfig.name,
    phone: staticSiteConfig.phone,
    phoneDisplay: staticSiteConfig.phoneDisplay,
    telegram: staticSiteConfig.telegram,
    instagram: staticSiteConfig.instagram,
    whatsapp: staticSiteConfig.whatsapp,
    mapLl: staticSiteConfig.map.ll,
    mapLabel: staticSiteConfig.map.label,
    seoTitleSuffix: staticSiteConfig.seo.titleSuffix,
    seoDescription: staticSiteConfig.seo.description,
    ogImage: staticSiteConfig.seo.ogImage,
  };
}

export async function loadSiteConfig(env: Env): Promise<ApiSiteConfig> {
  try {
    const row = await env.DB.prepare('SELECT * FROM site_config WHERE id = 1').first<SiteConfigRow>();
    if (!row) throw new Error('no_site_config');
    return rowToSiteConfig(row);
  } catch (err) {
    console.error('loadSiteConfig fallback:', err);
    return staticSiteConfigAsApi();
  }
}

export async function loadBanners(env: Env): Promise<ApiBanner[]> {
  try {
    const { results } = await env.DB.prepare('SELECT * FROM banners WHERE is_active = 1 ORDER BY sort_order ASC').all<BannerRow>();
    return results.map(rowToBanner);
  } catch (err) {
    console.error('loadBanners fallback:', err);
    return [];
  }
}

export async function loadPages(env: Env): Promise<ApiPage[]> {
  try {
    const { results } = await env.DB.prepare('SELECT * FROM pages WHERE is_active = 1 ORDER BY sort_order ASC, slug ASC').all<PageRow>();
    return results.map(rowToPage);
  } catch (err) {
    console.error('loadPages fallback:', err);
    return [];
  }
}

export async function loadPage(env: Env, slug: string): Promise<ApiPage | null> {
  try {
    const row = await env.DB.prepare('SELECT * FROM pages WHERE slug = ? AND is_active = 1').bind(slug).first<PageRow>();
    return row ? rowToPage(row) : null;
  } catch (err) {
    console.error('loadPage fallback:', err);
    return null;
  }
}
```

- [ ] **Step 2: Create the route** — `app/routes/page.tsx`:

```tsx
import { useLoaderData } from 'react-router';
import type { Route } from './+types/page';
import { loadPage } from '../lib/loaders';
import { resolveLocale, localeToTextKey } from '../lib/i18n';
import { pageTitle } from '../lib/seo';
import { firstParagraph } from '../../src/lib/markdown';
import Markdown from '../../src/store/Markdown';

export async function loader({ params, context }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  const page = await loadPage(context.cloudflare.env, String(params.slug));
  if (!page) throw new Response('Not Found', { status: 404 });
  return { page, locale };
}

export function meta({ data }: Route.MetaArgs) {
  if (!data) return [{ title: pageTitle() }];
  const key = localeToTextKey(data.locale);
  const desc = firstParagraph(data.page.content[key]);
  return [
    { title: pageTitle(data.page.title[key]) },
    ...(desc ? [{ name: 'description', content: desc }] : []),
  ];
}

export default function ContentPage() {
  const { page, locale } = useLoaderData<typeof loader>();
  const key = localeToTextKey(locale);
  return (
    <div className="max-w-[760px] mx-auto px-4 py-10 md:py-14">
      <h1 className="text-[32px] md:text-[40px] font-semibold text-[#1D1D1F] tracking-[-0.03em] mb-6">{page.title[key]}</h1>
      <Markdown source={page.content[key]} />
    </div>
  );
}
```

- [ ] **Step 3: Register routes** — in `app/routes.ts`, inside the store layout add after the `savat` pair (keep bare + lang grouping consistent with neighbors):

```ts
    route('page/:slug', 'routes/page.tsx'),
```
and after `':lang/savat'`:
```ts
    route(':lang/page/:slug', 'routes/page.tsx', { id: 'page-lang' }),
```

- [ ] **Step 4: Sitemap** — in `app/routes/sitemap[.]xml.tsx`: add `loadPages` to the loaders import, load it in the `Promise.all` (`const [{ products }, categories, brands, pages] = await Promise.all([loadStore(env), loadCategories(env), loadBrands(env), loadPages(env)]);`) and add to `paths`:

```ts
    ...pages.map((p) => `/page/${p.slug}`),
```

- [ ] **Step 5: Verify**

Run: `bun run lint` → clean. Run: `bun run test` → all pass.
Run: `bun run build` → succeeds.
Smoke (agar dev server ishlayotgan bo'lsa): `curl -s http://localhost:5173/page/faq | grep -o '<h1[^>]*>[^<]*'` → seed sarlavha; `curl -s http://localhost:5173/sitemap.xml | grep -c '/page/'` → 16 (4 sahifa × 4 locale).

- [ ] **Step 6: Commit**

```bash
git add app/lib/loaders.ts app/routes/page.tsx app/routes.ts 'app/routes/sitemap[.]xml.tsx'
git commit -m "feat: content page route, sitemap entries and content/config loaders"
```

---

### Task 5: Site config threading (layout topbar, footer, JSON-LD) + footer page links

**Files:**
- Modify: `app/lib/seo.ts` (`organizationJsonLd` optional config param)
- Modify: `app/routes/store.tsx` (loader loads siteConfig + pageLinks)
- Modify: `app/root.tsx` (JSON-LD from store loader data)
- Modify: `src/store/StoreLayout.tsx` (props + topbar from config)
- Modify: `src/store/Footer.tsx` (config prop + page links)

**Interfaces:**
- Consumes: `loadSiteConfig`, `loadPages`, `staticSiteConfigAsApi` (Task 4); `localeToTextKey` (Task 1); `ApiSiteConfig`, `LocalizedText`.
- Produces: store loader returns `{ locale, siteConfig: ApiSiteConfig, pageLinks: PageLink[] }` where `PageLink` is `{ slug: string; title: LocalizedText }` (Task 4, `app/lib/loaders.ts`); `StoreLayout` props gain `config: ApiSiteConfig; pageLinks: PageLink[]`; `Footer` signature becomes `FC<{ t: Translation; locale: Locale; config: ApiSiteConfig; pageLinks: PageLink[] }>`; `organizationJsonLd(config?: ApiSiteConfig)`.
- Meta title suffix (`pageTitle`) **statik qoladi** — bu bo'lak chegarasi (spec §9 ga kiritilgan); JSON-LD/topbar/footer D1 configdan.

- [ ] **Step 1: seo.ts** — replace `organizationJsonLd` with (add `import type { ApiSiteConfig } from '../../shared/types';`):

```ts
export function organizationJsonLd(config?: ApiSiteConfig) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: config?.name ?? siteConfig.name,
    telephone: config?.phone ?? siteConfig.phone,
    sameAs: [config?.telegram ?? siteConfig.telegram, config?.instagram ?? siteConfig.instagram],
  };
}
```

- [ ] **Step 2: store.tsx** — new loader + prop passing:

```tsx
import { Outlet, useLoaderData, useRouteError } from 'react-router';
import type { Route } from './+types/store';
import { resolveLocale, localeToLang } from '../lib/i18n';
import { hreflangLinks } from '../lib/seo';
import { loadSiteConfig, loadPages, type PageLink } from '../lib/loaders';
import { translations } from '../../src/locales';
import StoreLayout from '../../src/store/StoreLayout';

export async function loader({ params, context }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  const env = context.cloudflare.env;
  const [siteConfig, pages] = await Promise.all([loadSiteConfig(env), loadPages(env)]);
  const pageLinks: PageLink[] = pages.map((p) => ({ slug: p.slug, title: p.title }));
  return { locale, siteConfig, pageLinks };
}

export function meta({ location }: Route.MetaArgs) {
  return [...hreflangLinks(location?.pathname ?? '/')];
}

export default function StoreRoot() {
  const { locale, siteConfig, pageLinks } = useLoaderData<typeof loader>();
  const lang = localeToLang(locale);
  const t = translations[lang];
  return (
    <StoreLayout locale={locale} lang={lang} t={t} config={siteConfig} pageLinks={pageLinks}>
      <Outlet context={{ t, lang, locale }} />
    </StoreLayout>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  return <div className="p-16 text-center text-[#6E6E73]">Xatolik yuz berdi.</div>;
}
```

(Diqqat: eski `meta`dagi `organizationJsonLd()` bu yerda allaqachon ishlatilmaydi — JSON-LD root Layoutda; `meta` faqat hreflang qoldiradi, mavjud holat bilan bir xil.)

- [ ] **Step 3: root.tsx** — store loader data endi config ham beradi:

```tsx
  const storeData = useRouteLoaderData('routes/store') as { locale?: Locale; siteConfig?: ApiSiteConfig } | undefined;
  ...
  const jsonLd = JSON.stringify(organizationJsonLd(storeData?.siteConfig)).replace(/</g, '\\u003c');
```

Add `import type { ApiSiteConfig } from '../shared/types';` to root.tsx imports. Qolgan hech narsa o'zgarmaydi (hreflang/gating saqlanadi).

- [ ] **Step 4: StoreLayout.tsx** — props + topbar (statik `siteConfig` importi olib tashlanadi):

```tsx
import type { ReactNode } from 'react';
import type { LangKey, Translation } from '../locales';
import type { Locale } from '../../app/lib/i18n';
import type { ApiSiteConfig } from '../../shared/types';
import type { PageLink } from '../../app/lib/loaders';
import Header from './Header';
import Footer from './Footer';
import { CartProvider } from './CartContext';

export interface StoreContext {
  t: Translation;
  lang: LangKey;
  locale: Locale;
}

export default function StoreLayout({
  locale, lang, t, config, pageLinks, children,
}: { locale: Locale; lang: LangKey; t: Translation; config: ApiSiteConfig; pageLinks: PageLink[]; children: ReactNode }) {
  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col bg-white">
        <div className="bg-[#F5F5F7] text-[#6E6E73] text-[12px]">
          <div className="max-w-[1200px] mx-auto px-4 h-9 flex items-center gap-4">
            <span className="font-semibold text-[#1B7A34]">{t.utilInstallment}</span>
            <span className="hidden sm:inline">{t.utilDiscounts}</span>
            <a href={`tel:${config.phone}`} className="ml-auto font-medium text-[#1D1D1F]">{config.phoneDisplay}</a>
          </div>
        </div>
        <Header t={t} lang={lang} locale={locale} />
        <main className="flex-1">{children}</main>
        <Footer t={t} locale={locale} config={config} pageLinks={pageLinks} />
      </div>
    </CartProvider>
  );
}
```

(`translations` importi endi ishlatilmasa olib tashlansin.)

- [ ] **Step 5: Footer.tsx** — statik `siteConfig` importi o'rniga `config` prop; modul-darajali konstantalar komponent ichiga ko'chadi; pastki qatorda sahifa linklari. Signature va o'zgargan qismlar (qolgan JSX butunligicha qoladi, faqat `siteConfig.` → `config.` almashtiriladi):

```tsx
import type { FC } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { Phone, Send, Instagram, MapPin, Clock, ExternalLink } from 'lucide-react';
import type { Translation } from '../locales';
import type { ApiSiteConfig } from '../../shared/types';
import type { PageLink } from '../../app/lib/loaders';
import { localizedPath, localeToTextKey, type Locale } from '../../app/lib/i18n';
import logo from '../assets/logo.svg';

const fadeInUp = {
  initial: { opacity: 1, y: 0 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.1 },
};

const Footer: FC<{ t: Translation; locale: Locale; config: ApiSiteConfig; pageLinks: PageLink[] }> = ({ t, locale, config, pageLinks }) => {
  const mapWidgetSrc = `https://yandex.com/map-widget/v1/?ll=${encodeURIComponent(config.mapLl)}&z=17&pt=${config.mapLl},pm2rdm`;
  const mapLinkHref = `https://yandex.com/maps/?ll=${encodeURIComponent(config.mapLl)}&z=17&pt=${config.mapLl},pm2rdm`;
  const telegramHandle = `@${config.telegram.replace(/^https?:\/\/t\.me\//, '')}`;
  const instagramHandle = `@${config.instagram.replace(/^https?:\/\/www\.instagram\.com\//, '').replace(/\/$/, '')}`;
  const textKey = localeToTextKey(locale);
  return (
    <footer ...>  {/* mavjud JSX, siteConfig.* → config.*, map.ll → mapLl, map.label kerak bo'lsa mapLabel */}
      ...
      {/* pastki qator: footerPrivacy/footerTerms statik spanlar O'RNIGA: */}
      <div className="flex gap-6">
        {pageLinks.map((p) => (
          <Link key={p.slug} to={localizedPath(locale, `/page/${p.slug}`)} className="hover:text-[#1D1D1F] transition-colors">
            {p.title[textKey]}
          </Link>
        ))}
      </div>
      ...
    </footer>
  );
};

export default Footer;
```

Muhim: `Link` react-router'dan (Footer Outlet tashqarisida — `LocaleLink` ishlatilmaydi); komponent `FC<{...}>` uslubiga o'tadi (link `key` oladi, lekin `key` Footer ichidagi Link'da — baribir FC uslubi xavfsiz). `footerPrivacy`/`footerTerms` kalitlari locales'da qoladi (parity buzilmaydi), faqat ishlatilmay qoladi.

- [ ] **Step 6: Verify**

Run: `bun run lint` → clean (StoreLayout/Footer/store.tsx tip mosligini typegen tekshiradi). Run: `bun run test` → all pass. Run: `bun run build` → succeeds.

- [ ] **Step 7: Commit**

```bash
git add app/lib/seo.ts app/routes/store.tsx app/root.tsx src/store/StoreLayout.tsx src/store/Footer.tsx
git commit -m "feat: thread D1 site config into layout, footer and JSON-LD; footer page links"
```

---

### Task 6: Admin UI — Bannerlar & Sahifalar tablari + Sayt ma'lumotlari

**Files:**
- Modify: `src/admin/api.ts` (append CRUD clients)
- Create: `src/admin/BannerList.tsx`, `src/admin/BannerForm.tsx`, `src/admin/PageList.tsx`, `src/admin/PageForm.tsx`, `src/admin/SiteConfigForm.tsx`
- Modify: `src/admin/AdminApp.tsx` (2 yangi tab; Sozlamalar tabiga SiteConfigForm qo'shiladi)

**Interfaces:**
- Consumes: admin endpoints (Task 2), `uploadImage` (mavjud, `src/admin/api.ts:159`), `ApiBanner`/`ApiPage`/`ApiSiteConfig`/`LocalizedText`.
- Produces: api.ts funksiyalari: `listBanners(): Promise<ApiBanner[]>`, `createBanner(b: Partial<ApiBanner>): Promise<ApiBanner>`, `updateBanner(id: string, b: Partial<ApiBanner>): Promise<ApiBanner>`, `deleteBanner(id: string): Promise<void>`, `listPages(): Promise<ApiPage[]>`, `createPage(p: Partial<ApiPage>): Promise<ApiPage>`, `updatePage(id: string, p: Partial<ApiPage>): Promise<ApiPage>`, `deletePage(id: string): Promise<void>`, `getSiteConfig(): Promise<ApiSiteConfig>`, `updateSiteConfig(c: ApiSiteConfig): Promise<ApiSiteConfig>`.
- UI konvensiya: `CategoryList`/`CategoryForm`/`BrandForm` uslubi (ro'yxat + inline forma, `window.confirm` bilan o'chirish, `FC<{...}>` yoki funksiya — `key` olmasa oddiy funksiya ham bo'ladi; `PageForm`/`BannerForm` `key` bilan remount qilinadi → **FC uslubida yozilsin**).

- [ ] **Step 1: api.ts clients** — append to `src/admin/api.ts` (extend shared/types import with `ApiBanner, ApiPage, ApiSiteConfig`):

```ts
export async function listBanners(): Promise<ApiBanner[]> {
  return handle(await fetch('/api/admin/banners'));
}
export async function createBanner(b: Partial<ApiBanner>): Promise<ApiBanner> {
  return handle(await fetch('/api/admin/banners', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b),
  }));
}
export async function updateBanner(id: string, b: Partial<ApiBanner>): Promise<ApiBanner> {
  return handle(await fetch(`/api/admin/banners/${encodeURIComponent(id)}`, {
    method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b),
  }));
}
export async function deleteBanner(id: string): Promise<void> {
  await handle(await fetch(`/api/admin/banners/${encodeURIComponent(id)}`, { method: 'DELETE' }));
}

export async function listPages(): Promise<ApiPage[]> {
  return handle(await fetch('/api/admin/pages'));
}
export async function createPage(p: Partial<ApiPage>): Promise<ApiPage> {
  return handle(await fetch('/api/admin/pages', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(p),
  }));
}
export async function updatePage(id: string, p: Partial<ApiPage>): Promise<ApiPage> {
  return handle(await fetch(`/api/admin/pages/${encodeURIComponent(id)}`, {
    method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(p),
  }));
}
export async function deletePage(id: string): Promise<void> {
  await handle(await fetch(`/api/admin/pages/${encodeURIComponent(id)}`, { method: 'DELETE' }));
}

export async function getSiteConfig(): Promise<ApiSiteConfig> {
  return handle(await fetch('/api/admin/site-config'));
}
export async function updateSiteConfig(c: ApiSiteConfig): Promise<ApiSiteConfig> {
  return handle(await fetch('/api/admin/site-config', {
    method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(c),
  }));
}
```

- [ ] **Step 2: BannerForm.tsx** (FC — `key={editing.id}` bilan remount qilinadi; `BrandForm` uslubi):

```tsx
import { useState } from 'react';
import type { FC } from 'react';
import type { ApiBanner } from '../../shared/types';
import { createBanner, updateBanner, uploadImage } from './api';

const BannerForm: FC<{ initial: ApiBanner | null; onSaved: () => void; onCancel: () => void }> = ({ initial, onSaved, onCancel }) => {
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [linkUrl, setLinkUrl] = useState(initial?.linkUrl ?? '');
  const [altText, setAltText] = useState(initial?.altText ?? '');
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try { const { imageUrl: url } = await uploadImage(file); setImageUrl(url); }
    catch { setError('Rasm yuklashda xatolik'); }
    finally { setBusy(false); }
  }

  async function save() {
    if (!imageUrl) { setError('Banner rasmi majburiy'); return; }
    setBusy(true); setError('');
    try {
      const body = { imageUrl, linkUrl, altText, sortOrder, isActive };
      if (initial) await updateBanner(initial.id, body);
      else await createBanner(body);
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : 'Xatolik'); }
    finally { setBusy(false); }
  }

  return (
    <div className="bg-white rounded-2xl p-5 mb-4 shadow-[--shadow-apple] space-y-3">
      <h3 className="font-semibold">{initial ? 'Bannerni tahrirlash' : 'Yangi banner'}</h3>
      <div className="flex items-center gap-3">
        {imageUrl ? <img src={imageUrl} alt="" className="h-20 rounded-xl object-cover bg-[#F5F5F7]" /> : <div className="h-20 w-40 rounded-xl bg-[#F5F5F7]" />}
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} />
      </div>
      <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="Link (masalan /chegirmalar)" className="w-full border border-[#E5E5EA] rounded-xl px-3 py-2 text-[14px]" />
      <input value={altText} onChange={(e) => setAltText(e.target.value)} placeholder="Alt matn" className="w-full border border-[#E5E5EA] rounded-xl px-3 py-2 text-[14px]" />
      <div className="flex items-center gap-4">
        <label className="text-[13px] text-[#6E6E73]">Tartib
          <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className="ml-2 w-20 border border-[#E5E5EA] rounded-xl px-2 py-1.5" />
        </label>
        <label className="text-[13px] text-[#6E6E73] flex items-center gap-2">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Faol
        </label>
      </div>
      {error && <p className="text-[13px] text-[#E8462D]">{error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className="px-5 py-2.5 bg-[#0071E3] text-white font-semibold rounded-full disabled:opacity-50">Saqlash</button>
        <button onClick={onCancel} className="px-5 py-2.5 text-[#6E6E73] font-semibold rounded-full">Bekor qilish</button>
      </div>
    </div>
  );
};

export default BannerForm;
```

- [ ] **Step 3: BannerList.tsx** (`CategoryList` uslubi):

```tsx
import { useEffect, useState } from 'react';
import type { ApiBanner } from '../../shared/types';
import { deleteBanner, listBanners } from './api';
import BannerForm from './BannerForm';

export default function BannerList() {
  const [items, setItems] = useState<ApiBanner[]>([]);
  const [editing, setEditing] = useState<ApiBanner | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    setItems(await listBanners());
    setLoading(false);
    setEditing(null);
    setCreating(false);
  }
  useEffect(() => { refresh(); }, []);

  async function remove(b: ApiBanner) {
    if (!window.confirm('Banner o\'chirilsinmi?')) return;
    await deleteBanner(b.id);
    refresh();
  }

  if (loading) return <p className="text-[#6E6E73]">Yuklanmoqda…</p>;
  return (
    <div>
      {creating && <BannerForm initial={null} onSaved={refresh} onCancel={() => setCreating(false)} />}
      {editing && <BannerForm key={editing.id} initial={editing} onSaved={refresh} onCancel={() => setEditing(null)} />}
      {!creating && !editing && (
        <button onClick={() => setCreating(true)} className="mb-4 px-5 py-2.5 bg-[#1D1D1F] text-white font-semibold rounded-full">+ Yangi banner</button>
      )}
      <div className="space-y-2">
        {items.map((b) => (
          <div key={b.id} className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-[--shadow-apple]">
            <img src={b.imageUrl} alt={b.altText} className="w-24 h-14 rounded-xl object-cover bg-[#F5F5F7]" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] text-[#6E6E73] truncate">{b.linkUrl || '—'}</div>
              <div className="text-[12px] text-[#86868B]">Tartib: {b.sortOrder} · {b.isActive ? 'Faol' : 'Nofaol'}</div>
            </div>
            <button onClick={() => setEditing(b)} className="text-[13px] text-[#0071E3] font-semibold px-2">Tahrir</button>
            <button onClick={() => remove(b)} className="text-[13px] text-[#E8462D] font-semibold px-2">O'chirish</button>
          </div>
        ))}
        {items.length === 0 && <p className="text-[#6E6E73] text-[14px]">Bannerlar yo'q.</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: PageForm.tsx** (FC — remount `key` bilan; 4 til bo'limi):

```tsx
import { useState } from 'react';
import type { FC } from 'react';
import type { ApiPage, LocalizedText } from '../../shared/types';
import { createPage, updatePage } from './api';

const EMPTY: LocalizedText = { uz: '', ru: '', en: '', uzCyrl: '' };
const LANGS: { key: keyof LocalizedText; label: string }[] = [
  { key: 'uz', label: "O'zbek (lotin)" },
  { key: 'ru', label: 'Русский' },
  { key: 'en', label: 'English' },
  { key: 'uzCyrl', label: 'Ўзбек (кирилл)' },
];

const PageForm: FC<{ initial: ApiPage | null; onSaved: () => void; onCancel: () => void }> = ({ initial, onSaved, onCancel }) => {
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [title, setTitle] = useState<LocalizedText>(initial?.title ?? EMPTY);
  const [content, setContent] = useState<LocalizedText>(initial?.content ?? EMPTY);
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setBusy(true); setError('');
    try {
      const body = { slug, title, content, sortOrder, isActive };
      if (initial) await updatePage(initial.id, body);
      else await createPage(body);
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : 'Xatolik'); }
    finally { setBusy(false); }
  }

  return (
    <div className="bg-white rounded-2xl p-5 mb-4 shadow-[--shadow-apple] space-y-4">
      <h3 className="font-semibold">{initial ? 'Sahifani tahrirlash' : 'Yangi sahifa'}</h3>
      <div className="flex items-center gap-4 flex-wrap">
        <label className="text-[13px] text-[#6E6E73]">Slug
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="masalan: faq" className="ml-2 border border-[#E5E5EA] rounded-xl px-3 py-2 text-[14px]" />
        </label>
        <label className="text-[13px] text-[#6E6E73]">Tartib
          <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className="ml-2 w-20 border border-[#E5E5EA] rounded-xl px-2 py-1.5" />
        </label>
        <label className="text-[13px] text-[#6E6E73] flex items-center gap-2">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Faol
        </label>
      </div>
      {LANGS.map((l) => (
        <div key={l.key} className="space-y-2">
          <div className="text-[13px] font-semibold text-[#1D1D1F]">{l.label}</div>
          <input value={title[l.key]} onChange={(e) => setTitle({ ...title, [l.key]: e.target.value })} placeholder="Sarlavha" className="w-full border border-[#E5E5EA] rounded-xl px-3 py-2 text-[14px]" />
          <textarea value={content[l.key]} onChange={(e) => setContent({ ...content, [l.key]: e.target.value })} rows={6} placeholder="Matn (markdown: ## sarlavha, **qalin**, - ro'yxat, [link](/url))" className="w-full border border-[#E5E5EA] rounded-xl px-3 py-2 text-[14px] font-mono" />
        </div>
      ))}
      {error && <p className="text-[13px] text-[#E8462D]">{error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className="px-5 py-2.5 bg-[#0071E3] text-white font-semibold rounded-full disabled:opacity-50">Saqlash</button>
        <button onClick={onCancel} className="px-5 py-2.5 text-[#6E6E73] font-semibold rounded-full">Bekor qilish</button>
      </div>
    </div>
  );
};

export default PageForm;
```

- [ ] **Step 5: PageList.tsx**:

```tsx
import { useEffect, useState } from 'react';
import type { ApiPage } from '../../shared/types';
import { deletePage, listPages } from './api';
import PageForm from './PageForm';

export default function PageList() {
  const [items, setItems] = useState<ApiPage[]>([]);
  const [editing, setEditing] = useState<ApiPage | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    setItems(await listPages());
    setLoading(false);
    setEditing(null);
    setCreating(false);
  }
  useEffect(() => { refresh(); }, []);

  async function remove(p: ApiPage) {
    if (!window.confirm(`"${p.title.uz}" sahifasi o'chirilsinmi?`)) return;
    await deletePage(p.id);
    refresh();
  }

  if (loading) return <p className="text-[#6E6E73]">Yuklanmoqda…</p>;
  return (
    <div>
      {creating && <PageForm initial={null} onSaved={refresh} onCancel={() => setCreating(false)} />}
      {editing && <PageForm key={editing.id} initial={editing} onSaved={refresh} onCancel={() => setEditing(null)} />}
      {!creating && !editing && (
        <button onClick={() => setCreating(true)} className="mb-4 px-5 py-2.5 bg-[#1D1D1F] text-white font-semibold rounded-full">+ Yangi sahifa</button>
      )}
      <div className="space-y-2">
        {items.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-[--shadow-apple]">
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{p.title.uz}</div>
              <div className="text-[12px] text-[#86868B]">/page/{p.slug} · {p.isActive ? 'Faol' : 'Nofaol'}</div>
            </div>
            <button onClick={() => setEditing(p)} className="text-[13px] text-[#0071E3] font-semibold px-2">Tahrir</button>
            <button onClick={() => remove(p)} className="text-[13px] text-[#E8462D] font-semibold px-2">O'chirish</button>
          </div>
        ))}
        {items.length === 0 && <p className="text-[#6E6E73] text-[14px]">Sahifalar yo'q.</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: SiteConfigForm.tsx**:

```tsx
import { useEffect, useState } from 'react';
import type { ApiSiteConfig } from '../../shared/types';
import { getSiteConfig, updateSiteConfig } from './api';

const FIELDS: { key: keyof ApiSiteConfig; label: string; placeholder?: string }[] = [
  { key: 'name', label: 'Do\'kon nomi' },
  { key: 'phone', label: 'Telefon (tel: format)', placeholder: '+998901234567' },
  { key: 'phoneDisplay', label: 'Telefon (ko\'rinish)', placeholder: '+998 (90) 123-45-67' },
  { key: 'telegram', label: 'Telegram URL' },
  { key: 'instagram', label: 'Instagram URL' },
  { key: 'whatsapp', label: 'WhatsApp URL' },
  { key: 'mapLl', label: 'Xarita koordinatalari (lon,lat)' },
  { key: 'mapLabel', label: 'Manzil yorlig\'i' },
  { key: 'seoTitleSuffix', label: 'SEO title suffiksi' },
  { key: 'seoDescription', label: 'SEO tavsif' },
  { key: 'ogImage', label: 'OG rasm yo\'li' },
];

export default function SiteConfigForm() {
  const [form, setForm] = useState<ApiSiteConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getSiteConfig().then(setForm).catch(() => setMsg('Yuklashda xatolik (migratsiya qo\'llanganmi?)'));
  }, []);

  if (!form) return <p className="text-[#6E6E73]">{msg || 'Yuklanmoqda…'}</p>;

  async function save() {
    if (!form) return;
    setBusy(true); setMsg('');
    try { await updateSiteConfig(form); setMsg('Saqlandi ✓'); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Xatolik'); }
    finally { setBusy(false); }
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-[--shadow-apple] space-y-3 max-w-xl">
      <h3 className="font-semibold text-[17px]">Sayt ma'lumotlari</h3>
      {FIELDS.map((f) => (
        <label key={f.key} className="block text-[13px] text-[#6E6E73]">
          {f.label}
          <input
            value={form[f.key]}
            placeholder={f.placeholder}
            onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            className="mt-1 w-full border border-[#E5E5EA] rounded-xl px-3 py-2 text-[14px] text-[#1D1D1F]"
          />
        </label>
      ))}
      {msg && <p className={`text-[13px] ${msg.includes('✓') ? 'text-[#1B7A34]' : 'text-[#E8462D]'}`}>{msg}</p>}
      <button onClick={save} disabled={busy} className="px-5 py-2.5 bg-[#0071E3] text-white font-semibold rounded-full disabled:opacity-50">Saqlash</button>
    </div>
  );
}
```

(Eslatma: `FIELDS.map`dagi `label` `key` oladi — `SiteConfigForm` oddiy funksiya, `key` DOM elementga berilgani uchun muammo yo'q; `FC` talab qilinadigan joy faqat custom komponentga `key` berilganda.)

- [ ] **Step 7: AdminApp.tsx** — `Tab` tipiga `'banners' | 'pages'` qo'shilsin, header'ga ikkita yangi tugma (mavjud tugmalar uslubida, matnlari "Bannerlar" va "Sahifalar"), kontent bo'limida:

```tsx
{tab === 'banners' && <BannerList />}
{tab === 'pages' && <PageList />}
```

va Sozlamalar tabida mavjud `<SettingsForm />` dan keyin `<div className="mt-8"><SiteConfigForm /></div>`.

- [ ] **Step 8: Verify**

Run: `bun run lint` → clean. Run: `bun run test` → all pass. Run: `bun run build` → succeeds.

- [ ] **Step 9: Commit**

```bash
git add src/admin/api.ts src/admin/BannerList.tsx src/admin/BannerForm.tsx src/admin/PageList.tsx src/admin/PageForm.tsx src/admin/SiteConfigForm.tsx src/admin/AdminApp.tsx
git commit -m "feat: admin tabs for banners, content pages and site config"
```
