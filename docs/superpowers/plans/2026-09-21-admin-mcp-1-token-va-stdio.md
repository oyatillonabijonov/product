# Admin MCP — 1-reja: tokenlar va lokal (stdio) server

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Claude'ga ulanadigan lokal MCP server — ruxsat berilgan odam o'z kompyuteridan «bu papkadagi rasmlarni shu izoh va narx bilan joyla» va «qaysi tovarlarda ma'lumot yetishmayapti» deya olsin.

**Architecture:** MCP hech qanday SQL yozmaydi — har tool mavjud `/api/admin/*` ni `Authorization: Bearer` bilan chaqiradi, ya'ni `parseProductInput`, `ensureUniqueSlug`, `typeExists` va atomik `env.DB.batch()` o'z joyida qoladi. Token `admin_tokens` jadvalida **hash** holida; `requireAdmin` cookie'dan tashqari bearer'ni ham qabul qiladi va har yozuv amalini `admin_audit`ga yozadi. Sof mantiq (statistika, yetishmayotgan maydonlar, qulf hisobi, fayl filtri) `shared/`da va testli; MCP SDK va fayl tizimi faqat `mcp/` ichida.

**Tech Stack:** TypeScript (strict, `any` yo'q), Node 22 type-stripping, `@modelcontextprotocol/sdk`, `zod`, vitest, bun, SQLite.

**Spec:** `docs/superpowers/specs/2026-09-21-admin-mcp-design.md` (1–2-bosqich; 3–4-bosqich — remote `/mcp` va OAuth — alohida reja).

## Global Constraints

- Javoblar, izohlar va admin matnlari **o'zbekcha**; admin UI faqat o'zbekcha.
- Strict TypeScript, **`any` yo'q**. `@types/react` yo'q: `useState(x as T)` + o'qishda cast, hook generiklari ishlatilmaydi, `key` faqat `FC<{…}>` komponentda.
- Dizayn tokenlari: hex rang yozilmaydi (`white` va `#25D366` istisno), `text-[Npx]` yo'q, `shadow-*` yo'q, bosiladigan elementda `press`, admin'da `bg-white`/`text-white` yo'q.
- `bun` ishlatiladi, `npm` emas. Har task oxirida `bun run lint && bun run test` yashil.
- **Mavjud migratsiya fayllari o'zgartirilmaydi**; yangi migratsiya — `0039`.
- `shared/` fayllari `mcp/` va `server/`dan import qilinganda **`.ts` kengaytmasi bilan** yoziladi (Node type-stripping talabi), `app/` va `functions/`dan — kengaytmasiz.
- Vitest faqat `src/`, `app/`, `functions/`, `shared/` ichidagi `*.test.ts` fayllarini oladi (`vitest.config.ts`) — shuning uchun sinaladigan mantiq `shared/`da turadi.
- Commit trailer: `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- `git add -A` **ishlatilmaydi** — fayllar nomma-nom qo'shiladi.
- Sirlar hech qachon javobga tushmaydi; token qiymati faqat yaratilgan paytda bir marta qaytadi.

## Fayl xaritasi

- Yangi: `migrations/0039_mcp_tokens.sql` · `shared/mcp-auth.ts` (+`.test.ts`) · `shared/mcp-tools.ts` (+`.test.ts`) · `app/routes/api.admin.tokens.tsx` · `app/routes/api.admin.tokens.$id.tsx` · `mcp/client.ts` · `mcp/tools.ts` · `mcp/stdio.ts` · `mcp/README.md`
- O'zgaradi: `app/routes/api.admin.guard.ts` (bearer + jurnal) · `app/routes.ts` · `shared/types.ts` (`ApiAdminToken`) · `src/admin/api.ts` · `src/admin/errText.ts` · `src/admin/screens/SettingsIntegrations.tsx` · `package.json` · `CLAUDE.md`

---

### Task 1: Migratsiya, token yadrosi va `requireAdmin` bearer

**Files:**
- Create: `migrations/0039_mcp_tokens.sql`
- Create: `shared/mcp-auth.ts`
- Test: `shared/mcp-auth.test.ts`
- Modify: `app/routes/api.admin.guard.ts`

**Interfaces:**
- Consumes: `functions/lib/db.ts` `json()`, `functions/lib/auth.ts` `getCookie`/`verifySession`, `Env` (`shared/runtime.ts` orqali `functions/env`).
- Produces: `newToken()`, `hashToken(token)`, `tokenFromHeader(header)` (`shared/mcp-auth.ts`); `requireAdmin` endi `Authorization: Bearer prod_…` bilan ham ishlaydi va token nomini (`label`) qaytaradi.

- [ ] **Step 1: Migratsiya**

`migrations/0039_mcp_tokens.sql`:

```sql
-- MCP tokenlari: Claude orqali admin API'ga kiradigan nomli kalitlar.
-- Token qiymati bazada saqlanmaydi — faqat SHA-256 hash, shuning uchun bazani o'qigan
-- odam ham token bilan kira olmaydi. Bekor qilish — `revoked_at`.
-- `kind`: 'manual' — admin'da qo'lda yaratilgan; 'oauth' — konnektor bergan (migratsiya 0040).
CREATE TABLE IF NOT EXISTS admin_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL DEFAULT 'manual',
  client_id TEXT,
  expires_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_used_at INTEGER,
  revoked_at INTEGER
);

-- Yozuv amallari jurnali: tokenlar to'liq admin huquqiga ega, shuning uchun
-- kim (token nomi) qaysi tool bilan nimani o'zgartirgani yozilib turadi.
CREATE TABLE IF NOT EXISTS admin_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL DEFAULT (unixepoch()),
  token_label TEXT NOT NULL,
  tool TEXT NOT NULL,
  target_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_at ON admin_audit(at DESC);
```

- [ ] **Step 2: Migratsiyani qo'llash**

Run: `bun run migrate`
Expected: `✓ 0039_mcp_tokens.sql`.

Run: `sqlite3 data/store.db "SELECT name FROM sqlite_master WHERE name IN ('admin_tokens','admin_audit');"`
Expected: ikkala nom ham chiqadi.

- [ ] **Step 3: Yiqiladigan testni yozing**

`shared/mcp-auth.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { hashToken, newToken, tokenFromHeader } from './mcp-auth';

describe('newToken', () => {
  it("`prod_` prefiksi va 64 hex belgi, har chaqiruvda boshqacha", () => {
    const a = newToken();
    expect(a).toMatch(/^prod_[0-9a-f]{64}$/);
    expect(a).not.toBe(newToken());
  });
});

