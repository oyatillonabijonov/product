# PRD — Storefront A bosqichi: Ko'p sahifali katalog poydevori

**Sana:** 2026-07-01
**Loyiha:** Taqsit Store — olcha uslubidagi bitta do'kon storefront (A bosqichi)
**Holat:** Dizayn tasdiqlangan, ishga tayyor
**Bog'liqlik:** Mavjud admin panel + kalkulyator + Cloudflare backend (main'ga merge qilingan) ustiga quriladi.

---

## 1. Maqsad va kontekst

Hozirgi bir sahifali landing sayt **ko'p sahifali, olcha uslubidagi storefront**ga aylantiriladi — lekin **toza premium palitra** (oq/ko'k/yashil, olcha'ning qizil emas) va Apple-minimalizm saqlanadi. Onlayn to'lov yo'q; buyurtma Telegram orqali (hozirgi lead oqimi). Hammasi Cloudflare bepul tarifida.

Bu **A bosqichi** — katta loyihaning poydevori. Keyingi bosqichlar (B: qidiruv+filtr, C: savat+checkout, D: boy vitrina) shu poydevorga tayanadi.

### Maqsadlar
- Bir sahifali saytdan ko'p sahifali katalogli do'konga o'tish (routing).
- Boyroq mahsulot modeli: kategoriya, galereya (bir nechta rasm), xususiyatlar jadvali, tavsif, eski narx/chegirma.
- Kategoriya sahifalari va to'liq mahsulot detali sahifasi (shu mahsulot kalkulyatori bilan).
- Olcha tuzilishidagi bosh sahifa (header + qidiruv + kategoriya dumaloqlari + banner + mahsulot to'ri), toza palitrada.
- Admin: kategoriya boshqaruvi + boyitilgan mahsulot formasi (ko'p rasm, xususiyatlar, tavsif, eski narx).

### Maqsad emas (YAGNI — keyingi bosqichlar)
- To'liq qidiruv + filtr + saralash → **B bosqichi**. (A'da faqat nom bo'yicha oddiy qidiruv.)
- Funksional savat + checkout → **C bosqichi**. (A'da savat/sevimlilar ikonalari faqat vizual.)
- Boy vitrina (admin-boshqariladigan bannerlar, aksiyalar bloklari) → **D bosqichi**. (A'da oddiy statik hero banner.)
- Onlayn to'lov, ombor miqdori, brend, reyting/sharhlar, ko'p sotuvchi.

---

## 2. Arxitektura va routing

Hozirgi React (Vite) SPA saqlanadi; **React Router** (client-side) qo'shiladi. Cloudflare Pages SPA fallback (`public/_redirects`) allaqachon sozlangan, shuning uchun har qanday yo'l `index.html`ga tushadi va React Router hal qiladi. `/api/*` va `/images/*` Functions o'zgarmaydi.

Umumiy **Shell** (barcha sahifalarda): `<StoreLayout>` — utility panel + header + `<Outlet/>` + footer.

```
Yo'llar (React Router):
/                  <HomePage>
/category/:slug    <CategoryPage>
/product/:id       <ProductPage>
/search            <SearchPage>   (query: ?q=...)
/admin*            <AdminApp>     (mavjud; router ichida yoki tashqarisida — 3-bo'lim)
*                  <NotFoundPage>
```

**Admin va storefront ajratmasi:** hozir `main.tsx` `/admin` yo'lida `<AdminApp>`, aks holda `<App>` render qiladi. Yangi tuzilish: `<App>` ichida React Router; `/admin*` yo'llari `<AdminApp>`ga, qolganlari `<StoreLayout>` sahifalariga boradi. `main.tsx`dagi pathname tekshiruvi olib tashlanadi (router hal qiladi).

**Texnologiyalar:** React 19 + Vite 6, React Router v7 (`react-router-dom`), TypeScript strict, Tailwind v4, Cloudflare Pages/Functions/D1/R2, bun.

---

## 3. Ma'lumotlar bazasi (D1 kengaytmasi)

Yangi migratsiya `migrations/0003_storefront.sql` (mavjud 0001/0002 ga tegilmaydi).

### `categories` (yangi)
| Ustun | Turi | Izoh |
|---|---|---|
| `id` | TEXT PK | slug, masalan `telefonlar` |
| `name` | TEXT | Telefonlar |
| `icon_url` | TEXT | R2 havola (dumaloq ikonka), bo'sh bo'lishi mumkin |
| `sort_order` | INTEGER | tartib |

### `products` (kengaytiriladi — ALTER)
| Yangi ustun | Turi | Izoh |
|---|---|---|
| `category_id` | TEXT NULL | `categories.id` (FK, NULL = kategoriyasiz) |
| `old_price_uzs` | INTEGER NULL | chizilgan eski narx; NULL = chegirma yo'q |
| `description` | TEXT NULL | tavsif matni |

Mavjud ustunlar saqlanadi: `id, name, category, condition, condition_note, cash_price_uzs, image_url, sort_order, is_active, created_at`. (Eslatma: eski `category` matn ustuni — `iphone/mac/...` — hozircha saqlanadi, lekin storefront yangi `category_id`ni ishlatadi; `category` keyingi tozalashda olib tashlanishi mumkin.)

### `product_images` (yangi — galereya)
| Ustun | Turi | Izoh |
|---|---|---|
| `id` | TEXT PK | uuid |
| `product_id` | TEXT | `products.id` (FK), o'chirilганda CASCADE |
| `image_url` | TEXT | R2 havola |
| `sort_order` | INTEGER | asosiy = eng past |

Mavjud `products.image_url` "asosiy rasm" sifatida saqlanadi (kartalar uchun tez). Galereya = `product_images` + asosiy.

### `product_specs` (yangi — xususiyatlar)
| Ustun | Turi | Izoh |
|---|---|---|
| `id` | TEXT PK | uuid |
| `product_id` | TEXT | FK, CASCADE |
| `label` | TEXT | Xotira |
| `value` | TEXT | 256GB |
| `sort_order` | INTEGER | tartib |

### Seed (migratsiya ichida)
- 5 kategoriya: `telefonlar` (Telefonlar), `noutbuklar` (Noutbuklar), `planshetlar` (Planshetlar), `kompyuterlar` (Kompyuterlar), `aksessuarlar` (Aksessuarlar).
- Mavjud 10 mahsulot mos kategoriyaga biriktiriladi (`UPDATE`).

### Chegirma hisobi
`old_price_uzs` mavjud va `> cash_price_uzs` bo'lsa: chegirma % = `round((old − cash) / old × 100)`. Kartada/sahifada chizilgan eski narx + `-N%` belgisi.

---

## 4. Backend API (Pages Functions)

Mavjud endpointlar saqlanadi. Yangi/o'zgargan:

| Metod | Yo'l | Kirish | Vazifa |
|---|---|---|---|
| GET | `/api/categories` | ommaviy | barcha kategoriyalar (sort_order bo'yicha) |
| GET | `/api/products` | ommaviy | faol mahsulotlar; `?category=slug` va `?q=matn` query filtri (q — nom bo'yicha LIKE) |
| GET | `/api/products/:id` | ommaviy | bitta mahsulot to'liq: asosiy maydonlar + `images[]` + `specs[]` + kategoriya |
| GET | `/api/admin/categories` | admin | barcha (boshqaruv) |
| POST/PUT/DELETE | `/api/admin/categories[/:id]` | admin | kategoriya CRUD |
| POST/PUT | `/api/admin/products[/:id]` | admin | kengaytirildi: category_id, old_price, description, images[], specs[] |
| POST | `/api/admin/upload` | admin | mavjud (R2) — kategoriya ikonka va galereya rasmlari uchun qayta ishlatiladi |

**Yangi API tiplari** (`shared/types.ts` ga qo'shiladi): `ApiCategory`, `ApiSpec`, `ApiProductDetail` (`ApiProduct` + `images: string[]`, `specs: ApiSpec[]`, `categoryId: string | null`, `oldPriceUzs: number | null`, `description: string | null`). `ApiProduct` (ro'yxat uchun) `categoryId`, `oldPriceUzs` bilan boyitiladi.

**Kalkulyator o'zgarmaydi:** `calcInstallment`/`lowestMonthly` narx sifatida `cash_price_uzs`ni ishlatadi (eski narx faqat ko'rsatish uchun).

---

## 5. Storefront sahifalari (frontend)

Umumiy `<StoreLayout>`: utility panel (0% muddatli to'lov · Chegirmalar · telefon · til almashtirish) + sticky header (logo · "Katalog" tugmasi · qidiruv paneli · ❤/🛒 ikonalar) + `<Outlet/>` + footer (mavjud footer moslashtiriladi).

- **Header ikonalari (A):** 🔍 qidiruv — Enter bosilganda `/search?q=...` ga o'tadi (oddiy nom bo'yicha). ❤ Sevimlilar / 🛒 Savat — **vizual** (bosilganda "tez orada" yoki disabled), funksional C'da. "Katalog" tugmasi — bosilganda kategoriyalar dropdown ro'yxati ochiladi, har biri `/category/:slug` ga link.

- **`<HomePage>`:** hero banner (oddiy statik slayder, 1–3 slayd, kodda; toza ko'k/yashil urg'u) + kategoriya dumaloqlari (`categories`, `/category/:slug` ga link) + "Tanlangan mahsulotlar" to'ri (faol mahsulotlar, bizning oq kartalar, oylik-birinchi narx + chegirma belgisi).

- **`<CategoryPage>`:** `/api/products?category=slug` dan mahsulotlar, sarlavha (kategoriya nomi), oq kartalar to'ri. Bo'sh bo'lsa — "mahsulot yo'q" xabari.

- **`<ProductPage>`:** `/api/products/:id`. Chap: galereya (asosiy rasm + thumbnaillar, bosilganda almashadi). O'ng: nom + holat belgisi, narx bloki (eski narx chizilgan + `-N%` + cash narx), **kalkulyator** (mavjud `Calculator` mantig'i, shu mahsulot uchun 3/6/12 oy), **"Telegram orqali buyurtma"** tugmasi (mavjud `composeLeadMessage`/`telegramShareUrl`, mahsulot+muddat+oylik bilan). Past: xususiyatlar jadvali (`specs`) + tavsif matni. 🛒 "Savatga" tugmasi vizual (C'da).

- **`<SearchPage>`:** `?q=` bo'yicha `/api/products?q=...` natijasi, oq kartalar to'ri.

- **`<NotFoundPage>`:** oddiy 404 + bosh sahifaga qaytish.

**Kartalar:** mavjud yangilangan `Catalog` kartasi qayta ishlatiladi/moslashtiriladi (oq karta, oylik-birinchi narx, badge) + chegirma belgisi qo'shiladi. Karta bosilганda `/product/:id`.

**i18n:** mavjud 4 til saqlanadi; yangi UI matnlari (Katalog, Qidiruv, Buyurtma, Xususiyatlar, Tavsif, Chegirma va h.k.) 4 tilga qo'shiladi.

---

## 6. Admin kengaytmasi

Mavjud `<AdminApp>` (Mahsulotlar / Sozlamalar tablari) ga **Kategoriyalar** tabi qo'shiladi va mahsulot formasi boyitiladi.

- **Kategoriyalar tabi:** ro'yxat + qo'shish/tahrir/o'chir (nom, ikonka rasm yuklash (R2), tartib).
- **Mahsulot formasi (boyitiladi):** mavjud maydonlar + **kategoriya tanlash** (select), **eski narx** (ixtiyoriy son), **tavsif** (textarea), **galereya** (bir nechta rasm yuklash + tartib + o'chir), **xususiyatlar muharriri** (label/value qatorlar, qo'shish/o'chir). Saqlashda `product_images` va `product_specs` yangilanadi.
- Admin API yozish endpointlari kengaytiriladi (4-bo'lim).

---

## 7. Dizayn tili

- **Palitra:** `#1D1D1F` matn · `#0071E3` ko'k · `#F5F5F7` fon · `#6E6E73` ikkilamchi · `#1B7A34` yashil (ishonch/halol). Chegirma belgisi uchun bitta urg'u rangi `#E8462D` — faqat `-N%` belgisi va chizilgan eski narxda (marketplace signali), umumiy fon toza.
- **Tuzilma:** olcha layout (utility panel, katta qidiruv, Katalog tugmasi, kategoriya dumaloqlari, banner+yon karta, mahsulot to'ri) — lekin toza oq fon, Apple-minimalizm.
- **Shrift:** SF Pro / tizim (mavjud `--font-sans`).
- **Effektlar:** minimal — hover ko'tarilish, rasm yengil scale, banner slayder yumshoq. Ortiqcha yo'q.
- **Mobil-birinchi:** header (qidiruv + hamburger katalog), kartalar 2 ustun, mahsulot sahifasi bir ustunga tushadi.
- Mavjud Hero/kartalar yaxshilanishi (pill, ambient glow, oq kartalar, oylik-birinchi narx) shu tuzilishga ulanadi/moslashtiriladi.

---

## 8. Fayl tuzilishi (yangi/o'zgargan)

- `migrations/0003_storefront.sql` — categories, product_images, product_specs, products ALTER, seed (Create).
- `shared/types.ts` — ApiCategory, ApiSpec, ApiProductDetail, ApiProduct kengaytmasi (Modify).
- `functions/lib/db.ts` — yangi mapperlar (rowToCategory, rowToSpec, product detail yig'ish) (Modify).
- `functions/api/categories.ts`, `functions/api/products/[id].ts` — yangi (Create); `functions/api/products.ts` — query filtr (Modify).
- `functions/api/admin/categories.ts`, `.../categories/[id].ts` — yangi (Create); admin products handlerlari — images/specs/category (Modify).
- `functions/lib/validate.ts` — kategoriya + kengaytirilgan mahsulot validatsiyasi (Modify).
- `src/main.tsx` — router root (Modify); `src/App.tsx` — router + `<StoreLayout>` (katta refaktor).
- `src/store/` — `StoreLayout.tsx`, `Header.tsx`, `HomePage.tsx`, `CategoryPage.tsx`, `ProductPage.tsx`, `SearchPage.tsx`, `Gallery.tsx`, `CategoryCircles.tsx`, `HeroBanner.tsx`, `ProductCard.tsx` (Catalog kartasidan) (Create).
- `src/api/store.ts` — kategoriya/detail/query yuklovchilar (Modify).
- `src/admin/` — `CategoryList.tsx`/`CategoryForm.tsx`, boyitilgan `ProductForm.tsx` (specs/gallery/description/oldPrice) (Create/Modify).
- `src/locales.ts` — yangi UI matnlari 4 tilda (Modify).
- `package.json` — `react-router-dom` (Modify).

---

## 9. Muvaffaqiyat mezonlari

- [ ] `/`, `/category/:slug`, `/product/:id`, `/search` yo'llari ishlaydi (React Router); brauzerda orqaga/oldinga va to'g'ridan-to'g'ri URL ochish ishlaydi.
- [ ] Bosh sahifa olcha tuzilishida (header+qidiruv+kategoriya dumaloqlari+banner+to'r), toza palitrada.
- [ ] Mahsulot sahifasi: galereya, narx+chegirma, kalkulyator, "Telegram orqali buyurtma", xususiyatlar jadvali, tavsif.
- [ ] Admin: kategoriya CRUD; mahsulotga kategoriya, bir nechta rasm, xususiyatlar, tavsif, eski narx qo'sha oladi; saytda darhol ko'rinadi.
- [ ] Chegirma (eski narx bo'lsa) kartada va sahifada to'g'ri `-N%` bilan ko'rinadi.
- [ ] `bun run lint` (root + functions) toza, `bun run build` va `bun run test` o'tadi.
- [ ] Cloudflare bepul tarifida ishlaydi.
- [ ] Mobil va desktopda dizayn buzilmaydi.

## 10. Xavflar va e'tibor

- **App.tsx katta refaktori:** mavjud landing bo'limlari `<HomePage>`/`<StoreLayout>`ga ko'chiriladi — ehtiyotkorlik bilan, bosqichma-bosqich.
- **Router + SPA fallback:** `/product/:id` to'g'ridan-to'g'ri ochilganda `_redirects` index.html beradi, React Router hal qiladi — tekshiriladi.
- **Rasm hajmi:** galereya rasmlari R2'ga saqlashdan oldin siqiladi (mavjud upload cheklovlari).
- **i18n to'liqligi:** har yangi kalit 4 tilda bo'lishi shart (`Translation` tipi aks holda kompilyatsiya bermaydi).
- **Bepul limit:** kichik do'kon uchun yetarli; kuzatib boriladi.
- **B/C bog'liqlik:** qidiruv (to'liq) va savat A'da vizual/oddiy — B va C ularni funksional qiladi; header shu kengayishga tayyor quriladi.
