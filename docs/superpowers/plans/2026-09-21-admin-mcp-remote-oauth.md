# Admin MCP — remote `/mcp` va OAuth (3–4-bosqich) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Do'kon egasi claude.ai'da «Add → Custom connector → `https://productstore.uz/mcp`» qilib, admin paroli bilan kirib, oddiy chatda katalogni boshqara olsin — Claude Code o'rnatmasdan.

**Architecture:** Bugungi MCP faqat stdio (`mcp/stdio.ts`). Uni remote qilish uchun tool'lar Docker image'ga tushadigan joyga (`shared/`) ko'chiriladi, `server/mcp.ts` esa Express ichida **stateless** Streamable HTTP transport bilan har so'rovda yangi `McpServer` yig'adi. Tool'lar avvalgidek o'z saytining `/api/admin/*` endpoint'larini so'rovchi tokeni bilan chaqiradi — SQL va validatsiya joyidan qimirlamaydi. OAuth uchun **qo'lda endpoint yozilmaydi**: `@modelcontextprotocol/sdk` ichidagi `mcpAuthRouter` metadata/register/authorize/token/revoke'ni va PKCE tekshiruvini o'zi bajaradi; bizdan faqat `OAuthServerProvider` (6 metod) + klient do'koni (2 metod) SQLite ustida va rozilik sahifasi talab qilinadi.

**Tech Stack:** Node 22.18+ (type stripping), Express 5, `@modelcontextprotocol/sdk@1.30.0` (allaqachon `dependencies`da, transitiv `express-rate-limit`/`hono`/`pkce-challenge` ham o'rnatilgan — **yangi dependency qo'shilmaydi**), SQLite (`env.DB`), vitest.

**Spec:** `docs/superpowers/specs/2026-09-21-admin-mcp-design.md` (§3 transportlar, §5 OAuth, §9 xavfsizlik, §11 bosqichlar 3–4, §14.4 va §14.9)

## Global Constraints

- **Docker runtime image faqat `build/`, `server/`, `shared/`, `migrations/` ni nusxalaydi** (`Dockerfile`). `mcp/` va `src/` image'da **yo'q** — remote yo'lda ishlaydigan har bir fayl shu to'rt papkadan birida bo'lishi shart.
- **Node type-stripping:** `server/`dan import qilinadigan `server/`/`shared/`/`src/` fayllari `.ts` kengaytmali import yoziladi (`./client.ts`), parametr-xususiyat (`constructor(private x)`) **ishlatilmaydi** — ikkalasi ham dev serverni boot'da yiqitadi. Faqat `import type` uchun kengaytmasiz yo'l qoldirilgan joylar bor (`../shared/runtime`) — ularga tegilmaydi.
- **Testlar faqat `src/**`, `functions/**`, `app/**`, `shared/**` dan yig'iladi** (`vitest.config.ts`). `server/` dagi fayl testlanmaydi — shuning uchun **har qanday sof mantiq `shared/` ga yoziladi**, `server/` da faqat SQLite/Express yopishtiruvchi kod qoladi.
- Strict TypeScript, **`any` yo'q**. `bun run lint` va `bun run test` har task oxirida yashil bo'lishi shart. `bun run lint` da `build/server/index.js` topilmadi degan xato **ishlab turgan nuqson emas** — bu worktree'da production build yo'q; boshqa xato bo'lmasligi kerak.
- **Qo'llanilgan migratsiya tahrirlanmaydi** — yangisi qo'shiladi. Bu rejada faqat `0040`.
- Sirlar env'da emas, bazada. `PUBLIC_URL` — sir emas, oddiy sozlama.
- Matnlar, izohlar va xato xabarlari **o'zbekcha** (admin/MCP tomoni), bugungi fayllardagi uslubda.
- Commit formati: `feat:`, `fix:`, `chore:`, `docs:`. Har commit oxirida:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`
- **Push qilinmaydi.** Task commit'lari lokal qoladi; branch'ni yuborish alohida so'raladi.
- Token ko'rinishi **doim `prod_` + 64 hex** (`newToken()`), chunki `tokenFromHeader` shu prefiksni talab qiladi va `requireAdmin` shu yo'l bilan ishlaydi. OAuth bergan access token ham shu ko'rinishda bo'ladi.

---

## Fayl xaritasi

**Ko'chadi (mazmuni o'zgarmaydi, faqat joyi):**

| Bugun | Bo'ladi | Nega |
|---|---|---|
| `src/admin/errText.ts` | `shared/err-text.ts` (+ `src/admin/errText.ts` re-export bo'lib qoladi) | `src/` image'da yo'q, klient unga bog'langan |
| `mcp/client.ts` | `shared/mcp-client.ts` | remote transport ham shu klientni ishlatadi |
| `mcp/tools.ts` dagi 10 ta tool | `shared/mcp-register.ts` | image'da bo'lishi kerak; `node:fs` ga bog'liq emas |

**Qoladi:** `mcp/tools.ts` — faqat `image_upload_from_path` (fayl tizimi kerak, faqat stdio) va `shared/mcp-register.ts` ni chaqirish. `mcp/stdio.ts` — importlari yangilanadi.

**Yangi:**

| Fayl | Mas'uliyat |
|---|---|
| `shared/mcp-image.ts` (+test) | `isSafeImageUrl` — https majburiy, ichki manzillar rad etiladi (SSRF) |
| `server/mcp-auth.ts` | `createTokenVerifier(env)` — `admin_tokens` ustidagi `OAuthTokenVerifier` |
| `server/mcp.ts` | `mountMcp(app, env)` — `/mcp` stateless transport + bearer + rate limit |
| `migrations/0040_oauth.sql` | `oauth_clients`, `oauth_codes` |
| `shared/oauth.ts` (+test) | sof qism: `redirectUriAllowed`, `buildRedirect`, `parseConsentForm`, TTL doimiylari |
| `server/oauth-provider.ts` | `OAuthServerProvider` + klient do'koni SQLite ustida |
| `server/oauth-consent.ts` | rozilik/kirish HTML sahifasi va `POST /oauth/consent` |

**O'zgaradi:** `server/index.ts` (mount + NO_CACHE), `app/routes/api.admin.guard.ts` (refresh token rad etiladi), `package.json` (lint qatori), `.env.example`, `mcp/README.md`, `CLAUDE.md`.

---

## Task 1: Tool'larni Docker image'ga tushadigan joyga ko'chirish

Bu **sof ko'chirish** — hech qanday xulq o'zgarmaydi. Maqsad: `server/mcp.ts` keyingi tasklarda shu fayllarni import qila olsin.

**Files:**
- Create: `shared/err-text.ts` (mazmuni `src/admin/errText.ts` dan)
- Create: `shared/mcp-client.ts` (mazmuni `mcp/client.ts` dan)
- Create: `shared/mcp-register.ts` (mazmuni `mcp/tools.ts` dan, `image_upload_from_path` siz)
- Modify: `src/admin/errText.ts` (re-export bo'ladi)
- Modify: `mcp/tools.ts` (faqat fayl tool'i qoladi)
- Modify: `mcp/stdio.ts` (importlar)
- Delete: `mcp/client.ts`

**Interfaces:**
- Consumes: bugungi `shared/mcp-tools.ts` (`catalogStats`, `incompleteProducts`, `manualFieldsFor`, `detailToInput`, `imageFilesOf`, `ProductPatch`), `shared/types.ts`, `shared/legacy-category.ts`.
- Produces:
  - `shared/err-text.ts`: `export function errText(e: unknown): string`
  - `shared/mcp-client.ts`: `export class AdminClient` — `constructor(base: string, token: string)`, `get<T>(path: string): Promise<T>`, `write<T>(path, method: 'POST'|'PUT'|'PATCH', body: unknown, tool: string): Promise<T>`, `upload(bytes: Uint8Array, filename: string, type: string, tool: string): Promise<string>`
  - `shared/mcp-register.ts`: `export interface McpToolHost { registerTool(name: string, cfg: { description: string; inputSchema: Record<string, z.ZodTypeAny> }, run: (args: unknown) => Promise<{ content: { type: 'text'; text: string }[] }>): void }` va `export function registerSharedTools(server: McpToolHost, api: AdminClient, opts: { adminUrl: string }): void`; qulaylik uchun `export const text = (s: string) => ({ content: [{ type: 'text' as const, text: s }] })`
  - `mcp/tools.ts`: `export function registerTools(server: McpToolHost, api: AdminClient, opts: { allowFiles: boolean; adminUrl: string }): void`

- [ ] **Step 1: `errText` ni `shared/` ga ko'chirish**

```bash
git mv src/admin/errText.ts shared/err-text.ts
```

So'ng `src/admin/errText.ts` ni qayta yarating (admin ekranlari 26 ta joyda `../errText` / `./errText` dan import qiladi — yo'lni o'zgartirmaslik uchun re-export):

```ts
// src/admin/errText.ts
/**
 * Server xato kodlarini o'zbekcha matnga o'giradi.
 *
 * Ro'yxatning o'zi `shared/err-text.ts` da: MCP klienti (`shared/mcp-client.ts`) ham
 * shu matnlarni ishlatadi, `src/` esa Docker runtime image'iga ko'chirilmaydi.
 */