describe('hashToken', () => {
  it('bir xil token — bir xil hash; bitta belgi farq qilsa — boshqa hash', async () => {
    const h = await hashToken('prod_abc');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashToken('prod_abc')).toBe(h);
    expect(await hashToken('prod_abd')).not.toBe(h);
  });
});

describe('tokenFromHeader', () => {
  it("faqat `Bearer prod_…` qabul qilinadi", () => {
    expect(tokenFromHeader('Bearer prod_x')).toBe('prod_x');
    expect(tokenFromHeader('bearer prod_x')).toBe('prod_x');
    expect(tokenFromHeader('  Bearer   prod_x  ')).toBe('prod_x');
  });

  it("boshqa sxema, boshqa prefiks va bo'sh qiymat — `null` (cookie yo'liga tushadi)", () => {
    expect(tokenFromHeader('Bearer boshqa')).toBe(null);
    expect(tokenFromHeader('Basic prod_x')).toBe(null);
    expect(tokenFromHeader('')).toBe(null);
    expect(tokenFromHeader(null)).toBe(null);
  });
});
```

- [ ] **Step 4: Testni ishga tushiring — yiqilishi kerak**

Run: `bunx vitest run shared/mcp-auth.test.ts`
Expected: FAIL — `Failed to resolve import "./mcp-auth"`.

- [ ] **Step 5: Modulni yozing**

`shared/mcp-auth.ts`:

```ts
/**
 * MCP tokenlari — sof qism: yaratish, hash, sarlavhadan ajratish.
 *
 * Token bazada **hash** holida turadi (`admin_tokens.token_hash`), qiymatning o'zi faqat
 * yaratilgan javobda bir marta ko'rinadi. Token 32 bayt tasodifdan iborat, ya'ni yuqori
 * entropiyali — parol emas, shuning uchun PBKDF2 shart emas, SHA-256 yetarli.
 */

const PREFIX = 'prod_';

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Yangi token: `prod_` + 64 hex belgi. */
export function newToken(): string {
  return PREFIX + hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
}

/** Bazaga yoziladigan hash (hex, kichik harf). */
export async function hashToken(token: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)));
}

/**
 * `Authorization: Bearer prod_…` dan tokenni ajratadi. Sxema registrsiz.
 * Prefiksi boshqa qiymat `null` qaytaradi — bu so'rov cookie yo'li bilan tekshiriladi
 * (masalan mijoz sessiyasining bearer'i admin guard'iga tushib qolmasin).
 */
export function tokenFromHeader(header: string | null | undefined): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(\S+)$/i.exec(header.trim());
  if (!m) return null;
  return m[1].startsWith(PREFIX) ? m[1] : null;
}
```

- [ ] **Step 6: Test yashil**

Run: `bunx vitest run shared/mcp-auth.test.ts`
Expected: PASS (3 test).

- [ ] **Step 7: `requireAdmin` — bearer va jurnal**

`app/routes/api.admin.guard.ts` to'liq shu holatga keltiriladi (mavjud `parseBody` o'zgarmaydi):

```ts
import type { Env } from '../../functions/env';
import { json, loadAdminAuth } from '../../functions/lib/db';
import { getCookie, verifySession } from '../../functions/lib/auth';
import { ValidationError } from '../../functions/lib/validate';
import { hashToken, tokenFromHeader } from '../../shared/mcp-auth';

/**
 * Body'ni parse qiladi; ValidationError'ni 400 Response'ga aylantiradi.
 * Chaqiruvchi `if (x instanceof Response) return x;` bilan tekshiradi (requireAdmin kabi).
 */
export function parseBody<T>(body: unknown, parse: (b: unknown) => T): T | Response {
  try {
    return parse(body);
  } catch (e) {
    if (e instanceof ValidationError) return json({ error: e.message }, { status: 400 });
    throw e;
  }
}

/**
 * MCP tokeni bilan kirish (`Authorization: Bearer prod_…`).
 *
 * Token to'liq admin huquqiga ega (egasining qarori 2026-09-21), shuning uchun har bir
 * **yozuv** amali `admin_audit`ga tushadi: kim (token nomi), qaysi tool, qaysi yozuv.
 * Tool nomini MCP `X-MCP-Tool` sarlavhasida yuboradi; bo'lmasa metod va yo'l yoziladi.
 */
async function adminFromToken(request: Request, env: Env, token: string): Promise<string | Response> {
  const row = await env.DB.prepare(
    'SELECT id, label, expires_at FROM admin_tokens WHERE token_hash = ? AND revoked_at IS NULL',
  )
    .bind(await hashToken(token))
    .first<{ id: number; label: string; expires_at: number | null }>();
  const now = Math.floor(Date.now() / 1000);
  if (!row || (row.expires_at !== null && row.expires_at < now)) {
    return json({ error: 'unauthorized' }, { status: 401 });
  }
  await env.DB.prepare('UPDATE admin_tokens SET last_used_at = ? WHERE id = ?').bind(now, row.id).run();
  if (request.method !== 'GET') {
    const url = new URL(request.url);
    const tool = (request.headers.get('x-mcp-tool') ?? `${request.method} ${url.pathname}`).slice(0, 60);
    await env.DB.prepare('INSERT INTO admin_audit (at, token_label, tool, target_id) VALUES (?, ?, ?, ?)')
      .bind(now, row.label, tool, url.pathname.split('/').pop() ?? null)
      .run();
  }
  return row.label;
}

export async function requireAdmin(request: Request, env: Env): Promise<string | Response> {
  // Bearer birinchi: MCP so'rovida cookie umuman bo'lmaydi.
  const bearer = tokenFromHeader(request.headers.get('authorization'));
  if (bearer) return adminFromToken(request, env, bearer);
  const token = getCookie(request, 'session');
  if (!token) return json({ error: 'unauthorized' }, { status: 401 });
  const auth = await loadAdminAuth(env);
  if (!auth) return json({ error: 'unauthorized' }, { status: 401 });
  const username = await verifySession(token, auth.sessionSecret, Math.floor(Date.now() / 1000));
  if (!username) return json({ error: 'unauthorized' }, { status: 401 });
  return username;
}
```

- [ ] **Step 8: Lint va test**

Run: `bun run lint && bun run test`
Expected: lint 0 xato; hamma test yashil (oldingi soni + 3).

- [ ] **Step 9: Commit**

```bash
git add migrations/0039_mcp_tokens.sql shared/mcp-auth.ts shared/mcp-auth.test.ts app/routes/api.admin.guard.ts
git commit -m "$(cat <<'MSG'
feat(mcp): nomli tokenlar va bearer bilan admin kirishi

