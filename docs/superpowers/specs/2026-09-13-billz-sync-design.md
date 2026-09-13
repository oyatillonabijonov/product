# Billz integratsiyasi — faqat o'qish sinxronizatsiyasi (dizayn, 2026-09-13)

Do'kon egasi ombor, narx va qoldiqni **Billz**da (billz.io, POS/ombor tizimi) yuritadi.
Sayt shu ma'lumotni **bir yo'nalishda** oladi: Billz → sayt. Billz'ga hech narsa yozilmaydi.

## 1. Kontekst — Billz'dagi haqiqiy holat (2026-09-13 da API orqali ko'rildi)

- Kompaniya "Pro", ikki do'kon: **ProDuct** (`d9900a7d-…`, kassalar "Apple"/"PC") va **Sklad**. Sayt uchun manba — ProDuct.
- **1 584 tovar** (saytda 33 ta qo'lda kiritilgan). Hammasi **USD**da (`retail_currency: "USD"`); Billz'ning kurs jadvali bo'sh (`/v2/company-currency-rates` → `rates: null`), demak kurs saytniki (`settings.usdToUzs`).
- ProDuct'da qoldiqli 894 ta; rasmli 482 ta (qoldiqli+rasmli 283: Apple 128, PC 154); tavsifli 264 ta (rich-editor HTML). Promo narx hech birida yo'q.
- `custom_fields` ichida **`Nad Kategoriya`** = yo'nalish: `Apple` 843, `PC` 715 (bitta `Pc`, 19 ta bo'sh). Audio/Video hali yo'q.
- Billz kategoriyasi (103 ta ishlatilgan) = qurilma turi: MacBook 139, Mouse 109, Keyboard 105, PC Case 90, Air Pods 88, iPad 74, iPhone 68, CPU 36, Motherboard 36, GPU 27, Monitor 29, DDR5 19, SSD M2 17 …
- Variantlar Billz'da **alohida tovar** ("iPhone 17 Pro 512GB Cosmic Orange"): 434 tasida `parent_id` bor, lekin har ota guruhda **bitta** bola, ota yozuvlar `/v2/products`da qaytmaydi. Xulosa: **1 Billz tovar = 1 sayt mahsuloti, variantsiz.**
- Boshqa custom field'lar: `Память` (128GB…), `Цвет` (Black…), `Состояние` — nomiga qaramay **chip** saqlanadi (A16, M5, M4 Pro). Ishlatilgan/yangi belgisi Billz'da yo'q.
- Rasmlar DigitalOcean Spaces'da (`https://fra1.digitaloceanspaces.com/billz2-minio-billz/<uuid>.jpg`); hujjat: "CDN'dan to'g'ridan-to'g'ri bermang, o'zingizda keshlang".
- Webhook yo'q — **polling**. Chegara **2 so'rov/s**, oshsa `429`.

### Billz API qisqacha (docs.billz.io)

| Maqsad | So'rov |
|---|---|
| Login | `POST /v1/auth/login` `{secret_token}` → `data.access_token` (15 kun), `refresh_token` (30 kun) |
| Tovarlar | `GET /v2/products?limit=200&page=N` (`limit` ≤ 300, `page` ≤ 10 000) → `{count, products[]}`; delta: `&last_updated_date=YYYY-MM-DD HH:MM:SS` (UTC) |
| Do'konlar | `GET /v1/shop` → `{count, shops[{id,name,cash_boxes[]}]}` |
| Sarlavha | `Authorization: Bearer <access_token>` |
| Asos URL | `https://api-admin.billz.ai` |

Tovar maydonlari (kerakligi): `id`, `name`, `sku`, `barcode`, `parent_id`, `brand_id`, `brand_name`,
`categories[{id,name}]`, `description` (HTML), `updated_at`, `main_image_url_full`,
`photos[{photo_url, sequence, is_main}]`, `custom_fields[{custom_field_name, custom_field_value}]`,
`product_attributes[{attribute_name, attribute_value}]`,
`shop_prices[{shop_id, retail_price, retail_currency, promo_price, promos}]`,
`shop_measurement_values[{shop_id, active_measurement_value}]`.

## 2. Maqsad emas (YAGNI)

