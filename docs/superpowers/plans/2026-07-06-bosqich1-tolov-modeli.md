# Bosqich 1 — To'lov modeli, narx ko'rsatish, kalkulyator (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Naqd va muddatli xaridorlarni bir vaqtda qondirish — sozlanadigan `paymentMode`, asaxiy uslubidagi ikki-narxli ko'rsatish, va o'zgaruvchan boshlang'ich to'lov (foiz slideri) bilan real-time kalkulyator.

**Architecture:** Biznes yadrosi (`src/lib/installment.ts`) `calcInstallment`ga ixtiyoriy `downPaymentUzs` va yangi `priceView` sof funksiyasini oladi. Ikki yangi sozlama D1'da: `settings.down_payment_max_percent` + `site_config.payment_mode`. Storefront komponentlari (`ProductCard`, `ProductPage`, `CartPage`) `paymentMode`ni Outlet kontekstidan (`StoreContext.config.paymentMode`) o'qib, narxni shu bo'yicha chizadi.

**Tech Stack:** React Router v7 (SSR, Cloudflare Workers), D1 (SQLite migratsiyalar), TypeScript (strict, no `any`), vitest (sof-logika testlari), Tailwind v4 tokenlar.

## Global Constraints

- **Strict TypeScript, no `any`** — barcha yangi kod tiplangan.
- **bun ishlatiladi** (npm emas): `bun run test`, `bun run lint`.
- **Hex ranglar taqiqlangan** komponentlarda — faqat `@theme` tokenlari (`text-muted`, `bg-accent-soft`, …). Ruxsat: white, `#25D366`.
- **Migratsiyani tahrirlash yo'q** — yangi migratsiya qo'shiladi (`0015`; `0014_product_indexes` band).
- **i18n parity** — har yangi kalit `src/locales.ts`da `uz` va `ru` ikkalasida (lint tekshiradi).
- **Shadowlar** generatsiya utillari orqali (`shadow-apple`), `shadow-[--var]` emas.
- **`shared/` — yagona joy** ikkala tsconfig import qila oladigan (`functions/` `src/`ni ko'rmaydi). `PaymentMode` turi shu yerda.
- Commit formati: `feat:`/`fix:`/`chore:`. Test yashil bo'lmaguncha commit yo'q.

---

## Fayl tuzilishi (nima o'zgaradi)

**Sof logika (test bilan):**
- `src/lib/installment.ts` — `calcInstallment` (ixtiyoriy down), yangi `priceView`, `PaymentMode` re-export.
- `src/lib/installment.test.ts` — yangi testlar.
- `functions/lib/validate.ts` + `functions/lib/validate.test.ts` (agar bo'lmasa yaratiladi) — `downPaymentMaxPercent`, `paymentMode` validatsiyasi.

**Shared tur:**
- `shared/types.ts` — `PaymentMode`, `ApiSettings.downPaymentMaxPercent`, `ApiSiteConfig.paymentMode`.

**Backend mappers / yozuv:**
- `functions/lib/db.ts` — `SettingsRow`/`rowToSettings`, `SiteConfigRow`/`rowToSiteConfig`.
- `app/lib/loaders.ts` — `mapConfig`, `staticSiteConfigAsApi`.
- `app/routes/api.admin.settings.tsx`, `app/routes/api.admin.site-config.tsx` — UPDATE/INSERT SQL.
- `app/lib/site.config.ts` — statik fallbackga `paymentMode`.
- `src/data/products.ts` — `InstallmentConfig.downPaymentMaxPercent` + sample.

**Migratsiya:**
- `migrations/0015_payment_mode.sql` — 2 ta `ALTER TABLE ADD COLUMN`.

**Admin UI:**
- `src/admin/SettingsForm.tsx` — max-foiz inputi.
- `src/admin/SiteConfigForm.tsx` — `paymentMode` select.
- `src/admin/errText.ts` — yangi xato kodi matni.

**Storefront UI:**
- `src/store/ProductCard.tsx` — ikki-narxli layout.
- `src/store/ProductPage.tsx` — gating + boshlang'ich to'lov slideri.
- `src/store/CartPage.tsx` — `cash` rejimda muddatli blokni yashirish.
- `src/locales.ts` — yangi kalitlar (uz+ru).

---

## Task 1: `calcInstallment` — o'zgaruvchan boshlang'ich to'lov

**Files:**
- Modify: `src/lib/installment.ts:12-21`
- Modify: `src/data/products.ts:44-50, 77-85` (`InstallmentConfig` turi + sample)
- Modify: `src/lib/installment.test.ts:8-16` (test config) + yangi testlar
- Test: `src/lib/installment.test.ts`

**Interfaces:**
- Produces: `calcInstallment(product: Product, term: Term, config: InstallmentConfig, downPaymentUzs?: number): InstallmentResult` — `downPaymentUzs` berilmasa `config.downPaymentPercent`dan hisoblanadi. `InstallmentConfig` endi `downPaymentMaxPercent: number` maydoniga ega.

- [ ] **Step 1: `InstallmentConfig`ga maydon qo'shish (test qizil bo'lishi uchun oldin tur)**

`src/data/products.ts` — `InstallmentConfig` interfeysiga qo'shing (44-50 atrofida):
```ts
export interface InstallmentConfig {
  /** Boshlang'ich to'lov narxdan foizi (20 = 20%) — minimum. */
  downPaymentPercent: number;
  /** Boshlang'ich to'lovning maksimal foizi (slider ustki chegarasi, masalan 90). */
  downPaymentMaxPercent: number;
  /** Kurs — admin ma'lumoti/narx kiritish uchun (hisobga kirmaydi). */
  usdToUzs: number;
  terms: Term[];
}
```
Va `installmentConfig` sample'iga (77-85):
```ts
export const installmentConfig: InstallmentConfig = {
  downPaymentPercent: 20, // NAMUNA — admin o'zgartiradi
  downPaymentMaxPercent: 90, // NAMUNA — slider maksimumi
  usdToUzs: 12600, // NAMUNA kurs
  terms: [
    { months: 3, markup: 0.1 },
    { months: 6, markup: 0.22 },
    { months: 12, markup: 0.42 },
  ],
};
```

- [ ] **Step 2: Test config'ni yangilash + yangi failing test yozish**

`src/lib/installment.test.ts` — `config` obyektiga `downPaymentMaxPercent: 90,` qatorini qo'shing (8-16), so'ng yangi test qo'shing:
```ts
it('berilgan downPaymentUzs ustama narxdan ayriladi', () => {
  const term: Term = { months: 12, markup: 0.42 };
  // total = 10m×1.42 = 14.2m; down = 5m; monthly = (14.2m−5m)/12
  const r = calcInstallment(product, term, config, 5_000_000);
  expect(r.total).toBe(14_200_000);
  expect(r.downPaymentUzs).toBe(5_000_000);
  expect(r.monthly).toBeCloseTo(766_666.67, 2);
});
```

- [ ] **Step 3: Testni ishga tushirib, qizilligini tekshirish**

Run: `bunx vitest run src/lib/installment.test.ts`
Expected: FAIL — `calcInstallment` 4-argumentni e'tiborsiz qoldiradi, `downPaymentUzs` hali `product.cashPriceUzs × 20%` = 2m qaytaradi.

- [ ] **Step 4: `calcInstallment`ni yangilash**

`src/lib/installment.ts:12-21`:
```ts
export function calcInstallment(
  product: Product,
  term: Term,
  config: InstallmentConfig,
  downPaymentUzs?: number,
): InstallmentResult {
  const total = product.cashPriceUzs * (1 + term.markup);
  const down = downPaymentUzs ?? product.cashPriceUzs * (config.downPaymentPercent / 100);
  const monthly = Math.max(0, (total - down) / term.months);
  return { total, downPaymentUzs: down, monthly };
}
```
(Clamping UI'da — bu funksiya sof qoladi.)

- [ ] **Step 5: Testlarni ishga tushirib, yashilligini tekshirish**

Run: `bunx vitest run src/lib/installment.test.ts`
Expected: PASS (eski testlar ham — 4-arg ixtiyoriy).

- [ ] **Step 6: Commit**

```bash
git add src/lib/installment.ts src/lib/installment.test.ts src/data/products.ts
git commit -m "feat: calcInstallment o'zgaruvchan boshlang'ich to'lovni qo'llab-quvvatlaydi"
```

---

## Task 2: `priceView` + `PaymentMode` turi

**Files:**
- Modify: `shared/types.ts` (`PaymentMode` turi)
- Modify: `src/lib/installment.ts` (import + `priceView`)
- Test: `src/lib/installment.test.ts`

**Interfaces:**
- Consumes: Task 1 `InstallmentConfig`, `lowestMonthly`.
- Produces:
  - `shared/types.ts`: `export type PaymentMode = 'both' | 'cash' | 'installment';`
  - `installment.ts`: `priceView(product: Product, config: InstallmentConfig, mode: PaymentMode): { cashUzs: number; monthlyUzs: number; showMonthly: boolean; monthlyPrimary: boolean }` — `cashUzs = product.minPriceUzs`; `monthlyUzs` = eng past oylik (minPriceUzs bo'yicha); `showMonthly = mode !== 'cash'`; `monthlyPrimary = mode === 'installment'`.

- [ ] **Step 1: `PaymentMode` turini `shared/types.ts`ga qo'shish**

`shared/types.ts` yuqorisiga (import'lardan keyin):
```ts
export type PaymentMode = 'both' | 'cash' | 'installment';
```

- [ ] **Step 2: Failing test yozish**

`src/lib/installment.test.ts` — import qatoriga `priceView` qo'shing va yangi blok:
```ts
describe('priceView', () => {
  const p = { ...product, minPriceUzs: 8_000_000 };
  it("both — naqd birlamchi, oylik ko'rinadi", () => {
    const v = priceView(p, config, 'both');
    expect(v.cashUzs).toBe(8_000_000);
    expect(v.showMonthly).toBe(true);
    expect(v.monthlyPrimary).toBe(false);
    expect(v.monthlyUzs).toBeGreaterThan(0);
  });
  it('cash — oylik yashirin', () => {
    const v = priceView(p, config, 'cash');
    expect(v.showMonthly).toBe(false);
  });
  it('installment — oylik birlamchi', () => {
    const v = priceView(p, config, 'installment');
    expect(v.monthlyPrimary).toBe(true);
    expect(v.showMonthly).toBe(true);
  });
});
```

- [ ] **Step 3: Testni ishga tushirib qizilligini ko'rish**

Run: `bunx vitest run src/lib/installment.test.ts`
Expected: FAIL — `priceView is not a function`.

- [ ] **Step 4: `priceView`ni implement qilish**

`src/lib/installment.ts` — yuqoriga import qo'shing:
```ts
import type { PaymentMode } from '../../shared/types';
```
va faylga qo'shing (`lowestMonthly`dan keyin):
```ts
export type { PaymentMode };

/** Kartalar/sahifa uchun narx ko'rinishi: naqd + eng past oylik, rejim bo'yicha gating.
 * Oylik minPriceUzs (eng arzon variant) bo'yicha — kartada ko'rinadigan narx bilan mos. */
export function priceView(product: Product, config: InstallmentConfig, mode: PaymentMode) {
  const monthlyUzs = lowestMonthly({ ...product, cashPriceUzs: product.minPriceUzs }, config);
  return {
    cashUzs: product.minPriceUzs,
    monthlyUzs,
    showMonthly: mode !== 'cash',
    monthlyPrimary: mode === 'installment',
  };
}
```

- [ ] **Step 5: Testlarni yashil qilish**

Run: `bunx vitest run src/lib/installment.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add shared/types.ts src/lib/installment.ts src/lib/installment.test.ts
git commit -m "feat: priceView yordamchisi + PaymentMode turi"
```

---

## Task 3: `downPaymentMaxPercent` — settings uchun uchdan-uchgacha

**Files:**
- Create: `migrations/0015_payment_mode.sql`
- Modify: `shared/types.ts` (`ApiSettings`)
- Modify: `functions/lib/db.ts:43-48, 69-76` (`SettingsRow`, `rowToSettings`)
- Modify: `functions/lib/validate.ts:193-210` (`parseSettingsInput`)
- Modify: `app/lib/loaders.ts:37-39` (`mapConfig`)
- Modify: `app/routes/api.admin.settings.tsx:12-17` (UPDATE SQL)
- Modify: `src/admin/SettingsForm.tsx` (input)
- Modify: `src/admin/errText.ts` (xato matni)
- Create/Modify test: `functions/lib/validate.test.ts`

**Interfaces:**
- Consumes: Task 1 `InstallmentConfig.downPaymentMaxPercent`.
- Produces: `ApiSettings.downPaymentMaxPercent: number`; `parseSettingsInput` uni tekshiradi (`downPaymentPercent ≤ max ≤ 100`, aks holda `down_payment_max_range`).

- [ ] **Step 1: Migratsiya faylini yaratish**

`migrations/0015_payment_mode.sql`:
```sql
-- Bosqich 1: sozlanadigan to'lov rejimi + boshlang'ich to'lov maksimumi (slider)
ALTER TABLE settings ADD COLUMN down_payment_max_percent REAL NOT NULL DEFAULT 90;
ALTER TABLE site_config ADD COLUMN payment_mode TEXT NOT NULL DEFAULT 'both';
```
(Ikkala ustun ham; `site_config.payment_mode` Task 4'da ishlatiladi. `DEFAULT` tufayli mavjud qatorlar avtomatik to'ladi.)

- [ ] **Step 2: Migratsiyani lokal D1'ga qo'llash**

Run: `bunx wrangler d1 migrations apply taqsit-store-db --local`
Expected: `0015_payment_mode.sql` muvaffaqiyatli qo'llanadi.

- [ ] **Step 3: Failing validatsiya testini yozish**

`functions/lib/validate.test.ts` (bo'lmasa yarating; bor bo'lsa qo'shing):
```ts
import { describe, it, expect } from 'vitest';
import { parseSettingsInput, ValidationError } from './validate';

const base = {
  downPaymentPercent: 20, downPaymentMaxPercent: 90, usdToUzs: 12600,
  terms: [{ months: 3, markup: 0.1 }],
};

describe('parseSettingsInput — downPaymentMaxPercent', () => {
  it('to\'g\'ri qiymatni qabul qiladi', () => {
    expect(parseSettingsInput(base).downPaymentMaxPercent).toBe(90);
  });
  it('max < min bo\'lsa rad etadi', () => {
    expect(() => parseSettingsInput({ ...base, downPaymentMaxPercent: 10 }))
      .toThrow(ValidationError);
  });
  it('max > 100 bo\'lsa rad etadi', () => {
    expect(() => parseSettingsInput({ ...base, downPaymentMaxPercent: 120 }))
      .toThrow(ValidationError);
  });
});
```
(`ValidationError` `validate.ts`dan eksport qilinganini tekshiring; qilinmagan bo'lsa `export`ga o'ting.)

- [ ] **Step 4: Testni ishga tushirib qizilligini ko'rish**

Run: `bunx vitest run functions/lib/validate.test.ts`
Expected: FAIL — `parseSettingsInput` `downPaymentMaxPercent`ni qaytarmaydi/tekshirmaydi.

- [ ] **Step 5: Tur + mapper + parse + write + fallbacklarni yangilash**

`shared/types.ts` — `ApiSettings`ga:
```ts
export interface ApiSettings {
  downPaymentPercent: number;
  downPaymentMaxPercent: number;
  usdToUzs: number;
  terms: Term[];
}
```

`functions/lib/db.ts` — `SettingsRow` (43-48):
```ts
export interface SettingsRow {
  id: number;
  down_payment_percent: number;
  down_payment_max_percent: number;
  usd_to_uzs: number;
  terms: string;
}
```
`rowToSettings` (69-76):
```ts
export function rowToSettings(row: SettingsRow): ApiSettings {
  const terms = JSON.parse(row.terms) as Term[];
  return {
    downPaymentPercent: row.down_payment_percent,
    downPaymentMaxPercent: row.down_payment_max_percent,
    usdToUzs: row.usd_to_uzs,
    terms,
  };
}
```

`functions/lib/validate.ts` — `parseSettingsInput` (195-209 orasiga qo'shing):
```ts
  const downPaymentMaxPercent = reqNumber(o, 'downPaymentMaxPercent');
  if (downPaymentMaxPercent < downPaymentPercent || downPaymentMaxPercent > 100)
    throw new ValidationError('down_payment_max_range');
```
va `return`ni yangilang:
```ts
  return { downPaymentPercent, downPaymentMaxPercent, usdToUzs, terms };
```

`app/lib/loaders.ts` — `mapConfig` (37-39):
```ts
function mapConfig(s: ApiSettings): InstallmentConfig {
  return {
    downPaymentPercent: s.downPaymentPercent,
    downPaymentMaxPercent: s.downPaymentMaxPercent,
    usdToUzs: s.usdToUzs,
    terms: s.terms,
  };
}
```

`app/routes/api.admin.settings.tsx` (12-17) — UPDATE:
```ts
  await env.DB.prepare(
    'UPDATE settings SET down_payment_percent=?, down_payment_max_percent=?, usd_to_uzs=?, terms=? WHERE id=1',
  )
    .bind(input.downPaymentPercent, input.downPaymentMaxPercent, input.usdToUzs, JSON.stringify(input.terms))
    .run();
```

- [ ] **Step 6: Testni yashil qilish**

Run: `bunx vitest run functions/lib/validate.test.ts src/lib/installment.test.ts`
Expected: PASS (installment testi ham — sample config Task 1'da yangilangan).

- [ ] **Step 7: Admin form + xato matni**

`src/admin/errText.ts` — kodlar xaritasiga qo'shing:
```ts
down_payment_max_range: "Maksimal boshlang'ich foizi minimumdan katta va 100 dan kichik bo'lsin",
```

`src/admin/SettingsForm.tsx` — minimum foiz inputidan keyin (72-qatordan keyin) qo'shing:
```tsx
      <label className="flex items-center justify-between mb-3 text-[14px]">
        Maksimal boshlang'ich foizi (%)
        <input
          type="number"
          className={input}
          value={s.downPaymentMaxPercent}
          onChange={(e) => setS({ ...s, downPaymentMaxPercent: Number(e.target.value) })}
        />
      </label>
```

- [ ] **Step 8: Lint**

Run: `bun run lint`
Expected: xatosiz (typegen + tsc).

- [ ] **Step 9: Commit**

```bash
git add migrations/0015_payment_mode.sql shared/types.ts functions/lib/db.ts functions/lib/validate.ts functions/lib/validate.test.ts app/lib/loaders.ts app/routes/api.admin.settings.tsx src/admin/SettingsForm.tsx src/admin/errText.ts
git commit -m "feat: downPaymentMaxPercent sozlamasi (slider maksimumi)"
```

---

## Task 4: `paymentMode` — site_config uchun uchdan-uchgacha

**Files:**
- Modify: `shared/types.ts` (`ApiSiteConfig`)
- Modify: `functions/lib/db.ts:454-483` (`SiteConfigRow`, `rowToSiteConfig`)
- Modify: `functions/lib/validate.ts:317-342` (`parseSiteConfigInput`)
- Modify: `app/routes/api.admin.site-config.tsx:23-26` (INSERT SQL)
- Modify: `app/lib/site.config.ts` + `app/lib/loaders.ts:219-233` (`staticSiteConfigAsApi`)
- Modify: `src/admin/SiteConfigForm.tsx` (select)
- Test: `functions/lib/validate.test.ts`

**Interfaces:**
- Consumes: Task 2 `PaymentMode`; migratsiya `0015` `site_config.payment_mode` ustuni.
- Produces: `ApiSiteConfig.paymentMode: PaymentMode`; `parseSiteConfigInput` noto'g'ri/yo'q qiymatda `'both'`ga tushadi.

- [ ] **Step 1: Failing test yozish**

`functions/lib/validate.test.ts`ga qo'shing:
```ts
import { parseSiteConfigInput } from './validate';

const siteBase = { name: 'S', phone: '+998900000000' };

describe('parseSiteConfigInput — paymentMode', () => {
  it("yo'q bo'lsa 'both'ga tushadi", () => {
    expect(parseSiteConfigInput(siteBase).paymentMode).toBe('both');
  });
  it("'cash' va 'installment'ni qabul qiladi", () => {
    expect(parseSiteConfigInput({ ...siteBase, paymentMode: 'cash' }).paymentMode).toBe('cash');
    expect(parseSiteConfigInput({ ...siteBase, paymentMode: 'installment' }).paymentMode).toBe('installment');
  });
  it("noto'g'ri qiymat 'both'ga tushadi", () => {
    expect(parseSiteConfigInput({ ...siteBase, paymentMode: 'xyz' }).paymentMode).toBe('both');
  });
});
```

- [ ] **Step 2: Testni qizil ko'rish**

Run: `bunx vitest run functions/lib/validate.test.ts`
Expected: FAIL — `paymentMode` `undefined`.

- [ ] **Step 3: Tur + mapper + parse + write + statik fallbackni yangilash**

`shared/types.ts` — `ApiSiteConfig`ga `paymentMode` (import `PaymentMode` shu faylda ta'riflangan):
```ts
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
  paymentMode: PaymentMode;
}
```

`functions/lib/db.ts` — `SiteConfigRow` (454-459) oxiriga `payment_mode: string;` qo'shing; `rowToSiteConfig` (476-483):
```ts
export function rowToSiteConfig(r: SiteConfigRow): ApiSiteConfig {
  return {
    name: r.name, phone: r.phone, phoneDisplay: r.phone_display,
    telegram: r.telegram, instagram: r.instagram, whatsapp: r.whatsapp,
    mapLl: r.map_ll, mapLabel: r.map_label,
    seoTitleSuffix: r.seo_title_suffix, seoDescription: r.seo_description, ogImage: r.og_image,
    paymentMode: (r.payment_mode === 'cash' || r.payment_mode === 'installment') ? r.payment_mode : 'both',
  };
}
```
(`PaymentMode` `db.ts`ga import qilinganini tekshiring: `import type { ..., PaymentMode } from '...types'` — 11-qator atrofidagi tur importiga qo'shing.)

`functions/lib/validate.ts` — `parseSiteConfigInput` (329 `return`dan oldin):
```ts
  const pm = opt('paymentMode');
  const paymentMode: PaymentMode = pm === 'cash' || pm === 'installment' ? pm : 'both';
```
va `return` obyektiga `paymentMode,` qo'shing. Fayl boshiga `import type { ..., PaymentMode }` (mavjud types importiga qo'shing).

`app/routes/api.admin.site-config.tsx` (23-26) — INSERT OR REPLACE'ga `payment_mode` ustuni:
```ts
  await env.DB.prepare(
    'INSERT OR REPLACE INTO site_config (id, name, phone, phone_display, telegram, instagram, whatsapp, map_ll, map_label, seo_title_suffix, seo_description, og_image, payment_mode) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).bind(input.name, input.phone, input.phoneDisplay, input.telegram, input.instagram, input.whatsapp,
    input.mapLl, input.mapLabel, input.seoTitleSuffix, input.seoDescription, input.ogImage, input.paymentMode).run();
```

`app/lib/site.config.ts` — obyektga `paymentMode: 'both' as const,` qo'shing (masalan `seo` blokidan oldin):
```ts
  paymentMode: 'both',
```
`app/lib/loaders.ts` — `staticSiteConfigAsApi` (219-233) return'iga qo'shing:
```ts
    paymentMode: 'both',
```

- [ ] **Step 4: Testni yashil qilish**

Run: `bunx vitest run functions/lib/validate.test.ts`
Expected: PASS.

- [ ] **Step 5: Admin select qo'shish**

`src/admin/SiteConfigForm.tsx` — `FIELDS.map(...)` blokidan keyin, `{msg && ...}`dan oldin:
```tsx
      <label className="block text-[13px] text-muted">
        To'lov rejimi
        <select
          value={form.paymentMode}
          onChange={(e) => setForm({ ...form, paymentMode: e.target.value as ApiSiteConfig['paymentMode'] })}
          className="mt-1 w-full border border-line-2 rounded-xl px-3 py-2 text-[14px] text-primary"
        >
          <option value="both">Naqd + muddatli</option>
          <option value="cash">Faqat naqd</option>
          <option value="installment">Faqat muddatli</option>
        </select>
      </label>
```

- [ ] **Step 6: Lint**

Run: `bun run lint`
Expected: xatosiz.

- [ ] **Step 7: Commit**

```bash
git add shared/types.ts functions/lib/db.ts functions/lib/validate.ts functions/lib/validate.test.ts app/routes/api.admin.site-config.tsx app/lib/site.config.ts app/lib/loaders.ts src/admin/SiteConfigForm.tsx
git commit -m "feat: sozlanadigan paymentMode (naqd/muddatli/ikkalasi)"
```

---

## Task 5: `ProductCard` — asaxiy uslubidagi ikki-narxli layout

**Files:**
- Modify: `src/store/ProductCard.tsx`
- Modify: `src/locales.ts` (yangi kalit `cardMonthlyFrom`)

**Interfaces:**
- Consumes: Task 2 `priceView`; `StoreContext.config.paymentMode` (`useOutletContext`).

- [ ] **Step 1: i18n kalitini qo'shish (uz+ru)**

`src/locales.ts` — ikkala tilda:
```ts
// uz
cardMonthlyFrom: 'oyiga {v} dan',
// ru
cardMonthlyFrom: 'от {v}/oy',
```
(Ruscha ham "oy" qoladi — narx suffiksi `t.sum` orqali lokalizatsiya bo'ladi; xohlasangiz ru "от {v}/мес" — lekin `formatUzs` allaqachon suffiks qo'shadi, `{v}` = "199 900 сум". Tavsiya: `ru: 'от {v}/мес'`.)

- [ ] **Step 2: `ProductCard`ni yangilash**

`src/store/ProductCard.tsx` — importlarga:
```ts
import { useOutletContext } from 'react-router';
import type { StoreContext } from './StoreLayout';
import { discountPercent, formatUzs, priceView } from '../lib/installment';
```
Komponent ichida (`showsBasePrice`dan oldin):
```ts
  const { config: site } = useOutletContext<StoreContext>();
  const pv = priceView(product, config, site.paymentMode);
```
Narx blokini (65-75 orasidagi mavjud oylik/narx) quyidagi bilan almashtiring:
```tsx
        <div className="mt-auto pt-4">
          {pv.monthlyPrimary ? (
            <>
              <div className="text-[11px] uppercase tracking-wide text-muted-2 font-medium">{t.catalogMonthlyLabel}</div>
              <div className="text-[20px] md:text-[23px] font-semibold tracking-[-0.01em] text-primary leading-tight">
                {formatUzs(pv.monthlyUzs, t.sum)}
              </div>
              <div className="text-[12px] text-muted mt-1 mb-4 flex items-center gap-2 flex-wrap">
                {disc !== null && product.oldPriceUzs && (
                  <span className="line-through text-disabled-2">{formatUzs(product.oldPriceUzs, t.sum)}</span>
                )}
                <span className="text-muted">{formatUzs(pv.cashUzs, t.sum)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[20px] md:text-[23px] font-semibold tracking-[-0.01em] text-primary leading-tight tabular-nums">
                  {formatUzs(pv.cashUzs, t.sum)}
                </span>
                {disc !== null && product.oldPriceUzs && (
                  <span className="text-[12px] line-through text-disabled-2 tabular-nums">{formatUzs(product.oldPriceUzs, t.sum)}</span>
                )}
              </div>
              {pv.showMonthly && (
                <div className="text-[12px] text-muted mt-1 mb-4">
                  {t.cardMonthlyFrom.replace('{v}', formatUzs(pv.monthlyUzs, t.sum))}
                </div>
              )}
              {!pv.showMonthly && <div className="mb-4" />}
            </>
          )}
          <LocaleLink ... />  {/* mavjud "Tanlash" CTA o'zgarmaydi */}
        </div>
```
(Eski `lowestMonthly({ ...product, cashPriceUzs: product.minPriceUzs }, config)` chaqiruvi endi `pv.monthlyUzs` bilan almashtirildi — `lowestMonthly` importini olib tashlang agar boshqa joyda ishlatilmasa.)

- [ ] **Step 3: Lint**

Run: `bun run lint`
Expected: xatosiz (i18n parity ham).

- [ ] **Step 4: Vizual tekshiruv**

Run: `bun run dev` → `http://localhost:5173` bosh sahifa.
Expected: `both` (default) rejimda karta naqd narxni katta, ostida "oyiga … dan" ko'rsatadi. Admin "Sayt ma'lumotlari"da `Faqat naqd` tanlansa — "oyiga…" qatori yo'qoladi.

- [ ] **Step 5: Commit**

```bash
git add src/store/ProductCard.tsx src/locales.ts
git commit -m "feat: ProductCard ikki-narxli (naqd birlamchi + oylik) layout"
```

---

## Task 6: `ProductPage` — rejim gating + boshlang'ich to'lov slideri

**Files:**
- Modify: `src/store/ProductPage.tsx`

**Interfaces:**
- Consumes: Task 1 `calcInstallment(…, downPaymentUzs)`, Task 2 `PaymentMode`; `StoreContext.config.paymentMode`.

- [ ] **Step 1: Rejim + slider holatini qo'shish**

`src/store/ProductPage.tsx` — importlarga `useOutletContext` + `StoreContext`:
```ts
import { useOutletContext } from 'react-router';
import type { StoreContext } from './StoreLayout';
```
Komponent ichida (`months` state'dan keyin):
```ts
  const { config: siteCfg } = useOutletContext<StoreContext>();
  const showInstallment = siteCfg.paymentMode !== 'cash';
  // Boshlang'ich to'lov foizi — min (config.downPaymentPercent) dan max (downPaymentMaxPercent) gacha slider.
  const [downPct, setDownPct] = useState(config.downPaymentPercent);
```
`result` `useMemo`'sini yangilang — tanlangan foizdan `downPaymentUzs`:
```ts
  const result = useMemo(() => {
    const term = config.terms.find((x) => x.months === months) ?? config.terms[config.terms.length - 1];
    const downPaymentUzs = displayCash * (downPct / 100);
    return calcInstallment({ ...product, cashPriceUzs: displayCash }, term, config, downPaymentUzs);
  }, [product, config, months, displayCash, downPct]);
```

- [ ] **Step 2: Kalkulyator blokini gating + slider bilan yangilash**

Mavjud `{config && result && ( … )}` blokini `{showInstallment && config && result && ( … )}` bilan o'rang, va `TermSegments`dan keyin (147-qatordan keyin) boshlang'ich to'lov slideri qo'shing:
```tsx
              <div className="mt-5">
                <div className="flex items-center justify-between text-[13px] mb-2">
                  <span className="font-semibold text-muted">{t.calcDownPayment}</span>
                  <span className="font-semibold text-primary tabular-nums">
                    {downPct}% · {formatUzs(result.downPaymentUzs, t.sum)}
                  </span>
                </div>
                <input
                  type="range"
                  min={config.downPaymentPercent}
                  max={config.downPaymentMaxPercent}
                  step={1}
                  value={downPct}
                  onChange={(e) => setDownPct(Number(e.target.value))}
                  aria-label={t.calcDownPayment}
                  className="w-full accent-accent"
                />
              </div>
```
Blok pastidagi mavjud "Boshlang'ich to'lov" statik qatorini (161-163) olib tashlang — endi slider yonida ko'rsatiladi (dublikat bo'lmasin). "Jami" qatori (`t.calcTotal`) qoladi.

- [ ] **Step 3: `cash` rejimda naqd asosiy ekanini ta'minlash**

Mavjud narx bloki (96-104) `both`/`cash`da naqd narxni allaqachon katta ko'rsatadi — o'zgarmaydi. `installment` rejimda ham naqd sarlavha narxi qoladi (kalkulyator oylikni beradi). Qo'shimcha kod shart emas; faqat kalkulyator/slider `showInstallment` bilan gated.

- [ ] **Step 4: Lint**

Run: `bun run lint`
Expected: xatosiz.

- [ ] **Step 5: Vizual tekshiruv**

Run: `bun run dev` → biror mahsulot sahifasi.
Expected: `both` rejimda muddat segmentlari + boshlang'ich slider ko'rinadi; sliderni surganda oylik real-time o'zgaradi (min→max foiz). Admin `Faqat naqd`da butun kalkulyator/slider yo'qoladi.

- [ ] **Step 6: Commit**

```bash
git add src/store/ProductPage.tsx
git commit -m "feat: ProductPage boshlang'ich to'lov slideri + rejim gating"
```

---

## Task 7: `CartPage` — `cash` rejimda muddatli blokni yashirish

**Files:**
- Modify: `src/store/CartPage.tsx`

**Interfaces:**
- Consumes: `StoreContext.config.paymentMode`.

- [ ] **Step 1: Rejimni o'qish va muddatli blokni gating**

`src/store/CartPage.tsx` — `site`/config kontekstini o'qing (agar `useOutletContext` allaqachon ishlatilmasa qo'shing):
```ts
import { useOutletContext } from 'react-router';
import type { StoreContext } from './StoreLayout';
```
Komponent ichida:
```ts
  const { config: siteCfg } = useOutletContext<StoreContext>();
  const showInstallment = siteCfg.paymentMode !== 'cash';
```
Muddatli hisob qatorlarini (`calcDownPayment`, oylik, muddat — 85-98 atrofi) `{showInstallment && ( … )}` bilan o'rang. `cartTotalCash` (jami naqd) qatori doim ko'rinadi. Telegram/WhatsApp buyurtma tugmalari Bosqich 1'da o'zgarmaydi (Bosqich 2'da one-click bilan almashtiriladi).

- [ ] **Step 2: Lint**

Run: `bun run lint`
Expected: xatosiz.

- [ ] **Step 3: Vizual tekshiruv**

Run: `bun run dev` → savatga mahsulot qo'shib `/savat`.
Expected: `both`da muddatli hisob ko'rinadi; admin `Faqat naqd`da faqat jami naqd summa qoladi.

- [ ] **Step 4: To'liq test + lint (yakuniy)**

Run: `bun run test && bun run lint`
Expected: barcha testlar PASS, lint xatosiz.

- [ ] **Step 5: Commit**

```bash
git add src/store/CartPage.tsx
git commit -m "feat: CartPage cash rejimda muddatli blokni yashiradi"
```

---

## Self-Review (reja muallifi tomonidan bajarildi)

**Spec qamrovi (§4 Bosqich 1):**
- `paymentMode` (both/cash/installment) → Task 4 + 5/6/7 gating. ✓
- Ikki-narxli ko'rsatish (asaxiy) → Task 5 (`priceView` + card layout). ✓
- O'zgaruvchan boshlang'ich to'lov, **foiz** slider (min→max) → Task 1 (`calcInstallment`) + Task 3 (`downPaymentMaxPercent`) + Task 6 (slider). ✓
- Biznes yadrosi chiziqliligi saqlanadi (`cartInstallment` default min down orqali o'zgarmaydi). ✓

**Placeholder skani:** "TBD"/"TODO" yo'q; har code step to'liq kod bilan. ✓

**Tur mosligi:** `PaymentMode` `shared/types.ts`da bir marta ta'riflanadi, `installment.ts` re-eksport qiladi; `calcInstallment`ning 4-argumenti (`downPaymentUzs?`) Task 1'da ta'riflanib Task 6'da ishlatiladi — imzolar mos. `priceView` qaytish shakli Task 2'da ta'riflanib Task 5'da ishlatiladi — mos. ✓

**Diqqat (implementorga):** Task 5/6/7 komponent testsiz (repo konvensiyasi — sof-logika testlari) — `bun run lint` + `bun run dev` vizual tekshiruv bilan tasdiqlanadi. Task 3 migratsiya lokal D1'ga qo'llanishi shart (`--local`), aks holda dev'da eski sxema fallbackga tushadi.
