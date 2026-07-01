# Reja 3 — Admin panel (auth + yozish API + UI) (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Login+parol bilan himoyalangan admin panel qurish: admin mahsulotlarni qo'shadi/tahrirlaydi/o'chiradi, rasm yuklaydi (R2), boshlang'ich foizi/kurs/muddat ustamalarini boshqaradi. Hammasi Cloudflare bepul tarifda.

**Architecture:** Admin yozish API'lari `functions/api/admin/*` da, `_middleware.ts` orqali imzolangan sessiya cookie bilan himoyalanadi. Rasm R2'ga yuklanadi va `GET /images/*` Function orqali beriladi. Frontend `/admin` yo'lida alohida React ilova (`AdminApp`) sifatida ishlaydi (SPA fallback orqali).

**Tech Stack:** Cloudflare Pages Functions, D1, R2, Web Crypto (HMAC/SHA-256), React 19, TypeScript strict, vitest.

## Global Constraints

- Strict TypeScript, `any` **ishlatilmaydi**. Lint `src` va `functions`ni tekshiradi.
- Paket menejeri: **bun**; Cloudflare `bunx wrangler ...`.
- Commit formati: `feat:`, `fix:`, `chore:`, `docs:`.
- **Reja 1 va Reja 2 bajarilgan** (D1 sxema, ommaviy API, `shared/types.ts`, `Env` tipi mavjud).
- Admin API JSON kalitlari camelCase; sessiya cookie nomi `session` (`HttpOnly; Secure; SameSite=Lax; Path=/`).
- Maxfiy qiymatlar (`ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`) faqat Cloudflare secret sifatida; **repoda haqiqiy qiymat yo'q**.
- Admin panel UI faqat o'zbekcha.

---

## File Structure

- `vitest.config.ts` — `functions/**/*.test.ts` ni ham qamrash (Modify).
- `functions/lib/auth.ts` — SHA-256, HMAC imzo/tekshiruv, cookie yordamchilari (Create).
- `functions/lib/auth.test.ts` — auth testlari (Create).
- `functions/lib/validate.ts` — mahsulot/sozlama kirishini tekshirish (Create).
- `functions/api/admin/_middleware.ts` — sessiya qo'riqchisi (Create).
- `functions/api/admin/login.ts`, `logout.ts`, `me.ts` (Create).
- `functions/api/admin/products.ts` — GET (barchasi) + POST (Create).
- `functions/api/admin/products/[id].ts` — PUT + DELETE (Create).
- `functions/api/admin/settings.ts` — PUT (Create).
- `functions/api/admin/upload.ts` — POST (R2) (Create).
- `functions/images/[[path]].ts` — R2'dan rasm berish (Create).
- `public/_redirects` — SPA fallback (Create).
- `src/main.tsx` — `/admin` yo'lida `AdminApp` (Modify).
- `src/admin/api.ts` — admin fetch yordamchilari (Create).
- `src/admin/AdminApp.tsx` — sessiya holati + qobiq (Create).
- `src/admin/Login.tsx` (Create).
- `src/admin/ProductList.tsx`, `src/admin/ProductForm.tsx` (Create).
- `src/admin/SettingsForm.tsx` (Create).

---

### Task 1: Auth kutubxonasi (TDD)

**Files:**
- Modify: `vitest.config.ts`
- Create: `functions/lib/auth.ts`, `functions/lib/auth.test.ts`

**Interfaces:**
- Consumes: Web Crypto global `crypto` (Workers va Node 20+ da mavjud).
- Produces:
  - `sha256Hex(text: string): Promise<string>`
  - `createSession(username: string, secret: string, ttlSeconds: number, now: number): Promise<string>`
  - `verifySession(token: string, secret: string, now: number): Promise<string | null>`
  - `getCookie(request: Request, name: string): string | null`
  - `sessionCookie(token: string, ttlSeconds: number): string`
  - `clearedSessionCookie(): string`

- [ ] **Step 1: Vitest include'ini kengaytirish**

`vitest.config.ts`da `include`ni yangilang:
```ts
    include: ['src/**/*.test.ts', 'functions/**/*.test.ts'],
```

- [ ] **Step 2: Failing testni yozish**

Create `functions/lib/auth.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createSession, verifySession, sha256Hex, getCookie } from './auth';

const SECRET = 'test-secret';

describe('sha256Hex', () => {
  it('barqaror hex hash beradi', async () => {
    expect(await sha256Hex('parol')).toBe(await sha256Hex('parol'));
    expect(await sha256Hex('parol')).not.toBe(await sha256Hex('boshqa'));
  });
});

describe('session', () => {
  it('yaroqli sessiyani tekshiradi', async () => {
    const now = 1_700_000_000;
    const token = await createSession('admin', SECRET, 3600, now);
    expect(await verifySession(token, SECRET, now + 10)).toBe('admin');
  });

  it('muddati o\'tgan sessiyani rad etadi', async () => {
    const now = 1_700_000_000;
    const token = await createSession('admin', SECRET, 3600, now);
    expect(await verifySession(token, SECRET, now + 4000)).toBeNull();
  });

  it('buzilgan imzoni rad etadi', async () => {
    const now = 1_700_000_000;
    const token = await createSession('admin', SECRET, 3600, now);
    expect(await verifySession(token + 'x', SECRET, now + 10)).toBeNull();
    expect(await verifySession(token, 'wrong-secret', now + 10)).toBeNull();
  });
});

describe('getCookie', () => {
  it('cookie qiymatini ajratadi', () => {
    const req = new Request('https://x', { headers: { cookie: 'a=1; session=abc; b=2' } });
    expect(getCookie(req, 'session')).toBe('abc');
    expect(getCookie(req, 'yoq')).toBeNull();
  });
});
```