`admin_tokens` (hash holida) va `admin_audit` jadvallari; `requireAdmin` endi
`Authorization: Bearer prod_…` ni ham qabul qiladi va har yozuv amalini jurnalga
yozadi (tool nomi `X-MCP-Tool` sarlavhasidan).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 2: Token API va admin ekrani

**Files:**
- Create: `app/routes/api.admin.tokens.tsx`
- Create: `app/routes/api.admin.tokens.$id.tsx`
- Modify: `app/routes.ts`, `shared/types.ts`, `src/admin/api.ts`, `src/admin/errText.ts`, `src/admin/screens/SettingsIntegrations.tsx`

**Interfaces:**
- Consumes: 1-taskdagi `newToken`/`hashToken`, `requireAdmin`, `parseBody`.
- Produces: `GET/POST /api/admin/tokens`, `DELETE /api/admin/tokens/:id`; `ApiAdminToken` tipi; admin klientida `listTokens`/`createToken`/`revokeToken`.

- [ ] **Step 1: API tipi**

`shared/types.ts` — `ApiAdminToken` qo'shiladi (fayl oxiriga, `ApiReview`dan oldin yoki keyin — tartib muhim emas):

```ts
export interface ApiAdminToken {
  id: number;
  label: string;
  /** `manual` — admin'da qo'lda yaratilgan; `oauth` — konnektor bergan. */
  kind: 'manual' | 'oauth';
  createdAt: number;
  lastUsedAt: number | null;
}
```

- [ ] **Step 2: Ro'yxat va yaratish route'i**

`app/routes/api.admin.tokens.tsx`:

```tsx
import type { Route } from './+types/api.admin.tokens';
import { json } from '../../functions/lib/db';
import { ValidationError } from '../../functions/lib/validate';
import { hashToken, newToken } from '../../shared/mcp-auth';
import type { ApiAdminToken } from '../../shared/types';
import { parseBody, requireAdmin } from './api.admin.guard';

interface TokenRow {
  id: number;
  label: string;
  kind: string;
  created_at: number;
  last_used_at: number | null;
}

const rowToToken = (r: TokenRow): ApiAdminToken => ({
  id: r.id,
  label: r.label,
  kind: r.kind === 'oauth' ? 'oauth' : 'manual',
  createdAt: r.created_at,
  lastUsedAt: r.last_used_at,
});

/** Nom 2–40 belgi: jurnalda va ro'yxatda shu ko'rinadi. */
function parseTokenInput(body: unknown): { label: string } {
  const o = (body ?? {}) as Record<string, unknown>;
  const label = typeof o.label === 'string' ? o.label.trim() : '';
  if (label.length < 2 || label.length > 40) throw new ValidationError('label_required');
  return { label };
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const who = await requireAdmin(request, context.env);
  if (who instanceof Response) return who;
  const { results } = await context.env.DB.prepare(
    'SELECT id, label, kind, created_at, last_used_at FROM admin_tokens WHERE revoked_at IS NULL ORDER BY created_at DESC',
  ).all<TokenRow>();
  return json(results.map(rowToToken));
}

export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });
  const who = await requireAdmin(request, context.env);
  if (who instanceof Response) return who;
  const input = parseBody(await request.json().catch(() => null), parseTokenInput);
  if (input instanceof Response) return input;
  const token = newToken();
  await context.env.DB.prepare('INSERT INTO admin_tokens (label, token_hash, kind) VALUES (?, ?, ?)')
    .bind(input.label, await hashToken(token), 'manual')
    .run();
  // Token faqat shu javobda ko'rinadi — bazada hash qoladi.
  return json({ token });
}
```

- [ ] **Step 3: Bekor qilish route'i**

`app/routes/api.admin.tokens.$id.tsx`:

```tsx
import type { Route } from './+types/api.admin.tokens.$id';
import { json } from '../../functions/lib/db';
import { requireAdmin } from './api.admin.guard';

/** Bekor qilish — qator o'chirilmaydi, `revoked_at` qo'yiladi (jurnal nomi bilan bog'liq qoladi). */
export async function action({ request, params, context }: Route.ActionArgs) {
  if (request.method !== 'DELETE') return json({ error: 'method_not_allowed' }, { status: 405 });
  const who = await requireAdmin(request, context.env);
  if (who instanceof Response) return who;
  await context.env.DB.prepare(
    'UPDATE admin_tokens SET revoked_at = unixepoch() WHERE id = ? AND revoked_at IS NULL',
  )
    .bind(Number(params.id))
    .run();
  return json({ ok: true });
}
```

- [ ] **Step 4: Route'larni ro'yxatdan o'tkazing**

`app/routes.ts` — `api/admin/account` qatoridan keyin:

```ts
  route('api/admin/tokens', 'routes/api.admin.tokens.tsx'),
  route('api/admin/tokens/:id', 'routes/api.admin.tokens.$id.tsx'),
```

- [ ] **Step 5: Admin klienti va xato matni**

`src/admin/api.ts` — Billz bo'limidan keyin:

```ts
// ── MCP tokenlari ───────────────────────────────────────────────────────────
export async function listTokens(): Promise<ApiAdminToken[]> {
  return handle(await fetch('/api/admin/tokens'));
}
/** Javobdagi token **bir marta** keladi — keyin bazada faqat hash qoladi. */
export async function createToken(label: string): Promise<{ token: string }> {
  return handle(await fetch('/api/admin/tokens', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ label }),
  }));
}
export async function revokeToken(id: number): Promise<void> {
  await handle(await fetch(`/api/admin/tokens/${id}`, { method: 'DELETE' }));
}
```

`ApiAdminToken` importini fayl boshidagi `shared/types` ro'yxatiga qo'shing.

`src/admin/errText.ts` — `MESSAGES` ichiga:

```ts
  label_required: "Nom 2–40 belgi bo'lishi kerak",
  method_not_allowed: "Bu amal qo'llab-quvvatlanmaydi",
```

- [ ] **Step 6: «MCP tokenlari» kartasi**

`src/admin/screens/SettingsIntegrations.tsx` — Analitika kartasidan **keyin**, `</div>` yopilishidan oldin qo'shiladi. Komponent ichiga holat qo'shiladi:

