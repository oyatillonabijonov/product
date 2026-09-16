# Admin panel qayta qurilishi — sayt to'liq boshqariladi, Apple veb-vositalari uslubida (dizayn, 2026-09-15)

Do'kon egasi mijozga ikki narsani va'da qilgan: (1) sayt **hozirgi holatida to'liq admin paneldan boshqariladi**,
(2) admin panel **o'rganish talab qilmaydigan darajada sodda**, professional, Apple dizayn tizimida.

Hozirgi holat (2026-09-15 auditi): admin faqat katalog va operatsion ma'lumotni boshqaradi (mahsulot, buyurtma,
banner, yangilik, blog, sahifa, vakansiya, sozlamalar). Saytning butun **marketing qatlami kodda**: landing'ning
4 yo'nalish kartasi, xizmat va'dalari, konsultatsiya bloki, 16 ta brend logotipi, "Biz haqimizda" (18 matn + 4 foto),
"Vakansiyalar" sahifasi matni (36 matn + 2 foto), ko'cha manzili va ish vaqti, logo/favicon, mahsulot sahifasidagi
kafolat/yetkazish/Apple sozlash va'dalari, tovar turlari registri (38 tur), muddatli to'lov bento'si (4 tilda).
Admin'ning o'zi: 11 ta bir tekis bo'lim, "Sozlamalar" bitta uzun uyum, 20+ maydonli mahsulot formasi (Billz'dan
kelgan tovar uchun ko'p maydoni sinxronizatsiyada qayta yoziladi — forma buni aytmaydi), `window.confirm`,
o'nlab `text-[12.5px]` o'lchamlar, bosh sahifa yo'q.

## 1. Qarorlar (egasi bilan)

1. **Foydalanuvchi bitta** — egasi, bitta admin login. Rollar, operator akkauntlari yo'q.
2. **Dizayn namunasi — App Store Connect / iCloud.com**: yorug', SF Pro, katta sahifa sarlavhasi, sidebar,
   kartalar va jadvallar, "dashboard" hissi. Sayt tokenlari va shkalalari aynan ishlatiladi.
3. **Eng tez-tez qilinadigan ishlar** (navigatsiya shunga qarab): Billz tovarlariga rasm va ko'rinish,
   kontent (yangiliklar/bannerlar/blog), qo'lda mahsulot kiritish. Buyurtmalar asosan Telegram'da yuritiladi —
   admin'da ikkilamchi.
4. **Qamrov:** (a) matn va rasmlar — landing, kontakt/manzil/ish vaqti, logo/favicon, "Biz haqimizda",
   "Vakansiyalar", mahsulot sahifasi va'dalari — bitta umumiy mexanizm (`site_texts` + `site_assets`);
   (b) **tovar turlari CRUD** (bazaga ko'chadi, Billz aliaslari bilan); (c) **video yuklash** (hero cover
   videolari). Muddatli to'lov bento'si **olib tashlanadi** — muddatli rejimda ham bazadagi markdown chiqadi.
5. **Yondashuv B:** yangi qobiq + ekranlar qayta chiziladi; **server, API, validatsiya, sof mantiq
   (`variant-gen`, `image-normalize`, `reorder`, `models`), `api.ts` aynan qoladi.** Yangi backend faqat yangi
   imkoniyatlar uchun. Tayyor admin-freymvork (Refine/react-admin) rad etildi.
6. Egasi maketlarni ko'rsatmasdan, matnli dizayn bo'yicha tasdiqladi.

## 2. Maqsad emas (YAGNI)

- Rollar, bir nechta admin, audit jurnali — yo'q.
- WYSIWYG muharrir — yo'q; markdown-lite qoladi (6 sintaksis, kichik yordam popover'i).
- Kesh purge tugmasi — yo'q; proxy keshi (`s-maxage=60` + SWR) tufayli o'zgarish saytda 1–5 daqiqada
  ko'rinadi, admin toast'i shuni aytadi.
- Landing tuzilmasini o'zgartirish (bloklarni qo'shish/olib tashlash/tartiblash) — yo'q; 4 yo'nalish ustuni,
  3 xizmat kartasi, 6 konsultatsiya chipi soni qat'iy, faqat mazmuni tahrirlanadi.
- Dasturchi darajasidagi qiymatlar kodda qoladi: robots/sitemap, PC konfigurator slot id'lari, marquee tezligi,
  oy nomlari, `productDescriptionFallback`, xizmat kartalarining lucide ikonkalari, "Bizda ish qanday" ikonkalari.
- SVG yuklash — yo'q (inline skript xavfi); logo/ikonka shaffof PNG (client'da WebP'ga o'giriladi).
- Telegram botga "test xabar" tugmasi, global qidiruv, klaviatura yorliqlari — yo'q.
- `site_config.map_label`, `categories.icon`/`icon_url`/`cover_lede*` ustunlari o'chirilmaydi (migratsiya
  qoidasi) — faqat admin va saytdan chiqariladi.

## 3. Tuzilma va navigatsiya