- [ ] **Step 3: Testni ishga tushirib, muvaffaqiyatsizligini ko'rish**

Run:
```bash
bun run test
```
Expected: FAIL — `./auth` moduli yo'q.

- [ ] **Step 4: `auth.ts`ni yozish**

Create `functions/lib/auth.ts`:
```ts
const enc = new TextEncoder();

function bytesToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function toB64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return bytesToHex(digest);
}

async function hmac(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return toB64url(new Uint8Array(sig));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSession(
  username: string,
  secret: string,
  ttlSeconds: number,
  now: number,
): Promise<string> {
  const exp = now + ttlSeconds;
  const payload = toB64url(enc.encode(JSON.stringify({ u: username, exp })));
  const sig = await hmac(payload, secret);
  return `${payload}.${sig}`;
}

export async function verifySession(
  token: string,
  secret: string,
  now: number,
): Promise<string | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = await hmac(payload, secret);
  if (!safeEqual(sig, expected)) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as {
      u: string;
      exp: number;
    };
    if (typeof data.exp !== 'number' || data.exp < now) return null;
    return data.u;
  } catch {
    return null;
  }
}

export function getCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

export function sessionCookie(token: string, ttlSeconds: number): string {
  return `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${ttlSeconds}`;
}

export function clearedSessionCookie(): string {
  return 'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';
}
```

- [ ] **Step 5: Testni ishga tushirib o'tishini ko'rish**

Run:
```bash
bun run test
```
Expected: PASS — auth testlari va Reja 1 testlari o'tadi.

- [ ] **Step 6: Lint va commit**

```bash
bun run lint
git add vitest.config.ts functions/lib/auth.ts functions/lib/auth.test.ts
git commit -m "feat: session auth library with hmac-signed cookies"
```

---

### Task 2: Kirishni tekshirish yordamchisi (validate)

**Files:**
- Create: `functions/lib/validate.ts`

