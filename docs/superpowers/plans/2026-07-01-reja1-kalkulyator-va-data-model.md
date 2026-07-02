# Reja 1 — Kalkulyator mantig'i va ma'lumot modeli (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Kalkulyator mantig'ini admin-sozlanadigan **foizli boshlang'ich to'lov** + **to'liq narxga ustama** modeliga o'tkazish va vitest bilan testlar bilan qotirish; keyingi rejalar (backend, admin) uchun umumiy tiplarni tayyorlash.

**Architecture:** Mavjud pure helper `src/lib/installment.ts` va tip fayli `src/data/products.ts` refaktor qilinadi. Sayt hozircha lokal statik ma'lumot bilan ishlashda davom etadi — faqat hisob formulasi va tiplar o'zgaradi. Yangi vitest test to'plami toza matematikani qamrab oladi.

**Tech Stack:** React 19 + Vite 6 + TypeScript (strict, `noEmit`), Tailwind v4, vitest (yangi), bun (paket menejeri).

## Global Constraints

- Strict TypeScript, `any` **ishlatilmaydi** (`bun run lint` = `tsc --noEmit` toza bo'lishi shart).
- Paket menejeri: **bun** (`bun add`, `bun run`), npm emas.
- Commit formati: `feat:`, `fix:`, `chore:`, `docs:`.
- Pul qiymatlari so'mda; ko'rsatishda `formatUzs` (bo'sh joyli format) ishlatiladi.
- Kalkulyator formulasi (PRD §4, o'zgarmas):
  - `jami = cash_price × (1 + markup)`
  - `boshlangich = cash_price × (down_payment_percent / 100)`
  - `qoldiq = jami − boshlangich`
  - `oylik = max(0, qoldiq / months)`
- Do'kon kontaktlari o'zgarmaydi: Telegram `Taqsit_store`, WhatsApp `998886043636`.

---

## File Structure

- `package.json` — vitest devDependency + `test` skript qo'shiladi (Modify).
- `vitest.config.ts` — vitest sozlamasi (Create).
- `src/data/products.ts` — `Product`ga `condition`/`conditionNote`, `InstallmentConfig`da `downPaymentUsd` → `downPaymentPercent` (Modify).
- `src/lib/installment.ts` — `calcInstallment` foizli modelga o'tadi (Modify).
- `src/lib/installment.test.ts` — kalkulyator testlari (Create).

Iste'molchilar (`Calculator.tsx`, `Catalog.tsx`, `ApplicationForm.tsx`) `calcInstallment`/`lowestMonthly` publik imzosidan foydalanadi — ular o'zgarmaydi (funksiya ichki mantig'i o'zgaradi, imzo o'sha-o'sha).

---

### Task 1: Vitest test muhitini o'rnatish

**Files:**
- Modify: `package.json` (scripts + devDependencies)
- Create: `vitest.config.ts`

**Interfaces:**
- Consumes: yo'q.
- Produces: `bun run test` buyrug'i — vitest'ni bir marta ishga tushiradi (`vitest run`).

- [x] **Step 1: Vitest'ni dev-paket sifatida qo'shish**

Run:
```bash
bun add -d vitest
```
Expected: `package.json` `devDependencies` ichida `vitest` paydo bo'ladi, `bun.lockb` yangilanadi.

- [x] **Step 2: `test` skriptini qo'shish**

`package.json` ichidagi `scripts` blokiga `test` qatorini qo'shing:

```json
  "scripts": {
    "dev": "vite --port=3001 --host=0.0.0.0",
    "build": "vite build",
    "preview": "vite preview",
    "clean": "rm -rf dist",
    "lint": "tsc --noEmit",
    "test": "vitest run"
  },
```

- [x] **Step 3: Vitest config faylini yaratish**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [x] **Step 4: Bo'sh holatda testlar ishga tushishini tekshirish**

Run:
```bash
bun run test
```
Expected: vitest ishga tushadi va "No test files found" (yoki shunga o'xshash) xabari bilan xatosiz tugaydi. (Hali test fayli yo'q.)

- [x] **Step 5: Commit**

```bash
git add package.json bun.lockb vitest.config.ts
git commit -m "chore: add vitest test runner"
```

---

### Task 2: Kalkulyatorni foizli modelga o'tkazish (TDD) + tiplarni yangilash

**Files:**
- Create: `src/lib/installment.test.ts`
- Modify: `src/data/products.ts`
- Modify: `src/lib/installment.ts`

**Interfaces:**
- Consumes: Task 1 `bun run test`.
- Produces:
  - `Product` tipi: `{ id: string; name: string; category: Category; condition: 'yangi' | 'ishlatilgan'; conditionNote?: string; image: string; cashPriceUzs: number }`
  - `Term` tipi: `{ months: number; markup: number }`
  - `InstallmentConfig` tipi: `{ downPaymentPercent: number; usdToUzs: number; terms: Term[] }`
  - `calcInstallment(product: Product, term: Term, config: InstallmentConfig): InstallmentResult`
  - `InstallmentResult`: `{ total: number; downPaymentUzs: number; monthly: number }`
  - `lowestMonthly(product: Product, config: InstallmentConfig): number`

- [x] **Step 1: Failing testlarni yozish**

Create `src/lib/installment.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { InstallmentConfig, Product, Term } from '../data/products';
import { calcInstallment, formatUzs, lowestMonthly } from './installment';

const config: InstallmentConfig = {
  downPaymentPercent: 20,
  usdToUzs: 12600,
  terms: [
    { months: 3, markup: 0.1 },
    { months: 6, markup: 0.22 },
    { months: 12, markup: 0.42 },
  ],
};

const product: Product = {
  id: 'iphone-16',
  name: 'iPhone 16',
  category: 'iphone',
  condition: 'yangi',
  image: 'x',
  cashPriceUzs: 10_000_000,
};

describe('calcInstallment', () => {
  it('ustamani to\'liq narxga, boshlang\'ichni narxdan foizga qo\'llaydi', () => {
    const term: Term = { months: 12, markup: 0.42 };
    const r = calcInstallment(product, term, config);
    expect(r.total).toBe(14_200_000);
    expect(r.downPaymentUzs).toBe(2_000_000);
    expect(r.monthly).toBeCloseTo(1_016_666.67, 2);
  });

  it('0% boshlang\'ich va 0% ustamada oddiy bo\'linish', () => {
    const zeroConfig: InstallmentConfig = { ...config, downPaymentPercent: 0 };
    const term: Term = { months: 3, markup: 0 };
    const r = calcInstallment({ ...product, cashPriceUzs: 5_000_000 }, term, zeroConfig);
    expect(r.total).toBe(5_000_000);
    expect(r.downPaymentUzs).toBe(0);
    expect(r.monthly).toBeCloseTo(1_666_666.67, 2);
  });

  it('boshlang\'ich jamiga teng bo\'lsa oylik manfiy emas, 0 bo\'ladi', () => {
    const fullConfig: InstallmentConfig = { ...config, downPaymentPercent: 100 };
    const term: Term = { months: 6, markup: 0 };
    const r = calcInstallment({ ...product, cashPriceUzs: 1_000_000 }, term, fullConfig);
    expect(r.total).toBe(1_000_000);
    expect(r.downPaymentUzs).toBe(1_000_000);
    expect(r.monthly).toBe(0);
  });
});

describe('lowestMonthly', () => {
  it('eng uzoq muddat bo\'yicha oylikni qaytaradi', () => {
    const expected = calcInstallment(product, { months: 12, markup: 0.42 }, config).monthly;
    expect(lowestMonthly(product, config)).toBeCloseTo(expected, 2);
  });
});

describe('formatUzs', () => {
  it('yaxlitlab, bo\'sh joy bilan formatlaydi', () => {
    expect(formatUzs(1_016_666.67)).toBe("1 016 667 so'm");
  });
});
```

- [x] **Step 2: Testni ishga tushirib, muvaffaqiyatsizligiga ishonch hosil qilish**

Run:
```bash
bun run test
```
Expected: FAIL — `downPaymentPercent` tipi mavjud emas / `calcInstallment` eski `downPaymentUsd` bilan hisoblab, `total` va `downPaymentUzs` kutilganidan farq qiladi.

- [x] **Step 3: Tiplar va lokal ma'lumotni yangilash**

`src/data/products.ts` faylini to'liq quyidagiga almashtiring:

```ts
import iph1 from '../assets/images/iph1.webp';
import mac1 from '../assets/images/mac1.webp';
import pad1 from '../assets/images/pad1.webp';
import imac1 from '../assets/images/imac1.webp';
import mini from '../assets/images/mini.webp';
import pc from '../assets/images/pc.webp';

export type Category = 'iphone' | 'mac' | 'ipad' | 'pc';
export type Condition = 'yangi' | 'ishlatilgan';

export interface Product {
  id: string;
  name: string;
  category: Category;
  condition: Condition;
  /** Ishlatilgan uchun holat izohi, masalan "95% holat". */
  conditionNote?: string;
  image: string;
  /** Naqd (to'liq) narx, so'mda. NAMUNA — egasi keyin almashtiradi. */
  cashPriceUzs: number;
}

export interface Term {
  months: number;
  /** Ustama foiz (0.10 = +10%). NAMUNA. */
  markup: number;
}

export interface InstallmentConfig {
  /** Boshlang'ich to'lov narxdan foizi (20 = 20%). */
  downPaymentPercent: number;
  /** Kurs — admin ma'lumoti/narx kiritish uchun (hisobga kirmaydi). */
  usdToUzs: number;
  terms: Term[];
}

export const installmentConfig: InstallmentConfig = {
  downPaymentPercent: 20, // NAMUNA — admin o'zgartiradi
  usdToUzs: 12600, // NAMUNA kurs
  terms: [
    { months: 3, markup: 0.1 },
    { months: 6, markup: 0.22 },
    { months: 12, markup: 0.42 },
  ],
};

// NAMUNA narxlar — egasi keyin real narxlarga almashtiradi.
export const products: Product[] = [
  { id: 'iphone-17-pro', name: 'iPhone 17 Pro', category: 'iphone', condition: 'yangi', image: iph1, cashPriceUzs: 18_500_000 },
  { id: 'iphone-16', name: 'iPhone 16', category: 'iphone', condition: 'yangi', image: iph1, cashPriceUzs: 12_900_000 },
  { id: 'macbook-pro', name: 'MacBook Pro', category: 'mac', condition: 'yangi', image: mac1, cashPriceUzs: 32_000_000 },
  { id: 'macbook-air', name: 'MacBook Air', category: 'mac', condition: 'yangi', image: mac1, cashPriceUzs: 19_900_000 },
  { id: 'ipad-pro', name: 'iPad Pro', category: 'ipad', condition: 'yangi', image: pad1, cashPriceUzs: 14_500_000 },
  { id: 'imac', name: 'iMac', category: 'mac', condition: 'yangi', image: imac1, cashPriceUzs: 24_000_000 },
  { id: 'iphone-15-used', name: 'iPhone 15 (ishlatilgan)', category: 'iphone', condition: 'ishlatilgan', conditionNote: '95% holat', image: iph1, cashPriceUzs: 9_500_000 },
  { id: 'macbook-air-used', name: 'MacBook Air (ishlatilgan)', category: 'mac', condition: 'ishlatilgan', conditionNote: '90% holat', image: mac1, cashPriceUzs: 13_900_000 },
  { id: 'mac-mini', name: 'Mac Mini', category: 'mac', condition: 'yangi', image: mini, cashPriceUzs: 9_900_000 },
  { id: 'workstation', name: 'Workstation PC', category: 'pc', condition: 'yangi', image: pc, cashPriceUzs: 21_000_000 },
];
```

- [x] **Step 4: `calcInstallment`ni foizli modelga o'tkazish**

`src/lib/installment.ts` ichidagi `calcInstallment` funksiyasini quyidagiga almashtiring (qolgan funksiyalar — `lowestMonthly`, `formatUzs`, `composeLeadMessage`, `telegramShareUrl`, `whatsappUrl` — o'zgarmaydi):

```ts
export function calcInstallment(
  product: Product,
  term: Term,
  config: InstallmentConfig,
): InstallmentResult {
  const total = product.cashPriceUzs * (1 + term.markup);
  const downPaymentUzs = product.cashPriceUzs * (config.downPaymentPercent / 100);
  const monthly = Math.max(0, (total - downPaymentUzs) / term.months);
  return { total, downPaymentUzs, monthly };
}
```

- [x] **Step 5: Testni ishga tushirib, o'tishini tekshirish**

Run:
```bash
bun run test
```
Expected: PASS — barcha 5 test o'tadi.

- [x] **Step 6: Tип tekshiruvi va build**

Run:
```bash
bun run lint && bun run build
```
Expected: `tsc --noEmit` xatosiz, `vite build` muvaffaqiyatli. (Iste'molchilar `downPaymentUsd`ga to'g'ridan-to'g'ri murojaat qilmaydi, shuning uchun kompilyatsiya buzilmaydi.)

- [x] **Step 7: Commit**

```bash
git add src/data/products.ts src/lib/installment.ts src/lib/installment.test.ts
git commit -m "feat: percentage-based down payment in installment calculator"
```

---

## Self-Review

**Spec coverage (PRD §4):** Formula (ustama to'liq narxga, boshlang'ich foizli, oylik manfiy emas) — Task 2 testlari va implementatsiyasi qamraydi. `Product.condition`/`conditionNote` va `InstallmentConfig.downPaymentPercent` tiplari — keyingi rejalar (backend/admin) uchun tayyor.

**Placeholder scan:** TODO/TBD yo'q; barcha kod to'liq.

**Type consistency:** `downPaymentPercent`, `condition`, `Condition`, `calcInstallment`, `InstallmentResult`, `lowestMonthly` nomlari test, tip va implementatsiya bo'ylab bir xil.

**Qamrovdan tashqari (keyingi rejalar):** Cloudflare backend, API, admin panel, Yangi/Ishlatilgan alohida bo'limlar UI'si — Reja 2 va Reja 3.
