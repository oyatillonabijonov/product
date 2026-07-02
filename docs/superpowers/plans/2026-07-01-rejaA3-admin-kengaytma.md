# Reja A3 — Admin kengaytmasi (kategoriyalar + boyitilgan mahsulot formasi) (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Admin panelga **Kategoriyalar** tabini (CRUD + ikonka yuklash) qo'shish va mahsulot formasini boyitish: kategoriya tanlash, eski narx, tavsif, ko'p rasmli galereya, xususiyatlar muharriri.

**Architecture:** `src/admin/api.ts` A1 endpointlariga (categories CRUD, boyitilgan mahsulot yozish) client funksiyalari qo'shadi. Yangi `CategoryList`/`CategoryForm` komponentlari va boyitilgan `ProductForm`. `AdminApp`ga uchinchi tab.

**Tech Stack:** React 19 + Vite, TypeScript strict, Tailwind v4, bun.

## Global Constraints

- Strict TypeScript, `any` **ishlatilmaydi**. `bun run lint`, `bun run build`, `bun run test` (10/10) toza.
- Paket menejeri: **bun**. Commit formati: `feat:`, `fix:`, `chore:`.
- Admin UI faqat o'zbekcha. Palitra: `#1D1D1F`/`#0071E3`/`#F5F5F7`/`#6E6E73`.
- Rasm yuklash mavjud `uploadImage(file): Promise<{ imageUrl: string }>` (R2) orqali (kategoriya ikonka + galereya).
- **Reja A1 bajarilgan** (admin categories API, boyitilgan mahsulot yozish: `categoryId`, `oldPriceUzs`, `description`, `images[]`, `specs[]`). **Reja A2 bajarilgan** (storefront — ProductForm shu ma'lumotni ko'rsatadi).
- Eski `category` maydoni (iphone/mac/ipad/pc) hamon **majburiy** (A1) — ProductForm uni saqlaydi; yangi `categoryId` (storefront kategoriyasi) alohida.

---

## File Structure

- `src/admin/api.ts` — categories CRUD + boyitilgan product body tiplari (Modify).
- `src/admin/CategoryList.tsx`, `src/admin/CategoryForm.tsx` — yangi (Create).
- `src/admin/AdminApp.tsx` — "Kategoriyalar" tabi (Modify).
- `src/admin/ProductForm.tsx` — categoryId, oldPrice, description, galereya, specs (Modify).

---

### Task 1: Admin API client kengaytmasi

**Files:**
- Modify: `src/admin/api.ts`

**Interfaces:**
- Consumes: `ApiCategory`, `ApiProduct`, `ApiSpec` (`shared/types`).
- Produces:
  - `listCategories(): Promise<ApiCategory[]>`, `createCategory(c): Promise<ApiCategory>`, `updateCategory(id, c): Promise<ApiCategory>`, `deleteCategory(id): Promise<void>`.
  - `AdminProductInput` tipi (`Partial<ApiProduct> & { images?: string[]; specs?: ApiSpec[] }`) — `createProduct`/`updateProduct` shu tipni qabul qiladi.
  - `getProductDetail(id): Promise<AdminProductDetail>` (`ApiProduct & { description: string | null; images: string[]; specs: ApiSpec[] }`) — tahrirlashda galereya/specs'ni yuklash uchun.

- [x] **Step 1: Categories client funksiyalarini qo'shish**

`src/admin/api.ts` importiga `ApiCategory`, `ApiSpec` qo'shing va fayl oxiriga:
```ts
export async function listCategories(): Promise<ApiCategory[]> {
  return handle(await fetch('/api/admin/categories'));
}

export async function createCategory(c: Partial<ApiCategory>): Promise<ApiCategory> {
  return handle(
    await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(c),
    }),
  );
}

export async function updateCategory(id: string, c: Partial<ApiCategory>): Promise<ApiCategory> {
  return handle(
    await fetch(`/api/admin/categories/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(c),
    }),
  );
}

export async function deleteCategory(id: string): Promise<void> {
  await handle(await fetch(`/api/admin/categories/${encodeURIComponent(id)}`, { method: 'DELETE' }));
}
```

- [x] **Step 2: Boyitilgan product tiplarini qo'shish va create/update imzosini yangilash**

`src/admin/api.ts` da (mavjud `createProduct`/`updateProduct` o'rniga) quyidagini qo'ying:
```ts
export interface AdminProductInput extends Partial<ApiProduct> {
  images?: string[];
  specs?: ApiSpec[];
  description?: string | null;
}

