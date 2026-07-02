# 5-bo'lak — Savat → bitta Telegram/WhatsApp lead — Design Spec

**Sana:** 2026-07-02
**Status:** Approved (brainstorm)
**Bo'lak:** Platforma qayta qurishning 5-bo'lagi (4-bo'lak variant UI TUGADI)

---

## 1. Maqsad va model

Onlayn to'lov yo'q — savat **lead yig'uvchi**: foydalanuvchi bir nechta mahsulotni (variant bilan) yig'adi, bitta muddat tanlaydi, bitta ko'p-qatorli Telegram/WhatsApp xabari yuboradi.

- Savat **klient tarafda** (`localStorage` kaliti `taqsit-cart-v1`), server savat yo'q (login yo'q).
- `CartItem = { productId: string; name: string; image: string; priceUzs: number; variantId: string | null; variantLabel: string; qty: number }` — narx qo'shilgan paytdagi tanlangan variant narxi.
- Merge qoidasi: bir xil `productId + variantId` → `qty++`.
- **Muddat butun buyurtma uchun bitta** (3/6/12). Formula chiziqli, jami naqd summaga qo'llanadi: `total = sum×(1+markup)`, `down = sum×downPct/100`, `monthly = max(0,(total−down)/oy)`. `src/lib/installment.ts` **tegilmaydi** (calcInstallment'ga `{cashPriceUzs: sum}` obyekt beriladi — mavjud pattern).

## 2. Pure logika — `src/lib/cart.ts` (TDD)

- `CartItem` tipi; `CART_KEY = 'taqsit-cart-v1'`.
- `addItem(items, item): CartItem[]` — merge (`productId+variantId` mos bo'lsa qty yig'iladi), aks holda qo'shiladi.
- `removeItem(items, productId, variantId): CartItem[]`; `setQty(items, productId, variantId, qty): CartItem[]` (qty ≤ 0 → o'chirish; yuqori chegara 99).
- `cartCount(items): number` (qty yig'indisi); `cartSum(items): number` (narx×qty yig'indisi).
- `serializeCart(items): string` / `parseCart(raw: string | null): CartItem[]` — buzilgan/nostandart JSON → `[]` (crash yo'q, maydon-tiplar tekshiriladi).
- `composeCartLeadMessage({ items, months, monthly, downPayment, totalCash }): string` — mavjud `composeLeadMessage` uslubida (🛒 sarlavha, har element: `• Nom (variantLabel) ×qty — narx`, so'ng muddat/boshlang'ich/oylik/jami qatorlari).

## 3. Holat — `CartProvider` (React context)

`src/store/CartContext.tsx`: `{ items, add, remove, setQty, clear, count }`. `StoreLayout` o'raydi. **SSR-xavfsiz:** boshlang'ich holat bo'sh massiv; `useEffect`da `localStorage`dan yuklanadi; har o'zgarishda saqlanadi. Badge/kontent mount'dan keyin haqiqiy qiymatni ko'rsatadi (hydration mismatch yo'q).

## 4. UI

- **ProductPage:** CTA qatoriga "Savatga qo'shish" (uchinchi tugma yoki Telegram yonida) — tanlangan variant narxi/label bilan `add()`; `outOfStock` → disabled; bosilganda qisqa vizual tasdiq (tugma matni ~1.5s "Qo'shildi ✓").
- **Header:** savat ikonkasi → `LocaleLink`/lokal-prefiksli `/savat` link; `count > 0` bo'lsa badge (ko'k doira, son). `navSoon` tooltip savatdan olib tashlanadi (sevimlilarda qoladi).
- **`/savat` (+ `:lang`) sahifasi:** elementlar ro'yxati (rasm, nom + variantLabel, qty +/−, o'chirish, qator summasi) · muddat segmented tanlagich · xulosa karta (jami naqd, boshlang'ich, **jami oylik**, × oy) · Telegram/WhatsApp CTA (`composeCartLeadMessage` + mavjud `telegramShareUrl`/`whatsappUrl`) · "Savatni tozalash" · bo'sh holat (ikonka + matn + "Xaridni davom ettirish" → `/katalog`).
- Route loader faqat `loadConfig` (SSR shell); `meta` `noindex` (shaxsiy sahifa).

## 5. i18n — 4 tilda

`cartTitle` ("Savat"), `cartEmpty` ("Savat bo'sh"), `cartAdd` ("Savatga qo'shish"), `cartAdded` ("Qo'shildi ✓"), `cartContinue` ("Xaridni davom ettirish"), `cartClear` ("Savatni tozalash"), `cartTotalCash` ("Jami naqd narx"), `cartMonthlyTotal` ("Jami oylik to'lov"), `cartItemsCount` ("ta mahsulot").

## 6. Testlar

`src/lib/cart.test.ts` (TDD): addItem merge/yangi, removeItem, setQty (0→o'chadi, 99 cap), cartCount/cartSum, parseCart (valid, buzilgan JSON, noto'g'ri shakl, null), composeCartLeadMessage (ko'p element + variant + jami qatorlar). Mavjud 43 test buzilmaydi.

## 7. Chegaralar (YO'Q)

Server-side savat, promo-kod, stock miqdori tekshiruvi, checkout forma (ism/tel), sevimlilar, narx-o'zgarish sinxronizatsiyasi (savatdagi narx qo'shilgan paytdagi snapshot — MVP uchun qabul).