export { errText } from '../../shared/err-text';
```

- [ ] **Step 2: Lint — ko'chirish hech narsani buzmaganini tekshirish**

Run: `bun run lint`
Expected: faqat `server/index.ts(72,31): error TS2307: Cannot find module '../build/server/index.js'` (oldindan bor). Boshqa xato bo'lsa — import yo'llarini to'g'rilang.

- [ ] **Step 3: `AdminClient` ni `shared/` ga ko'chirish**

```bash
git mv mcp/client.ts shared/mcp-client.ts
```

`shared/mcp-client.ts` ichidagi yagona import qatorini almashtiring:

```ts
import { errText } from './err-text.ts';
```

Qolgan mazmun **o'zgarmaydi** (jumladan parametr-xususiyatsiz konstruktor izohi — u `server/` dan import qilinganda ham amal qiladi).

- [ ] **Step 4: Umumiy tool'larni `shared/mcp-register.ts` ga ko'chirish**

`shared/mcp-register.ts` yarating. `mcp/tools.ts` dan **`pathsToFiles`, `node:fs/promises`, `node:path`, `MIME` va `image_upload_from_path` blokidan tashqari hammasini** ko'chiring. Fayl boshi:

```ts
import { z } from 'zod';
import type { ApiAdminBrand, ApiCategory, ApiProduct, ApiProductDetail, ApiProductType } from './types.ts';
import { deriveLegacyCategory } from './legacy-category.ts';
import { catalogStats, incompleteProducts, manualFieldsFor, detailToInput, type ProductPatch } from './mcp-tools.ts';
import type { AdminClient } from './mcp-client.ts';

/**
 * Ikkala transportda bir xil ishlaydigan tool'lar. Fayl tizimiga bog'liq yagona tool
 * (`image_upload_from_path`) bu yerda **yo'q** — u `mcp/tools.ts` da, faqat stdio uchun.
 * Bu fayl `shared/` da turadi, chunki remote transport (`server/mcp.ts`) Docker image'da
 * ishlaydi va u yerda `mcp/` papkasi yo'q.
 */
export interface McpToolHost {
  registerTool: (
    name: string,
    cfg: { description: string; inputSchema: Record<string, z.ZodTypeAny> },
    run: (args: unknown) => Promise<{ content: { type: 'text'; text: string }[] }>
  ) => void;
}

export const text = (s: string) => ({ content: [{ type: 'text' as const, text: s }] });

export const MAX_IMAGE = 5 * 1024 * 1024;

export function registerSharedTools(server: McpToolHost, api: AdminClient, opts: { adminUrl: string }): void {
  // …bugungi mcp/tools.ts dagi 10 ta registerTool bloki o'zgarishsiz ko'chiriladi…
}
```

`image_upload_from_url` bloki ichidagi `basename(new URL(u).pathname)` chaqiruvi `node:path` ga bog'liq edi — uni kengaytmasiz almashtiring:

```ts
const name = new URL(u).pathname.split('/').pop() || 'image';
out.push(await api.upload(bytes, name, type, 'image_upload_from_url'));
```

- [ ] **Step 5: `mcp/tools.ts` ni qisqartirish**

Faylni butunlay shunga almashtiring:

```ts
import { readFile, readdir, stat } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { z } from 'zod';
import { imageFilesOf } from '../shared/mcp-tools.ts';
import { registerSharedTools, text, MAX_IMAGE, type McpToolHost } from '../shared/mcp-register.ts';
import type { AdminClient } from '../shared/mcp-client.ts';

const MIME: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

/** Fayl yoki papkadan rasm yo'llari (papka — nom bo'yicha tartibda). */
async function pathsToFiles(paths: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const p of paths) {
    const s = await stat(p);
    if (s.isDirectory()) out.push(...imageFilesOf(await readdir(p)).map((n) => join(p, n)));
    else out.push(...imageFilesOf([p]));
  }
  return out;
}

/**
 * Stdio transportining tool ro'yxati: umumiy tool'lar + kompyuterdagi fayllardan
 * rasm yuklash. `allowFiles: false` bo'lsa remote bilan bir xil ro'yxat qoladi.
 */
export function registerTools(server: McpToolHost, api: AdminClient, opts: { allowFiles: boolean; adminUrl: string }): void {
  registerSharedTools(server, api, { adminUrl: opts.adminUrl });
  if (!opts.allowFiles) return;

  server.registerTool('image_upload_from_path', {
    description: "Kompyuterdagi fayl yoki papkadan rasmlarni yuklaydi (papka — nom bo'yicha tartibda, birinchisi asosiy rasm).",
    inputSchema: { paths: z.array(z.string()).min(1).max(20) },
  }, async (args: unknown) => {
    const parsed = args as { paths: string[] };
    const files = await pathsToFiles(parsed.paths);
    if (files.length === 0) throw new Error('Rasm topilmadi (jpg, jpeg, png, webp)');
    const out: string[] = [];
    for (const f of files) {
      const bytes = new Uint8Array(await readFile(f));
      if (bytes.byteLength > MAX_IMAGE) throw new Error(`5 MB dan katta: ${f}`);
      out.push(await api.upload(bytes, basename(f), MIME[extname(f).toLowerCase()] ?? 'image/jpeg', 'image_upload_from_path'));
    }
    return text(out.join('\n'));
  });
}
```

- [ ] **Step 6: `mcp/stdio.ts` importini yangilash**

`import { AdminClient } from './client.ts';` qatorini almashtiring:

```ts
import { AdminClient } from '../shared/mcp-client.ts';
```

- [ ] **Step 7: Lint, test va stdio serverni haqiqatan yuklab ko'rish**

```bash
bun run lint && bun run test && node --experimental-strip-types --check mcp/stdio.ts && node --experimental-strip-types --check shared/mcp-register.ts
```

Expected: lint'da faqat ma'lum `build/server/index.js` xatosi; 426+ test o'tadi; `--check` ikkala faylda jim (chiqish yo'q).

> **Nega `--check`:** `tsc` type-stripping cheklovlarini ko'rmaydi. Parametr-xususiyat yoki kengaytmasiz qiymat importi `bun run lint` dan o'tib ketadi va faqat serverni ishga tushirganda yiqiladi — shu branch'da bu ikki marta bo'lgan (`4966f0c`, `a2a128a`).

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -F - <<'EOF'
refactor(mcp): umumiy tool'lar va klient shared/ ga ko'chdi

Remote transport Docker image ichida ishlaydi, u yerda `mcp/` va `src/`
papkalari yo'q (Dockerfile faqat build/, server/, shared/, migrations/
nusxalaydi). Shuning uchun `errText`, `AdminClient` va fayl tizimiga
bog'liq bo'lmagan 10 ta tool `shared/` ga ko'chdi; `mcp/tools.ts` da
faqat `image_upload_from_path` qoldi. Xulq o'zgarmadi.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

## Task 2: `image_upload_from_url` ni remote uchun mustahkamlash (spec §14.4)

Bugun bu tool istalgan URL'ni oladi va javobni **to'liq buferlab** keyin hajmini tekshiradi. Stdio'da buni odamning o'z kompyuteri qiladi; remote'da esa **serverimiz** qiladi — ya'ni tokeni bor odam server nomidan ichki manzillarga so'rov yuborishi (SSRF) va xotirani to'ldirishi mumkin.

**Files:**
- Create: `shared/mcp-image.ts`
- Create: `shared/mcp-image.test.ts`
- Modify: `shared/mcp-register.ts` (`image_upload_from_url` bloki)

**Interfaces:**
- Produces: `shared/mcp-image.ts`:
  - `export function isSafeImageUrl(raw: string): { ok: true; url: URL } | { ok: false; reason: string }`
  - `export function tooLarge(contentLength: string | null, max: number): boolean`

- [ ] **Step 1: Failing test yozish**

```ts
// shared/mcp-image.test.ts
import { describe, it, expect } from 'vitest';
import { isSafeImageUrl, tooLarge } from './mcp-image';

describe('isSafeImageUrl', () => {
  it('oddiy https havolani qabul qiladi', () => {
    const r = isSafeImageUrl('https://store.storeimages.cdn-apple.com/is/x?wid=2000');
    expect(r.ok).toBe(true);
  });

  it('http va boshqa sxemalarni rad etadi', () => {
    expect(isSafeImageUrl('http://example.com/a.jpg').ok).toBe(false);
    expect(isSafeImageUrl('file:///etc/passwd').ok).toBe(false);
    expect(isSafeImageUrl('data:image/png;base64,AAA').ok).toBe(false);
  });

  it("ichki manzillarni rad etadi (server nomidan so'rov yuborilmasin)", () => {
    for (const u of [
      'https://localhost/a.jpg',
      'https://127.0.0.1/a.jpg',
      'https://10.0.0.5/a.jpg',
      'https://192.168.1.1/a.jpg',
      'https://172.16.0.1/a.jpg',
      'https://172.31.255.254/a.jpg',
      'https://169.254.169.254/latest/meta-data',
      'https://[::1]/a.jpg',
      'https://db.internal/a.jpg',
    ]) {
      expect(isSafeImageUrl(u), u).toMatchObject({ ok: false });
    }
  });

  it('ochiq IP va 172.32 ichki emas', () => {
    expect(isSafeImageUrl('https://8.8.8.8/a.jpg').ok).toBe(true);
    expect(isSafeImageUrl('https://172.32.0.1/a.jpg').ok).toBe(true);
  });

  it("buzuq havolani yiqilmasdan rad etadi", () => {
    expect(isSafeImageUrl('salom').ok).toBe(false);
  });
});

