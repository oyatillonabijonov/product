# Admin rasm yuklash — UI/UX qayta ishlash — Design

**Sana:** 2026-07-04
**Holat:** Tasdiqlangan (design), implementatsiya rejasi keyingi qadam

## Muammo

Admin ProductForm'da rasm qo'shish qismi juda oddiy: yalang'och `<input type="file">`, galereyaga rasm **bittalab** yuklanadi, progress yo'q, tartiblash yo'q, thumbnaillar `object-contain` (saytdan farqli). Zamonaviy do'kon admin'iga mos emas.

## Maqsad

Rasm bo'limini UI/UX jihatdan yaxshilash: ko'p faylni birdan yuklash, drag & drop, yuklanish holati (progress), galereyani sudrab tartiblash. Storefront'da bu allaqachon ko'rinadi (`Gallery` `product_images` ni `sort_order` bo'yicha render qiladi) — ma'lumot modeli o'zgarmaydi.

## Qarorlar (foydalanuvchi tasdig'i bilan)

- **Struktura:** hozirgi ikki alohida bo'lim — **"Asosiy rasm"** (cover, bitta) va **"Galereya"** (qo'shimcha, ko'p) — saqlanadi; faqat UI yaxshilanadi. (Yagona "menejer" varianti rad etildi.)
- **Imkoniyatlar:** (1) ko'p faylni birdan tanlash, (2) drag & drop, (3) yuklanish progress, (4) galereyani sudrab tartiblash — to'rttasi ham.
- **Kutubxonasiz:** native HTML5 drag-and-drop (bepul tarif, yangi dependency yo'q).

## Arxitektura

Yangi komponent **`src/admin/ImageUploader.tsx`** (`FC`) — asosiy rasm va galereya uchun bir xil ishlaydi (DRY):

```
Props:
  label: string
  images: string[]
  onChange: (next: string[]) => void
  multiple?: boolean      // galereya: true, asosiy: false (max 1 fayl)
  reorderable?: boolean   // galereya: true, asosiy: false
```

ProductForm'da ikki marta:
- **Asosiy rasm:** `images={form.imageUrl ? [form.imageUrl] : []}`, `onChange={(next) => set('imageUrl', next[0] ?? '')}`, `multiple={false}`, `reorderable={false}`.
- **Galereya:** `images={form.images}`, `onChange={(next) => set('images', next)}`, `multiple`, `reorderable`.

`imageUrl: string` / `images: string[]` FormState maydonlari, server, `db.ts`, storefront **o'zgarmaydi** — faqat admin UI qatlami.

## Komponent xatti-harakati

1. **Drop zona + tanlash** — punktir chegarali soha. `onDragOver` (preventDefault + faol holat), `onDrop` fayllarni oladi; yoki bosib yashirin `<input type="file" accept="image/png,image/jpeg,image/webp" multiple>` ochiladi. Ikkalasidan `File[]` yig'iladi; `multiple={false}` bo'lsa faqat birinchi fayl.
2. **Yuklash** — har fayl: `normalizeImage(file)` → `uploadImage(...)`. Tartib saqlanishi uchun `Promise.all` + indeks bo'yicha yig'iladi; yangi URL'lar mavjud `images` oxiriga qo'shiladi (`multiple={false}` bo'lsa almashtiradi) va `onChange` ga beriladi.
3. **Progress** — lokal `uploading: number` (jarayondagi fayllar soni). Grid oxirida shuncha skeleton plitka (`animate-pulse bg-bg`); tugagach real thumbnail chiqadi.
4. **Thumbnaillar** — `aspect-square object-cover rounded-xl` (saytdagidek). Hover'da `×` (yoki Trash) o'chirish tugmasi → `onChange(images.filter(...))`.
5. **Reorder** (faqat `reorderable`) — plitkalar `draggable`; `onDragStart` boshlang'ich indeksni saqlaydi, boshqa plitka `onDrop` da `moveItem(images, from, to)` → `onChange`. Storefront `sort_order` orqali shu tartibni oladi.
6. **Xatolik** — per-fayl `try/catch`; biri yiqilsa qolganlari davom etadi. Komponent **o'z lokal xato holatini** (`useState`) ko'rsatadi (`'Rasm yuklanmadi'` (mavjud konvensiya — `uploadImage` maxsus kod qaytarmaydi) matni bilan) — ProductForm'ning global `error` holatiga tegmaydi. Yangi muvaffaqiyatli yuklashда xato tozalanadi.

## Fayl tuzilishi

- **Create** `src/admin/lib/reorder.ts` — `moveItem<T>(arr: T[], from: number, to: number): T[]` (sof, immutable; chegaradan tashqari yoki `from===to` → o'zgarmagan nusxa).
- **Create** `src/admin/lib/reorder.test.ts` — unit-testlar (o'rtaga, chetga, chegara/no-op, from===to).
- **Create** `src/admin/ImageUploader.tsx` — `FC` komponent (drop, multi-upload, progress, reorder, remove).
- **Modify** `src/admin/ProductForm.tsx` — "Asosiy rasm" + "Galereya" JSX bloklarini (`~225-244`) `<ImageUploader .../>` bilan almashtirish; keraksiz bo'lgan `uploadMain`/`uploadGallery` funksiyalarini (`~107-121`) olib tashlash.

**O'zgarmaydi:** `api.ts` (`uploadImage`), `src/admin/lib/image-normalize.ts`, server (`api.admin.upload.tsx`, `functions/lib/db.ts`), storefront `Gallery`/`ProductPage`.

## Xato boshqaruvi

- Yuklash: per-fayl `try/catch`; qisman muvaffaqiyat mumkin; xato matni `'Rasm yuklanmadi'` (mavjud konvensiya — `uploadImage` maxsus kod qaytarmaydi).
- Drop: `dataTransfer.files` dan faqat `type.startsWith('image/')` fayllar; boshqasi e'tiborsiz.
- Reorder: `moveItem` chegara/`from===to` da no-op (o'zgarmagan massiv nusxasi).

## Testlar

`src/admin/lib/reorder.test.ts` — `moveItem` uchun:
- o'rtadan o'rtaga ko'chirish tartibni to'g'ri o'zgartiradi;
- oldinga va orqaga ko'chirish;
- `from === to` → o'zgarmagan (lekin yangi massiv);
- chegaradan tashqari indeks → xavfsiz no-op.

`ImageUploader` DOM/async glue — unit-test qilinmaydi (mavjud admin konvensiyasi, VariantEditor kabi); `bun run dev` da qo'lda tekshiriladi.

## Ta'sir qilmaydigan joylar

- Ma'lumot modeli (`products.image_url`, `product_images`, `sort_order`), migratsiya — o'zgarmaydi.
- Business logic, i18n, SEO, storefront render — o'zgarmaydi.
- Banner/brand yuklash — bu ish doirasidan tashqari (kelajakda shu komponentga o'tishi mumkin, hozir emas).

## Bog'liq ish

Bu spec [2026-07-04-image-fit-design.md] ustiga quriladi — o'sha ishdagi `normalizeImage` va `object-cover` thumbnail uslubidan foydalanadi.