- Billz'ga **yozish** (savdo, kechiktirilgan chek, mijoz yaratish) — yo'q. Buyurtmalar avvalgidek Telegram + admin "Buyurtmalar"; savdoni operator Billz'da o'zi o'tkazadi. Kelajakda "tasdiqlangan buyurtma → kechiktirilgan chek" alohida ish.
- Variantlar (`product_options`/`product_variants`) Billz'dan yig'ilmaydi — Billz'da ular alohida tovar.
- Billz kategoriyalarini saytga alohida jadval sifatida ko'chirish — yo'q; ular `type` registriga alias orqali tushadi.
- Rasmlarni server tomonida qayta ishlash (trim/webp) — yo'q; asl fayl saqlanadi.
- Sinxronizatsiya tarixi jadvali — yo'q; faqat oxirgi natija.

## 3. Qarorlar (2026-09-13, do'kon egasi bilan)

1. **Ko'lam: faqat o'qish.** Katalog, narx, qoldiq, rasm — Billz → sayt.
2. **Rasmsiz tovarlar** bazaga tushadi, lekin saytda **rasm qo'yilguncha ko'rinmaydi**. Rasmni admin panelda ham, Billz'da ham qo'yish mumkin.
3. Qoldig'i 0 tovar saytda ko'rinmaydi.
4. Narx = USD × `usdToUzs`, **1 000 so'mga** yaxlitlanadi.
5. Billz'dan kelmagan eski 33 mahsulotga tegilmaydi — egasi keyin o'zi o'chiradi.
6. Token prod'dan oldin almashtiriladi; sirlar faqat `site_config`da (env yo'q).

## 4. Arxitektura

```
server/index.ts ──creates──▶ server/billz-sync.ts (runner: qulf + rejalashtirgich)
       │                              │ uses
       │ getLoadContext               ▼
       ▼                       shared/billz.ts (sof: mijoz + moslashtirish, testli)
route'lar: context.billz ───▶ api.admin.billz.tsx (holat / ishga tushirish / do'konlar)
```

- **Runner** (`server/billz-sync.ts`) — Docker `server/` va `shared/`ni tashiydi, `functions/`ni **tashimaydi**; shuning uchun sinxronizatsiya kodi `server/` + `shared/`da turadi va SQL'ni `Env` shartnomasi (`shared/runtime.ts`) orqali yozadi. `imagesAndSpecsStatements` `functions/lib/db.ts`dan `shared/product-statements.ts`ga ko'chadi (db.ts re-export qiladi) — admin route'lar va sinxronizatsiya bitta builder'ni ishlatadi.
- **Bitta jarayon, bitta qulf**: runner xotirada `running` bayrog'ini saqlaydi; rejalashtirgich ham, admin tugmasi ham shu runner'ni chaqiradi — ikki sinxronizatsiya bir vaqtda yurmaydi.
- **Rejalashtirgich**: boot'dan 10 s keyin **to'liq**; keyin har **30 daqiqada delta**, har **6 soatda to'liq** (to'liq 1 584 tovar = 8 sahifa ≈ 5 s API vaqti — arzon; delta o'chirilganlarni ko'rmaydi, `updated_at` qoldiq o'zgarishida yangilanishiga ishonch yo'q, shuning uchun to'liq sinxronizatsiya tez-tez). Token bo'sh bo'lsa tick hech narsa qilmaydi.
- **JWT diskka yozilmaydi** — xotirada, muddati bilan; `401` kelsa bir marta qayta login va so'rov takrorlanadi. Restart → qayta login (deploy haftada bir — arzimas).
- **Delta kursori** xotirada: muvaffaqiyatli har run'dan keyin `lastSyncedAt = runStartUtc`. Restart → to'liq run, kursor yangidan.
- Route'lar runner'ni `context.billz` orqali ko'radi (`app/load-context.d.ts` kengayadi: `billz: BillzSyncHandle`). Dev'da ham, prod'da ham `server/index.ts` bitta.

## 5. Ma'lumot modeli — migratsiya `0029_billz.sql`

```sql
ALTER TABLE site_config ADD COLUMN billz_secret_token TEXT NOT NULL DEFAULT '';  -- SIR
ALTER TABLE site_config ADD COLUMN billz_shop_id      TEXT NOT NULL DEFAULT '';
ALTER TABLE site_config ADD COLUMN billz_last_sync    TEXT NOT NULL DEFAULT '';  -- JSON, server yozadi
ALTER TABLE products    ADD COLUMN billz_id    TEXT;
ALTER TABLE products    ADD COLUMN billz_stock INTEGER;
CREATE UNIQUE INDEX idx_products_billz_id ON products(billz_id) WHERE billz_id IS NOT NULL;
```

