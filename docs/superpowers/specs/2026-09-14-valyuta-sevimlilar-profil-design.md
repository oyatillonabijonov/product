# Navbar: UZS/USD valyuta, Sevimlilar va Profil (dizayn, 2026-09-14)

Navbarga uchta ustun qo'shiladi: **UZS/USD** (butun saytdagi narxlar tanlangan valyutada),
**Sevimlilar** (kirishsiz sahifa) va **Profil** (doim ko'rinadi). Dollar kursi Markaziy bank
API'sidan olinadi va do'konning **yagona kursi** bo'ladi (ustama bilan).

## 1. Kontekst (2026-09-14 holati)

- Narxlar bazada faqat so'mda: `products.cash_price_uzs`, variantlar, savat, buyurtmalar.
- `settings.usd_to_uzs` (INTEGER, admin qo'lda kiritadi) — Billz'dagi USD narxlarni so'mga
  o'giradi (`shared/billz.ts` `toUzs`, 1 000 ga yaxlitlab). Lokal bazada 12 600.
- Markaziy bank: `GET https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/` → bitta obyektli massiv:
  `{"Ccy":"USD","Nominal":"1","Rate":"11765.76","Date":"14.09.2026", …}` (kalitsiz, bepul).
- Narx 9 faylda `formatUzs(x, t.sum)` bilan chiziladi (32 joy).
- Sevimlilar `localStorage`da (`FavoritesContext`), mehmon ham qo'shadi, lekin ro'yxat faqat
  `/kabinet`da ko'rinadi — u esa kirishni talab qiladi.
- Header'da akkaunt ustuni faqat `loginEnabled(config)` bo'lsa chiqadi (Google/Telegram sozlangan).
- Storefront sahifalari proxy'da 60 s keshlanadi (`server/index.ts`, `deploy/nginx.conf`).

## 2. Maqsad emas (YAGNI)

- Billz'ga yozish — yo'q. Billz sinxronizatsiyasining kodi o'zgarmaydi; u `settings.usd_to_uzs`ni
  avvalgidek o'qiydi.
- Buyurtma (Telegram xabari, `orders` jadvali), buyurtmalar tarixi, SEO (meta, JSON-LD), admin
  narxlari — so'mda qoladi.
- Narxni bazada dollarda saqlash yoki Billz'dagi asl USD narxni alohida ko'rsatish — yo'q; USD =
  so'm ÷ kurs.
- Boshqa valyutalar (EUR, RUB) — yo'q.
- Sevimlilarni akkauntga sinxronlash — yo'q (brauzerda qoladi).

## 3. Kurs

**Formula:** do'kon kursi = `round(MB kursi × (1 + ustama / 100))`. Masalan 11 765.76 × 1.07 → 12 589.

**Migratsiya `0032_usd_rate.sql`** (`settings`):
- `usd_markup_percent REAL` — `NULL` = avtomatik kurs **o'chiq**.
- `usd_cbu_rate REAL` — oxirgi olingan MB kursi.
- `usd_rate_date TEXT NOT NULL DEFAULT ''` — MB sanasi (`14.09.2026`).

**Xavfsiz o'tish:** ustama kiritilmaguncha `usd_to_uzs` qo'lda qoladi. Aks holda deploy qilingan zahoti
Billz tovarlarining so'm narxlari keyingi sinxronizatsiyada o'zidan o'zgarib ketardi.

**`shared/usd-rate.ts`** (sof, testli): `CBU_USD_URL`, `parseCbuUsd(body) → {rate, date} | null`
(massiv, `Ccy === 'USD'`, `Rate/Nominal` musbat son), `storeRate(cbu, markupPercent) → number`.

**`server/usd-rate.ts`** — `createUsdRate(env)`: `start()` boot'dan 5 s keyin va har 6 soatda
`refresh()`. `refresh()`: `fetch` (5 s timeout) → `parseCbuUsd` → `usd_cbu_rate`, `usd_rate_date`
yoziladi; ustama `NULL` bo'lmasa `usd_to_uzs = storeRate(...)` ham yoziladi. Xato — log, oxirgi
qiymat qoladi. `server/index.ts` Billz runner kabi yaratib `start()` qiladi.

**Admin → Sozlamalar** (`SettingsForm`, `api.admin.settings`):
- "Ustama (%)" maydoni (bo'sh = o'chiq, 0–100, xato kodi `usd_markup_range`).
- Ostida: "Markaziy bank: 11 765.76 (14.09.2026)" yoki "hali olinmadi".
- Ustama bor → "Do'kon kursi: 12 589 so'm (avtomatik)", qo'lda kurs maydoni yashiriladi.
  Ustama yo'q → qo'lda "USD kursi (so'm)" maydoni hozirgidek.
- `PUT`: `usd_cbu_rate`/`usd_rate_date` body'dan olinmaydi (server mulki). Ustama bor va MB kursi
  ma'lum bo'lsa `usd_to_uzs` shu zahoti `storeRate`dan yoziladi, aks holda body'dagi qo'lda qiymat.
- `ApiSettings`ga `usdMarkupPercent: number | null`, `usdCbuRate: number | null`, `usdRateDate: string`.

## 4. Valyuta tanlovi

**Saqlash:** `currency=USD` cookie (1 yil, `Path=/`, `SameSite=Lax`). UZS tanlansa cookie o'chiriladi
— sukut UZS, qidiruv tizimlari cookie'siz keladi, ya'ni so'm narxni ko'radi.

**Server render:** `app/routes/store.tsx` loader cookie'ni o'qiydi (`parseCurrency`) va kursni
`loadConfig(env).usdToUzs`dan oladi; ikkalasi `StoreLayout` → `CurrencyProvider`ga uzatiladi.
Birinchi render server va klientda bir xil — narx sakramaydi.

**`src/lib/currency.ts`** (sof, testli):
- `type Currency = 'UZS' | 'USD'`, `parseCurrency(v)`, `CURRENCY_COOKIE`.
- `formatUsd(v)`: $100 dan kichik — sent bilan (`$2.94`), kattasi — butun dollar, minglar bo'shliq
  bilan (`$1 299`). `Intl` ishlatilmaydi (server/brauzer farqi gidratatsiyani buzmasin).
- `formatPrice(uzs, currency, rate, sum)`: USD va `rate > 0` → `formatUsd(uzs / rate)`, aks holda
  `formatUzs(uzs, sum)`.
- `toUzs(value, currency, rate)` / `fromUzs(uzs, currency, rate)` — filtr inputlari uchun.

**`src/store/CurrencyContext.tsx`:** `{ currency, rate, setCurrency, price(uzs) }`. `setCurrency`
state'ni almashtiradi (sahifa qayta yuklanmaydi) va cookie'ni yozadi/o'chiradi. Jami summa har
qatorni emas, umumiy so'm summasini o'girib hisoblanadi (komponentlar allaqachon so'm summani uzatadi).

**Kesh:** `server/index.ts` — cookie `currency=USD` bo'lsa storefront javobi
`Cache-Control: private, no-store`. `deploy/nginx.conf` `location /`:
`proxy_cache_bypass $cookie_currency; proxy_no_cache $cookie_currency;`.

## 5. Qayerda o'giriladi

`formatUzs(x, t.sum)` → `price(x)`: `ProductCard`, `ProductPage` (narx, eski narx, variant kartalari,
muddatli to'lov bloki), `CartPage`, `OrderForm` (xulosa), `FavoritesList`, `PcConfigurator`,
`ActiveFilterChips`.

**`FilterPanel`:** sarlavha USD'da "Narx ($)" (`filterPriceUsd`); placeholder va qo'llangan qiymat
`fromUzs` bilan dollarda; kiritilgan dollar `toUzs` bilan so'mga o'girilib URL `narx`ga yoziladi
(URL doim so'mda). `CatalogView`dagi `FilterPanel` `key`iga valyuta qo'shiladi — almashganda
input holati tozalansin.

**So'mda qoladi:** `OrdersList` (kabinet), `app/routes/product.tsx` meta tavsifi, Telegram/buyurtma
ma'lumoti, admin.

## 6. Navbar

**Desktop (`lg`dan):** logo · Katalog · qidiruv · **UZS/USD** · **Sevimlilar** · Savat · Til · Mavzu ·
**Profil** (o'ng chetda). Oltita yozuvli ustun 768–1023px'ga sig'maydi (qidiruv 0 ga tushadi), shuning uchun
Header'dagi `md:` bo'linishlari `lg:`ga o'tadi; 1024px'da qidiruvga ~300px qoladi.

- **UZS/USD** — til ustuni naqshi: `Wallet` ikonkasi, yozuvda joriy valyuta (`UZS`/`USD`), ustida
  shaffof native `select` ("UZS — so'm", "USD — 1 $ = 12 589 so'm"). Kurs 0 bo'lsa USD varianti yo'q.
- **Sevimlilar** — `Heart`, savatdagi kabi soni (badge), `/sevimlilar`ga havola.
- **Profil** — `User`, yozuv "Profil" (`navProfile`), doim ko'rinadi: kirgan → `/kabinet`;
  login sozlangan, kirmagan → login oynasi; login sozlanmagan → `/kirish` (u bosh sahifaga qaytaradi).
  `navAccount` kaliti ishlatilmay qoladi → o'chiriladi.

**Mobil/planshet (`lg`gacha):** 1-qator — logo + Sevimlilar + Savat + Profil (ikonkalar). UZS/USD,
Til va Mavzu ☰ menyuning (kategoriyalar dropdown'i) pastidagi sozlamalar blokiga ko'chadi
(`lg:hidden`): valyuta va til — ikki bo'lakli tanlov, mavzu — `ThemeToggle`.

**Landing (HeroNotch):** `showAccount` gating'i olib tashlanadi — Kirish va kabinet doim ko'rinadi.

## 7. Sevimlilar sahifasi

- `app/routes/sevimlilar.tsx` (+ `:lang/sevimlilar`), `noindex`, sarlavha `accountTabFavorites`
  ("Sevimlilar"/"Избранное"), tanasi — mavjud `FavoritesList`.
- `FavoritesContext` `loaded` bayrog'ini ochadi; `FavoritesList` `loaded` bo'lmaguncha hech narsa
  chizmaydi — SSR'da "ro'yxat bo'sh" chaqnab o'tmasin.
- Sitemap'ga qo'shilmaydi.

## 8. i18n

Yangi kalitlar (uz/ru): `navProfile` ("Profil"/"Профиль"), `currencyLabel` ("Valyuta"/"Валюта"),
`filterPriceUsd` ("Narx ($)"/"Цена ($)"). `navAccount` o'chiriladi. Sevimlilar yozuvi uchun mavjud
`accountTabFavorites` ishlatiladi.

## 9. Tekshiruv

- Unit: `src/lib/currency.test.ts` (format, chegaralar, kurs 0, `toUzs`/`fromUzs`, `parseCurrency`),
  `shared/usd-rate.test.ts` (MB javobi: to'g'ri/buzuq/nominal; `storeRate`),
  `functions/lib/validate.test.ts` (ustama: `null`, diapazon).
- `bun run lint`, `bun run test`.
- Brauzer: UZS↔USD almashtirish (karta, mahsulot, savat, filtr), qayta yuklashda tanlov saqlanishi,
  `/sevimlilar` mehmon uchun, mobil ☰ sozlamalari, ikkala mavzu, `lg` chegarasi.
