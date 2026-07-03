# To'liq loyiha tekshiruvi (Full Review) — 2026-07-03

**Qamrov:** storefront (app/ + src/store + src/lib), backend/admin (functions/ + api.* + src/admin + migrations), dizayn-tizim (styles.css tokenlari, UI izchillik, a11y, responsive), SEO/i18n, edge-cache.
**Bazaviy holat:** `bun run lint` ✅ (ikkala tsconfig xatosiz), `bun run test` ✅ (137/137). Barcha topilmalar kod o'qib tasdiqlangan, taxmin yo'q.

---

## 🔴 KRITIK (darhol tuzatish shart)

### K1. Admin "Yashir/Ko'rsat" tugmasi mahsulot variantlari, galereyasi va xususiyatlarini butunlay o'chirib yuboradi
- `src/admin/ProductList.tsx:25` — `toggle()` ro'yxatdagi `ApiProduct`ni (`images/specs/options/variants` maydonlari YO'Q) `{ ...p, isActive: !p.isActive }` qilib PUT ga yuboradi.
- Server tomonda `parseProductInput` yo'q maydonlarni `[]` deb oladi (`functions/lib/validate.ts:77-122`), PUT handler esa har doim replace-all yozuvchilarni chaqiradi (`app/routes/api.admin.products.$id.tsx:50-51` → `writeImagesAndSpecs`/`writeOptionsAndVariants` avval DELETE qiladi).
- **Ssenariy:** admin 6 variantli iPhone'ni bir kunga yashiradi → barcha variantlar, chiplar, galereya va speclar qaytarib bo'lmas o'chadi. Bu har kuni bosiladigan oddiy tugma.
- **Taklif:** yo ro'yxatda ham to'liq detail olib yuborish, yo alohida yengil `PATCH { isActive }` endpoint qo'shish (afzali — ikkinchisi), yoki serverda "maydon kelmasa tegma" semantikasi.

### K2. `shadow-[--shadow-apple]` sintaksisi Tailwind v4 da ishlamaydi — saytdagi deyarli barcha soyalar renderda YO'Q
- 32 ta faylda ishlatilgan (butun storefront + admin). Tailwind v3 dagi `[--var]` → `var()` avtomatik o'girish v4 da olib tashlangan; build CSS da `--tw-shadow:--shadow-apple` invalid qiymat bo'lib chiqadi, soya umuman chizilmaydi (`hover:shadow-[--shadow-apple-hover]` ham).
- Dizaynning "premium" qatlami (karta soyalari) hozir jonli saytda yo'q.
- **Taklif:** `--shadow-apple` `@theme`da bo'lgani uchun Tailwind o'zi `shadow-apple`/`shadow-apple-hover` utility yaratadi — 32 faylda shunга almashtirish (mexanik sed-migratsiya).

### K3. Default `admin`/`admin` parol + brute-force himoyasi nol
- `migrations/0010_admin_auth.sql:13-17` `admin`/`admin` seed qiladi; `api.admin.login.tsx` da rate-limit/lockout/kechikish yo'q; `robots.txt` esa `/admin` yo'lini oshkor qiladi.
- **Ssenariy:** deploy'dan keyin istalgan odam `POST /api/admin/login` orqali darhol kiradi yoki zaif parolni Workers tezligida lug'at hujum qiladi → to'liq CMS nazorati (narxlar, bannerlar, kontaktlar).
- **Taklif:** (a) birinchi kirishda parol almashtirishga majburlash yoki default parol bilan ogohlantirish banneri; (b) oddiy rate-limit (D1 dagi hisoblagich yoki eksponensial kechikish); (c) PBKDF2 iteratsiyasini 100 000 → 600 000 ga ko'tarish (OWASP).

---

## 🟠 YUQORI

### Y1. Buyurtma linklari (biznesning yuragi!) `site_config`ni o'qimaydi — kontaktlar kodga qotirilgan
- `src/lib/installment.ts:54-55`: `TELEGRAM_USER = 'Taqsit_store'`, `WHATSAPP_PHONE = '998886043636'` — HAR BIR buyurtma tugmasi (`ProductPage.tsx:43`, `CartPage.tsx:28`) shulardan foydalanadi.
- `src/store/HeroBanner.tsx:55`: `tel:+998886043636` qotirilgan; lead xabarlarida "Taqsit Store" nomi ham qotirilgan (`installment.ts:44`, `cart.ts:98`).
- Admin "Sayt ma'lumotlari"da TG/WA/telefonni o'zgartirsa — footer yangilanadi, lekin **buyurtmalar eski kontaktlarga ketaveradi**. `ApiSiteConfig.whatsapp` yoziladi-yu, storefrontda hech kim o'qimaydi. Hujjatlashtirilgan "rebrand seam" qoidasining to'g'ridan-to'g'ri buzilishi.
- **Taklif:** kontaktlarni loader → props/context orqali komponentlarga uzatish; `telegramShareUrl`/`whatsappUrl`/lead-message funksiyalariga parametr qilib berish.