describe('tooLarge', () => {
  it("content-length chegaradan katta bo'lsa rost", () => {
    expect(tooLarge('6000000', 5 * 1024 * 1024)).toBe(true);
    expect(tooLarge('1000', 5 * 1024 * 1024)).toBe(false);
  });
  it("sarlavha yo'q yoki raqam emas — yolg'on (keyin bayt bo'yicha tekshiriladi)", () => {
    expect(tooLarge(null, 100)).toBe(false);
    expect(tooLarge('chunked', 100)).toBe(false);
  });
});
```

- [ ] **Step 2: Testni yurgizib, yiqilishiga ishonch hosil qilish**

Run: `bunx vitest run shared/mcp-image.test.ts`
Expected: FAIL — `Failed to resolve import "./mcp-image"`.

- [ ] **Step 3: Implementatsiya**

```ts
// shared/mcp-image.ts
/**
 * `image_upload_from_url` uchun havola tekshiruvi.
 *
 * Remote transportda rasmni **server** yuklab oladi, ya'ni tokeni bor odam server
 * nomidan so'rov yubora oladi. Shuning uchun https majburiy va aniq ichki manzillar
 * rad etiladi (bulut metadata endpoint'i — `169.254.169.254` — eng muhimi).
 *
 * ponytail: bu nom/manzil darajasidagi tekshiruv, DNS rebinding'ni to'xtatmaydi —
 * `db.internal` kabi nuqtasiz nom ham rad etiladi, lekin ichki IP'ga ishora qiluvchi
 * ommaviy domenni ushlamaydi. Haqiqiy himoya kerak bo'lsa — yuklashni chiquvchi
 * proxy ortiga olib chiqish yoki DNS'ni yechib IP'ni tekshirish.
 */

const PRIVATE_V4 = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\./,
];

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (h === '::1' || h.startsWith('fe80:') || h.startsWith('fc') || h.startsWith('fd')) return true;
  if (PRIVATE_V4.some((re) => re.test(h))) return true;
  // Nuqtasiz nom — ichki tarmoqdagi mashina nomi (`db`, `redis`).
  return !h.includes('.') && !h.includes(':');
}

export function isSafeImageUrl(raw: string): { ok: true; url: URL } | { ok: false; reason: string } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: `Havola noto'g'ri: ${raw}` };
  }
  if (url.protocol !== 'https:') return { ok: false, reason: `Faqat https: ${raw}` };
  if (isPrivateHost(url.hostname)) return { ok: false, reason: `Ichki manzilga ruxsat yo'q: ${url.hostname}` };
  return { ok: true, url };
}