**Interfaces:**
- Consumes: `ApiProduct`, `ApiSettings`, `Term` (`shared/types`).
- Produces:
  - `parseProductInput(body: unknown): ProductInput` (xato bo'lsa `throw new ValidationError(msg)`).
  - `parseSettingsInput(body: unknown): ApiSettings`.
  - `ProductInput` = `Omit<ApiProduct, 'sortOrder'> & { sortOrder: number }` (barcha maydonlar tekshirilgan).
  - `ValidationError extends Error`.

- [ ] **Step 1: `validate.ts`ni yozish**

Create `functions/lib/validate.ts`:
```ts
import type { ApiProduct, ApiSettings, Category, Condition, Term } from '../../shared/types';

export class ValidationError extends Error {}

const CATEGORIES: Category[] = ['iphone', 'mac', 'ipad', 'pc'];
const CONDITIONS: Condition[] = ['yangi', 'ishlatilgan'];

export type ProductInput = Omit<ApiProduct, 'id'> & { id: string };

function asRecord(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null) throw new ValidationError('body_not_object');
  return body as Record<string, unknown>;
}

function reqString(o: Record<string, unknown>, key: string): string {
  const v = o[key];
  if (typeof v !== 'string' || v.trim() === '') throw new ValidationError(`${key}_required`);
  return v.trim();
}

function reqNumber(o: Record<string, unknown>, key: string): number {
  const v = o[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new ValidationError(`${key}_number`);
  return v;
}

export function parseProductInput(body: unknown): ProductInput {
  const o = asRecord(body);
  const category = reqString(o, 'category') as Category;
  if (!CATEGORIES.includes(category)) throw new ValidationError('category_invalid');
  const condition = reqString(o, 'condition') as Condition;
  if (!CONDITIONS.includes(condition)) throw new ValidationError('condition_invalid');
  const cashPriceUzs = reqNumber(o, 'cashPriceUzs');
  if (cashPriceUzs <= 0) throw new ValidationError('price_positive');

  const id =
    typeof o.id === 'string' && o.id.trim() !== '' ? o.id.trim() : crypto.randomUUID();
  const conditionNote =
    typeof o.conditionNote === 'string' && o.conditionNote.trim() !== ''
      ? o.conditionNote.trim()
      : null;
  const imageUrl = typeof o.imageUrl === 'string' ? o.imageUrl.trim() : '';
  const sortOrder = typeof o.sortOrder === 'number' ? o.sortOrder : 0;
  const isActive = o.isActive === undefined ? true : Boolean(o.isActive);

  return {
    id,
    name: reqString(o, 'name'),
    category,
    condition,
    conditionNote,
    cashPriceUzs,
    imageUrl,
    sortOrder,
    isActive,
  };
}

export function parseSettingsInput(body: unknown): ApiSettings {
  const o = asRecord(body);
  const downPaymentPercent = reqNumber(o, 'downPaymentPercent');
  if (downPaymentPercent < 0 || downPaymentPercent > 100)
    throw new ValidationError('down_payment_range');
  const usdToUzs = reqNumber(o, 'usdToUzs');
  if (usdToUzs <= 0) throw new ValidationError('usd_positive');
  if (!Array.isArray(o.terms) || o.terms.length === 0) throw new ValidationError('terms_required');
  const terms: Term[] = o.terms.map((raw) => {
    const t = asRecord(raw);
    const months = reqNumber(t, 'months');
    const markup = reqNumber(t, 'markup');
    if (months <= 0) throw new ValidationError('months_positive');
    if (markup < 0) throw new ValidationError('markup_negative');
    return { months, markup };
  });
  return { downPaymentPercent, usdToUzs, terms };
}
```

- [ ] **Step 2: Lint va commit**

```bash
bun run lint
git add functions/lib/validate.ts
git commit -m "feat: input validation for admin api"
```

---

### Task 3: Admin auth API (middleware, login, logout, me)

**Files:**
- Create: `functions/api/admin/_middleware.ts`, `functions/api/admin/login.ts`, `functions/api/admin/logout.ts`, `functions/api/admin/me.ts`

**Interfaces:**
- Consumes: `auth.ts`, `Env`, `json` (`functions/lib/db`).
- Produces:
  - `_middleware`: `/api/admin/*` (login'dan tashqari) sessiyani talab qiladi; muvaffaqiyatda `data.username`ni keyingi handlerga uzatadi.
  - `POST /api/admin/login` `{ username, password }` → sessiya cookie o'rnatadi.
  - `POST /api/admin/logout` → cookie tozalaydi.
  - `GET /api/admin/me` → `{ username }`.

- [ ] **Step 1: Middleware'ni yozish**

Create `functions/api/admin/_middleware.ts`:
```ts
import type { Env } from '../../env';
import { json } from '../../lib/db';
import { getCookie, verifySession } from '../../lib/auth';

export const onRequest: PagesFunction<Env, string, { username: string }> = async (context) => {
  const url = new URL(context.request.url);
  if (url.pathname === '/api/admin/login') return context.next();

  const token = getCookie(context.request, 'session');
  const username = token
    ? await verifySession(token, context.env.SESSION_SECRET, Math.floor(Date.now() / 1000))
    : null;
  if (!username) return json({ error: 'unauthorized' }, { status: 401 });

  context.data.username = username;
  return context.next();
};
```

- [ ] **Step 2: Login'ni yozish**

Create `functions/api/admin/login.ts`:
```ts
import type { Env } from '../../env';
import { json } from '../../lib/db';
import { createSession, sessionCookie, sha256Hex } from '../../lib/auth';

const TTL = 60 * 60 * 24 * 7; // 7 kun

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json().catch(() => null)) as
    | { username?: string; password?: string }
    | null;
  if (!body || !body.username || !body.password) {
    return json({ error: 'missing_credentials' }, { status: 400 });
  }
  const hash = await sha256Hex(body.password);
  if (body.username !== env.ADMIN_USERNAME || hash !== env.ADMIN_PASSWORD_HASH) {
    return json({ error: 'invalid_credentials' }, { status: 401 });
  }
  const token = await createSession(body.username, env.SESSION_SECRET, TTL, Math.floor(Date.now() / 1000));
  return json({ ok: true }, { headers: { 'set-cookie': sessionCookie(token, TTL) } });
};
```

- [ ] **Step 3: Logout va me'ni yozish**

Create `functions/api/admin/logout.ts`:
```ts
import type { Env } from '../../env';
import { json } from '../../lib/db';
import { clearedSessionCookie } from '../../lib/auth';

export const onRequestPost: PagesFunction<Env> = async () => {
  return json({ ok: true }, { headers: { 'set-cookie': clearedSessionCookie() } });
};
```

Create `functions/api/admin/me.ts`:
```ts
import type { Env } from '../../env';
import { json } from '../../lib/db';

export const onRequestGet: PagesFunction<Env, string, { username: string }> = async ({ data }) => {
  return json({ username: data.username });
};
```

- [ ] **Step 4: Lokal tekshiruv (secrets bilan)**

`.dev.vars` faylini yarating (repoga kirmaydi — `.gitignore`da):
```
ADMIN_USERNAME = admin
ADMIN_PASSWORD_HASH = <sha256-of-your-password>
SESSION_SECRET = local-dev-secret
```
`ADMIN_PASSWORD_HASH`ni olish uchun (masalan parol `test123`):
```bash
node -e "crypto.subtle.digest('SHA-256', new TextEncoder().encode('test123')).then(b=>console.log(Buffer.from(b).toString('hex')))"
```
Keyin:
```bash
bun run build && bunx wrangler pages dev --local
```
Boshqa terminalda:
```bash
curl -s -c cookie.txt -X POST http://localhost:8788/api/admin/login -H 'content-type: application/json' -d '{"username":"admin","password":"test123"}'
curl -s -b cookie.txt http://localhost:8788/api/admin/me
```
Expected: birinchi `{"ok":true}`, ikkinchi `{"username":"admin"}`. Noto'g'ri parol → `401 invalid_credentials`.

- [ ] **Step 5: Lint va commit**

```bash
bun run lint
git add functions/api/admin/_middleware.ts functions/api/admin/login.ts functions/api/admin/logout.ts functions/api/admin/me.ts
git commit -m "feat: admin auth endpoints (login, logout, me, guard)"
```

---

### Task 4: Admin mahsulot CRUD API

**Files:**
- Create: `functions/api/admin/products.ts`, `functions/api/admin/products/[id].ts`

**Interfaces:**
- Consumes: `Env`, `json`, `rowToProduct`, `ProductRow` (`functions/lib/db`), `parseProductInput`, `ValidationError` (`functions/lib/validate`).
- Produces:
  - `GET /api/admin/products` → barcha mahsulotlar (yashirin ham), `ApiProduct[]`.
  - `POST /api/admin/products` → yaratadi, `ApiProduct` qaytaradi.
  - `PUT /api/admin/products/:id` → yangilaydi.
  - `DELETE /api/admin/products/:id` → o'chiradi.

- [ ] **Step 1: List + Create'ni yozish**

Create `functions/api/admin/products.ts`:
```ts
import type { Env } from '../../env';
import { json, rowToProduct, type ProductRow } from '../../lib/db';
import { parseProductInput, ValidationError } from '../../lib/validate';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    'SELECT * FROM products ORDER BY sort_order ASC, created_at ASC',
  ).all<ProductRow>();
  return json(results.map(rowToProduct));
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let input;
  try {
    input = parseProductInput(await request.json().catch(() => null));
  } catch (e) {
    if (e instanceof ValidationError) return json({ error: e.message }, { status: 400 });
    throw e;
  }
  await env.DB.prepare(
    `INSERT INTO products (id, name, category, condition, condition_note, cash_price_uzs, image_url, sort_order, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`,
  )
    .bind(
      input.id,
      input.name,
      input.category,
      input.condition,
      input.conditionNote,
      input.cashPriceUzs,
      input.imageUrl,
      input.sortOrder,
      input.isActive ? 1 : 0,
    )
    .run();
  const row = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(input.id).first<ProductRow>();
  return json(row ? rowToProduct(row) : { error: 'insert_failed' }, { status: row ? 201 : 500 });
};
```

- [ ] **Step 2: Update + Delete'ni yozish**

Create `functions/api/admin/products/[id].ts`:
```ts
import type { Env } from '../../../env';
import { json, rowToProduct, type ProductRow } from '../../../lib/db';
import { parseProductInput, ValidationError } from '../../../lib/validate';

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = String(params.id);
  let input;
  try {
    input = parseProductInput({ ...(await request.json().catch(() => null)), id });
  } catch (e) {
    if (e instanceof ValidationError) return json({ error: e.message }, { status: 400 });
    throw e;
  }
  await env.DB.prepare(
    `UPDATE products SET name=?, category=?, condition=?, condition_note=?, cash_price_uzs=?, image_url=?, sort_order=?, is_active=? WHERE id=?`,
  )
    .bind(
      input.name,
      input.category,
      input.condition,
      input.conditionNote,
      input.cashPriceUzs,
      input.imageUrl,
      input.sortOrder,
      input.isActive ? 1 : 0,
      id,
    )
    .run();
  const row = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<ProductRow>();
  if (!row) return json({ error: 'not_found' }, { status: 404 });
  return json(rowToProduct(row));
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  const id = String(params.id);
  await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
  return json({ ok: true });
};
```

- [ ] **Step 3: Lokal tekshiruv**

`bunx wrangler pages dev --local` ishlab turganda (Task 3 cookie.txt bilan):
```bash
curl -s -b cookie.txt -X POST http://localhost:8788/api/admin/products -H 'content-type: application/json' \
  -d '{"name":"Test iPhone","category":"iphone","condition":"yangi","cashPriceUzs":10000000,"sortOrder":5}'
curl -s -b cookie.txt http://localhost:8788/api/admin/products | grep -c '"id"'
```
Expected: birinchi 201 va yangi mahsulot JSON; ikkinchi — mahsulotlar soni (11+). Cookie'siz `POST` → `401`.

- [ ] **Step 4: Lint va commit**

```bash
bun run lint
git add functions/api/admin/products.ts "functions/api/admin/products/[id].ts"
git commit -m "feat: admin product crud api"
```

---

### Task 5: Sozlamalar API + rasm yuklash (R2) + rasm berish

**Files:**
- Create: `functions/api/admin/settings.ts`, `functions/api/admin/upload.ts`, `functions/images/[[path]].ts`

**Interfaces:**
- Consumes: `Env`, `json` (`functions/lib/db`), `parseSettingsInput`, `ValidationError` (`functions/lib/validate`).
- Produces:
  - `PUT /api/admin/settings` → `ApiSettings`.
  - `POST /api/admin/upload` (multipart, `file` maydoni) → `{ imageUrl }`.
  - `GET /images/*` → R2'dan rasm.

- [ ] **Step 1: Settings PUT'ni yozish**

Create `functions/api/admin/settings.ts`:
```ts
import type { Env } from '../../env';
import { json } from '../../lib/db';
import { parseSettingsInput, ValidationError } from '../../lib/validate';

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  let input;
  try {
    input = parseSettingsInput(await request.json().catch(() => null));
  } catch (e) {
    if (e instanceof ValidationError) return json({ error: e.message }, { status: 400 });
    throw e;
  }
  await env.DB.prepare(
    'UPDATE settings SET down_payment_percent=?, usd_to_uzs=?, terms=? WHERE id=1',
  )
    .bind(input.downPaymentPercent, input.usdToUzs, JSON.stringify(input.terms))
    .run();
  return json(input);
};
```

- [ ] **Step 2: Upload'ni yozish**

Create `functions/api/admin/upload.ts`:
```ts
import type { Env } from '../../env';
import { json } from '../../lib/db';

const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return json({ error: 'file_required' }, { status: 400 });
  const ext = ALLOWED[file.type];
  if (!ext) return json({ error: 'unsupported_type' }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return json({ error: 'file_too_large' }, { status: 400 });

  const key = `products/${crypto.randomUUID()}.${ext}`;
  await env.IMAGES.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });
  return json({ imageUrl: `/images/${key}` }, { status: 201 });
};
```

- [ ] **Step 3: Rasm berish route'ini yozish**

Create `functions/images/[[path]].ts`:
```ts
import type { Env } from '../env';

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const parts = params.path;
  const key = Array.isArray(parts) ? parts.join('/') : String(parts);
  const object = await env.IMAGES.get(key);
  if (!object) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(object.body, { headers });
};
```

- [ ] **Step 4: Lokal tekshiruv**

`bunx wrangler pages dev --local` va Task 3 cookie bilan:
```bash
curl -s -b cookie.txt -X PUT http://localhost:8788/api/admin/settings -H 'content-type: application/json' \
  -d '{"downPaymentPercent":25,"usdToUzs":12700,"terms":[{"months":3,"markup":0.1},{"months":12,"markup":0.45}]}'
curl -s http://localhost:8788/api/settings
```
Expected: PUT `{"downPaymentPercent":25,...}`; ommaviy `settings` yangilangan qiymatni qaytaradi.

- [ ] **Step 5: Lint va commit**

```bash
bun run lint
git add functions/api/admin/settings.ts functions/api/admin/upload.ts "functions/images/[[path]].ts"
git commit -m "feat: admin settings, image upload (r2) and image serving"
```

---

### Task 6: SPA routing va admin ilova almashuvi

**Files:**
- Create: `public/_redirects`
- Modify: `src/main.tsx`
- Create: `src/admin/api.ts`

**Interfaces:**
- Consumes: yo'q.
- Produces:
  - `/admin` yo'li `AdminApp`ni render qiladi.
  - `src/admin/api.ts`: `adminGet<T>(path)`, `adminSend<T>(method, path, body)`, `adminUpload(file): Promise<{ imageUrl: string }>`, `login(u,p)`, `logout()`, `getMe()`.

- [ ] **Step 1: SPA fallback qo'shish**

Create `public/_redirects`:
```
/* /index.html 200
```
> Functions (`/api/*`, `/images/*`) bu qoidadan oldin ishlaydi, shuning uchun ular ta'sirlanmaydi.

- [ ] **Step 2: Admin API yordamchisini yozish**

Create `src/admin/api.ts`:
```ts
import type { ApiProduct, ApiSettings } from '../../shared/types';

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `http_${res.status}`);
  }
  return (await res.json()) as T;
}

export async function login(username: string, password: string): Promise<void> {
  await handle(
    await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }),
  );
}

export async function logout(): Promise<void> {
  await fetch('/api/admin/logout', { method: 'POST' });
}

export async function getMe(): Promise<{ username: string }> {
  return handle(await fetch('/api/admin/me'));
}

export async function listProducts(): Promise<ApiProduct[]> {
  return handle(await fetch('/api/admin/products'));
}

export async function createProduct(p: Partial<ApiProduct>): Promise<ApiProduct> {
  return handle(
    await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(p),
    }),
  );
}

export async function updateProduct(id: string, p: Partial<ApiProduct>): Promise<ApiProduct> {
  return handle(
    await fetch(`/api/admin/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(p),
    }),
  );
}