### Y2. `/uz/*` URL'lar jonli dublikat + til almashtirgich `/ru/uz/...` → 404
- `app/lib/i18n.ts:24-27`: `LOCALES` ichida `uz` bor, shuning uchun `/uz/katalog` bare `/katalog`ning to'liq nusxasi bo'lib 200 qaytaradi.
- `stripLocale` (i18n.ts:36-42) default locale'ni atayin o'tkazib yuboradi → `/uz/katalog`da hreflang `/ru/uz/katalog` (404) bo'ladi; Header'dagi til almashtirgich ham xuddi shu buzuq yo'lga olib boradi.
- **Taklif:** `/uz/*` ni bare yo'lga 301 redirect qilish (yoki `resolveLocale('uz')` → null qilib 404).

### Y3. Noma'lum URL'lar 200 qaytaradi (soft-404) va edge-cache'ga tushadi
- `app/routes/not-found.tsx` splat route'ida loader/404 status yo'q → `GET /istalgan/axlat` 200 + `s-maxage=60` bilan keshga yoziladi (`workers/app.ts:47` faqat `status === 200`ni tekshiradi). Qidiruv tizimlari axlat URL'larni indekslaydi; bot random yo'llar bilan keshni to'ldiradi. Sahifa qattiq o'zbekcha, header/footer'siz.
- Xuddi shu oila: noma'lum kategoriya slug ham 200 + slug'ni `<h1>` qilib chiqaradi (`category.tsx:18`; brand route buni to'g'ri 404 qiladi).
- **Taklif:** splat va category route'larda `throw new Response(..., { status: 404 })`; 404 sahifani tarjimali + layout'li qilish.

### Y4. Mahsulot yozuvlarida tranzaksiya yo'q — yarim yozilgan (buzilgan) mahsulot xavfi
- `api.admin.products.tsx:37-59` va `.$id.tsx:30-72`: INSERT/UPDATE + `writeImagesAndSpecs` + `writeOptionsAndVariants` alohida-alohida `.run()` — DELETE'lar avval, keyin N ta INSERT. O'rtada xato bo'lsa eski ma'lumot o'chgan, yangisi yarim yozilgan holat qoladi. D1 `batch()`ni qo'llab-quvvatlaydi, hech qayerda ishlatilmagan.
- **Taklif:** butun yozuvni `env.DB.batch([...])` ga o'tkazish.

### Y5. Sessiya bekor qilinmaydi — parol o'zgartirilsa ham o'g'irlangan cookie 7 kun ishlaydi
- `functions/lib/auth.ts:69-101` stateless HMAC token; `updateAdminAuth` `session_secret`ni aylantirmaydi; logout faqat bitta klientda cookie o'chiradi.
- **Taklif:** parol o'zgarganda `session_secret`ni rotate qilish (barcha sessiyalar avtomatik bekor bo'ladi).

---

## 🟡 O'RTA

**SEO / ulashish:**
1. **hreflang/canonical/JSON-LD URL'lari nisbiy** (`app/lib/seo.ts:17,32-40`, `product.tsx:34,39-46`) — Google nisbiy hreflang'ni e'tiborsiz qoldiradi, butun hreflang tizimi hozir samarasiz. Origin loader'da bor (sitemap allaqachon ishlatadi). → Absolut URL'ga o'tkazish.
2. **OG/Twitter meta teglar umuman yo'q** — `site_config.ogImage` admin'da tahrirlanadi-yu, hech qayerda render qilinmaydi. Asosiy kanal TG/WA bo'la turib, ulashilgan link preview'siz chiqadi. → `og:title/description/image` + product sahifada mahsulot rasmi.
3. **Edge-cache:** admin yozuvidan keyin purge yo'q — o'zgartirilgan narx ~11 daqiqagacha eski ko'rinishi mumkin (`s-maxage=60` + SWR 600, kesh-hit hech qachon qayta tekshirmaydi); kesh kaliti query-string'ni ham oladi (`?utm_*` variantlari alohida nusxa). → yo SWR'ni qisqartirish, yo admin yozuvida purge, kalitdan keraksiz paramlarni olib tashlash.

