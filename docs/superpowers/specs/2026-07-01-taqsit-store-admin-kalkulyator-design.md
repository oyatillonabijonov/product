# PRD — Taqsit Store: Admin panel + Kalkulyator

**Sana:** 2026-07-01
**Loyiha:** Taqsit Store — Toshkentda Apple va PC mahsulotlarini halol muddatli to'lovga sotuvchi do'kon sayti
**Holat:** Dizayn tasdiqlangan, ishga tayyor

---

## 1. Maqsad va kontekst

Taqsit Store — Toshkent, Malika Bozori, A blok, 17-do'kon. Apple (iPhone, MacBook, iPad, iMac, Mac Mini) va PC mahsulotlarini **halol muddatli to'lovga** sotadi: passport + boshlang'ich to'lov, 3–12 oy, **ribo yo'q, jarima yo'q**.

Hozirgi sayt (`taqsit-store.vercel.app`) to'liq statik — mahsulotlar kodda qo'lda yozilgan, backend yo'q. Struktura yaxshi, lekin ikki muammo bor:

1. **Admin mahsulot qo'sha olmaydi** — har o'zgarish uchun dasturchi va qayta deploy kerak.
2. **Kalkulyator sozlanmaydi** — boshlang'ich foizi, kurs, ustama kodda qotib qolgan.

Bu PRD shu ikki muammoni hal qiladi: **admin paneli** (hamma ishlata oladigan) va **sozlanadigan kalkulyator**, hozirgi Apple-minimalizm dizaynini saqlagan holda, **maksimal arzon (bepul)** infratuzilmada.

### Maqsadlar
- Admin kod tegmasdan Yangi/Ishlatilgan mahsulotlarni qo'shishi, tahrirlashi, o'chirishi.
- Admin boshlang'ich foizi, USD kursi va har muddat ustamasini paneldan boshqarishi.
- Mijoz mahsulotni tanlab, 3/6/12 oy uchun oylik to'lovni real vaqtda ko'rishi.
- Butun tizim Cloudflare bepul tarifida ishlashi.

### Maqsad emas (YAGNI)
- Passport rasmini saytda saqlash — Telegram orqali qo'lda (qaror qilingan).
- Onlayn to'lov / to'lov shlyuzi — do'konda hal qilinadi.
- Foydalanuvchi ro'yxatdan o'tishi / shaxsiy kabinet.
- Ariza/lidlarni bazada saqlash — arizalar Telegram/WhatsApp deep-link orqali ketadi.

---

## 2. Arxitektura

Hozirgi React (Vite) SPA saqlanadi. Ustiga yengil backend va admin panel qo'shiladi — hammasi **Cloudflare** bepul tarifida.

```
┌─────────────────────────────────────────────────┐
│  Cloudflare Pages (bepul, statik + tez)          │
│  ┌─────────────────┐   ┌──────────────────────┐  │
│  │ Ommaviy sayt     │   │ Admin panel          │  │
│  │ (React SPA)      │   │ /admin (login+parol) │  │
│  └────────┬─────────┘   └──────────┬───────────┘  │
│           │  fetch /api/*          │              │
│  ┌────────▼────────────────────────▼───────────┐  │
│  │  Pages Functions (backend, /api/*)          │  │
│  │  - GET  /api/products   (ommaviy)           │  │
│  │  - GET  /api/settings   (ommaviy, config)   │  │
│  │  - POST /api/admin/login                    │  │
│  │  - CRUD /api/admin/products  (himoyalangan) │  │
│  │  - PUT  /api/admin/settings  (himoyalangan) │  │
│  │  - POST /api/admin/upload    (rasm → R2)    │  │
│  └────────┬───────────────────────┬────────────┘  │
│           ▼                        ▼               │
│     ┌──────────┐            ┌────────────┐         │
│     │ D1 (SQL) │            │ R2 (rasm)  │         │
│     └──────────┘            └────────────┘         │
└─────────────────────────────────────────────────┘
      Mijoz arizasi → Telegram/WhatsApp (deep-link)
```