export interface AdminProductDetail extends ApiProduct {
  description: string | null;
  images: string[];
  specs: ApiSpec[];
}

export async function createProduct(p: AdminProductInput): Promise<ApiProduct> {
  return handle(
    await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(p),
    }),
  );
}

export async function updateProduct(id: string, p: AdminProductInput): Promise<ApiProduct> {
  return handle(
    await fetch(`/api/admin/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(p),
    }),
  );
}

export async function getProductDetail(id: string): Promise<AdminProductDetail> {
  return handle(await fetch(`/api/products/${encodeURIComponent(id)}`));
}
```
> Eski `createProduct(p: Partial<ApiProduct>)`/`updateProduct` imzolari shu bilan almashtiriladi (kengaytirilgan tip mavjud chaqiruvlarga mos, chunki barcha yangi maydonlar ixtiyoriy).

- [x] **Step 3: Lint va commit**

```bash
bun run lint && bun run test
git add src/admin/api.ts
git commit -m "feat: admin api client for categories and enriched products"
```

---

### Task 2: Kategoriyalar tabi (CategoryList + CategoryForm)

**Files:**
- Create: `src/admin/CategoryForm.tsx`, `src/admin/CategoryList.tsx`
- Modify: `src/admin/AdminApp.tsx`

**Interfaces:**
- Consumes: `listCategories`, `createCategory`, `updateCategory`, `deleteCategory`, `uploadImage`, `ApiCategory`.
- Produces: `AdminApp`da "Kategoriyalar" tabi.

- [x] **Step 1: CategoryForm'ni yozish**

Create `src/admin/CategoryForm.tsx`:
```tsx
import { useState } from 'react';
import type { ApiCategory } from '../../shared/types';
import { createCategory, updateCategory, uploadImage } from './api';

export default function CategoryForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial: ApiCategory | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [iconUrl, setIconUrl] = useState(initial?.iconUrl ?? '');
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const { imageUrl } = await uploadImage(file);
      setIconUrl(imageUrl);
    } catch {
      setError('Rasm yuklanmadi');
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setError('');
    try {
      const payload = { name, iconUrl, sortOrder };
      if (initial) await updateCategory(initial.id, payload);
      else await createCategory(payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'xatolik');
    } finally {
      setBusy(false);
    }
  }

  const input = 'w-full border border-[#D2D2D7] rounded-xl px-3 py-2 focus:outline-none focus:border-[#0071E3]';
  return (
    <div className="bg-white rounded-[20px] p-6 mb-6 shadow-[--shadow-apple] max-w-lg">
      <h3 className="font-semibold mb-4">{initial ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}</h3>
      <label className="block text-[13px] text-[#6E6E73] mb-3">Nomi
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="block text-[13px] text-[#6E6E73] mb-3">Tartib raqami
        <input type="number" className={input} value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
      </label>
      <div className="flex items-center gap-4 mb-4">
        {iconUrl ? <img src={iconUrl} alt="" className="w-14 h-14 rounded-full object-cover bg-[#F5F5F7]" /> : <div className="w-14 h-14 rounded-full bg-[#F5F5F7]" />}
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onFile} />
      </div>
      {error && <p className="text-[13px] text-[#E30000] mb-3">{error}</p>}
      <div className="flex gap-3">
        <button onClick={save} disabled={busy} className="px-6 py-2.5 bg-[#0071E3] text-white font-semibold rounded-full disabled:opacity-60">{busy ? 'Saqlanmoqda…' : 'Saqlash'}</button>
        <button onClick={onCancel} className="px-6 py-2.5 text-[#6E6E73] font-semibold rounded-full">Bekor qilish</button>
      </div>
    </div>
  );
}
```

- [x] **Step 2: CategoryList'ni yozish**

Create `src/admin/CategoryList.tsx`:
```tsx
import { useEffect, useState } from 'react';
import type { ApiCategory } from '../../shared/types';
import { deleteCategory, listCategories } from './api';
import CategoryForm from './CategoryForm';

export default function CategoryList() {
  const [items, setItems] = useState<ApiCategory[]>([]);
  const [editing, setEditing] = useState<ApiCategory | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    setItems(await listCategories());
    setLoading(false);
    setEditing(null);
    setCreating(false);
  }
  useEffect(() => { refresh(); }, []);

  async function remove(c: ApiCategory) {
    if (!window.confirm(`"${c.name}" o'chirilsinmi? (mahsulotlar kategoriyasiz qoladi)`)) return;
    await deleteCategory(c.id);
    refresh();
  }

  if (loading) return <p className="text-[#6E6E73]">Yuklanmoqda…</p>;
  return (
    <div>
      {creating && <CategoryForm initial={null} onSaved={refresh} onCancel={() => setCreating(false)} />}
      {editing && <CategoryForm key={editing.id} initial={editing} onSaved={refresh} onCancel={() => setEditing(null)} />}
      {!creating && !editing && (
        <button onClick={() => setCreating(true)} className="mb-4 px-5 py-2.5 bg-[#1D1D1F] text-white font-semibold rounded-full">+ Yangi kategoriya</button>
      )}
      <div className="space-y-2">
        {items.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-[--shadow-apple]">
            {c.iconUrl ? <img src={c.iconUrl} alt="" className="w-10 h-10 rounded-full object-cover bg-[#F5F5F7]" /> : <div className="w-10 h-10 rounded-full bg-[#F5F5F7]" />}
            <div className="flex-1 font-semibold">{c.name}</div>
            <button onClick={() => setEditing(c)} className="text-[13px] text-[#0071E3] font-semibold px-2">Tahrir</button>
            <button onClick={() => remove(c)} className="text-[13px] text-[#E30000] px-2">O'chir</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [x] **Step 3: AdminApp'ga tab qo'shish**

`src/admin/AdminApp.tsx`da `type Tab`ni `'products' | 'settings' | 'categories'` ga kengaytiring, `CategoryList`ni import qiling, header'ga uchinchi tugma ("Kategoriyalar") qo'shing va `<main>` ichida shart qo'shing:
```tsx
// import:
import CategoryList from './CategoryList';
// type:
type Tab = 'products' | 'settings' | 'categories';
// header tugmasi (Sozlamalar tugmasidan keyin):
<button onClick={() => setTab('categories')} className={`px-4 py-2 rounded-full text-[14px] font-semibold ${tab === 'categories' ? 'bg-[#0071E3] text-white' : 'text-[#1D1D1F]'}`}>Kategoriyalar</button>
// main render:
{tab === 'products' ? <ProductList /> : tab === 'settings' ? <SettingsForm /> : <CategoryList />}
```

- [x] **Step 4: Lint, build, commit**

```bash
bun run lint && bun run build && bun run test
git add src/admin/CategoryForm.tsx src/admin/CategoryList.tsx src/admin/AdminApp.tsx
git commit -m "feat: admin categories tab (crud + icon upload)"
```

---

### Task 3: Boyitilgan ProductForm (kategoriya, eski narx, tavsif, galereya, specs)

**Files:**
- Modify: `src/admin/ProductForm.tsx`

**Interfaces:**
- Consumes: `AdminProductInput`, `AdminProductDetail`, `getProductDetail`, `createProduct`, `updateProduct`, `uploadImage`, `listCategories`, `ApiCategory`, `ApiSpec`.
- Produces: mahsulot formasi kategoriya select, eski narx, tavsif, ko'p rasmli galereya, specs muharriri bilan.

- [x] **Step 1: ProductForm'ni to'liq almashtirish**

`src/admin/ProductForm.tsx` faylini to'liq quyidagiga almashtiring:
```tsx
import { useEffect, useState } from 'react';
import type { ApiCategory, ApiProduct, ApiSpec, Category, Condition } from '../../shared/types';
import { createProduct, getProductDetail, listCategories, updateProduct, uploadImage } from './api';

const CATEGORIES: Category[] = ['iphone', 'mac', 'ipad', 'pc'];
const CONDITIONS: Condition[] = ['yangi', 'ishlatilgan'];

interface FormState {
  name: string;
  category: Category;
  categoryId: string | null;
  condition: Condition;
  conditionNote: string;
  cashPriceUzs: number;
  oldPriceUzs: number;
  description: string;
  imageUrl: string;
  images: string[];
  specs: ApiSpec[];
  sortOrder: number;
  isActive: boolean;
}

const empty: FormState = {
  name: '', category: 'iphone', categoryId: null, condition: 'yangi', conditionNote: '',
  cashPriceUzs: 0, oldPriceUzs: 0, description: '', imageUrl: '', images: [], specs: [], sortOrder: 0, isActive: true,
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
  const [form, setForm] = useState<FormState>(empty);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { listCategories().then(setCategories); }, []);

  useEffect(() => {
    if (!initial) { setForm(empty); return; }
    getProductDetail(initial.id).then((d) => {
      const gallery = d.images.filter((u) => u !== d.imageUrl);
      setForm({
        name: d.name, category: d.category, categoryId: d.categoryId, condition: d.condition,
        conditionNote: d.conditionNote ?? '', cashPriceUzs: d.cashPriceUzs, oldPriceUzs: d.oldPriceUzs ?? 0,
        description: d.description ?? '', imageUrl: d.imageUrl, images: gallery, specs: d.specs,
        sortOrder: d.sortOrder, isActive: d.isActive,
      });
    });
  }, [initial]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function uploadMain(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try { const { imageUrl } = await uploadImage(file); set('imageUrl', imageUrl); }
    catch { setError('Rasm yuklanmadi'); } finally { setBusy(false); }
  }

  async function uploadGallery(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try { const { imageUrl } = await uploadImage(file); set('images', [...form.images, imageUrl]); }
    catch { setError('Rasm yuklanmadi'); } finally { setBusy(false); }
  }

  async function save() {
    setBusy(true);
    setError('');
    try {
      const payload = {
        name: form.name, category: form.category, categoryId: form.categoryId, condition: form.condition,
        conditionNote: form.conditionNote || null, cashPriceUzs: form.cashPriceUzs,
        oldPriceUzs: form.oldPriceUzs > 0 ? form.oldPriceUzs : null, description: form.description || null,
        imageUrl: form.imageUrl, images: form.images, specs: form.specs, sortOrder: form.sortOrder, isActive: form.isActive,
      };
      if (initial) await updateProduct(initial.id, payload);
      else await createProduct(payload);
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
        <label className="text-[13px] text-[#6E6E73]">Nomi
          <input className={input} value={form.name} onChange={(e) => set('name', e.target.value)} />
        </label>
        <label className="text-[13px] text-[#6E6E73]">Naqd narx (so'm)
          <input type="number" className={input} value={form.cashPriceUzs} onChange={(e) => set('cashPriceUzs', Number(e.target.value))} />
        </label>
        <label className="text-[13px] text-[#6E6E73]">Eski narx (chegirma uchun, ixtiyoriy)
          <input type="number" className={input} value={form.oldPriceUzs} onChange={(e) => set('oldPriceUzs', Number(e.target.value))} />
        </label>
        <label className="text-[13px] text-[#6E6E73]">Kategoriya (storefront)
          <select className={input} value={form.categoryId ?? ''} onChange={(e) => set('categoryId', e.target.value || null)}>
            <option value="">— tanlang —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="text-[13px] text-[#6E6E73]">Tur (eski)
          <select className={input} value={form.category} onChange={(e) => set('category', e.target.value as Category)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-[13px] text-[#6E6E73]">Holati
          <select className={input} value={form.condition} onChange={(e) => set('condition', e.target.value as Condition)}>
            {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-[13px] text-[#6E6E73]">Holat izohi (ixtiyoriy)
          <input className={input} value={form.conditionNote} onChange={(e) => set('conditionNote', e.target.value)} />
        </label>
        <label className="text-[13px] text-[#6E6E73]">Tartib raqami
          <input type="number" className={input} value={form.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value))} />
        </label>
      </div>

      <label className="block text-[13px] text-[#6E6E73] mt-3">Tavsif
        <textarea className={`${input} min-h-[90px]`} value={form.description} onChange={(e) => set('description', e.target.value)} />
      </label>

      <div className="mt-4">
        <div className="text-[13px] text-[#6E6E73] mb-2">Asosiy rasm</div>
        <div className="flex items-center gap-4">
          {form.imageUrl ? <img src={form.imageUrl} alt="" className="w-16 h-16 object-contain rounded-lg bg-[#F5F5F7]" /> : <div className="w-16 h-16 rounded-lg bg-[#F5F5F7]" />}
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadMain} />
        </div>
      </div>

      <div className="mt-4">
        <div className="text-[13px] text-[#6E6E73] mb-2">Galereya (qo'shimcha rasmlar)</div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {form.images.map((img, i) => (
            <div key={i} className="relative">
              <img src={img} alt="" className="w-14 h-14 object-contain rounded-lg bg-[#F5F5F7]" />
              <button onClick={() => set('images', form.images.filter((_, j) => j !== i))} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#E30000] text-white text-[11px]">×</button>
            </div>
          ))}
        </div>
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadGallery} />
      </div>

      <div className="mt-4">
        <div className="text-[13px] text-[#6E6E73] mb-2">Xususiyatlar</div>
        <div className="space-y-2">
          {form.specs.map((s, i) => (
            <div key={i} className="flex gap-2">
              <input placeholder="Nomi (Xotira)" className={input} value={s.label} onChange={(e) => set('specs', form.specs.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
              <input placeholder="Qiymati (256GB)" className={input} value={s.value} onChange={(e) => set('specs', form.specs.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} />
              <button onClick={() => set('specs', form.specs.filter((_, j) => j !== i))} className="text-[#E30000] px-2">×</button>
            </div>
          ))}
        </div>
        <button onClick={() => set('specs', [...form.specs, { label: '', value: '' }])} className="text-[13px] text-[#0071E3] font-semibold mt-2">+ xususiyat qo'shish</button>
      </div>

      <label className="mt-4 flex items-center gap-2 text-[14px]">
        <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
        Saytda ko'rsatilsin
      </label>

      {error && <p className="text-[13px] text-[#E30000] mt-3">{error}</p>}

      <div className="flex gap-3 mt-5">
        <button onClick={save} disabled={busy} className="px-6 py-2.5 bg-[#0071E3] text-white font-semibold rounded-full disabled:opacity-60">{busy ? 'Saqlanmoqda…' : 'Saqlash'}</button>
        <button onClick={onCancel} className="px-6 py-2.5 text-[#6E6E73] font-semibold rounded-full">Bekor qilish</button>
      </div>
    </div>
  );
}
```
> Eslatma: `specs` bo'sh label/value bilan yuborilsa A1 `parseProductInput` `label_required`/`value_required` bilan 400 beradi — admin bo'sh qatorlarni to'ldirishi yoki o'chirishi kerak. (Ixtiyoriy yaxshilash: saqlashdan oldin bo'sh specs'ni filtrlash — `form.specs.filter(s => s.label && s.value)`.)

- [x] **Step 2: Bo'sh specs'ni saqlashdan oldin filtrlash**

`save()` ichidagi `payload` da `specs: form.specs` o'rniga:
```ts
        specs: form.specs.filter((s) => s.label.trim() !== '' && s.value.trim() !== ''),
```

- [x] **Step 3: Lint, build, test**

Run:
```bash
bun run lint && bun run build && bun run test
```
Expected: xatosiz; 10/10.

- [x] **Step 4: Commit**

```bash
git add src/admin/ProductForm.tsx
git commit -m "feat: enriched product form (category, discount, gallery, specs, description)"
```

---

## Self-Review

**Spec coverage (Storefront A spec §6):** Admin API client (§6) — Task 1. Kategoriyalar tabi CRUD + ikonka (§6) — Task 2. Boyitilgan mahsulot formasi: kategoriya, eski narx, tavsif, galereya, specs (§6) — Task 3. Backend endpointlar — A1'da.

**Placeholder scan:** TODO/TBD yo'q; barcha komponent kodi to'liq.

**Type consistency:** `AdminProductInput`/`AdminProductDetail` (`api.ts`) ↔ A1 `parseProductInput` maydonlari (categoryId, oldPriceUzs, description, images, specs) mos. `getProductDetail` A1 `/api/products/:id` (`ApiProductDetail`) qaytaradi. `CategoryForm`/`CategoryList` `ApiCategory` bilan. `FormState` barcha maydonlarni strict tiplaydi (no any). `ProductForm` `key={editing.id}` (Reja 3 tuzatilgan xatoga qaramaslik uchun — ProductList allaqachon key beradi).

**Eslatma (tracked debt):** Eski `category` (iphone/mac/ipad/pc) va yangi `categoryId` (storefront) ikkalasi ham formada — A1 `category`ni majburiy saqlagani uchun. Kelajakda `category` olib tashlanib, faqat `categoryId` qoladi (alohida migratsiya + validate o'zgarishi).