export async function deleteProduct(id: string): Promise<void> {
  await handle(await fetch(`/api/admin/products/${encodeURIComponent(id)}`, { method: 'DELETE' }));
}

export async function getSettings(): Promise<ApiSettings> {
  return handle(await fetch('/api/settings'));
}

export async function updateSettings(s: ApiSettings): Promise<ApiSettings> {
  return handle(
    await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(s),
    }),
  );
}

export async function uploadImage(file: File): Promise<{ imageUrl: string }> {
  const fd = new FormData();
  fd.append('file', file);
  return handle(await fetch('/api/admin/upload', { method: 'POST', body: fd }));
}
```

- [ ] **Step 3: `main.tsx`da yo'lni tekshirish**

`src/main.tsx`ni quyidagiga almashtiring:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import AdminApp from './admin/AdminApp.tsx';
import './index.css';

const isAdmin = window.location.pathname.startsWith('/admin');

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isAdmin ? <AdminApp /> : <App />}</StrictMode>,
);
```

- [ ] **Step 4: Vaqtinchalik AdminApp zaglushkasi (build o'tishi uchun)**

Create `src/admin/AdminApp.tsx` (Task 7'da to'ldiriladi):
```tsx
export default function AdminApp() {
  return <div className="p-8">Admin panel yuklanmoqda…</div>;
}
```

- [ ] **Step 5: Lint va build**

```bash
bun run lint && bun run build
```
Expected: xatosiz.

- [ ] **Step 6: Commit**

```bash
git add public/_redirects src/main.tsx src/admin/api.ts src/admin/AdminApp.tsx
git commit -m "feat: spa routing and admin api client"
```

---

### Task 7: Admin UI — login va qobiq (AdminApp)

**Files:**
- Modify: `src/admin/AdminApp.tsx`
- Create: `src/admin/Login.tsx`

**Interfaces:**
- Consumes: `src/admin/api.ts`.
- Produces: sessiya bo'lsa dashboard (Products/Settings tablar), bo'lmasa Login. `ProductList`/`SettingsForm` Task 8–9'da yaratiladi.

- [ ] **Step 1: Login komponentini yozish**

Create `src/admin/Login.tsx`:
```tsx
import { useState } from 'react';
import { login } from './api';

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(username, password);
      onSuccess();
    } catch {
      setError("Login yoki parol noto'g'ri");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] px-4">
      <form onSubmit={submit} className="bg-white rounded-[24px] p-8 w-full max-w-sm shadow-[--shadow-apple]">
        <h1 className="text-[24px] font-semibold mb-6 text-center">Admin panel</h1>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Foydalanuvchi"
          className="w-full border border-[#D2D2D7] rounded-2xl px-4 py-3 mb-3 focus:outline-none focus:border-[#0071E3]"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Parol"
          className="w-full border border-[#D2D2D7] rounded-2xl px-4 py-3 mb-4 focus:outline-none focus:border-[#0071E3]"
        />
        {error && <p className="text-[13px] text-[#E30000] mb-3">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full py-3 bg-[#0071E3] text-white font-semibold rounded-full hover:bg-[#0077ED] disabled:opacity-60"
        >
          {busy ? 'Kirilmoqda…' : 'Kirish'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: AdminApp qobig'ini yozish**

`src/admin/AdminApp.tsx`ni to'liq almashtiring:
```tsx
import { useEffect, useState } from 'react';
import { getMe, logout } from './api';
import Login from './Login';
import ProductList from './ProductList';
import SettingsForm from './SettingsForm';

type Tab = 'products' | 'settings';

export default function AdminApp() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('products');

  useEffect(() => {
    getMe()
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false));
  }, []);

  if (authed === null) return <div className="p-8 text-[#6E6E73]">Yuklanmoqda…</div>;
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <header className="bg-white border-b border-[#E5E5EA] px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('products')}
            className={`px-4 py-2 rounded-full text-[14px] font-semibold ${
              tab === 'products' ? 'bg-[#0071E3] text-white' : 'text-[#1D1D1F]'
            }`}
          >
            Mahsulotlar
          </button>
          <button
            onClick={() => setTab('settings')}
            className={`px-4 py-2 rounded-full text-[14px] font-semibold ${
              tab === 'settings' ? 'bg-[#0071E3] text-white' : 'text-[#1D1D1F]'
            }`}
          >
            Sozlamalar
          </button>
        </div>
        <button
          onClick={async () => {
            await logout();
            setAuthed(false);
          }}
          className="text-[14px] text-[#6E6E73] hover:text-[#1D1D1F]"
        >
          Chiqish
        </button>
      </header>
      <main className="max-w-[900px] mx-auto px-4 md:px-8 py-8">
        {tab === 'products' ? <ProductList /> : <SettingsForm />}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Commit (build Task 8–9'dan keyin toza bo'ladi)**

