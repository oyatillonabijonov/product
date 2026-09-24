# Billz qulflari va MCP kengaytmasi — dizayn (2026-09-24)

## 1. Muammo

1. **Qo'lda o'zgartirish qaytib ketadi.** Billz tovarini admin'da yoki MCP orqali o'zgartirsangiz,
   30 daqiqadan keyin sinxronizatsiya ko'p maydonni Billz qiymatiga qaytaradi. Hozir faqat 4 ta
   maydonda (narx, xususiyatlar, tavsif, kategoriya) qo'lda qulf bor va u ham **alohida toggle**
   bilan yoqiladi — nom, brend, rasm va ko'rinish esa har doim Billz'niki. Egasining so'zi bilan:
   «tovarni qayerinidir o'zgartirdim va u 30 daqiqada eski holatga qaytsa — bu cringe».
2. **Qoldig'i 0 tovar yashiriladi.** Billz qoidasi `is_active = qoldiq > 0 && rasm bor`. Egasi:
   omborda bo'lmasa ham tez olib keladi — ya'ni bunday tovar sotiladi, yashirish daromadni yo'qotadi.
3. **MCP'da yetishmaydigan imkoniyatlar:** chegirma (eski narx) qo'yib bo'lmaydi; yangi tovar
   yashirin yaratiladi va admin'dan yoqish kerak; `specs` butun ro'yxatni almashtiradi (bitta
   qator qo'shaman deb qolgan hammasini o'chirib yuborish mumkin); chatga tashlangan rasmni saytga
   qo'yishning yo'li yo'q.

## 2. Egasining qarorlari (2026-09-24)

1. **Qo'lda o'zgartirilgan har bir maydon qoladi** — faqat MCP uchun emas, butun tizim standarti.
2. **Ko'rinish:** yashirish qoladi (qulflanadi); ko'rsatish qulfni yechadi va avtomatik qoidaga qaytaradi.
3. **Qoldig'i 0 tovar oddiy tovardek chiqadi** — hech qanday yozuvsiz, muddatni operator telefonda aytadi.
4. **Chatdagi rasm — bir martalik yuklash havolasi** orqali (claude.ai rasm faylini tool'ga uzata olmaydi).
5. **MCP yaratgan tovar darhol faol.**
6. **Qulf mexanizmi — saqlash paytida tegilgan maydonni belgilash** (§3), server farqi yoki butun tovarni uzish emas.

## 3. Qulf modeli

### Maydonlar

`products.manual_fields` — vergulli matn, `shared/billz.ts` `MANUAL_FIELDS`. 4 tadan 8 taga:

| Kalit | Nimani qamraydi | Holat |
|---|---|---|
| `price` | `cash_price_uzs` + `old_price_uzs` | bor edi |
| `specs` | `product_specs` | bor edi |
| `description` | `description` | bor edi |
| `category` | `category_id` + `type` | bor edi |
| `name` | `name` | **yangi** |
| `brand` | `brand_id` | **yangi** |
| `images` | `image_url` + `product_images` | **yangi** |
| `hidden` | ko'rinish (§4) | **yangi** |

`billz_stock` hech qachon qulflanmaydi — u ombordan keladigan haqiqat.

**Migratsiya kerak emas:** ustun matnli, `parseManualFields` notanish kalitni tashlab yuboradi, ya'ni
`MANUAL_FIELDS` ga kalit qo'shish yetarli; mavjud qiymatlar o'z kuchida qoladi.

### Qanday qulflanadi

Sof funksiya `applyManualEdits(locks, before, after): ManualField[]` (`shared/billz.ts`, testli).
`before` — foydalanuvchi ko'rgan holat, `after` — saqlanayotgan holat (ikkalasi ham
`PUT /api/admin/products/:id` tanasi shaklida). Har guruhni solishtiradi va tegilganini qulflarga
qo'shadi. Ko'rinish alohida: `isActive` `true → false` bo'lsa `hidden` qo'shiladi, `false → true`
bo'lsa `hidden` **olib tashlanadi**.

Qulf faqat Billz tovarida (`billz_id IS NOT NULL`) ma'noga ega; qo'lda kiritilgan tovarga
sinxronizatsiya umuman tegmaydi.

