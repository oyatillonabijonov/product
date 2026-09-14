# Navbar: UZS/USD, Sevimlilar, Profil — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Navbarga UZS/USD valyuta tanlovi (butun saytdagi narxlar), `/sevimlilar` sahifasi va doim ko'rinadigan Profil tugmasini qo'shish; dollar kursi Markaziy bankdan + ustama.

**Architecture:** Kurs serverda (`server/usd-rate.ts`) cbu.uz'dan olinib `settings`ga yoziladi; ustama kiritilgan bo'lsa `usd_to_uzs` (Billz ham o'qiydigan yagona kurs) avtomatik yangilanadi. Valyuta tanlovi `currency` cookie'da; store layout loader uni o'qib `CurrencyProvider`ga beradi, komponentlar `useCurrency().price(uzs)` bilan chizadi. USD cookie'li javoblar umumiy keshga tushmaydi.

**Tech Stack:** React Router v7 SSR, Express (Node 22 type-stripping), SQLite, Tailwind v4, lucide-react, vitest, bun.

**Spec:** `docs/superpowers/specs/2026-09-14-valyuta-sevimlilar-profil-design.md`

## Global Constraints

- `bun` ishlatiladi (npm emas); tekshiruv: `bun run lint`, `bun run test`.
- Strict TypeScript, `any` yo'q. `@types/react` yo'q: `useState<T>` generigi yo'qoladi — qiymatni `as T` bilan cast qiling; `key` oladigan komponentlar `FC<{...}>`.
- `server/`dan import qilinadigan `shared/` fayllar `.ts` kengaytmali import yozadi va parametr-xususiyat (`constructor(public x)`) ishlatmaydi.
- Qo'llangan migratsiya tahrirlanmaydi — faqat yangi fayl (`0032`).
- `src/locales.ts`: har kalit uz va ru'da bo'lishi shart; ishlatilmay qolgan kalit o'chiriladi.
- Komponentlarda hex rang yo'q (ruxsat: white, `#25D366`), `shadow-*` yo'q, `text-[Npx]`/`rounded-[Npx]` storefront'da yo'q (admin istisno).
- Billz'ga hech narsa yozilmaydi; Billz sinxronizatsiya kodi o'zgarmaydi.
- **Commit faqat foydalanuvchi tasdig'idan keyin** — har task oxirida lint/test, commit oxirida bir marta so'raladi.

---

### Task 1: Kurs yadrosi — `shared/usd-rate.ts`

**Files:**
- Create: `shared/usd-rate.ts`
- Test: `shared/usd-rate.test.ts`

**Interfaces:**
- Produces: `CBU_USD_URL: string`; `interface CbuUsd { rate: number; date: string }`; `parseCbuUsd(body: unknown): CbuUsd | null`; `storeRate(cbuRate: number, markupPercent: number): number`.

- [ ] **Step 1: Write the failing test** — `shared/usd-rate.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { parseCbuUsd, storeRate } from './usd-rate';

describe('parseCbuUsd', () => {
  it('MB javobidan kurs va sanani oladi', () => {
    expect(parseCbuUsd([{ id: 1, Ccy: 'USD', Nominal: '1', Rate: '11765.76', Date: '14.09.2026' }]))
      .toEqual({ rate: 11765.76, date: '14.09.2026' });
  });
  it('Nominal hisobga olinadi', () => {
    expect(parseCbuUsd([{ Ccy: 'USD', Nominal: '10', Rate: '117657.6', Date: '14.09.2026' }])?.rate).toBeCloseTo(11765.76);
  });
  it("buzuq javobda null qaytaradi", () => {
    expect(parseCbuUsd(null)).toBeNull();
    expect(parseCbuUsd({ Ccy: 'USD', Nominal: '1', Rate: '11765.76' })).toBeNull();
    expect(parseCbuUsd([{ Ccy: 'EUR', Nominal: '1', Rate: '13000' }])).toBeNull();
    expect(parseCbuUsd([{ Ccy: 'USD', Nominal: '1', Rate: 'abc' }])).toBeNull();
    expect(parseCbuUsd([{ Ccy: 'USD', Nominal: '1', Rate: '0' }])).toBeNull();
  });
});

describe('storeRate', () => {
  it("ustamani qo'shib butun so'mga yaxlitlaydi", () => {
    expect(storeRate(11765.76, 7)).toBe(12589);
    expect(storeRate(11765.76, 0)).toBe(11766);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run shared/usd-rate.test.ts`
Expected: FAIL — `Failed to resolve import "./usd-rate"`.

- [ ] **Step 3: Write minimal implementation** — `shared/usd-rate.ts`

```ts
/**
 * Dollar kursi — Markaziy bank (cbu.uz) javobini o'qish va do'kon kursini hisoblash.
 * Sof funksiyalar: server runner'i (`server/usd-rate.ts`) va admin sozlamalari ishlatadi.
 */
export const CBU_USD_URL = 'https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/';

export interface CbuUsd {
  /** 1 USD necha so'm (Nominal hisobga olingan). */
  rate: number;
  /** MB sanasi o'z formatida: "14.09.2026". */
  date: string;
}

/** MB javobi: `[{ Ccy: "USD", Nominal: "1", Rate: "11765.76", Date: "14.09.2026" }]`. Buzuq bo'lsa `null`. */
export function parseCbuUsd(body: unknown): CbuUsd | null {
  if (!Array.isArray(body)) return null;
  const usd = body.find(
    (x): x is Record<string, unknown> => typeof x === 'object' && x !== null && (x as Record<string, unknown>).Ccy === 'USD',
  );
  if (!usd) return null;
  const rate = Number(usd.Rate) / Number(usd.Nominal ?? 1);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return { rate, date: typeof usd.Date === 'string' ? usd.Date : '' };
}

/** Do'kon kursi: MB kursi + ustama, butun so'mga yaxlitlab (`settings.usd_to_uzs` INTEGER). */
export function storeRate(cbuRate: number, markupPercent: number): number {
  return Math.round(cbuRate * (1 + markupPercent / 100));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run shared/usd-rate.test.ts`
Expected: PASS (4 tests).

---

### Task 2: Sozlamalar sxemasi — migratsiya, tiplar, validatsiya, admin API

**Files:**
- Create: `migrations/0032_usd_rate.sql`
- Modify: `shared/types.ts` (`ApiSettings`), `functions/lib/db.ts` (`SettingsRow`, `rowToSettings`), `functions/lib/validate.ts` (`parseSettingsInput`), `app/routes/api.admin.settings.tsx` (action), `src/admin/errText.ts`
- Test: `functions/lib/validate.test.ts`

**Interfaces:**
- Consumes: `storeRate` (Task 1).
- Produces: `ApiSettings` += `usdMarkupPercent: number | null; usdCbuRate: number | null; usdRateDate: string`. Ustunlar: `settings.usd_markup_percent REAL`, `settings.usd_cbu_rate REAL`, `settings.usd_rate_date TEXT`.

- [ ] **Step 1: Write the failing test** — `functions/lib/validate.test.ts` oxiriga

```ts
describe('parseSettingsInput — usdMarkupPercent', () => {
  const base = {
    downPaymentPercent: 20, downPaymentMaxPercent: 90, usdToUzs: 12600,
    terms: [{ months: 3, markup: 0.1 }],
  };
  it("berilmasa null — avtomatik kurs o'chiq", () => {
    expect(parseSettingsInput(base).usdMarkupPercent).toBeNull();
  });
  it("0–100 oralig'ini qabul qiladi", () => {
    expect(parseSettingsInput({ ...base, usdMarkupPercent: 7 }).usdMarkupPercent).toBe(7);
    expect(parseSettingsInput({ ...base, usdMarkupPercent: 0 }).usdMarkupPercent).toBe(0);
  });
  it('diapazondan tashqarisini rad etadi', () => {
    expect(() => parseSettingsInput({ ...base, usdMarkupPercent: -1 })).toThrow('usd_markup_range');
    expect(() => parseSettingsInput({ ...base, usdMarkupPercent: 101 })).toThrow('usd_markup_range');
    expect(() => parseSettingsInput({ ...base, usdMarkupPercent: '7' })).toThrow('usd_markup_range');
  });
  it("MB kursi va sanasi body'dan olinmaydi (server mulki)", () => {
    const s = parseSettingsInput({ ...base, usdCbuRate: 1, usdRateDate: 'x' });
    expect(s.usdCbuRate).toBeNull();
    expect(s.usdRateDate).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run functions/lib/validate.test.ts`
Expected: FAIL — `expected undefined to be null` (maydonlar hali yo'q).

- [ ] **Step 3: Migration** — `migrations/0032_usd_rate.sql`

```sql
-- Dollar kursi Markaziy bankdan (cbu.uz) + do'kon ustamasi (server/usd-rate.ts).
-- usd_markup_percent NULL = avtomatik kurs o'chiq: usd_to_uzs qo'lda qoladi — deploy'da
-- Billz tovarlarining so'm narxlari o'zidan o'zgarib ketmasin.
ALTER TABLE settings ADD COLUMN usd_markup_percent REAL;
ALTER TABLE settings ADD COLUMN usd_cbu_rate REAL;
ALTER TABLE settings ADD COLUMN usd_rate_date TEXT NOT NULL DEFAULT '';
```

- [ ] **Step 4: Types** — `shared/types.ts`, `ApiSettings` ichida `usdToUzs` qatoridan keyin:

```ts
  /** Markaziy bank kursiga qo'shiladigan ustama (%); `null` — avtomatik kurs o'chiq, `usdToUzs` qo'lda. */
  usdMarkupPercent: number | null;
  /** Oxirgi olingan MB kursi — server yozadi. */
  usdCbuRate: number | null;
  /** MB kursi sanasi ("14.09.2026") — server yozadi. */
  usdRateDate: string;
```

- [ ] **Step 5: Row mapper** — `functions/lib/db.ts`

`SettingsRow`ga (`usd_to_uzs: number;` dan keyin):
```ts
  usd_markup_percent: number | null;
  usd_cbu_rate: number | null;
  usd_rate_date: string;
```
`rowToSettings` qaytaradigan obyektga (`usdToUzs: row.usd_to_uzs,` dan keyin):
```ts
    usdMarkupPercent: row.usd_markup_percent ?? null,
    usdCbuRate: row.usd_cbu_rate ?? null,
    usdRateDate: row.usd_rate_date ?? '',
```

- [ ] **Step 6: Validation** — `functions/lib/validate.ts`, `parseSettingsInput`

`const usdToUzs = …` va `usd_positive` tekshiruvidan keyin:
```ts
  // Ixtiyoriy: yo'q/null — avtomatik kurs o'chiq.
  let usdMarkupPercent: number | null = null;
  if (o.usdMarkupPercent !== undefined && o.usdMarkupPercent !== null) {
    const m = o.usdMarkupPercent;
    if (typeof m !== 'number' || !Number.isFinite(m) || m < 0 || m > 100) throw new ValidationError('usd_markup_range');
    usdMarkupPercent = m;
  }
```
`return` qatorini almashtiring:
```ts
  // usdCbuRate/usdRateDate — server mulki (server/usd-rate.ts yozadi), body'dan olinmaydi.
  return { downPaymentPercent, downPaymentMaxPercent, usdToUzs, terms, usdMarkupPercent, usdCbuRate: null, usdRateDate: '' };
```

- [ ] **Step 7: Admin API** — `app/routes/api.admin.settings.tsx`

Import qo'shing:
```ts
import { storeRate } from '../../shared/usd-rate';
```
`action`dagi `await env.DB.prepare('UPDATE settings …')…run(); return json(input);` blokini almashtiring:
```ts
  // Ustama bor va MB kursi ma'lum — kursni server hisoblaydi; aks holda qo'lda kiritilgani.
  const cur = await env.DB.prepare('SELECT usd_cbu_rate FROM settings WHERE id = 1').first<{ usd_cbu_rate: number | null }>();
  const cbu = cur?.usd_cbu_rate ?? null;
  const usdToUzs = input.usdMarkupPercent !== null && cbu !== null ? storeRate(cbu, input.usdMarkupPercent) : input.usdToUzs;
  await env.DB.prepare(
    'UPDATE settings SET down_payment_percent=?, down_payment_max_percent=?, usd_to_uzs=?, usd_markup_percent=?, terms=? WHERE id=1',
  )
    .bind(input.downPaymentPercent, input.downPaymentMaxPercent, usdToUzs, input.usdMarkupPercent, JSON.stringify(input.terms))
    .run();
  const saved = await env.DB.prepare('SELECT * FROM settings WHERE id = 1').first<SettingsRow>();
  return json(saved ? rowToSettings(saved) : input);
```

- [ ] **Step 8: Error text** — `src/admin/errText.ts`, `usd_positive` qatoridan keyin:

```ts
  usd_markup_range: "Ustama 0–100% oralig'ida bo'lishi kerak",
```

- [ ] **Step 9: Run tests + migrate + lint**

Run: `bunx vitest run functions/lib/validate.test.ts && bun run migrate && bun run lint`
Expected: validate testlari PASS; `✓ 0032_usd_rate.sql`; lint exit 0 (agar `ApiSettings` literal'i boshqa joyda qurilsa lint ko'rsatadi — o'sha joyga uch maydonni qo'shing).

---

### Task 3: Kurs runner'i — `server/usd-rate.ts`

**Files:**
- Create: `server/usd-rate.ts`
- Modify: `server/index.ts`

**Interfaces:**
- Consumes: `CBU_USD_URL`, `parseCbuUsd`, `storeRate` (Task 1); `settings` ustunlari (Task 2).
- Produces: `createUsdRate(env: Env): { refresh(): Promise<void>; start(): void }`.

- [ ] **Step 1: Implementation** — `server/usd-rate.ts`

```ts
import type { Env, SqlStatement } from '../shared/runtime';
import { CBU_USD_URL, parseCbuUsd, storeRate } from '../shared/usd-rate.ts';

/**
 * Dollar kursi — Markaziy bankdan (cbu.uz) boot'dan keyin va har 6 soatda olinadi.
 *
 * MB kursi va sanasi har doim yoziladi. Do'kon kursi (`usd_to_uzs` — Billz narxlari va saytdagi
 * USD ko'rinishi shu kursda) faqat admin ustama kiritgan bo'lsa yangilanadi: ustamasiz deploy'da
 * narxlar o'zidan o'zgarib ketmasin. Xato bo'lsa oxirgi qiymat qoladi.
 */
const EVERY_MS = 6 * 60 * 60 * 1000;
const BOOT_DELAY_MS = 5 * 1000;
const TIMEOUT_MS = 5 * 1000;

export function createUsdRate(env: Env): { refresh(): Promise<void>; start(): void } {
  async function refresh(): Promise<void> {
    const res = await fetch(CBU_USD_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`cbu http_${res.status}`);
    const cbu = parseCbuUsd(await res.json());
    if (!cbu) throw new Error('cbu: USD kursi topilmadi');
    const row = await env.DB.prepare('SELECT usd_markup_percent AS markup FROM settings WHERE id = 1')
      .first<{ markup: number | null }>();
    const statements: SqlStatement[] = [
      env.DB.prepare('UPDATE settings SET usd_cbu_rate = ?, usd_rate_date = ? WHERE id = 1').bind(cbu.rate, cbu.date),
    ];
    if (row && row.markup !== null) {
      statements.push(env.DB.prepare('UPDATE settings SET usd_to_uzs = ? WHERE id = 1').bind(storeRate(cbu.rate, row.markup)));
    }
    await env.DB.batch(statements);
  }

  const tick = () => { refresh().catch((err) => console.error('usd kurs xato:', err)); };

  return {
    refresh,
    start() {
      // unref — timerlar jarayonni tirik ushlab turmaydi.
      setTimeout(tick, BOOT_DELAY_MS).unref();
      setInterval(tick, EVERY_MS).unref();
    },
  };
}
```

- [ ] **Step 2: Wire up** — `server/index.ts`

Import (`createBillzSync` importidan keyin):
```ts
import { createUsdRate } from './usd-rate.ts';
```
`billz.start();` qatoridan keyin:
```ts
// Dollar kursi — cbu.uz'dan har 6 soatda (ustama kiritilgan bo'lsa do'kon kursini ham yangilaydi).
createUsdRate(env).start();
```

- [ ] **Step 3: Verify**

Run: `bun run lint` → exit 0. Dev serverni qayta ishga tushiring (preview_stop + preview_start `dev`), 10 s kuting, keyin:
`sqlite3 data/store.db "SELECT usd_cbu_rate, usd_rate_date, usd_markup_percent, usd_to_uzs FROM settings"`
Expected: `usd_cbu_rate` ≈ 11765.76, `usd_rate_date` = bugungi sana, `usd_markup_percent` bo'sh, `usd_to_uzs` o'zgarmagan (12600).

---

### Task 4: Admin Sozlamalar — ustama maydoni

**Files:**
- Modify: `src/admin/SettingsForm.tsx`

**Interfaces:**
- Consumes: `ApiSettings` yangi maydonlari (Task 2), `storeRate` (Task 1), `updateSettings(s): Promise<ApiSettings>` (mavjud).

- [ ] **Step 1: Import** — `import { getSettings, updateSettings } from './api';` dan keyin:

```ts
import { storeRate } from '../../shared/usd-rate';
```

- [ ] **Step 2: Save natijasini qabul qilish** — `save()` ichida `await updateSettings(s);` ni almashtiring:

```ts
      // Kursni server hisoblaydi (ustama bo'lsa) — formaga saqlangan holat qaytadi.
      setS(await updateSettings(s));
```

- [ ] **Step 3: USD bloki** — `<label …>USD kursi (so'm)…</label>` va undan keyingi `<p className="mb-5 text-[12px] text-muted-2">Billz narxlari…</p>` ni almashtiring:

```tsx
      <div className="mb-5 rounded-sm border border-line p-4 text-[14px]">
        <div className="mb-3 font-semibold">Dollar kursi</div>
        <label className="mb-2 flex items-center justify-between">
          Ustama (%)
          <input
            type="number"
            min={0}
            max={100}
            step="0.1"
            placeholder="o'chiq"
            className={input}
            value={s.usdMarkupPercent ?? ''}
            onChange={(e) => setS({ ...s, usdMarkupPercent: e.target.value === '' ? null : Number(e.target.value) })}
          />
        </label>
        <p className="mb-3 text-[12px] text-muted-2">
          {s.usdCbuRate !== null ? `Markaziy bank: ${s.usdCbuRate} (${s.usdRateDate})` : 'Markaziy bank kursi hali olinmadi'}
        </p>
        {s.usdMarkupPercent !== null && s.usdCbuRate !== null ? (
          <p>
            Do'kon kursi: <b>{fmt(storeRate(s.usdCbuRate, s.usdMarkupPercent))}</b> — avtomatik, har 6 soatda yangilanadi
          </p>
        ) : (
          <label className="flex items-center justify-between">
            USD kursi (so'm)
            <input
              type="number"
              className={input}
              value={s.usdToUzs}
              onChange={(e) => setS({ ...s, usdToUzs: Number(e.target.value) })}
            />
          </label>
        )}
        <p className="mt-3 text-[12px] text-muted-2">
          Billz narxlari (USD) shu kurs bilan so'mga o'giriladi, saytdagi USD narxlar ham shu kursda. Ustama kiritilsa kurs
          Markaziy bankdan avtomatik olinadi; kurs o'zgarsa so'm narxlar keyingi sinxronizatsiyada yangilanadi.
        </p>
      </div>
```

- [ ] **Step 4: Verify**

Run: `bun run lint` → exit 0. Brauzerda `/admin` → Sozlamalar: ustama bo'sh → qo'lda kurs maydoni; 7 kiritib Saqlash → "Do'kon kursi: 12 589 so'm". Tekshiruvdan keyin ustamani yana bo'shatib saqlang va `usd_to_uzs`ni 12600 ga qaytaring (lokal baza avvalgi holatda qolsin).

---

### Task 5: Valyuta yadrosi — `src/lib/currency.ts`

**Files:**
- Create: `src/lib/currency.ts`
- Test: `src/lib/currency.test.ts`

**Interfaces:**
- Consumes: `formatUzs(value: number, suffix?: string): string` (`src/lib/installment.ts`).
- Produces: `type Currency = 'UZS' | 'USD'`; `CURRENCY_COOKIE = 'currency'`; `parseCurrency(v: string | null | undefined): Currency`; `formatUsd(value: number): string`; `formatPrice(uzs: number, currency: Currency, rate: number, sum: string): string`; `fromUzs(uzs: number, currency: Currency, rate: number): number`; `toUzs(value: number, currency: Currency, rate: number): number`.

- [ ] **Step 1: Write the failing test** — `src/lib/currency.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { formatPrice, formatUsd, fromUzs, parseCurrency, toUzs } from './currency';
import { formatUzs } from './installment';

describe('parseCurrency', () => {
  it("faqat 'USD' — USD, qolgani UZS", () => {
    expect(parseCurrency('USD')).toBe('USD');
    expect(parseCurrency('usd')).toBe('UZS');
    expect(parseCurrency(null)).toBe('UZS');
    expect(parseCurrency(undefined)).toBe('UZS');
  });
});

describe('formatUsd', () => {
  it("$100 dan kichikni sent bilan ko'rsatadi", () => {
    expect(formatUsd(2.9365)).toBe('$2.94');
    expect(formatUsd(49.5)).toBe('$49.50');
  });
  it("kattasini butun dollar, minglar bo'shliq bilan", () => {
    expect(formatUsd(100)).toBe('$100');
    expect(formatUsd(1299.4)).toBe('$1 299');
    expect(formatUsd(1234567.8)).toBe('$1 234 568');
  });
});

describe('formatPrice', () => {
  it("UZS'da formatUzs bilan bir xil", () => {
    expect(formatPrice(22_050_000, 'UZS', 12600, "so'm")).toBe(formatUzs(22_050_000, "so'm"));
  });
  it("USD'da kursga bo'ladi", () => {
    expect(formatPrice(12_600_000, 'USD', 12600, "so'm")).toBe('$1 000');
    expect(formatPrice(37_000, 'USD', 12600, "so'm")).toBe('$2.94');
  });
  it("kurs 0 bo'lsa so'mda qoladi", () => {
    expect(formatPrice(37_000, 'USD', 0, "so'm")).toBe(formatUzs(37_000, "so'm"));
  });
});

describe('fromUzs / toUzs', () => {
  it("USD'da kurs bilan o'giradi, UZS'da o'zgartirmaydi", () => {
    expect(fromUzs(12_600_000, 'USD', 12600)).toBe(1000);
    expect(toUzs(1000, 'USD', 12600)).toBe(12_600_000);
    expect(fromUzs(500_000, 'UZS', 12600)).toBe(500_000);
    expect(toUzs(500_000, 'UZS', 12600)).toBe(500_000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/lib/currency.test.ts`
Expected: FAIL — `Failed to resolve import "./currency"`.

- [ ] **Step 3: Write minimal implementation** — `src/lib/currency.ts`

```ts
import { formatUzs } from './installment';

/** Saytdagi narx valyutasi. Bazada hamma narx so'mda; USD = so'm ÷ do'kon kursi (`settings.usd_to_uzs`). */
export type Currency = 'UZS' | 'USD';

export const CURRENCY_COOKIE = 'currency';

export function parseCurrency(value: string | null | undefined): Currency {
  return value === 'USD' ? 'USD' : 'UZS';
}

function groupThousands(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** "$1 299"; $100 dan kichigi sent bilan ("$2.94"). `Intl` yo'q — server va brauzer bir xil satr bersin. */
export function formatUsd(value: number): string {
  if (value < 100) return `$${value.toFixed(2)}`;
  return `$${groupThousands(Math.round(value))}`;
}

/** Narxni tanlangan valyutada chizadi; kurs noma'lum (0) bo'lsa so'mda qoladi. */
export function formatPrice(uzs: number, currency: Currency, rate: number, sum: string): string {
  return currency === 'USD' && rate > 0 ? formatUsd(uzs / rate) : formatUzs(uzs, sum);
}

/** So'm → tanlangan valyutadagi butun son (filtr inputi va placeholder uchun). */
export function fromUzs(uzs: number, currency: Currency, rate: number): number {
  return currency === 'USD' && rate > 0 ? Math.round(uzs / rate) : uzs;
}

/** Tanlangan valyutada kiritilgan son → so'm (URL `narx` doim so'mda). */
export function toUzs(value: number, currency: Currency, rate: number): number {
  return currency === 'USD' && rate > 0 ? Math.round(value * rate) : value;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run src/lib/currency.test.ts`
Expected: PASS (7 tests).

---

### Task 6: Valyuta konteksti, SSR va kesh

**Files:**
- Create: `src/store/CurrencyContext.tsx`
- Modify: `app/routes/store.tsx`, `src/store/StoreLayout.tsx`, `server/index.ts`, `deploy/nginx.conf`

**Interfaces:**
- Consumes: Task 5 (`Currency`, `CURRENCY_COOKIE`, `parseCurrency`, `formatPrice`); `loadConfig(env): Promise<InstallmentConfig>`; `getCookie(request, name): string | null`.
- Produces: `useCurrency(): { currency: Currency; rate: number; setCurrency(next: Currency): void; price(uzs: number): string }`; `CurrencyProvider: FC<{ initial: Currency; rate: number; sum: string; children: ReactNode }>`. Store loader data += `currency: Currency`, `usdRate: number`. `StoreLayout` props += `currency`, `usdRate`.

- [ ] **Step 1: Context** — `src/store/CurrencyContext.tsx`

```tsx
import { createContext, useContext, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { CURRENCY_COOKIE, formatPrice, type Currency } from '../lib/currency';

interface CurrencyApi {
  currency: Currency;
  /** Do'kon kursi: 1 USD necha so'm (`settings.usd_to_uzs`); 0 — noma'lum. */
  rate: number;
  setCurrency(next: Currency): void;
  /** So'mdagi narxni tanlangan valyutada chizadi. */
  price(uzs: number): string;
}

const CurrencyCtx = createContext<CurrencyApi | null>(null);

export function useCurrency(): CurrencyApi {
  const ctx = useContext(CurrencyCtx);
  if (!ctx) throw new Error('useCurrency must be used inside CurrencyProvider');
  return ctx;
}

// Boshlang'ich qiymat store loader'idan (cookie) — birinchi render server va klientda bir xil, narx sakramaydi.
export const CurrencyProvider: FC<{ initial: Currency; rate: number; sum: string; children: ReactNode }> = ({
  initial, rate, sum, children,
}) => {
  const [raw, setRaw] = useState(initial);
  const currency = raw as Currency;
  const api: CurrencyApi = {
    currency,
    rate,
    setCurrency(next) {
      setRaw(next);
      // UZS — sukut: cookie o'chiriladi va sahifa yana umumiy keshga tushadi (server/index.ts).
      document.cookie = next === 'USD'
        ? `${CURRENCY_COOKIE}=USD; Path=/; Max-Age=31536000; SameSite=Lax`
        : `${CURRENCY_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    },
    price: (uzs) => formatPrice(uzs, currency, rate, sum),
  };
  return <CurrencyCtx.Provider value={api}>{children}</CurrencyCtx.Provider>;
};
```

- [ ] **Step 2: Store loader** — `app/routes/store.tsx`

Importlar:
```ts
import { loadSiteConfig, loadPages, loadCategories, loadConfig, hasDeals, publicSiteConfig, type PageLink } from '../lib/loaders';
import { CURRENCY_COOKIE, parseCurrency } from '../../src/lib/currency';
```
`Promise.all` qatorini almashtiring:
```ts
  const [siteConfig, pages, categories, deals, settings] = await Promise.all([loadSiteConfig(env), loadPages(env), loadCategories(env), hasDeals(env), loadConfig(env)]);
