# Admin qayta qurilishi — 2b-bosqich (Mahsulotlar ekranlari) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mahsulotlar ro'yxati va tahriri, Kategoriyalar / Brendlar / Modellar ekranlarini yangi UI-kit bilan qayta chizish; eski `*List`/`*Form` ekranlarini o'chirish.

**Architecture:** Har bo'lim ikkita ekran — ro'yxat (`DataTable`, filtrlar URL'da) va tahrir (`TabDef.detail` tab, o'z `Page`i, "Saqlash" o'zgarish bo'lmaguncha o'chiq). Mahsulot formasining mantiqi sof `src/admin/lib/product-form.ts`ga chiqadi (testli), ekran faqat chizadi. Billz tovarida sinxron maydonlar faqat o'qiladi. API o'zgarishi bitta: admin brendlar ro'yxatida `productCount`. Migratsiya yo'q.

**Tech Stack:** React Router v7 (SPA admin, `useSearchParams`), kit `src/admin/ui/`, lucide-react, vitest.

**Spec:** `docs/superpowers/specs/2026-09-15-admin-redesign-design.md` (§4 vizual tizim va forma qoidalari, §5 "Mahsulotlar — ro'yxat", "Mahsulot — tahrir", "Kategoriyalar · Brendlar · Modellar", §9 test). 2a qoldiqlari: `docs/superpowers/plans/2026-09-16-admin-redesign-2a-turlar-baza.md` → "Natija va qoldiqlar"; 1-bosqich qoldiqlari (`?f=needs_image`, `danger` kontrasti) → `docs/superpowers/plans/2026-09-15-admin-redesign-1-qobiq.md` → "Natija va qoldiqlar".

## Global Constraints

- **Tokenlar:** hex yo'q; `text-[Npx]` yo'q — shkala `text-heading/subhead/copy/control/para/label`; radius faqat `xs/sm/md/lg/xl/full`; `shadow-*` yo'q; `bg-white`/`text-white` yuza uchun yozilmaydi — istisno: mahsulot rasmi ramkasi `bg-white object-contain` (sayt qoidasi) va kit `primary`/chip'dagi `bg-cta text-white`. `danger` to'ldirmasi ustida matn **`text-bg`** (Task 1).
- **`press`** har bosiladigan elementda; `press` bor elementga `transition-*` qo'shilmaydi. `text-muted-3` faqat ikonka/hairline.
- **TS:** strict, `any` yo'q; `@types/react` yo'q — `useState(x as T)` + o'qishda cast, hook chaqiruvida generik yo'q; `key` faqat native element yoki `FC<{…}>` komponentda; event tiplari `React.ChangeEvent / KeyboardEvent / DragEvent / SyntheticEvent` (shim `src/admin/react-events.d.ts`).
- **Forma qoidalari (spec §4):** bitta "Saqlash" sarlavhaning o'ngida, o'zgarish bo'lmaguncha o'chiq; xato `errText`; muvaffaqiyat toast «Saqlandi · saytda 1–5 daqiqada ko'rinadi», sahifada qolinadi; **yaratishda ro'yxatga qaytadi**; faol toggle darhol saqlanadi (toast); o'chirish — `useConfirm` (nomi bilan, qizil), `window.confirm` yo'q; bo'sh holat `EmptyState`, yuklanish `Skeleton`; ro'yxat: qidiruv + filtr + son, sahifalash «‹ 3 / 80 ›»; ruscha maydon ixtiyoriy («bo'sh qolsa o'zbekchasi chiqadi»).
- Admin UI faqat o'zbekcha. `bun`/`bunx`, npm emas. Migratsiya yo'q (2b bazaga tegmaydi). Har task oxirida `bun run lint && bun run test` yashil. Brauzer tekshiruvi — controller, egasi Browser panelida kirgan holda (1440 / 375px).
- Eski ekranlar (`src/admin/ProductList.tsx`, `ProductForm.tsx`, `CategoryList/Form.tsx`, `BrandList/Form.tsx`, `ModelList/Form.tsx`) faqat o'chiriladi, "yaxshilanmaydi". `IconAction.tsx` qoladi (Bannerlar/Yangiliklar ishlatadi).

## Fayl tuzilmasi

- `src/admin/ui/controls.tsx` — `+Segmented` (lokal segment-kontrol), `destructive` → `text-bg`. `src/admin/ui/layout.tsx` — `+Pagination`. `src/admin/ui/toast.tsx` — xato toast `text-bg`. `src/admin/ImageUploader.tsx` — tokenlar.
- `src/admin/lib/product-filter.ts` — `QuickFilter`, `QUICK_FILTERS`, `quickFilter`, `ProductFilter.quick`.
- `src/admin/lib/product-form.ts` (yangi) — `ProductFormState`, `EMPTY_FORM`, `detailToForm`, `formToPayload`, `validateForm`, `setAxisValues`, `toggleAxisValue`, `addAxisValue`, `variantLabel`, `STORAGE_VALUES`, `COLOR_VALUES`, `AXES`.
- `app/routes/api.admin.brands.tsx` — `GET` ga `productCount`; `shared/types.ts` `ApiAdminBrand`; `src/admin/api.ts` `listBrands(): Promise<ApiAdminBrand[]>`.
- `src/admin/screens/ProductEdit.tsx`, `ProductsList.tsx`, `CategoriesList.tsx`, `CategoryEdit.tsx`, `BrandsList.tsx`, `BrandEdit.tsx`, `ModelsList.tsx`, `ModelEdit.tsx` (yangi).
- `src/admin/ModelCombobox.tsx`, `src/admin/ReviewsEditor.tsx` — kit bilan qayta bo'yaladi (mantiq o'zgarmaydi). `src/admin/PriceInput.tsx` — o'zgarmaydi (`className={INPUT_CLS}` beriladi).
- `src/admin/nav.ts` — `list`/`categories`/`brands`/`models` tablarida `detail: true`; `src/admin/AdminApp.tsx` — `screenFor` yangi ekranlarga.
- O'chadi: `src/admin/ProductList.tsx`, `ProductForm.tsx`, `CategoryList.tsx`, `CategoryForm.tsx`, `BrandList.tsx`, `BrandForm.tsx`, `ModelList.tsx`, `ModelForm.tsx`.