**Uch ishlatuvchi — qoida bitta, hammasi shu funksiyadan:**
- admin forma (`before` = yuklangan tovar, `after` = forma),
- MCP (`before` = `detailToInput(joriy)`, `after` = yangi tana) — `manualFieldsFor` shu bilan almashadi,
- `PATCH /api/admin/products/:id {isActive}` (admin ro'yxatidagi toggle va MCP yashirish tool'i) —
  server tomonda: Billz tovarida yashirish `hidden` qo'shadi, ko'rsatish olib tashlaydi.

### Nega server farqi emas

Server «bazada bor qiymat ≠ kelgan qiymat» bo'yicha qulflasa, bitta tez-tez uchraydigan holat
buziladi: tovarni 10:00 da ochdingiz, 10:15 da sinxronizatsiya narxni yangiladi, 10:20 da **faqat
tavsifni** o'zgartirib saqladingiz. Forma eski narxni ham yuboradi, server uni «o'zgartirilgan»
deb ko'rib **eski narxni abadiy qulflaydi**. Tegilgan maydonni mijoz tomoni biladi: bu holatda
narx qulflanmaydi, `PUT` eski narxni yozadi, keyingi sinxronizatsiya uni to'g'rilaydi — o'z-o'zidan tuzaladi.

## 4. Ko'rinish qoidasi

Sof funksiya `billzVisible({ hasImage, hiddenLocked }) = hasImage && !hiddenLocked`
(`shared/billz.ts`, testli). **Qoldiq qoidadan chiqadi.**

U **ikki joyda bir xil** ishlatiladi:
1. **Sinxronizatsiya** — `mapBillzProduct`, `mergeDuplicates` va `keepSiteImage` dagi
   `stock > 0 && imageUrl !== ''` shu funksiyaga almashadi.
2. **Saqlash** — `PUT` va `PATCH {isActive}` Billz tovarida `is_active` ni so'rovdan emas, shu
   funksiyadan hisoblaydi (rasm bormi + yangi qulflarda `hidden` bormi). Natija: **Billz tovariga
   rasm qo'shilsa u darhol saytda chiqadi**, 30 daqiqa kutmaydi.

Oqibat: admin'da rasmsiz Billz tovarini «ko'rsat» qilsangiz, qulf yechiladi, lekin tovar rasm
qo'yilmaguncha yashirin qoladi — izohda shunday yoziladi.

Run oxirida Billz'dan yo'qolgan tovarni yashirish (`hiddenIds`) o'zgarmaydi — bu mavjudlik haqida, qoldiq haqida emas.

## 5. Sinxronizatsiya

- **Billz nomi alohida ustunda — `products.billz_name`** (migratsiya `0043`). Hozir tovar
  **saytdagi nom** bo'yicha topiladi (`server/billz-sync.ts` `byName`/`findRow`, nom — birinchi
  navbatda). Nom qulflanadigan bo'lsa bu ikki xatoga olib keladi:
  - **o'g'irlash:** «iPhone 17 Pro Sim/E-sim / Silver» ni «iPhone 17 Pro» deb qayta nomladingiz,
    Billz'da esa boshqa «iPhone 17 Pro» tovar bor → uning narxi va qoldig'i **sizning tovaringizga** yoziladi;
  - **dublikat:** guruh vakili almashsa va nom mos kelmasa, yangi takror tovar yaratiladi.

  Yechim: moslashtirish (`byName`, `findRow`, run oxiridagi `seenNames`) `billz_name` bo'yicha,
  saytda — `name`. Sinxronizatsiya `billz_name` ni har run yozadi, u hech qachon qulflanmaydi.
  Migratsiya Billz qatorlarida `billz_name = name` bilan to'ldiradi — bu aniq, chunki shu kungacha
  qayta nomlash hech qachon saqlanib qolmagan.
- **Qulflangan maydon `UPDATE` dan chiqariladi:** `name`, `brand_id`, `image_url` + galereya
  (`images`), mavjudlari o'z holicha. `is_active` — §4 bo'yicha.
- `images` qulflangan bo'lsa ko'rinish saytdagi rasm bo'yicha hisoblanadi (Billz rasmi e'tiborga olinmaydi).

## 6. Admin panel

