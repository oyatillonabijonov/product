# PRD — Xaridor tajribasi: naqd+muddatli, one-click buyurtma, mijoz auth

**Sana:** 2026-07-06
**Loyiha:** Taqsit Store platformasi — qayta ishlatiluvchi elektronika-do'kon storefront
**Holat:** Dizayn taklifi — ko'rib chiqilmoqda
**Bog'liqlik:** Mavjud storefront + admin + Cloudflare backend (D1/R2) ustiga quriladi. Hammasi Cloudflare **bepul tarifida**.

---

## 1. Maqsad va kontekst

Hozirgi sayt **faqat muddatli to'lovga** moslashib qolgan: mahsulot kartasida birlamchi narx "oyiga X so'mdan", "sotib olish" tugmalari esa Telegram/WhatsApp share-link (`telegramShareUrl`/`whatsappUrl`) — server hech narsa saqlamaydi, mijoz o'zi chatga o'tadi.

Platforma **barcha elektronika do'konlariga** mos bo'lishi kerak: naqd xaridor ham, muddatli xaridor ham to'liq qondirilsin, va do'kon har buyurtmani nazorat qilsin.

### Maqsadlar
- To'lov rejimini **sozlanadigan** qilish (naqd / muddatli / ikkalasi) — asaxiy uslubidagi ikki-narxli ko'rsatish.
- **Ikkita alohida buyurtma yo'li**: "Hoziroq xarid qilish" (naqd) va "Muddatli to'lovga olish" (rassrochka) — ikkalasi ham forma orqali serverga, u yerdan Telegram botga + D1'ga.
- Muddatli yo'lda xaridor **muddat (oy)** va **boshlang'ich to'lov**ni tanlaydi (slider bilan min'dan oshirsa oylik kamayadi), real-time hisob ko'radi.
- **Mijoz auth** (ixtiyoriy): Google + Telegram orqali kirish, buyurtma tarixi, forma avtomat to'ldiriladi.

### Maqsad emas (YAGNI)
- Onlayn to'lov (karta/click/payme) — yo'q, buyurtma baribir qo'ng'iroq/TG orqali yopiladi.
- SMS OTP / telefon-parol ro'yxatdan o'tish — pullik, bepul tarifni buzadi. Faqat OAuth (Google/Telegram).
- Ombor miqdori hisobi, yetkazib berish narxi, buyurtma holati mijozga ko'rinishi — keyingi bosqich.
- Reyting/sharh, sevimlilar serverda saqlanishi.

---

## 2. Namuna tadqiqi — macbro.uz (2026-07-06 da brauzerda ko'rildi)

Mahsulot sahifasida (masalan iPhone 16 Pro Max) ikki mustaqil qism:

**A) Naqd — "Купить в один клик" (katta birlamchi tugma).**
Bosilганда modal ochiladi: mahsulot rasmi + nomi + variant (256GB Natural Titanium Single SIM) + narx; keyin **Ism** + **Telefon (+998…)** maydonlari; "Отправить заявку" tugmasi. Ma'lumot serverga → botga.