/** `content-length` bo'yicha oldindan rad etish — 5 MB dan katta javob umuman buferlanmaydi. */
export function tooLarge(contentLength: string | null, max: number): boolean {
  const n = Number(contentLength);
  return Number.isFinite(n) && n > max;
}
```

- [ ] **Step 4: Test yashil**

Run: `bunx vitest run shared/mcp-image.test.ts`
Expected: PASS (7 test).

- [ ] **Step 5: Tool'ni yangi tekshiruvga o'tkazish**

`shared/mcp-register.ts` da `image_upload_from_url` ning `run` tanasini almashtiring:

```ts
  }, async (args: unknown) => {
    const parsed = args as { urls: string[] };
    const out: string[] = [];
    for (const u of parsed.urls) {
      const safe = isSafeImageUrl(u);
      if (!safe.ok) throw new Error(safe.reason);
      const res = await fetch(safe.url, { redirect: 'manual' });
      if (!res.ok) throw new Error(`Rasm yuklanmadi (${res.status}): ${u}`);
      const type = res.headers.get('content-type') ?? '';
      if (!type.startsWith('image/')) throw new Error(`Bu rasm emas (${type}): ${u}`);
      if (tooLarge(res.headers.get('content-length'), MAX_IMAGE)) throw new Error(`5 MB dan katta: ${u}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength > MAX_IMAGE) throw new Error(`5 MB dan katta: ${u}`);
      const name = safe.url.pathname.split('/').pop() || 'image';
      out.push(await api.upload(bytes, name, type, 'image_upload_from_url'));
    }
    return text(out.join('\n'));
  });
```

Fayl boshiga import qo'shing:

```ts
import { isSafeImageUrl, tooLarge } from './mcp-image.ts';
```

- [ ] **Step 6: Lint va to'liq test**

Run: `bun run lint && bun run test`
Expected: faqat ma'lum `build/server/index.js` xatosi; hamma test o'tadi.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -F - <<'EOF'
fix(mcp): rasm havolasida https va ichki manzil tekshiruvi

Remote transportda rasmni server yuklab oladi, ya'ni tokeni bor odam
server nomidan ichki manzilga so'rov yubora olardi (169.254.169.254
bulut metadatasi eng muhimi). `isSafeImageUrl` https'ni majburiy qiladi
va ichki manzillarni rad etadi; `content-length` endi buferlashdan
oldin tekshiriladi.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

## Task 3: Remote `/mcp` — 3-bosqich

Shu task tugagach Claude Desktop/Code'ga `https://…/mcp` ni bearer token bilan ulash mumkin bo'ladi. claude.ai hali emas (u OAuth talab qiladi — Task 4–6).

**Files:**
- Create: `server/mcp-auth.ts`
- Create: `server/mcp.ts`
- Modify: `server/index.ts`
- Modify: `package.json` (lint qatori — spec §14.9)
- Modify: `.env.example`

**Interfaces:**
- Consumes: `shared/mcp-client.ts` (`AdminClient`), `shared/mcp-register.ts` (`registerSharedTools`), `shared/mcp-auth.ts` (`hashToken`), `shared/runtime` (`Env`).
- Produces:
  - `server/mcp-auth.ts`: `export function createTokenVerifier(env: Env): { verifyAccessToken(token: string): Promise<AuthInfo> }`
  - `server/mcp.ts`: `export function mountMcp(app: Express, env: Env): void`

- [ ] **Step 1: Token tekshiruvchi**

```ts
// server/mcp-auth.ts
import { InvalidTokenError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { Env } from '../shared/runtime';
import { hashToken } from '../shared/mcp-auth.ts';

/**
 * `admin_tokens` ustidagi `OAuthTokenVerifier`. Bitta tekshiruvchi ikkala turdagi
 * tokenga xizmat qiladi: admin'da qo'lda yaratilgani (`kind='manual'`) va OAuth
 * bergani (`kind='oauth'`) — bekor qilish ham, muddat ham bitta joyda.
 *
 * `kind='refresh'` **qasddan rad etiladi**: refresh token faqat `/token` endpoint'ida
 * yangi access tokenga almashish uchun; u bilan admin API'ga kirib bo'lmasligi kerak.
 */
export function createTokenVerifier(env: Env): { verifyAccessToken(token: string): Promise<AuthInfo> } {
  return {
    async verifyAccessToken(token: string): Promise<AuthInfo> {
      const row = await env.DB.prepare(
        "SELECT label, kind, client_id, expires_at FROM admin_tokens WHERE token_hash = ? AND revoked_at IS NULL AND kind != 'refresh'",
      )
        .bind(await hashToken(token))
        .first<{ label: string; kind: string; client_id: string | null; expires_at: number | null }>();
      const now = Math.floor(Date.now() / 1000);
      if (!row) throw new InvalidTokenError('Token yaroqsiz yoki bekor qilingan');
      if (row.expires_at !== null && row.expires_at < now) throw new InvalidTokenError('Token muddati tugagan');
      return {
        token,
        clientId: row.client_id ?? row.label,
        scopes: ['admin'],
        // `requireBearerAuth` `expiresAt` ni **majburiy son** deb talab qiladi (yo'q bo'lsa
        // «Token has no expiration time» bilan 401 beradi). Muddatsiz token uchun har
        // so'rovda bir soat oldinga suriladi — ya'ni amalda tugamaydi, haqiqiy nazorat
        // esa `revoked_at` ustunida qoladi.
        expiresAt: row.expires_at ?? now + 3600,
      };
    },
  };
}
```

- [ ] **Step 2: `/mcp` handler**

```ts
// server/mcp.ts
import express, { type Express } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import type { Env } from '../shared/runtime';
import { AdminClient } from '../shared/mcp-client.ts';
import { registerSharedTools } from '../shared/mcp-register.ts';
import { createTokenVerifier } from './mcp-auth.ts';
import { createLimiter } from '../functions/lib/rate-limit.ts';

/**
 * Remote MCP — claude.ai va istalgan qurilma uchun.
 *
 * **Stateless:** har so'rovda yangi `McpServer` + transport yig'iladi va so'rov
 * tugagach yopiladi. Sessiya saqlanmasa qayta deploy ham, bir nechta instansiya ham
 * muammo bo'lmaydi; bizning tool'larimiz holatsiz (har biri HTTP chaqiruv).
 *
 * Tool'lar o'z saytimizning `/api/admin/*` endpoint'larini **so'rovchining tokeni**
 * bilan chaqiradi — ya'ni validatsiya, slug va atomik batch joyidan qimirlamaydi va
 * jurnalda (`admin_audit`) o'sha tokenning nomi ko'rinadi.
 *
 * `image_upload_from_path` bu yerda ro'yxatga qo'shilmaydi — serverda odamning
 * fayllari yo'q (spec §3).
 */
const allowMcp = createLimiter(60, 60 * 1000);

/** So'rovdan o'z manzilimiz: proxy ortida `x-forwarded-*` haqiqatni aytadi. */
function originOf(req: express.Request): string {
  const proto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0].trim() ?? req.protocol;
  return `${proto}://${req.get('host')}`;
}

export function mountMcp(app: Express, env: Env): void {
  const verifier = createTokenVerifier(env);

  app.all('/mcp', (req, res, next) => {
    if (allowMcp(req.ip ?? '')) return next();
    res.status(429).json({ error: 'too_many_requests' });
  });

  app.all('/mcp', requireBearerAuth({
    verifier,
    requiredScopes: ['admin'],
    resourceMetadataUrl: `${process.env.PUBLIC_URL ?? ''}/.well-known/oauth-protected-resource/mcp`,
  }));

  app.all('/mcp', async (req, res) => {
    const token = req.auth?.token;
    if (!token) { res.status(401).json({ error: 'unauthorized' }); return; }

    const server = new McpServer({ name: 'product-admin', version: '1.0.0' });
    const origin = originOf(req);
    registerSharedTools(server, new AdminClient(origin, token), { adminUrl: origin });

    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => { void transport.close(); void server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res);
  });
}
```

> `requireBearerAuth` `resourceMetadataUrl` ni faqat 401 javobining `WWW-Authenticate` sarlavhasiga qo'yadi. `PUBLIC_URL` bo'lmasa sarlavhada nisbiy yo'l qoladi — 3-bosqichda zarar yo'q, 4-bosqichda `PUBLIC_URL` majburiy bo'ladi.

- [ ] **Step 3: `server/index.ts` ga ulash**

`createUsdRate` importidan keyin qo'shing:

```ts
import { mountMcp } from './mcp.ts';
```

`NO_CACHE` ro'yxatiga `/mcp` qo'shing:

```ts
const NO_CACHE = ['/admin', '/api/', '/auth/', '/images/', '/assets/', '/mcp'];
```

`app.use('/images/products', …)` qatoridan **keyin**, `if (isProd)` blokidan **oldin** ulang:

```ts
// Remote MCP — React Router handler'idan oldin, aks holda `*` route'i uni 404 qiladi.
mountMcp(app, env);
```

- [ ] **Step 4: Type-stripping tekshiruvini lintga bog'lash (spec §14.9)**

`package.json` dagi `lint` va `typecheck` skriptlarini almashtiring:

```json
    "typecheck": "react-router typegen && tsc --noEmit && tsc --noEmit -p functions/tsconfig.json",
    "lint": "react-router typegen && tsc --noEmit && tsc --noEmit -p functions/tsconfig.json && node --experimental-strip-types --check mcp/stdio.ts && node --experimental-strip-types --check server/index.ts",
```

- [ ] **Step 5: `.env.example` ga `PUBLIC_URL`**

Fayl oxiriga qo'shing:

```
# Saytning tashqi manzili — remote MCP va OAuth metadatasida ishlatiladi.
# Bo'sh bo'lsa OAuth ulanmaydi (bearer token bilan /mcp baribir ishlaydi).
PUBLIC_URL=https://productstore.uz
```

- [ ] **Step 6: Lint va test**

Run: `bun run lint && bun run test`
Expected: faqat ma'lum `build/server/index.js` xatosi (u `--check` qatoriga yetmasdan to'xtatadi — shuning uchun `--check` larni alohida ham yurgizing:
`node --experimental-strip-types --check server/mcp.ts && node --experimental-strip-types --check server/mcp-auth.ts`); testlar o'tadi.

- [ ] **Step 7: Qo'lda tekshirish — dev serverda**

```bash
bun run dev
```

Boshqa terminalda admin'dan (Sozlamalar → Integratsiyalar → MCP tokenlari) token oling yoki mavjudini ishlating, so'ng:

```bash
curl -s -X POST http://localhost:3000/mcp -H "Authorization: Bearer $PRODUCT_TOKEN" -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | head -c 2000
```

Expected: JSON-RPC javobida 10 ta tool (`image_upload_from_path` **yo'q**).

Tokensiz:

```bash
curl -s -i -X POST http://localhost:3000/mcp -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | head -5
```

Expected: `HTTP/1.1 401` va `WWW-Authenticate: Bearer …` sarlavhasi.

Tool chaqiruvi:

```bash
curl -s -X POST http://localhost:3000/mcp -H "Authorization: Bearer $PRODUCT_TOKEN" -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"catalog_stats","arguments":{}}}' | head -c 1000
```

Expected: katalog sonlari.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -F - <<'EOF'
feat(mcp): remote /mcp — Streamable HTTP transport (3-bosqich)

Har so'rovda stateless transport + yangi McpServer: sessiya saqlanmaydi,
shuning uchun qayta deploy ham, bir nechta instansiya ham muammo emas.
Tool'lar o'z saytining /api/admin/* ini so'rovchi tokeni bilan chaqiradi.
Bearer tekshiruvi `admin_tokens` ustida (`createTokenVerifier`), IP bo'yicha
60 so'rov/daqiqa, `image_upload_from_path` remote'da ro'yxatga qo'shilmaydi.

Lint endi `node --experimental-strip-types --check` ni ham yurgizadi —
tsc ko'rmaydigan type-stripping cheklovi shu branch'ni ikki marta yiqitgan.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

## Task 4: OAuth uchun baza va sof mantiq

**Files:**
- Create: `migrations/0040_oauth.sql`
- Create: `shared/oauth.ts`
- Create: `shared/oauth.test.ts`

**Interfaces:**
- Produces: `shared/oauth.ts`:
  - `export const ACCESS_TTL = 30 * 24 * 60 * 60`
  - `export const CODE_TTL = 10 * 60`
  - `export function redirectUriAllowed(requested: string, registered: string[]): boolean`
  - `export function buildRedirect(redirectUri: string, params: { code: string; state?: string }): string`
  - `export interface ConsentForm { clientId: string; redirectUri: string; codeChallenge: string; state: string | null; label: string; username: string; password: string }`
  - `export function parseConsentForm(body: Record<string, unknown>): ConsentForm` — yetishmagan maydonda `Error` tashlaydi

- [ ] **Step 1: Migratsiya**

```sql
-- migrations/0040_oauth.sql
-- OAuth 2.1 avtorizatsiya serveri (remote MCP uchun). claude.ai konnektori shu
-- oqimni talab qiladi: dinamik klient ro'yxati + PKCE + authorization code.
--
-- Berilgan access/refresh tokenlar alohida jadvalda emas, `admin_tokens` da
-- (`kind` = 'oauth' / 'refresh') — bekor qilish, jurnal va ro'yxat bitta joyda.
CREATE TABLE IF NOT EXISTS oauth_clients (
  client_id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  -- JSON massiv: ["https://claude.ai/api/mcp/auth_callback"]
  redirect_uris TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Authorization code: 10 daqiqa yashaydi va bir marta ishlatiladi (almashganda o'chadi).
-- Kodning o'zi saqlanmaydi — faqat SHA-256 hash, tokenlardagi qoida bilan bir xil.
CREATE TABLE IF NOT EXISTS oauth_codes (
  code_hash TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  label TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_oauth_codes_expires ON oauth_codes(expires_at);
```

- [ ] **Step 2: Migratsiyani qo'llash va tekshirish**

```bash
bun run migrate && node -e "const D=require('better-sqlite3')(process.env.DATABASE_PATH||'data/store.db');console.log(D.prepare(\"SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'oauth%'\").all())"
```

Expected: `[ { name: 'oauth_clients' }, { name: 'oauth_codes' } ]`

- [ ] **Step 3: Failing test**

```ts
// shared/oauth.test.ts
import { describe, it, expect } from 'vitest';
import { redirectUriAllowed, buildRedirect, parseConsentForm, ACCESS_TTL, CODE_TTL } from './oauth';

describe('redirectUriAllowed', () => {
  it('aniq mos kelgan manzilni qabul qiladi', () => {
    expect(redirectUriAllowed('https://claude.ai/api/mcp/auth_callback', ['https://claude.ai/api/mcp/auth_callback'])).toBe(true);
  });
  it("ro'yxatda yo'q manzilni rad etadi", () => {
    expect(redirectUriAllowed('https://evil.example/cb', ['https://claude.ai/api/mcp/auth_callback'])).toBe(false);
  });
  it('prefiks mosligi yetarli emas', () => {
    expect(redirectUriAllowed('https://claude.ai/api/mcp/auth_callback.evil', ['https://claude.ai/api/mcp/auth_callback'])).toBe(false);
  });
  it("bo'sh ro'yxat — hech narsa o'tmaydi", () => {
    expect(redirectUriAllowed('https://claude.ai/cb', [])).toBe(false);
  });
});

describe('buildRedirect', () => {
  it("mavjud query'ni saqlab code va state qo'shadi", () => {
    const u = buildRedirect('https://claude.ai/cb?x=1', { code: 'abc', state: 's1' });
    const url = new URL(u);
    expect(url.searchParams.get('x')).toBe('1');
    expect(url.searchParams.get('code')).toBe('abc');
    expect(url.searchParams.get('state')).toBe('s1');
  });
  it("state yo'q bo'lsa qo'shilmaydi", () => {
    expect(new URL(buildRedirect('https://claude.ai/cb', { code: 'abc' })).searchParams.has('state')).toBe(false);
  });
});

describe('parseConsentForm', () => {
  const ok = {
    client_id: 'c1', redirect_uri: 'https://claude.ai/cb', code_challenge: 'ch',
    state: 's', label: 'Javlonning telefoni', username: 'admin', password: 'x',
  };
  it("to'liq formani o'qiydi", () => {
    expect(parseConsentForm(ok)).toEqual({
      clientId: 'c1', redirectUri: 'https://claude.ai/cb', codeChallenge: 'ch',
      state: 's', label: 'Javlonning telefoni', username: 'admin', password: 'x',
    });
  });
  it("state bo'sh bo'lsa null", () => {
    expect(parseConsentForm({ ...ok, state: '' }).state).toBeNull();
  });
  it("nom bo'sh bo'lsa standart nom qo'yiladi", () => {
    expect(parseConsentForm({ ...ok, label: '  ' }).label).toBe('Konnektor');
  });
  it('majburiy maydon yetishmasa xato', () => {
    for (const k of ['client_id', 'redirect_uri', 'code_challenge', 'username', 'password']) {
      expect(() => parseConsentForm({ ...ok, [k]: '' })).toThrow();
    }
  });
  it('nom 60 belgigacha qisqaradi', () => {
    expect(parseConsentForm({ ...ok, label: 'a'.repeat(200) }).label).toHaveLength(60);
  });
});

describe('muddatlar', () => {
  it('access 30 kun, kod 10 daqiqa', () => {
    expect(ACCESS_TTL).toBe(2592000);
    expect(CODE_TTL).toBe(600);
  });
});
```

- [ ] **Step 4: Testni yurgizib yiqilishini ko'rish**

Run: `bunx vitest run shared/oauth.test.ts`
Expected: FAIL — `Failed to resolve import "./oauth"`.

- [ ] **Step 5: Implementatsiya**

```ts
// shared/oauth.ts
/**
 * OAuth oqimining sof qismi. Endpoint'larning o'zini `@modelcontextprotocol/sdk`
 * ichidagi `mcpAuthRouter` chizadi (metadata, /register, /authorize, /token, /revoke)
 * va PKCE `S256` tekshiruvini ham o'zi bajaradi — bizdan faqat saqlash va rozilik
 * sahifasi talab qilinadi (`server/oauth-provider.ts`, `server/oauth-consent.ts`).
 */

/** Access token — 30 kun. Refresh bekor qilinmaguncha yashaydi. */
export const ACCESS_TTL = 30 * 24 * 60 * 60;
/** Authorization code — 10 daqiqa, bir martalik. */
export const CODE_TTL = 10 * 60;

/**
 * `redirect_uri` ro'yxatdagi manzil bilan **aynan** mos kelishi shart. Prefiks
 * taqqoslash ochiq redirect beradi (`…/cb.evil` `…/cb` bilan boshlanadi).
 */
export function redirectUriAllowed(requested: string, registered: string[]): boolean {
  return registered.includes(requested);
}

export function buildRedirect(redirectUri: string, params: { code: string; state?: string }): string {
  const url = new URL(redirectUri);
  url.searchParams.set('code', params.code);
  if (params.state) url.searchParams.set('state', params.state);
  return url.toString();
}

export interface ConsentForm {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string | null;
  label: string;
  username: string;
  password: string;
}

function str(body: Record<string, unknown>, key: string): string {
  const v = body[key];
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Rozilik formasidan kelgan maydonlar. Yashirin maydonlar (`client_id`, `redirect_uri`,
 * `code_challenge`) mijoz tomonidan kelgani uchun **ishonchsiz** — chaqiruvchi ularni
 * bazadagi klient bilan qayta solishtirishi shart (`redirectUriAllowed`).
 */
export function parseConsentForm(body: Record<string, unknown>): ConsentForm {
  const clientId = str(body, 'client_id');
  const redirectUri = str(body, 'redirect_uri');
  const codeChallenge = str(body, 'code_challenge');
  const username = str(body, 'username');
  const password = typeof body.password === 'string' ? body.password : '';
  if (!clientId || !redirectUri || !codeChallenge) throw new Error('invalid_request');
  if (!username || !password) throw new Error('missing_credentials');
  const state = str(body, 'state');
  const label = str(body, 'label').slice(0, 60);
  return {
    clientId, redirectUri, codeChallenge,
    state: state === '' ? null : state,
    label: label === '' ? 'Konnektor' : label,
    username, password,
  };
}
```

- [ ] **Step 6: Testlar yashil**

Run: `bunx vitest run shared/oauth.test.ts`
Expected: PASS (13 test).

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -F - <<'EOF'
feat(oauth): migratsiya 0040 va sof mantiq

`oauth_clients` va `oauth_codes` jadvallari (kod 10 daqiqa, bir martalik,
hash holida saqlanadi). `shared/oauth.ts` — redirect_uri aniq mosligi,
qaytish havolasini yig'ish va rozilik formasini o'qish; tokenlar alohida
jadvalga emas, `admin_tokens` ga tushadi.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

## Task 5: OAuth provider va rozilik sahifasi

**Files:**
- Create: `server/oauth-provider.ts`
- Create: `server/oauth-consent.ts`
- Modify: `app/routes/api.admin.guard.ts` (refresh token rad etiladi)

**Interfaces:**
- Consumes: `shared/oauth.ts` (Task 4), `shared/mcp-auth.ts` (`newToken`, `hashToken`), `functions/lib/auth.ts` (`verifyPassword`, `lockDelaySeconds`), `functions/lib/db.ts` (`loadAdminAuth`, `updateLoginThrottle`), `server/mcp-auth.ts` (`createTokenVerifier`, Task 3).
- Produces:
  - `server/oauth-provider.ts`: `export function createOAuthProvider(env: Env): OAuthServerProvider`
  - `server/oauth-consent.ts`: `export function consentPage(params: { clientName: string; clientId: string; redirectUri: string; codeChallenge: string; state?: string; error?: string }): string` va `export function mountConsent(app: Express, env: Env): void`

- [ ] **Step 1: Provider**

```ts
// server/oauth-provider.ts
import type { Response } from 'express';
import { InvalidGrantError, InvalidTokenError, ServerError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import type { OAuthServerProvider, AuthorizationParams } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import type { OAuthClientInformationFull, OAuthTokens, OAuthTokenRevocationRequest } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { Env } from '../shared/runtime';
import { hashToken, newToken } from '../shared/mcp-auth.ts';
import { ACCESS_TTL } from '../shared/oauth.ts';
import { consentPage } from './oauth-consent.ts';
import { createTokenVerifier } from './mcp-auth.ts';

/**
 * OAuth 2.1 avtorizatsiya serveri — `mcpAuthRouter` uchun.
 *
 * SDK o'zi bajaradi: klient va `redirect_uri` tekshiruvi, PKCE `S256` solishtirish
 * (`challengeForAuthorizationCode` + `pkce-challenge`), metadata, `/register`.
 * Bizda qolgani — saqlash, rozilik sahifasi va token yasash.
 *
 * **Ochiq cheklov (spec §5):** bizda bitta admin identifikatori bor, shuning uchun
 * OAuth odamni tanimaydi — rozilik ekranidagi nom o'zi aytgan nom, haqiqiy gate esa
 * admin paroli. Ko'p haqiqiy hisob kerak bo'lsa — `admin_users`, alohida ish.
 */
export function createOAuthProvider(env: Env): OAuthServerProvider {
  const verifier = createTokenVerifier(env);

  const clientsStore: OAuthRegisteredClientsStore = {
    async getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
      const row = await env.DB.prepare('SELECT client_id, client_name, redirect_uris, created_at FROM oauth_clients WHERE client_id = ?')
        .bind(clientId)
        .first<{ client_id: string; client_name: string; redirect_uris: string; created_at: number }>();
      if (!row) return undefined;
      return {
        client_id: row.client_id,
        client_name: row.client_name,
        redirect_uris: JSON.parse(row.redirect_uris) as string[],
        client_id_issued_at: row.created_at,
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
      };
    },
    async registerClient(client): Promise<OAuthClientInformationFull> {
      // Public klient + PKCE — sir berilmaydi (spec §5).
      const clientId = crypto.randomUUID();
      const issuedAt = Math.floor(Date.now() / 1000);
      await env.DB.prepare('INSERT INTO oauth_clients (client_id, client_name, redirect_uris, created_at) VALUES (?, ?, ?, ?)')
        .bind(clientId, client.client_name ?? 'Konnektor', JSON.stringify(client.redirect_uris), issuedAt)
        .run();
      return { ...client, client_id: clientId, client_id_issued_at: issuedAt };
    },
  };

  /** Access (+ixtiyoriy refresh) tokenni `admin_tokens` ga yozadi. */
  async function issueTokens(clientId: string, label: string, withRefresh: boolean): Promise<OAuthTokens> {
    const now = Math.floor(Date.now() / 1000);
    const access = newToken();
    await env.DB.prepare(
      "INSERT INTO admin_tokens (label, token_hash, kind, client_id, expires_at, created_at) VALUES (?, ?, 'oauth', ?, ?, ?)",
    ).bind(label, await hashToken(access), clientId, now + ACCESS_TTL, now).run();

    let refresh: string | undefined;
    if (withRefresh) {
      refresh = newToken();
      await env.DB.prepare(
        "INSERT INTO admin_tokens (label, token_hash, kind, client_id, expires_at, created_at) VALUES (?, ?, 'refresh', ?, NULL, ?)",
      ).bind(label, await hashToken(refresh), clientId, now).run();
    }
    return { access_token: access, token_type: 'Bearer', expires_in: ACCESS_TTL, scope: 'admin', refresh_token: refresh };
  }

  return {
    get clientsStore() { return clientsStore; },

    async authorize(client: OAuthClientInformationFull, params: AuthorizationParams, res: Response): Promise<void> {
      // SDK `client_id`, `redirect_uri` va `code_challenge_method=S256` ni allaqachon
      // tekshirdi. Bizning ishimiz — odamdan parol va nom so'rash.
      res.type('html').send(consentPage({
        clientName: client.client_name ?? 'Konnektor',
        clientId: client.client_id,
        redirectUri: params.redirectUri,
        codeChallenge: params.codeChallenge,
        state: params.state,
      }));
    },

    async challengeForAuthorizationCode(client: OAuthClientInformationFull, authorizationCode: string): Promise<string> {
      const row = await env.DB.prepare('SELECT client_id, code_challenge, expires_at FROM oauth_codes WHERE code_hash = ?')
        .bind(await hashToken(authorizationCode))
        .first<{ client_id: string; code_challenge: string; expires_at: number }>();
      if (!row || row.client_id !== client.client_id) throw new InvalidGrantError('Kod topilmadi');
      if (row.expires_at < Math.floor(Date.now() / 1000)) throw new InvalidGrantError('Kod muddati tugagan');
      return row.code_challenge;
    },

    async exchangeAuthorizationCode(
      client: OAuthClientInformationFull,
      authorizationCode: string,
      _codeVerifier?: string,
      redirectUri?: string,
    ): Promise<OAuthTokens> {
      const hash = await hashToken(authorizationCode);
      const row = await env.DB.prepare('SELECT client_id, redirect_uri, label, expires_at FROM oauth_codes WHERE code_hash = ?')
        .bind(hash)
        .first<{ client_id: string; redirect_uri: string; label: string; expires_at: number }>();
      // Kod bir martalik: topilgan zahoti o'chiriladi, keyin tekshiriladi.
      await env.DB.prepare('DELETE FROM oauth_codes WHERE code_hash = ?').bind(hash).run();
      if (!row || row.client_id !== client.client_id) throw new InvalidGrantError('Kod topilmadi');
      if (row.expires_at < Math.floor(Date.now() / 1000)) throw new InvalidGrantError('Kod muddati tugagan');
      if (redirectUri !== undefined && redirectUri !== row.redirect_uri) throw new InvalidGrantError('redirect_uri mos emas');
      return issueTokens(client.client_id, row.label, true);
    },

    async exchangeRefreshToken(client: OAuthClientInformationFull, refreshToken: string): Promise<OAuthTokens> {
      const row = await env.DB.prepare(
        "SELECT label, client_id FROM admin_tokens WHERE token_hash = ? AND kind = 'refresh' AND revoked_at IS NULL",
      )
        .bind(await hashToken(refreshToken))
        .first<{ label: string; client_id: string | null }>();
      if (!row || row.client_id !== client.client_id) throw new InvalidGrantError('Refresh token yaroqsiz');
      // Refresh tokenning o'zi qoladi — faqat yangi access beriladi.
      return issueTokens(client.client_id, row.label, false);
    },

    async verifyAccessToken(token: string): Promise<AuthInfo> {
      return verifier.verifyAccessToken(token);
    },

    async revokeToken(client: OAuthClientInformationFull, request: OAuthTokenRevocationRequest): Promise<void> {
      await env.DB.prepare('UPDATE admin_tokens SET revoked_at = unixepoch() WHERE token_hash = ? AND client_id = ? AND revoked_at IS NULL')
        .bind(await hashToken(request.token), client.client_id)
        .run();
    },
  };
}
```

> `InvalidTokenError` va `ServerError` importlari yuqorida yozilgan, lekin tanada ishlatilmasa `tsc` ularni **xato deb belgilamaydi** (`noUnusedLocals` yoqilmagan bo'lsa ham) — baribir ishlatilmaganini olib tashlang, bu fayl uchun kerak bo'lgani: `InvalidGrantError`.

- [ ] **Step 2: Rozilik sahifasi va `POST /oauth/consent`**

```ts
// server/oauth-consent.ts
import express, { type Express } from 'express';
import type { Env } from '../shared/runtime';
import { loadAdminAuth, updateLoginThrottle } from '../functions/lib/db';
import { lockDelaySeconds, verifyPassword } from '../functions/lib/auth';
import { hashToken, newToken } from '../shared/mcp-auth.ts';
import { buildRedirect, parseConsentForm, redirectUriAllowed, CODE_TTL } from '../shared/oauth.ts';

/**
 * Rozilik + kirish sahifasi. Admin paneli React SPA, bu esa oddiy server HTML —
 * OAuth oqimi to'liq server tomonida kechadi va sahifa bitta forma, shuning uchun
 * bundle'ga qo'shish shart emas.
 */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function consentPage(p: {
  clientName: string; clientId: string; redirectUri: string; codeChallenge: string; state?: string; error?: string;
}): string {
  return `<!doctype html>
<html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Ruxsat berish</title>
<style>
 :root{color-scheme:light}
 body{margin:0;background:#F4F5F7;font:17px/1.5 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;color:#1D1D1F;
   display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px}
 form{background:#fff;border-radius:20px;padding:32px;width:100%;max-width:420px}
 h1{font-size:24px;margin:0 0 8px}
 p{color:#6E6E73;font-size:15px;margin:0 0 24px}
 label{display:block;font-size:14px;font-weight:600;margin:16px 0 6px}
 input{width:100%;box-sizing:border-box;height:44px;padding:0 12px;font-size:16px;border:1px solid #D2D2D7;border-radius:8px;background:#fff;color:inherit}
 button{width:100%;height:52px;margin-top:24px;border:0;border-radius:980px;background:#1D1D1F;color:#fff;font-size:17px;cursor:pointer}
 .err{background:#FDECEC;color:#B3261E;border-radius:8px;padding:10px 12px;font-size:14px;margin-bottom:16px}
 .hint{font-size:13px;color:#86868B;margin-top:8px}
</style></head><body>
<form method="post" action="/oauth/consent">
 <h1>Ruxsat berish</h1>
 <p><strong>${esc(p.clientName)}</strong> do'kon admin paneliga <strong>to'liq kirish</strong> so'rayapti: tovar qo'shish, tahrirlash va rasm yuklash.</p>
 ${p.error ? `<div class="err">${esc(p.error)}</div>` : ''}
 <input type="hidden" name="client_id" value="${esc(p.clientId)}">
 <input type="hidden" name="redirect_uri" value="${esc(p.redirectUri)}">
 <input type="hidden" name="code_challenge" value="${esc(p.codeChallenge)}">
 <input type="hidden" name="state" value="${esc(p.state ?? '')}">
 <label for="label">Bu ulanish nomi</label>
 <input id="label" name="label" placeholder="Masalan: Javlonning telefoni" autocomplete="off">
 <div class="hint">Jurnalda shu nom ko'rinadi. Keyin admin'dan bekor qilish mumkin.</div>
 <label for="username">Admin login</label>
 <input id="username" name="username" autocomplete="username" required>
 <label for="password">Parol</label>
 <input id="password" name="password" type="password" autocomplete="current-password" required>
 <button type="submit">Ruxsat berish</button>
</form></body></html>`;
}

/**
 * Rozilik formasining POST'i. Bu **bizning** endpoint — SDK faqat `/authorize` ni
 * chizadi va `provider.authorize` ga topshiradi.
 *
 * Yashirin maydonlar mijozdan keladi, shuning uchun `redirect_uri` bazadagi klient
 * ro'yxati bilan **qayta** solishtiriladi — aks holda istalgan odam o'z manziliga
 * kod yuboradigan forma yasay olardi.
 */
export function mountConsent(app: Express, env: Env): void {
  app.post('/oauth/consent', express.urlencoded({ extended: false }), async (req, res) => {
    let form;
    try {
      form = parseConsentForm(req.body as Record<string, unknown>);
    } catch {
      res.status(400).type('text/plain').send("So'rov to'liq emas");
      return;
    }

    const client = await env.DB.prepare('SELECT client_name, redirect_uris FROM oauth_clients WHERE client_id = ?')
      .bind(form.clientId)
      .first<{ client_name: string; redirect_uris: string }>();
    if (!client || !redirectUriAllowed(form.redirectUri, JSON.parse(client.redirect_uris) as string[])) {
      res.status(400).type('text/plain').send('Klient yoki qaytish manzili notanish');
      return;
    }

    const page = (error: string) => consentPage({
      clientName: client.client_name, clientId: form.clientId, redirectUri: form.redirectUri,
      codeChallenge: form.codeChallenge, state: form.state ?? undefined, error,
    });

    const auth = await loadAdminAuth(env);
    if (!auth) { res.status(500).type('text/plain').send('Admin sozlanmagan'); return; }

    const now = Math.floor(Date.now() / 1000);
    if (auth.lockUntil > now) {
      res.status(429).type('html').send(page(`Juda ko'p urinish. ${auth.lockUntil - now} soniyadan keyin qayta urining.`));
      return;
    }
    // Parol tekshiruvi login bilan bir xil: noto'g'ri loginda ham sekin hisob bajariladi.
    const passwordOk = await verifyPassword(form.password, auth.passwordSalt, auth.passwordHash);
    if (form.username !== auth.username || !passwordOk) {
      const failed = auth.failedAttempts + 1;
      const delay = lockDelaySeconds(failed);
      await updateLoginThrottle(env, failed, delay > 0 ? now + delay : 0);
      res.status(401).type('html').send(page("Login yoki parol noto'g'ri"));
      return;
    }
    if (auth.failedAttempts > 0 || auth.lockUntil > 0) await updateLoginThrottle(env, 0, 0);

    const code = newToken();
    await env.DB.prepare(
      'INSERT INTO oauth_codes (code_hash, client_id, redirect_uri, code_challenge, label, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(await hashToken(code), form.clientId, form.redirectUri, form.codeChallenge, form.label, now + CODE_TTL).run();

    res.redirect(302, buildRedirect(form.redirectUri, { code, state: form.state ?? undefined }));
  });
}
```

- [ ] **Step 3: Guard refresh tokenni rad etsin**

`app/routes/api.admin.guard.ts` dagi `adminFromToken` ichidagi SQL qatorini almashtiring:

```ts
  const row = await env.DB.prepare(
    "SELECT id, label, expires_at FROM admin_tokens WHERE token_hash = ? AND revoked_at IS NULL AND kind != 'refresh'",
  )
```

Va funksiya izohiga qator qo'shing:

```ts
 * `kind='refresh'` rad etiladi: refresh token faqat `/token` da yangi access olish
 * uchun, u bilan admin API'ga kirib bo'lmaydi.
```

- [ ] **Step 4: Lint, test va type-stripping**

```bash
bun run lint && bun run test && node --experimental-strip-types --check server/oauth-provider.ts && node --experimental-strip-types --check server/oauth-consent.ts
```

Expected: faqat ma'lum `build/server/index.js` xatosi; testlar o'tadi; `--check` jim.

> Agar `--check` `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` bersa — `functions/lib/db` va `functions/lib/auth` importlarida kengaytma yo'qligi sabab bo'lishi mumkin. Ular **qiymat** importi, shuning uchun `.ts` qo'shing: `'../functions/lib/db.ts'`, `'../functions/lib/auth.ts'`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -F - <<'EOF'
feat(oauth): provider, rozilik sahifasi va refresh token ajratmasi

`OAuthServerProvider` SQLite ustida: klient do'koni, kod almashish (bir
martalik, muddatli), access/refresh token yasash. Rozilik sahifasi — oddiy
server HTML, gate admin paroli (login bilan bir xil throttle). Yashirin
maydonlardagi redirect_uri bazadagi klient ro'yxati bilan qayta solishtiriladi.

`requireAdmin` endi `kind='refresh'` tokenni rad etadi — refresh faqat
/token da yangi access olish uchun, admin API kaliti emas.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

## Task 6: OAuth'ni ulash va uchidan-uchiga tekshirish

**Files:**
- Modify: `server/mcp.ts` (`mountOAuth` qo'shiladi)
- Modify: `server/index.ts`

**Interfaces:**
- Consumes: `server/oauth-provider.ts` (`createOAuthProvider`), `server/oauth-consent.ts` (`mountConsent`).
- Produces: `server/mcp.ts`: `export function mountOAuth(app: Express, env: Env): boolean` — `PUBLIC_URL` bo'lmasa `false` qaytaradi va hech narsa ulamaydi.

- [ ] **Step 1: `mountOAuth`**

`server/mcp.ts` ga qo'shing (importlar fayl boshiga):

```ts
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { createOAuthProvider } from './oauth-provider.ts';
import { mountConsent } from './oauth-consent.ts';
```

```ts
/**
 * OAuth 2.1 avtorizatsiya serveri — claude.ai konnektori uchun.
 *
 * `mcpAuthRouter` ilova **ildiziga** o'rnatilishi shart (SDK talabi): u
 * `/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource/mcp`,
 * `/authorize`, `/token`, `/register`, `/revoke` yo'llarini oladi. Shuning uchun
 * React Router handler'idan **oldin** ulanadi.
 *
 * `PUBLIC_URL` kerak: metadata ichidagi manzillar mutlaq bo'lishi shart va ularni
 * so'rovdan taxmin qilib bo'lmaydi (klient metadatani boshqa yo'ldan o'qishi mumkin).
 */
export function mountOAuth(app: Express, env: Env): boolean {
  const publicUrl = process.env.PUBLIC_URL;
  if (!publicUrl) return false;
  mountConsent(app, env);
  app.use(mcpAuthRouter({
    provider: createOAuthProvider(env),
    issuerUrl: new URL(publicUrl),
    resourceServerUrl: new URL('/mcp', publicUrl),
    scopesSupported: ['admin'],
    resourceName: 'ProDuct admin',
  }));
  return true;
}
```

- [ ] **Step 2: `server/index.ts` da ulash**

Importni yangilang:

```ts
import { mountMcp, mountOAuth } from './mcp.ts';
```

`mountMcp(app, env);` qatorini almashtiring:

```ts
// Remote MCP va OAuth — React Router handler'idan oldin, aks holda `*` route'i ularni 404 qiladi.
mountMcp(app, env);
if (!mountOAuth(app, env)) {
  console.log('PUBLIC_URL yo\'q — OAuth ulanmadi; /mcp faqat bearer token bilan ishlaydi.');
}
```

`NO_CACHE` ro'yxatini to'ldiring:

```ts
const NO_CACHE = ['/admin', '/api/', '/auth/', '/images/', '/assets/', '/mcp', '/oauth/', '/authorize', '/token', '/register', '/revoke', '/.well-known/'];
```

- [ ] **Step 3: Lint, test, type-stripping**

```bash
bun run lint && bun run test && node --experimental-strip-types --check server/index.ts
```

Expected: faqat ma'lum `build/server/index.js` xatosi; testlar o'tadi.

- [ ] **Step 4: Metadata endpoint'larini qo'lda tekshirish**

```bash
PUBLIC_URL=http://localhost:3000 bun run dev
```

Boshqa terminalda:

```bash
curl -s http://localhost:3000/.well-known/oauth-authorization-server | python3 -m json.tool
curl -s http://localhost:3000/.well-known/oauth-protected-resource/mcp | python3 -m json.tool
```

Expected: birinchisida `issuer`, `authorization_endpoint` (`…/authorize`), `token_endpoint`, `registration_endpoint`, `code_challenge_methods_supported: ["S256"]`; ikkinchisida `resource` (`…/mcp`) va `authorization_servers`.

- [ ] **Step 5: To'liq OAuth oqimini qo'lda o'tkazish**

```bash
# 1. Klient ro'yxatdan o'tadi
CLIENT=$(curl -s -X POST http://localhost:3000/register -H 'Content-Type: application/json' \
  -d '{"client_name":"Test konnektor","redirect_uris":["http://localhost:9999/cb"]}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["client_id"])')
echo "client_id=$CLIENT"

# 2. PKCE juftligi
VERIFIER=$(python3 -c "import secrets,base64;print(base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip('='))")
CHALLENGE=$(python3 -c "
import hashlib,base64,sys
print(base64.urlsafe_b64encode(hashlib.sha256('$VERIFIER'.encode()).digest()).decode().rstrip('='))")

# 3. Rozilik sahifasini oching (brauzerda)
echo "http://localhost:3000/authorize?response_type=code&client_id=$CLIENT&redirect_uri=http://localhost:9999/cb&code_challenge=$CHALLENGE&code_challenge_method=S256&state=xyz"
```

Brauzerda ochib, admin login/parolni kiriting va nom yozing. `http://localhost:9999/cb?code=…&state=xyz` ga yo'naltiriladi (sahifa ochilmaydi — manzil satridagi `code` ni oling).

```bash
# 4. Kodni tokenga almashtirish
CODE=<manzildan olingan code>
curl -s -X POST http://localhost:3000/token -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "grant_type=authorization_code&code=$CODE&client_id=$CLIENT&redirect_uri=http://localhost:9999/cb&code_verifier=$VERIFIER" | python3 -m json.tool
```

Expected: `access_token` (`prod_…`), `token_type: "Bearer"`, `expires_in: 2592000`, `refresh_token`.

```bash
# 5. Access token bilan /mcp
ACCESS=<yuqoridagi access_token>
curl -s -X POST http://localhost:3000/mcp -H "Authorization: Bearer $ACCESS" \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"catalog_stats","arguments":{}}}' | head -c 600

# 6. Refresh token admin API'ga KIRMASLIGI kerak
REFRESH=<yuqoridagi refresh_token>
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/admin/products -H "Authorization: Bearer $REFRESH"

# 7. Kod ikkinchi marta ishlamasligi kerak
curl -s -X POST http://localhost:3000/token -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "grant_type=authorization_code&code=$CODE&client_id=$CLIENT&redirect_uri=http://localhost:9999/cb&code_verifier=$VERIFIER"

# 8. Refresh grant yangi access berishi kerak
curl -s -X POST http://localhost:3000/token -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "grant_type=refresh_token&refresh_token=$REFRESH&client_id=$CLIENT" | python3 -m json.tool
```

Expected: 5 — katalog sonlari; **6 — `401`**; 7 — `invalid_grant` xatosi; 8 — yangi `access_token`.

Noto'g'ri `code_verifier` bilan ham sinang — `invalid_grant` bo'lishi shart.

- [ ] **Step 6: Admin'da token ro'yxatini ko'rish**

Admin → Sozlamalar → Integratsiyalar → «MCP tokenlari». Rozilik ekranida yozgan nom `Konnektor` turi bilan ko'rinishi va «Bekor qilish» ishlashi kerak. Bekor qilgandan keyin `/mcp` o'sha token bilan `401` berishi shart:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3000/mcp -H "Authorization: Bearer $ACCESS" \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Expected: `401`.

> Agar ro'yxatda `kind` ustuni ko'rinmasa yoki `refresh` qatorlari chalkashtirsa — `SettingsIntegrations.tsx` dagi ro'yxatni `kind != 'refresh'` bo'yicha filtrlash kerak bo'ladi (`api.admin.tokens.tsx` loader'ida). Shu holatda o'sha filtrni qo'shing va commit xabarida yozing.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -F - <<'EOF'
feat(oauth): mcpAuthRouter ulandi — claude.ai konnektori (4-bosqich)

SDK'ning avtorizatsiya router'i ilova ildiziga ulanadi: metadata,
/register, /authorize, /token, /revoke va PKCE S256 tekshiruvi undan.
`PUBLIC_URL` bo'lmasa OAuth ulanmaydi va bu haqda log yoziladi — bearer
token bilan /mcp baribir ishlayveradi.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

## Task 7: Hujjatlar va jonli tekshirish

**Files:**
- Modify: `mcp/README.md`
- Modify: `CLAUDE.md`
- Modify: `docs/egasi-qollanmasi.md`
- Modify: `docs/superpowers/specs/2026-09-21-admin-mcp-design.md` (§5 va §14 yangilanadi)

- [ ] **Step 1: `mcp/README.md` ga remote bo'limi**

Mavjud stdio yo'riqnomasidan keyin qo'shing:

```markdown
## Remote ulanish (claude.ai, telefon)

Claude Code o'rnatish shart emas.

1. claude.ai → Settings → Connectors → **Add custom connector**
2. Manzil: `https://<sayt>/mcp`
3. Ochilgan sahifada admin login va parolni kiriting, ulanishga nom bering
   (masalan «Javlonning telefoni») va «Ruxsat berish»ni bosing.

Ulanish admin → Sozlamalar → Integratsiyalar → «MCP tokenlari» ro'yxatida
ko'rinadi va o'sha yerdan bekor qilinadi.

**Farqi:** remote'da `image_upload_from_path` yo'q — serverda sizning
fayllaringiz yo'q. Rasm faqat `https` havola orqali (`image_upload_from_url`).

**Server sozlamasi:** `PUBLIC_URL=https://<sayt>` bo'lishi shart, aks holda OAuth
ulanmaydi (log'da yoziladi) va faqat qo'lda yaratilgan token bilan ishlaydi.
```

- [ ] **Step 2: `CLAUDE.md` dagi «Admin MCP» bo'limini yangilash**

`Spec: …(4 bosqich; 1–2 bajarildi, 3 — remote /mcp, 4 — OAuth).` qatorini almashtiring:

```markdown
Spec: `docs/superpowers/specs/2026-09-21-admin-mcp-design.md`, reja:
`docs/superpowers/plans/2026-09-21-admin-mcp-remote-oauth.md` (4 bosqich, **hammasi bajarildi**).
```

«Tool'lar (11)» bandidan keyin yangi band qo'shing:

```markdown
- **Ikki transport, bitta tool to'plami:** lokal `mcp/stdio.ts` (11 ta tool) va remote
  `POST /mcp` (10 ta — `image_upload_from_path` yo'q, serverda odamning fayllari yo'q).
  Umumiy qism `shared/mcp-register.ts` + `shared/mcp-client.ts` + `shared/err-text.ts` da,
  chunki **Docker image faqat `build/`, `server/`, `shared/`, `migrations/` ni tashiydi** —
  `mcp/` va `src/` u yerda yo'q. Remote transport **stateless**: har so'rovda yangi
  `McpServer` + `StreamableHTTPServerTransport`, tool'lar o'z saytining `/api/admin/*` ini
  so'rovchi tokeni bilan chaqiradi.
- **OAuth (`server/oauth-provider.ts`, migratsiya `0040`):** claude.ai konnektori uchun.
  Endpoint'lar qo'lda yozilmagan — `@modelcontextprotocol/sdk` ning `mcpAuthRouter`i
  ilova ildiziga ulanadi (`/authorize`, `/token`, `/register`, `/revoke`,
  `/.well-known/oauth-*`) va PKCE `S256` ni o'zi tekshiradi; bizdan `OAuthServerProvider`
  (SQLite) va rozilik sahifasi (`server/oauth-consent.ts` — oddiy server HTML, gate
  admin paroli va login throttle'i). Berilgan tokenlar `admin_tokens` ga tushadi:
  access `kind='oauth'`, refresh `kind='refresh'` — **refresh token admin API'ga
  kirmaydi** (`requireAdmin` va `createTokenVerifier` uni rad etadi). `PUBLIC_URL`
  bo'lmasa OAuth ulanmaydi.
```

- [ ] **Step 3: Egasi qo'llanmasiga qisqa bo'lim**

`docs/egasi-qollanmasi.md` ga MCP haqida bo'lim qo'shing (yoki mavjudini to'ldiring) — 1-qadamdan 3-qadamgacha, Step 1 dagi matn bilan bir xil, texnik atamasiz.

- [ ] **Step 4: Spec'ni haqiqatga moslash**

`docs/superpowers/specs/2026-09-21-admin-mcp-design.md` §5 ning endpoint ro'yxati ostiga qo'shing:

```markdown
> **Bajarilganda o'zgargan qaror (2026-09-21):** endpoint'lar `app/routes.ts` da qo'lda
> yozilmadi. `@modelcontextprotocol/sdk` ichida tayyor `mcpAuthRouter` bor — u aynan shu
> ro'yxatni (metadata, `/register`, `/authorize`, `/token`, `/revoke`) Express router
> sifatida beradi va PKCE `S256` ni `pkce-challenge` bilan o'zi tekshiradi. Shuning uchun
> yo'llar `/oauth/authorize` emas, SDK standarti bo'yicha `/authorize`; bizdan
> `OAuthServerProvider` va rozilik sahifasi qoldi. Yangi dependency qo'shilmadi.
```

§14 ro'yxatida bajarilganlarini belgilang (4 va 9 — bajarildi; 3 — OAuth access tokeni
`expires_at` yozadi, qo'lda tokenda hamon bo'sh) va qolganlarini **ochiq** deb qoldiring.

- [ ] **Step 5: Jonli tekshirish — deploy va claude.ai**

Bu qadam **egasi bilan birga** bajariladi va push talab qiladi — avval ruxsat so'rang.

1. Coolify'da `PUBLIC_URL=https://productstore.uz` muhit o'zgaruvchisini qo'shing.
2. Branch'ni main'ga yuboring (ruxsat olingach), deploy tugashini kuting.
3. Tekshiring:

```bash
curl -s https://productstore.uz/.well-known/oauth-protected-resource/mcp | python3 -m json.tool
curl -s -i -X POST https://productstore.uz/mcp -H 'Content-Type: application/json' -d '{}' | head -5
```

Expected: metadata JSON; `/mcp` — `401` + `WWW-Authenticate` da `resource_metadata` mutlaq manzil bilan.

4. claude.ai → Connectors → Add custom connector → `https://productstore.uz/mcp` → rozilik
   sahifasida admin paroli → chatda «katalog holatini ko'rsat» deb so'rang.

Expected: `catalog_stats` natijasi. Token admin → Integratsiyalar → «MCP tokenlari» da ko'rinadi.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -F - <<'EOF'
docs: remote MCP va OAuth — README, CLAUDE.md, egasi qo'llanmasi

Spec §5 dagi qo'lda yozilgan endpoint ro'yxati SDK'ning mcpAuthRouter'i
bilan almashgani yozildi; §14 dagi bajarilgan bandlar belgilandi.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

## Ochiq qolgan bandlar (spec §14 dan — bu rejaga kirmaydi)

Ular remote transport bilan **yomonlashmaydi** (gate baribir admin paroli), shuning uchun ataylab qoldirildi:

1. **§14.1 + §14.2** — `admin_audit` qatori handler ishlamasdan oldin yoziladi va `target_id` `POST`da yo'lning oxirgi bo'lagi (`products`) bo'ladi. To'g'ri tuzatish guard'dan keyin yozishni talab qiladi, ya'ni ~20 ta route'ga tegish — alohida ish.
2. **§14.3** — qo'lda yaratilgan tokenda `expires_at` hamon bo'sh va UI'da maydon yo'q (OAuth tokeni yozadi).
3. **§14.5** — `image_upload_from_path` papka bilan chegaralanmagan (`PRODUCT_IMAGE_ROOT`); faqat stdio'ga tegishli, ya'ni odamning o'z kompyuteri.
4. **§14.6** — `product_get` ga na `id`, na `q` berilmasa birinchi 10 ta tovar qaytadi.
5. **§14.7** — `DELETE /api/admin/tokens/:id` raqamsiz id'da ham `{ok:true}`.
6. **SSRF** — `isSafeImageUrl` nom darajasida ishlaydi, DNS rebinding'ni to'xtatmaydi (fayl izohida yozilgan).

---

## Self-Review

**Spec coverage:**

| Spec bandi | Task |
|---|---|
| §3 ikki transport, bitta tool to'plami, remote'da fayl tool'i yo'q | 1, 3 |
| §3 `mcp/` image'ga tushmaydi — kerakli qism `server/mcp.ts` + `shared/` | 1, 3 |
| §5 metadata (RFC 9728 + RFC 8414) | 6 (SDK router) |
| §5 `/register` dinamik klient, public + PKCE | 5 (`registerClient`), 6 |
| §5 `/authorize` login + rozilik + nom maydoni | 5 |
| §5 `/token` authorization_code (PKCE) + refresh | 5 |
| §5 `/mcp` 401 + `WWW-Authenticate` | 3 |
| §5 `oauth_clients`, `oauth_codes` — migratsiya 0040, kod 10 daqiqa bir martalik | 4, 5 |
| §5 OAuth tokenlari `admin_tokens` ga `kind='oauth'` | 5 |
| §9 rate limit 60/daqiqa/IP | 3 |
| §9 PKCE S256 majburiy, redirect_uri aniq moslik, kod bir martalik | 4, 5, 6 |
| §11 3-bosqich mustaqil ishlaydi | 3 (Step 7 da tekshiriladi) |
| §14.4 rasm havolasi mustahkamlanadi | 2 |
| §14.9 type-stripping lintga bog'lanadi | 3 |

Qoplanmagan spec bandi yo'q; ataylab qoldirilganlar yuqorida ro'yxatlangan.

**Placeholder scan:** bajarildi — «TODO», «shunga o'xshash», «kerakli xatolarni qo'shing» kabi qatorlar yo'q. Yagona ko'chirma joy — Task 1 Step 4 dagi «bugungi 10 ta `registerTool` bloki o'zgarishsiz ko'chiriladi»: bu ataylab, chunki kod mavjud faylda turibdi va uni qayta yozish nusxa xatosi xavfini oshiradi.

**Type consistency:** `McpToolHost` Task 1 da aniqlanadi, Task 3 da `registerSharedTools` shu tip bilan chaqiriladi. `AuthInfo` Task 3 (`createTokenVerifier`) va Task 5 (`verifyAccessToken`) da bir xil. `hashToken`/`newToken` hamma joyda `shared/mcp-auth.ts` dan. `ACCESS_TTL`/`CODE_TTL` Task 4 da aniqlanib 5 da ishlatiladi. `MAX_IMAGE` Task 1 da `shared/mcp-register.ts` dan eksport qilinadi va Task 1 Step 5 (`mcp/tools.ts`) hamda Task 2 Step 5 da ishlatiladi.