```tsx
  const [rawTokens, setTokens] = useState([] as ApiAdminToken[]);
  const tokens = rawTokens as ApiAdminToken[];
  const [tokenLabel, setTokenLabel] = useState('');
  const [rawFresh, setFresh] = useState('');
  const fresh = rawFresh as string;
  const [tokenBusy, setTokenBusy] = useState(false);

  useEffect(() => { listTokens().then(setTokens).catch(() => undefined); }, []);

  async function addToken() {
    setTokenBusy(true);
    try {
      const { token } = await createToken(tokenLabel as string);
      setFresh(token);
      setTokenLabel('');
      setTokens(await listTokens());
      toast('Token yaratildi — nusxa oling, u boshqa ko\'rsatilmaydi');
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setTokenBusy(false);
    }
  }

  async function removeToken(t: ApiAdminToken) {
    const ok = await confirm({
      title: `«${t.label}» tokenini bekor qilish`,
      message: 'Shu token bilan ulangan Claude darhol kirolmay qoladi. Qaytarib bo\'lmaydi.',
      confirmLabel: 'Bekor qilish',
      destructive: true,
    });
    if (!ok) return;
    try {
      await revokeToken(t.id);
      setTokens(await listTokens());
      toast('Token bekor qilindi');
    } catch (e) {
      toast(errText(e), 'error');
    }
  }
```

Karta:

```tsx
            <Card
              title="MCP tokenlari"
              description="Claude shu token bilan admin API'ga ulanadi va sizning nomingizdan tovar qo'sha oladi. Har odamga alohida token bering."
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-end gap-3">
                  <Field label="Nomi" hint="Jurnalda shu nom ko'rinadi" className="min-w-[220px] flex-1">
                    <Input value={tokenLabel as string} onChange={setTokenLabel} placeholder="Javlon aka" />
                  </Field>
                  <Button onClick={addToken} disabled={tokenBusy || (tokenLabel as string).trim().length < 2}>
                    {tokenBusy ? 'Yaratilmoqda…' : 'Token yaratish'}
                  </Button>
                </div>

                {fresh !== '' && (
                  <div className="rounded-sm border border-line bg-bg p-3">
                    <p className="text-label text-muted-2">Faqat hozir ko'rinadi — nusxa olib qo'ying:</p>
                    <p className="mt-1 break-all text-para text-primary">{fresh}</p>
                  </div>
                )}

                {tokens.length === 0
                  ? <p className="text-para text-muted">Hali token yaratilmagan.</p>
                  : (
                    <ul className="flex flex-col">
                      {tokens.map((t) => (
                        <li key={t.id} className="flex items-center justify-between gap-4 border-t border-line py-2.5">
                          <div className="min-w-0">
                            <p className="text-para text-primary">{t.label}</p>
                            <p className="text-label text-muted-2">
                              {t.kind === 'oauth' ? 'Konnektor' : "Qo'lda"}
                              {' · '}
                              {t.lastUsedAt === null ? 'ishlatilmagan' : `oxirgi: ${formatDateTime(t.lastUsedAt)}`}
                            </p>
                          </div>
                          <Button variant="quiet" onClick={() => removeToken(t)}>Bekor qilish</Button>
                        </li>
                      ))}
                    </ul>
                  )}
              </div>
            </Card>
```

Importlar: `listTokens, createToken, revokeToken` — `../api`dan; `ApiAdminToken` — `../../../shared/types`dan; `formatDateTime` — `../lib/format`dan; `useConfirm` — `../ui/confirm`dan (`const confirm = useConfirm();` komponent boshida).

- [ ] **Step 7: Lint va test**

Run: `bun run lint && bun run test`
Expected: lint 0 xato, testlar yashil.

- [ ] **Step 8: Commit**

```bash
git add app/routes/api.admin.tokens.tsx app/routes/api.admin.tokens.\$id.tsx app/routes.ts shared/types.ts src/admin/api.ts src/admin/errText.ts src/admin/screens/SettingsIntegrations.tsx
git commit -m "$(cat <<'MSG'
feat(admin): MCP tokenlarini yaratish va bekor qilish

Sozlamalar → Integratsiyalar'da «MCP tokenlari» kartasi: nom bilan yaratish
(qiymat bir marta ko'rsatiladi), ro'yxat va bekor qilish. API — GET/POST
/api/admin/tokens va DELETE /api/admin/tokens/:id.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 3: Tool mantig'i (sof, testli)

**Files:**
- Create: `shared/mcp-tools.ts`
- Test: `shared/mcp-tools.test.ts`

**Interfaces:**
- Consumes: `ApiProduct` (`shared/types.ts`), `ManualField`/`parseManualFields` (`shared/billz.ts`).
- Produces: `catalogStats(items)`, `incompleteProducts(items, opts)`, `manualFieldsFor(current, patch)`, `imageFilesOf(names)` — `mcp/tools.ts` shularni chaqiradi.

- [ ] **Step 1: Yiqiladigan test**

`shared/mcp-tools.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { ApiProduct } from './types';
import { catalogStats, imageFilesOf, incompleteProducts, manualFieldsFor } from './mcp-tools';

const p = (over: Partial<ApiProduct>): ApiProduct => ({
  id: 'x', name: 'Tovar', category: 'iphone', condition: 'yangi', conditionNote: null,
  cashPriceUzs: 1000, imageUrl: '/images/products/a.webp', sortOrder: 0, isActive: true,
  categoryId: 'apple', type: 'iphone', oldPriceUzs: null, brandId: 'apple', slug: null,
  minPriceUzs: 1000, ratingAvg: null, reviewCount: 0, preorder: false,
  billzId: 'b1', billzStock: 3, manualFields: [], description: null, ...over,
} as ApiProduct);

describe('catalogStats', () => {
  it('har holatni alohida sanaydi', () => {
    const s = catalogStats([
      p({ id: '1' }),
      p({ id: '2', imageUrl: '', isActive: false }),
      p({ id: '3', description: 'bor', billzStock: 0 }),
      p({ id: '4', billzId: null, billzStock: null }),
    ]);
    expect(s.total).toBe(4);
    expect(s.active).toBe(3);
    expect(s.hidden).toBe(1);
    expect(s.noImage).toBe(1);
    expect(s.noDescription).toBe(3);
    expect(s.stockZero).toBe(1);
    expect(s.billz).toBe(3);
    expect(s.manual).toBe(1);
  });
});

