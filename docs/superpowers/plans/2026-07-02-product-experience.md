# Product Experience (4-bo'lak: variant UI, o'xshash mahsulotlar) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mahsulot sahifasida variant tanlash (chip'lar) — narx/chegirma/rasm/kalkulyator/lead tanlangan variantga mos; o'xshash mahsulotlar bo'limi.

**Architecture:** Pure variant-resolutsiya `src/lib/variants.ts`da (TDD). `ProductPage` selection state (`useState`, default = eng arzon sotuvdagi variant) + `resolveVariant` bilan narx/rasm/stock hisoblanadi; kalkulyator formulasi o'zgarmaydi (variant narxi `cashPriceUzs` o'rnida). `product.tsx` route ProductPage'ni `key={product.id}` bilan render qiladi (navigatsiyada state reset) va o'xshash mahsulotlarni yuklaydi.

**Tech Stack:** React 19, React Router v7 SSR, TypeScript strict, bun, vitest.

## Global Constraints

- **bun**; strict TS, **`any` yo'q**; har taskdan keyin `bun run lint` toza; mavjud 34 test buzilmasin.
- `src/lib/installment.ts` **o'zgarmaydi** (kalkulyator formulasi tegilmaydi).
- Variantsiz mahsulot sahifasi **aynan hozirgidek** ishlaydi (orqaga moslik).
- Default tanlov = **eng arzon sotuvdagi** variant (yo'q bo'lsa eng arzon; variantlar bo'sh → null).
- Mavjud bo'lmagan kombinatsiya chip'i **disabled**; tanlangan variant `inStock=false` → CTA'lar disabled + `t.outOfStock`.
- i18n kalitlari 4 tilda ham (aks holda compile fail): `similarProducts`, `inStock`, `outOfStock`.
- Cart, stock miqdori, sharh, zoom, `?variant=` URL param — **qo'shilmaydi**.
- Commit formati: `feat:`/`fix:`.

---

## File Structure

- Create: `src/lib/variants.ts`, `src/lib/variants.test.ts`
- Modify: `src/locales.ts`, `src/store/ProductPage.tsx`, `app/routes/product.tsx`

---

### Task 1: `src/lib/variants.ts` — variant resolutsiya (TDD)

**Files:**
- Create: `src/lib/variants.ts`, `src/lib/variants.test.ts`

**Interfaces:**
- Consumes: `ApiOption`, `ApiVariant` (`shared/types`).
- Produces: `VariantSelection = Record<string, string>`; `variantSelection(variant, options): VariantSelection`; `defaultSelection(options, variants): VariantSelection | null`; `resolveVariant(options, variants, selection): ApiVariant | null`; `isValueAvailable(options, variants, selection, optionName, value): boolean`; `selectionLabel(options, selection): string`.

- [ ] **Step 1: Failing testlar** — `src/lib/variants.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { defaultSelection, resolveVariant, isValueAvailable, selectionLabel, variantSelection } from './variants';
import type { ApiOption, ApiVariant } from '../../shared/types';

const options: ApiOption[] = [
  { id: 'o1', name: 'Xotira', sortOrder: 0, values: [
    { id: 'ov1', value: '256GB', sortOrder: 0 },
    { id: 'ov2', value: '512GB', sortOrder: 1 },
  ] },
  { id: 'o2', name: 'Rang', sortOrder: 1, values: [
    { id: 'ov3', value: 'Qora', sortOrder: 0 },
    { id: 'ov4', value: 'Oq', sortOrder: 1 },
  ] },
];
const V = (id: string, price: number, inStock: boolean, ids: string[]): ApiVariant =>
  ({ id, sku: null, cashPriceUzs: price, oldPriceUzs: null, imageUrl: null, inStock, sortOrder: 0, optionValueIds: ids });
// v1: 256+Qora 100 (bor), v2: 512+Qora 200 (yo'q), v3: 256+Oq 150 (bor). 512+Oq kombinatsiyasi YO'Q.
const variants: ApiVariant[] = [V('v1', 100, true, ['ov1', 'ov3']), V('v2', 200, false, ['ov2', 'ov3']), V('v3', 150, true, ['ov1', 'ov4'])];

describe('variantSelection', () => {
  it('maps optionValueIds to names/values', () => {
    expect(variantSelection(variants[1], options)).toEqual({ Xotira: '512GB', Rang: 'Qora' });
  });
});

describe('defaultSelection', () => {
  it('picks cheapest in-stock variant', () => {
    expect(defaultSelection(options, variants)).toEqual({ Xotira: '256GB', Rang: 'Qora' });
  });
  it('falls back to cheapest overall when none in stock', () => {
    const all = variants.map((v) => ({ ...v, inStock: false }));
    expect(defaultSelection(options, all)).toEqual({ Xotira: '256GB', Rang: 'Qora' });
  });
  it('returns null when no variants', () => {
    expect(defaultSelection(options, [])).toBeNull();
  });
});

describe('resolveVariant', () => {
  it('finds exact match', () => {
    expect(resolveVariant(options, variants, { Xotira: '256GB', Rang: 'Oq' })?.id).toBe('v3');
  });
  it('returns null for missing combination', () => {
    expect(resolveVariant(options, variants, { Xotira: '512GB', Rang: 'Oq' })).toBeNull();
  });
});

describe('isValueAvailable', () => {
  const sel = { Xotira: '256GB', Rang: 'Qora' };
  it('true when switching to an existing combo', () => {
    expect(isValueAvailable(options, variants, sel, 'Rang', 'Oq')).toBe(true);
    expect(isValueAvailable(options, variants, sel, 'Xotira', '512GB')).toBe(true);
  });
  it('false when combo does not exist', () => {
    expect(isValueAvailable(options, variants, { Xotira: '512GB', Rang: 'Qora' }, 'Rang', 'Oq')).toBe(false);
  });
});

describe('selectionLabel', () => {
  it('labels in options order', () => {
    expect(selectionLabel(options, { Rang: 'Qora', Xotira: '256GB' })).toBe('Xotira: 256GB, Rang: Qora');
  });
});
```

- [ ] **Step 2: Fail** — Run: `bunx vitest run src/lib/variants.test.ts` — Expected: FAIL (`./variants` yo'q).

- [ ] **Step 3: Implementatsiya** — `src/lib/variants.ts`:

```ts
import type { ApiOption, ApiVariant } from '../../shared/types';

export type VariantSelection = Record<string, string>;

function valueMap(options: ApiOption[]): Map<string, { optionName: string; value: string }> {
  const m = new Map<string, { optionName: string; value: string }>();
  for (const o of options) for (const v of o.values) m.set(v.id, { optionName: o.name, value: v.value });
  return m;
}

export function variantSelection(variant: ApiVariant, options: ApiOption[]): VariantSelection {
  const m = valueMap(options);
  const sel: VariantSelection = {};
  for (const id of variant.optionValueIds) {
    const e = m.get(id);
    if (e) sel[e.optionName] = e.value;
  }
  return sel;
}

export function defaultSelection(options: ApiOption[], variants: ApiVariant[]): VariantSelection | null {
  if (variants.length === 0) return null;
  const inStock = variants.filter((v) => v.inStock);
  const pool = inStock.length > 0 ? inStock : variants;
  const cheapest = pool.reduce((a, b) => (b.cashPriceUzs < a.cashPriceUzs ? b : a));
  return variantSelection(cheapest, options);
}

function matches(variant: ApiVariant, options: ApiOption[], selection: VariantSelection): boolean {
  const sel = variantSelection(variant, options);
  const keys = Object.keys(selection);
  if (Object.keys(sel).length !== keys.length) return false;
  return keys.every((k) => sel[k] === selection[k]);
}

export function resolveVariant(
  options: ApiOption[], variants: ApiVariant[], selection: VariantSelection,
): ApiVariant | null {
  return variants.find((v) => matches(v, options, selection)) ?? null;
}

export function isValueAvailable(
  options: ApiOption[], variants: ApiVariant[], selection: VariantSelection,
  optionName: string, value: string,
): boolean {
  return resolveVariant(options, variants, { ...selection, [optionName]: value }) !== null;
}

export function selectionLabel(options: ApiOption[], selection: VariantSelection): string {
  return options
    .filter((o) => selection[o.name] !== undefined)
    .map((o) => `${o.name}: ${selection[o.name]}`)
    .join(', ');
}
```

- [ ] **Step 4: Pass + suite** — Run: `bunx vitest run src/lib/variants.test.ts && bun run test && bun run lint` — Expected: yangi 8 + jami 42; lint toza.

- [ ] **Step 5: Commit**

```bash
git add src/lib/variants.ts src/lib/variants.test.ts
git commit -m "feat: variant resolution logic with tests"
```

---

### Task 2: i18n kalitlar

**Files:**
- Modify: `src/locales.ts`

- [ ] **Step 1:** Har 4 til blokining oxiriga (mavjud `resultsCount`dan keyin):
- O'zbek: `similarProducts: "O'xshash mahsulotlar", inStock: "Sotuvda bor", outOfStock: "Sotuvda yo'q"`
- Rus: `"Похожие товары", "В наличии", "Нет в наличии"`
- English: `"Similar products", "In stock", "Out of stock"`
- Kirill: `"Ўхшаш маҳсулотлар", "Сотувда бор", "Сотувда йўқ"`

- [ ] **Step 2:** `bun run lint` (4 blok to'liqligini isbotlaydi) va commit:

```bash
bun run lint
git add src/locales.ts
git commit -m "feat: variant stock and similar products i18n keys"
```

---

### Task 3: ProductPage variant UI

**Files:**
- Modify: `src/store/ProductPage.tsx`, `app/routes/product.tsx`

**Interfaces:**
- Consumes: `defaultSelection`, `resolveVariant`, `isValueAvailable`, `selectionLabel`, `VariantSelection` (variants.ts); `t.inStock`/`t.outOfStock`; mavjud `ProductDetail` (`options`/`variants` bilan).
- Produces: variant-aware ProductPage; route `key={product.id}` bilan render.

- [ ] **Step 1: `app/routes/product.tsx`** — komponent renderini almashtiring (navigatsiyada state reset uchun):

```tsx
return <ProductPage key={product.id} t={ctx.t} product={product} config={config} />;
```

- [ ] **Step 2: `ProductPage.tsx` — state va hisoblar** — komponent boshini yangilang:

```tsx
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Send, ShieldCheck, BadgeCheck, ChevronRight, Truck } from 'lucide-react';
import type { InstallmentConfig } from '../data/products';
import type { ProductDetail } from '../../app/lib/loaders';
import type { Translation } from '../locales';
import { calcInstallment, composeLeadMessage, discountPercent, formatUzs, telegramShareUrl, whatsappUrl } from '../lib/installment';
import { defaultSelection, resolveVariant, isValueAvailable, selectionLabel, type VariantSelection } from '../lib/variants';
import Gallery from './Gallery';

export default function ProductPage({
  t, product, config,
}: { t: Translation; product: ProductDetail; config: InstallmentConfig }) {
  const [months, setMonths] = useState(12);
  const [selection, setSelection] = useState<VariantSelection | null>(
    () => defaultSelection(product.options, product.variants),
  );
  const variant = useMemo(
    () => (selection ? resolveVariant(product.options, product.variants, selection) : null),
    [product, selection],
  );
  const displayCash = variant?.cashPriceUzs ?? product.cashPriceUzs;
  const displayOld = variant ? variant.oldPriceUzs : product.oldPriceUzs;
  const outOfStock = variant !== null && !variant.inStock;
  const disc = discountPercent(displayCash, displayOld);
  const result = useMemo(() => {
    const term = config.terms.find((x) => x.months === months) ?? config.terms[config.terms.length - 1];
    return calcInstallment({ ...product, cashPriceUzs: displayCash }, term, config);
  }, [product, config, months, displayCash]);

  const galleryImages = variant?.imageUrl
    ? [variant.imageUrl, ...product.images.filter((i) => i !== variant.imageUrl)]
    : product.images;

  function order(channel: 'telegram' | 'whatsapp') {
    if (!result || outOfStock) return;
    const label = selection ? selectionLabel(product.options, selection) : '';
    const productName = label ? `${product.name} (${label})` : product.name;
    const msg = composeLeadMessage({ name: '', phone: '', product: productName, months, monthly: formatUzs(result.monthly) });
    const url = channel === 'telegram' ? telegramShareUrl(msg) : whatsappUrl(msg);
    window.open(url, '_blank', 'noopener,noreferrer');
  }
```

- [ ] **Step 3: Narx bloki + stock belgisi** — mavjud narx blokida `product.cashPriceUzs` → `displayCash`, `product.oldPriceUzs` → `displayOld` (chegirma sharti ham `displayOld && disc !== null`). Narx qatoridan keyin stock belgisi:

```tsx
{variant && (
  <div className={`mt-1.5 text-[13px] font-semibold ${outOfStock ? 'text-[#E8462D]' : 'text-[#1B7A34]'}`}>
    {outOfStock ? t.outOfStock : t.inStock}
  </div>
)}
```

- [ ] **Step 4: Variant chip'lari** — narx blokidan keyin, kalkulyator kartasidan oldin:

```tsx
{product.options.length > 0 && selection && (
  <div className="mt-5 flex flex-col gap-4">
    {product.options.map((o) => (
      <div key={o.id}>
        <div className="text-[13px] font-semibold text-[#6E6E73] mb-2">{o.name}</div>
        <div className="flex flex-wrap gap-2">
          {o.values.map((v) => {
            const active = selection[o.name] === v.value;
            const available = isValueAvailable(product.options, product.variants, selection, o.name, v.value);
            return (
              <button
                key={v.id}
                disabled={!available}
                onClick={() => setSelection({ ...selection, [o.name]: v.value })}
                className={`px-4 py-2 rounded-xl text-[14px] font-semibold border transition-colors ${
                  active
                    ? 'border-[#0071E3] bg-[#EAF3FF] text-[#0071E3]'
                    : available
                      ? 'border-[#D2D2D7] bg-white text-[#1D1D1F] hover:border-[#0071E3]'
                      : 'border-[#F0F0F2] bg-[#FAFAFC] text-[#C7C7CC] cursor-not-allowed line-through'
                }`}
              >
                {v.value}
              </button>
            );
          })}
        </div>
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 5: Galereya va CTA** — `<Gallery images={product.images} .../>` → `<Gallery key={variant?.id ?? 'base'} images={galleryImages} name={product.name} />`. Ikkala CTA tugmaga `disabled={outOfStock}` + `disabled:opacity-50 disabled:cursor-not-allowed` klasslar.

- [ ] **Step 6: Build + lint + test + tekshirish + commit**

```bash
bun run build && bun run lint && bun run test
# dev (:5173): variantsiz mahsulot regressiyasi yo'qligini tekshirish
curl -s http://localhost:5173/product/iphone-16 | grep -o "iPhone 16" | head -1
git add src/store/ProductPage.tsx app/routes/product.tsx
git commit -m "feat: variant selection ui with variant-aware price, calculator and lead"
```
> Qo'lda (admin parol bilan): variantli mahsulot yaratib sahifada chip almashtirish → narx/kalkulyator o'zgarishini ko'rish.

---

### Task 4: O'xshash mahsulotlar

**Files:**
- Modify: `app/routes/product.tsx`, `src/store/ProductPage.tsx`

**Interfaces:**
- Consumes: `loadProductsBy` (loaders), `ProductGrid`, `Product` tipi, `t.similarProducts`.
- Produces: loader `similar: Product[]` (≤4); ProductPage prop + bo'lim.

- [ ] **Step 1: Loader** — `product.tsx`da product resolve bo'lgandan keyin:

```tsx
import { loadProductDetail, loadConfig, loadProductsBy } from '../lib/loaders';
// loader ichida, product null-check'dan keyin:
  const similar = product.categoryId
    ? (await loadProductsBy(env, { category: product.categoryId }))
        .filter((p) => p.id !== product.id)
        .slice(0, 4)
    : [];
  return { product, config, similar };
```
Komponentda: `<ProductPage key={product.id} t={ctx.t} product={product} config={config} similar={similar} />`.

- [ ] **Step 2: ProductPage bo'limi** — props'ga `similar: Product[]` (`import type { Product } from '../data/products'`, `import ProductGrid from './ProductGrid'`); tavsif bo'limidan keyin:

```tsx
{similar.length > 0 && (
  <div className="mt-12">
    <h2 className="text-[20px] font-semibold mb-4">{t.similarProducts}</h2>
    <ProductGrid t={t} items={similar} config={config} />
  </div>
)}
```

- [ ] **Step 3: Build + tekshirish + commit**

```bash
bun run build && bun run lint && bun run test
curl -s http://localhost:5173/product/iphone-16 | grep -o "O'xshash mahsulotlar" | head -1
curl -s http://localhost:5173/ru/product/iphone-16 | grep -o "Похожие товары" | head -1
git add app/routes/product.tsx src/store/ProductPage.tsx
git commit -m "feat: similar products section on product page"
```

---

## Self-Review

**Spec coverage (2026-07-02-product-experience-design.md):** §2 pure logika TDD → T1 (8 test). §3 chip UI/narx/kalkulyator/galereya/stock/lead + variantsiz moslik → T3. §4 o'xshashlar → T4. §5 i18n → T2. §7 chegaralar — cart/stock-miqdor/sharh/zoom/?variant= hech bir taskda yo'q. ✔

**Placeholder scan:** TODO/TBD yo'q; barcha kod bloklari to'liq. ✔

**Type consistency:** `VariantSelection`/`defaultSelection`/`resolveVariant`/`isValueAvailable`/`selectionLabel` T1 imzolari T3 chaqiruvlariga mos. `ProductDetail.options: ApiOption[]`/`variants: ApiVariant[]` (2a'dan) T1 fixture tiplari bilan bir xil. `similar: Product[]` — `loadProductsBy` qaytarmasi `Product[]`, `ProductGrid.items` prop'iga mos. `calcInstallment` birinchi arg `{cashPriceUzs}` li obyekt — spread saqlanadi, formula tegilmaydi. ✔