```
`return` obyektiga qo'shing (`deals,` dan keyin):
```ts
    // Valyuta tanlovi cookie'da (USD bo'lsa server/index.ts javobni umumiy keshdan chiqaradi).
    currency: parseCurrency(getCookie(request, CURRENCY_COOKIE)), usdRate: settings.usdToUzs,
```
`StoreRoot`da:
```tsx
  const { locale, siteConfig, pageLinks, categories, customer, deals, currency, usdRate } = useLoaderData<typeof loader>();
```
va `<StoreLayout … hasDeals={deals}>` ga `currency={currency} usdRate={usdRate}` qo'shing.

- [ ] **Step 3: Layout** — `src/store/StoreLayout.tsx`

Importlar:
```ts
import { CurrencyProvider } from './CurrencyContext';
import type { Currency } from '../lib/currency';
```
Funksiya imzosi:
```tsx
export default function StoreLayout({
  locale, lang, t, config, customer, pageLinks, categories, hasDeals, currency, usdRate, children,
}: { locale: Locale; lang: LangKey; t: Translation; config: ApiSiteConfig; customer: ApiCustomer | null; pageLinks: PageLink[]; categories: ApiCategory[]; hasDeals: boolean; currency: Currency; usdRate: number; children: ReactNode }) {
```
`<FavoritesProvider>` ichini o'rang: `<FavoritesProvider>` dan keyin `<CurrencyProvider initial={currency} rate={usdRate} sum={t.sum}>`, `</FavoritesProvider>` dan oldin `</CurrencyProvider>`.

- [ ] **Step 4: Kesh** — `server/index.ts`, storefront kesh middleware'ida `if (!skip) res.setHeader(…)` qatorini almashtiring:

```ts
  // USD tanlagan foydalanuvchi sahifasi boshqa narxda chiziladi — umumiy keshga tushmasin
  // (deploy/nginx.conf ham shu cookie bo'yicha bypass qiladi).
  const usd = /(?:^|;\s*)currency=USD(?:;|$)/.test(req.headers.cookie ?? '');
  if (!skip) res.setHeader('Cache-Control', usd ? 'private, no-store' : 'public, max-age=0, s-maxage=60, stale-while-revalidate=240');
```

- [ ] **Step 5: nginx** — `deploy/nginx.conf`, `location /` ichida `proxy_cache_lock on;` dan keyin:

```nginx
        # Valyuta tanlovi (currency=USD cookie) — narxlar boshqa valyutada, keshdan berilmasin.
        proxy_cache_bypass $cookie_currency;
        proxy_no_cache $cookie_currency;
```

- [ ] **Step 6: Verify**

Run: `bun run lint` → exit 0. `curl -sI http://localhost:3000/katalog | rg -i cache-control` → `public, …`; `curl -sI -H 'Cookie: currency=USD' http://localhost:3000/katalog | rg -i cache-control` → `private, no-store`.

---

### Task 7: Narxlarni valyutada chizish

**Files:**
- Modify: `src/store/ProductCard.tsx`, `src/store/ProductPage.tsx`, `src/store/CartPage.tsx`, `src/store/OrderForm.tsx`, `src/store/account/FavoritesList.tsx`, `src/store/PcConfigurator.tsx`, `src/store/ActiveFilterChips.tsx`, `src/store/FilterPanel.tsx`, `src/store/CatalogView.tsx`, `src/locales.ts`

**Interfaces:**
- Consumes: `useCurrency()` (Task 6), `fromUzs`, `toUzs` (Task 5).
- Produces: locale kaliti `filterPriceUsd`.

- [ ] **Step 1: `formatUzs(X, t.sum)` → `price(X)`** — quyidagi fayllarning har birida:
  1. `import { useCurrency } from './CurrencyContext';` qo'shing (`FavoritesList` uchun `'../CurrencyContext'`).
  2. Komponent tanasining boshida (har qanday erta `return`dan oldin) `const { price } = useCurrency();`.
  3. Har bir `formatUzs(X, t.sum)` ni `price(X)` ga almashtiring.
  4. `formatUzs` importi ishlatilmay qolsa, o'chiring.

| Fayl | Joylar | Import o'zgarishi |
|---|---|---|
| `ProductCard.tsx` | 6 | `{ discountPercent, formatUzs, priceView }` → `{ discountPercent, priceView }` |
| `ProductPage.tsx` | 7 | `{ calcInstallment, discountPercent, formatUzs }` → `{ calcInstallment, discountPercent }` |
| `CartPage.tsx` | 4 | `import { formatUzs } …` qatori o'chadi |
| `OrderForm.tsx` | 3 | `import { formatUzs } …` qatori o'chadi |
| `account/FavoritesList.tsx` | 1 | `import { formatUzs } …` qatori o'chadi |
| `PcConfigurator.tsx` | 3 | `import { formatUzs } …` qatori o'chadi |
| `ActiveFilterChips.tsx` | 2 | `import { formatUzs } …` qatori o'chadi |

Tekshiruv: `rg -n 'formatUzs\(' src --glob '*.tsx'` → faqat `src/store/account/OrdersList.tsx` (buyurtmalar tarixi so'mda qoladi).

- [ ] **Step 2: Locale** — `src/locales.ts`: uz'da `filterPrice: "Narx (so'm)",` dan keyin `filterPriceUsd: "Narx ($)",`; ru'da `filterPrice: "Цена (сум)",` dan keyin `filterPriceUsd: "Цена ($)",`.

- [ ] **Step 3: FilterPanel** — `src/store/FilterPanel.tsx`

Importlar:
```ts
import { fromUzs, toUzs } from '../lib/currency';
import { useCurrency } from './CurrencyContext';
```
`appliedLo`/`appliedHi` qatorlarini almashtiring:
```ts
  // Inputlar tanlangan valyutada; URL `narx` doim so'mda (qo'llashda toUzs).
  const { currency, rate } = useCurrency();
  const shown = (uzs: number | null) => (uzs !== null ? String(fromUzs(uzs, currency, rate)) : '');
  const appliedLo = shown(filters.priceMin);
  const appliedHi = shown(filters.priceMax);
```
`applyPrice` ichidagi `onChange({ priceMin: pm, priceMax: px });` ni almashtiring:
```ts
    onChange({
      priceMin: pm === null ? null : toUzs(pm, currency, rate),
      priceMax: px === null ? null : toUzs(px, currency, rate),
    });
```
Narx bo'limida: `<Heading title={t.filterPrice} />` → `<Heading title={currency === 'USD' ? t.filterPriceUsd : t.filterPrice} />`;
`formatThousands(facets.priceMin)` → `formatThousands(fromUzs(facets.priceMin, currency, rate))`;
`formatThousands(facets.priceMax)` → `formatThousands(fromUzs(facets.priceMax, currency, rate))`.

- [ ] **Step 4: CatalogView** — `src/store/CatalogView.tsx`

Import: `import { useCurrency } from './CurrencyContext';`. Komponent boshida (`useSearchParams` dan keyin): `const { currency } = useCurrency();`.
`key={`price-${filters.priceMin ?? ''}-${filters.priceMax ?? ''}`}` → `key={`price-${currency}-${filters.priceMin ?? ''}-${filters.priceMax ?? ''}`}` (valyuta almashsa input holati tozalanadi).

- [ ] **Step 5: Verify**

Run: `bun run lint && bun run test` → exit 0, hamma testlar PASS.

---

### Task 8: `/sevimlilar` sahifasi

**Files:**
- Create: `app/routes/sevimlilar.tsx`
- Modify: `app/routes.ts`, `src/store/FavoritesContext.tsx`, `src/store/account/FavoritesList.tsx`

**Interfaces:**
- Consumes: `FavoritesList: FC<{ t: Translation }>`; `StoreContext`.
- Produces: `FavoritesApi.loaded: boolean`; route `/sevimlilar`, `/:lang/sevimlilar` (id `sevimlilar-lang`).

- [ ] **Step 1: `loaded` bayrog'i** — `src/store/FavoritesContext.tsx`: `interface FavoritesApi`ga `/** localStorage o'qilganmi — undan oldin ro'yxat "bo'sh" deb ko'rsatilmasin. */ loaded: boolean;`; `const api: FavoritesApi = {` ichiga `loaded,`.

- [ ] **Step 2: FavoritesList** — `const { items, remove } = useFavorites();` → `const { items, remove, loaded } = useFavorites();` va `const { price } = useCurrency();` qatoridan keyin:
```tsx
  // SSR'da ro'yxat hali o'qilmagan — "bo'sh" holati chaqnab o'tmasin.
  if (!loaded) return null;
```

- [ ] **Step 3: Route** — `app/routes/sevimlilar.tsx`

```tsx
import { useOutletContext } from 'react-router';
import type { Route } from './+types/sevimlilar';
import { resolveLocale, localeToLang } from '../lib/i18n';
import { pageTitle, storeConfigFrom } from '../lib/seo';
import { translations } from '../../src/locales';
import type { StoreContext } from '../../src/store/StoreLayout';
import FavoritesList from '../../src/store/account/FavoritesList';

// Sevimlilar brauzerda (localStorage) — kirish shart emas; server faqat sahifa qobig'ini beradi.
export async function loader({ params }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  return { metaTitle: translations[localeToLang(locale)].accountTabFavorites };
}

export function meta({ data, matches }: Route.MetaArgs) {
  return [
    { title: pageTitle(data?.metaTitle, storeConfigFrom(matches)?.seoTitleSuffix) },
    { name: 'robots', content: 'noindex' },
  ];
}

export default function SevimlilarRoute() {
  const { t } = useOutletContext<StoreContext>();
  return (
    <div className="shell py-6 md:py-10">
      <h1 className="mb-8 text-heading font-semibold text-primary md:mb-10 md:text-title">{t.accountTabFavorites}</h1>
      <FavoritesList t={t} />
    </div>
  );
}
```

- [ ] **Step 4: Routes** — `app/routes.ts`: `route('kabinet', 'routes/kabinet.tsx'),` dan keyin `route('sevimlilar', 'routes/sevimlilar.tsx'),`; `route(':lang/kabinet', …)` dan keyin `route(':lang/sevimlilar', 'routes/sevimlilar.tsx', { id: 'sevimlilar-lang' }),`.

- [ ] **Step 5: Verify**

Run: `bun run lint` → exit 0 (typegen `./+types/sevimlilar`ni yaratadi). Brauzer: kartadagi yurakni bosing → `/sevimlilar` va `/ru/sevimlilar`da mahsulot ko'rinadi, kirishsiz.

---

### Task 9: Navbar — UZS/USD, Sevimlilar, Profil; mobil sozlamalar; HeroNotch

**Files:**
- Modify: `src/store/Header.tsx`, `src/locales.ts`, `src/store/HeroNotch.tsx`, `src/store/HomePage.tsx`

**Interfaces:**
- Consumes: `useCurrency()` (Task 6), `parseCurrency` (Task 5), `useFavorites().count`, `formatUzs`.
- Produces: locale kalitlari `navProfile`, `currencyLabel`; `navAccount` o'chadi. `HeroNotch` props'dan `showAccount` o'chadi.

- [ ] **Step 1: Locale** — `src/locales.ts`: uz'da `navAccount: "Kabinet",` → `navProfile: "Profil",` va `langLabel: "Til",` dan keyin `currencyLabel: "Valyuta",`; ru'da `navAccount: "Кабинет",` → `navProfile: "Профиль",` va `langLabel: "Язык",` dan keyin `currencyLabel: "Валюта",`.

- [ ] **Step 2: Header importlari va konstantalar** — `src/store/Header.tsx`

```tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { Search, ShoppingCart, Menu, Globe, User, Heart, Wallet } from 'lucide-react';
import type { LangKey, Translation } from '../locales';
import type { ApiCategory } from '../../shared/types';
import { localizedPath, langToLocale, stripLocale, categoryLabel, type Locale } from '../../app/lib/i18n';
import { formatUzs } from '../lib/installment';
import { parseCurrency } from '../lib/currency';
import logo from '../assets/logo.svg';
import logoDark from '../assets/hero/wordmark.webp';
import { useCart } from './CartContext';
import { useFavorites } from './FavoritesContext';
import { useCurrency } from './CurrencyContext';
import ThemeToggle from './ThemeToggle';

/**
 * O'ng tomondagi ikon ustunlari — ikonka + tagida nomi (nomi faqat `lg`dan yuqorida).
 *
 * Bir qatorli desktop header `lg`dan boshlanadi: oltita yozuvli ustun (UZS/USD · Sevimlilar ·
 * Savat · Profil · Til · Mavzu) 768–1023px'ga sig'maydi — qidiruv 0 ga tushardi. Torroq ekranda
 * 1-qatorda Sevimlilar/Savat/Profil ikonkalari, valyuta/til/mavzu ☰ menyusining pastida.
 */
const ICON_COL =
  'press flex flex-col items-center justify-center gap-1 shrink-0 min-w-[44px] min-h-[44px] lg:min-h-0 text-muted hover:text-primary';
const ICON_LABEL = 'hidden lg:block text-label leading-none whitespace-nowrap';
/** Soni belgisi — savat va sevimlilar. */
const BADGE = 'absolute -top-2 -right-2.5 min-w-[20px] h-[20px] px-1 rounded-full bg-accent text-bg text-label font-bold leading-none flex items-center justify-center';
/** ☰ menyusidagi ikki bo'lakli tanlov (valyuta, til). */
const SEG = 'press h-9 flex-1 rounded-xs text-label';
```

- [ ] **Step 3: Hook'lar** — `const { count } = useCart();` dan keyin:

```tsx
  const { count: favCount } = useFavorites();
  const { currency, rate, setCurrency } = useCurrency();
```

- [ ] **Step 4: ☰ menyusidagi sozlamalar** — `const catMenu = catOpen && (` dan **oldin**:

```tsx
  // `lg`gacha valyuta, til va mavzu 1-qatorga sig'maydi — ☰ menyusining pastida turadi.
  const settings = (
    <div className="lg:hidden mt-1 flex flex-col gap-2 border-t border-divider px-1 pt-2">
      <div className="flex gap-1" role="group" aria-label={t.currencyLabel}>
        {(['UZS', 'USD'] as const).filter((c) => c === 'UZS' || rate > 0).map((c) => (
          <button key={c} type="button" aria-pressed={currency === c} onClick={() => setCurrency(c)}
            className={`${SEG} ${currency === c ? 'bg-accent text-bg' : 'bg-segment text-primary'}`}>
            {c}
          </button>
        ))}
      </div>
      <div className="flex gap-1" role="group" aria-label={t.langLabel}>
        {(["O'zbek tili", 'Rus tili'] as const).map((l) => (
          <button key={l} type="button" aria-pressed={lang === l} onClick={() => { setCatOpen(false); switchLang(l); }}
            className={`${SEG} ${lang === l ? 'bg-accent text-bg' : 'bg-segment text-primary'}`}>
            {l === 'Rus tili' ? 'Русский' : "O'zbek"}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between px-2 text-label text-primary">
        {t.themeLabel}
        <ThemeToggle label={t.themeLabel} className="press flex h-9 w-9 items-center justify-center rounded-full border border-line" iconCls="w-4 h-4" />
      </div>
    </div>
  );
```
`catMenu` dropdown `<div className=" rounded-lg absolute …">` ichida, `{cats.map(…)}` dan keyin `{settings}` qo'shing.

- [ ] **Step 5: 1-qator** — `<header>` ichidagi birinchi `<div className="shell h-14 md:h-16 …">` dan `</div>`gacha (mobil 2-qatordan oldingi) blokni almashtiring:

```tsx
      <div className="shell h-14 lg:h-16 flex items-center gap-2 lg:gap-4">
        <Link to={localizedPath(locale, '/')} className="shrink-0 mr-auto lg:mr-0">
          <img src={logo} alt={brandName} className="logo-light h-8 lg:h-9" />
          {/* Qorong'i fonda logo.svg'ning to'q pillasi yo'qolib ketadi — o'rniga och wordmark. */}
          <img src={logoDark} alt="" aria-hidden className="logo-dark h-8 lg:h-9" />
        </Link>

        {/* Katalog — desktop (torroq ekranda qidiruv qatorida) */}
        <div className="relative hidden lg:block">
          <button
            onClick={() => setCatOpen((v) => !v)}
            aria-label={t.navCatalog}
            className="press inline-flex h-9 items-center gap-2 rounded-full border border-line px-4 text-label font-medium hover:border-accent hover:text-accent"
          >
            <Menu className="w-4 h-4" /> {t.navCatalog}
          </button>
          {catMenu}
        </div>

        {/* Qidiruv — faqat desktop qatorida; torroq ekranda alohida to'liq enli qator */}
        <div className="hidden lg:block flex-1 min-w-0">{searchForm}</div>

        {/* Valyuta — til ustuni naqshi: yozuvda joriy valyuta, ustida shaffof native select. */}
        <div className="hidden lg:contents">
          <div className={`rounded-sm relative focus-within:ring-2 focus-within:ring-accent/50 ${ICON_COL}`}>
            <Wallet className="w-5 h-5" />
            <span className={ICON_LABEL}>{currency}</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(parseCurrency(e.target.value))}
              aria-label={t.currencyLabel}
              className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
            >
              <option value="UZS">{`UZS — ${t.sum}`}</option>
              {rate > 0 && <option value="USD">{`USD — 1 $ = ${formatUzs(rate, t.sum)}`}</option>}
            </select>
          </div>
        </div>

        <Link to={localizedPath(locale, '/sevimlilar')} className={ICON_COL} aria-label={t.accountTabFavorites}>
          <span className="relative">
            <Heart className="w-5 h-5" />
            {favCount > 0 && <span className={BADGE}>{favCount}</span>}
          </span>
          <span className={ICON_LABEL}>{t.accountTabFavorites}</span>
        </Link>

        <Link to={localizedPath(locale, '/savat')} className={ICON_COL} aria-label={t.cartTitle}>
          <span className="relative">
            <ShoppingCart className="w-5 h-5" />
            {count > 0 && <span className={BADGE}>{count}</span>}
          </span>
          <span className={ICON_LABEL}>{t.cartTitle}</span>
        </Link>

        {/* Profil doim ko'rinadi: kirgan → kabinet; login sozlangan → kirish oynasi;
            sozlanmagan → /kirish (u bosh sahifaga qaytaradi — egasining tanlovi). */}
        {customerName !== null ? (
          <Link
            to={localizedPath(locale, '/kabinet')}
            className={ICON_COL}
            aria-label={customerName || t.navProfile}
            title={customerName || t.navProfile}
          >
            <User className="w-5 h-5" />
            <span className={ICON_LABEL}>{t.navProfile}</span>
          </Link>
        ) : loginEnabled ? (
          <button type="button" onClick={onLoginClick} className={ICON_COL} aria-label={t.navProfile} title={t.navProfile}>
            <User className="w-5 h-5" />
            <span className={ICON_LABEL}>{t.navProfile}</span>
          </button>
        ) : (
          <Link to={localizedPath(locale, '/kirish')} className={ICON_COL} aria-label={t.navProfile} title={t.navProfile}>
            <User className="w-5 h-5" />
            <span className={ICON_LABEL}>{t.navProfile}</span>
          </Link>
        )}

        <div className="hidden lg:contents">
          <div className={`rounded-sm relative focus-within:ring-2 focus-within:ring-accent/50 ${ICON_COL}`}>
            <Globe className="w-5 h-5" />
            {/* Ikonka tagida joriy tilning o'z nomi turadi (tarjima emas). */}
            <span className={ICON_LABEL}>{locale === 'ru' ? 'Русский' : "O'zbek"}</span>
            <select
              value={lang}
              onChange={(e) => switchLang(e.target.value as LangKey)}
              aria-label={t.langLabel}
              className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
            >
              <option value="O'zbek tili">O'zbek tili</option>
              <option value="Rus tili">Русский</option>
            </select>
          </div>

          <ThemeToggle label={t.themeLabel} caption={t.themeLabel} className={ICON_COL} iconCls="w-5 h-5" />
        </div>
      </div>
```
Mobil 2-qator: `<div className="md:hidden shell pb-2.5 flex items-center gap-2">` → `<div className="lg:hidden shell pb-2.5 flex items-center gap-2">`. Header JSDoc'dagi `loginEnabled` izohini yangilang: `/** Login sozlanganmi — Profil kirmagan holatda kirish oynasini ochadi, aks holda /kirish'ga olib boradi. */`.

- [ ] **Step 6: HeroNotch** — `src/store/HeroNotch.tsx`: props'dan `showAccount` va uning JSDoc izohini o'chiring (imzo: `export default function HeroNotch({ t, locale, categories }: { t: Translation; locale: Locale; categories: ApiCategory[]; })`); `{showAccount && (<> … </>)}` o'ramini olib, ichidagi ikki `LocaleLink`ni doim chizing.

- [ ] **Step 7: HomePage** — `src/store/HomePage.tsx`: `import { loginEnabled } from './LoginPanel';` qatorini o'chiring; `<HeroNotch … showAccount={loginEnabled(site)} />` → `<HeroNotch t={t} locale={locale} categories={categories} />`.

- [ ] **Step 8: Verify**

Run: `bun run lint && bun run test` → exit 0. `rg -n "navAccount|showAccount" src app` → natija yo'q.
Brauzer (headless skrinshot yoki Browser pane):
- 1280px: 6 ustun yozuvlari bilan, qidiruv sig'adi; UZS→USD tanlanganda karta narxlari `$…` bo'ladi, sahifa qayta yuklanganda USD saqlanadi.
- 1024px: qidiruv ≥ 250px.
- 390px va 800px: 1-qatorda logo + 3 ikonka; ☰ menyusi pastida UZS/USD, til, mavzu ishlaydi.
- `/product/:id`, `/savat`, katalog filtri (USD'da "Narx ($)", qiymat qo'llansa URL `narx` so'mda) — narxlar valyutaga mos.
- Ikkala mavzu (yorug'/qorong'i), konsolda yangi xato yo'q.

---

### Task 10: Hujjat va yakuniy tekshiruv

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: CLAUDE.md** — quyidagilarni yangilang (mavjud jumlalarni toping va almashtiring/qo'shing):
  - "Header desktop: logo · Katalog · qidiruv · **nomli ikon ustunlari** (…)" → "(UZS/USD · Sevimlilar · Savat · Profil · Til · Mavzu — `ICON_COL`/`ICON_LABEL`, bir qatorli desktop va yozuvlar `lg`dan; `lg`gacha 1-qatorda Sevimlilar/Savat/Profil, valyuta/til/mavzu ☰ menyusining pastida)".
  - "Kirish faqat Google yoki Telegram sozlanganda ko'rinadi …" bandi → Profil ustuni doim ko'rinadi (kirgan → kabinet, login sozlangan → modal, sozlanmagan → `/kirish` redirect); HeroNotch'dagi Kirish/kabinet ham doim.
  - Landing bandidagi "HeroNotch'dagi Kirish/kabinet ham `loginEnabled` bilan yashiriladi." jumlasini o'chiring.
  - Core libraries'ga yangi band: **Valyuta (2026-09-14)** — `src/lib/currency.ts` (`formatPrice`, `formatUsd`, `fromUzs`/`toUzs`), `CurrencyContext` (`useCurrency().price`), `currency=USD` cookie → store loader, USD javoblar `private, no-store` + nginx bypass; kurs `shared/usd-rate.ts` + `server/usd-rate.ts` (cbu.uz, 6 soat, ustama `NULL` bo'lsa `usd_to_uzs` qo'lda); so'mda qoladi: buyurtmalar tarixi, Telegram, SEO, admin.
  - Storefront pages ro'yxatiga `sevimlilar` (noindex, kirishsiz, `FavoritesList`); SEO rules'dagi noindex ro'yxatiga `/sevimlilar`.
  - Data model migratsiyalar ro'yxatiga: "`0032` **dollar kursi** (`settings.usd_markup_percent`/`usd_cbu_rate`/`usd_rate_date`)".
  - Environment & deploy: `server/index.ts` runner'lari qatoriga `createUsdRate(env).start()`.

- [ ] **Step 2: Final verification**

Run: `bun run lint && bun run test`
Expected: lint exit 0; barcha testlar PASS (avvalgi 262 + yangi usd-rate 4, currency 7, validate 4).

- [ ] **Step 3: Commit** — foydalanuvchidan tasdiq so'rang; tasdiqlansa:

```bash
git add migrations/0032_usd_rate.sql shared/usd-rate.ts shared/usd-rate.test.ts server/usd-rate.ts server/index.ts shared/types.ts functions/lib/db.ts functions/lib/validate.ts functions/lib/validate.test.ts app/routes/api.admin.settings.tsx src/admin/SettingsForm.tsx src/admin/errText.ts src/lib/currency.ts src/lib/currency.test.ts src/store/CurrencyContext.tsx app/routes/store.tsx src/store/StoreLayout.tsx deploy/nginx.conf src/store/ProductCard.tsx src/store/ProductPage.tsx src/store/CartPage.tsx src/store/OrderForm.tsx src/store/account/FavoritesList.tsx src/store/PcConfigurator.tsx src/store/ActiveFilterChips.tsx src/store/FilterPanel.tsx src/store/CatalogView.tsx src/locales.ts app/routes/sevimlilar.tsx app/routes.ts src/store/FavoritesContext.tsx src/store/Header.tsx src/store/HeroNotch.tsx src/store/HomePage.tsx CLAUDE.md docs/superpowers/specs/2026-09-14-valyuta-sevimlilar-profil-design.md docs/superpowers/plans/2026-09-14-valyuta-sevimlilar-profil.md
git commit -m "feat(store): UZS/USD valyuta, sevimlilar sahifasi va doim ko'rinadigan Profil"
```