describe('incompleteProducts', () => {
  const items = [
    p({ id: '1', imageUrl: '', description: 'bor' }),
    p({ id: '2', description: null }),
    p({ id: '3', description: 'bor' }),
    p({ id: '4', imageUrl: '', description: null }),
  ];

  it("faqat so'ralgan yetishmovchilikni qaytaradi", () => {
    expect(incompleteProducts(items, { missing: 'image' }).items.map((x) => x.id)).toEqual(['1', '4']);
    expect(incompleteProducts(items, { missing: 'description' }).items.map((x) => x.id)).toEqual(['2', '4']);
    expect(incompleteProducts(items, { missing: 'any' }).items.map((x) => x.id)).toEqual(['1', '2', '4']);
  });

  it('nima yetishmayotganini aytadi', () => {
    expect(incompleteProducts(items, { missing: 'any' }).items[2].missing).toEqual(['image', 'description']);
  });

  it('sahifalaydi: limit va keyingi siljish', () => {
    const first = incompleteProducts(items, { missing: 'any', limit: 2 });
    expect(first.items.map((x) => x.id)).toEqual(['1', '2']);
    expect(first.nextOffset).toBe(2);
    const second = incompleteProducts(items, { missing: 'any', limit: 2, offset: 2 });
    expect(second.items.map((x) => x.id)).toEqual(['4']);
    expect(second.nextOffset).toBe(null);
  });
});

describe('manualFieldsFor', () => {
  it('tegilgan maydon uchun qulf qo\'shadi, mavjudini saqlaydi', () => {
    expect(manualFieldsFor(['description'], { cashPriceUzs: 100 })).toEqual(['price', 'description']);
    expect(manualFieldsFor([], { description: 'matn' })).toEqual(['description']);
    expect(manualFieldsFor([], { specs: [{ label: 'Rang', value: 'Qora' }] })).toEqual(['specs']);
  });

  it('tegilmagan maydon uchun qulf qo\'shmaydi', () => {
    expect(manualFieldsFor([], { name: 'Yangi nom' })).toEqual([]);
    expect(manualFieldsFor(['price'], {})).toEqual(['price']);
  });
});

describe('imageFilesOf', () => {
  it('faqat rasm kengaytmalari, nom bo\'yicha tartibda', () => {
    expect(imageFilesOf(['b.PNG', 'a.jpg', 'c.txt', 'd.webp', '.DS_Store', 'e.jpeg']))
      .toEqual(['a.jpg', 'b.PNG', 'd.webp', 'e.jpeg']);
  });
});
```

- [ ] **Step 2: Testni ishga tushiring — yiqilishi kerak**

Run: `bunx vitest run shared/mcp-tools.test.ts`
Expected: FAIL — `Failed to resolve import "./mcp-tools"`.

- [ ] **Step 3: Modulni yozing**

`shared/mcp-tools.ts`:

```ts
import { MANUAL_FIELDS, type ManualField } from './billz';
import type { ApiProduct } from './types';

/**
 * MCP tool'larining sof mantig'i. Tool'larning o'zi `mcp/tools.ts`da (MCP SDK va fayl
 * tizimi bilan), bu yerda esa faqat hisob-kitob — shuning uchun testlanadi va keyin
 * remote transport (`server/mcp.ts`) ham aynan shuni ishlatadi.
 */

export interface CatalogStats {
  total: number;
  active: number;
  hidden: number;
  noImage: number;
  noDescription: number;
  stockZero: number;
  billz: number;
  manual: number;
}

export function catalogStats(items: ApiProduct[]): CatalogStats {
  const s: CatalogStats = { total: items.length, active: 0, hidden: 0, noImage: 0, noDescription: 0, stockZero: 0, billz: 0, manual: 0 };
  for (const p of items) {
    if (p.isActive) s.active++; else s.hidden++;
    if (p.imageUrl === '') s.noImage++;
    if (!p.description || p.description.trim() === '') s.noDescription++;
    if (p.billzStock === 0) s.stockZero++;
    if (p.billzId) s.billz++; else s.manual++;
  }
  return s;
}

export type Missing = 'image' | 'description' | 'any';

export interface IncompleteItem {
  id: string;
  name: string;
  missing: ('image' | 'description')[];
}

export interface IncompleteResult {
  items: IncompleteItem[];
  /** Keyingi sahifaning boshlanish siljishi; tugagan bo'lsa `null`. */
  nextOffset: number | null;
  /** Filtrga tushgan jami tovar soni (sahifadan qat'i nazar). */
  total: number;
}

/**
 * Yetishmayotgan ma'lumotli tovarlar. Modelga butun katalog bermaslik uchun sahifalanadi
 * (sukut 20 ta) — egasining ssenariysi «nomlarini ketma-ket yubor» aynan shunday ishlaydi.
 */
export function incompleteProducts(
  items: ApiProduct[],
  opts: { missing: Missing; limit?: number; offset?: number },
): IncompleteResult {
  const limit = opts.limit && opts.limit > 0 ? opts.limit : 20;
  const offset = opts.offset && opts.offset > 0 ? opts.offset : 0;
  const all: IncompleteItem[] = [];
  for (const p of items) {
    const missing: ('image' | 'description')[] = [];
    if (p.imageUrl === '') missing.push('image');
    if (!p.description || p.description.trim() === '') missing.push('description');
    const wanted = opts.missing === 'any' ? missing.length > 0 : missing.includes(opts.missing);
    if (wanted) all.push({ id: p.id, name: p.name, missing });
  }
  const page = all.slice(offset, offset + limit);
  return { items: page, nextOffset: offset + limit < all.length ? offset + limit : null, total: all.length };
}

/** `product_update` tegadigan maydonlar — `manual_fields` kalitiga xaritasi. */
const LOCKS: { key: ManualField; touched: (patch: ProductPatch) => boolean }[] = [
  { key: 'price', touched: (p) => p.cashPriceUzs !== undefined || p.oldPriceUzs !== undefined },
  { key: 'specs', touched: (p) => p.specs !== undefined },
  { key: 'description', touched: (p) => p.description !== undefined },
];

export interface ProductPatch {
  name?: string;
  description?: string;
  cashPriceUzs?: number;
  oldPriceUzs?: number | null;
  specs?: { label: string; value: string }[];
}

/**
 * Billz tovarida qaysi maydon tegilsa, o'sha maydonning qulfi yoqiladi — aks holda
 * 30 daqiqadan keyin Billz qiymati qaytaradi (`shared/billz.ts`, `manual_fields`).
 * Tartib `MANUAL_FIELDS` bo'yicha barqaror.
 */
export function manualFieldsFor(current: ManualField[], patch: ProductPatch): ManualField[] {
  const set = new Set<ManualField>(current);
  for (const l of LOCKS) if (l.touched(patch)) set.add(l.key);
  return MANUAL_FIELDS.filter((f) => set.has(f));
}