- `billz_last_sync` JSON: `{at, mode: 'full'|'delta', ok, count, seen, inserted, updated, hidden, photos, error}`.
- `billz_secret_token` `publicSiteConfig` ro'yxatiga qo'shiladi (mijozga hech qachon bormaydi). `billz_last_sync` sir emas, lekin faqat admin route o'qiydi.
- Admin `site-config` PUT'i `billz_secret_token`, `billz_shop_id`ni yozadi; `billz_last_sync`ni **yozmaydi** (server mulki, `customer_session_secret` kabi).
- `ApiProduct` ga `billzId: string | null`, `billzStock: number | null` qo'shiladi; `ProductInput` ularni `Omit` qiladi — admin PUT `billz_id`ga tegmaydi (UPDATE ustunlar ro'yxati aniq).

### Egalik: qaysi ustunni kim yozadi

| Ustun | Insert (yangi Billz tovar) | Har sinxronizatsiyada | Egasi (admin) |
|---|---|---|---|
| `id`, `slug`, `created_at`, `sort_order`, `condition`, `condition_note`, `rating_avg`, `review_count` | sinx. (`condition='yangi'`, reyting NULL/0) | **tegilmaydi** | tahrirlaydi |
| `name`, `cash_price_uzs`, `old_price_uzs`, `brand_id`, `category_id`, `category` (legacy), `type`, `description`, `billz_stock`, `is_active`, `product_specs` | sinx. | **qayta yoziladi** | tahrirlasa keyingi sinx. qaytaradi (panelda yozilgan) |
| `image_url`, `product_images` | Billz'da rasm bo'lsa | Billz'da rasm **bo'lsa** qayta yoziladi; bo'lmasa saytdagisi (admin yuklagani) **saqlanadi** | rasmsiz tovarga yuklaydi |
| `billz_id` | sinx. | o'zgarmas | — |

Billz'dan kelmagan mahsulotlar (`billz_id IS NULL`) sinxronizatsiya uchun mavjud emas.

## 6. Moslashtirish — `shared/billz.ts` (sof, testli)

`mapBillzProduct(raw, ctx) → MappedProduct | null`, `ctx = { shopId, usdToUzs, categoryIds: Set, brandsByName: Map<lower, id>, existingImage: string | null }`.

