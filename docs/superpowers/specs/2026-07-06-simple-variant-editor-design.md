# Sodda variant muharriri — dizayn (2026-07-06)

## Muammo
Admin `ProductForm` ikki xil, ustma-ust UI beradi:
1. **Xotira chip'lari** (to'g'ri, sodda yo'l) — `STORAGE_VALUES` bosib `Xotira` option + variant avtomatik.
2. **`VariantEditor`** (chalkash) — erkin matnli option nomi, SKU, qo'lda "Kombinatsiyalarni generatsiya", dropdownlar.

Foydalanuvchi 2-yo'lga tushib xato struktura yasaydi (ikkita alohida "256"/"512" option). SKU tushunarsiz va keraksiz (lead do'koni, real ombor yo'q).

## Yechim
Generic `VariantEditor` butunlay olib tashlanadi. O'rniga **chip-asosli ikki o'q** (Xotira + Rang), avtomatik kombinatsiya jadvali.

### Xulq
- **Ishlatilgan** (`condition === 'ishlatilgan'`) yoki chip tanlanmagan (aksessuar) → variant YO'Q, bitta umumiy `cashPriceUzs`.
- **Yangi** qurilma → ikki qator chip:
  - **Xotira**: `64GB 128GB 256GB 512GB 1TB 2TB` (mavjud `STORAGE_VALUES`).
  - **Rang**: tayyor palitra `Qora Oq Kulrang Ko'k Yashil Qizil Tillarang Pushti` + "+ boshqa rang" kichik input (nostandart ranglar).
- Chip tanlansa → `generateVariants(options, prev)` orqali Xotira × Rang kombinatsiyalari avtomatik (qo'lda "generatsiya" tugmasi yo'q).
- Har variant qatori: **o'zgarmas yorliq** (masalan `256GB · Qora`) + **Narx** (`PriceInput`) + **Rasm** (kichik uploader/thumbnail). Boshqa hech narsa.

### Olib tashlanadi
- `VariantEditor.tsx` (fayl o'chiriladi), ProductForm'dagi undan foydalanish.
- SKU maydoni (UI), variant-darajasidagi eski narx va "omborda" toggle (UI), erkin option nomi, dropdownlar, "Kombinatsiyalarni generatsiya"/"+ variant qo'shish" tugmalari.

### Backend / data model — TEGILMAYDI
- Migratsiya yoki API o'zgarishi YO'Q.
- Variant yozuvlarida `sku = null`, `oldPriceUzs = null`, `inStock = true` default sifatida ketadi.
- `generateVariants`, `AdminVariantInput`, statement builder'lar o'zgarmaydi.

## Cheklov (kelishilgan)
- Faqat **Xotira + Rang** o'qlari. Noutbuk uchun alohida **RAM/protsessor** o'qi bo'lmaydi (SSD hajmini "Xotira" qoplaydi). Kerak bo'lsa keyin alohida ish.

## Ta'sir doirasi
- `src/admin/ProductForm.tsx` — variant bo'limi qayta yoziladi (chip Rang qo'shiladi, VariantEditor o'rniga sodda jadval).
- `src/admin/VariantEditor.tsx` — o'chiriladi.
- Rang chip mantiqi `toggleStorage` ga o'xshash `toggleColor`.
- `errText.ts` dagi `optionName_required` kabi kodlar UI'da endi chiqmaydi (option nomi avtomatik "Xotira"/"Rang").

## Tekshirish
- `bun run lint` toza.
- Admin'da: yangi telefon → Xotira+Rang chip → jadval avtomatik, narx+rasm; saqlash ishlaydi.
- Ishlatilgan → variant bo'limi yo'q, bitta narx.
- Storefront mahsulot sahifasi variantlarni avval kabi ko'rsatadi (inStock=true default).