5 ta asosiy bo'lim, ichida segment-tablar. Desktop: chapda sidebar — 5 bo'lim, har biri **ochiladigan-yopiladigan
guruh** (2026-09-16, egasining talabi; avval "doim ochiq" edi): sukut bo'yicha faqat joriy bo'lim ochiq, chevron
mustaqil ochadi/yopadi, bo'lim nomi bo'limga o'tadi va uni ochadi; ochiq guruh bitta yaxlit blok (`bg-fill-2/40`),
joriy sub-band `bg-surface` pill + chap chetida `cta` chizig'i; yopiq holat eslab qolinmaydi. "Buyurtmalar" yonida
yangi buyurtma + ariza soni; pastda "Saytni ochish" va "Chiqish".
Telefon: iOS pastki 5-tab bar; sub-bandlar sahifa tepasida segment-kontrol.

```
/admin                                             Bosh sahifa (dashboard)
/admin/products[?f=&q=&cat=&brand=&cond=&page=]    Mahsulotlar — ro'yxat (filtrlar URL'da)
/admin/products/new · /admin/products/:id          tahrir
/admin/products/types                              Turlar (4 yo'nalish bo'yicha guruhlangan)
/admin/products/types/new · /types/:catId/:id      (id yo'nalishlar bo'ylab takrorlanadi — juftlik)
/admin/products/categories[/new|/:id]              Kategoriyalar (4 yo'nalish)
/admin/products/brands[/new|/:id]                  Brendlar
/admin/products/models[/new|/:id]                  Modellar (avto-to'ldirish registri)
/admin/orders[?status=&q=&page=]                   Buyurtmalar (+ konsultatsiya arizalari)
/admin/orders/:id                                  buyurtma tafsiloti
/admin/orders/applications[?status=&q=&page=]      Ish arizalari
/admin/orders/applications/:id                     ariza tafsiloti
/admin/content/home                                Kontent → Bosh sahifa (landing muharriri)
/admin/content/(banners|news|posts|pages|vacancies)[/new|/:id]
/admin/settings/(store|contact|payment|integrations|seo|account)
```