- **Billz tovari oddiy tovardek tahrirlanadi.** «Qo'lda tahrirlash» toggle'lari va faqat-o'qish
  qatorlari olib tashlanadi. Billz tovarida nom — **oddiy matn maydoni**, model qidiruvi emas
  (model tanlash nom, brend, kategoriya va xususiyatlarni birdaniga to'ldiradi — to'rttasini bir
  bosishda jimgina qulflardi).
- **Manba belgisi:** har maydonda (Ma'lumot kartasida — nom, brend, kategoriya, tavsif alohida;
  Rasmlar, Narx, Xususiyatlar, Holat kartalarida — sarlavhada) **«Billz»** yoki **«Qo'lda · Billz'ga
  qaytarish»**. Qaytarish qulfni yechadi; izoh: «keyingi sinxronizatsiyada (30 daqiqagacha) Billz qiymati qaytadi».
- **Oldindan ko'rinadi:** belgi joriy forma bo'yicha `applyManualEdits` bilan jonli hisoblanadi —
  maydonni tahrirlashingiz bilan, saqlashdan oldin «Qo'lda» chiqadi.
- **Izohlar:** Holat — «Yashirsangiz shunday qoladi. Ko'rsatsangiz — rasmi bo'lsa saytda chiqadi.»;
  Rasmlar — «Rasm yuklasangiz, Billz rasmi uni almashtirmaydi.»
- **Bosh sahifa «Rasm kerak»** (`api.admin.dashboard`) — `billz_stock > 0` sharti olib tashlanadi.
- **Ro'yxat ustidagi «nega ko'rinmaydi»** (`summaryText`) — sabablar: **rasm yo'q · qo'lda
  yashirilgan · Billz'da endi yo'q**. «Qoldiq tugagan» sababi chiqadi; ilgari Billz'dan o'chirilgan
  tovarlar «qo'lda yashirgansiz» deb noto'g'ri sanalardi.
- «Qoldiq tugagan» **tez filtri** qoladi — ma'lumot uchun.

## 7. MCP

- **Qulflar** — `product_update` va `product_set_images` `applyManualEdits` dan foydalanadi. Nom va
  rasm Billz tovarida endi qoladi. `product_set_visibility` javobidagi «30 daqiqada qaytib ochilishi
  mumkin» ogohlantirishi olib tashlanadi; rasmsiz Billz tovarini ko'rsatganda — «rasm yo'q, saytda
  chiqishi uchun rasm qo'shing».
- **Chegirma** — `product_update`: `oldPriceUzs` (son yoki `null` — chegirmani olib tashlash);
  `variantPrices[].oldPrice`. Eski narx yangisidan katta bo'lmasa — hech narsa yozilmaydi, sodda
  sabab. Javob foizni sayt bilan **bir xil formulada** aytadi (`src/lib/installment.ts`
  `discountPercent`: `round((eski − yangi) / eski × 100)`):
  > • 256GB — 25 000 000 so'm, chegirmada (eski narx 28 000 000). Saytda «−11%» belgisi chiqadi.
- **Yangi tovar darhol faol** — `product_create` `isActive: true`. Rasmsiz yaratilsa javob:
  «Saytda rasmsiz chiqdi» + yuklash havolasini taklif qilish.
- **Xususiyatlar** — `specs` **nom bo'yicha qo'shadi/yangilaydi** (katta-kichik harf va bo'shliq
  farq qilmaydi), qolganlariga tegmaydi; `removeSpecs: string[]` — o'chirish. Javobda natijaviy ro'yxat.
  `product_create` dagi `specs` — boshlang'ich ro'yxat, o'zgarmaydi.
- **Tavsif** butun matn sifatida qoladi; tool tavsifida: «qo'shimcha kerak bo'lsa avval o'qing va
  to'liq yangi matnni yuboring».
- **Yangi tool `image_upload_link`** — §8.

## 8. Yuklash havolasi

**Oqim:** Claude `image_upload_link(id)` chaqiradi → chatga havola beradi → egasi bosadi → telefonda
oddiy sahifa (tovar nomi, hozirgi rasmlar, **«Rasm tanlash»** — galereya yoki kamera) → tanlangan
rasmlar admin'dagi kabi tozalanib (`normalizeImage`: chekka kesiladi, kichraytiriladi, WebP)
**qo'shiladi** — asosiy rasm bo'lmasa birinchisi asosiy bo'ladi → sahifa «N ta rasm qo'shildi» deydi.