const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp'];

/** Papkadagi fayllardan rasmlarni ajratadi va nom bo'yicha tartiblaydi (birinchisi — asosiy rasm). */
export function imageFilesOf(names: string[]): string[] {
  return names
    .filter((n) => IMAGE_EXT.some((e) => n.toLowerCase().endsWith(e)))
    .sort((a, b) => a.localeCompare(b, 'en'));
}
```

- [ ] **Step 4: Test yashil**

Run: `bunx vitest run shared/mcp-tools.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint va to'liq test**

Run: `bun run lint && bun run test`
Expected: lint 0 xato, hamma test yashil.

- [ ] **Step 6: Commit**

```bash
git add shared/mcp-tools.ts shared/mcp-tools.test.ts
git commit -m "$(cat <<'MSG'
feat(mcp): tool mantig'i — katalog statistikasi, yetishmovchilik, qulf hisobi

Sof qism `shared/`da: `catalogStats`, `incompleteProducts` (sahifalanadi),
`manualFieldsFor` (Billz qulfi) va `imageFilesOf`. Remote transport ham keyin
shu funksiyalarni ishlatadi.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 4: stdio MCP server

**Files:**
- Create: `mcp/client.ts`, `mcp/tools.ts`, `mcp/stdio.ts`, `mcp/README.md`
- Modify: `package.json`, `CLAUDE.md`

**Interfaces:**
- Consumes: `shared/mcp-tools.ts` (sof mantiq), `src/admin/errText.ts` (xato kodi → o'zbekcha matn), admin HTTP API.
- Produces: `bun run mcp` bilan ishga tushadigan stdio server; tool'lar: `catalog_stats`, `products_incomplete`, `product_get`, `types_list`, `categories_list`, `brands_list`, `image_upload_from_path`, `image_upload_from_url`, `product_create`, `product_update`, `product_set_images`.

- [ ] **Step 1: Paketlarni o'rnating va SDK imzosini tekshiring**

```bash
bun add @modelcontextprotocol/sdk zod
npm install --package-lock-only
```

Run: `node -e "const m=require('@modelcontextprotocol/sdk/package.json');console.log(m.version)"`
Expected: versiya chiqadi (≥ 1.12).

Run: `grep -n "registerTool" node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.d.ts | head -3`
Expected: `registerTool` metodi bor. **Agar yo'q bo'lsa** — o'sha `.d.ts` dagi haqiqiy imzoga (`server.tool(...)`) moslang va shu qadamni izohda qayd eting; qolgan kod o'zgarmaydi.

- [ ] **Step 2: HTTP klienti**

`mcp/client.ts`:

```ts
import { errText } from '../src/admin/errText.ts';

/**
 * Admin API klienti. MCP hech qanday SQL yozmaydi — hamma yozuv shu API orqali,
 * ya'ni validatsiya, slug va atomik batch serverda qoladi.
 * Xato kodi o'zbekcha matnga `errText` bilan o'giriladi (admin bilan bir xil matn).
 */
export class AdminClient {
  constructor(private base: string, private token: string) {}