**Biznes-mantiq / copy:**
4. **Muddat default `useState(12)`** (`ProductPage.tsx:17`, `CartPage.tsx:13`) — admin muddatlarni 3/6/9 qilsa: hech bir segment tanlanmagan, hisob 9 oyga, yorliq "× 12 oy" — mijozga noto'g'ri oylik to'lov ko'rsatiladi. → `config.terms.at(-1)?.months` dan boshlash.
5. **`formatUzs` har doim "so'm"** (`installment.ts:29-32`) — RU sahifalarda ham. → locale'ga qarab "сум".
6. **"$30 to'lab, oling" copy** (`locales.ts:55-56,219-220`) kalkulyatorning foizli boshlang'ich to'loviga zid; `catalogMonthlyLabel: "Oyiga (12 oy)"` va `TermsBento` dagi "3,6,9,12 oy" ham settings'dan mustaqil qotirilgan. → copy'ni settings'ga moslash.
7. **RU ko'plik xatolari:** "1 товаров", "товар(ов)" (`locales.ts:313,325`).

**UX:**
8. **Loading/pending UI yo'q** — `useNavigation` hech qayerda ishlatilmagan; filtr/sort/sahifa almashtirishda sekin tarmoqda sahifa "qotib qolganday". `.skeleton` CSS yozib qo'yilgan-u, skeletonlar mavjud emas. → global pending-bar yoki skeleton.
9. **ErrorBoundary** (`store.tsx:33-36`): bola route'lardagi 404'ni ham generik "Xatolik yuz berdi." qiladi (mavjud bo'lmagan mahsulot "topilmadi" o'rniga "xatolik"), faqat o'zbekcha, header/footer'siz. → `isRouteErrorResponse` bilan 404/500 ajratish, tarjima, layout.
10. **Mobil headerda katalog tugmasi yo'q** (`Header.tsx:71` `hidden sm:block`) — telefonda ichki sahifadan kategoriyalarga yo'l yo'q.
11. **Bo'sh filtrlangan natijada "filtrlarni tozalash" CTA yo'q** (`ProductGrid.tsx:6`).

**A11y / kontrast:**
12. `text-muted-2` (≈3.6:1) va `text-disabled` (≈1.9:1) kichik matnlarda WCAG AA dan past (`ProductCard.tsx:47,60`, `HowItWorks.tsx:22` va b.). Til `<select>` fokus indikatorsiz (`Header.tsx:154`), Gallery thumbnail tugmalari nomsiz (`Gallery.tsx:15-17`), BannerSlider nuqtalari 8px (24px minimal touch-target).

**Backend/validatsiya:**
13. `oldPriceUzs` manfiy/cash'dan kichik qiymatni qabul qiladi (`validate.ts:74`) → manfiy chegirma badge.
14. Variant payload cap yo'q + bir xil kombinatsiyali dublikat variantlar o'tadi (`validate.ts:89-132`) → `defaultSelection`/`resolveVariant` buziladi.
15. Login timing-oracle: username xato bo'lsa PBKDF2 o'tkazib yuboriladi (`api.admin.login.tsx:17-19`) — username-enumeration.
16. Katalog `q` qidiruvi indekssiz `LIKE` + 2 korrelyatsion subquery (`loaders.ts:150-153`) — katta katalogda arzon DoS vektori. `%`/`_` wildcard'lar escape qilinmaydi.
17. Product sahifada "o'xshash mahsulotlar" so'rovi ketma-ket va `LIMIT`siz (`product.tsx:21-25`, `loaders.ts:92-108`) — 500 mahsulotli kategoriya har ochilishda to'liq o'qiladi.

---

## 🟢 PAST / Tozalash (cleanup pass)

1. **72 ta ishlatilmaydigan tarjima kaliti** `src/locales.ts`da (~44%) — faqat o'lik `src/components/` ularga murojaat qiladi.
2. **O'lik kod (tasdiqlandi, import 0):** `src/components/` (6 fayl) + `src/index.css` — o'chirish xavfsiz. Qo'shimcha o'lik: `store.tsx:18-20` `meta()` (leaf'lar bosib ketadi), `site.config.ts` dagi `logo`/`currency`, `.skeleton`/`.animate-fade-up`/`--shadow-float`/`--radius-card` CSS, `api.admin.pages.*` route'lari (SPA'da Pages tab yo'q — by design, lekin unguarded emas, shunchaki ishlatilmaydi), `Footer.tsx:11-15` no-op `fadeInUp`, `.dev.vars` dagi eski `ADMIN_*` kalitlar (o'chirish kerak — chalg'ituvchi).
3. **Markdown ichki linklar** oddiy `<a>` — locale prefiks yo'qoladi + full reload (`Markdown.tsx:10`, `FaqSection.tsx:30`, `Footer.tsx:113`).
4. **Chegirma badge nomuvofiqligi:** karta `minPriceUzs`ni ko'rsatadi, badge esa `cashPriceUzs/oldPriceUzs`dan hisoblanadi (`ProductCard.tsx:13`); variant-darajadagi chegirmalar `/chegirmalar`ga tushmaydi.
5. **Header** kategoriyalarni client-side qayta fetch qiladi (`Header.tsx:44-46`) — loader ma'lumoti bor bo'la turib.
6. Savatda cross-tab sinxron yo'q; `ensureUniqueSlug` poygasi 500 beradi (bir adminli do'konda past ehtimol); `db.ts:229` asosiy rasm galereyada dublikat bo'lishi mumkin; `images.$` route bucket'ni prefiks bilan cheklamaydi; filtr sheet yopish tugmasi `aria-label={t.filterClear}` ("Tozalash") — noto'g'ri yorliq; Pagination link emas tugma; logo `alt` qotirilgan; `HeroBanner` mesh-gradient rgba'lari accent nusxasi (rebrand'da eski rangda qoladi); radius shkalasi tartibsiz (20/22/24/28/32px aralash), umumiy Button komponenti yo'q, kalkulyator UI ProductPage/CartPage'da nusxalangan.