**Qismlar:**
- `POST /api/admin/products/:id/upload-link` (`requireAdmin`, bearer ham) → `{ url, expiresAt }`.
  React Router route — `functions/lib/auth` ni ishlata oladi.
- `GET/POST /yuklash/:token` — React Router route: `loader` tokenni tekshirib tovarni ko'rsatadi,
  `action` multipart qabul qilib `ImageStore` ga yozadi va tovarga qo'shadi. Billz tovarida `images`
  qulflanadi va ko'rinish §4 bo'yicha qayta hisoblanadi — ya'ni rasm qo'shilgan tovar **darhol** saytda.
- MCP tool — shunchaki shu API'ni chaqiradi.

**Xavfsizlik:**
- Token **holatsiz** — `{ productId, exp }` ni `admin_auth.session_secret` bilan HMAC imzolaydi
  (`functions/lib/auth` `createSession`/`verifySession` naqshi). Jadval kerak emas.
- **30 daqiqa**, **faqat bitta tovar**, faqat rasm **qo'shadi** (o'chirmaydi, boshqa maydonga tegmaydi).
- Admin parolini almashtirish `session_secret` ni aylantiradi — **hamma ochiq havolalar o'ladi**.
- Cheklovlar `api.admin.upload` bilan bir xil: JPG/PNG/WebP, ≤ 5 MB; bir so'rovda ≤ 10 fayl;
  IP bo'yicha rate limit (`shared/rate-limit.ts` `createLimiter`).
- `NO_CACHE` va `robots.txt` ga `/yuklash`; sahifa `noindex`.
- Eskirgan/buzuq havola — do'stona sahifa: «Havola eskirgan — Claude'dan yangisini so'rang».

## 9. Deploy'dan keyin

- **Katalog kengayadi:** qoldig'i 0, rasmi bor Billz tovarlari birinchi sinxronizatsiyada (≤ 30
  daqiqa) saytda paydo bo'ladi. `catalog_stats` dagi «faol» soni ham oshadi.
- Migratsiya `0043` o'zi qo'llanadi (Dockerfile `CMD`).
- Mavjud qulflar o'z kuchida.

## 10. Test

Sof mantiq (vitest):
- `applyManualEdits` — har guruh; tegilmagan maydon qulflanmaydi; `hidden` qo'shiladi va olib tashlanadi;
  sinxronizatsiya tahrir paytida kelgan holat (§3 misoli) narxni qulflamaydi.
- `billzVisible` — to'rtala kombinatsiya.
- Sinxronizatsiya moslashtirishi `billz_name` bo'yicha — qayta nomlangan tovar o'g'irlanmaydi.
- `mapBillzProduct`/`mergeDuplicates` — qoldiq 0 + rasm → faol.
- MCP: `specs` qo'shish/yangilash/o'chirish; chegirma validatsiyasi va foiz matni.
- Yuklash tokeni: imzo, muddat, boshqa tovar, buzilgan token.

Qo'lda: admin'da Billz tovarining nomini o'zgartirish → sinxronizatsiyani qo'lda ishga tushirish →
nom qolgani; MCP bilan chegirma va xususiyat; yuklash sahifasi telefon o'lchamida.

## 11. Maqsad emas

- Saytda «Buyurtma asosida» yozuvi — egasi rad etdi. PC konfiguratordagi mavjud yozuv o'z holicha qoladi.
- Billz tovariga variant qo'shish.
- Yuklash havolalari uchun admin ekrani.
- Chatga tashlangan rasm faylini to'g'ridan-to'g'ri olish — claude.ai'da imkonsiz.

## 12. Bosqichlar

1. **Qulf modeli va sinxronizatsiya** — `MANUAL_FIELDS`, `applyManualEdits`, `billzVisible`,
   migratsiya `0043` (`billz_name`), sync o'zgarishlari, `PUT`/`PATCH` dagi ko'rinish va qulf.
2. **Admin** — forma, manba belgilari, izohlar, dashboard va `summaryText`.
3. **MCP** — qulflar, chegirma, faol yaratish, xususiyatlar.
4. **Yuklash havolasi** — API, sahifa, tool.
5. **Hujjat** — `CLAUDE.md`, `mcp/README.md`, egasi qo'llanmasi.

Har bosqich o'zi ishlaydigan holatda tugaydi.