URL'lar: `/admin/products` (ro'yxat: `q, f, cat, brand, cond, page`), `/admin/products/new`, `/admin/products/:id`; `/admin/products/categories[/:id|/new]`, `/admin/products/brands[/:id|/new]`, `/admin/products/models[/:id|/new]` (`parseAdminPath`: segment bo'lmagan birinchi bo'lak id; uuid/slug segment nomi bilan to'qnashmaydi).

---

### Task 1: Kit — `Segmented`, `Pagination`, `danger` ustida `text-bg`, `ImageUploader` tokenlari

**Files:**
- Modify: `src/admin/ui/controls.tsx`, `src/admin/ui/layout.tsx`, `src/admin/ui/index.ts`, `src/admin/ui/toast.tsx:39`, `src/admin/ImageUploader.tsx:62-113`, `docs/superpowers/specs/2026-09-15-admin-redesign-design.md` (§4 "Rang semantikasi")

**Interfaces:**
- Produces: `Segmented: FC<{ value: string; onChange: (v: string) => void; options: { id: string; label: string }[]; label: string; className?: string }>`; `Pagination: FC<{ page: number; pageCount: number; onChange: (page: number) => void }>` (`pageCount <= 1` → `null`). Ikkalasi `src/admin/ui/index.ts`dan eksport.

- [ ] **Step 1: `controls.tsx`** — `VARIANT.destructive` qatorini almashtiring:
```ts
  // Qorong'ida `danger` och qizil — oq matn 2.78:1; `bg` (yorug'da oqish, qorong'ida qora) ikkala mavzuda ≥ 5:1.
  destructive: 'bg-danger text-bg hover:opacity-90',
```
Fayl oxiriga qo'shing:
```tsx
/**
 * Segment-kontrol (lokal holat; URL'ga bog'liq varianti — `Tabs`): tez filtrlar, Yangi/Ishlatilgan.
 * Konteyner 12px, ichki 8px — `Tabs` bilan bir o'lchov; mobilda yonga suriladi.
 */
export const Segmented: FC<{
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
  /** Guruh nomi (`aria-label`), masalan "Tez filtr". */
  label: string;
  className?: string;
}> = ({ value, onChange, options, label, className = '' }) => (
  <div role="radiogroup" aria-label={label} className={`no-scrollbar -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0 ${className}`}>
    <div className="inline-flex gap-1 rounded-sm bg-fill-2 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          onClick={() => onChange(o.id)}
          className={`press h-9 whitespace-nowrap rounded-xs px-3.5 text-para ${o.id === value ? 'bg-surface text-primary' : 'text-muted hover:text-primary'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  </div>
);
```

- [ ] **Step 2: `layout.tsx`** — importlar: `import { ChevronLeft, ChevronRight } from 'lucide-react';` va `import { Button } from './controls';`. Fayl oxiriga:
```tsx
/** Sahifalash «‹ 3 / 80 ›» — raqam tugmalari o'rniga (80 ta tugma chizilardi). Bitta sahifa bo'lsa chizilmaydi. */
export const Pagination: FC<{ page: number; pageCount: number; onChange: (page: number) => void }> = ({ page, pageCount, onChange }) => {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Sahifalash" className="flex items-center justify-center gap-1 text-para text-primary">
      <Button variant="quiet" ariaLabel="Oldingi sahifa" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft aria-hidden className="size-4" />
      </Button>
      <span className="tabular-nums">{page} / {pageCount}</span>
      <Button variant="quiet" ariaLabel="Keyingi sahifa" disabled={page >= pageCount} onClick={() => onChange(page + 1)}>
        <ChevronRight aria-hidden className="size-4" />
      </Button>
    </nav>
  );
};
```

- [ ] **Step 3: `index.ts`** — `export { Button, Badge, Dot, Toggle, Segmented } from './controls';` va `export { Page, Card, Tabs, EmptyState, Skeleton, Pagination } from './layout';`.

- [ ] **Step 4: `toast.tsx:39`** — `'bg-danger text-white'` → `'bg-danger text-bg'`.

- [ ] **Step 5: `ImageUploader.tsx`** — `return (` dan boshlab komponent oxirigacha (62–113-qatorlar) shu bilan almashadi (mantiq — `handleFiles`, `onZoneDrop`, `onTileDrop` — o'zgarmaydi):
```tsx
  return (
    <div>
      <div className="mb-2 text-label font-medium text-muted">{label}</div>

      {(images.length > 0 || uploading > 0) && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {images.map((img, i) => (
            <div
              key={img + i}
              draggable={reorderable}
              onDragStart={(e: React.DragEvent) => e.dataTransfer.setData('text/plain', String(i))}
              onDragOver={(e: React.DragEvent) => { if (reorderable) e.preventDefault(); }}
              onDrop={(e: React.DragEvent) => { if (reorderable) onTileDrop(e, i); }}
              className={`group relative size-16 overflow-hidden rounded-xs bg-fill-2 ${reorderable ? 'cursor-move' : ''}`}
            >
              <img src={img} alt="" className="size-full object-contain" />
              <button
                type="button"
                onClick={() => onChange(images.filter((_, j) => j !== i))}
                aria-label="Rasmni o'chirish"
                className="press absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-danger text-bg opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </div>
          ))}
          {Array.from({ length: uploading }).map((_, i) => (
            <div key={`u${i}`} className="size-16 animate-pulse rounded-xs bg-fill-2" />
          ))}
        </div>
      )}

      <label
        onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onZoneDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xs border-2 border-dashed px-4 py-5 ${dragOver ? 'border-cta bg-cta/5 text-cta' : 'border-line text-muted'}`}
      >
        <Upload size={20} />
        <span className="text-label">Rasm tashlang yoki tanlang</span>
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => { handleFiles(e.target.files); e.target.value = ''; }}
          className="hidden"
        />
      </label>

      {error ? <p className="mt-1 text-label text-danger">{error}</p> : null}
    </div>
  );
```

- [ ] **Step 6: Spec §4** — "Rang semantikasi" qatoridagi "`danger` (xato)." → "`danger` (xato); `danger` to'ldirmasi ustida matn `text-bg` (qorong'ida `danger` och qizil — oq matn 2.78:1, `bg` ikkala mavzuda ≥ 5:1)."

- [ ] **Step 7: Lint, test, commit**

Run: `bun run lint && bun run test` → PASS (27 fayl / 300 test — o'zgarmaydi).
```bash
git add src/admin/ui/controls.tsx src/admin/ui/layout.tsx src/admin/ui/index.ts src/admin/ui/toast.tsx src/admin/ImageUploader.tsx docs/superpowers/specs/2026-09-15-admin-redesign-design.md
git commit -m "feat(admin): kit — Segmented, Pagination, danger ustida text-bg, ImageUploader tokenlari

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Tez filtr — `quickFilter` (`Rasm kerak · Yashirin · Qoldiq 0 · Qo'lda kiritilgan`)

**Files:**
- Modify: `src/admin/lib/product-filter.ts`
- Test: `src/admin/lib/product-filter.test.ts` (to'liq almashadi)

**Interfaces:**
- Produces: `type QuickFilter = '' | 'needs_image' | 'hidden' | 'stock0' | 'manual'`; `QUICK_FILTERS: { id: QuickFilter; label: string }[]`; `quickFilter(p: ApiProduct, f: QuickFilter): boolean`; `ProductFilter.quick?: QuickFilter` (eski `status` T6 gacha qoladi — eski `ProductList` ishlatadi).

- [ ] **Step 1: Test** — `src/admin/lib/product-filter.test.ts` to'liq:
```ts
import { describe, it, expect } from 'vitest';
import { filterProducts, quickFilter } from './product-filter';
import type { ApiProduct } from '../../../shared/types';

function p(over: Partial<ApiProduct>): ApiProduct {
  return {
    id: over.id ?? 'x', name: 'Item', category: 'iphone', condition: 'yangi',
    conditionNote: null, cashPriceUzs: 100, imageUrl: '', isActive: true,
    categoryId: null, brandId: null, minPriceUzs: 100, billzId: null, billzStock: null, ...over,
  } as ApiProduct;
}

describe('filterProducts', () => {
  const items = [
    p({ id: '1', name: 'iPhone 17 Pro', categoryId: 'phones', brandId: 'apple', condition: 'yangi', isActive: true }),
    p({ id: '2', name: 'MacBook Air', categoryId: 'laptops', brandId: 'apple', condition: 'ishlatilgan', isActive: false }),
    p({ id: '3', name: 'Galaxy S24', categoryId: 'phones', brandId: 'samsung', condition: 'yangi', isActive: true }),
  ];

  it("bo'sh filtr → hammasini qaytaradi", () => {
    expect(filterProducts(items, {}).map((x) => x.id)).toEqual(['1', '2', '3']);
  });

  it('nom qidiruv (registrsiz, qism)', () => {
    expect(filterProducts(items, { q: 'iphone' }).map((x) => x.id)).toEqual(['1']);
    expect(filterProducts(items, { q: 'a' }).map((x) => x.id)).toEqual(['2', '3']);
  });

  it('kategoriya + brend + holat + tez filtr birga', () => {
    expect(filterProducts(items, { categoryId: 'phones' }).map((x) => x.id)).toEqual(['1', '3']);
    expect(filterProducts(items, { brandId: 'apple' }).map((x) => x.id)).toEqual(['1', '2']);
    expect(filterProducts(items, { condition: 'ishlatilgan' }).map((x) => x.id)).toEqual(['2']);
    expect(filterProducts(items, { quick: 'hidden' }).map((x) => x.id)).toEqual(['2']);
    expect(filterProducts(items, { quick: 'manual', categoryId: 'phones', brandId: 'samsung' }).map((x) => x.id)).toEqual(['3']);
  });
});

describe('quickFilter', () => {
  const billzNoImg = p({ id: 'b1', billzId: 'x1', imageUrl: '', billzStock: 0 });
  const billzImg = p({ id: 'b2', billzId: 'x2', imageUrl: '/images/products/a.webp', billzStock: 3, isActive: false });
  const manual = p({ id: 'm1', billzId: null, imageUrl: '', billzStock: null });

  it("'' → hammasi", () => {
    expect([billzNoImg, billzImg, manual].every((x) => quickFilter(x, ''))).toBe(true);
  });
  it("needs_image → Billz'dan kelgan, rasmsiz", () => {
    expect(quickFilter(billzNoImg, 'needs_image')).toBe(true);
    expect(quickFilter(billzImg, 'needs_image')).toBe(false);
    expect(quickFilter(manual, 'needs_image')).toBe(false);
  });
  it('hidden → yashirin', () => {
    expect(quickFilter(billzImg, 'hidden')).toBe(true);
    expect(quickFilter(manual, 'hidden')).toBe(false);
  });
  it("stock0 → Billz qoldig'i 0 (qo'lda kiritilganda qoldiq yo'q — emas)", () => {
    expect(quickFilter(billzNoImg, 'stock0')).toBe(true);
    expect(quickFilter(manual, 'stock0')).toBe(false);
  });
  it("manual → billzId yo'q", () => {
    expect(quickFilter(manual, 'manual')).toBe(true);
    expect(quickFilter(billzImg, 'manual')).toBe(false);
  });
});
```
Run: `bunx vitest run src/admin/lib/product-filter.test.ts` → FAIL (`quickFilter` eksport yo'q).

- [ ] **Step 2: `product-filter.ts`** to'liq:
```ts
import type { ApiProduct } from '../../../shared/types';

/** Tez filtr segmentlari (URL `f`); `''` — hammasi. */
export type QuickFilter = '' | 'needs_image' | 'hidden' | 'stock0' | 'manual';

export const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: '', label: 'Hammasi' },
  { id: 'needs_image', label: 'Rasm kerak' },
  { id: 'hidden', label: 'Yashirin' },
  { id: 'stock0', label: 'Qoldiq 0' },
  { id: 'manual', label: "Qo'lda kiritilgan" },
];

export interface ProductFilter {
  q?: string;
  categoryId?: string;
  brandId?: string;
  condition?: string; // '' | 'yangi' | 'ishlatilgan'
  quick?: QuickFilter;
  /** Eski `ProductList` uchun; 2b oxirida (Task 6) o'chadi. */
  status?: string; // '' | 'active' | 'hidden' | 'needs_image'
}

/** Bitta mahsulot tez filtrga mos keladimi. `billzId` bo'sh — qo'lda kiritilgan. */
export function quickFilter(p: ApiProduct, f: QuickFilter): boolean {
  switch (f) {
    case 'needs_image': return Boolean(p.billzId) && !p.imageUrl;
    case 'hidden': return !p.isActive;
    case 'stock0': return p.billzStock === 0;
    case 'manual': return !p.billzId;
    default: return true;
  }
}

/**
 * Admin mahsulotlar ro'yxatini client tomonda filtrlaydi (nom qidiruv +
 * kategoriya/brend/holat/tez filtr). Bo'sh filtr maydonlari e'tiborsiz qoldiriladi.
 */
export function filterProducts(items: ApiProduct[], f: ProductFilter): ApiProduct[] {
  const q = (f.q ?? '').trim().toLowerCase();
  return items.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q)) return false;
    if (f.categoryId && p.categoryId !== f.categoryId) return false;
    if (f.brandId && p.brandId !== f.brandId) return false;
    if (f.condition && p.condition !== f.condition) return false;
    if (f.quick && !quickFilter(p, f.quick)) return false;
    if (f.status === 'active' && !p.isActive) return false;
    if (f.status === 'hidden' && p.isActive) return false;
    if (f.status === 'needs_image' && !(p.billzId && !p.imageUrl)) return false;
    return true;
  });
}
```

- [ ] **Step 3: Test, lint, commit**

Run: `bunx vitest run src/admin/lib/product-filter.test.ts` → PASS (8 test); `bun run lint && bun run test` → PASS.
```bash
git add src/admin/lib/product-filter.ts src/admin/lib/product-filter.test.ts
git commit -m "feat(admin): mahsulot tez filtri — quickFilter (rasm kerak / yashirin / qoldiq 0 / qo'lda)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Mahsulot formasining sof mantiqi — `src/admin/lib/product-form.ts`

**Files:**
- Create: `src/admin/lib/product-form.ts`
- Test: `src/admin/lib/product-form.test.ts`

**Interfaces:**
- Consumes: `AdminProductDetail`, `AdminProductInput`, `AdminVariantInput` (`src/admin/api.ts`); `generateVariants`, `OptionDraft` (`./variant-gen`).
- Produces: `interface ProductFormState` (pastda); `EMPTY_FORM`; `STORAGE_VALUES`, `COLOR_VALUES`, `AXES`; `variantLabel(v: AdminVariantInput): string`; `detailToForm(d: AdminProductDetail): ProductFormState`; `validateForm(f): string | null`; `formToPayload(f): AdminProductInput`; `setAxisValues(f, axis: string, values: string[]): ProductFormState`; `toggleAxisValue(f, axis, value): ProductFormState`; `addAxisValue(f, axis, value): ProductFormState`.

- [ ] **Step 1: Test** — `src/admin/lib/product-form.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import type { AdminProductDetail } from '../api';
import { EMPTY_FORM, addAxisValue, detailToForm, formToPayload, setAxisValues, toggleAxisValue, validateForm, variantLabel } from './product-form';

function detail(over: Partial<AdminProductDetail> = {}): AdminProductDetail {
  return {
    id: 'p1', name: 'iPhone 17', category: 'iphone', condition: 'yangi', conditionNote: null, cashPriceUzs: 1000,
    imageUrl: '/images/products/main.webp', sortOrder: 0, isActive: true, categoryId: 'apple', type: 'iphone',
    oldPriceUzs: null, brandId: 'apple', slug: 'iphone-17', minPriceUzs: 900, ratingAvg: null, reviewCount: 0,
    billzId: null, billzStock: null, description: null, brand: null,
    images: ['/images/products/main.webp', '/images/products/g1.webp'],
    specs: [{ label: 'Chip', value: 'A19' }],
    options: [{ id: 'o1', name: 'Xotira', sortOrder: 0, values: [{ id: 'v1', value: '128GB', sortOrder: 0 }, { id: 'v2', value: '256GB', sortOrder: 1 }] }],
    variants: [
      { id: 'var1', sku: null, cashPriceUzs: 900, oldPriceUzs: null, imageUrl: null, inStock: true, sortOrder: 0, optionValueIds: ['v1'] },
      { id: 'var2', sku: null, cashPriceUzs: 1100, oldPriceUzs: null, imageUrl: null, inStock: true, sortOrder: 1, optionValueIds: ['v2', 'missing'] },
    ],
    ...over,
  };
}

describe('detailToForm', () => {
  it("galereya asosiy rasmsiz; variant qiymatlari nomga o'giriladi, noma'lum id tushib qoladi; null → bo'sh", () => {
    const f = detailToForm(detail());
    expect(f.images).toEqual(['/images/products/g1.webp']);
    expect(f.options).toEqual([{ name: 'Xotira', values: ['128GB', '256GB'] }]);
    expect(f.variants[1].optionValues).toEqual([{ optionName: 'Xotira', value: '256GB' }]);
    expect(f.oldPriceUzs).toBe(0);
    expect(f.description).toBe('');
    expect(f.billzId).toBeNull();
  });
  it('Billz tovari: billzId va qoldiq saqlanadi', () => {
    const f = detailToForm(detail({ billzId: 'uuid', billzStock: 4 }));
    expect(f.billzId).toBe('uuid');
    expect(f.billzStock).toBe(4);
  });
});

describe('formToPayload', () => {
  it("naqd narx 0 bo'lsa eng arzon narxlangan variant; narxsiz variant va bo'sh xususiyat tushib qoladi; bo'shlar null", () => {
    const f = {
      ...EMPTY_FORM, name: 'X',
      options: [{ name: 'Rang', values: ['Qora', 'Oq'] }],
      variants: [
        { cashPriceUzs: 500, inStock: true, optionValues: [{ optionName: 'Rang', value: 'Qora' }] },
        { cashPriceUzs: 0, inStock: true, optionValues: [{ optionName: 'Rang', value: 'Oq' }] },
      ],
      specs: [{ label: 'A', value: '1' }, { label: '', value: '2' }],
    };
    const p = formToPayload(f);
    expect(p.cashPriceUzs).toBe(500);
    expect(p.variants).toHaveLength(1);
    expect(p.specs).toEqual([{ label: 'A', value: '1' }]);
    expect(p.oldPriceUzs).toBeNull();
    expect(p.description).toBeNull();
    expect(p.ratingAvg).toBeNull();
    expect(p.slug).toBeNull();
  });
});

describe('validateForm', () => {
  it('nom, narx va variant narxi qoidalari', () => {
    expect(validateForm(EMPTY_FORM)).toMatch(/nomini/);
    expect(validateForm({ ...EMPTY_FORM, name: 'X' })).toMatch(/narx/i);
    const withOpt = { ...EMPTY_FORM, name: 'X', cashPriceUzs: 100, options: [{ name: 'Rang', values: ['Qora'] }], variants: [{ cashPriceUzs: 0, inStock: true, optionValues: [{ optionName: 'Rang', value: 'Qora' }] }] };
    expect(validateForm(withOpt)).toMatch(/Variant/);
    expect(validateForm({ ...EMPTY_FORM, name: 'X', cashPriceUzs: 100 })).toBeNull();
  });
});

describe('setAxisValues / toggleAxisValue / addAxisValue', () => {
  it("xotira STORAGE_VALUES tartibida; variantlar qayta yasaladi, narx yangi o'lchovga ko'chadi; o'q bo'shasa yo'qoladi", () => {
    let f = toggleAxisValue({ ...EMPTY_FORM, name: 'X' }, 'Xotira', '256GB');
    f = toggleAxisValue(f, 'Xotira', '128GB');
    expect(f.options[0].values).toEqual(['128GB', '256GB']);
    expect(f.variants).toHaveLength(2);
    f = { ...f, variants: f.variants.map((v) => (v.optionValues[0].value === '128GB' ? { ...v, cashPriceUzs: 700 } : v)) };
    f = toggleAxisValue(f, 'Rang', 'Qora');
    expect(f.variants).toHaveLength(2);
    expect(f.variants.find((v) => variantLabel(v) === '128GB · Qora')?.cashPriceUzs).toBe(700);
    expect(addAxisValue(f, 'Rang', ' Qora ')).toBe(f);
    expect(addAxisValue(f, 'Rang', 'Oq').variants).toHaveLength(4);
    expect(setAxisValues(f, 'Rang', []).options).toEqual([{ name: 'Xotira', values: ['128GB', '256GB'] }]);
    expect(toggleAxisValue(toggleAxisValue(f, 'Xotira', '128GB'), 'Xotira', '256GB').options).toEqual([{ name: 'Rang', values: ['Qora'] }]);
  });
});
```
Run: `bunx vitest run src/admin/lib/product-form.test.ts` → FAIL (modul yo'q).

- [ ] **Step 2: `src/admin/lib/product-form.ts`**:
```ts
import type { ApiSpec, Category, Condition } from '../../../shared/types';
import type { AdminProductDetail, AdminProductInput, AdminVariantInput } from '../api';
import { generateVariants, type OptionDraft } from './variant-gen';

/** Variant o'qlari — chiplar shu qiymatlardan; boshqa rang qo'lda yoziladi. */
export const STORAGE_VALUES = ['64GB', '128GB', '256GB', '512GB', '1TB', '2TB'];
export const COLOR_VALUES = ['Qora', 'Oq', 'Kulrang', "Ko'k", 'Yashil', 'Qizil', 'Tillarang', 'Pushti'];
/** Variant yorlig'i — o'qlar doim shu tartibda (Xotira · Rang). */
export const AXES = ['Xotira', 'Rang'];

/** Mahsulot tahriri holati — ekran faqat chizadi, mantiq shu faylda (testli). */
export interface ProductFormState {
  name: string;
  category: Category;
  categoryId: string | null;
  type: string | null;
  condition: Condition;
  /** UI'siz — eski mahsulotlar qiymatini yo'qotmasin. */
  conditionNote: string;
  cashPriceUzs: number;
  oldPriceUzs: number;
  description: string;
  imageUrl: string;
  images: string[];
  specs: ApiSpec[];
  sortOrder: number;
  isActive: boolean;
  brandId: string | null;
  /** UI'siz — server nomdan yasaydi, mavjudi saqlanadi. */
  slug: string;
  ratingAvg: number;
  reviewCount: number;
  options: OptionDraft[];
  variants: AdminVariantInput[];
  /** Billz tovari — sinxron maydonlar faqat o'qiladi, o'chirilmaydi. */
  billzId: string | null;
  billzStock: number | null;
}

export const EMPTY_FORM: ProductFormState = {
  name: '', category: 'iphone', categoryId: null, type: null, condition: 'yangi', conditionNote: '',
  cashPriceUzs: 0, oldPriceUzs: 0, description: '', imageUrl: '', images: [], specs: [], sortOrder: 0, isActive: true,
  brandId: null, slug: '', ratingAvg: 0, reviewCount: 0, options: [], variants: [], billzId: null, billzStock: null,
};

export function variantLabel(v: AdminVariantInput): string {
  return AXES.map((ax) => v.optionValues.find((ov) => ov.optionName === ax)?.value).filter(Boolean).join(' · ');
}

/** Serverdagi detail → forma. Galereya asosiy rasmsiz; variant qiymatlari option id'laridan nomga o'giriladi. */
export function detailToForm(d: AdminProductDetail): ProductFormState {
  const optionValueMap = new Map<string, { optionName: string; value: string }>();
  for (const o of d.options) {
    for (const v of o.values) optionValueMap.set(v.id, { optionName: o.name, value: v.value });
  }
  return {
    name: d.name, category: d.category, categoryId: d.categoryId, type: d.type, condition: d.condition,
    conditionNote: d.conditionNote ?? '', cashPriceUzs: d.cashPriceUzs, oldPriceUzs: d.oldPriceUzs ?? 0,
    description: d.description ?? '', imageUrl: d.imageUrl, images: d.images.filter((u) => u !== d.imageUrl),
    specs: d.specs, sortOrder: d.sortOrder, isActive: d.isActive, brandId: d.brandId, slug: d.slug ?? '',
    ratingAvg: d.ratingAvg ?? 0, reviewCount: d.reviewCount ?? 0,
    options: d.options.map((o) => ({ name: o.name, values: o.values.map((v) => v.value) })),
    variants: d.variants.map((v) => ({
      sku: v.sku, cashPriceUzs: v.cashPriceUzs, oldPriceUzs: v.oldPriceUzs, imageUrl: v.imageUrl, inStock: v.inStock,
      optionValues: v.optionValueIds
        .map((id) => optionValueMap.get(id))
        .filter((x): x is { optionName: string; value: string } => x !== undefined),
    })),
    billzId: d.billzId, billzStock: d.billzStock,
  };
}

/** Saqlashdan oldingi tekshiruv — xato matni yoki null. */
export function validateForm(f: ProductFormState): string | null {
  if (!f.name.trim()) return 'Mahsulot nomini kiriting.';
  if (!(f.cashPriceUzs > 0 || f.variants.some((v) => v.cashPriceUzs > 0))) return 'Naqd narx yoki kamida bitta variant narxini kiriting.';
  // O'lchov bor-u, birorta variant narxlanmagan bo'lsa — mahsulot sahifasida ishlamaydigan chiplar chiqadi; jim saqlamaymiz.
  if (f.options.some((o) => o.name.trim() && o.values.length) && !f.variants.some((v) => v.cashPriceUzs > 0)) {
    return "Variant narxlarini kiriting yoki o'lchovlarni olib tashlang.";
  }
  return null;
}

/** Forma → API tanasi. Naqd narx 0 bo'lsa eng arzon narxlangan variant; narxsiz variantlar va bo'sh xususiyatlar tushib qoladi. */
export function formToPayload(f: ProductFormState): AdminProductInput {
  const priced = f.variants.filter((v) => v.cashPriceUzs > 0);
  const cashPriceUzs = f.cashPriceUzs > 0 ? f.cashPriceUzs : priced.length ? Math.min(...priced.map((v) => v.cashPriceUzs)) : 0;
  return {
    name: f.name, category: f.category, categoryId: f.categoryId, type: f.type, condition: f.condition,
    conditionNote: f.conditionNote || null, cashPriceUzs,
    oldPriceUzs: f.oldPriceUzs > 0 ? f.oldPriceUzs : null, description: f.description || null,
    imageUrl: f.imageUrl, images: f.images,
    specs: f.specs.filter((s) => s.label.trim() !== '' && s.value.trim() !== ''),
    sortOrder: f.sortOrder, isActive: f.isActive,
    brandId: f.brandId, slug: f.slug || null,
    ratingAvg: f.ratingAvg > 0 ? f.ratingAvg : null, reviewCount: f.reviewCount,
    options: f.options.filter((o) => o.name.trim() && o.values.length),
    variants: priced,
  };
}

/** Bitta o'q (Xotira/Rang) qiymatlarini almashtirib variantlarni qayta yasaydi (narxlar `generateVariants`da saqlanadi). */
export function setAxisValues(f: ProductFormState, axis: string, values: string[]): ProductFormState {
  const others = f.options.filter((o) => o.name !== axis);
  const options = values.length ? [...others, { name: axis, values }] : others;
  return { ...f, options, variants: generateVariants(options, f.variants) };
}

/** Chip bosildi: qiymat qo'shiladi/olinadi; Xotira `STORAGE_VALUES` tartibida turadi. */
export function toggleAxisValue(f: ProductFormState, axis: string, value: string): ProductFormState {
  const current = f.options.find((o) => o.name === axis)?.values ?? [];
  const next = current.includes(value) ? current.filter((x) => x !== value) : [...current, value];
  if (axis === 'Xotira') next.sort((a, b) => STORAGE_VALUES.indexOf(a) - STORAGE_VALUES.indexOf(b));
  return setAxisValues(f, axis, next);
}

/** Qo'lda yozilgan rang — bo'sh yoki allaqachon bor bo'lsa forma o'zgarmaydi. */
export function addAxisValue(f: ProductFormState, axis: string, value: string): ProductFormState {
  const v = value.trim();
  const current = f.options.find((o) => o.name === axis)?.values ?? [];
  if (!v || current.includes(v)) return f;
  return setAxisValues(f, axis, [...current, v]);
}
```

- [ ] **Step 3: Test, lint, commit**

Run: `bunx vitest run src/admin/lib/product-form.test.ts` → PASS (5 test); `bun run lint && bun run test` → PASS.
```bash
git add src/admin/lib/product-form.ts src/admin/lib/product-form.test.ts
git commit -m "feat(admin): mahsulot formasi mantiqi sof product-form.ts (detail↔forma, tekshiruv, o'qlar)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Admin brendlar ro'yxatida mahsulot soni — `productCount`

**Files:**
- Modify: `app/routes/api.admin.brands.tsx:10-11`, `shared/types.ts` (`ApiBrand`dan keyin), `src/admin/api.ts:175-177` (+ import)

**Interfaces:**
- Produces: `ApiAdminBrand extends ApiBrand { productCount: number }`; `listBrands(): Promise<ApiAdminBrand[]>` (eski chaqiruvchilar `ApiBrand[]` kutadi — superset, o'zgarmaydi).

- [ ] **Step 1: `shared/types.ts`** — `ApiBrand` interfeysidan keyin:
```ts
/** Admin ro'yxati — brenddagi mahsulot soni bilan (`GET /api/admin/brands`). */
export interface ApiAdminBrand extends ApiBrand {
  productCount: number;
}
```

- [ ] **Step 2: `api.admin.brands.tsx`** loader'dagi ikki qator:
```ts
  const { results } = await env.DB.prepare(
    'SELECT brands.*, (SELECT COUNT(*) FROM products WHERE products.brand_id = brands.id) AS product_count FROM brands ORDER BY sort_order ASC',
  ).all<BrandRow & { product_count: number }>();
  return json(results.map((r) => ({ ...rowToBrand(r), productCount: r.product_count })));
```

- [ ] **Step 3: `src/admin/api.ts`** — tip importiga `ApiAdminBrand`; `listBrands`:
```ts
export async function listBrands(): Promise<ApiAdminBrand[]> {
  return handle(await fetch('/api/admin/brands'));
}
```

- [ ] **Step 4: Lint, test, tekshiruv, commit**

Run: `bun run lint && bun run test` → PASS. `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/admin/brands` → `401`. Brauzerda (controller, egasi kirgan): `await (await fetch('/api/admin/brands')).json()` → har elementda `productCount` (raqam).
```bash
git add shared/types.ts app/routes/api.admin.brands.tsx src/admin/api.ts
git commit -m "feat(admin): brendlar ro'yxatida mahsulot soni (productCount)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Mahsulot tahriri — `ProductEdit` (+ `ModelCombobox`, `ReviewsEditor` kit bilan)

**Files:**
- Create: `src/admin/screens/ProductEdit.tsx`
- Modify: `src/admin/ModelCombobox.tsx` (to'liq), `src/admin/ReviewsEditor.tsx` (to'liq), `src/admin/nav.ts:23` (`detail: true`), `src/admin/AdminApp.tsx` (import + `products/list` case)

**Interfaces:**
- Consumes: T3 (`product-form.ts` hammasi), T4 (`ApiAdminBrand`, `listBrands`), T1 (`Segmented`), kit `Button, Card, EmptyState, Field, INPUT_CLS, Input, Page, Select, Skeleton, SwitchRow, Textarea`, `useToast`, `useConfirm`; `ImageUploader { label; images; onChange; multiple?; reorderable?; normalize?; accept? }`; `PriceInput { value; onChange; placeholder?; className? }`; `getProductDetail/createProduct/updateProduct/deleteProduct/uploadImage/listCategories/listDeviceModels/listTypes`; `deriveLegacyCategory` (`shared/legacy-category`); `modelToSpecs/mergeSpecs`; `normalizeImage`; `formatThousands`.
- Produces: `ProductEdit: FC<{ id: string }>` (`id` = `'new'` yoki mahsulot id'si); `ModelCombobox` va `ReviewsEditor` imzolari o'zgarmaydi. URL: `/admin/products/new`, `/admin/products/:id` (eski ro'yxat hali qatorni ochmaydi — to'g'ridan-to'g'ri manzil bilan tekshiriladi; T6 ulaydi).

- [ ] **Step 1: `src/admin/ModelCombobox.tsx`** to'liq (mantiq o'sha, faqat klasslar):
```tsx
import { useState } from 'react';
import type { FC } from 'react';
import type { ApiDeviceModel } from '../../shared/types';
import { filterModels } from './lib/models';

/** Nom maydoni + model registri takliflari (↑/↓, Enter, Esc). `className` — kit `INPUT_CLS`. */
const ModelCombobox: FC<{
  models: ApiDeviceModel[];
  value: string;
  onChange: (text: string) => void;
  onPick: (m: ApiDeviceModel) => void;
  className?: string;
}> = ({ models, value, onChange, onPick, className }) => {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const suggestions = filterModels(models, value, 8);
  const showDropdown = open && suggestions.length > 0;

  function pick(m: ApiDeviceModel) {
    onPick(m);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        type="text"
        className={className}
        value={value}
        onFocus={() => { setOpen(true); setHighlight(0); }}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setHighlight(0); }}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === 'Enter') {
            if (showDropdown) {
              e.preventDefault();
              const m = suggestions[highlight];
              if (m) pick(m);
            }
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {showDropdown && (
        <div
          className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-xs border border-line bg-surface"
          onMouseDown={(e) => e.preventDefault()}
        >
          {suggestions.map((m, i) => (
            <button
              key={m.id}
              type="button"
              className={`press block w-full px-3 py-2 text-left hover:bg-fill-2 ${i === highlight ? 'bg-fill-2' : ''}`}
              onClick={() => pick(m)}
            >
              <span className="text-para font-medium text-primary">{m.name}</span>
              <span className="ml-2 text-label text-muted">{m.brandId} · {m.categoryId}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ModelCombobox;
```

- [ ] **Step 2: `src/admin/ReviewsEditor.tsx`** to'liq (`window.confirm` → `useConfirm`, kit maydonlari):
```tsx
import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Trash2 } from 'lucide-react';
import type { ApiReview } from '../../shared/types';
import { createReview, deleteReview, listReviews } from './api';
import { errText } from './errText';
import IconAction from './IconAction';
import { Button, Field, Input, Select, Textarea } from './ui';
import { useConfirm } from './ui/confirm';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Mahsulot sharhlari (admin). Sayt o'z sharh tizimini yuritmaydi — egasi tashqi
 * manbadan (marketplace, Telegram) ko'chiradi. Har o'zgarishda server reytingni
 * qayta hisoblaydi; `onChanged` forma maydonlarini (reyting, soni) yangilaydi.
 */
const ReviewsEditor: FC<{ productId: string; onChanged: (avg: number, count: number) => void }> = ({ productId, onChanged }) => {
  const confirm = useConfirm();
  const [rawItems, setItems] = useState([] as ApiReview[]);
  const items = rawItems as ApiReview[];
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function publish(list: ApiReview[]) {
    setItems(list);
    const count = list.length;
    const avg = count ? Math.round((list.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
    onChanged(avg, count);
  }
  useEffect(() => {
    listReviews(productId).then(setItems).catch((e) => setError(errText(e)));
  }, [productId]);

  async function add() {
    setBusy(true); setError('');
    try {
      const r = await createReview({ productId, author: author.trim(), rating, body: body.trim(), createdAt: date });
      publish([r, ...items]);
      setAuthor(''); setBody(''); setRating(5); setDate(today());
    } catch (e) { setError(errText(e)); }
    finally { setBusy(false); }
  }
  async function remove(r: ApiReview) {
    const ok = await confirm({ title: "Sharhni o'chirish", message: `${r.author} · ${'★'.repeat(r.rating)}`, confirmLabel: "O'chirish", destructive: true });
    if (!ok) return;
    try { await deleteReview(r.id); publish(items.filter((x) => x.id !== r.id)); }
    catch (e) { setError(errText(e)); }
  }

  return (
    <div className="mt-6 border-t border-line pt-5">
      <p className="mb-3 text-label font-medium text-muted">Sharhlar ({items.length})</p>
      {items.length > 0 && (
        <ul className="mb-4 flex flex-col gap-2">
          {items.map((r) => (
            <li key={r.id} className="flex items-start gap-3 rounded-xs border border-line p-3">
              <div className="min-w-0 flex-1">
                <p className="text-para text-primary">
                  <span className="font-medium">{r.author}</span> · {'★'.repeat(r.rating)} ·{' '}
                  <span className="text-muted">{new Date(r.createdAt * 1000).toISOString().slice(0, 10)}</span>
                </p>
                <p className="whitespace-pre-line text-para text-body">{r.body}</p>
              </div>
              <IconAction Icon={Trash2} label="O'chir" onClick={() => remove(r)} danger />
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-3 md:grid-cols-[1fr_120px_170px]">
        <Field label="Muallif"><Input value={author} onChange={setAuthor} /></Field>
        <Field label="Baho">
          <Select value={String(rating)} onChange={(v) => setRating(Number(v))}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
          </Select>
        </Field>
        <Field label="Sana"><Input type="date" value={date} onChange={setDate} /></Field>
      </div>
      <div className="mt-3"><Field label="Sharh matni"><Textarea value={body} onChange={setBody} rows={3} /></Field></div>
      {error && <p className="mt-2 text-label text-danger">{error}</p>}
      <div className="mt-3">
        <Button variant="secondary" onClick={add} disabled={busy || !author.trim() || !body.trim()}>+ Sharh qo'shish</Button>
      </div>
    </div>
  );
};

export default ReviewsEditor;
```

- [ ] **Step 3: `nav.ts`** — `list` tabi: `{ id: 'list', segment: '', label: 'Mahsulotlar', Icon: Boxes, detail: true },`

- [ ] **Step 4: `AdminApp.tsx`** — `import ProductEdit from './screens/ProductEdit';` (eski `ProductList` importi qoladi); case:
```ts
    case 'products/list': return id ? <ProductEdit key={id} id={id} /> : <ProductList />;
```

- [ ] **Step 5: `src/admin/screens/ProductEdit.tsx`** — keyingi bo'limdagi to'liq kod (bitta fayl).

```tsx
import { useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { X } from 'lucide-react';
import type { ApiAdminBrand, ApiCategory, ApiDeviceModel, ApiProductType } from '../../../shared/types';
import { deriveLegacyCategory } from '../../../shared/legacy-category';
import {
  createProduct, deleteProduct, getProductDetail, listBrands, listCategories, listDeviceModels, listTypes, updateProduct, uploadImage,
} from '../api';
import type { AdminVariantInput } from '../api';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import ModelCombobox from '../ModelCombobox';
import PriceInput from '../PriceInput';
import ReviewsEditor from '../ReviewsEditor';
import { formatThousands } from '../lib/format';
import { normalizeImage } from '../lib/image-normalize';
import { mergeSpecs, modelToSpecs } from '../lib/models';
import {
  COLOR_VALUES, EMPTY_FORM, STORAGE_VALUES, addAxisValue, detailToForm, formToPayload, toggleAxisValue, validateForm, variantLabel,
  type ProductFormState,
} from '../lib/product-form';
import { Button, Card, EmptyState, Field, INPUT_CLS, Input, Page, Segmented, Select, Skeleton, SwitchRow, Textarea } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/products';
type LoadState = 'loading' | 'ready' | 'error';

/** Billz tovarida sinxron ustunlar faqat o'qiladi — kalit/qiymat ro'yxati. */
const Rows: FC<{ rows: { k: string; v: ReactNode }[] }> = ({ rows }) => (
  <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-para">
    {rows.map((r, i) => (
      <div key={`${i}-${r.k}`} className="contents">
        <dt className="text-muted">{r.k}</dt>
        <dd className="min-w-0 break-words text-primary">{r.v}</dd>
      </div>
    ))}
  </dl>
);

/** Variant chipi (Xotira/Rang qiymati) — tanlangani `cta`. */
const Chip: FC<{ on: boolean; onClick: () => void; children: ReactNode }> = ({ on, onClick, children }) => (
  <button
    type="button"
    aria-pressed={on}
    onClick={onClick}
    className={`press h-9 rounded-full border px-3.5 text-para ${on ? 'border-cta bg-cta text-white' : 'border-line text-primary hover:border-cta'}`}
  >
    {children}
  </button>
);

/**
 * Mahsulot tahriri — bitta ustun, kartalar muhimlik tartibida (spec §5): Rasmlar → Holat → Ma'lumot → Narx →
 * Variantlar → Xususiyatlar → Reyting va sharhlar → Xavfli zona. `id` = 'new' yoki mahsulot id'si.
 * Billz tovarida sinxron ustunlar (nom, brend, kategoriya, tur, tavsif, narx, xususiyatlar) faqat o'qiladi —
 * keyingi sinxronizatsiya baribir qayta yozadi; o'chirish yo'q (sinxronizatsiya qaytaradi), faqat yashirish.
 */
const ProductEdit: FC<{ id: string }> = ({ id }) => {
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [rawForm, setForm] = useState(EMPTY_FORM as ProductFormState);
  const form = rawForm as ProductFormState;
  const [rawCats, setCats] = useState([] as ApiCategory[]);
  const cats = rawCats as ApiCategory[];
  const [rawBrands, setBrands] = useState([] as ApiAdminBrand[]);
  const brands = rawBrands as ApiAdminBrand[];
  const [rawModels, setModels] = useState([] as ApiDeviceModel[]);
  const models = rawModels as ApiDeviceModel[];
  const [rawTypes, setTypes] = useState([] as ApiProductType[]);
  const types = rawTypes as ApiProductType[];
  // Tahrirda detail kelmaguncha saqlash bloklanadi — bo'sh forma ustidan PUT (replace-all) mahsulotni bo'shatib yuborardi.
  const [rawLoad, setLoad] = useState((isNew ? 'ready' : 'loading') as LoadState);
  const loadState = rawLoad as LoadState;
  const [retry, setRetry] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [colorDraft, setColorDraft] = useState('');
  const [rawBusyRow, setBusyRow] = useState(null as number | null);
  const busyRow = rawBusyRow as number | null;

  useEffect(() => {
    Promise.all([listCategories(), listBrands(), listDeviceModels(), listTypes()])
      .then(([c, b, m, t]) => { setCats(c); setBrands(b); setModels(m); setTypes(t); })
      .catch(() => setError("Ma'lumotnomalar (kategoriya, brend, tur) yuklanmadi"));
  }, []);

  useEffect(() => {
    if (isNew) return;
    let stale = false; // tez ketma-ket ochilganda eski javob formani to'ldirmasin
    setLoad('loading');
    getProductDetail(id)
      .then((d) => { if (stale) return; setForm(detailToForm(d)); setLoad('ready'); })
      .catch(() => { if (!stale) setLoad('error'); });
    return () => { stale = true; };
  }, [id, isNew, retry]);

  // Saqlanmagan o'zgarish bo'lsa sahifa yopilishi/yangilanishida ogohlantirish.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const patch = (fn: (f: ProductFormState) => ProductFormState) => { setForm(fn); setDirty(true); };
  const set = <K extends keyof ProductFormState>(k: K, v: ProductFormState[K]) => patch((f) => ({ ...f, [k]: v }));
  /** Yo'nalish almashsa eski tur begona bo'lib qoladi (masalan `pc`da `iphone`) — tozalanadi. */
  const typeOf = (categoryId: string | null, type: string | null) =>
    type && types.some((t) => t.categoryId === categoryId && t.id === type) ? type : null;

  function pickModel(m: ApiDeviceModel) {
    patch((f) => ({
      ...f, name: m.name, brandId: m.brandId, categoryId: m.categoryId, category: m.legacyCategory,
      type: typeOf(m.categoryId, f.type), specs: mergeSpecs(f.specs, modelToSpecs(m)),
    }));
  }
  function setCategory(categoryId: string | null) {
    patch((f) => ({ ...f, categoryId, category: deriveLegacyCategory(categoryId), type: typeOf(categoryId, f.type) }));
  }
  function addCustomColor() {
    const c = colorDraft;
    setColorDraft('');
    if (c.trim()) patch((f) => addAxisValue(f, 'Rang', c));
  }
  function updateVariant(i: number, p: Partial<AdminVariantInput>) {
    patch((f) => ({ ...f, variants: f.variants.map((v, j) => (j === i ? { ...v, ...p } : v)) }));
  }
  async function uploadVariantImage(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusyRow(i);
    try {
      const { imageUrl } = await uploadImage(await normalizeImage(file));
      updateVariant(i, { imageUrl });
    } catch (err) {
      toast(errText(err), 'error');
    } finally {
      setBusyRow(null);
    }
  }

  async function save() {
    const problem = validateForm(form);
    if (problem) { setError(problem); return; }
    setBusy(true); setError('');
    try {
      if (isNew) {
        await createProduct(formToPayload(form));
        setDirty(false);
        toast("Mahsulot qo'shildi");
        navigate(LIST);
      } else {
        await updateProduct(id, formToPayload(form));
        setDirty(false);
        toast("Saqlandi · saytda 1–5 daqiqada ko'rinadi");
      }
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: `«${form.name}» ni o'chirish`,
      message: "Mahsulot, rasmlari va variantlari o'chiriladi. Qaytarib bo'lmaydi.",
      confirmLabel: "O'chirish", destructive: true,
    });
    if (!ok) return;
    try {
      await deleteProduct(id);
      toast("Mahsulot o'chirildi");
      navigate(LIST);
    } catch (err) {
      toast(errText(err), 'error');
    }
  }

  const billz = form.billzId !== null;
  const title = isNew ? 'Yangi mahsulot' : form.name || 'Mahsulot';
  const canSave = dirty && !busy && loadState === 'ready';
  const storage = form.options.find((o) => o.name === 'Xotira')?.values ?? [];
  const colors = form.options.find((o) => o.name === 'Rang')?.values ?? [];
  const brandName = brands.find((b) => b.id === form.brandId)?.name ?? '—';
  const catName = cats.find((c) => c.id === form.categoryId)?.name ?? '—';
  const typeLabel = types.find((t) => t.categoryId === form.categoryId && t.id === form.type)?.label ?? '—';

  if (loadState !== 'ready') {
    return (
      <Page title="Mahsulot" back={LIST}>
        {loadState === 'loading' ? (
          <Skeleton rows={6} />
        ) : (
          <EmptyState
            title="Mahsulot yuklanmadi"
            text="Saqlash bloklandi — ma'lumot to'liq kelmasa saqlash mavjud mahsulotni bo'shatib yuborardi."
            action={<Button variant="secondary" onClick={() => setRetry((r: number) => r + 1)}>Qayta urinish</Button>}
          />
        )}
      </Page>
    );
  }

  return (
    <Page
      title={title}
      back={LIST}
      actions={
        <>
          {!isNew && <Button variant="quiet" href={`/product/${id}`} external>Saytda ko'rish</Button>}
          <Button onClick={save} disabled={!canSave}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <p className="text-para text-danger">{error}</p>}

        <Card title="Rasmlar" description={billz ? "Billz'da rasm bo'lsa sinxronizatsiyada u ustun turadi; bo'lmasa shu yerda yuklagani qoladi." : undefined}>
          <ImageUploader label="Asosiy rasm" images={form.imageUrl ? [form.imageUrl] : []} onChange={(next) => set('imageUrl', next[0] ?? '')} />
          <div className="mt-4">
            <ImageUploader label="Galereya" images={form.images} onChange={(next) => set('images', next)} multiple reorderable />
          </div>
        </Card>

        <Card title="Holat">
          <div className="divide-y divide-line">
            <SwitchRow
              label="Saytda ko'rsatilsin"
              hint={billz ? "Billz tovarida keyingi sinxronizatsiyagacha amal qiladi: qoldiq > 0 va rasm bo'lsa o'zi yoqiladi." : undefined}
              on={form.isActive}
              onChange={(v) => set('isActive', v)}
            />
            <div className="flex flex-wrap items-center justify-between gap-4 py-3">
              <div>
                <p className="text-para text-primary">Holati</p>
                <p className="text-label text-muted-2">Ishlatilgan — bitta dona, variantsiz.</p>
              </div>
              <Segmented
                label="Holati"
                value={form.condition}
                onChange={(v) => patch((f) => (v === 'ishlatilgan' ? { ...f, condition: 'ishlatilgan', options: [], variants: [] } : { ...f, condition: 'yangi' }))}
                options={[{ id: 'yangi', label: 'Yangi' }, { id: 'ishlatilgan', label: 'Ishlatilgan' }]}
              />
            </div>
            <div className="py-3">
              <Field label="Tartib raqami" hint="Kichigi oldin" className="max-w-40">
                <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
              </Field>
            </div>
          </div>
        </Card>

        <Card title="Ma'lumot" description={billz ? "Billz'dan keladi — Billz'da o'zgartiring." : undefined}>
          {billz ? (
            <Rows rows={[
              { k: 'Nomi', v: form.name }, { k: 'Brend', v: brandName }, { k: 'Kategoriya', v: catName }, { k: 'Turi', v: typeLabel },
              { k: 'Tavsif', v: form.description || '—' },
            ]} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nomi / model qidirish" required hint="Model tanlansa brend, kategoriya va xususiyatlar o'zi to'ladi" className="md:col-span-2">
                <ModelCombobox models={models} value={form.name} onChange={(t) => set('name', t)} onPick={pickModel} className={INPUT_CLS} />
              </Field>
              <Field label="Brend">
                <Select value={form.brandId ?? ''} onChange={(v) => set('brandId', v || null)}>
                  <option value="">— tanlang —</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
              <Field label="Kategoriya">
                <Select value={form.categoryId ?? ''} onChange={(v) => setCategory(v || null)}>
                  <option value="">— tanlang —</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Turi" hint="Yo'nalish sahifasidagi tur qatori; tursiz mahsulot katalogda qoladi">
                <Select value={form.type ?? ''} disabled={form.categoryId === null} onChange={(v) => set('type', v || null)}>
                  <option value="">{form.categoryId === null ? '— avval kategoriya —' : '— tanlang —'}</option>
                  {types.filter((t) => t.categoryId === form.categoryId).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </Select>
              </Field>
              <Field label="Tavsif" className="md:col-span-2">
                <Textarea value={form.description} onChange={(v) => set('description', v)} rows={5} />
              </Field>
            </div>
          )}
        </Card>

        <Card title="Narx" description={billz ? "Billz'dagi USD narx × do'kon kursi — sinxronizatsiyada yangilanadi." : undefined}>
          {billz ? (
            <Rows rows={[
              { k: 'Naqd', v: `${formatThousands(form.cashPriceUzs)} so'm` },
              { k: 'Eski narx', v: form.oldPriceUzs > 0 ? `${formatThousands(form.oldPriceUzs)} so'm` : '—' },
              { k: 'Qoldiq', v: String(form.billzStock ?? 0) },
            ]} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Naqd narx (so'm)" required={form.variants.length === 0} hint={form.variants.length > 0 ? "Bo'sh qolsa eng arzon variant narxi olinadi" : undefined}>
                <PriceInput className={INPUT_CLS} value={form.cashPriceUzs} onChange={(v) => set('cashPriceUzs', v)} />
              </Field>
              <Field label="Eski narx (so'm)" hint="Chegirma belgisi uchun; ixtiyoriy">
                <PriceInput className={INPUT_CLS} value={form.oldPriceUzs} onChange={(v) => set('oldPriceUzs', v)} />
              </Field>
            </div>
          )}
        </Card>

        {!billz && form.condition === 'yangi' && (
          <Card title="Variantlar" description="Xotira va rangni tanlang — har birikma alohida narxli variant bo'ladi. Tanlamasangiz yuqoridagi bitta narx ishlaydi (aksessuar).">
            <p className="mb-2 text-label font-medium text-muted">Xotira</p>
            <div className="flex flex-wrap gap-2">
              {STORAGE_VALUES.map((v) => (
                <Chip key={v} on={storage.includes(v)} onClick={() => patch((f) => toggleAxisValue(f, 'Xotira', v))}>{v}</Chip>
              ))}
            </div>
            <p className="mb-2 mt-4 text-label font-medium text-muted">Rang</p>
            <div className="flex flex-wrap items-center gap-2">
              {[...COLOR_VALUES, ...colors.filter((c) => !COLOR_VALUES.includes(c))].map((c) => (
                <Chip key={c} on={colors.includes(c)} onClick={() => patch((f) => toggleAxisValue(f, 'Rang', c))}>{c}</Chip>
              ))}
              <div className="w-36">
                <input
                  value={colorDraft}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setColorDraft(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); addCustomColor(); } }}
                  onBlur={addCustomColor}
                  placeholder="+ boshqa rang"
                  className={INPUT_CLS}
                />
              </div>
            </div>
            {form.variants.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                <p className="text-label font-medium text-muted">Har variant narxi va rasmi</p>
                {form.variants.map((v, i) => (
                  <div key={variantLabel(v) || String(i)} className="flex flex-wrap items-center gap-3 rounded-xs border border-line p-2.5">
                    <span className="min-w-28 text-para font-medium text-primary">{variantLabel(v)}</span>
                    <div className="w-40">
                      <PriceInput placeholder="Narx" className={INPUT_CLS} value={v.cashPriceUzs} onChange={(n) => updateVariant(i, { cashPriceUzs: n })} />
                    </div>
                    {v.imageUrl && <img src={v.imageUrl} alt="" className="size-10 rounded-xs border border-line bg-white object-contain" />}
                    <label className={`press cursor-pointer text-label ${busyRow === i ? 'text-muted' : 'text-cta'}`}>
                      {busyRow === i ? 'Yuklanmoqda…' : v.imageUrl ? 'Rasmni almashtirish' : '+ rasm'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        disabled={busyRow === i}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => uploadVariantImage(i, e)}
                      />
                    </label>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        <Card title="Xususiyatlar" description={billz ? "Billz'dan keladi." : 'Nom va qiymat — mahsulot sahifasidagi jadval.'}>
          {billz ? (
            form.specs.length > 0
              ? <Rows rows={form.specs.map((s) => ({ k: s.label, v: s.value }))} />
              : <p className="text-para text-muted">Xususiyat yo'q.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {form.specs.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder="Nomi (Xotira)" value={s.label} onChange={(v) => set('specs', form.specs.map((x, j) => (j === i ? { ...x, label: v } : x)))} />
                  <Input placeholder="Qiymati (256GB)" value={s.value} onChange={(v) => set('specs', form.specs.map((x, j) => (j === i ? { ...x, value: v } : x)))} />
                  <button
                    type="button"
                    aria-label="Xususiyatni olib tashlash"
                    onClick={() => set('specs', form.specs.filter((_, j) => j !== i))}
                    className="press shrink-0 rounded-xs px-2 text-muted-2 hover:text-danger"
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                </div>
              ))}
              <div>
                <Button variant="quiet" onClick={() => set('specs', [...form.specs, { label: '', value: '' }])}>+ Xususiyat</Button>
              </div>
            </div>
          )}
        </Card>

        <Card title="Reyting va sharhlar" description="Reyting sharhlardan hisoblanadi; sharhsiz mahsulotga tashqi manba qiymatini qo'lda kiriting. Sharh soni 0 bo'lsa kartada yulduzcha chiqmaydi.">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Reyting (0–5)">
              <Input type="number" value={form.ratingAvg ? String(form.ratingAvg) : ''} onChange={(v) => set('ratingAvg', Math.min(5, Math.max(0, Number(v) || 0)))} />
            </Field>
            <Field label="Sharhlar soni">
              <Input type="number" value={form.reviewCount ? String(form.reviewCount) : ''} onChange={(v) => set('reviewCount', Math.max(0, Math.floor(Number(v) || 0)))} />
            </Field>
          </div>
          {/* Sharhlar faqat saqlangan mahsulotda (product_id kerak). Reyting/soni sharhlardan qayta hisoblanadi. */}
          {!isNew && (
            <ReviewsEditor productId={id} onChanged={(avg, count) => setForm((f: ProductFormState) => ({ ...f, ratingAvg: avg, reviewCount: count }))} />
          )}
        </Card>

        {!isNew && !billz && (
          <Card title="Xavfli zona" description="Mahsulot, rasmlari va variantlari o'chiriladi; qaytarib bo'lmaydi.">
            <Button variant="destructive" onClick={remove}>Mahsulotni o'chirish</Button>
          </Card>
        )}
      </div>
    </Page>
  );
};

export default ProductEdit;
```

- [ ] **Step 6: Lint, test, brauzer, commit**

Run: `bun run lint && bun run test` → PASS. Brauzer (controller, egasi kirgan): `/admin/products/new` — bitta sarlavha «Yangi mahsulot», Saqlash o'chiq; nom yozilsa yoqiladi; nomsiz/narxsiz Saqlash → xato matni; Xotira chipi bosilsa variant qatori chiqadi. `/admin/products/<Billz tovar id>` (ro'yxatdan `fetch('/api/admin/products')` bilan `billzId` bor id) — Ma'lumot/Narx/Xususiyatlar ro'yxat ko'rinishida, Variantlar va Xavfli zona yo'q, «Saytda ko'rish» yangi tabda `/product/<id>`. Qo'lda kiritilgan mahsulotda tartib o'zgartirib Saqlash → toast, qayta ochilganda qiymat saqlangan (qaytarib qo'ying). 375px — kartalar bir ustun.
```bash
git add src/admin/screens/ProductEdit.tsx src/admin/ModelCombobox.tsx src/admin/ReviewsEditor.tsx src/admin/nav.ts src/admin/AdminApp.tsx
git commit -m "feat(admin): mahsulot tahriri kit bilan — ProductEdit (kartalar, Billz faqat o'qish, variantlar, sharhlar)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Mahsulotlar ro'yxati — `ProductsList` (URL filtrlari, tez filtr, qatorda toggle); eski `ProductList`/`ProductForm` o'chadi

**Files:**
- Create: `src/admin/screens/ProductsList.tsx`
- Modify: `src/admin/AdminApp.tsx` (`ProductList` importi → `ProductsList`, case), `src/admin/lib/product-filter.ts` (`status` o'chadi)
- Delete: `src/admin/ProductList.tsx`, `src/admin/ProductForm.tsx`

**Interfaces:**
- Consumes: T2 (`QUICK_FILTERS`, `QuickFilter`, `filterProducts`), T1 (`Segmented`, `Pagination`), T4 (`ApiAdminBrand`), kit `Badge, Button, Card, DataTable, EmptyState, Input, Select, Skeleton, Toggle, Column`, `useToast`; `listProducts/listCategories/listBrands/listTypes/setProductActive`.
- Produces: `ProductsList: FC`. URL: `/admin/products?q=&f=&cat=&brand=&cond=&page=` (dashboard `?f=needs_image` shu yerga tushadi).

- [ ] **Step 1: `src/admin/screens/ProductsList.tsx`**:
```tsx
import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { ApiAdminBrand, ApiCategory, ApiProduct, ApiProductType } from '../../../shared/types';
import { listBrands, listCategories, listProducts, listTypes, setProductActive } from '../api';
import { errText } from '../errText';
import { formatThousands } from '../lib/format';
import { QUICK_FILTERS, filterProducts, type QuickFilter } from '../lib/product-filter';
import { Badge, Button, Card, DataTable, EmptyState, Input, Pagination, Segmented, Select, Skeleton, Toggle, type Column } from '../ui';
import { useToast } from '../ui/toast';

const PAGE_SIZE = 20;
const LIST = '/admin/products';
const QUICK_IDS: string[] = QUICK_FILTERS.map((q) => q.id);

/**
 * Mahsulotlar ro'yxati — hammasi URL'da (`q`, `f`, `cat`, `brand`, `cond`, `page`): dashboard'dagi
 * "Rasm kerak" `?f=needs_image` bilan keladi, orqaga/oldinga ishlaydi. Ma'lumot to'liq yuklanib client'da
 * filtrlanadi (`filterProducts`), 20 tadan sahifalanadi. Qatorda faol toggle darhol `PATCH`; qatorda
 * o'chirish yo'q — Billz tovari o'chirilmaydi (sinxronizatsiya qaytaradi), qo'lda kiritilgani tahrirda.
 */
const ProductsList: FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const rawF = params.get('f') ?? '';
  const f = (QUICK_IDS.includes(rawF) ? rawF : '') as QuickFilter;
  const cat = params.get('cat') ?? '';
  const brand = params.get('brand') ?? '';
  const cond = params.get('cond') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [rawItems, setItems] = useState(null as ApiProduct[] | null);
  const items = rawItems as ApiProduct[] | null;
  const [rawCats, setCats] = useState([] as ApiCategory[]);
  const cats = rawCats as ApiCategory[];
  const [rawBrands, setBrands] = useState([] as ApiAdminBrand[]);
  const brands = rawBrands as ApiAdminBrand[];
  const [rawTypes, setTypes] = useState([] as ApiProductType[]);
  const types = rawTypes as ApiProductType[];
  const [error, setError] = useState('');

  function load() {
    setError('');
    Promise.all([listProducts(), listCategories(), listBrands(), listTypes()])
      .then(([p, c, b, t]) => { setItems(p); setCats(c); setBrands(b); setTypes(t); })
      .catch(() => setError('Yuklashda xatolik'));
  }
  useEffect(load, []);

  /** URL parametrini yozadi; filtr o'zgarsa sahifa 1 ga qaytadi. */
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  }

  const filtered = useMemo(
    () => filterProducts(items ?? [], { q, categoryId: cat, brandId: brand, condition: cond, quick: f }),
    [items, q, cat, brand, cond, f],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const hasFilter = Boolean(q || f || cat || brand || cond);

  const catName = (id: string | null) => cats.find((c) => c.id === id)?.name ?? '—';
  const typeLabel = (p: ApiProduct) => types.find((t) => t.categoryId === p.categoryId && t.id === p.type)?.label;

  async function toggle(p: ApiProduct, on: boolean) {
    // Optimistik: qator darhol almashadi, xato bo'lsa qaytadi.
    setItems((xs: ApiProduct[] | null) => xs && xs.map((x) => (x.id === p.id ? { ...x, isActive: on } : x)));
    try {
      await setProductActive(p.id, on);
      toast(on ? "Saytda ko'rsatildi" : 'Yashirildi');
    } catch (err) {
      setItems((xs: ApiProduct[] | null) => xs && xs.map((x) => (x.id === p.id ? { ...x, isActive: !on } : x)));
      toast(errText(err), 'error');
    }
  }

  const columns: Column<ApiProduct>[] = [
    {
      id: 'img', label: '', className: 'w-14', mobile: 'hide',
      cell: (p) => (p.imageUrl
        ? <img src={p.imageUrl} alt="" className="size-11 rounded-xs bg-white object-contain" />
        : <span className="block size-11 rounded-xs bg-fill-2" />),
    },
    {
      id: 'name', label: 'Nomi', mobile: 'title', className: 'max-w-[360px]',
      cell: (p) => (
        <span className="flex min-w-0 flex-col gap-1">
          <span className={`truncate ${p.isActive ? 'text-primary' : 'text-muted'}`}>{p.name}</span>
          <span className="flex flex-wrap items-center gap-1.5 text-label text-muted-2">
            {p.billzId && <Badge>Billz</Badge>}
            {p.billzId && !p.imageUrl && <Badge tone="attention">Rasm kerak</Badge>}
            {p.condition === 'ishlatilgan' && <Badge tone="info">Ishlatilgan</Badge>}
            {typeLabel(p) && <span>{typeLabel(p)}</span>}
          </span>
        </span>
      ),
    },
    { id: 'cat', label: 'Kategoriya', cell: (p) => <span className="text-muted">{catName(p.categoryId)}</span> },
    { id: 'price', label: 'Narx', align: 'right', cell: (p) => <span className="whitespace-nowrap tabular-nums">{formatThousands(p.minPriceUzs)} so'm</span> },
    { id: 'stock', label: 'Qoldiq', align: 'right', className: 'w-20', cell: (p) => <span className={p.billzStock === 0 ? 'text-muted-2' : 'text-muted'}>{p.billzStock ?? '—'}</span> },
    { id: 'active', label: 'Saytda', align: 'right', className: 'w-20', cell: (p) => <Toggle on={p.isActive} onChange={(v) => toggle(p, v)} label={`${p.name} — saytda ko'rsatish`} /> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:max-w-xs sm:flex-1">
          <Input value={q} onChange={(v) => update('q', v)} placeholder="Nom bo'yicha qidirish…" />
        </div>
        <div className="w-full sm:w-44">
          <Select value={cat} onChange={(v) => update('cat', v)}>
            <option value="">Barcha kategoriya</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div className="w-full sm:w-44">
          <Select value={brand} onChange={(v) => update('brand', v)}>
            <option value="">Barcha brend</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </div>
        <div className="w-full sm:w-36">
          <Select value={cond} onChange={(v) => update('cond', v)}>
            <option value="">Holati</option>
            <option value="yangi">Yangi</option>
            <option value="ishlatilgan">Ishlatilgan</option>
          </Select>
        </div>
        <div className="sm:ml-auto">
          <Button to={`${LIST}/new`}>Yangi mahsulot</Button>
        </div>
      </div>
      <Segmented label="Tez filtr" value={f} onChange={(v) => update('f', v)} options={QUICK_FILTERS} />

      {error ? (
        <EmptyState title="Ma'lumot yuklanmadi" text={error} action={<Button variant="secondary" onClick={load}>Qayta urinish</Button>} />
      ) : !items ? (
        <Skeleton rows={8} />
      ) : (
        <>
          <p className="text-label text-muted">{filtered.length} ta mahsulot</p>
          <Card padded={false}>
            <div className="px-2 py-1">
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(p) => p.id}
                onRowClick={(p) => navigate(`${LIST}/${p.id}`)}
                empty={
                  <EmptyState
                    title="Mahsulot topilmadi"
                    action={hasFilter
                      ? <Button variant="secondary" onClick={() => setParams({}, { replace: true })}>Filtrni tozalash</Button>
                      : <Button to={`${LIST}/new`}>Yangi mahsulot</Button>}
                  />
                }
              />
            </div>
          </Card>
          <Pagination page={safePage} pageCount={pageCount} onChange={(p) => update('page', String(p))} />
        </>
      )}
    </div>
  );
};

export default ProductsList;
```

- [ ] **Step 2: `AdminApp.tsx`** — `import ProductList from './ProductList';` → `import ProductsList from './screens/ProductsList';`; case:
```ts
    case 'products/list': return id ? <ProductEdit key={id} id={id} /> : <ProductsList />;
```

- [ ] **Step 3: Eski ekranlar o'chadi**
```bash
git rm -q src/admin/ProductList.tsx src/admin/ProductForm.tsx && grep -rn "ProductList\b\|ProductForm\b" src app --include='*.ts' --include='*.tsx' | wc -l
```
Expected: `0`.

- [ ] **Step 4: `product-filter.ts`** — `ProductFilter.status` maydoni (izohi bilan) va `filterProducts`dagi uchta `f.status` qatori o'chadi (testlar T2'da allaqachon `quick` bilan).

- [ ] **Step 5: Lint, test, brauzer, commit**

Run: `bun run lint && bun run test` → PASS. Brauzer (controller): `/admin/products` — qidiruv/select/segment URL'ni yozadi (`?q=…&f=hidden`), son o'zgaradi, «‹ 1 / N ›»; dashboard «Rasm kerak → Ro'yxatni ochish» → `?f=needs_image` segmenti faol; qatordagi toggle → toast, sahifa yangilanganda holat saqlangan (qaytarib qo'ying); qator bosilsa `/admin/products/<id>`; «Yangi mahsulot» → `/admin/products/new`; 375px — kartalar, toggle karta ichida.
```bash
git add src/admin/screens/ProductsList.tsx src/admin/AdminApp.tsx src/admin/lib/product-filter.ts
git commit -m "feat(admin): mahsulotlar ro'yxati kit bilan — URL filtrlari, tez filtr, qatorda faol toggle; eski ProductList/ProductForm o'chirildi

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Kategoriyalar — `CategoriesList` + `CategoryEdit`; eski `CategoryList`/`CategoryForm` o'chadi

**Files:**
- Create: `src/admin/screens/CategoriesList.tsx`, `src/admin/screens/CategoryEdit.tsx`
- Modify: `src/admin/nav.ts:24` (`detail: true`), `src/admin/AdminApp.tsx` (import + case)
- Delete: `src/admin/CategoryList.tsx`, `src/admin/CategoryForm.tsx`

**Interfaces:**
- Consumes: kit `Button, Card, DataTable, EmptyState, Field, Input, LangPair, Page, Skeleton, Column`, `useToast`, `useConfirm`, `ImageUploader`; `listCategories/createCategory/updateCategory/deleteCategory/listTypes`; `ApiCategory { id; name; nameRu; iconUrl; icon; coverUrl; coverLede; coverLedeRu; sortOrder }`.
- Produces: `CategoriesList: FC`, `CategoryEdit: FC<{ id: string }>` (`'new'` yoki kategoriya id'si). Yangi kategoriya id'sini server nomdan yasaydi (`parseCategoryInput`).

- [ ] **Step 1: `src/admin/screens/CategoriesList.tsx`**:
```tsx
import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import type { ApiCategory, ApiProductType } from '../../../shared/types';
import { listCategories, listTypes } from '../api';
import { Button, Card, DataTable, EmptyState, Skeleton, type Column } from '../ui';

const LIST = '/admin/products/categories';

/** Yo'nalishlar — saytdagi 4 bo'lim (Apple · PC · Audio · Video); qator bosilsa tahrir. */
const CategoriesList: FC = () => {
  const navigate = useNavigate();
  const [rawItems, setItems] = useState(null as ApiCategory[] | null);
  const items = rawItems as ApiCategory[] | null;
  const [rawTypes, setTypes] = useState([] as ApiProductType[]);
  const types = rawTypes as ApiProductType[];
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([listCategories(), listTypes()])
      .then(([c, t]) => { setItems(c); setTypes(t); })
      .catch(() => setError('Yuklashda xatolik'));
  }, []);

  const columns: Column<ApiCategory>[] = [
    {
      id: 'cover', label: '', className: 'w-14', mobile: 'hide',
      cell: (c) => (c.coverUrl
        ? <img src={c.coverUrl} alt="" className="size-10 rounded-xs bg-fill-2 object-cover" />
        : <span className="flex size-10 items-center justify-center rounded-xs bg-fill-2 text-para font-medium text-primary">{c.name.slice(0, 1)}</span>),
    },
    {
      id: 'name', label: 'Nomi', mobile: 'title',
      cell: (c) => (
        <span className="flex flex-col">
          <span className="text-primary">{c.name}</span>
          {c.nameRu && c.nameRu !== c.name && <span className="text-label text-muted-2">{c.nameRu}</span>}
        </span>
      ),
    },
    { id: 'types', label: 'Turlar', align: 'right', className: 'w-20', cell: (c) => <span className="text-muted">{types.filter((t) => t.categoryId === c.id).length}</span> },
    { id: 'sort', label: 'Tartib', align: 'right', className: 'w-20', cell: (c) => <span className="text-muted">{c.sortOrder}</span>, mobile: 'hide' },
  ];

  if (error) return <EmptyState title="Ma'lumot yuklanmadi" text={error} />;
  if (!items) return <Skeleton rows={4} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-para text-muted">Saytdagi yo'nalishlar; har birining o'z cover rasmi va turlari bor.</p>
        <Button to={`${LIST}/new`}>Yangi kategoriya</Button>
      </div>
      <Card padded={false}>
        <div className="px-2 py-1">
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(c) => c.id}
            onRowClick={(c) => navigate(`${LIST}/${c.id}`)}
            empty={<EmptyState title="Kategoriya yo'q" action={<Button to={`${LIST}/new`}>Yangi kategoriya</Button>} />}
          />
        </div>
      </Card>
    </div>
  );
};

export default CategoriesList;
```

- [ ] **Step 2: `src/admin/screens/CategoryEdit.tsx`**:
```tsx
import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import type { ApiCategory } from '../../../shared/types';
import { createCategory, deleteCategory, listCategories, listTypes, updateCategory } from '../api';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import { Button, Card, Field, Input, LangPair, Page, Skeleton } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/products/categories';

interface Form { name: string; nameRu: string; sortOrder: number; coverUrl: string }
const EMPTY: Form = { name: '', nameRu: '', sortOrder: 0, coverUrl: '' };

/** Kategoriya tahriri. `id` = 'new' yoki kategoriya id'si; id server tomonida nomdan yasaladi, keyin o'zgarmaydi. */
const CategoryEdit: FC<{ id: string }> = ({ id }) => {
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [rawForm, setForm] = useState(EMPTY as Form);
  const form = rawForm as Form;
  const [rawInitial, setInitial] = useState(null as ApiCategory | null);
  const initial = rawInitial as ApiCategory | null;
  const [typeCount, setTypeCount] = useState(0);
  const [loaded, setLoaded] = useState(isNew);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isNew) return;
    Promise.all([listCategories(), listTypes()]).then(([cats, types]) => {
      const c = cats.find((x) => x.id === id);
      if (!c) { setError('Kategoriya topilmadi'); return; }
      setInitial(c);
      setForm({ name: c.name, nameRu: c.nameRu, sortOrder: c.sortOrder, coverUrl: c.coverUrl });
      setTypeCount(types.filter((t) => t.categoryId === id).length);
      setLoaded(true);
    }).catch(() => setError('Yuklashda xatolik'));
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };

  async function save() {
    setBusy(true); setError('');
    // Saytda ko'rinmaydigan ustunlar (ikonka kaliti, cover izohi) tahrirlanmaydi — mavjud qiymat saqlanadi.
    const body = {
      name: form.name, nameRu: form.nameRu, coverUrl: form.coverUrl, sortOrder: form.sortOrder,
      icon: initial?.icon ?? '', iconUrl: initial?.iconUrl ?? '',
      coverLede: initial?.coverLede ?? '', coverLedeRu: initial?.coverLedeRu ?? '',
    };
    try {
      if (isNew) {
        await createCategory(body);
        toast("Kategoriya qo'shildi");
        navigate(LIST);
      } else {
        await updateCategory(id, body);
        setDirty(false);
        toast("Saqlandi · saytda 1–5 daqiqada ko'rinadi");
      }
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!initial) return;
    const ok = await confirm({
      title: `«${initial.name}» yo'nalishini o'chirish`,
      message: `${typeCount} ta tur ham o'chadi; mahsulotlar kategoriyasiz qoladi (katalogda ko'rinadi).`,
      confirmLabel: "O'chirish", destructive: true,
    });
    if (!ok) return;
    try {
      await deleteCategory(id);
      toast("Kategoriya o'chirildi");
      navigate(LIST);
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const canSave = dirty && !busy && form.name.trim() !== '';

  return (
    <Page
      title={isNew ? 'Yangi kategoriya' : initial?.name ?? 'Kategoriya'}
      back={LIST}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>}
    >
      {!loaded && !error ? <Skeleton rows={4} /> : (
        <div className="flex flex-col gap-4">
          {error && <p className="text-para text-danger">{error}</p>}
          <Card title="Asosiy">
            <LangPair label="Nomi" uz={form.name} ru={form.nameRu} onUz={(v) => set('name', v)} onRu={(v) => set('nameRu', v)} required />
            <div className="mt-4 max-w-40">
              <Field label="Tartib" hint="Menyudagi o'rni — kichigi oldin">
                <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
              </Field>
            </div>
          </Card>
          <Card title="Cover rasmi" description="Yo'nalish sahifasi tepasidagi keng (landshaft) rasm; bo'sh qolsa sahifa oddiy sarlavha bilan ochiladi.">
            <ImageUploader label="Cover" images={form.coverUrl ? [form.coverUrl] : []} onChange={(next) => set('coverUrl', next[0] ?? '')} />
          </Card>
          {!isNew && initial && (
            <Card title="Xavfli zona" description="Yo'nalish bilan birga uning turlari o'chadi; mahsulotlar kategoriyasiz qoladi.">
              <Button variant="destructive" onClick={remove}>Yo'nalishni o'chirish</Button>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
};

export default CategoryEdit;
```

- [ ] **Step 3: `nav.ts`** — `{ id: 'categories', segment: 'categories', label: 'Kategoriyalar', Icon: LayoutGrid, detail: true },`

- [ ] **Step 4: `AdminApp.tsx`** — `import CategoryList from './CategoryList';` → `import CategoriesList from './screens/CategoriesList'; import CategoryEdit from './screens/CategoryEdit';`; case:
```ts
    case 'products/categories': return id ? <CategoryEdit key={id} id={id} /> : <CategoriesList />;
```

- [ ] **Step 5: Eski fayllar**
```bash
git rm -q src/admin/CategoryList.tsx src/admin/CategoryForm.tsx && grep -rn "CategoryList\b\|CategoryForm\b" src app --include='*.ts' --include='*.tsx' | wc -l
```
Expected: `0`.

- [ ] **Step 6: Lint, test, brauzer, commit**

Run: `bun run lint && bun run test` → PASS. Brauzer (controller): `/admin/products/categories` — 4 qator (cover yoki bosh harf, turlar soni); qator → `/admin/products/categories/pc`: LangPair nom, tartib, cover; Saqlash o'chiq → nom o'zgartirilsa yoqiladi (qaytarib qo'ying); «Yangi kategoriya» → `/new`, nomsiz Saqlash o'chiq; Xavfli zona tasdig'i tur sonini ko'rsatadi (Bekor qilish).
```bash
git add src/admin/screens/CategoriesList.tsx src/admin/screens/CategoryEdit.tsx src/admin/nav.ts src/admin/AdminApp.tsx
git commit -m "feat(admin): kategoriyalar ro'yxati va tahriri kit bilan; eski CategoryList/CategoryForm o'chirildi

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Brendlar — `BrandsList` + `BrandEdit`; eski `BrandList`/`BrandForm` o'chadi

**Files:**
- Create: `src/admin/screens/BrandsList.tsx`, `src/admin/screens/BrandEdit.tsx`
- Modify: `src/admin/nav.ts:25` (`detail: true`), `src/admin/AdminApp.tsx` (import + case)
- Delete: `src/admin/BrandList.tsx`, `src/admin/BrandForm.tsx`

**Interfaces:**
- Consumes: T4 (`ApiAdminBrand`, `listBrands`), `createBrand/updateBrand/deleteBrand` (`Partial<ApiBrand>` tanasi: `{ name, slug, logoUrl, sortOrder }`), kit, `ImageUploader` (`accept`).
- Produces: `BrandsList: FC`, `BrandEdit: FC<{ id: string }>`. Brend id'si server tomonida slug'dan (`parseBrandInput`).

- [ ] **Step 1: `src/admin/screens/BrandsList.tsx`**:
```tsx
import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import type { ApiAdminBrand } from '../../../shared/types';
import { listBrands } from '../api';
import { Button, Card, DataTable, EmptyState, Skeleton, type Column } from '../ui';

const LIST = '/admin/products/brands';

/** Brendlar — logotipi borlari bosh sahifadagi tasmada chiqadi; qator bosilsa tahrir. */
const BrandsList: FC = () => {
  const navigate = useNavigate();
  const [rawItems, setItems] = useState(null as ApiAdminBrand[] | null);
  const items = rawItems as ApiAdminBrand[] | null;
  const [error, setError] = useState('');

  useEffect(() => {
    listBrands().then(setItems).catch(() => setError('Yuklashda xatolik'));
  }, []);

  const columns: Column<ApiAdminBrand>[] = [
    {
      id: 'logo', label: '', className: 'w-14', mobile: 'hide',
      cell: (b) => (b.logoUrl
        ? <img src={b.logoUrl} alt="" className="size-10 rounded-xs bg-fill-2 object-contain p-1" />
        : <span className="flex size-10 items-center justify-center rounded-xs bg-fill-2 text-para font-medium text-primary">{b.name.slice(0, 1)}</span>),
    },
    {
      id: 'name', label: 'Nomi', mobile: 'title',
      cell: (b) => (
        <span className="flex flex-col">
          <span className="text-primary">{b.name}</span>
          <span className="text-label text-muted-2">/brand/{b.slug}</span>
        </span>
      ),
    },
    { id: 'count', label: 'Mahsulot', align: 'right', className: 'w-24', cell: (b) => <span className={b.productCount > 0 ? 'text-primary' : 'text-muted-2'}>{b.productCount}</span> },
    { id: 'strip', label: 'Tasmada', className: 'w-24', cell: (b) => <span className="text-muted">{b.logoUrl ? 'Ha' : '—'}</span> },
    { id: 'sort', label: 'Tartib', align: 'right', className: 'w-20', cell: (b) => <span className="text-muted">{b.sortOrder}</span>, mobile: 'hide' },
  ];

  if (error) return <EmptyState title="Ma'lumot yuklanmadi" text={error} />;
  if (!items) return <Skeleton rows={8} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-para text-muted">Billz sinxronizatsiyasi yangi brendni o'zi yaratadi; logotip shu yerda yuklanadi.</p>
        <Button to={`${LIST}/new`}>Yangi brend</Button>
      </div>
      <Card padded={false}>
        <div className="px-2 py-1">
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(b) => b.id}
            onRowClick={(b) => navigate(`${LIST}/${b.id}`)}
            empty={<EmptyState title="Brend yo'q" action={<Button to={`${LIST}/new`}>Yangi brend</Button>} />}
          />
        </div>
      </Card>
    </div>
  );
};

export default BrandsList;
```

- [ ] **Step 2: `src/admin/screens/BrandEdit.tsx`**:
```tsx
import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import type { ApiAdminBrand } from '../../../shared/types';
import { createBrand, deleteBrand, listBrands, updateBrand } from '../api';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import { Button, Card, Field, Input, Page, Skeleton } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/products/brands';

interface Form { name: string; slug: string; sortOrder: number; logoUrl: string }
const EMPTY: Form = { name: '', slug: '', sortOrder: 0, logoUrl: '' };

/** Brend tahriri. `id` = 'new' yoki brend id'si (server slug'dan yasaydi). */
const BrandEdit: FC<{ id: string }> = ({ id }) => {
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [rawForm, setForm] = useState(EMPTY as Form);
  const form = rawForm as Form;
  const [rawInitial, setInitial] = useState(null as ApiAdminBrand | null);
  const initial = rawInitial as ApiAdminBrand | null;
  const [loaded, setLoaded] = useState(isNew);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isNew) return;
    listBrands().then((all) => {
      const b = all.find((x) => x.id === id);
      if (!b) { setError('Brend topilmadi'); return; }
      setInitial(b);
      setForm({ name: b.name, slug: b.slug, sortOrder: b.sortOrder, logoUrl: b.logoUrl });
      setLoaded(true);
    }).catch(() => setError('Yuklashda xatolik'));
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };

  async function save() {
    setBusy(true); setError('');
    const body = { name: form.name, slug: form.slug, logoUrl: form.logoUrl, sortOrder: form.sortOrder };
    try {
      if (isNew) {
        await createBrand(body);
        toast("Brend qo'shildi");
        navigate(LIST);
      } else {
        await updateBrand(id, body);
        setDirty(false);
        toast("Saqlandi · saytda 1–5 daqiqada ko'rinadi");
      }
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!initial) return;
    const ok = await confirm({
      title: `«${initial.name}» brendini o'chirish`,
      message: `${initial.productCount} ta mahsulot brendsiz qoladi. Billz tovari bo'lsa keyingi sinxronizatsiya brendni qayta yaratadi.`,
      confirmLabel: "O'chirish", destructive: true,
    });
    if (!ok) return;
    try {
      await deleteBrand(id);
      toast("Brend o'chirildi");
      navigate(LIST);
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const canSave = dirty && !busy && form.name.trim() !== '';

  return (
    <Page
      title={isNew ? 'Yangi brend' : initial?.name ?? 'Brend'}
      back={LIST}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>}
    >
      {!loaded && !error ? <Skeleton rows={4} /> : (
        <div className="flex flex-col gap-4">
          {error && <p className="text-para text-danger">{error}</p>}
          <Card title="Asosiy">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nomi" required>
                <Input value={form.name} onChange={(v) => set('name', v)} />
              </Field>
              <Field label="Slug" hint="Saytdagi /brand/<slug> manzili; bo'sh qolsa nomdan yasaladi">
                <Input value={form.slug} onChange={(v) => set('slug', v)} />
              </Field>
              <Field label="Tartib" hint="Tasmadagi va ro'yxatdagi o'rni — kichigi oldin">
                <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
              </Field>
            </div>
          </Card>
          <Card title="Logotip" description="Shaffof fonli PNG. Yuklansa bosh sahifadagi brendlar tasmasida chiqadi — tasmada bir rangga (qora/oq) keltiriladi; bo'sh qolsa tasmada chiqmaydi.">
            <ImageUploader label="Logo" images={form.logoUrl ? [form.logoUrl] : []} onChange={(next) => set('logoUrl', next[0] ?? '')} accept="image/png,image/webp" />
          </Card>
          {!isNew && initial && (
            <Card title="Xavfli zona" description="Brend o'chirilsa mahsulotlar brendsiz qoladi.">
              <Button variant="destructive" onClick={remove}>Brendni o'chirish</Button>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
};

export default BrandEdit;
```

- [ ] **Step 3: `nav.ts`** — `{ id: 'brands', segment: 'brands', label: 'Brendlar', Icon: Tag, detail: true },`

- [ ] **Step 4: `AdminApp.tsx`** — `import BrandList from './BrandList';` → `import BrandsList from './screens/BrandsList'; import BrandEdit from './screens/BrandEdit';`; case:
```ts
    case 'products/brands': return id ? <BrandEdit key={id} id={id} /> : <BrandsList />;
```

- [ ] **Step 5: Eski fayllar**
```bash
git rm -q src/admin/BrandList.tsx src/admin/BrandForm.tsx && grep -rn "BrandList\b\|BrandForm\b" src app --include='*.ts' --include='*.tsx' | wc -l
```
Expected: `0`.

- [ ] **Step 6: Lint, test, brauzer, commit**

Run: `bun run lint && bun run test` → PASS. Brauzer (controller): `/admin/products/brands` — logotip/bosh harf, mahsulot soni, «Tasmada»; qator → `/admin/products/brands/apple`: Saqlash o'chiq, tartib o'zgartirilsa yoqiladi (qaytarib qo'ying); Xavfli zona tasdig'i mahsulot sonini ko'rsatadi (Bekor qilish); `/new` — nomsiz Saqlash o'chiq.
```bash
git add src/admin/screens/BrandsList.tsx src/admin/screens/BrandEdit.tsx src/admin/nav.ts src/admin/AdminApp.tsx
git commit -m "feat(admin): brendlar ro'yxati va tahriri kit bilan (mahsulot soni, logotip); eski BrandList/BrandForm o'chirildi

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Modellar — `ModelsList` + `ModelEdit`; eski `ModelList`/`ModelForm` o'chadi

**Files:**
- Create: `src/admin/screens/ModelsList.tsx`, `src/admin/screens/ModelEdit.tsx`
- Modify: `src/admin/nav.ts:26` (`detail: true`), `src/admin/AdminApp.tsx` (import + case)
- Delete: `src/admin/ModelList.tsx`, `src/admin/ModelForm.tsx`

**Interfaces:**
- Consumes: `listDeviceModels/createDeviceModel/updateDeviceModel/deleteDeviceModel` (`Partial<ApiDeviceModel>`; `legacyCategory` yuborilmaydi — server `deriveLegacyCategory` bilan yasaydi), `filterModels(models, query, limit)`, `listBrands`, `listCategories`, kit, T1 `Pagination`.
- Produces: `ModelsList: FC` (URL: `q`, `brand`, `cat`, `page`), `ModelEdit: FC<{ id: string }>`.

- [ ] **Step 1: `src/admin/screens/ModelsList.tsx`**:
```tsx
import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { ApiAdminBrand, ApiCategory, ApiDeviceModel } from '../../../shared/types';
import { listBrands, listCategories, listDeviceModels } from '../api';
import { filterModels } from '../lib/models';
import { Button, Card, DataTable, EmptyState, Input, Pagination, Select, Skeleton, type Column } from '../ui';

const PAGE_SIZE = 20;
const LIST = '/admin/products/models';

/** Qurilma modellari registri — mahsulot formasidagi `ModelCombobox` shu ro'yxatdan to'ldiradi. Filtrlar URL'da. */
const ModelsList: FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const brand = params.get('brand') ?? '';
  const cat = params.get('cat') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [rawItems, setItems] = useState(null as ApiDeviceModel[] | null);
  const items = rawItems as ApiDeviceModel[] | null;
  const [rawBrands, setBrands] = useState([] as ApiAdminBrand[]);
  const brands = rawBrands as ApiAdminBrand[];
  const [rawCats, setCats] = useState([] as ApiCategory[]);
  const cats = rawCats as ApiCategory[];
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([listDeviceModels(), listBrands(), listCategories()])
      .then(([m, b, c]) => { setItems(m); setBrands(b); setCats(c); })
      .catch(() => setError('Yuklashda xatolik'));
  }, []);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  }

  const filtered = useMemo(() => {
    const all = items ?? [];
    return filterModels(all, q, all.length).filter((m) => (!brand || m.brandId === brand) && (!cat || m.categoryId === cat));
  }, [items, q, brand, cat]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const brandName = (id: string) => brands.find((b) => b.id === id)?.name ?? id;
  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? id;

  const columns: Column<ApiDeviceModel>[] = [
    { id: 'name', label: 'Nomi', mobile: 'title', cell: (m) => <span className="text-primary">{m.name}</span> },
    { id: 'brand', label: 'Brend', cell: (m) => <span className="text-muted">{brandName(m.brandId)}</span> },
    { id: 'cat', label: 'Kategoriya', cell: (m) => <span className="text-muted">{catName(m.categoryId)}</span> },
    { id: 'chip', label: 'Chip', cell: (m) => <span className="text-muted">{m.chip || '—'}</span> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:max-w-xs sm:flex-1">
          <Input value={q} onChange={(v) => update('q', v)} placeholder="Qidirish (masalan: 16 pro)" />
        </div>
        <div className="w-full sm:w-44">
          <Select value={brand} onChange={(v) => update('brand', v)}>
            <option value="">Barcha brend</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </div>
        <div className="w-full sm:w-44">
          <Select value={cat} onChange={(v) => update('cat', v)}>
            <option value="">Barcha kategoriya</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div className="sm:ml-auto">
          <Button to={`${LIST}/new`}>Yangi model</Button>
        </div>
      </div>
      {error ? (
        <EmptyState title="Ma'lumot yuklanmadi" text={error} />
      ) : !items ? (
        <Skeleton rows={8} />
      ) : (
        <>
          <p className="text-label text-muted">{filtered.length} ta model</p>
          <Card padded={false}>
            <div className="px-2 py-1">
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(m) => m.id}
                onRowClick={(m) => navigate(`${LIST}/${m.id}`)}
                empty={<EmptyState title="Model topilmadi" action={<Button variant="secondary" onClick={() => setParams({}, { replace: true })}>Filtrni tozalash</Button>} />}
              />
            </div>
          </Card>
          <Pagination page={safePage} pageCount={pageCount} onChange={(p) => update('page', String(p))} />
        </>
      )}
    </div>
  );
};

export default ModelsList;
```

- [ ] **Step 2: `src/admin/screens/ModelEdit.tsx`**:
```tsx
import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import type { ApiAdminBrand, ApiCategory, ApiDeviceModel } from '../../../shared/types';
import { createDeviceModel, deleteDeviceModel, listBrands, listCategories, listDeviceModels, updateDeviceModel } from '../api';
import { errText } from '../errText';
import { Button, Card, Field, Input, Page, Select, Skeleton } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/products/models';

interface Form { name: string; brandId: string; categoryId: string; chip: string; ram: string; camera: string; display: string; sortOrder: number }
const EMPTY: Form = { name: '', brandId: '', categoryId: '', chip: '', ram: '', camera: '', display: '', sortOrder: 0 };

/**
 * Model tahriri. Model tanlanganda mahsulot formasi nom/brend/kategoriya va xususiyatlarni
 * (Protsessor, Operativ xotira, Kamera, Displey) shu yozuvdan to'ldiradi.
 */
const ModelEdit: FC<{ id: string }> = ({ id }) => {
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [rawForm, setForm] = useState(EMPTY as Form);
  const form = rawForm as Form;
  const [rawInitial, setInitial] = useState(null as ApiDeviceModel | null);
  const initial = rawInitial as ApiDeviceModel | null;
  const [rawBrands, setBrands] = useState([] as ApiAdminBrand[]);
  const brands = rawBrands as ApiAdminBrand[];
  const [rawCats, setCats] = useState([] as ApiCategory[]);
  const cats = rawCats as ApiCategory[];
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([listBrands(), listCategories(), isNew ? Promise.resolve([] as ApiDeviceModel[]) : listDeviceModels()])
      .then(([b, c, models]) => {
        setBrands(b); setCats(c);
        if (isNew) {
          // Yangi yozuvda birinchi brend/kategoriya tanlangan turadi — ikkalasi majburiy.
          setForm((f: Form) => ({ ...f, brandId: b[0]?.id ?? '', categoryId: c[0]?.id ?? '' }));
        } else {
          const m = models.find((x) => x.id === id);
          if (!m) { setError('Model topilmadi'); return; }
          setInitial(m);
          setForm({ name: m.name, brandId: m.brandId, categoryId: m.categoryId, chip: m.chip, ram: m.ram, camera: m.camera, display: m.display, sortOrder: m.sortOrder });
        }
        setLoaded(true);
      })
      .catch(() => setError('Yuklashda xatolik'));
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };

  async function save() {
    setBusy(true); setError('');
    const body = { name: form.name, brandId: form.brandId, categoryId: form.categoryId, chip: form.chip, ram: form.ram, camera: form.camera, display: form.display, sortOrder: form.sortOrder };
    try {
      if (isNew) {
        await createDeviceModel(body);
        toast("Model qo'shildi");
        navigate(LIST);
      } else {
        await updateDeviceModel(id, body);
        setDirty(false);
        toast('Saqlandi');
      }
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!initial) return;
    const ok = await confirm({
      title: `«${initial.name}» modelini o'chirish`,
      message: "Registrdan o'chadi; mavjud mahsulotlarga ta'sir qilmaydi.",
      confirmLabel: "O'chirish", destructive: true,
    });
    if (!ok) return;
    try {
      await deleteDeviceModel(id);
      toast("Model o'chirildi");
      navigate(LIST);
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const canSave = dirty && !busy && form.name.trim() !== '' && form.brandId !== '' && form.categoryId !== '';

  return (
    <Page
      title={isNew ? 'Yangi model' : initial?.name ?? 'Model'}
      back={LIST}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>}
    >
      {!loaded && !error ? <Skeleton rows={5} /> : (
        <div className="flex flex-col gap-4">
          {error && <p className="text-para text-danger">{error}</p>}
          <Card title="Asosiy">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nomi" required className="md:col-span-2">
                <Input value={form.name} onChange={(v) => set('name', v)} placeholder="iPhone 16 Pro Max" />
              </Field>
              <Field label="Brend" required>
                <Select value={form.brandId} onChange={(v) => set('brandId', v)}>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
              <Field label="Kategoriya" required>
                <Select value={form.categoryId} onChange={(v) => set('categoryId', v)}>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Tartib" hint="Taklif ro'yxatidagi o'rni — kichigi oldin">
                <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
              </Field>
            </div>
          </Card>
          <Card title="Xususiyatlar" description="Model tanlanganda mahsulot xususiyatlariga shu qiymatlar tushadi; bo'sh qolgani tushmaydi.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Protsessor"><Input value={form.chip} onChange={(v) => set('chip', v)} /></Field>
              <Field label="Operativ xotira"><Input value={form.ram} onChange={(v) => set('ram', v)} /></Field>
              <Field label="Kamera"><Input value={form.camera} onChange={(v) => set('camera', v)} /></Field>
              <Field label="Displey"><Input value={form.display} onChange={(v) => set('display', v)} /></Field>
            </div>
          </Card>
          {!isNew && initial && (
            <Card title="Xavfli zona" description="Model registrdan o'chadi; mavjud mahsulotlarga ta'sir qilmaydi.">
              <Button variant="destructive" onClick={remove}>Modelni o'chirish</Button>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
};

export default ModelEdit;
```

- [ ] **Step 3: `nav.ts`** — `{ id: 'models', segment: 'models', label: 'Modellar', Icon: Smartphone, detail: true },`

- [ ] **Step 4: `AdminApp.tsx`** — `import ModelList from './ModelList';` → `import ModelsList from './screens/ModelsList'; import ModelEdit from './screens/ModelEdit';`; case:
```ts
    case 'products/models': return id ? <ModelEdit key={id} id={id} /> : <ModelsList />;
```

- [ ] **Step 5: Eski fayllar**
```bash
git rm -q src/admin/ModelList.tsx src/admin/ModelForm.tsx && grep -rn "ModelList\b\|ModelForm\b" src app --include='*.ts' --include='*.tsx' | wc -l
```
Expected: `0`.

- [ ] **Step 6: Lint, test, brauzer, commit**

Run: `bun run lint && bun run test` → PASS. Brauzer (controller): `/admin/products/models` — qidiruv «16 pro» URL'ga tushadi va ro'yxatni toraytiradi, brend/kategoriya nomlari, «‹ 1 / N ›»; qator → tahrir, Saqlash o'chiq; `/new` — brend/kategoriya oldindan tanlangan, nomsiz Saqlash o'chiq.
```bash
git add src/admin/screens/ModelsList.tsx src/admin/screens/ModelEdit.tsx src/admin/nav.ts src/admin/AdminApp.tsx
git commit -m "feat(admin): modellar ro'yxati va tahriri kit bilan; eski ModelList/ModelForm o'chirildi

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Hujjat — `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md` (faqat quyidagi jumlalar; Edit bilan, qayta oqim yo'q)

- [ ] **Step 1: Bosqich holati** — "1- va 2a-bosqich bajarildi" → "1-, 2a- va 2b-bosqich bajarildi".

- [ ] **Step 2: Eski ekranlar jumlasi** — shu jumla:
> Eski `*List`/`*Form` ekranlari hozircha yangi qobiqning tab'lariga ulangan (`AdminApp.screenFor`) va 2–5-bosqichlarda kit bilan qayta chiziladi; quyidagi tavsif o'sha eski ekranlar haqida.

→ shu bilan almashadi:
> **2b (2026-09-16) — Mahsulotlar bo'limi kit bilan:** `src/admin/screens/ProductsList.tsx` (filtrlar URL'da — `q`, `f` tez filtr `Hammasi·Rasm kerak·Yashirin·Qoldiq 0·Qo'lda kiritilgan` (`quickFilter`, `product-filter.ts`), `cat`, `brand`, `cond`, `page`; dashboard `?f=needs_image` shu yerga; qatorda faol toggle darhol `PATCH`; qatorda o'chirish yo'q; `Pagination` «‹ 3 / 80 ›»), `ProductEdit.tsx` (`/admin/products/new|:id`; bitta ustun, kartalar: Rasmlar → Holat → Ma'lumot → Narx → Variantlar → Xususiyatlar → Reyting va sharhlar → Xavfli zona; Billz tovarida sinxron maydonlar faqat o'qiladi, o'chirilmaydi; mantiq sof `src/admin/lib/product-form.ts`da — `detailToForm`/`formToPayload`/`validateForm`/`toggleAxisValue`, testli), `CategoriesList/CategoryEdit`, `BrandsList/BrandEdit` (admin `GET /api/admin/brands` `productCount` bilan — `ApiAdminBrand`), `ModelsList/ModelEdit`; id-ekranlar `TabDef.detail` bilan o'z `Page`ini chizadi. Kitga `Segmented` (lokal segment) va `Pagination` qo'shildi; `danger` to'ldirmasi ustida matn `text-bg`. Eski `ProductList/ProductForm/CategoryList/CategoryForm/BrandList/BrandForm/ModelList/ModelForm` o'chirildi. Buyurtmalar/Kontent/Sozlamalar ekranlari hali eski (3–5-bosqichlar); quyidagi tavsifning o'sha qismlari eski ekranlar haqida.

- [ ] **Step 3: Mahsulot formasi xatboshisi** — "**Fast product creation is the core flow** (ProductForm): " → "**Fast product creation is the core flow** (`src/admin/screens/ProductEdit.tsx`, sof mantiq `src/admin/lib/product-form.ts`): "; "**Turi** — kategoriya tanlangandan keyin ochiladigan select (`typesFor(categoryId)`);" → "**Turi** — kategoriya tanlangandan keyin ochiladigan select (`listTypes()` API'dan, kategoriyaga qarab);"; "Slug/sortOrder/conditionNote/description have **no UI but stay in FormState/payload** so old products round-trip." → "Slug/conditionNote have **no UI but stay in `ProductFormState`/payload** so old products round-trip (description va sortOrder 2b'da UI oldi)."

- [ ] **Step 4: Sof yordamchilar** — "Pure admin helpers live in `src/admin/lib/` (variant-gen, format, models, `image-normalize` (`contentBounds`), `reorder` (`moveItem`) — all unit-tested)." → "Pure admin helpers live in `src/admin/lib/` (variant-gen, format, models, `product-filter` (`quickFilter`), `product-form`, `image-normalize` (`contentBounds`, `fitScale`), `reorder` (`moveItem`), `admin-path` — all unit-tested)."

- [ ] **Step 5: Known dead code** — bo'lim oxiridagi "2026-09-16: `src/lib/category-icons.tsx` o'chirildi — …" jumlasidan keyin: " 2b (2026-09-16): eski admin ekranlari `ProductList/ProductForm/CategoryList/CategoryForm/BrandList/BrandForm/ModelList/ModelForm` o'chirildi; `IconAction.tsx` Bannerlar/Yangiliklar/Blog/Sahifalar/Vakansiyalar ro'yxatlarida qoladi (3–5-bosqichlar)."

- [ ] **Step 6: Lint, test, commit**

Run: `bun run lint && bun run test` → PASS.
```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md — 2b: mahsulotlar bo'limi ekranlari kit bilan, product-form/quickFilter yordamchilari

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## O'z-o'zini tekshirish (spec bilan)

- §5 "Mahsulotlar — ro'yxat": qidiruv, tez filtr segmentlari (5 ta), Kategoriya/Brend/Holat select'lari, hammasi URL'da, qator (44px oq ramka rasm · nom + Billz belgisi + tur · kategoriya · narx · qoldiq · faol toggle darhol `PATCH`), qator bosilsa tahrir, qatorda o'chirish yo'q, client'da filtr (`product-filter.ts` + `f`), 20 tadan sahifalash — T2, T6 ✔.
- §5 "Mahsulot — tahrir": sarlavha (nom, «Saytda ko'rish», Saqlash), 8 karta shu tartibda, Billz'da Ma'lumot/Narx/Xususiyatlar faqat o'qish + izohlar, `is_active` sinxron ustun izohi, variantlar faqat qo'lda kiritilgan yangi tovarda (`generateVariants`), `ReviewsEditor`, Xavfli zona faqat qo'lda kiritilganda — T3, T5 ✔. Tavsif va tartib raqami UI oldi (spec 2- va 3-kartalar).
- §5 "Kategoriyalar · Brendlar · Modellar": kategoriya nom uz/ru, tartib, cover, ikonka/izoh yo'q; yo'nalish o'chirilsa turlari ham (API 2a'da, tasdiq matni T7); brend logo eskizi/nom/tovar soni + logo izohi — T4, T8 ✔; modellar kit bilan — T9 ✔.
- §4 forma qoidalari 1–8: Saqlash o'chiq/yoqiq (`dirty`), `beforeunload` (ProductEdit), `errText`, toast matni, yaratishda ro'yxat, toggle darhol (T6), `useConfirm` nomi bilan, `EmptyState`/`Skeleton`, «‹ 3 / 80 ›» (`Pagination`), ruscha ixtiyoriy (`LangPair`) ✔. Segment — `Segmented` (T1).
- §9: `quickFilter` testi `product-filter.test.ts`ga ✔ (T2); `product-form` sof testlari (T3); brauzer 1440/375 har taskda controller.
- 1-bosqich qoldiqlari: `?f=needs_image` (T6) ✔; `danger` kontrasti `text-bg` (T1, spec §4 yozildi) ✔; kit primitivlari (`DataTable`, `confirm`, `EmptyState`, `Badge`, `SwitchRow`, `LangPair`, `Select`, `Textarea`) birinchi haqiqiy ishlatilishi — 2b ekranlari.
- 2a qoldiqlari: brend `sort_order` to'qnashuvi — BrandsList "Tartib" ustuni ko'rsatadi, egasi tahrirda tuzatadi (kod yo'q); "ikki sarlavha" — `TabDef.detail` hamma id-ekranda ✔.
- Tip mosligi: `ApiAdminBrand` (T4) → T5/T6/T8/T9 `listBrands`; `QuickFilter`/`QUICK_FILTERS` (T2) → T6; `ProductFormState`/`EMPTY_FORM`/`detailToForm`/`formToPayload`/`validateForm`/`toggleAxisValue`/`addAxisValue`/`variantLabel`/`STORAGE_VALUES`/`COLOR_VALUES` (T3) → T5; `Segmented`/`Pagination` (T1) → T5/T6/T9; `ImageUploader.accept` (2a) → T8.
- Qoldiq (keyingi bosqichlar): Buyurtmalar (3), Kontent (4), Sozlamalar (5), `IconAction`/`CareersAdmin` tozalash va `docs/egasi-qollanmasi.md` (6).

## Natija va qoldiqlar (bajarilgandan keyin, 2026-09-17)

Bajarildi: `feat/admin-2b` branch'ida 14 commit (`36f0db1..HEAD`), har task alohida review (T6 — bitta fix-round: 1024px'da qidiruv
maydoni siqilardi), yakuniy butun-branch review (fable) → 4 muhim + 9 mayda tuzatish bitta to'lqinda; to'lqinning o'zi bitta
regressiya kiritdi (dirty-guard saqlash/o'chirishdan keyingi o'tishda ham so'rardi) → maqsadli 2-tur (`state.leave`), qayta review
toza. Lint 0, 28 fayl / 310 test. Brauzerda egasi kirgan holda tekshirildi: mahsulotlar ro'yxati (URL filtrlari, `?f=needs_image`,
qatordagi toggle, sahifalash, 1024/375px), tahrir (yangi / Billz / qo'lda kiritilgan, saqlash → qayta yuklash → qaytarish, model
tanlash qulfi, xato toast'i, dirty-guard dialogi), kategoriya/brend/model ro'yxatlari va tahrirlari, brend qidiruvi, brend
yaratish/o'chirish oqimi.

Reja matnidan farqlar (ledger ruling'lari): ro'yxat qidiruv maydoni `w-full sm:w-64` (`flex-1` 1024px'da 53px'ga siqilardi);
yakuniy review tuzatishlari — `pickModel` registrdagi eskirgan kategoriya id'sini mahsulotga ko'chirmaydi; saqlash xatosi toast
bilan ham; `Page.dirty` + `useBlocker` + `useConfirm` (dasturiy o'tish `navigate(…, { state: { leave: true } })` bilan bloklanmaydi —
predicate effect'da ro'yxatga olinadi, sinxron `navigate` hali eski `dirty`ni ko'radi); `BrandsList` qidiruv + son; nom katagi
`max-w-sm` ichki span'da; "Orqaga" ro'yxat filtrini saqlaydi (`location.state.search`); `ModelEdit`/`ModelsList` eskirgan
kategoriya id'sini "(eskirgan)" bilan ko'rsatadi; variant `key` indeks bilan; "Saytda ko'rish" faqat faol mahsulotda; `Chip`
`h-11 md:h-9`; `Segmented` bir xil qiymatda jim; tahrir sarlavhalari `form.name`; `product-form` aylanma testi.

Qoldiqlar:

- **Ma'lumot (egasining qarori kerak):** 117 `device_models` yozuvi 0025'gacha kategoriya id'lari bilan (telefonlar 67 /
  planshetlar 26 / noutbuklar 24). UI qulfi bor (model tanlansa kategoriya qo'lda tanlanadi, Modellar ro'yxatida "(eskirgan)");
  to'g'ri yechim — `0036` migratsiya: Apple brendi → `apple`, noutbuklar → `pc`, boshqa telefon/planshetlar (do'kon sotmaydi) —
  o'chirish yoki `pc`.
- **3-bosqich naqshi:** ro'yxat qidiruvi lokal `useState` + URL'ga debounce bilan yozish (hozir `Input` to'g'ridan-to'g'ri
  `useSearchParams`ga bog'langan — 1 600 qatorda ishlaydi, lekin React transition'dagi boshqariladigan input ogohlantirishi va
  debounce yo'q); bitta kit naqshi `ProductsList`/`ModelsList`/`BrandsList` uchun.
- **Mavjud, 2b regressiyasi emas:** `deriveLegacyCategory('apple')` → `pc` (legacy `category` ustuni; storefront o'qimaydi);
  `setAxisValues` tahrirlangan o'qni oxiriga qo'yadi (mahsulot sahifasida chip bo'limlari tartibi oxirgi tegilgan o'qqa qarab);
  `formatThousands(0)` bo'sh matn; `Segmented`/`Tabs` tugmalari mobilda `h-9`.
- **Hujjat:** `docs/egasi-qollanmasi.md` mahsulot bo'limi (6-bosqich); CLAUDE.md `0027` bandidagi `ProductForm` — tarixiy.
- **Deploy kuni tekshiruv:** `/admin/products?f=needs_image` ro'yxati va qatordagi toggle; Billz tovar tahririda faqat-o'qish
  kartalar; yangi mahsulot (model tanlash → kategoriya qo'lda → tur) va o'chirish; brendlar/kategoriyalar/modellar ro'yxatlari.