- **Do'kon**: `shop_prices`/`shop_measurement_values` ichidan `shop_id === ctx.shopId` yozuvi; narx yozuvi yo'q → `null` (tovar o'tkazib yuboriladi, `skipped` sanaladi).
- **Narx**: `retail_currency === 'USD'` → `round(retail_price × usdToUzs / 1000) × 1000`; `'UZS'` → `round(/1000)×1000`; boshqa valyuta → `null` (o'tkazib yuboriladi). `promo_price > 0` bo'lsa: `cash = promo`, `old = retail` (ikkalasi ham o'girilgan); aks holda `old = null`.
- **Qoldiq**: `active_measurement_value` (butun son, `< 0` → 0). Yozuv yo'q → 0.
- **Yo'nalish** (`category_id`): `Nad Kategoriya` qiymati `trim().toLowerCase()` → `ctx.categoryIds`da bo'lsa shu, bo'lmasa `null`. (`Pc` → `pc`; `Audio`/`Video` yo'nalishi saytda bor — Billz'da qiymat paydo bo'lsa o'zi tushadi.)
- **Tur** (`type`): Billz kategoriyalarining **birinchisi**ning nomi → `typeForBillzCategory(categoryId, name)` (registr `label` yoki `billz[]` aliaslari, katta-kichik harfsiz). Yo'nalish `null` bo'lsa tur ham `null`. Aliaslar `shared/product-types.ts`da har turning `billz?: string[]` maydonida:

| Yo'nalish | Tur | Billz kategoriya nomlari |
|---|---|---|
| apple | iphone | iPhone |
| apple | ipad | iPad, iPad Pro, iPad Air, iPad mini |
| apple | macbook | MacBook, MacBook Pro, MacBook Air |
| apple | imac | iMac |
| apple | mac-mini | Mac mini, Mac Studio, Mac Pro |
| apple | apple-watch | iWatch, Watch, Apple Watch |
| apple | airpods | AirPods, Air Pods |
| apple | aksessuar | Phone Case, Case, Cable, Glass, Charger, Adapter, Bag, Trackpad, Keyboard, Mouse, Magic Mouse, Magic Keyboard, Pencil, HUB, Kronshteyn, Combo, Speaker, Headset, Mousepad, Apple TV, Chair |
| pc | noutbuk | Noutbuk, Laptop, Notebook |
| pc | tayyor-pc | Tayyor PC, PC, Monoblock, Mini PC |
| pc | cpu | CPU, Processor |
| pc | gpu | GPU, Videokarta, Video Card |
| pc | motherboard | Motherboard |
| pc | ram | RAM, DDR4, DDR5 |
| pc | xotira | SSD, SSD M2, SSD M.2, NVMe, HDD, External SSD, External HDD |
| pc | korpus | PC Case, Case, Korpus |
| pc | psu | PSU, Power Supply |
| pc | sovutish | Liquid Cooler, CPU Cooler, Cooler, Fan, Fans |
| pc | monitor | Monitor |
| pc | aksessuar | Mouse, Keyboard, Mousepad, Glasspad, Headset, Speaker, Cable, HUB, Kronshteyn, Combo, Chair, Bag, Webcam, Microphone, Glass |

  Topilmasa `null` — tovar katalogda qoladi, tile qatorida yo'q. Ro'yxat kengaytirish = bitta faylda alias qo'shish.
- **Brend**: `brand_name` bo'sh emas → `brandsByName.get(lower)`; yo'q bo'lsa `newBrand: {id: slug(brand_name), name}` qaytadi va runner `brands`ga qo'shadi (id to'qnashsa `-2`). `brand_name` bo'sh → `null`.
- **Nom**: `name.trim()`; bo'sh → o'tkazib yuboriladi.
- **Slug** (faqat insert'da): `asciiSlug(name) || 'tovar'` + `-` + `billz_id`ning birinchi 8 belgisi — bazaga qaramay noyob, nom o'zgarsa URL o'zgarmaydi.
- **Tavsif**: HTML → oddiy matn: `<br>`, `</p>`, `</div>`, `</li>` → `\n`; qolgan teglar o'chadi; `&nbsp; &amp; &lt; &gt; &quot; &#39;` dekodlanadi; 3+ bo'sh qator → 2; `trim()`; bo'sh → `null`. `ProductPage` `whitespace-pre-line` bilan ko'rsatadi.
- **Xususiyatlar** (`product_specs`, replace-all): `custom_fields` ichidan `Память→Xotira`, `Цвет→Rang`, `Состояние→Chip`; qiymati bo'sh, `_`, `___`, `—` bo'lsa tashlanadi. `Nad Kategoriya`, `Postavshik` kirmaydi. `product_attributes` (`Цвет`) `custom_fields`da yo'q bo'lsa `Rang` sifatida qo'shiladi.
- **Rasmlar**: `photos[]` `sequence` bo'yicha; `is_main` birinchi. Har URL → kalit `products/billz-<sha1(url) hex>.<ext>` (`ext` URL'dan, `jpg|jpeg|png|webp` dan boshqasi tashlanadi). `image_url = /images/<birinchi kalit>`, `product_images` = qolganlari. `photos` bo'sh → `image_url = ctx.existingImage` (admin yuklagani qoladi), `product_images` tegilmaydi.
- **Legacy `category`** (NOT NULL ustun): yo'nalish `apple` bo'lsa tur bo'yicha `iphone`/`ipad`/`mac`, boshqa hamma holda `pc`.
- **Ko'rinish**: `is_active = billz_stock > 0 && image_url !== ''`.
- **`condition`**: faqat insert'da `'yangi'`.

Yordamchi sof funksiyalar: `toUzs(amount, currency, rate)`, `htmlToText(html)`, `asciiSlug(s)`, `photoKey(url)`, `typeForBillzCategory(categoryId, name)`, `hiddenIds(dbIds, seenIds)`.

## 7. Sinxronizatsiya algoritmi — `server/billz-sync.ts`

```
run(mode):
  if running → return {error:'sync_running'}; running = true; startUtc = now
  cfg = site_config (token, shop_id) + settings.usd_to_uzs
  token bo'sh yoki shop_id bo'sh → natija {ok:false, error:'not_configured'}; return
  login (kerak bo'lsa)
  ctx = categories id'lari, brands (lower name → id), existing = SELECT id, billz_id, image_url FROM products WHERE billz_id IS NOT NULL
  page = 1; seen = []
  loop:
    resp = GET /v2/products?limit=200&page=page [&last_updated_date=lastSyncedAt]   (≥500 ms oraliq; 429 → 2 s kutib qayta, 3 marta; boshqa xato → run xato bilan tugaydi)
    for raw in resp.products:
      m = mapBillzProduct(raw, ctx); null → skipped++; continue
      yangi brend → INSERT brands (ctx yangilanadi)
      rasmlar: har kalit uchun IMAGES.get → yo'q bo'lsa yuklab IMAGES.put (4 parallel; host allowlist, ≤5 MB, image/*; xato → shu rasm tashlanadi, hisob `photoErrors`)
      existing.has(billz_id) ? UPDATE (sinx. ustunlari) : INSERT
      + product_specs replace-all; rasmlar bo'lsa product_images replace-all
      seen.push(billz_id)
    env.DB.batch(sahifa statementlari)          // sahifa = bitta tranzaksiya
    if seen.length >= resp.count or products bo'sh → break; page++
  if mode == 'full' and seen.length == count:
    hidden = hiddenIds(existing billz_id'lari, seen) → UPDATE products SET is_active=0, billz_stock=0 WHERE billz_id=?  (har biri)
  lastSyncedAt = startUtc (faqat ok bo'lsa)
  natija → site_config.billz_last_sync + console.log; running = false
```

- To'liq run'da `seen != count` (sahifalash paytida katalog o'zgargan) → yashirish bosqichi **o'tkazib yuboriladi**, natijada `note: 'count_mismatch'`; keyingi to'liq run tuzatadi.
- Delta run yashirmaydi (hujjat: delta o'chirilganlarni ko'rmaydi).
- Rasm yuklab olish API chegarasiga kirmaydi (CDN), lekin 4 paralleldan oshmaydi. Birinchi to'liq run 482 rasm → bir necha daqiqa; keyingilarida fayl bor → o'tkazib yuboriladi.
- Rasm yuklash xatosi tovarni to'xtatmaydi: o'sha URL tashlanadi; birorta rasm qolmasa `existingImage` qoidasi ishlaydi.
- Xatolar (`login_failed`, `http_<code>`, `network`) natijaga yoziladi; `running` har doim `finally`da tushadi.
- Runner interfeysi: `{ status(): {configured, running, last}, run(mode): Promise<'started'|'sync_running'>, shops(): Promise<{id,name}[]>, start(): void }`. `run` **kutmaydi** (fon), admin holatni so'rab turadi.

## 8. Admin

- **Sayt ma'lumotlari** (`SiteConfigForm`) — yangi guruh **"Billz (ombor va narxlar)"**, `optional: true`: `billzSecretToken` (secret, hint: Billz → Sozlamalar → Integratsiya kaliti), `billzShopId` — token saqlangandan keyin "Do'konlarni yuklash" tugmasi `GET /api/admin/billz?shops=1` → select (`ProDuct`, `Sklad`); ro'yxat yuklanmagan bo'lsa oddiy matn maydoni.
- **Billz paneli** (`src/admin/BillzPanel.tsx`, Sozlamalar tabida alohida karta): holat qatori — sozlanmagan / oxirgi sinx. `dd.mm.yyyy hh:mm`, rejim, `seen/inserted/updated/hidden/photos`, xato; ishlayotganda spinner (3 s polling). Tugmalar: **"Sinxronlash"** (delta), **"To'liq sinxronlash"**. Ostida izoh: "Billz'dan kelgan mahsulotlarning nomi, narxi, qoldig'i, turi va tavsifi har sinxronizatsiyada qayta yoziladi; reyting, sharhlar va tartib sizniki. Rasmsiz tovar saytda ko'rinmaydi — rasmni shu yerda yoki Billz'da qo'shing."
- **Mahsulotlar ro'yxati** (`ProductList`): `billzId` bor qatorlarda kichik **"Billz"** belgisi; `billzId && !imageUrl` → **"Rasm kerak"** belgisi (qoldiq > 0 bo'lsa `danger`, aks holda muted); holat filtriga **"Rasm kerak"** varianti. `ProductForm`da Billz tovari uchun rasm yuklagichi ostida izoh (yuqoridagi matnning qisqasi).
- **Kalkulyator sozlamasi** (`SettingsForm`): `usdToUzs` yorlig'i/hint'i "Billz narxlari (USD) shu kurs bilan so'mga o'giriladi — kurs o'zgarsa keyingi sinxronizatsiyada narxlar yangilanadi".
- **API** `app/routes/api.admin.billz.tsx` (`requireAdmin`): `GET` → `status()`; `GET ?shops=1` → `shops()` (401/xato → `{error:'billz_auth'}`); `POST {mode:'full'|'delta'}` → `202 {started:true}` yoki `409 {error:'sync_running'}`, sozlanmagan → `400 {error:'not_configured'}`. `errText.ts`: `sync_running`, `not_configured`, `billz_auth`.

## 9. Xavfsizlik

- Billz'ga faqat `POST /v1/auth/login` va `GET` so'rovlar. Yozuvchi endpoint'lar kodda umuman yo'q.
- Sir faqat serverda: `billz_secret_token` `publicSiteConfig`da bo'shatiladi; admin API `requireAdmin` ortida; JWT loglarga chiqmaydi.
- Rasm yuklab olish: faqat `https:`, host allowlist `['fra1.digitaloceanspaces.com']` (konstanta, kengaytiriladi), ≤ 5 MB, `content-type` `image/*`, redirect'ga ergashilmaydi (`redirect: 'manual'`) — Billz ma'lumoti yarim ishonchli, SSRF'ga yo'l yo'q. Kalit `products/billz-<hash>` — `images.$` route'ining `products/` prefiksi ostida.
- Sahifa so'rovlari bloklanmaydi: sinxronizatsiya fon vazifasi, SQL yozuvlar sahifa-sahifa qisqa tranzaksiyalarda.

## 10. Tekshirish

- `shared/billz.test.ts`: `toUzs` (USD yaxlitlash, UZS, noma'lum valyuta), `htmlToText` (Lexical `<p>`/`<br>`/entity), `asciiSlug`, `photoKey`, `typeForBillzCategory` (alias, katta-kichik harf, begona yo'nalish), `mapBillzProduct` (to'liq namuna: narx/promo, yo'nalish `Pc`, tur, yangi brend, spec'lar, rasm kalitlari, `existingImage` saqlanishi, ko'rinish qoidasi, do'kon yozuvi yo'q → `null`), `hiddenIds`.
- `functions/lib/validate.test.ts`: `parseSiteConfigInput` yangi maydonlar (token trim, `billzLastSync` body'dan kelmaydi).
- Qo'lda (real token, faqat o'qish): admin'da token + do'kon → "To'liq sinxronlash" → panelda `seen=1584`, `inserted≈1584`, `photos≈482`; `/category/apple` va `/category/pc`da tile qatori Billz turlari bilan; rasmli+qoldiqli 283 ta ko'rinadi; "Rasm kerak" filtri ~611 ta beradi; rasmsiz tovarga admin'da rasm yuklab saqlash → saytda paydo bo'ladi; ikkinchi to'liq run → `inserted=0`, `photos=0`.
- `bun run lint`, `bun run test` toza.

## 11. Teginadigan fayllar

- `migrations/0029_billz.sql`
- `shared/billz.ts` (+ `billz.test.ts`), `shared/product-types.ts` (`billz` aliaslari + `typeForBillzCategory`), `shared/product-statements.ts` (`imagesAndSpecsStatements` ko'chadi), `shared/types.ts`
- `server/billz-sync.ts`, `server/index.ts`, `app/load-context.d.ts`
- `app/routes.ts`, `app/routes/api.admin.billz.tsx`, `app/routes/api.admin.site-config.tsx`
- `functions/lib/db.ts` (`ProductRow`/`rowToProduct`, `SiteConfigRow`/`rowToSiteConfig`, re-export), `functions/lib/validate.ts` (`parseSiteConfigInput`, `ProductInput` Omit)
- `app/lib/loaders.ts` (`publicSiteConfig`)
- `src/admin/SiteConfigForm.tsx`, `src/admin/BillzPanel.tsx`, `src/admin/ProductList.tsx`, `src/admin/ProductForm.tsx`, `src/admin/SettingsForm.tsx`, `src/admin/api.ts`, `src/admin/errText.ts`
- `CLAUDE.md`

## 12. Muvaffaqiyat mezoni

- Token + do'kon kiritilgach bir tugma bilan butun Billz katalogi saytda; keyin egasi hech narsa qilmaydi — narx, qoldiq va yangi tovarlar 30 daqiqa ichida, o'chirilganlar 6 soat ichida o'zi yangilanadi.
- Billz'da hech qanday o'zgarish yo'q (faqat o'qish).
- Rasmsiz tovar saytga chiqmaydi; admin "Rasm kerak" ro'yxatidan rasm qo'shib chiqaradi.
- Eski qo'lda kiritilgan mahsulotlar va egasining reyting/sharh/tartib qiymatlari sinxronizatsiyadan zarar ko'rmaydi.