**Texnologiyalar:**
- **Cloudflare Pages** — statik hosting (React build) + Pages Functions.
- **Pages Functions** — `/api/*` backend (TypeScript, strict, `any` yo'q).
- **D1** — SQLite baza (mahsulotlar + sozlamalar).
- **R2** — mahsulot suratlari ombori.
- **Auth** — login + parol; parol xeshi Cloudflare env'da, sessiya imzolangan cookie (JWT/HMAC).

**Bepul limitlar (kichik biznes uchun yetarli):** D1 5GB, R2 10GB, Functions kuniga 100k so'rov.

---

## 3. Ma'lumotlar bazasi (D1)

### `products` jadvali
| Ustun | Turi | Izoh |
|---|---|---|
| `id` | TEXT PK | slug yoki UUID |
| `name` | TEXT | mahsulot nomi |
| `category` | TEXT | `iphone` \| `mac` \| `ipad` \| `pc` |
| `condition` | TEXT | `yangi` \| `ishlatilgan` |
| `condition_note` | TEXT NULL | ishlatilgan uchun, masalan "95% holat" |
| `cash_price_uzs` | INTEGER | naqd (to'liq) narx, so'm |
| `image_url` | TEXT | R2 havolasi |
| `sort_order` | INTEGER | katalogda tartib |
| `is_active` | INTEGER | 1 = ko'rinadi, 0 = yashirin |
| `created_at` | INTEGER | unix timestamp |

### `settings` jadvali (bitta qator)
| Ustun | Turi | Izoh |
|---|---|---|
| `down_payment_percent` | REAL | boshlang'ich foizi, masalan `20` |
| `usd_to_uzs` | INTEGER | kurs, masalan `12600` |
| `terms` | TEXT (JSON) | `[{ "months": 3, "markup": 0.10 }, { "months": 6, "markup": 0.22 }, { "months": 12, "markup": 0.42 }]` |

Standart muddatlar: **3 / 6 / 12 oy**. Admin panelda 9, 18 kabi muddatlarni qo'shsa bo'ladi.

---

## 4. Kalkulyator matematikasi

Aniq formula (ustama **to'liq narxga**, boshlang'ich **narxdan foiz**):

```
Kirish: cash_price, down_payment_percent, months, markup (shu muddat uchun)

1) jami        = cash_price × (1 + markup)
2) boshlangich = cash_price × (down_payment_percent / 100)
3) qoldiq      = jami − boshlangich
4) oylik       = qoldiq / months
```

**Tekshiruv misoli:** narx `10 000 000`, boshlang'ich `20%`, `12` oy, ustama `42%`
- jami = 10 000 000 × 1.42 = **14 200 000**
- boshlangich = 10 000 000 × 0.20 = **2 000 000**
- qoldiq = 14 200 000 − 2 000 000 = **12 200 000**
- oylik = 12 200 000 / 12 = **≈ 1 016 667 so'm/oy**

**Qoidalar:**
- Barcha hisob so'mda; ko'rsatishda `Math.round`, `formatUzs` (mavjud helper) bilan bo'sh joyli format.
- `oylik = Math.max(0, ...)` — manfiy bo'lmasligi.
- Katalog kartasida "eng past oylik to'lov" = eng uzoq muddat bo'yicha oylik.
- Mavjud `src/lib/installment.ts` helperlari qayta ishlatiladi; `down_payment_percent` (foiz) modeliga moslanadi (hozirgi qat'iy `$30` o'rniga).

**Mijoz oqimi:** mahsulot ustiga bosadi → 3/6/12 oy uchun uchta karta (har birida boshlang'ich, oylik, jami) → muddat kartasi tanlansa forma o'sha muddat bilan to'ladi.

---

## 5. Ommaviy sayt bo'limlari

Hozirgi Apple-uslub saqlanadi. Sahifa tartibi:

1. **Header** — logo, til tanlash (4 til), "Bog'lanish" tugmasi.
2. **Hero** — "Halol muddatli to'lov • Ribosiz • Jarimasiz".
3. **Ishonch belgilar** — 21+, passport + boshlang'ich, 3–12 oy, ribo yo'q.
4. **Qanday ishlaydi** — 4 qadam.
5. **🆕 Yangi mahsulotlar** — alohida bo'lim, kalkulyatorli kartalar.
6. **♻️ Ishlatilgan mahsulotlar** — alohida bo'lim, holat izohi bilan.
7. **Kalkulyator** — tanlangan mahsulot + 3/6/12 oy jonli hisob.
8. **Ariza formasi** — ism, telefon, 21+ tasdiq → Telegram/WhatsApp deep-link.
9. **Shartlar** — halol shartlar, ribosiz izoh.
10. **FAQ** — akkordeon.
11. **Footer** — manzil, Yandex xarita, kontaktlar.

**Mahsulot kartasi:** rasm, nomi, Yangi/Ishlatilgan belgisi, naqd narx, "eng past oylik to'lov", **"Hisoblash"** tugmasi (kalkulyatorga o'tkazadi).

**Ariza oqimi:** forma to'ldiriladi → matn (ism, telefon, mahsulot, muddat, oylik) Telegram `share/url` yoki WhatsApp `wa.me` orqali prefill bo'ladi. Passport rasmini mijoz Telegram chatida qo'lda yuboradi. Saytda hech qanday shaxsiy rasm saqlanmaydi.

**Kontaktlar (mavjud):** Telefon `+998(88)604-36-36`, Telegram `t.me/Taqsit_store`, Instagram `instagram.com/taqsit.store`, Xarita `ll=69.271481,41.338874`.

---

## 6. Admin panel (`/admin`)

**Asosiy tamoyil:** hamma ishlata olishi — sodda, o'zbekcha, ortiqcha tugmasiz.

### Login
- Sahifa: foydalanuvchi nomi + parol.
- Muvaffaqiyatli kirsa — imzolangan sessiya cookie (masalan 7 kun).
- Parol Cloudflare env'da xeshlangan holda saqlanadi (real qiymat repoda emas).

### Mahsulotlar sahifasi
- Ro'yxat: rasm, nomi, holati, narx.
- Yuqorida: **[+ Yangi mahsulot]**, qidiruv, filtr (Yangi / Ishlatilgan).
- Har qatorda: **Tahrir**, **Yashir/Ko'rsat**, **O'chir**.
- Tartibni `sort_order` orqali o'zgartirish (sudrab yoki ↑↓ tugma).

**Mahsulot qo'shish/tahrirlash formasi:**
- Nomi · Kategoriya · Holati (Yangi/Ishlatilgan) · Holat izohi (ishlatilgan uchun) · Naqd narx · Rasm yuklash (R2) · Faol/yashirin.
- Saqlash → saytda darhol ko'rinadi (public API keshini yangilash bilan).

### Sozlamalar sahifasi (kalkulyator boshqaruvi)
```
Boshlang'ich to'lov foizi:  [ 20 ] %
USD kursi (so'm):           [ 12600 ]
Muddatlar va ustama:
   3 oy   ustama [ 10 ] %
   6 oy   ustama [ 22 ] %
   12 oy  ustama [ 42 ] %
   [ + muddat qo'shish ]
[ Saqlash ]
```
- **Jonli oldindan ko'rish:** admin foiz/ustamani o'zgartirsa, misol narxda oylik to'lov qanday chiqishi darhol ko'rinadi (xato kiritishning oldini oladi).

### API endpointlari
| Metod | Yo'l | Kirish | Vazifa |
|---|---|---|---|
| GET | `/api/products` | ommaviy | faol mahsulotlar |
| GET | `/api/settings` | ommaviy | kalkulyator config |
| POST | `/api/admin/login` | ommaviy | login + parol → cookie |
| POST | `/api/admin/logout` | admin | sessiyani tugatish |
| GET | `/api/admin/products` | admin | barcha (yashirin ham) |
| POST | `/api/admin/products` | admin | qo'shish |
| PUT | `/api/admin/products/:id` | admin | tahrirlash |
| DELETE | `/api/admin/products/:id` | admin | o'chirish |
| PUT | `/api/admin/settings` | admin | config yangilash |
| POST | `/api/admin/upload` | admin | rasm → R2 |

---

## 7. Dizayn tili

Hozirgi Apple-minimalizm **saqlanadi**, "jaydari o'zbek sotuvchisi"ga yaqinlashtiriladi:

- **Ranglar:** `#1D1D1F` matn, `#0071E3` ko'k urg'u, `#F5F5F7` fon, `#6E6E73` ikkilamchi. Ishonch uchun yengil **yashil** urg'u ("Halol", "Ribosiz" belgilarida).
- **Shrift:** SF Pro / tizim shrifti (mavjud `--font-sans`), o'zbekcha matn uchun toza.
- **Effektlar:** minimal — hover'da yengil ko'tarilish (`whileHover y:-10`, mavjud `springConfig`), til almashganda blur-fade. Ortiqcha animatsiya yo'q.
- **Ishonch elementlari:** "Ribo yo'q", "Jarima yo'q", "21+", "Passport + boshlang'ich" — aniq, katta, tushunarli belgilar. Jonli narx = ishonch.
- **Mobil-birinchi:** aksariyat mijoz telefonda — kartalar, kalkulyator, forma to'liq moslashadi.
- **Til:** ommaviy sayt — hozirgi 4 til (O'zbek, Rus, English, O'zbek Kirill); admin panel — faqat o'zbekcha.
- **Kartalar:** mavjud `--shadow-apple` / `--shadow-apple-hover` soyalar saqlanadi.

---

## 8. Muvaffaqiyat mezonlari

- [ ] Admin login qilib, kod tegmasdan mahsulot qo'sha/tahrir/o'chira oladi va rasm yuklay oladi.
- [ ] Admin boshlang'ich foizi, kurs va ustamalarni paneldan o'zgartira oladi; o'zgarish saytda darhol aks etadi.
- [ ] Mijoz mahsulotni tanlab, 3/6/12 oy uchun to'g'ri oylik to'lovni (4-bo'lim formulasi bo'yicha) ko'radi.
- [ ] Yangi va Ishlatilgan mahsulotlar alohida bo'limlarda ko'rinadi.
- [ ] Ariza Telegram/WhatsApp'ga to'g'ri prefill bo'lib ketadi.
- [ ] Sayt Cloudflare bepul tarifida ishlaydi (oylik xarajat ≈ 0).
- [ ] `bun run lint` (tsc --noEmit) toza — `any` yo'q, strict TypeScript.
- [ ] Mobil va desktopda dizayn buzilmaydi.

## 9. Xavflar va e'tibor

- **Bepul limitdan oshish:** kichik biznes uchun ehtimoli past; monitoring qilib boriladi.
- **Rasm hajmi:** yuklashda R2'ga saqlashdan oldin siqish/resize (masalan max 1200px, webp).
- **Admin xavfsizligi:** kuchli parol, imzolangan cookie, `/api/admin/*` har so'rovda sessiya tekshiruvi.
- **Kesh:** public API'da qisqa kesh (masalan 60s) yoki admin saqlaganda keshni tozalash — o'zgarish tez ko'rinishi uchun.
- **Migratsiya:** hozirgi `products.ts` dagi NAMUNA mahsulotlar bazaga bir marta seed qilinadi (egaga boshlang'ich nuqta sifatida).
