# Tovar rasmi — borderless fit (kadrni to'ldirish) — Design

**Sana:** 2026-07-04
**Holat:** Tasdiqlangan (design), implementatsiya rejasi keyingi qadam

## Muammo

Tovar kartochkalari va mahsulot sahifasida rasmlar bir tekis ko'rinmaydi:

1. **Mahsulot sahifasi (Gallery):** rasm ostida bo'sh joy qoladi (`aspect-square` + `object-contain` + `p-8`; pro katalog rasmlarida baked bo'sh joy ham bor).
2. **Kartochkalar (ProductCard):** landscape box (`h-[168px]`) da `object-cover` sinab ko'rilganda portret telefon rasmlari qattiq qirqilib qoladi.

**Kontekst:** Do'kon asosan telefon (vertikal obyekt) sotadi. Mijozlar ko'pincha **ishlatilgan telefonni oddiy iPhone bilan suratга oladi** — professional oq fon yo'q, real fon (stol, qo'l). Tizim shu amator suratlarга ham mos bo'lishi kerak. **Sun'iy oq fon qo'shish xohlanmaydi.**

## Asl ildiz

Bitta CSS `object-fit` rejimi barcha holatni hal qila olmaydi:
- `object-contain` → letterbox (bo'sh joy) — xohlanmaydi.
- `object-cover` → to'ldiradi (kerakli), lekin **baked bo'sh joyли pro rasmlar** qirqiladi.

Amator suratlar `cover` bilan yaxshi to'ldiradi. Faqat pro katalog rasmlaridagi **baked bo'sh chekka** muammo tug'diradi — uni yuklashda kesib tashlash kerak.

## Yechim

**Prinsip:** hamma joyda `object-cover` (kadrni to'ldiradi, oq/bo'sh joy yo'q) + yuklashda **faqat bir xil rangли baked chekkani avtomatik trim** qilish (amator suratга ta'sirsiz).

### 1. Ko'rsatish (display)

Barcha tovar rasm zonasi bir xil **portret kadr `aspect-[4/5]` + `object-cover`**, padding yo'q:

- **`src/store/ProductCard.tsx`** — rasm konteyneri: `h-[168px] md:h-[196px] ... p-6` → `aspect-[4/5] ... overflow-hidden` (fixed balandlik va padding olib tashlanadi). Rasm: `max-w-full max-h-full object-contain` → `w-full h-full object-cover`. Hover `scale-[1.06]` saqlashadi; `overflow-hidden` zoom'ni kadr ichida ushlaydi. Rasmsiz fallback (`bg-gradient`) qoladi.
- **`src/store/Gallery.tsx`** — asosiy rasm: `aspect-square ... p-8` + `object-contain` → `aspect-[4/5]` + `object-cover`, padding yo'q. Thumbnaillar `object-cover`.
- **`src/store/CartPage.tsx`** — thumbnail rasm `object-cover`.

*Nega portret 4/5:* telefon vertikal; amator telefon-kamera suratlari ham ko'pincha vertikal. 4/5 ikkalasiga mos, qirqishni minimallashtiradi.

*Admin previewlar (`ProductList`, `ProductForm`, `VariantEditor` — kichik `object-contain` thumbnaillar) o'zgarmaydi — ular faqat texnik ko'rinish.*

### 2. Yuklashda avtomatik trim (client-side)

Yangi modul: **`src/admin/lib/image-normalize.ts`**

- **`contentBounds(data: ImageData, opts): { x, y, width, height }`** — *sof funksiya, unit-test qilinadi.*
  - Rasmning to'rt chekkasidan ichkariga qarab skanerlaydi. Bir qator/ustun agar undagi barcha piksel chekka-namuna rangга yaqin bo'lsa (RGB farqi `tolerance` dan kichik, standart ~12/255), "bo'sh" hisoblanadi va kesiladi.
  - Chekka-namuna rangi: rasmning to'rt burchagi rangining o'rtachasi (asosan oq/och).
  - **Konservativ kafolatlar:** har tomondan maksimal `maxTrimRatio` (standart 0.42) gacha kesadi — undan oshsa kesmaydi (amator surat yoki to'liq rangли rasmni buzmaslik uchun). Agar hech qanday bo'sh chekka topilmasa, butun rasmni qaytaradi (no-op).
  - Sof: `Uint8ClampedArray` + o'lcham ustida ishlaydi, DOM kerak emas → vitest'da test qilinadi (qo'lda yasalgan `ImageData`-ga o'xshash obyekt bilan).

- **`normalizeImage(file: File): Promise<File>`** — canvas glue (unit-test qilinmaydi):
  1. `createImageBitmap(file)` → canvas'ga chizadi.
  2. `getImageData` → `contentBounds` → kesilgan sohani yangi canvas'ga ko'chiradi.
  3. Uzun tomonni `maxSize` (standart 1600px) gacha kichraytiradi.
  4. `canvas.toBlob('image/webp', 0.85)` → yangi `File` (`.webp`).
  5. **Hech qanday fon/kanvas qo'shmaydi** — faqat kesish + kichraytirish.
  6. Xato bo'lsa (masalan brauzer webp encode qo'llamasa) — original faylни o'zgartirmasdan qaytaradi (graceful fallback).

- **Chaqiruv nuqtalari:** `uploadImage(file)` dan oldin `normalizeImage(file)`:
  - `src/admin/ProductForm.tsx` — `uploadMain`, `uploadGallery`
  - `src/admin/VariantEditor.tsx` — variant rasm yuklash
  - `src/admin/BrandForm.tsx` — (brend logosi; ixtiyoriy, lekin bir xil oqim uchun qo'shiladi)

### 3. Server

**`app/routes/api.admin.upload.tsx` o'zgarmaydi.** Tayyor `.webp` keladi; `ALLOWED` da `image/webp` allaqachon bor. R2 `put` o'zgarmaydi.

## Ko'lam va cheklovlar

- **Faqat yangi yuklashlar** tekislanadi. Eski R2 rasmlarga migratsiya yo'q — admin qayta yuklaganda tekislanadi.
- **Bepul tarif:** barcha rasm ishlashi admin brauzerida — Cloudflare Worker CPU/bundle sarfi yo'q.
- **`no any`, strict TS** saqlash. Admin komponentlari `FC<{...}>` konventsiyasiga mos.

## Testlar

`src/admin/lib/image-normalize.test.ts` — `contentBounds` uchun:
- Oq chekkaли rasm → chekka to'g'ri kesiladi.
- Bir xil rangли chekka yo'q (amator surat imitatsiyasi) → butun rasm qaytadi (no-op).
- `maxTrimRatio` dan oshadigan bo'sh joy → kesish cheklanadi.
- To'liq bo'sh (bir rangли) rasm → himoya ishlaydi, 0×0 qaytarmaydi.

## Ta'sir qilmaydigan joylar

- Business logic (`installment.ts`, `variants.ts`, `cart.ts`), i18n, SEO, D1 sxema — o'zgarmaydi.
- Migratsiya yo'q (yangi migration fayl yaratilmaydi).