---

## ✅ Yaxshi holatda ekani tasdiqlanganlar

- **SQL injection yo'q** — barcha dinamik SQL `?` bind bilan; **XSS yo'q** — markdown strukturali bloklar, `safeHref`, JSON-LD escape; **har bir `api.admin.*` route `requireAdmin` bilan** (login'dan tashqari — to'g'ri); cookie flaglar to'g'ri (HttpOnly/Secure/SameSite=Lax); HMAC/parol solishtirish constant-time; upload validatsiyasi mustahkam (MIME+ext+5MB+UUID).
- Installment matematikasi to'g'ri (NaN/manfiy himoyalangan), `cartInstallment` chiziqliligi to'g'ri, `parseCart` buzuq JSON'ga chidamli, CartContext SSR-safe, variant-gen narx migratsiyasi to'g'ri.
- noindex qoidalari CLAUDE.md'ga to'liq mos; sitemap/robots to'g'ri; edge-cache'da locale/cookie oqishi yo'q; i18n parity type bilan majburlangan; token intizomi a'lo (default-palitra klasslari 0 ta); ikon qoidasi (lucide/phosphor) to'liq bajarilgan; bo'sh savat/grid holatlari tarjimali; admin xato xabarlari mapping'i ishlaydi.

---

## 📋 Takliflar — bosqichma-bosqich reja

### 1-bosqich — Kritik tuzatishlar (ma'lumot yo'qotish + xavfsizlik + ko'rinish)
| # | Ish | Fayllar | Hajm |
|---|---|---|---|
| 1 | K1: `PATCH {isActive}` yengil endpoint yoki to'liq payload | ProductList, api.admin.products.$id, validate | S |
| 2 | K2: `shadow-[--shadow-apple]` → `shadow-apple` (32 fayl) | mexanik almashtirish | S |
| 3 | K3: login rate-limit + PBKDF2 600k + default parol ogohlantirishi | auth.ts, login route, AdminApp | M |
| 4 | Y4: mahsulot yozuvlarini `DB.batch()`ga o'tkazish | db.ts, 2 route | M |
| 5 | Y5: parol o'zgarganda `session_secret` rotatsiyasi | db.ts, account route | S |

### 2-bosqich — Biznes-oqim va SEO
| # | Ish | Hajm |
|---|---|---|
| 6 | Y1: TG/WA/tel/brand'ni `site_config`dan o'qish (lead-oqim) | M |
| 7 | Y2: `/uz/*` → 301 redirect; til almashtirgich tuzatiladi | S |
| 8 | Y3: splat + category 404 status, tarjimali 404 sahifa | S |
| 9 | O'1: absolut hreflang/canonical/JSON-LD URL | S |
| 10 | O'2: OG/Twitter meta (sayt + mahsulot) | M |
| 11 | O'4: muddat defaultini settings'dan olish; "so'm/сум" | S |
| 12 | O'6-7: "$30"/"12 oy" copy'larni settings'ga moslash, RU ko'plik | S |
| 13 | O'3: cache purge/qisqartirish + query-param normalizatsiya | M |

### 3-bosqich — UX/A11y sayqal
ErrorBoundary (404/500, tarjima, layout) · pending-indikator (skeleton CSS tayyor) · mobil headerga katalog · kontrast tokenlarini AA ga siljitish · Gallery/select/slider aria · "filtrlarni tozalash" bo'sh holat CTA · kalkulyator blokini umumiy komponentga chiqarish.

### 4-bosqich — Tozalash (cleanup)
`src/components/` + `src/index.css` + 72 tarjima kaliti + o'lik CSS/exportlar + `.dev.vars` ADMIN_* o'chirish · markdown linklarni LocaleLink'ka o'tkazish · validate.ts qattiqlashtirish (oldPrice, variant cap/dublikat) · mayda backend fixlar (LIKE escape, similar LIMIT, images prefix).

**Hajm belgilari:** S — kichik (≤1 soat), M — o'rta (yarim kun).
