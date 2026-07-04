# Admin rasm yuklash — UI/UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin ProductForm rasm bo'limini yaxshilash — ko'p faylni birdan yuklash, drag & drop, yuklanish progress, galereyani sudrab tartiblash — bitta qayta ishlatiladigan `ImageUploader` komponenti orqali.

**Architecture:** Yangi `ImageUploader` (`FC`) `string[]` + `onChange` bilan ishlaydi; ProductForm'da ikki marta (asosiy rasm: `multiple=false`; galereya: `multiple`+`reorderable`). Native HTML5 drag-and-drop (kutubxonasiz). Tartib mavjud `product_images.sort_order` orqali storefront'ga oqadi — ma'lumot modeli, server, storefront o'zgarmaydi.

**Tech Stack:** React (no `@types/react`, ambient shim), TypeScript strict, Tailwind v4, `@phosphor-icons/react` (admin), `normalizeImage` (mavjud), vitest (`node`).

## Global Constraints

- Strict TypeScript, **`any` taqiqlanadi**. `@types/react` yo'q — event handlerlar ambient `React.*` tiplar bilan annotatsiyalanadi (`src/admin/react-events.d.ts`). `key` oladigan komponentlar `FC<{...}>` uslubida.
- **bun** (`bun run lint`, `bunx vitest run`), npm emas.
- Admin ikonlari: **`@phosphor-icons/react`** (storefront lucide, admin phosphor).
- Hex rang komponentlarda taqiq — mavjud `--color-*` utility'lar (`bg-bg`, `text-muted`, `border-line`, `bg-accent-soft`, `text-accent`, `bg-danger`, `text-danger`). Tailwind v4: `shadow-[--var]` yo'q.
- Server (`api.admin.upload.tsx`, `functions/lib/db.ts`), `src/admin/api.ts`, `image-normalize.ts`, storefront `Gallery` **o'zgarmaydi**.
- **Commit qilma** foydalanuvchi tasdig'isiz. Har task oxiridagi commit qadamini bajarishdan oldin tasdiq so'ra.

---

### Task 1: `moveItem` — massiv elementini ko'chiruvchi sof funksiya

**Files:**
- Create: `src/admin/lib/reorder.ts`
- Test: `src/admin/lib/reorder.test.ts`

**Interfaces:**
- Produces: `function moveItem<T>(arr: T[], from: number, to: number): T[]` — yangi massiv qaytaradi (immutable); `from`/`to` chegaradan tashqari yoki `from === to` bo'lsa — o'zgarmagan **nusxa**.

- [ ] **Step 1: Write the failing test**

`src/admin/lib/reorder.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { moveItem } from './reorder';

describe('moveItem', () => {
  it('elementni oldinga ko\'chiradi', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('elementni orqaga ko\'chiradi', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('from === to bo\'lsa o\'zgarmaydi, lekin yangi massiv qaytaradi', () => {
    const arr = ['a', 'b', 'c'];
    const out = moveItem(arr, 1, 1);
    expect(out).toEqual(['a', 'b', 'c']);
    expect(out).not.toBe(arr);
  });

  it('chegaradan tashqari indeks → xavfsiz no-op nusxa', () => {
    const arr = ['a', 'b', 'c'];
    expect(moveItem(arr, -1, 1)).toEqual(['a', 'b', 'c']);
    expect(moveItem(arr, 1, 5)).toEqual(['a', 'b', 'c']);
    expect(moveItem(arr, 5, 0)).toEqual(['a', 'b', 'c']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/admin/lib/reorder.test.ts`
Expected: FAIL — `moveItem` / module not found.

- [ ] **Step 3: Write minimal implementation**

`src/admin/lib/reorder.ts`:

```ts
/**
 * Massivning `from` indeksidagi elementni `to` indeksiga ko'chiradi.
 * Immutable — har doim yangi massiv qaytaradi. Chegaradan tashqari indeks
 * yoki `from === to` bo'lsa o'zgarmagan nusxa qaytaradi.
 */
export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const copy = arr.slice();
  if (
    from === to ||
    from < 0 || from >= arr.length ||
    to < 0 || to >= arr.length
  ) {
    return copy;
  }
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run src/admin/lib/reorder.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Lint**

Run: `bun run lint`
Expected: no errors.

- [ ] **Step 6: Commit** (foydalanuvchi tasdig'idan keyin)

```bash
git add src/admin/lib/reorder.ts src/admin/lib/reorder.test.ts
git commit -m "feat: moveItem — massiv tartiblash sof funksiyasi"
```

---

### Task 2: `ImageUploader` komponent + ProductForm'ga ulash

**Files:**
- Modify: `src/admin/react-events.d.ts` (ambient `DragEvent` qo'shish)
- Create: `src/admin/ImageUploader.tsx`
- Modify: `src/admin/ProductForm.tsx` (importlar; `uploadMain`/`uploadGallery` olib tashlash; rasm JSX bloklarini almashtirish)

**Interfaces:**
- Consumes: `moveItem` (Task 1); `uploadImage` (`src/admin/api.ts`); `normalizeImage` (`src/admin/lib/image-normalize.ts`).
- Produces: default-eksport `ImageUploader` — props `{ label: string; images: string[]; onChange: (next: string[]) => void; multiple?: boolean; reorderable?: boolean }`.

- [ ] **Step 1: Ambient `DragEvent` qo'shish**

`src/admin/react-events.d.ts` — `declare namespace React {` ichiga, `ChangeEvent` qatoridan keyin qo'shish:

```ts
  interface DragEvent<T = Element> extends SyntheticEvent<T> {
    readonly dataTransfer: DataTransfer;
  }
```

(`DataTransfer` — lib.dom standart tipi: `.files: FileList`, `.setData`, `.getData`.)

- [ ] **Step 2: `ImageUploader` komponentini yaratish**

`src/admin/ImageUploader.tsx` (to'liq):

```tsx
import { useState } from 'react';
import type { FC } from 'react';
import { UploadSimple, X } from '@phosphor-icons/react';
import { uploadImage } from './api';
import { normalizeImage } from './lib/image-normalize';
import { moveItem } from './lib/reorder';

const ImageUploader: FC<{
  label: string;
  images: string[];
  onChange: (next: string[]) => void;
  multiple?: boolean;
  reorderable?: boolean;
}> = ({ label, images, onChange, multiple = false, reorderable = false }) => {
  const [uploading, setUploading] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    let files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    if (!multiple) files = files.slice(0, 1);
    setError('');
    setUploading((n) => n + files.length);
    const results = await Promise.all(
      files.map(async (file) => {
        try {
          const { imageUrl } = await uploadImage(await normalizeImage(file));
          return imageUrl;
        } catch {
          setError('Rasm yuklanmadi');
          return null;
        } finally {
          setUploading((n) => n - 1);
        }
      }),
    );
    const urls = results.filter((u): u is string => u !== null);
    if (urls.length) onChange(multiple ? [...images, ...urls] : [urls[0]]);
  }

  function onZoneDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  function onTileDrop(e: React.DragEvent, to: number) {
    const raw = e.dataTransfer.getData('text/plain');
    if (raw === '') return; // OS-fayl drop'i, tartiblash emas — e'tiborsiz
    e.preventDefault();
    onChange(moveItem(images, Number(raw), to));
  }

  return (
    <div>
      <div className="text-[13px] text-muted mb-2">{label}</div>

      {(images.length > 0 || uploading > 0) && (
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {images.map((img, i) => (
            <div
              key={img + i}
              draggable={reorderable}
              onDragStart={(e: React.DragEvent) => e.dataTransfer.setData('text/plain', String(i))}
              onDragOver={(e: React.DragEvent) => { if (reorderable) e.preventDefault(); }}
              onDrop={(e: React.DragEvent) => { if (reorderable) onTileDrop(e, i); }}
              className={`relative w-16 h-16 rounded-xl overflow-hidden bg-bg group ${reorderable ? 'cursor-move' : ''}`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(images.filter((_, j) => j !== i))}
                aria-label="Rasmni o'chirish"
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-danger text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} weight="bold" />
              </button>
            </div>
          ))}
          {Array.from({ length: uploading }).map((_, i) => (
            <div key={`u${i}`} className="w-16 h-16 rounded-xl bg-bg animate-pulse" />
          ))}
        </div>
      )}

      <label
        onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onZoneDrop}
        className={`flex flex-col items-center justify-center gap-1 py-5 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${dragOver ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted'}`}
      >
        <UploadSimple size={20} />
        <span className="text-[13px]">Rasm tashlang yoki tanlang</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple={multiple}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => { handleFiles(e.target.files); e.target.value = ''; }}
          className="hidden"
        />
      </label>

      {error ? <div className="text-[12px] text-danger mt-1">{error}</div> : null}
    </div>
  );
};