  private async send<T>(path: string, init: RequestInit & { tool?: string } = {}): Promise<T> {
    const { tool, ...rest } = init;
    const res = await fetch(new URL(path, this.base), {
      ...rest,
      headers: {
        ...(rest.headers as Record<string, string> | undefined),
        authorization: `Bearer ${this.token}`,
        ...(tool ? { 'x-mcp-tool': tool } : {}),
      },
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      const code = body.error ?? `http_${res.status}`;
      throw new Error(`${errText(new Error(code))} (${code})`);
    }
    return (await res.json()) as T;
  }

  get<T>(path: string): Promise<T> {
    return this.send<T>(path);
  }

  write<T>(path: string, method: 'POST' | 'PUT' | 'PATCH', body: unknown, tool: string): Promise<T> {
    return this.send<T>(path, {
      method,
      tool,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  /** Rasm yuklash — `/api/admin/upload` multipart kutadi va `{ imageUrl }` qaytaradi. */
  async upload(bytes: Uint8Array, filename: string, type: string, tool: string): Promise<string> {
    const form = new FormData();
    form.append('file', new Blob([bytes], { type }), filename);
    const { imageUrl } = await this.send<{ imageUrl: string }>('/api/admin/upload', { method: 'POST', body: form, tool });
    return imageUrl;
  }
}
```

Maydon nomi `file` — `app/routes/api.admin.upload.tsx:31` (`form.get('file')`); rasm `image/jpeg|png|webp` ≤ 5 MB.

- [ ] **Step 3: Tool'lar**

`mcp/tools.ts`:

```ts
import { readFile, readdir, stat } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { z } from 'zod';
import type { ApiAdminBrand, ApiCategory, ApiProduct, ApiProductDetail, ApiProductType } from '../shared/types.ts';
import { deriveLegacyCategory } from '../shared/legacy-category.ts';
import { catalogStats, imageFilesOf, incompleteProducts, manualFieldsFor, type ProductPatch } from '../shared/mcp-tools.ts';
import type { AdminClient } from './client.ts';

/**
 * Rasm konvensiyasi admin formasi bilan bir xil: `imageUrl` — asosiy rasm,
 * `images` — **faqat galereya** (asosiysiz). `detailToForm` ham shunday filtrlaydi
 * (`src/admin/lib/product-form.ts`), shuning uchun MCP boshqacha qilsa asosiy rasm
 * galereyaga ikki marta tushardi.
 */
const galleryOf = (d: { imageUrl: string; images: string[] }): string[] =>
  d.images.filter((u) => u !== d.imageUrl);

const MAX_IMAGE = 5 * 1024 * 1024;
const MIME: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

const text = (s: string) => ({ content: [{ type: 'text' as const, text: s }] });

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

export function registerTools(server: {
  registerTool: (name: string, cfg: { description: string; inputSchema: Record<string, z.ZodTypeAny> }, run: (args: never) => Promise<{ content: { type: 'text'; text: string }[] }>) => void;
}, api: AdminClient, opts: { allowFiles: boolean; adminUrl: string }): void {
  const products = () => api.get<ApiProduct[]>('/api/admin/products');

  server.registerTool('catalog_stats', {
    description: "Katalog holati: jami tovar, faol/yashirin, rasmi yo'q, tavsifi yo'q, qoldiq 0, Billz va qo'lda kiritilganlar soni.",
    inputSchema: {},
  }, async () => text(JSON.stringify(catalogStats(await products()), null, 2)));

  server.registerTool('products_incomplete', {
    description: "Ma'lumoti to'liq bo'lmagan tovarlar: rasmi yo'q va/yoki tavsifi yo'q. Sahifalanadi.",
    inputSchema: {
      missing: z.enum(['image', 'description', 'any']).default('any'),
      limit: z.number().int().min(1).max(50).default(20),
      offset: z.number().int().min(0).default(0),
    },
  }, async (args: { missing: 'image' | 'description' | 'any'; limit: number; offset: number }) =>
    text(JSON.stringify(incompleteProducts(await products(), args), null, 2)));

  server.registerTool('product_get', {
    description: "Bitta tovar: id bo'yicha yoki nom bo'lagi bo'yicha qidirib.",
    inputSchema: { id: z.string().optional(), q: z.string().optional() },
  }, async (args: { id?: string; q?: string }) => {
    if (args.id) return text(JSON.stringify(await api.get<unknown>(`/api/admin/products/${args.id}`), null, 2));
    const q = (args.q ?? '').toLowerCase();
    const found = (await products()).filter((p) => p.name.toLowerCase().includes(q)).slice(0, 10);
    return text(JSON.stringify(found.map((p) => ({ id: p.id, name: p.name, isActive: p.isActive, cashPriceUzs: p.cashPriceUzs })), null, 2));
  });

  server.registerTool('types_list', {
    description: "Tovar turlari (yo'nalish ichidagi bo'linish). Tovar yaratishdan oldin shu ro'yxatdan `type` tanlanadi.",
    inputSchema: { categoryId: z.string().optional() },
  }, async (args: { categoryId?: string }) => {
    const all = await api.get<ApiProductType[]>('/api/admin/types');
    const list = args.categoryId ? all.filter((t) => t.categoryId === args.categoryId) : all;
    return text(JSON.stringify(list.map((t) => ({ id: t.id, label: t.label, categoryId: t.categoryId })), null, 2));
  });

  server.registerTool('categories_list', {
    description: "Yo'nalishlar: apple, pc, audio, video.",
    inputSchema: {},
  }, async () => {
    const cats = await api.get<ApiCategory[]>('/api/admin/categories');
    return text(JSON.stringify(cats.map((c) => ({ id: c.id, name: c.name })), null, 2));
  });

  server.registerTool('brands_list', {
    description: 'Brendlar va ularning tovar soni.',
    inputSchema: {},
  }, async () => {
    const brands = await api.get<ApiAdminBrand[]>('/api/admin/brands');
    return text(JSON.stringify(brands.map((b) => ({ id: b.id, name: b.name, productCount: b.productCount })), null, 2));
  });

  server.registerTool('image_upload_from_url', {
    description: 'Rasmni https havoladan yuklab saytga qo\'yadi. Javob — saytdagi rasm manzillari.',
    inputSchema: { urls: z.array(z.string().url()).min(1).max(10) },
  }, async (args: { urls: string[] }) => {
    const out: string[] = [];
    for (const u of args.urls) {
      if (!u.startsWith('https://')) throw new Error(`Faqat https: ${u}`);
      const res = await fetch(u, { redirect: 'manual' });
      if (!res.ok) throw new Error(`Rasm yuklanmadi (${res.status}): ${u}`);
      const type = res.headers.get('content-type') ?? '';
      if (!type.startsWith('image/')) throw new Error(`Bu rasm emas (${type}): ${u}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength > MAX_IMAGE) throw new Error(`5 MB dan katta: ${u}`);
      out.push(await api.upload(bytes, basename(new URL(u).pathname) || 'image', type, 'image_upload_from_url'));
    }
    return text(out.join('\n'));
  });

  if (opts.allowFiles) {
    server.registerTool('image_upload_from_path', {
      description: "Kompyuterdagi fayl yoki papkadan rasmlarni yuklaydi (papka — nom bo'yicha tartibda, birinchisi asosiy rasm).",
      inputSchema: { paths: z.array(z.string()).min(1).max(20) },
    }, async (args: { paths: string[] }) => {
      const files = await pathsToFiles(args.paths);
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

  server.registerTool('product_create', {
    description: "Yangi tovar qo'shadi. **Yashirin** yaratiladi — egasi admin'da ko'rib chiqib saytga chiqaradi. `type` ni avval `types_list` dan tanlang.",
    inputSchema: {
      name: z.string().min(2),
      categoryId: z.enum(['apple', 'pc', 'audio', 'video']),
      type: z.string(),
      cashPriceUzs: z.number().int().positive(),
      description: z.string().optional(),
      brandId: z.string().optional(),
      condition: z.enum(['yangi', 'ishlatilgan']).default('yangi'),
      specs: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
      imageUrls: z.array(z.string()).optional(),
    },
  }, async (args: {
    name: string; categoryId: string; type: string; cashPriceUzs: number;
    description?: string; brandId?: string; condition: 'yangi' | 'ishlatilgan';
    specs?: { label: string; value: string }[]; imageUrls?: string[];
  }) => {
    const images = args.imageUrls ?? [];
    const created = await api.write<{ id: string }>('/api/admin/products', 'POST', {
      name: args.name, category: deriveLegacyCategory(args.categoryId), categoryId: args.categoryId, type: args.type,
      condition: args.condition, conditionNote: null, cashPriceUzs: args.cashPriceUzs,
      oldPriceUzs: null, description: args.description ?? null,
      imageUrl: images[0] ?? '', images: images.slice(1), specs: args.specs ?? [],
      sortOrder: 0, isActive: false, brandId: args.brandId ?? null, slug: null,
      ratingAvg: null, reviewCount: 0, preorder: false, options: [], variants: [], manualFields: [],
    }, 'product_create');
    return text(`Yaratildi (yashirin holatda): ${opts.adminUrl}/admin/products/${created.id}\nSaytda ko'rinishi uchun admin'da «Saytda ko'rsatish»ni yoqing.`);
  });

  server.registerTool('product_update', {
    description: "Mavjud tovarni yangilaydi. Billz tovarida tegilgan maydon uchun «Qo'lda tahrirlash» qulfi avtomatik yoqiladi, aks holda 30 daqiqada Billz qiymati qaytadi.",
    inputSchema: {
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      cashPriceUzs: z.number().int().positive().optional(),
      specs: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
    },
  }, async (args: { id: string } & ProductPatch) => {
    const { id, ...patch } = args;
    const current = await api.get<ApiProductDetail>(`/api/admin/products/${id}`);
    const manualFields = current.billzId ? manualFieldsFor(current.manualFields, patch) : current.manualFields;
    await api.write(`/api/admin/products/${id}`, 'PUT', { ...current, ...patch, images: galleryOf(current), manualFields }, 'product_update');
    const locked = current.billzId && manualFields.length > current.manualFields.length;
    return text(`Saqlandi: ${opts.adminUrl}/admin/products/${id}${locked ? '\nBillz tovari — tegilgan maydonlar endi qo\'lda boshqariladi.' : ''}`);
  });

  server.registerTool('product_set_images', {
    description: 'Tovarning rasmlarini almashtiradi: birinchisi asosiy rasm, qolgani galereya.',
    inputSchema: { id: z.string(), imageUrls: z.array(z.string()).min(1) },
  }, async (args: { id: string; imageUrls: string[] }) => {
    const current = await api.get<ApiProductDetail>(`/api/admin/products/${args.id}`);
    await api.write(`/api/admin/products/${args.id}`, 'PUT', { ...current, imageUrl: args.imageUrls[0], images: args.imageUrls.slice(1) }, 'product_set_images');
    return text(`Rasmlar yangilandi (${args.imageUrls.length} ta): ${opts.adminUrl}/admin/products/${args.id}`);
  });
}
```

- [ ] **Step 4: stdio server**

`mcp/stdio.ts`:

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { AdminClient } from './client.ts';
import { registerTools } from './tools.ts';

/**
 * Lokal MCP server — odamning o'z kompyuterida ishlaydi, shuning uchun papkadagi
 * rasmlarni o'qiy oladi. Manzil va token sozlamadan keladi, ya'ni shu server
 * platformaning boshqa do'kon nusxasiga ham ulanadi.
 */
const base = process.env.PRODUCT_URL;
const token = process.env.PRODUCT_TOKEN;
if (!base || !token) {
  console.error('PRODUCT_URL va PRODUCT_TOKEN kerak. Namuna: PRODUCT_URL=https://sayt.uz PRODUCT_TOKEN=prod_…');
  process.exit(1);
}

const server = new McpServer({ name: 'product-admin', version: '1.0.0' });
registerTools(server, new AdminClient(base, token), { allowFiles: true, adminUrl: base.replace(/\/$/, '') });
await server.connect(new StdioServerTransport());
```

- [ ] **Step 5: `package.json` skripti**

`scripts` ichiga:

```json
    "mcp": "node mcp/stdio.ts",
```

- [ ] **Step 6: README**

`mcp/README.md`:

```markdown
# ProDuct MCP

Claude'ni do'kon admin paneliga ulaydi: tovar qo'shish, yetishmayotgan rasm va tavsifni
to'ldirish, katalog holatini so'rash.

## 1. Token oling

Admin → Sozlamalar → Integratsiyalar → «MCP tokenlari» → nom yozing → **Token yaratish**.
Token faqat bir marta ko'rsatiladi.

## 2. Claude Code

`~/.claude.json` (yoki loyiha `.mcp.json`) ichiga:

```json
{
  "mcpServers": {
    "product": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/product/mcp/stdio.ts"],
      "env": { "PRODUCT_URL": "https://sizning-saytingiz", "PRODUCT_TOKEN": "prod_…" }
    }
  }
}
```

## 3. Claude Desktop

`claude_desktop_config.json` — xuddi shu `mcpServers` bloki.

## Namunalar

- «Bu papkadagi rasmlarni qo'sh: /Users/javlon/Desktop/iphone-17. Nomi iPhone 17 Pro 256GB,
  Apple yo'nalishi, narxi 14 500 000 so'm, izoh: …»
- «Qaysi tovarlarda rasm yoki izoh yo'q?» → «Birinchi 10 tasining nomini ber»

## Cheklovlar

- Rasm ≤ 5 MB, faqat jpg/jpeg/png/webp. Kattasi rad etiladi (server rasm qayta ishlamaydi).
- Yangi tovar **yashirin** yaratiladi — saytga chiqarish admin'dagi toggle bilan.
- Tovar o'chirish, sozlamalar va akkaunt tool'lari yo'q.
```

- [ ] **Step 7: Lint va test**

Run: `bun run lint && bun run test`
Expected: lint 0 xato, testlar yashil.

> `mcp/` root tsconfig'ga kiradi (`src`/`app`/`shared` bilan bir qatorda emas) — agar `tsc` `mcp/` ni ko'rmasa, `tsconfig.json` `include` ro'yxatiga `"mcp"` qo'shing va lint'ni qayta yuriting.

- [ ] **Step 8: Commit**

```bash
git add mcp/client.ts mcp/tools.ts mcp/stdio.ts mcp/README.md package.json package-lock.json bun.lock tsconfig.json
git commit -m "$(cat <<'MSG'
feat(mcp): lokal (stdio) MCP server va 11 ta tool

Claude papkadagi rasmlarni yuklab tovar qo'sha oladi (yashirin holatda),
yetishmayotgan rasm/tavsifni ro'yxatlaydi va to'ldiradi. MCP faqat mavjud
admin API'ni chaqiradi; Billz tovarida qulf avtomatik yoqiladi.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Qo'lda tekshirish (kontroller bajaradi, implementer emas)

1. Admin → Sozlamalar → Integratsiyalar → «MCP tokenlari»: nom bilan token yaratish, qiymat bir marta ko'rinishi, ro'yxatda paydo bo'lishi, bekor qilish.
2. `PRODUCT_URL=http://localhost:3000 PRODUCT_TOKEN=<token> bun run mcp` — server `stdio` da ko'tariladi (xato yozmaydi).
3. Claude Code'ga ulab: «katalog holati?» → `catalog_stats` javobi bazadagi sonlar bilan mos.
4. Papkadan tovar qo'shish: yaratilgan tovar admin'da **yashirin**, rasmlari joyida.
5. Billz tovarining tavsifini `product_update` bilan yozib, `sqlite3 data/store.db "SELECT manual_fields FROM products WHERE id='…'"` da `description` paydo bo'lishini tekshirish.
6. Bekor qilingan token bilan chaqiruv `401` berishi.
7. `sqlite3 data/store.db "SELECT token_label, tool, target_id FROM admin_audit ORDER BY id DESC LIMIT 5;"` — yozuv amallari jurnalda.

Test ma'lumotlari (`SINOV ` prefiksli tovarlar, yuklangan rasmlar, test tokeni) tekshiruvdan keyin o'chiriladi.