**B) Muddatli — "Рассрочка" paneli (o'ng ustun, chegaralangan blok).**
- Plan presetlari (radio): Prestige "3", Standart "6", Komfort "9", Ekonom "12", "50% / 50%" — oy soniga bog'langan tariflar.
- **Первоначальный взнос** (boshlang'ich to'lov): summa inputi + foiz inputi, ostida "минимум 5 655 000 (30%) / максимум 16 861 500 сум (90%)".
- **Срок оплаты (месяц)**: oy soni select (3/6/9/12).
- Real-time: **Ежемесячный платеж** (oylik) + **Общая сумма оплаты** (jami) darhol qayta hisoblanadi.

**Mahsulot kartasi (ro'yxatda):** faqat eski narx (chizilgan) + naqd narx (qizil) + chegirma badge. (asaxiy.uz esa qo'shimcha "oyiga X so'mdan" qatorini ham ko'rsatadi — biz ikkalasini birlashtiramiz.)

**Bizning farqimiz (yaxshilash):** macbro'da rassrochka faqat kalkulyator (submit yo'q, telefon raqami beriladi). Bizda **muddatli yo'lning ham o'z submit tugmasi** bo'ladi (ism+telefon → bot+D1), va boshlang'ich to'lov **slider** orqali min'dan max'gacha sozlanadi.

---

## 3. Qamrov: 3 mustaqil bosqich

Har biri alohida implement rejasi (writing-plans) bilan ketma-ket quriladi:

| Bosqich | Nimasi | Bog'liqlik |
|---------|--------|-----------|
| **1. To'lov modeli va narx** | Sozlanadigan naqd/muddatli, ikki-narxli ko'rsatish, o'zgaruvchan boshlang'ich to'lov kalkulyatori (slider) | Mustaqil (poydevor) |
| **2. One-click buyurtma** | 2 ta CTA + forma, `orders` jadvali, `/api/order`, Telegram Bot API, admin "Buyurtmalar" | 1-bosqich narx/kalkulyator kontekstidan foydalanadi |
| **3. Mijoz auth** | `customers`, sessiya, Google + Telegram kirish, `/kabinet` | 2-bosqich formasini to'ldiradi |

---

## 4. Bosqich 1 — To'lov modeli, narx ko'rsatish, kalkulyator

### 4.1. site_config: `paymentMode`
`paymentMode: 'both' | 'cash' | 'installment'` (default `'both'`). Admin "Sayt ma'lumotlari" tabida select. Rebrand seamiga mos — kod emas, config.

### 4.2. Narx bloki (bitta yordamchi, uch iste'molchi)
`installment.ts`ga sof funksiya: `paymentDisplay(product, config, mode, t)` → `{ primary, secondary, showInstallmentUi }`. `ProductCard`, `ProductPage`, `CartPage` shuni ishlatadi (dublikat yo'q).

| mode | primary (katta) | secondary (kichik, muted) | Muddatli UI (kalkulyator/CTA) |
|------|-----------------|---------------------------|-------------------------------|
| `both` (default) | Naqd narx `minPriceUzs` | `oyiga {lowestMonthly} so'mdan` | Ko'rinadi |
| `cash` | Naqd narx | — | **Yashirin** |
| `installment` | `oyiga {lowestMonthly} so'mdan` | Naqd narx | Ko'rinadi |

- Chegirma badge / eski narx strikethrough naqd narxga bog'lanadi (`discountPercent` o'zgarmaydi).
- `cash` rejimda muddatli UI (kalkulyator, muddat, boshlang'ich to'lov, muddatli CTA) render qilinmaydi.
- Kartada (asaxiy uslubi): naqd birlamchi, "oyiga…" ikkilamchi qator — `both`/`installment`da.

### 4.3. O'zgaruvchan boshlang'ich to'lov (slider) — biznes yadrosi kengaytmasi
Hozir `calcInstallment` boshlang'ichni `cash × downPct/100` bilan **qat'iy** hisoblaydi. Kengaytma:

```ts
// downPaymentUzs berilmasa — minimumdan (config.downPaymentPercent) hisoblanadi
calcInstallment(product, term, config, downPaymentUzs?: number): InstallmentResult
// total = cash × (1+markup);  monthly = max(0, (total − down) / months)
```
- `settings` (D1, admin) yangi maydon: `downPaymentMaxPercent` (masalan 90; mavjud `downPaymentPercent` = minimum).
- **Slider birligi = foiz** (`downPaymentPercent` … `downPaymentMaxPercent`, masalan 30%→90%). UI foizni surtadi; `downPaymentUzs = cash × pct/100` hisoblanadi. Foiz universal (variant narxidan mustaqil ko'rinadi).
- Slider surilганда `monthly`/`total` real-time qayta hisoblanadi (sof funksiya, test qilinadi).
- Formulaning **chiziqliligi** saqlanadi (savat uchun `cartInstallment` ham shu yangi imzoga moslanadi — down default min).

### 4.4. Teginadigan fayllar
`installment.ts` (+ test), `ProductCard.tsx`, `ProductPage.tsx` (muddat select + boshlang'ich slider + live hisob), `CartPage.tsx`, `SiteConfigForm.tsx` + settings form (`downPaymentMaxPercent`), `shared/types.ts`, migratsiya `0014`, i18n.

---

## 5. Bosqich 2 — One-click buyurtma (2 ta yo'l)

### 5.1. Ikkita CTA (paymentMode bo'yicha gated)
Mahsulot sahifasida:
- `both`: **[Muddatli to'lovga olish]** + **[Hoziroq xarid qilish]**
- `cash`: faqat **[Hoziroq xarid qilish]**
- `installment`: faqat **[Muddatli to'lovga olish]**

TG/WA endi order kanali emas — **maslahat/savol** uchun kichik ikkilamchi link sifatida qoladi (kontaktlar config'da).

### 5.2. Naqd yo'l — "Hoziroq xarid qilish"
Modal: mahsulot konteksti (avto: nom, variant, naqd narx) + **Ism** + **Telefon** (+ honeypot). Submit → `/api/order` (`payment_kind='cash'`).

### 5.3. Muddatli yo'l — "Muddatli to'lovga olish"
Sahifadagi kalkulyator holati (muddat + slider bilan tanlangan boshlang'ich to'lov, oylik, jami) formaga ko'chadi. Modal: kalkulyator xulosasi (muddat, boshlang'ich, oylik, jami — ko'rsatiladi) + **Ism** + **Telefon** + honeypot. Submit → `/api/order` (`payment_kind='installment'`, `term_months`, `down_payment_uzs`, `monthly_uzs`, `total_uzs`).

### 5.4. Server oqimi — `POST /api/order`
1. Validatsiya: ism bo'sh emas, telefon UZ formati, honeypot bo'sh (`parseOrderInput`, `functions/lib/validate.ts`). `payment_kind='installment'` bo'lsa narx maydonlarini serverda **qayta hisoblaymiz** (mijoz yuborgan summaga ishonmaymiz — `calcInstallment` bilan tekshirish).
2. D1 `orders`ga insert.
3. Telegram Bot API: `POST https://api.telegram.org/bot<token>/sendMessage` (`chat_id`=config). `composeOrderMessage` (`shared/order.ts` — ikkala tsconfig ko'radi), naqd/muddatliga qarab format.
4. Telegram xatosi bo'lsa ham buyurtma D1'da qoladi (`telegram_sent=0`) — ma'lumot yo'qolmaydi.
5. Javob `{ ok: true }` → forma: "✅ Buyurtmangiz qabul qilindi, tez orada bog'lanamiz."

### 5.5. `orders` jadvali (migratsiya `0015`)
```
orders(
  id INTEGER PK, created_at TEXT,
  name TEXT, phone TEXT, note TEXT,
  payment_kind TEXT,            -- 'cash' | 'installment'
  term_months INTEGER NULL,     -- installment
  down_payment_uzs INTEGER NULL,-- installment (slider qiymati)
  monthly_uzs INTEGER NULL, total_uzs INTEGER NULL,
  items_json TEXT,              -- [{productId,name,variantLabel,qty,priceUzs}]
  source TEXT,                  -- 'product' | 'cart'
  customer_id INTEGER NULL,     -- 3-bosqich FK
  status TEXT DEFAULT 'new',    -- 'new'|'contacted'|'done'
  telegram_sent INTEGER DEFAULT 0
)
```
`items_json` — alohida `order_items` jadval **yo'q**; buyurtmalar kam hajmli va butun o'qiladi.
<!-- ponytail: items JSON bitta ustunda — hajm/analitika kerak bo'lsa order_items jadvalga normallashtiriladi -->

### 5.6. API + admin
- `api.order.tsx` (public POST; `requireAdmin`siz — honeypot + validatsiya + kelajakda CF rate-limit).
- `api.admin.orders.tsx` (list), `api.admin.orders.$id.tsx` (`PATCH {status}`), ikkalasi `requireAdmin`.
- Admin sidebar: yangi **"Buyurtmalar"** — ro'yxat (sana, ism, telefon, mahsulot, to'lov turi, oylik, holat), holat yangilash.

### 5.7. Teginadigan fayllar
`ProductPage.tsx`, `CartPage.tsx`, yangi `OrderForm.tsx` (naqd + muddatli variant), `api.order.tsx`, `api.admin.orders*.tsx`, `functions/lib/validate.ts` + `db.ts`, `shared/order.ts`, admin `OrdersPage`, `src/admin/api.ts` + `errText.ts`, migratsiya `0015`, i18n.

---

## 6. Bosqich 3 — Mijoz autentifikatsiyasi

Auth **buyurtma uchun shart emas** (guest ikkala yo'l ham ishlaydi). Akkaunt — ixtiyoriy qulaylik: buyurtma tarixi + forma avto-to'ldirish.

### `customers` jadvali (migratsiya `0016`)
```
customers(
  id INTEGER PK, created_at TEXT,
  name TEXT, phone TEXT NULL, email TEXT NULL,
  google_sub TEXT NULL UNIQUE,     -- Google 'sub'
  telegram_id TEXT NULL UNIQUE     -- Telegram user id
)
```
Parol yo'q (OAuth-only). Provider identifikatori bo'yicha upsert.

### Sessiya
Mavjud `functions/lib/auth.ts` (`createSession`/`verifySession`/HMAC) qayta ishlatiladi — **alohida cookie** (`customer_session`) + **alohida sekret** (`customer_session_secret`, `site_config`da, seed'da auto-generatsiya). Admin sessiyasidan mustaqil. Yangi `requireCustomer` guard (user'ni qaytaradi yoki null).

### Kirish usullari
- **Google OAuth 2.0 (code flow):** `/auth/google` → Google redirect; `/auth/google/callback` → code→token, `id_token`/userinfo'dan `sub`+email+name, upsert, session cookie. `google_client_id`/`google_client_secret` config'da. Kutubxona yo'q — `fetch` + JWT dekod.
- **Telegram Login Widget:** widget imzolangan user datani qaytaradi; `/auth/telegram/callback` bot-token bilan HMAC-SHA256 hash'ni tekshiradi, `telegram_id` upsert, session. Bot token 2-bosqichда bor.

Ikkalasi ham **bepul, SMS'siz**.

### Sahifalar / UI
- `/kirish` — Google + Telegram tugmalari (noindex).
- `/kabinet` — profil + buyurtma tarixi (`orders WHERE customer_id = me`) (noindex, guard).
- `Header`: login bo'lmasa "Kirish"; login bo'lsa ism/avatar → `/kabinet`, chiqish.
- Login bo'lganda `OrderForm` ism+telefon avto-to'ladi, buyurtmaga `customer_id` biriktiriladi.

### Teginadigan fayllar
`app/routes/auth.google*.tsx`, `auth.telegram.tsx`, `requireCustomer` guard, `Header.tsx`, `LoginPage`/`AccountPage`, `functions/lib/db.ts` (customers mapperlar), `SiteConfigForm.tsx` (OAuth kalitlari), migratsiya `0016`, i18n, SEO noindex.

---

## 7. site_config / settings yangi maydonlar (jamlangan)

| Maydon | Joy | Bosqich | Izoh |
|--------|-----|---------|------|
| `paymentMode` | site_config | 1 | `both`\|`cash`\|`installment` |
| `downPaymentMaxPercent` | settings | 1 | Slider maksimumi (masalan 90) |
| `telegramBotToken` | site_config | 2 | Bot API tokeni (buyurtma + tg-login) |
| `telegramOrderChatId` | site_config | 2 | Buyurtma tushadigan chat/guruh |
| `telegramLoginBot` | site_config | 3 | Login widget bot username |
| `googleClientId` / `googleClientSecret` | site_config | 3 | Google OAuth |
| `customerSessionSecret` | site_config | 3 | Auto-generatsiya (seed) |

---

## 8. Xavfsizlik

- **Sirlar D1'da** — bot token, Google secret, session secret `site_config`da (do'konning o'z DB'si). Mavjud naqsh (admin login/parol/`session_secret` ham D1'da, `wrangler secret` yo'q — bepul tarif). Admin panel ularni `password`-input sifatida ko'rsatadi.
- **`/api/order`:** honeypot + qat'iy validatsiya. **Muddatli narx serverda qayta hisoblanadi** — mijoz yuborgan oylik/jami/boshlang'ichga ishonilmaydi. Suiiste'mol bo'lsa Cloudflare WAF/rate-limit (dashboard). <!-- ponytail: honeypot yetarli; abuse ko'rilsa CF rate-limit -->
- **OAuth:** `state` (CSRF, cookie bilan tekshiriladi); Telegram hash bot-token bilan verify; sessiya cookie `HttpOnly; Secure; SameSite=Lax`.
- Mijoz sessiyasi admin sessiyasidan izolyatsiya (boshqa cookie + sekret) — mijoz admin panelga kira olmaydi.

---

## 9. i18n / SEO

- Barcha yangi matnlar `src/locales.ts`da **uz+ru parity** (lint tekshiradi). Admin UI o'zbekcha.
- `/kirish`, `/kabinet`, order modal — **noindex**. `/api/order`, `/auth/*` — indekslanmaydi/kesh qilinmaydi (`workers/app.ts` kesh qoidalariga `/auth/*` qo'shiladi).
- Product JSON-LD `offers.price` = naqd `minPriceUzs` (o'zgarmaydi).

---

## 10. Qaror qilingan (2026-07-06)

1. **paymentMode default = `both`** — Taqsit Store instansiyasi naqd+muddatli ikkalasini ko'rsatadi.
2. **Slider birligi = foiz** (`downPaymentPercent`→`downPaymentMaxPercent`, masalan 30%→90%).
3. **Muddat = oddiy oy select** (3/6/9/12, mavjud `settings.terms`). Nomli planlar (Prestige/Standart…) YAGNI — kerak bo'lsa keyin.
4. **Telegram = guruhga** — `telegramOrderChatId` guruh chat_id'si (bir nechta menejer ko'radi). Bot guruhga admin qilib qo'shiladi (setup hujjatlanadi).

---

## 11. Muvaffaqiyat mezoni

- Naqd xaridor kartada naqd narxni **darhol** ko'radi; muddatli xaridor yonida "oyiga X so'mdan"ni ko'radi.
- **"Hoziroq xarid qilish"** → ism+telefon → buyurtma botga + admin "Buyurtmalar"da.
- **"Muddatli to'lovga olish"** → muddat + boshlang'ich slider (min→max, oylik real-time) → ism+telefon → buyurtma (muddatli konteksti bilan) botga + admin'da.
- Mijoz Google/Telegram bilan 1 bosishda kiradi; keyingi buyurtmada forma avto-to'ladi; `/kabinet`da tarix.
- Boshqa kompaniyaga moslashda faqat config o'zgaradi (`paymentMode`, tokenlar, brend) — komponent kodi emas.