Yo'l → `{section, tab, id}` — sof `parseAdminPath(pathname)` (`src/admin/lib/admin-path.ts`, testli); zaxira
so'zlar (`new`, `types`, `categories`, …) id'dan oldin tekshiriladi (mahsulot id'lari raqam, boshqalari slug).
`AdminApp` `useLocation` bilan shuni chizadi — `app/routes.ts`da yagona `admin/*` route qoladi.

**Dashboard** — faqat harakat talab qiladigan 5 karta: **Rasm kerak** (Billz, qoldiq > 0, rasmsiz — soni;
bosilsa `/admin/products?f=needs_image`) · **Yangi buyurtmalar** · **Yangi arizalar** · **Billz** (oxirgi
sinxronizatsiya natijasi, "Sinxronlash") · **Dollar kursi** (do'kon kursi, avtomatik/qo'lda). Standart parol
ogohlantirishi shu yerda (va Akkaunt tabida).

**Qayerda nima tahrirlanadi** — kontent mexanizmi egasi kutgan joyda ko'rinadi, alohida "matnlar ro'yxati" yo'q:

| Sayt qismi | Admin'da |
|---|---|
| 4 yo'nalish kartasi (nom, rasm, poster, 2 video), 3 xizmat va'dasi, konsultatsiya bloki, shior, bo'lim sarlavhalari | Kontent → Bosh sahifa |
| Brendlar tasmasi | Mahsulotlar → Brendlar (logo yuklangan brendlar chiqadi) |
| "Biz haqimizda" matnlari va 4 foto | Kontent → Sahifalar → biz-haqimizda (strukturali forma) |
| Vakansiyalar sahifasi matni va 2 foto | Kontent → Vakansiyalar → "Sahifa matni" kartasi |
| Huquqiy sahifalar va muddatli to'lov hero izohi | o'sha sahifaning tahririda "Qisqa izoh" maydoni |
| Manzil, ish vaqti, WhatsApp, Google uchun ish vaqti | Sozlamalar → Aloqa |
| Logo (yorug'/qorong'i), favicon, to'lov rejimi | Sozlamalar → Do'kon |
| Mahsulot sahifasi va'dalari, cookie, "30 daqiqa" | Sozlamalar → Do'kon → "Va'dalar va matnlar" |
| Katalog meta-description shabloni | Sozlamalar → SEO |

**Rejim:** sukut bo'yicha yorug'. Egasi saytda qorong'ini tanlagan bo'lsa (`<html data-theme="dark">`) admin
ham tokenlar orqali o'zi qorong'i bo'ladi — buning uchun admin'da hech qayerda `bg-white`/`text-white` yozilmaydi.

## 4. Vizual tizim — `src/admin/ui/`

Sayt tokenlari va shkalalari aynan; yangi rang, o'lcham, radius yo'q.

- **Yuzalar:** sahifa `bg-bg`, kartalar `bg-surface border-line`, sidebar `bg-surface` + o'ng hairline.
  Soya yo'q. Kartalar `rounded-sm` (12), boshqaruvlar `rounded-xs` (8), varaq/dialog `rounded-xl`.
- **Tipografika:** sahifa sarlavhasi `text-heading` (mobilda `text-subhead`) semibold · karta sarlavhasi
  `text-copy` semibold · matn/jadval `text-para` · meta/badge `text-label` (pol) · input `text-control`.
  `text-[Npx]` taqiq.
- **Rang semantikasi:** asosiy tugma/havola `cta`; ikkilamchi `fill-2`; o'chirish `danger` matn; holat nuqtalari —
  `verified` (faol/bajarildi), `muted-3` (yashirin), `new` (e'tibor kerak: "Rasm kerak", yangi buyurtma), `danger` (xato); `danger` to'ldirmasi ustida matn `text-bg` (qorong'ida `danger` och qizil — oq matn 2.78:1, `bg` ikkala mavzuda ≥ 5:1).
- **Boshqaruvlar:** sahifadagi amallar 36px (`BTN_SM` pog'onasi), sahifaning asosiy amali 44px pill; matn 400;
  `press` hammasida; harakat `src/lib/motion.ts`; varaq/dialog — saytdagi `Modal`/`Sheet` qayta ishlatiladi.
- **Primitivlar (har biri kichik):** `Page` (sarlavha, orqaga, o'ngda amallar), `Tabs` (URL'ga bog'liq segment),
  `Card`, `Field` (yorliq ustida, izoh, xato), `SwitchRow` (chapda nom, o'ngda toggle), `Input`/`Textarea`/`Select`,
  `Toggle`, `Button` (primary/secondary/destructive/quiet), `Badge`, `Table` (mobilda kartalar), `EmptyState`,
  `Toast`, `Confirm`, `LangPair` (uz/ru yonma-yon, mobilda ustma-ust — hamma ikki tilli maydon), `Uploader`
  (hozirgi `ImageUploader` qayta bo'yaladi; `kind: 'image' | 'video'`, `maxSide` parametri), `PriceInput` (bor).
- **Forma qoidalari (hamma ekranda bir xil):**
  1. Bitta asosiy amal — "Saqlash" sahifa sarlavhasining o'ng chetida, o'zgarish bo'lmaguncha o'chiq; sarlavha
     yopishqoq. Saqlanmagan holda chiqishda `beforeunload` ogohlantirishi (bor mantiq).
  2. Xato maydon ostida (qizil chegara + matn), server kodlari `errText` orqali.
  3. Muvaffaqiyat — toast "Saqlandi · saytda 1–5 daqiqada ko'rinadi"; sahifada qolinadi, yaratishda ro'yxatga qaytadi.
  4. Faol/yashirin toggle'lar darhol saqlanadi (toast bilan).
  5. O'chirish — nomi yozilgan tasdiq varag'i, qizil tugma; `window.confirm` yo'q.
  6. Bo'sh holat bitta amal bilan; yuklanish — skelet qatorlar.
  7. Ro'yxat: qidiruv + filtr chiplari + son; sahifalash "‹ 3 / 80 ›" (hozir 80 ta raqam tugmasi chiziladi).
  8. Ruscha maydonlar ixtiyoriy — "bo'sh qolsa o'zbekchasi chiqadi" (saytdagi fallback qoidasi).
- **Mobil:** pastki tab bar, 44px tegish maydoni, jadval → karta, forma bir ustun.
- **Login:** o'sha kit — bundled logo, login/parol, ko'k tugma, Google (bor mantiq).

## 5. Ekranlar

### Mahsulotlar — ro'yxat
Qidiruv; tez filtr segmentlari **Hammasi · Rasm kerak · Yashirin · Qoldiq 0 · Qo'lda kiritilgan**; Kategoriya /
Brend / Holat select'lari. Hammasi URL'da. Qator: rasm (44px, oq fon, contain) · nom (+ "Billz" belgisi, tur) ·
kategoriya · narx · qoldiq · **faol toggle qatorda** (darhol `PATCH {isActive}`). Qator bosilsa tahrir.
Qatorda o'chirish yo'q: Billz tovari o'chirilmaydi (sinxronizatsiya qaytaradi) — faqat yashiriladi; qo'lda
kiritilgani tahrir sahifasining "Xavfli zona"sida o'chiriladi. Ma'lumot hozirgidek to'liq yuklanib client'da
filtrlanadi (`product-filter.ts` + yangi `f` tez filtrlari), 20 tadan sahifalanadi.

### Mahsulot — tahrir (bitta ustun, kartalar muhimlik tartibida)
Sarlavha: nom, "Saytda ko'rish", **Saqlash**.
1. **Rasmlar** — asosiy + galereya (tartiblash). Billz izohi: "Billz'da rasm bo'lsa sinxronizatsiyada u ustun turadi".
2. **Holat** — "Saytda ko'rsatilsin" toggle, Yangi/Ishlatilgan segment (ishlatilgan → variantlar tozalanadi, bor
   mantiq), tartib raqami.
3. **Ma'lumot** — nom (`ModelCombobox`: model tanlansa brend/kategoriya/xususiyatlar to'ladi), brend, kategoriya,
   tur (bazadan, kategoriyaga qarab), tavsif. **Billz tovarida faqat o'qish** — qiymatlar ro'yxat ko'rinishida,
   "Billz'dan keladi — Billz'da o'zgartiring" izohi. (Sinxron ustunlar: `name, category, cash_price_uzs,
   old_price_uzs, brand_id, category_id, type, description, billz_stock, is_active, product_specs`; egasiniki:
   `slug, condition, condition_note, sort_order, rating_avg, review_count`, rasm — Billz'da bo'lmasa.)
   Eslatma: `is_active` ham sinxron ustun (`qoldiq > 0 && rasm bor`) — toggle Billz tovarida keyingi
   sinxronizatsiyagacha amal qiladi; izoh shuni aytadi.
4. **Narx** — naqd va eski narx (qo'lda); Billz'da faqat o'qish ("USD × kurs").
5. **Variantlar** — faqat qo'lda kiritilgan yangi tovarda: xotira/rang chiplari + har birikma narxi/rasmi
   (`generateVariants` o'sha).
6. **Xususiyatlar** — nom/qiymat qatorlari (Billz'da faqat o'qish).
7. **Reyting va sharhlar** — `ReviewsEditor` (saqlangan tovarda); reyting/soni sharhlardan, tashqi manba uchun
   qo'lda kiritish qoladi.
8. **Xavfli zona** — o'chirish (faqat qo'lda kiritilgan).

### Turlar
Ro'yxat 4 yo'nalish bo'yicha guruhlangan: ikonka · nom uz/ru · Billz aliaslari (chiplar) · tovar soni · tartib.
Forma: yo'nalish, nom uz/ru, id (nomdan avtomatik slug, yaratilgandan keyin o'zgarmaydi), ikonka (shaffof PNG,
`maxSize`/`maxHeight` bilan 220×136 qutiga (mavjud ikonkalar bilan bir o'lcham; sayt `[zoom:0.5]` bilan chizadi), Billz aliaslari (yozib Enter),
tartib. O'chirish tasdig'i: "N ta mahsulot shu turda — ular tursiz qoladi (katalogda qoladi, tur qatorida
chiqmaydi)". Yangi tur ikonkasiz saqlanmaydi (`icon_required`).

### Kategoriyalar · Brendlar · Modellar
Kategoriya: nom uz/ru, tartib, cover rasmi; ikonka tanlagichi va cover izohlari **yo'q**. Yo'nalish o'chirilsa
uning turlari ham o'chadi (`DELETE FROM product_types WHERE category_id=?`), mahsulotlar hozirgidek.
Brend: logo eskizi, nom, tovar soni; formada logo (shaffof PNG; izoh: "yuklansa bosh sahifadagi brendlar
tasmasida chiqadi — tasmada bir rangga keltiriladi"). Modellar — faqat kit bilan qayta chiziladi.

### Buyurtmalar
Tablar: Buyurtmalar · Ish arizalari. Holat segmentlari (**Yangi N** · Bog'lanildi · Bajarildi · Hammasi),
ism/telefon qidiruvi (client'da). Qator: ism + telefon (`tel:`) · manba (Naqd / Muddatli / Konsultatsiya) ·
birinchi tovar + "yana N" · summa · sana · **holat select qatorda**. `/admin/orders/:id` — to'liq tarkib,
muddatli tafsilot, izoh, "TG yuborilmadi". Arizalar: ism, telefon, lavozim, rezyume havolasi (`safeHref`),
holat, sana; `/admin/orders/applications/:id`.

3-bosqich qarorlari: sukut filtri **Yangi** (`status` URL'da bo'lmasa — kiruvchi quti; dashboard havolasi shu); arizada
«Bajarildi» o'rniga **Yopildi**; qatorda manba belgisi faqat Muddatli/Konsultatsiya (naqd — sukut), tarkib va rezyume
ustunlari `xl`dan (1024px'da jadval sig'sin; mobil kartada doim); summa Telegram xabaridagi bilan bir xil (muddatlida
`totalUzs`, naqdda tovarlar yig'indisi); raqamli qidiruv telefon raqamlari bo'yicha, harfli — ism bo'yicha; tafsilot ro'yxat
API'sidan (oxirgi 200 ta) id bo'yicha — alohida GET yo'q; holat o'zgarsa sidebar sanog'i yangilanadi.

### Kontent
- **Bosh sahifa** (`/admin/content/home`) — kartalar landing tartibida: **Yo'nalish kartalari** (4 ta:
  nom uz/ru — textarea, Enter yangi qator; rasm; poster; 2 tagacha video — izoh: "video landing kartasida emas,
  yo'nalish sahifasining cover'ida aylanadi; bo'lmasa cover'da rasm turadi") → **Xizmat va'dalari** (bo'lim
  sarlavhasi + 3 ta karta: gap-sarlavha va matn uz/ru) → **Konsultatsiya** (sarlavha, izoh, 6 mavzu chipi —
  bo'sh qolsa chip chiqmaydi, muvaffaqiyat sarlavha/matni, rasm) → **Shior va bo'lim sarlavhalari** (`proTitle`,
  `newsTitle`, `homeBrands`, `heroCtaPrimary`). Pastda eslatma: bannerlar, yangiliklar va brendlar o'z
  tablarida. Bitta "Saqlash" → `PUT /api/admin/texts` + `PUT /api/admin/assets`.
- **Bannerlar / Yangiliklar / Blog / Vakansiyalar** — ro'yxat (eskiz, nom, faol toggle, tartib) + forma kit
  bilan; mantiq o'sha. Vakansiyalar tabining tepasida **"Sahifa matni"** kartasi (`careers` matnlari + 2 foto).
- **Sahifalar** — ro'yxat (slug, sarlavha, faol, "Saytda ko'rish"); forma: sarlavha uz/ru, markdown uz/ru
  (textarea + sintaksis yordami), slug, faol. Maxsus slug'lar: `biz-haqimizda` → markdown o'rniga strukturali
  forma (`about` matnlari + 4 foto; sarlavha bazadan); `oferta`/`maxfiylik`/`qaytarish`/`muddatli-tolov` →
  markdown + "Qisqa izoh (hero)" maydoni (`legal` guruhi kalitlari).

### Sozlamalar
- **Do'kon** — nom, logo (yorug' fon uchun), wordmark (qorong'i fon uchun), favicon, to'lov rejimi (segment:
  Faqat naqd / Naqd + muddatli / Faqat muddatli). Shior (`proTitle`) bu yerda **emas** — u landing muharririda
  (takror maydon bo'lmasin). **"Va'dalar va matnlar"** kartasi — `store` guruhi.
- **Aloqa** — **bitta telefon maydoni** (ko'rinishi yoziladi; `phone` = `'+' + raqamlar` client'da chiqariladi,
  sof `phoneFromDisplay`, server validatsiyasi o'zgarmaydi), Telegram, Instagram, WhatsApp ("mobil aloqa
  tugmasida chiqadi"), manzil (2 qator uz/ru), ish vaqti uz/ru, Google uchun ish vaqti (`seoOpeningHours`,
  izoh: `Mo-Su 10:00-21:00`), xarita koordinatasi (ko'rsatma bilan). "Manzil yozuvi" (`mapLabel`) yo'q.
- **To'lov va kurs** — boshlang'ich to'lov min/max, muddatlar (oy + ustama %, yonida 10 mln uchun namuna oylik),
  dollar: ustama % (avtomatik) yoki qo'lda kurs; MB kursi va sanasi ko'rsatiladi.
- **Integratsiyalar** — Billz kartasi (kalit, do'kon tanlash, holat + "Sinxronlash", oxirgi natija — **bir joyda**),
  Telegram bot (token, chat ID, ko'rsatma), Mijoz kirishi (Google ID/secret, TG login bot), Analitika (Metrica).
- **SEO** — sarlavha qo'shimchasi, bosh sahifa tavsifi, OG rasmi (yuklash — `ogImage` yo'liga yoziladi),
  katalog tavsif shabloni (`metaCatalogDesc`, izoh: `{title}` va `{store}` joyida qoladi).
- **Akkaunt** — login/parol o'zgartirish, Google admin kirishi (bor `AccountForm` mantiqi).

## 6. Ma'lumotlar — migratsiya `0035_product_types.sql`

```sql
CREATE TABLE site_texts (
  key TEXT PRIMARY KEY,            -- locales.ts `Translation` kaliti
  uz  TEXT NOT NULL DEFAULT '',    -- bo'sh = koddagi standart
  ru  TEXT NOT NULL DEFAULT ''
);
CREATE TABLE site_assets (
  key TEXT PRIMARY KEY,            -- registrdagi kalit (logo, hero.apple.image, …)
  url TEXT NOT NULL                -- /images/products/<uuid>.<ext>
);
CREATE TABLE product_types (
  id            TEXT NOT NULL,     -- products.type qiymati (yo'nalishlar bo'ylab takrorlanadi: aksessuar, mikrofon)
  category_id   TEXT NOT NULL,
  label         TEXT NOT NULL,
  label_ru      TEXT NOT NULL DEFAULT '',
  icon_url      TEXT NOT NULL DEFAULT '',
  billz_aliases TEXT NOT NULL DEFAULT '[]',   -- JSON string[]
  sort_order    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (category_id, id)
);
-- 38 tur hozirgi shared/product-types.ts registridan (ikonkalar /sections/… yo'llari, aliaslar JSON).
-- Brend logotiplari: 16 SVG public/brands/ ga ko'chadi; nom bo'yicha (lower) mos brendga logo_url yoziladi,
-- yo'g'i yaratiladi (id = slug). Mavjud logo_url bo'sh bo'lmasa tegilmaydi.
```

### Matn registri — `src/lib/site-content.ts` (`TEXT_FIELDS`, `Translation` kalitlariga tiplangan)
`{ key, group, label, kind: 'text' | 'textarea', hint? }`. Guruhlar va kalitlar:

- `home`: yangi `heroApple`, `heroPc`, `heroAudio`, `heroVideo` (textarea, `\n` qatorga bo'ladi — hozirgi
  `HERO_COLUMNS.label`); `proTitle`; `svcTitle`, `svcWarrantyCard`, `svcWarrantyDesc`, `svcDeliveryCard`,
  `svcDeliveryDesc`, `svcServiceCard`, `svcServiceDesc`; `consultTitle`, `consultLead`, `consultTopicApple`,
  `consultTopicPc`, `consultTopicAudio`, `consultTopicVideo`, `consultTopicService`, `consultTopicOther`,
  `consultDoneTitle`, `consultDoneText`; `newsTitle`, `homeBrands`, `heroCtaPrimary`.
- `store` (mahsulot sahifasi va umumiy va'dalar): `svcWarrantyFact`, `svcWarrantyTitle`, `svcDeliveryFact`,
  `svcDeliveryTitle`, `feature2`, `feature3`, `setupTitle`, `setupText`, `setupCta`, `helpTitle`, `helpContact`,
  `orderSuccessNote`, `cookieText`, `cookieAccept`, `trustShort`.
- `contact`: `footerAddressText1`, `footerAddressText2`, `footerTime`, yangi `seoOpeningHours`
  (standart `Mo-Su 10:00-21:00`, ikkala tilda bir xil).
- `about` (18): `aboutLede`, `aboutWhyTitle`, `aboutWhyMuted`, `aboutExpertsLabel`, `aboutExpertsTitle`,
  `aboutExpertsText`, `aboutWarrantyTitle`, `aboutWarrantyText`, `aboutBuyTitle`, `aboutBuyText`,
  `aboutTradeInLink`, `aboutPersonalTitle`, `aboutPersonalText`, `aboutNearTitle`, `aboutNearText`,
  `aboutNewsTitle`, `aboutNewsText`, `aboutBlogLink`.
- `careers` (26): `careersMetaDesc`, `careersHeroTitle`, `careersHeroCta`, `careersIntro`, `careersWorkEyebrow`,
  `careersWorkTitle`, `careersWorkText`, `careersWorkQuote`, `careersQuoteBy`, `careersLifeEyebrow`,
  `careersLifeTitle`, `careersLifeText`, `careersLifeCard`, `careersWhyTitle`, `careersWhyMuted`,
  `careersWhyTechTitle`, `careersWhyTechText`, `careersWhyClientTitle`, `careersWhyClientText`,
  `careersWhyServiceTitle`, `careersWhyServiceText`, `careersWhyTeamTitle`, `careersWhyTeamText`,
  `careersRolesTitle`, `careersRolesEmpty`, `careersDoneTitle`, `careersDoneText`.
- `legal`: `legalLedeOferta`, `legalLedePrivacy`, `legalLedeReturns`, yangi `termsLede` (hozir `page.tsx`
  `TERMS_LEAD`, 4 tilda — uz/ru qoladi).
- `seo`: `metaCatalogDesc`.

Shablon kalitlarda (`metaCatalogDesc`, `careersMetaDesc`) registr `hint` beradi: "`{store}`/`{title}` o'z joyida
qoladi". Registr tartibi = admin'dagi maydon tartibi.

Ustma-ust qo'yish qoidasi (`mergeTexts(base, overrides, lang)` — sof): har kalit uchun `overrides[key][lang]`
bo'sh bo'lmasa u, aks holda `base[key]`. Registrda yo'q kalit bazada bo'lsa e'tiborsiz. Registrga kalit
qo'shish = admin'da tahrirlanadigan bo'lishi; `locales.ts`da kalit o'chirilsa `Translation` tipi registrni
ham yiqitadi (lint) — etim kalit qolmaydi.

### Rasm/video registri — `src/lib/site-content.ts` (`ASSET_FIELDS`)
`{ key, group, label, kind: 'image' | 'video', hint? }`; standart qiymat komponentda (`assets[key] ?? bundled`):

| Kalit | Standart | Qayerda |
|---|---|---|
| `logo` | `src/assets/logo.svg` | Header (yorug'), LoginPanel |
| `logoDark` | `src/assets/hero/wordmark.webp` | Header (qorong'i), HeroNotch, CareersPage |
| `favicon` | `/favicon.svg` | `root.tsx` |
| `hero.<apple\|pc\|audio\|video>.image` | `src/assets/hero/*.webp` | HeroColumns, CategoryCover |
| `hero.<id>.poster`, `hero.<id>.video1`, `hero.<id>.video2` | faqat apple'da bor (`src/assets/apple/`) | CategoryCover (video ketma-ket, bor mantiq) |
| `consult.image` | `src/assets/consult.webp` | ConsultForm |
| `about.hero`, `about.experts`, `about.delivery`, `about.news` | `public/about/*.webp` | PageHero (about + huquqiy), AboutPage |
| `careers.work`, `careers.life` | `public/careers/*.webp` | CareersPage |

### API (hammasi `requireAdmin` + `parseBody`)
- `GET /api/admin/texts` → `{ fields: TEXT_FIELDS + defaults {uz, ru} (locales'dan), values: { [key]: {uz, ru} } }`;
  `PUT /api/admin/texts` body `{ [key]: {uz, ru} }` — faqat registr kalitlari, ≤ 2 000 belgi; `INSERT OR REPLACE`
  (ikkalasi bo'sh bo'lsa qator o'chiriladi). `parseTextsInput` `functions/lib/validate.ts`da — ruxsat etilgan
  kalitlar ro'yxati parametr sifatida (route `src/lib/site-content.ts`dan beradi; `functions/` `src/`ni ko'rmaydi).
- `GET /api/admin/assets` → `{ fields, values }`; `PUT /api/admin/assets` body `{ [key]: url | '' }` — kalit
  registrda, url `/images/products/` bilan boshlanadi; bo'sh = qator o'chiriladi (standartga qaytadi).
- `GET /api/admin/types` (→ `ApiProductType[]` + `productCount`), `POST`, `PUT /api/admin/types/:catId/:id`,
  `DELETE` (→ `UPDATE products SET type=NULL WHERE category_id=? AND type=?`, javobda soni). `parseTypeInput`:
  id `^[a-z0-9-]{1,40}$`, `label` majburiy, `categoryId` majburiy (route bazadan tekshiradi), `iconUrl` majburiy
  (`/images/products/` yoki `/sections/` bilan boshlanadi — ko'chirilgan 38 ta ikonka `public/sections/`da),
  `billzAliases` ≤ 20 ta, har biri ≤ 40 belgi; `PUT`da id/categoryId o'zgarmaydi. Yangi kodlar (`icon_required`,
  `key_invalid`, `url_invalid`) `errText.ts`ga.
- `GET /api/admin/dashboard` → `{ needsImage, newOrders, newApplications, billz: BillzSyncStatus, usd: {rate, auto} }`.
  Qobiq ham shuni bir marta chaqirib sidebar badge'ini (`newOrders + newApplications`) chizadi.
  SQL: `products WHERE billz_id IS NOT NULL AND billz_stock > 0 AND (image_url IS NULL OR image_url='')`,
  `orders WHERE status='new'`, `job_applications WHERE status='new'`.
- `POST /api/admin/upload` — `video/mp4` qo'shiladi: ≤ 40 MB (content-length oldindan 42 MB), kalit
  `products/<uuid>.mp4`; `server/images.ts` MIME'ga `mp4`. Javob `{ imageUrl }` o'zgarmaydi (video uchun ham).
- `parseProductInput` — `type` faqat shakl (slug) tekshiradi; yo'nalishga tegishliligi (`type_invalid`) route'da
  bazadan (`SELECT 1 FROM product_types WHERE category_id=? AND id=?`).
- `shared/types.ts`: `ApiProductType { id, categoryId, label, labelRu, iconUrl, billzAliases: string[], sortOrder }`,
  `ApiDashboard`, `ApiSiteText { uz, ru }`.

## 7. Sayt tomonidagi o'zgarishlar

- **`t` overlay:** `loadSiteTexts(env)` (loaders.ts, xato → `{}`) + `mergeTexts`; store layout loader'i `t`ni
  shundan yasab kontekstga beradi → komponentlar o'zgarmaydi. Loader'ida `translations[...]`dan bevosita
  o'qiydigan route'lar (`catalog`, `category`, `deals`, `home`, `product`, `blog`, `vakansiyalar`) yagona
  `loadT(env, locale)` helper'iga o'tadi (bitta kichik SELECT; jadval ≤ 100 qator). **`meta()` client'da ham
  ishlaydi va bazaga kira olmaydi** — unga kerak matn (masalan `page.tsx`dagi `aboutLede`, `legalLede*`,
  `careersMetaDesc`) loader'da hisoblanib loader data'sida qaytariladi; `meta()` `translations`ni bevosita
  o'qimaydi.
- **`assets`:** `loadSiteAssets(env)` → `Record<string,string>`; layout kontekstiga va `StoreLayout`/`Header`
  propslariga; `root.tsx` favicon'ni matches orqali o'qiydi (`storeConfigFrom` naqshi). `hero-columns.ts` →
  `heroColumns(t, assets)` funksiyasi (nomlar `t.hero*`, rasm/video `assets`, 4 ustun va id'lar o'zgarmaydi);
  `columnHref`/`columnForCategory` shu ro'yxat bilan ishlaydi.
- **`BrandStrip`** — `brands` (logo bor, `sort_order`) home loader'idan; ikki qatorga — birinchi yarmi yuqorida, qolgani pastda bo'linadi;
  `MIN_LANE_ITEMS`/takrorlash qoladi; 0 logo → bo'lim chiqmaydi. `brand-logo` klassi (oqqa keltirish) qoladi.
- **Turlar:** `app/lib/tiles.ts` → `categoryTiles(types, categoryId, lang)` sof; `loadTypes(env)` (xato → `[]`)
  category loader'ida. `shared/product-types.ts`da faqat `ProductTypeRow` tipi va sof `matchBillzType(typesOf(types, categoryId), name)` qoladi (mantiq o'sha: nom yoki alias, katta-kichik harfsiz); Billz runner run boshida
  turlarni o'qiydi. `PcConfigurator` slot id'lari (`cpu`, `motherboard`, `ram`, `gpu`, `xotira`) kodda; o'sha id'li
  tur o'chirilsa slot chiqmaydi (loader mahsulot topmaydi).
- **`TermsBento.tsx`** o'chiriladi (4 tilli matnlari bilan); `muddatli-tolov` sahifasi hamma rejimda huquqiy
  sahifalar kabi **`LegalPage` shablonida** (mundarija + hero izohi) bazadagi markdown bilan chiziladi;
  `page.tsx`dagi `legalLede` xaritasiga `muddatli-tolov: t.termsLede` qo'shiladi, `TERMS_LEAD` o'chadi.
- **`ContactFab`** — `config.whatsapp` bo'lsa WhatsApp tugmasi (brend rangi `#25D366` ruxsat etilgan literal).
- **`seo.ts`** — JSON-LD manzil `t.footerAddressText1 + ' ' + footerAddressText2`, `openingHours` `t.seoOpeningHours`;
  `mapLabel` ishlatilmaydi.
- **`/images/*` Range:** `server/index.ts`da `app.use('/images/products', express.static(join(IMAGES_DIR,'products'),
  { immutable: true, maxAge: '1y', index: false, redirect: false }))` — Range/ETag Express'dan (Safari `<video>`
  talabi). `images.$.tsx` route'i disk bo'lmagan runtime uchun shartnoma sifatida qoladi.
- **O'chiriladi:** `src/lib/category-icons.tsx`, `CategoryList`/`CategoryForm`dagi ikonka va cover izohi
  maydonlari, `HeroColumns`dagi `HERO_COLUMNS` importi (funksiyaga), eski admin komponentlari (6-bosqichda).
- `locales.ts`: `hero*` (4), `seoOpeningHours`, `termsLede` qo'shiladi; `svcServiceTitle` yo'q edi — kerak emas.

## 8. Xavfsizlik va kesh

Yangi route'lar `requireAdmin` + `parseBody`; sirlar `publicSiteConfig`da avvalgidek bo'shatiladi; matnlar
React orqali chiziladi (HTML emas), havolalar `safeHref`; yuklangan fayl faqat `products/` prefiksi ostida;
SVG qabul qilinmaydi; video faqat `video/mp4`. Storefront proxy keshi tufayli kontent 1–5 daqiqada yangilanadi.

## 9. Test

Sof mantiq (vitest): `mergeTexts`, `parseAdminPath`, `categoryTiles(types, …)`, `matchBillzType(typesOf(types, categoryId), name)`
(hozirgi testlar massiv bilan ko'chadi), `parseTextsInput`/`parseAssetsInput`/`parseTypeInput`
(`validate.test.ts`), `phoneFromDisplay`, `quickFilter` (Rasm kerak / Yashirin / Qoldiq 0 / Qo'lda) —
`product-filter.test.ts`ga. `bun run lint` — `Translation` parity, registr tiplari. Brauzerda har bosqich oxirida
1440 / 1024 / 375px; admin'ga egasi Browser panelida o'zi kiradi.

## 10. Bosqichlar (har biri ishlaydigan holatda)

1. **Qobiq + kit** — `src/admin/ui/`, `parseAdminPath`, yangi `AdminApp` (sidebar/tab bar), dashboard + API,
   login. Eski ekranlar vaqtincha yangi qobiq ichida.
2. **Mahsulotlar** — ro'yxat + tahrir (Billz'ga qarab), migratsiya `0035`, turlar CRUD + sayt/Billz bazadan,
   kategoriya/brend tozalash, brend tasmasi bazadan.
3. **Buyurtmalar** — buyurtma va ariza ekranlari.
4. **Kontent** — texts/assets API + registr + overlay; landing muharriri; Sahifalar (Biz haqimizda strukturali,
   huquqiy izohlar); bannerlar/yangiliklar/blog/vakansiyalar + "Sahifa matni"; `TermsBento` o'chirish; video
   yuklash + Range.
5. **Sozlamalar** — 6 tab, bitta telefon, va'dalar kartasi, OG yuklash, integratsiyalar bir joyda.
6. **Tozalash + hujjat** — eski komponentlar o'chadi, `CLAUDE.md`, `docs/egasi-qollanmasi.md`.

## 11. Fayl xaritasi

- Yangi: `src/admin/ui/*`, `src/admin/lib/admin-path.ts` (+test), `src/admin/lib/phone.ts` (+test),
  `src/admin/screens/*` (bo'lim ekranlari), `src/lib/site-content.ts`, `migrations/0035_product_types.sql`,
  `app/routes/api.admin.texts.tsx`, `api.admin.assets.tsx`, `api.admin.types.tsx`, `api.admin.types.$catId.$id.tsx`,
  `api.admin.dashboard.tsx`, `public/brands/*.svg`.
- O'zgaradi: `src/admin/AdminApp.tsx`, `api.ts`, `errText.ts`, `ImageUploader.tsx`, `app/lib/loaders.ts`,
  `app/lib/tiles.ts`, `app/lib/seo.ts`, `app/routes/store.tsx`, `root.tsx`, `page.tsx`, `category.tsx`, `home.tsx`,
  `api.admin.upload.tsx`, `api.admin.products*.tsx`, `functions/lib/validate.ts`, `db.ts`, `shared/types.ts`,
  `shared/product-types.ts`, `server/billz-sync.ts`, `server/images.ts`, `server/index.ts`, `src/locales.ts`,
  `src/store/{hero-columns,HeroColumns,CategoryCover,HeroNotch,Header,LoginPanel,ConsultForm,AboutPage,PageHero,
  CareersPage,BrandStrip,ContactFab,StoreLayout}.tsx`.
- O'chadi: `src/store/TermsBento.tsx`, `src/lib/category-icons.tsx`, `shared/product-types.test.ts` (ikonka
  fayli testi — registr yo'q), eski `src/admin/*List.tsx`/`*Form.tsx` (6-bosqich).