export default ImageUploader;
```

- [ ] **Step 3: ProductForm importlarini yangilash**

`src/admin/ProductForm.tsx` — 5-qatordagi importdan `uploadImage` ni olib tashlash:

```ts
import { createProduct, getProductDetail, listBrands, listCategories, listDeviceModels, updateProduct } from './api';
```

11-qatordagi `import { normalizeImage } from './lib/image-normalize';` **butunlay o'chirish** (endi ImageUploader ichida ishlatiladi).

VariantEditor importidan keyin `ImageUploader` importini qo'shish:

```ts
import ImageUploader from './ImageUploader';
```

- [ ] **Step 4: `uploadMain` va `uploadGallery` funksiyalarini olib tashlash**

`src/admin/ProductForm.tsx` — quyidagi ikki funksiyani (va ular orasidagi bo'sh qatorlarni) butunlay o'chirish:

```ts
  async function uploadMain(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try { const { imageUrl } = await uploadImage(await normalizeImage(file)); set('imageUrl', imageUrl); }
    catch { setError('Rasm yuklanmadi'); } finally { setBusy(false); }
  }

  async function uploadGallery(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try { const { imageUrl } = await uploadImage(await normalizeImage(file)); set('images', [...form.images, imageUrl]); }
    catch { setError('Rasm yuklanmadi'); } finally { setBusy(false); }
  }
```

(`setBusy`/`setError`/`set` boshqa joyda ishlatiladi — ularni qoldiring, faqat bu ikki funksiyani o'chiring.)

- [ ] **Step 5: Rasm JSX bloklarini `ImageUploader` bilan almashtirish**

`src/admin/ProductForm.tsx` — "Asosiy rasm" va "Galereya" bloklarini (hozirgi ikkita `<div className="mt-4">…</div>` — biri `Asosiy rasm`, biri `Galereya (qo'shimcha rasmlar)`) quyidagi bilan almashtirish:

```tsx
      <div className="mt-4">
        <ImageUploader
          label="Asosiy rasm"
          images={form.imageUrl ? [form.imageUrl] : []}
          onChange={(next) => set('imageUrl', next[0] ?? '')}
        />
      </div>

      <div className="mt-4">
        <ImageUploader
          label="Galereya (qo'shimcha rasmlar)"
          images={form.images}
          onChange={(next) => set('images', next)}
          multiple
          reorderable
        />
      </div>
```

- [ ] **Step 6: Lint**

Run: `bun run lint`
Expected: no errors. (Agar `uploadImage`/`normalizeImage` "unused" xatosi chiqsa — 3-qadamdagi importlar to'liq olib tashlanganini tekshiring.)

- [ ] **Step 7: Manual verify**

Run: `bun run dev` → `/admin` → mahsulot tahrirla:
- Galereyaga bir tanlashda **bir nechta** rasm yukla → skeletonlar → thumbnaillar (`object-cover`).
- Fayl(lar)ni drop zonaga **sudrab tashla** → yuklanadi.
- Galereya thumbnaillarini **sudrab qayta tartibla** → tartib o'zgaradi.
- `×` bilan o'chir.
- Asosiy rasm: bitta rasm, yangi tanlash almashtiradi.
- Saqla → qayta ochib tartib/rasm saqlanganini tekshir.

- [ ] **Step 8: Commit** (foydalanuvchi tasdig'idan keyin)

```bash
git add src/admin/react-events.d.ts src/admin/ImageUploader.tsx src/admin/ProductForm.tsx
git commit -m "feat: admin rasm yuklash — drag&drop, ko'p fayl, progress, tartiblash"
```

---

## Self-Review

**Spec coverage:**
- Ko'p faylni birdan tanlash → Task 2, `handleFiles` + `<input multiple>`. ✅
- Drag & drop → Task 2, `onZoneDrop` + label drop zona. ✅
- Progress → Task 2, `uploading` + skeleton plitkalar. ✅
- Galereyani sudrab tartiblash → Task 2 tile DnD + Task 1 `moveItem`; storefront `sort_order` orqali. ✅
- Alohida "Asosiy rasm" + "Galereya", bir komponentdan → Task 2 Step 5 (ikki `ImageUploader`). ✅
- `object-cover` thumbnaillar (saytdagidek) → Task 2 komponent `<img className="w-full h-full object-cover">`. ✅
- Xato: per-fayl try/catch, lokal xato holati, `'Rasm yuklanmadi'` → `handleFiles` catch + lokal `error`. ✅
- Server/model/storefront o'zgarmaydi → hech bir task ularga tegmaydi. ✅
- `moveItem` sof + testlar → Task 1. ✅

**Placeholder scan:** har kod qadamida to'liq kod bor; "TODO"/"appropriate" yo'q. ✅

**Type consistency:** `moveItem<T>(arr, from, to): T[]` Task 1↔2 mos; `ImageUploader` props Step 2↔5 mos (`label/images/onChange/multiple/reorderable`); `React.DragEvent` (Step 1) komponentdagi handlerlarда ishlatiladi (Step 2). ✅

**Ambiguity:** asosiy rasm `multiple`/`reorderable` berilmagan → standart `false` (Step 5). Drop zona doim ko'rinadi (asosiy rasmni almashtirish uchun ham). ✅