```bash
git add src/admin/AdminApp.tsx src/admin/Login.tsx
git commit -m "feat: admin login and dashboard shell"
```
> `ProductList`/`SettingsForm` hali yo'q — build Task 9 oxirida toza bo'ladi. Subagent-driven ijroda Task 7–9 ni ketma-ket bajaring.

---

### Task 8: Admin UI — mahsulotlar ro'yxati va formasi

**Files:**
- Create: `src/admin/ProductList.tsx`, `src/admin/ProductForm.tsx`

**Interfaces:**
- Consumes: `src/admin/api.ts`, `ApiProduct` (`shared/types`).
- Produces: mahsulotlar ro'yxati (tahrir/o'chir/yashir), qo'shish/tahrir formasi (rasm yuklash bilan).

- [ ] **Step 1: ProductForm'ni yozish**

Create `src/admin/ProductForm.tsx`:
```tsx
import { useState } from 'react';
import type { ApiProduct, Category, Condition } from '../../shared/types';
import { createProduct, updateProduct, uploadImage } from './api';

const CATEGORIES: Category[] = ['iphone', 'mac', 'ipad', 'pc'];
const CONDITIONS: Condition[] = ['yangi', 'ishlatilgan'];

const empty: Partial<ApiProduct> = {
  name: '',
  category: 'iphone',
  condition: 'yangi',
  conditionNote: null,
  cashPriceUzs: 0,
  imageUrl: '',
  sortOrder: 0,
  isActive: true,
};

export default function ProductForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial: ApiProduct | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<ApiProduct>>(initial ?? empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof ApiProduct>(key: K, value: ApiProduct[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const { imageUrl } = await uploadImage(file);
      set('imageUrl', imageUrl);
    } catch {
      setError("Rasm yuklanmadi");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setError('');
    try {
      if (initial) await updateProduct(initial.id, form);
      else await createProduct(form);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'xatolik');
    } finally {
      setBusy(false);
    }
  }

  const input = 'w-full border border-[#D2D2D7] rounded-xl px-3 py-2 focus:outline-none focus:border-[#0071E3]';

  return (
    <div className="bg-white rounded-[20px] p-6 mb-6 shadow-[--shadow-apple]">
      <h3 className="font-semibold mb-4">{initial ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-[13px] text-[#6E6E73]">
          Nomi
          <input className={input} value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} />
        </label>
        <label className="text-[13px] text-[#6E6E73]">
          Naqd narx (so'm)
          <input
            type="number"
            className={input}
            value={form.cashPriceUzs ?? 0}
            onChange={(e) => set('cashPriceUzs', Number(e.target.value))}
          />
        </label>
        <label className="text-[13px] text-[#6E6E73]">
          Kategoriya
          <select className={input} value={form.category} onChange={(e) => set('category', e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="text-[13px] text-[#6E6E73]">
          Holati
          <select className={input} value={form.condition} onChange={(e) => set('condition', e.target.value as Condition)}>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="text-[13px] text-[#6E6E73]">
          Holat izohi (ixtiyoriy)
          <input
            className={input}
            value={form.conditionNote ?? ''}
            onChange={(e) => set('conditionNote', e.target.value === '' ? null : e.target.value)}
          />
        </label>
        <label className="text-[13px] text-[#6E6E73]">
          Tartib raqami
          <input
            type="number"
            className={input}
            value={form.sortOrder ?? 0}
            onChange={(e) => set('sortOrder', Number(e.target.value))}
          />
        </label>
      </div>

      <div className="mt-4 flex items-center gap-4">
        {form.imageUrl ? (
          <img src={form.imageUrl} alt="" className="w-16 h-16 object-contain rounded-lg bg-[#F5F5F7]" />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-[#F5F5F7] flex items-center justify-center text-[11px] text-[#C7C7CC]">rasm</div>
        )}
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onFile} />
      </div>

      <label className="mt-4 flex items-center gap-2 text-[14px]">
        <input type="checkbox" checked={form.isActive ?? true} onChange={(e) => set('isActive', e.target.checked)} />
        Saytda ko'rsatilsin
      </label>

      {error && <p className="text-[13px] text-[#E30000] mt-3">{error}</p>}

      <div className="flex gap-3 mt-5">
        <button
          onClick={save}
          disabled={busy}
          className="px-6 py-2.5 bg-[#0071E3] text-white font-semibold rounded-full disabled:opacity-60"
        >
          {busy ? 'Saqlanmoqda…' : 'Saqlash'}
        </button>
        <button onClick={onCancel} className="px-6 py-2.5 text-[#6E6E73] font-semibold rounded-full">
          Bekor qilish
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: ProductList'ni yozish**

Create `src/admin/ProductList.tsx`:
```tsx
import { useEffect, useState } from 'react';
import type { ApiProduct } from '../../shared/types';
import { deleteProduct, listProducts, updateProduct } from './api';
import ProductForm from './ProductForm';

