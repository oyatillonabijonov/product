# Foundation & SSR — Design Spec (1-bo'lak)

**Sana:** 2026-07-02
**Status:** Approved (brainstorm)
**Bo'lak:** Platforma qayta qurishning 1-bo'lagi (Foundation & SSR)

---

## 1. Kontekst: platforma ko'rinishi

Maqsad — Taqsit Store'ni bitta do'kon emas, **elektronika muddatli-to'lov do'konlari uchun qayta ishlatiladigan, SEO-optimallashtirilgan platforma**ga aylantirish.

**Asosiy tamoyil — Yadro (barqaror) ⟂ Skin (har do'kon uchun qayta quriladi):**

| Yadro (standart, qayta ishlatiladigan) | Skin (har do'kon) |
|---|---|
| SSR app shell + routing/IA | Komponent uslublari (rang, shrift, layout) |
| Ma'lumot modeli + loader'lar (D1) | Tema token *qiymatlari* + assetlar |
| Biznes-logika (kalkulyator, filtr, qidiruv, lead) | — |
| Admin, i18n, SEO karkasi | — |
| Tema token *kontrakti* (CSS o'zgaruvchilar) | — |

Har do'konda **faqat vizual skin** o'zgaradi; IA, kontent modeli va logika standart qoladi. Taqsit = birinchi skin.

**Hal qilingan strategik qarorlar (brainstorm):**
- Rebrand modeli: template; har do'kon o'z ma'lumot bazasi bilan; dizayn tubdan farq qiladi, lekin IA/logika bir xil.
- Mahsulot modeli: **to'liq variant + filtr** (rang/xotira/SIM, brend, faset filtrlar) — keyingi bo'laklarda.
- SEO: **kritik → SSR**.
- Lead oqimi: **cart → bitta Telegram/WhatsApp lead** (foydalanuvchi qayta ko'rib chiqqach cart qo'shildi) — keyingi bo'laklarda.
- Kalkulyator: mijoz uchun muhim, saqlanadi va kuchaytiriladi — keyingi bo'laklarda.
- Admin: **eng yuqori ustuvorlik** — mahsulot/narx/variant/kategoriya/brend/aksiya/kontentni to'liq boshqarish — 2-bo'lakda.

**Bo'laklarga ajratish (tartib):**
1. **Foundation & SSR** ← *bu spec*
2. Boy kontent modeli (brend, variant, atribut, aksiya, kontent sahifa, site_config) + admin boyitish
3. Katalog dvigateli (filtr, saralash, paginatsiya, brend/aksiya sahifasi, serverli qidiruv)
4. Mahsulot tajribasi (variant UI + variantga qarab kalkulyator, o'xshash mahsulotlar, lead)
5. Kontent & konversiya sahifalari + **cart → lead**
6. Home kompozitsiyasi (rail, banner, brend chizig'i)
7. SEO & performance polish (JSON-LD, sitemap, hreflang, a11y, tezlik)
8. Taqsit skin (mavjud premium dizaynni birinchi tema sifatida qo'llash)

Har bir bo'lak o'z spec → plan → implementatsiya siklini oladi.

---

## 2. Bu bo'lakning maqsadi va chegaralari

**Maqsad:** storefront'ni SSR'ga o'tkazish (React Router v7 framework mode, Cloudflare Workers) va qayta ishlatiladigan yadro karkasini (tema-token qatlami, site config, SEO karkas, i18n) o'rnatish. Butun biznes-logika (`functions/lib`) qayta ishlatiladi. **Yangi foydalanuvchi funksiyasi yo'q** — sof migratsiya + de-risk.

**Bu bo'lakda YO'Q (keyingi bo'laklarda):** variantlar, filtr/saralash, brend/aksiya/kontent sahifalari, cart, kalkulyator kengaytmasi, admin boyitish, boy JSON-LD (faqat karkas).

**Muvaffaqiyat mezoni:**
- Storefront sahifalari SSR bo'ladi — `view-source` da to'liq HTML kontent ko'rinadi (bo'sh `<div id="root">` emas).
- Admin (`/admin`) avvalgidek ishlaydi — login, mahsulot/kategoriya/sozlama CRUD, rasm yuklash.
- `bun run build` va Workers deploy toza; `bun run test` (mavjud 10/10) buzilmaydi.
- Har til alohida URL'da (`/`, `/ru`, `/en`, `/uz-cyrl`), `hreflang` teglar bor.
- Brend/kontakt/rang bitta joydan (`site.config.ts` + `theme.css`) boshqariladi.

---

## 3. Arxitektura: Workers-unified React Router v7

Deploy **Cloudflare Pages → Cloudflare Workers**ga o'tadi. RR v7 framework mode butun ilovani (storefront SSR + API) yagona Worker sifatida xizmat qiladi.

**Paketlar:** `react-router@^7`, `@react-router/dev`, `@react-router/cloudflare`, `@cloudflare/workers-types`, `wrangler`.

**Struktura (yangi `app/`):**
```
app/
  root.tsx                 # <html>, <Meta/Links/Scripts>, lang, tema token importi
  entry.server.tsx         # Cloudflare request handler (context: { env, ctx })
  entry.client.tsx         # hydrateRoot
  routes.ts                # route config (yoki fayl-konvensiyasi)
  routes/
    ($lang)._index.tsx     # Home (loader: fetchStore)
    ($lang).category.$slug.tsx
    ($lang).product.$id.tsx
    ($lang).search.tsx
    ($lang).$.tsx          # 404 (NotFound)
    api.products.tsx       # resource route -> functions/lib/db
    api.products.$id.tsx
    api.categories.tsx
    api.settings.tsx
    api.admin.*.tsx        # login/logout/me/products/categories/settings/upload (guard)
    images.$.tsx           # R2 stream (functions/images mantig'i)
    sitemap[.]xml.tsx      # resource route
    robots[.]txt.tsx       # resource route
  lib/                     # klient+server umumiy (locales, installment, site.config)
  styles/theme.css         # tema tokenlar (@theme)
server/app.ts              # worker entry (createRequestHandler)
react-router.config.ts     # ssr: true
wrangler.toml              # main = worker entry, [assets], DB, IMAGES bindings
functions/lib/             # SAQLANADI — db, auth, validate, env (server logika)
shared/types.ts            # SAQLANADI — API kontrakt
src/                       # eski komponentlar app/ ga ko'chiriladi/qayta ishlatiladi
```

**Load context:** worker entry `env` (D1 `DB`, R2 `IMAGES`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`) va `ctx`ni `RouterContextProvider` orqali loader/action'larga uzatadi. Loader'lar `context.cloudflare.env.DB`dan foydalanadi.

**Ma'lumot qatlami (loaders):** storefront loader'lari `functions/lib/db.ts` (rowToProduct, buildProductDetail, rowToCategory) ni **to'g'ridan** chaqiradi — HTTP round-trip yo'q. Lokal dev'da (D1 mavjud bo'lmasa) `src/data/products.ts` sample-data fallback saqlanadi (mavjud `src/api/store.ts` mantig'i loader'ga ko'chiriladi).

**API resource route'lar:** mavjud `functions/api/*` endpointlari yupqa RR resource route'lar sifatida qayta ochiladi, **aynan shu `functions/lib` logikasini** chaqiradi. URL'lar bir xil qoladi (`/api/products`, `/api/admin/login`, ...), shuning uchun **admin UI (fetch chaqiruvlari) o'zgarmaydi**. Admin guard (`functions/api/admin/_middleware.ts` — HMAC session cookie tekshiruvi) `functions/lib/auth.ts`dan foydalangan holda umumiy guard funksiyasiga aylanadi va har `api.admin.*` route'da qo'llanadi (login'dan tashqari).

**Rasm oqimi:** `/images/*` resource route R2 `IMAGES`dan obyekt stream qiladi (mavjud `functions/images/[[path]].ts` mantig'i).

**Admin birga yashashi:** `/admin/*` route RR ichida **klient-render** SPA sifatida ulanadi (`AdminApp` o'zgarmaydi; SEO kerak emas — `ssr: false` yoki `clientLoader`+bo'sh SSR). Admin API resource route'lar orqali ishlaydi. **Admin logikasi va UI tegilmaydi**, faqat endpoint transport qatlami ko'chadi.

---

## 4. i18n: URL-prefiksli lokallar

Til `useState` (klient) o'rniga **URL segmenti** orqali (SSR til serverda ma'lum bo'lishi uchun):

| LangKey | Locale kod | URL prefiks | hreflang |
|---|---|---|---|
| O'zbek tili | uz | `/` (default, prefikssiz) | `uz` |
| Rus tili | ru | `/ru` | `ru` |
| English | en | `/en` | `en` |
| O'zbek tili (Cyrillic) | uz-cyrl | `/uz-cyrl` | `uz-Cyrl` |

- Route'lar optional `($lang)` segmenti bilan. Loader `params.lang`ni ruxsat etilgan lokallarga tekshiradi; noto'g'ri bo'lsa 404. Prefiks yo'q = default `uz`.
- `root.tsx` `<html lang>` va `translations[langKey]`ni loader'dan oladi (klient `useState` emas).
- Header'dagi til tanlagich joriy yo'lni boshqa lokal prefiksiga navigatsiya qiladi (kontentni saqlab).
- Har sahifa `<head>`da barcha lokallar uchun `<link rel="alternate" hreflang=...>` + `x-default`.
- Mavjud `src/locales.ts` (4 til, `Translation` tipi) o'zgarmasdan qayta ishlatiladi.

---

## 5. Tema-token qatlami + site config (rebrand chegarasi)

**`app/styles/theme.css`** — barcha vizual tokenlar CSS o'zgaruvchilar sifatida (Tailwind v4 `@theme`):
```
@theme {
  --color-primary: #1D1D1F;
  --color-accent: #0071E3;
  --color-bg: #F5F5F7;
  --color-trust: #1B7A34;
  --color-sale: #E8462D;
  --radius-card: 24px;
  --font-sans: "SF Pro Display", ...;
  --shadow-apple: ...;
}
```
Yangi do'kon = shu qiymatlarni almashtirish + komponentlarni qayta bo'yash. Hozir qattiq-kodlangan hex'lar (masalan `#0071E3`) bosqichma-bosqich token'larga ko'chiriladi (bu bo'lakda kamida karkas + asosiy tokenlar).

**`app/lib/site.config.ts`** — brendga bog'liq hamma narsa bir joyda, tiplashtirilgan:
```ts
export const siteConfig = {
  name: 'Taqsit Store',
  logo: '/logo.svg',
  phone: '+998886043636',
  phoneDisplay: '+998 (88) 604-36-36',
  telegram: 'https://t.me/Taqsit_store',
  instagram: 'https://www.instagram.com/taqsit.store/',
  whatsapp: '...',
  map: { ll: '69.271481,41.338874', label: 'Malika Bozori, Toshkent' },
  currency: 'UZS',
  defaultLocale: 'uz',
  locales: ['uz', 'ru', 'en', 'uz-cyrl'],
  seo: { titleSuffix: 'Taqsit Store', ogImage: '/og.png' },
} as const;
```
Hozir komponentlarga tarqalgan kontaktlar (`+998886043636`, telegram, instagram, xarita) shu configdan o'qiladi.

---

## 6. SEO karkasi

- **Per-route `meta`:** har route `meta` export qiladi (title, description, canonical, OG). `titleSuffix` configdan.
- **Canonical + hreflang:** joriy URL'dan canonical; barcha lokallar uchun alternate hreflang.
- **JSON-LD (karkas):** `Organization` (root'da, configdan). `Product`/`BreadcrumbList`/`FAQPage` — keyingi bo'laklarda tegishli sahifalar boyitilganda.
- **`sitemap.xml`** resource route: mahsulot/kategoriya URL'larini D1'dan (fallback: sample) barcha lokallarda sanaydi.
- **`robots.txt`** resource route: `/admin`, `/api` disallow; sitemap havolasi.

---

## 7. Migratsiya bosqichlari (yuqori daraja — batafsili plan'da)

1. RR v7 skeleton: paketlar, `react-router.config.ts` (`ssr:true`), vite `reactRouter()` plugin, `app/root/entry.server/entry.client`, worker entry + load context, `wrangler.toml` (Workers, DB/IMAGES/assets).
2. Storefront route'larni ko'chirish (home/category/product/search/404) — mavjud `src/store` komponentlarini `app/`ga; loader'lar `functions/lib` + fallback.
3. i18n URL-lokal: `($lang)` segmenti, loader'da til hal qilish, `root` `lang`, til tanlagich navigatsiyasi, hreflang.
4. API resource route'lar: `/api/*` va `/api/admin/*` yupqa qatlam + umumiy admin guard; `/images/*`; admin UI'ni `/admin`da klient-render qilib ulash.
5. Tema-token qatlami + `site.config.ts`; kontakt/ranglarni ko'chirish.
6. SEO karkasi: meta/canonical/hreflang/Organization JSON-LD/sitemap/robots.
7. Verifikatsiya: build, `wrangler dev` local (D1 local), SSR view-source, admin login+CRUD, `bun run test`, Lighthouse SEO sanity.

---

## 8. Xavflar va yumshatish

- **RR v7 Workers migratsiyasi murakkabligi** → mavjud logika (`functions/lib`) o'zgarmaydi; faqat transport/render qatlami; bosqichma-bosqich, har qadamda build/test.
- **Lokal dev D1** → `wrangler d1 migrations apply --local` + fallback sample-data loader'da (dev'da D1 shart emas).
- **Admin session cookie** resource route'larda → `functions/lib/auth.ts` HMAC mantig'i o'zgarmaydi; guard umumiy funksiya.
- **SSR hidratsiya nomuvofiqligi** (til endi server-driven) → `useState` lang olib tashlanadi, til loader'dan; deterministik render.
- **Pages→Workers** binding/config farqi → `wrangler.toml` qayta yoziladi; `database_id`/R2 nomi saqlanadi; secret'lar `wrangler secret put` orqali (mavjud jarayon).

---

## 9. Ochiq savollar
Yo'q — asosiy qarorlar tasdiqlangan. Batafsil fayl-daraja qadamlar implementatsiya plan'ida (writing-plans) belgilanadi.