export default function ProductList() {
  const [items, setItems] = useState<ApiProduct[]>([]);
  const [editing, setEditing] = useState<ApiProduct | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    setItems(await listProducts());
    setLoading(false);
    setEditing(null);
    setCreating(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function toggle(p: ApiProduct) {
    await updateProduct(p.id, { ...p, isActive: !p.isActive });
    refresh();
  }

  async function remove(p: ApiProduct) {
    if (!window.confirm(`"${p.name}" o'chirilsinmi?`)) return;
    await deleteProduct(p.id);
    refresh();
  }

  if (loading) return <p className="text-[#6E6E73]">Yuklanmoqda…</p>;

  return (
    <div>
      {creating && <ProductForm initial={null} onSaved={refresh} onCancel={() => setCreating(false)} />}
      {editing && <ProductForm initial={editing} onSaved={refresh} onCancel={() => setEditing(null)} />}

      {!creating && !editing && (
        <button
          onClick={() => setCreating(true)}
          className="mb-4 px-5 py-2.5 bg-[#1D1D1F] text-white font-semibold rounded-full"
        >
          + Yangi mahsulot
        </button>
      )}

      <div className="space-y-2">
        {items.map((p) => (
          <div
            key={p.id}
            className={`bg-white rounded-2xl p-3 flex items-center gap-3 shadow-[--shadow-apple] ${
              p.isActive ? '' : 'opacity-50'
            }`}
          >
            {p.imageUrl ? (
              <img src={p.imageUrl} alt="" className="w-12 h-12 object-contain rounded-lg bg-[#F5F5F7]" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-[#F5F5F7]" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{p.name}</div>
              <div className="text-[13px] text-[#6E6E73]">
                {p.condition} · {p.cashPriceUzs.toLocaleString('ru-RU').replace(/,/g, ' ')} so'm
              </div>
            </div>
            <button onClick={() => setEditing(p)} className="text-[13px] text-[#0071E3] font-semibold px-2">
              Tahrir
            </button>
            <button onClick={() => toggle(p)} className="text-[13px] text-[#6E6E73] px-2">
              {p.isActive ? 'Yashir' : "Ko'rsat"}
            </button>
            <button onClick={() => remove(p)} className="text-[13px] text-[#E30000] px-2">
              O'chir
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/admin/ProductList.tsx src/admin/ProductForm.tsx
git commit -m "feat: admin product list and form with image upload"
```

---

### Task 9: Admin UI — sozlamalar formasi (jonli oldindan ko'rish)

**Files:**
- Create: `src/admin/SettingsForm.tsx`

**Interfaces:**
- Consumes: `src/admin/api.ts`, `ApiSettings`/`Term` (`shared/types`), `calcInstallment`-ga o'xshash lokal hisob (oldindan ko'rish uchun).
- Produces: boshlang'ich foizi/kurs/muddatlarni tahrirlash + misol narxda oylik to'lov oldindan ko'rish.

- [ ] **Step 1: SettingsForm'ni yozish**

Create `src/admin/SettingsForm.tsx`:
```tsx
import { useEffect, useState } from 'react';
import type { ApiSettings, Term } from '../../shared/types';
import { getSettings, updateSettings } from './api';

const SAMPLE = 10_000_000;

function monthly(price: number, downPct: number, term: Term): number {
  const total = price * (1 + term.markup);
  const down = price * (downPct / 100);
  return Math.max(0, (total - down) / term.months);
}

function fmt(v: number): string {
  return `${Math.round(v).toLocaleString('ru-RU').replace(/,/g, ' ')} so'm`;
}

export default function SettingsForm() {
  const [s, setS] = useState<ApiSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then(setS);
  }, []);

  if (!s) return <p className="text-[#6E6E73]">Yuklanmoqda…</p>;

  function setTerm(i: number, key: keyof Term, value: number) {
    setS((prev) =>
      prev ? { ...prev, terms: prev.terms.map((t, j) => (j === i ? { ...t, [key]: value } : t)) } : prev,
    );
  }

  function addTerm() {
    setS((prev) => (prev ? { ...prev, terms: [...prev.terms, { months: 1, markup: 0 }] } : prev));
  }

  function removeTerm(i: number) {
    setS((prev) => (prev ? { ...prev, terms: prev.terms.filter((_, j) => j !== i) } : prev));
  }

  async function save() {
    if (!s) return;
    setBusy(true);
    setSaved(false);
    try {
      await updateSettings(s);
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  const input = 'w-24 border border-[#D2D2D7] rounded-xl px-3 py-2 focus:outline-none focus:border-[#0071E3]';

  return (
    <div className="bg-white rounded-[20px] p-6 shadow-[--shadow-apple] max-w-lg">
      <h3 className="font-semibold mb-4">Kalkulyator sozlamalari</h3>

      <label className="flex items-center justify-between mb-3 text-[14px]">
        Boshlang'ich to'lov foizi (%)
        <input
          type="number"
          className={input}
          value={s.downPaymentPercent}
          onChange={(e) => setS({ ...s, downPaymentPercent: Number(e.target.value) })}
        />
      </label>

      <label className="flex items-center justify-between mb-5 text-[14px]">
        USD kursi (so'm)
        <input
          type="number"
          className={input}
          value={s.usdToUzs}
          onChange={(e) => setS({ ...s, usdToUzs: Number(e.target.value) })}
        />
      </label>

      <div className="text-[13px] font-semibold text-[#6E6E73] mb-2">Muddatlar va ustama</div>
      <div className="space-y-2 mb-4">
        {s.terms.map((t, i) => (
          <div key={i} className="flex items-center gap-2 text-[14px]">
            <input
              type="number"
              className={input}
              value={t.months}
              onChange={(e) => setTerm(i, 'months', Number(e.target.value))}
            />
            <span>oy · ustama</span>
            <input
              type="number"
              step="0.01"
              className={input}
              value={t.markup}
              onChange={(e) => setTerm(i, 'markup', Number(e.target.value))}
            />
            <span className="text-[#6E6E73]">({fmt(monthly(SAMPLE, s.downPaymentPercent, t))}/oy)</span>
            <button onClick={() => removeTerm(i)} className="text-[#E30000] ml-auto">×</button>
          </div>
        ))}
      </div>
      <button onClick={addTerm} className="text-[13px] text-[#0071E3] font-semibold mb-5">
        + muddat qo'shish
      </button>

      <p className="text-[12px] text-[#6E6E73] mb-4">
        Oldindan ko'rish: {fmt(SAMPLE)} narxli mahsulot uchun oylik to'lov.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={busy}
          className="px-6 py-2.5 bg-[#0071E3] text-white font-semibold rounded-full disabled:opacity-60"
        >
          {busy ? 'Saqlanmoqda…' : 'Saqlash'}
        </button>
        {saved && <span className="text-[13px] text-[#1B7A34]">Saqlandi ✓</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lint va build**

Run:
```bash
bun run lint && bun run build
```
Expected: xatosiz (barcha admin komponentlari mavjud).

- [ ] **Step 3: Lokal to'liq oqim tekshiruvi**

Run:
```bash
bun run build && bunx wrangler pages dev --local
```
Brauzerda `http://localhost:8788/admin`ni oching. Expected: login sahifasi → kirish → mahsulot qo'shish/tahrir/o'chir, rasm yuklash, sozlamalarni saqlash. Ommaviy sayt (`/`) yangilangan ma'lumotni ko'rsatadi.

- [ ] **Step 4: Commit**

```bash
git add src/admin/SettingsForm.tsx
git commit -m "feat: admin settings form with live preview"
```

---

### Task 10: Ishlab chiqarish secretlari va deploy

**Files:** yo'q (infratuzilma).

**Interfaces:**
- Consumes: barcha admin API'lar.
- Produces: jonli, himoyalangan admin panel.

- [ ] **Step 1: Ishlab chiqarish secretlarini o'rnatish**

Parol hashini oling (masalan `MyStrongPass!`):
```bash
node -e "crypto.subtle.digest('SHA-256', new TextEncoder().encode('MyStrongPass!')).then(b=>console.log(Buffer.from(b).toString('hex')))"
```
Keyin secretlarni o'rnating (har biri qiymatni so'raydi):
```bash
bunx wrangler pages secret put ADMIN_USERNAME --project-name taqsit-store
bunx wrangler pages secret put ADMIN_PASSWORD_HASH --project-name taqsit-store
bunx wrangler pages secret put SESSION_SECRET --project-name taqsit-store
```
> `SESSION_SECRET` — uzun tasodifiy satr (masalan `openssl rand -hex 32`).

- [ ] **Step 2: Deploy**

Run:
```bash
bun run build
bunx wrangler pages deploy dist --project-name taqsit-store
```
Expected: deploy tugaydi.

- [ ] **Step 3: Jonli admin tekshiruvi**

Brauzerda `https://<URL>/admin`ni oching. Expected: login → panel ishlaydi; noto'g'ri parol rad etiladi; cookie'siz `/api/admin/products` → 401.

- [ ] **Step 4: Commit (agar o'zgarish bo'lsa)**

```bash
git add -A
git commit -m "chore: production admin secrets and deploy"
```

---

## Self-Review

**Spec coverage (PRD §6):** Login+parol (Task 3), mahsulot CRUD (Task 4), rasm yuklash R2 (Task 5), sozlamalar boshqaruvi + jonli oldindan ko'rish (Task 9), himoyalangan API (Task 3 middleware). Barcha PRD §6 endpointlari qamrangan. R2 rasm berish (Task 5) — `image_url` PRD §3 bilan mos.

**Placeholder scan:** Haqiqiy sirlar (parol hash, SESSION_SECRET) atayin repoda emas — foydalanuvchi buyruq orqali o'rnatadi (Global Constraint bilan mos). Kod placeholderlari yo'q.

**Type consistency:** `ApiProduct`/`ApiSettings`/`Term` (`shared/types`) frontend `api.ts`, backend handlerlar va `validate.ts` bo'ylab bir xil. `createSession`/`verifySession` imzolari test, `auth.ts` va middleware'da mos. `sessionCookie`/`clearedSessionCookie` nomlari login/logout'da mos.

**Bog'liqlik eslatmasi:** Task 6–9 orasida build oraliq holatda xato berishi mumkin (komponentlar bosqichma-bosqich qo'shiladi); har bir task oxirida commit bor, lekin **deploy faqat Task 10'da**. Subagent-driven ijroda 6→7→8→9→10 ketma-ketligini saqlang.

**Integratsiya eslatmasi:** Admin `/api/settings` (ommaviy o'qish) dan o'qiydi, lekin `PUT /api/admin/settings` (himoyalangan) ga yozadi — bu atayin (o'qish ochiq, yozish himoyalangan).
