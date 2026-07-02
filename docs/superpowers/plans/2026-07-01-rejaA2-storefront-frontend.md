# Reja A2 — Storefront frontend (routing + sahifalar) (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Bir sahifali saytni React Router bilan ko'p sahifali, olcha tuzilishidagi (toza palitra) storefront'ga aylantirish: umumiy shell, bosh sahifa, kategoriya sahifasi, mahsulot sahifasi (galereya + kalkulyator + Telegram buyurtma), qidiruv.

**Architecture:** `react-router-dom` qo'shiladi. `App.tsx` `RouterProvider`ga aylanadi; `<StoreLayout>` (utility panel + header + `<Outlet/>` + footer) barcha storefront sahifalarni o'raydi; `/admin*` mavjud `<AdminApp>`ga boradi. Sahifalar `src/api/store.ts` orqali A1 API'dan yuklaydi. Mavjud yangilangan mahsulot kartasi `ProductCard`ga ajratiladi va chegirma qo'shiladi.

**Tech Stack:** React 19 + Vite 6, react-router-dom v7, TypeScript strict, Tailwind v4, motion, bun.

## Global Constraints

- Strict TypeScript, `any` **ishlatilmaydi**. `bun run lint` (root + functions), `bun run build`, `bun run test` (10/10) toza.
- Paket menejeri: **bun**. Commit formati: `feat:`, `fix:`, `chore:`.
- Palitra: `#1D1D1F` matn · `#0071E3` ko'k · `#F5F5F7` fon · `#6E6E73` ikkilamchi · `#1B7A34` yashil (ishonch) · `#E8462D` chegirma. Qizil brend YO'Q; toza oq fon.
- i18n: har yangi matn kaliti 4 tilda ("O'zbek tili", "Rus tili", "English", "O'zbek tili (Cyrillic)") bo'lishi shart (`Translation` tipi aks holda kompilyatsiya bermaydi).
- Buyurtma: mavjud `composeLeadMessage`/`telegramShareUrl`/`whatsappUrl` qayta ishlatiladi (onlayn to'lov yo'q).
- **Reja A1 bajarilgan** (`/api/categories`, `/api/products?category=&q=`, `/api/products/:id`, `ApiCategory`/`ApiProductDetail`/`ApiSpec`, `ApiProduct` kengaytmasi mavjud).
- A'da: qidiruv **oddiy** (nom bo'yicha), savat/sevimlilar ikonalari **vizual** (funksional B/C'da).

## Reuse note

Mavjud Hero/kartalar yaxshilanishi (commit qilinmagan, ishchi nusxada `src/App.tsx`, `src/components/Catalog.tsx`, `src/locales.ts` da) shu refaktorga singdiriladi — ProductCard va HomePage shundan foydalanadi.

---

## File Structure

- `package.json` — `react-router-dom` (Modify).
- `src/main.tsx` — pathname tekshiruvi olib tashlanadi, faqat `<App/>` (Modify).
- `src/App.tsx` — `RouterProvider` + route ta'riflari (katta refaktor: mavjud landing markup HomePage/StoreLayout'ga ko'chiriladi) (Modify).
- `src/store/StoreLayout.tsx` — utility panel + header + Outlet + footer (Create).
- `src/store/Header.tsx` — logo, Katalog dropdown, qidiruv, ikonalar, til (Create).
- `src/store/Footer.tsx` — mavjud footer markup'idan (Create).
- `src/store/HomePage.tsx`, `CategoryPage.tsx`, `ProductPage.tsx`, `SearchPage.tsx`, `NotFoundPage.tsx` (Create).
- `src/store/HeroBanner.tsx`, `CategoryCircles.tsx`, `ProductGrid.tsx`, `ProductCard.tsx`, `Gallery.tsx` (Create).
- `src/api/store.ts` — `fetchCategories`, `fetchProductsBy`, `fetchProductDetail` (Modify).
- `src/lib/installment.ts` — `discountPercent` yordamchisi (Modify).
- `src/locales.ts` — yangi storefront UI matnlari 4 tilda (Modify).

---

### Task 1: React Router + StoreLayout shell + bo'sh sahifalar

**Files:**
- Modify: `package.json`, `src/main.tsx`, `src/App.tsx`
- Create: `src/store/StoreLayout.tsx`, `src/store/Header.tsx`, `src/store/Footer.tsx`, `src/store/NotFoundPage.tsx`, va vaqtinchalik bo'sh `src/store/HomePage.tsx`, `CategoryPage.tsx`, `ProductPage.tsx`, `SearchPage.tsx`

**Interfaces:**
- Consumes: mavjud `translations`, `LangKey`, `<AdminApp>`.
- Produces: ishlaydigan routing — `/` → HomePage, `/category/:slug` → CategoryPage, `/product/:id` → ProductPage, `/search` → SearchPage, `/admin*` → AdminApp, `*` → NotFoundPage. Til holati `StoreLayout`da (`useState`), `Outlet context` orqali sahifalarga uzatiladi: `useOutletContext<{ t: Translation; lang: LangKey }>()`.

- [x] **Step 1: react-router-dom qo'shish**

Run:
```bash
bun add react-router-dom
```
Expected: `react-router-dom` (v7) `dependencies`ga qo'shiladi.

- [x] **Step 2: Vaqtinchalik bo'sh sahifalarni yaratish**

Create `src/store/HomePage.tsx`, `src/store/CategoryPage.tsx`, `src/store/ProductPage.tsx`, `src/store/SearchPage.tsx` — har biri (keyingi tasklarda to'ldiriladi):
```tsx
export default function HomePage() {
  return <div className="max-w-[1200px] mx-auto px-4 py-10 text-[#6E6E73]">Bosh sahifa (A2)</div>;
}
```
(Fayl nomiga mos komponent nomi bilan: `CategoryPage`, `ProductPage`, `SearchPage`.)

Create `src/store/NotFoundPage.tsx`:
```tsx
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 py-24 text-center">
      <h1 className="text-[40px] font-semibold mb-3">404</h1>
      <p className="text-[#6E6E73] mb-6">Sahifa topilmadi.</p>
      <Link to="/" className="text-[#0071E3] font-semibold">Bosh sahifaga</Link>
    </div>
  );
}
```

- [x] **Step 3: Footer'ni ajratish**

`src/App.tsx`dagi mavjud `{/* Footer */}` bo'limi markup'ini (footer `<footer>...</footer>` bloki) `src/store/Footer.tsx`ga ko'chiring:
```tsx
import type { Translation } from '../locales';

export default function Footer({ t }: { t: Translation }) {
  return (
    // ← App.tsx dagi mavjud footer markup'ini shu yerga joylashtiring,
    //    `t.` kalitlari o'zgarmaydi.
    <footer>{/* ... mavjud footer JSX ... */}</footer>
  );
}
```
> Refaktor: App.tsx footer markup'i o'zgarmaydi, faqat ko'chiriladi. `t` prop orqali uzatiladi.

- [x] **Step 4: Header'ni yaratish (mavjud header markup'idan)**

`src/App.tsx`dagi `{/* Header */}` bloki markup'ini asos qilib `src/store/Header.tsx` yarating: logo + **"Katalog"** tugmasi (kategoriyalar dropdown — Task 3'da to'ldiriladi, hozir `/`ga link), **qidiruv** input (Enter → `navigate('/search?q=...')`), til selektori (mavjud markup), va vizual ❤/🛒 ikonalar (`lucide-react` `Heart`, `ShoppingCart`; `title="Tez orada"`, `disabled`/no-op). Logo `<Link to="/">`.

```tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Heart, ShoppingCart } from 'lucide-react';
import type { LangKey, Translation } from '../locales';
import logo from '../assets/logo.svg';

export default function Header({
  t,
  lang,
  setLang,
}: {
  t: Translation;
  lang: LangKey;
  setLang: (l: LangKey) => void;
}) {
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-[#E5E5EA]">
      <div className="max-w-[1200px] mx-auto px-4 h-16 flex items-center gap-4">
        <Link to="/" className="shrink-0">
          <img src={logo} alt="Taqsit Store" className="h-7" />
        </Link>
        <Link
          to="/"
          className="hidden sm:inline-flex items-center gap-2 rounded-full border border-[#D2D2D7] px-4 py-2 text-[14px] font-semibold text-[#1D1D1F] hover:border-[#0071E3]"
        >
          ☰ {t.navCatalog}
        </Link>
        <form onSubmit={submitSearch} className="flex-1 relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.navSearchPlaceholder}
            className="w-full bg-[#F5F5F7] rounded-full pl-4 pr-11 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/30"
          />
          <button type="submit" aria-label={t.navSearch} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#0071E3] text-white flex items-center justify-center">
            <Search className="w-4 h-4" />
          </button>
        </form>
        <button title={t.navSoon} className="hidden md:flex text-[#6E6E73] hover:text-[#1D1D1F]" aria-label="Sevimlilar">
          <Heart className="w-5 h-5" />
        </button>
        <button title={t.navSoon} className="text-[#6E6E73] hover:text-[#1D1D1F]" aria-label="Savat">
          <ShoppingCart className="w-5 h-5" />
        </button>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as LangKey)}
          className="text-[13px] bg-transparent focus:outline-none text-[#6E6E73]"
        >
          <option value="O'zbek tili">O'z</option>
          <option value="Rus tili">Рус</option>
          <option value="English">EN</option>
          <option value="O'zbek tili (Cyrillic)">Ўз</option>
        </select>
      </div>
    </header>
  );
}
```

- [x] **Step 5: StoreLayout'ni yaratish**

Create `src/store/StoreLayout.tsx`:
```tsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { translations, type LangKey, type Translation } from '../locales';
import Header from './Header';
import Footer from './Footer';

export interface StoreContext {
  t: Translation;
  lang: LangKey;
}

export default function StoreLayout() {
  const [lang, setLang] = useState<LangKey>("O'zbek tili");
  const t = translations[lang];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="bg-[#F5F5F7] text-[#6E6E73] text-[12px]">
        <div className="max-w-[1200px] mx-auto px-4 h-9 flex items-center gap-4">
          <span className="font-semibold text-[#1B7A34]">{t.utilInstallment}</span>
          <span className="hidden sm:inline">{t.utilDiscounts}</span>
          <a href="tel:+998886043636" className="ml-auto font-medium text-[#1D1D1F]">+998 (88) 604-36-36</a>
        </div>
      </div>
      <Header t={t} lang={lang} setLang={setLang} />
      <main className="flex-1">
        <Outlet context={{ t, lang } satisfies StoreContext} />
      </main>
      <Footer t={t} />
    </div>
  );
}
```

- [x] **Step 6: `App.tsx` ni routerga aylantirish**

`src/App.tsx` faylini to'liq quyidagiga almashtiring (mavjud landing markup HomePage'ga Task 3'da ko'chiriladi; hozir router skeleti):
```tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import StoreLayout from './store/StoreLayout';
import HomePage from './store/HomePage';
import CategoryPage from './store/CategoryPage';
import ProductPage from './store/ProductPage';
import SearchPage from './store/SearchPage';
import NotFoundPage from './store/NotFoundPage';
import AdminApp from './admin/AdminApp';

const router = createBrowserRouter([
  {
    path: '/',
    element: <StoreLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'category/:slug', element: <CategoryPage /> },
      { path: 'product/:id', element: <ProductPage /> },
      { path: 'search', element: <SearchPage /> },
    ],
  },
  { path: '/admin/*', element: <AdminApp /> },
  { path: '*', element: <NotFoundPage /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
```

- [x] **Step 7: `main.tsx` ni soddalashtirish**

`src/main.tsx` faylini quyidagiga almashtiring (pathname tekshiruvi endi kerak emas — router hal qiladi):
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [x] **Step 8: Lint, build, test**

Run:
```bash
bun run lint && bun run build && bun run test
```
Expected: xatosiz; 10/10 test. (Sahifalar hali bo'sh — routing skeleti ishlaydi.)

> Eslatma: bu task mavjud landing markup'ini App.tsx'dan olib tashlaydi (footer Footer.tsx'ga, header Header.tsx asosiga). Landing tarkibi (Hero, kartalar, HowItWorks, Conditions, Faq) Task 3'da HomePage'ga ko'chiriladi. Oraliqda bosh sahifa "Bosh sahifa (A2)" placeholder ko'rsatadi — bu **kutilgan**.

- [x] **Step 9: Commit**

```bash
git add package.json bun.lockb src/main.tsx src/App.tsx src/store/
git commit -m "feat: react-router shell with store layout, header and routes"
```

---

### Task 2: Frontend ma'lumot yuklovchilar (categories, detail, query)

**Files:**
- Modify: `src/api/store.ts`, `src/lib/installment.ts`

**Interfaces:**
- Consumes: `ApiCategory`, `ApiProduct`, `ApiProductDetail`, `ApiSpec` (`shared/types`); mavjud `mapProduct`.
- Produces:
  - `src/api/store.ts`: `fetchCategories(): Promise<ApiCategory[]>`, `fetchProductsBy(params: { category?: string; q?: string }): Promise<Product[]>`, `fetchProductDetail(id: string): Promise<ProductDetail | null>` (bu yerda `ProductDetail = Product & { description: string | null; images: string[]; specs: ApiSpec[]; oldPriceUzs: number | null }`).
  - `src/lib/installment.ts`: `discountPercent(cash: number, old: number | null): number | null` (null agar chegirma yo'q).

- [x] **Step 1: `discountPercent` yordamchisini yozish**

`src/lib/installment.ts` oxiriga:
```ts
export function discountPercent(cash: number, old: number | null): number | null {
  if (old === null || old <= cash) return null;
  return Math.round(((old - cash) / old) * 100);
}
```

- [x] **Step 2: `store.ts` yuklovchilarni qo'shish**

`src/api/store.ts` da (mavjud `mapProduct`/`mapConfig` saqlanadi) qo'shing:
```ts
import type { ApiCategory, ApiSpec } from '../../shared/types';

export interface ProductDetail extends Product {
  oldPriceUzs: number | null;
  description: string | null;
  images: string[];
  specs: ApiSpec[];
}

export async function fetchCategories(): Promise<ApiCategory[]> {
  try {
    const res = await fetch('/api/categories');
    if (!res.ok) throw new Error('api_error');
    return (await res.json()) as ApiCategory[];
  } catch {
    return [];
  }
}

export async function fetchProductsBy(params: { category?: string; q?: string }): Promise<Product[]> {
  try {
    const usp = new URLSearchParams();
    if (params.category) usp.set('category', params.category);
    if (params.q) usp.set('q', params.q);
    const res = await fetch(`/api/products?${usp.toString()}`);
    if (!res.ok) throw new Error('api_error');
    const apiProducts = (await res.json()) as ApiProduct[];
    return apiProducts.map(mapProduct);
  } catch {
    return [];
  }
}

export async function fetchProductDetail(id: string): Promise<ProductDetail | null> {
  try {
    const res = await fetch(`/api/products/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('api_error');
    const d = (await res.json()) as ApiProduct & {
      oldPriceUzs: number | null;
      description: string | null;
      images: string[];
      specs: ApiSpec[];
    };
    return {
      ...mapProduct(d),
      oldPriceUzs: d.oldPriceUzs,
      description: d.description,
      images: d.images,
      specs: d.specs,
    };
  } catch {
    return null;
  }
}
```
> Eslatma: `mapProduct` `Product` (image, condition va h.k.) qaytaradi; `oldPriceUzs` `Product`da yo'q, shuning uchun `ProductDetail`da alohida qo'shiladi. Ro'yxat kartalari uchun chegirma kerak bo'lsa, `fetchProductsBy` `ApiProduct.oldPriceUzs`ni ham uzatishi kerak — buning uchun `mapProduct`ga `oldPriceUzs` qo'shiladi (keyingi step).

- [x] **Step 3: `mapProduct`ga oldPriceUzs qo'shish**

`Product` interfeysi (`src/data/products.ts`) ga `oldPriceUzs?: number | null` qo'shing va `mapProduct` (`src/api/store.ts`) ga `oldPriceUzs: p.oldPriceUzs ?? null` qo'shing. Lokal fallback `products` massiviga tegilmaydi (ixtiyoriy maydon).

- [x] **Step 4: Lint va test**

Run:
```bash
bun run lint && bun run test
```
Expected: xatosiz; 10/10.

- [x] **Step 5: Commit**

```bash
git add src/api/store.ts src/lib/installment.ts src/data/products.ts
git commit -m "feat: storefront data loaders and discount helper"
```

---

### Task 3: ProductCard + HomePage (banner, kategoriya dumaloqlari, mahsulot to'ri)

**Files:**
- Create: `src/store/ProductCard.tsx`, `src/store/HeroBanner.tsx`, `src/store/CategoryCircles.tsx`, `src/store/ProductGrid.tsx`
- Modify: `src/store/HomePage.tsx`, `src/store/Header.tsx` (Katalog dropdown)

**Interfaces:**
- Consumes: `Product` (oldPriceUzs bilan), `fetchCategories`, `fetchProductsBy`, `formatUzs`, `lowestMonthly`, `discountPercent`, `installmentConfig` (fallback config uchun — yoki `fetchStore`), `useOutletContext<StoreContext>()`.
- Produces: `ProductCard` (`{ t, product, config }`), `HomePage` to'liq.

- [x] **Step 1: ProductCard'ni yozish (chegirma bilan)**

Create `src/store/ProductCard.tsx` (mavjud Catalog kartasi asosida, chegirma qo'shilgan, `<Link>` bilan):
```tsx
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import type { Translation } from '../locales';
import type { InstallmentConfig, Product } from '../data/products';
import { discountPercent, formatUzs, lowestMonthly } from '../lib/installment';

export default function ProductCard({
  t,
  product,
  config,
}: {
  t: Translation;
  product: Product;
  config: InstallmentConfig;
}) {
  const disc = discountPercent(product.cashPriceUzs, product.oldPriceUzs ?? null);
  return (
    <motion.div whileHover={{ y: -6 }} className="group bg-white border border-[#E8E8ED] rounded-[22px] overflow-hidden flex flex-col shadow-[--shadow-apple] hover:shadow-[--shadow-apple-hover] hover:border-[#DADADF] transition-all duration-500">
      <Link to={`/product/${product.id}`} className="h-[160px] md:h-[190px] w-full flex items-center justify-center p-5 relative bg-[#F5F5F7]">
        <span className={`absolute top-3 left-3 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${product.condition === 'yangi' ? 'bg-[#EAF3FF] text-[#0071E3]' : 'bg-[#E8F5E9] text-[#1B7A34]'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${product.condition === 'yangi' ? 'bg-[#0071E3]' : 'bg-[#1B7A34]'}`} />
          {product.condition === 'yangi' ? t.badgeNew : t.badgeUsed}
        </span>
        {disc !== null && (
          <span className="absolute top-3 right-3 text-[11px] font-semibold px-2 py-1 rounded-full bg-[#E8462D] text-white">-{disc}%</span>
        )}
        {product.image ? (
          <img src={product.image} alt={product.name} className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-[1.05]" loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <div className="text-[#C7C7CC] text-[13px]">{product.name}</div>
        )}
      </Link>
      <div className="p-4 md:p-5 flex flex-col flex-1">
        <Link to={`/product/${product.id}`} className="text-[15px] md:text-[17px] font-semibold tracking-[-0.01em] mb-0.5 hover:text-[#0071E3]">
          {product.name}
        </Link>
        <div className="mt-auto pt-4">
          <div className="text-[19px] md:text-[22px] font-semibold tracking-[-0.01em] text-[#0071E3] leading-tight">
            {formatUzs(lowestMonthly(product, config))}
          </div>
          <div className="text-[12px] text-[#6E6E73] mb-2">{t.catalogMonthlyLabel}</div>
          <div className="text-[12px] text-[#6E6E73] mb-4 flex items-center gap-2">
            {product.oldPriceUzs && product.oldPriceUzs > product.cashPriceUzs && (
              <span className="line-through text-[#B0B0B5]">{formatUzs(product.oldPriceUzs)}</span>
            )}
            <span className="text-[#1D1D1F] font-medium">{formatUzs(product.cashPriceUzs)}</span>
          </div>
          <Link to={`/product/${product.id}`} className="block text-center w-full py-2.5 bg-[#1D1D1F] text-white text-[14px] font-semibold rounded-full hover:bg-[#0071E3] transition-colors">
            {t.catalogSelect}
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
```

- [x] **Step 2: ProductGrid, CategoryCircles, HeroBanner'ni yozish**

Create `src/store/ProductGrid.tsx`:
```tsx
import type { Translation } from '../locales';
import type { InstallmentConfig, Product } from '../data/products';
import ProductCard from './ProductCard';

export default function ProductGrid({ t, items, config }: { t: Translation; items: Product[]; config: InstallmentConfig }) {
  if (items.length === 0) return <p className="text-[#6E6E73] py-8 text-center">{t.gridEmpty}</p>;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {items.map((p) => <ProductCard key={p.id} t={t} product={p} config={config} />)}
    </div>
  );
}
```

Create `src/store/CategoryCircles.tsx`:
```tsx
import { Link } from 'react-router-dom';
import type { ApiCategory } from '../../shared/types';

export default function CategoryCircles({ categories }: { categories: ApiCategory[] }) {
  if (categories.length === 0) return null;
  return (
    <div className="flex gap-5 md:gap-8 overflow-x-auto pb-2 no-scrollbar">
      {categories.map((c) => (
        <Link key={c.id} to={`/category/${c.id}`} className="shrink-0 flex flex-col items-center gap-2 w-[92px] group">
          <div className="w-[72px] h-[72px] rounded-full bg-[#F5F5F7] border border-[#E8E8ED] flex items-center justify-center overflow-hidden group-hover:border-[#0071E3] transition-colors">
            {c.iconUrl ? <img src={c.iconUrl} alt={c.name} className="w-full h-full object-cover" /> : <span className="text-[11px] text-[#C7C7CC] px-1 text-center">{c.name}</span>}
          </div>
          <span className="text-[12px] text-center text-[#1D1D1F] leading-tight">{c.name}</span>
        </Link>
      ))}
    </div>
  );
}
```

Create `src/store/HeroBanner.tsx` (oddiy statik banner, toza urg'u):
```tsx
import type { Translation } from '../locales';

export default function HeroBanner({ t }: { t: Translation }) {
  return (
    <div className="relative rounded-[24px] overflow-hidden bg-gradient-to-br from-[#EAF3FF] to-[#F5F5F7] p-8 md:p-12 min-h-[220px] flex flex-col justify-center">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full opacity-60 blur-[100px]" style={{ background: 'radial-gradient(circle, rgba(0,113,227,0.18), rgba(27,122,52,0.10) 50%, transparent 70%)' }} />
      <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#1B7A34]/[0.08] px-3 py-1 text-[12px] font-semibold text-[#1B7A34] mb-3">
        <span className="h-1.5 w-1.5 rounded-full bg-[#1B7A34]" />{t.heroPill}
      </div>
      <h1 className="text-[28px] md:text-[40px] font-semibold tracking-[-0.02em] max-w-xl leading-[1.1]">{t.heroTitle1} {t.heroTitle2}</h1>
      <p className="text-[15px] md:text-[17px] text-[#6E6E73] mt-2">{t.heroTrust}</p>
    </div>
  );
}
```

- [x] **Step 3: HomePage'ni yig'ish**

`src/store/HomePage.tsx` faylini to'liq almashtiring:
```tsx
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { ApiCategory } from '../../shared/types';
import type { InstallmentConfig, Product } from '../data/products';
import { fetchCategories, fetchProductsBy, fetchStore } from '../api/store';
import type { StoreContext } from './StoreLayout';
import HeroBanner from './HeroBanner';
import CategoryCircles from './CategoryCircles';
import ProductGrid from './ProductGrid';

export default function HomePage() {
  const { t } = useOutletContext<StoreContext>();
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [config, setConfig] = useState<InstallmentConfig | null>(null);

  useEffect(() => {
    fetchCategories().then(setCategories);
    fetchProductsBy({}).then(setProducts);
    fetchStore().then((s) => setConfig(s.config));
  }, []);

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-10 flex flex-col gap-8 md:gap-12">
      <HeroBanner t={t} />
      <CategoryCircles categories={categories} />
      <section>
        <h2 className="text-[24px] md:text-[32px] font-semibold tracking-[-0.015em] mb-6">{t.homeFeatured}</h2>
        {config && <ProductGrid t={t} items={products} config={config} />}
      </section>
    </div>
  );
}
```

- [x] **Step 4: Header "Katalog" dropdown'ini to'ldirish**

`src/store/Header.tsx`da "Katalog" linkini kategoriyalar dropdown'iga aylantiring: `useState` bilan ochilish, `fetchCategories` bilan ro'yxat, har biri `<Link to={`/category/${c.id}`}>`. (Sodda: `useEffect`da kategoriyalarni yuklab, tugma bosilганда ochiladigan `absolute` panel ko'rsating.)
```tsx
// Header ichida:
const [catOpen, setCatOpen] = useState(false);
const [cats, setCats] = useState<import('../../shared/types').ApiCategory[]>([]);
useEffect(() => { fetchCategories().then(setCats); }, []);
```
Tugma:
```tsx
<div className="relative hidden sm:block">
  <button onClick={() => setCatOpen((v) => !v)} className="inline-flex items-center gap-2 rounded-full border border-[#D2D2D7] px-4 py-2 text-[14px] font-semibold hover:border-[#0071E3]">☰ {t.navCatalog}</button>
  {catOpen && (
    <div className="absolute left-0 top-full mt-2 w-56 bg-white border border-[#E5E5EA] rounded-2xl shadow-[--shadow-apple] py-2 z-50">
      {cats.map((c) => (
        <Link key={c.id} to={`/category/${c.id}`} onClick={() => setCatOpen(false)} className="block px-4 py-2 text-[14px] hover:bg-[#F5F5F7]">{c.name}</Link>
      ))}
    </div>
  )}
</div>
```
(`fetchCategories`ni import qiling; avvalgi statik "Katalog" linkini bu blok bilan almashtiring.)

- [x] **Step 5: Lint, build, test**

Run:
```bash
bun run lint && bun run build && bun run test
```
Expected: xatosiz; 10/10.

- [x] **Step 6: Commit**

```bash
git add src/store/
git commit -m "feat: home page with banner, category circles and product grid"
```

---

### Task 4: CategoryPage va SearchPage

**Files:**
- Modify: `src/store/CategoryPage.tsx`, `src/store/SearchPage.tsx`

**Interfaces:**
- Consumes: `useParams`, `useSearchParams`, `useOutletContext<StoreContext>`, `fetchProductsBy`, `fetchStore`, `fetchCategories`, `ProductGrid`.
- Produces: kategoriya va qidiruv natijasi sahifalari.

- [x] **Step 1: CategoryPage'ni yozish**

`src/store/CategoryPage.tsx` faylini to'liq almashtiring:
```tsx
import { useEffect, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import type { InstallmentConfig, Product } from '../data/products';
import { fetchCategories, fetchProductsBy, fetchStore } from '../api/store';
import type { StoreContext } from './StoreLayout';
import ProductGrid from './ProductGrid';

export default function CategoryPage() {
  const { t } = useOutletContext<StoreContext>();
  const { slug } = useParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [config, setConfig] = useState<InstallmentConfig | null>(null);
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (!slug) return;
    fetchProductsBy({ category: slug }).then(setProducts);
    fetchStore().then((s) => setConfig(s.config));
    fetchCategories().then((cats) => setTitle(cats.find((c) => c.id === slug)?.name ?? slug));
  }, [slug]);

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-10">
      <h1 className="text-[24px] md:text-[32px] font-semibold tracking-[-0.015em] mb-6">{title}</h1>
      {config && <ProductGrid t={t} items={products} config={config} />}
    </div>
  );
}
```

- [x] **Step 2: SearchPage'ni yozish**

`src/store/SearchPage.tsx` faylini to'liq almashtiring:
```tsx
import { useEffect, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import type { InstallmentConfig, Product } from '../data/products';
import { fetchProductsBy, fetchStore } from '../api/store';
import type { StoreContext } from './StoreLayout';
import ProductGrid from './ProductGrid';

export default function SearchPage() {
  const { t } = useOutletContext<StoreContext>();
  const [sp] = useSearchParams();
  const q = sp.get('q') ?? '';
  const [products, setProducts] = useState<Product[]>([]);
  const [config, setConfig] = useState<InstallmentConfig | null>(null);

  useEffect(() => {
    fetchProductsBy({ q }).then(setProducts);
    fetchStore().then((s) => setConfig(s.config));
  }, [q]);

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-10">
      <h1 className="text-[20px] md:text-[26px] font-semibold mb-6">
        {t.searchResults}: <span className="text-[#6E6E73]">"{q}"</span>
      </h1>
      {config && <ProductGrid t={t} items={products} config={config} />}
    </div>
  );
}
```

- [x] **Step 3: Lint, build, commit**

```bash
bun run lint && bun run build && bun run test
git add src/store/CategoryPage.tsx src/store/SearchPage.tsx
git commit -m "feat: category and search pages"
```

---

### Task 5: ProductPage (galereya, narx+chegirma, kalkulyator, Telegram buyurtma, xususiyatlar, tavsif)

**Files:**
- Create: `src/store/Gallery.tsx`
- Modify: `src/store/ProductPage.tsx`

**Interfaces:**
- Consumes: `useParams`, `fetchProductDetail` (`ProductDetail`), `fetchStore` (config), `calcInstallment`, `formatUzs`, `discountPercent`, `composeLeadMessage`, `telegramShareUrl`, `whatsappUrl`.
- Produces: to'liq mahsulot sahifasi.

- [x] **Step 1: Gallery'ni yozish**

Create `src/store/Gallery.tsx`:
```tsx
import { useState } from 'react';

export default function Gallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const main = images[active] ?? images[0] ?? '';
  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-square bg-[#F5F5F7] rounded-[22px] flex items-center justify-center p-8">
        {main ? <img src={main} alt={name} className="max-w-full max-h-full object-contain" /> : <span className="text-[#C7C7CC]">{name}</span>}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button key={i} onClick={() => setActive(i)} className={`w-16 h-16 rounded-xl bg-[#F5F5F7] flex items-center justify-center p-2 border ${i === active ? 'border-[#0071E3]' : 'border-transparent'}`}>
              <img src={img} alt="" className="max-w-full max-h-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [x] **Step 2: ProductPage'ni yozish**

`src/store/ProductPage.tsx` faylini to'liq almashtiring:
```tsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { Send } from 'lucide-react';
import type { InstallmentConfig } from '../data/products';
import { fetchProductDetail, fetchStore, type ProductDetail } from '../api/store';
import { calcInstallment, composeLeadMessage, discountPercent, formatUzs, telegramShareUrl, whatsappUrl } from '../lib/installment';
import type { StoreContext } from './StoreLayout';
import Gallery from './Gallery';

export default function ProductPage() {
  const { t } = useOutletContext<StoreContext>();
  const { id } = useParams();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [config, setConfig] = useState<InstallmentConfig | null>(null);
  const [months, setMonths] = useState(12);

  useEffect(() => {
    if (!id) return;
    fetchProductDetail(id).then(setProduct);
    fetchStore().then((s) => setConfig(s.config));
  }, [id]);

  const result = useMemo(() => {
    if (!product || !config) return null;
    const term = config.terms.find((x) => x.months === months) ?? config.terms[config.terms.length - 1];
    return calcInstallment(product, term, config);
  }, [product, config, months]);

  if (product === null) return <div className="max-w-[1200px] mx-auto px-4 py-24 text-center text-[#6E6E73]">{t.loading}</div>;

  const disc = discountPercent(product.cashPriceUzs, product.oldPriceUzs);

  function order(channel: 'telegram' | 'whatsapp') {
    if (!product || !result) return;
    const msg = composeLeadMessage({ name: '', phone: '', product: product.name, months, monthly: formatUzs(result.monthly) });
    const url = channel === 'telegram' ? telegramShareUrl(msg) : whatsappUrl(msg);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-10">
      <Link to="/" className="text-[13px] text-[#6E6E73] hover:text-[#1D1D1F]">← {t.navCatalog}</Link>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
        <Gallery images={product.images} name={product.name} />
        <div>
          <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full ${product.condition === 'yangi' ? 'bg-[#EAF3FF] text-[#0071E3]' : 'bg-[#E8F5E9] text-[#1B7A34]'}`}>
            {product.condition === 'yangi' ? t.badgeNew : t.badgeUsed}
          </span>
          <h1 className="text-[26px] md:text-[34px] font-semibold tracking-[-0.02em] mt-3 mb-2">{product.name}</h1>
          {product.conditionNote && <p className="text-[14px] text-[#6E6E73] mb-3">{product.conditionNote}</p>}
          <div className="flex items-center gap-3 mb-5">
            {product.oldPriceUzs && disc !== null && (
              <>
                <span className="text-[16px] line-through text-[#B0B0B5]">{formatUzs(product.oldPriceUzs)}</span>
                <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-[#E8462D] text-white">-{disc}%</span>
              </>
            )}
            <span className="text-[24px] font-semibold">{formatUzs(product.cashPriceUzs)}</span>
          </div>

          {config && result && (
            <div className="bg-[#F5F5F7] rounded-[22px] p-5 mb-4">
              <div className="grid grid-cols-3 gap-2 mb-4">
                {config.terms.map((x) => (
                  <button key={x.months} onClick={() => setMonths(x.months)} className={`py-2.5 rounded-xl text-[14px] font-semibold ${x.months === months ? 'bg-[#0071E3] text-white' : 'bg-white border border-[#D2D2D7]'}`}>
                    {x.months} {t.calcMonths}
                  </button>
                ))}
              </div>
              <div className="text-[13px] text-[#6E6E73]">{t.calcMonthly}</div>
              <div className="text-[28px] font-semibold text-[#0071E3]">{formatUzs(result.monthly)}</div>
              <div className="flex justify-between text-[13px] text-[#6E6E73] mt-2 pt-2 border-t border-[#E5E5EA]">
                <span>{t.calcDownPayment}</span><span className="font-medium text-[#1D1D1F]">{formatUzs(result.downPaymentUzs)}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => order('telegram')} className="flex-1 py-3.5 bg-[#0071E3] text-white font-semibold rounded-full hover:bg-[#0077ED] flex items-center justify-center gap-2">
              <Send className="w-5 h-5" /> {t.formSendTelegram}
            </button>
            <button onClick={() => order('whatsapp')} className="flex-1 py-3.5 bg-[#1D1D1F] text-white font-semibold rounded-full hover:bg-[#25D366]">
              {t.formSendWhatsapp}
            </button>
          </div>
        </div>
      </div>

      {product.specs.length > 0 && (
        <div className="mt-10 max-w-2xl">
          <h2 className="text-[20px] font-semibold mb-3">{t.specsTitle}</h2>
          <table className="w-full text-[14px]">
            <tbody>
              {product.specs.map((s, i) => (
                <tr key={i} className="border-b border-[#F0F0F2]">
                  <td className="py-2.5 text-[#6E6E73] w-1/2">{s.label}</td>
                  <td className="py-2.5 text-[#1D1D1F] font-medium">{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {product.description && (
        <div className="mt-8 max-w-2xl">
          <h2 className="text-[20px] font-semibold mb-3">{t.descTitle}</h2>
          <p className="text-[15px] text-[#3A3A3C] whitespace-pre-line leading-relaxed">{product.description}</p>
        </div>
      )}
    </div>
  );
}
```
> `calcInstallment(product, ...)` `product` `ProductDetail`ni qabul qiladi — u `Product` (cashPriceUzs) ni kengaytiradi, shuning uchun imzo mos keladi.

- [x] **Step 3: Lint, build, test**

Run:
```bash
bun run lint && bun run build && bun run test
```
Expected: xatosiz; 10/10.

- [x] **Step 4: Commit**

```bash
git add src/store/Gallery.tsx src/store/ProductPage.tsx
git commit -m "feat: product detail page with gallery, calculator and telegram order"
```

---

### Task 6: Storefront locale matnlari (4 tilda)

**Files:**
- Modify: `src/locales.ts`

**Interfaces:**
- Consumes: yo'q.
- Produces: yangi kalitlar barcha 4 tilda: `navCatalog`, `navSearch`, `navSearchPlaceholder`, `navSoon`, `utilInstallment`, `utilDiscounts`, `homeFeatured`, `gridEmpty`, `searchResults`, `specsTitle`, `descTitle`, `loading`.

- [x] **Step 1: Kalitlarni 4 tilga qo'shish**

Har bir til blokiga (mos joyga) quyidagilarni qo'shing.

`"O'zbek tili"`:
```ts
    navCatalog: "Katalog",
    navSearch: "Qidirish",
    navSearchPlaceholder: "Katalogdan qidirish",
    navSoon: "Tez orada",
    utilInstallment: "0% muddatli to'lov",
    utilDiscounts: "Chegirmalar",
    homeFeatured: "Tanlangan mahsulotlar",
    gridEmpty: "Mahsulot topilmadi",
    searchResults: "Qidiruv natijasi",
    specsTitle: "Xususiyatlar",
    descTitle: "Tavsif",
    loading: "Yuklanmoqda…",
```

`"Rus tili"`:
```ts
    navCatalog: "Каталог",
    navSearch: "Искать",
    navSearchPlaceholder: "Поиск по каталогу",
    navSoon: "Скоро",
    utilInstallment: "0% рассрочка",
    utilDiscounts: "Скидки",
    homeFeatured: "Выбранные товары",
    gridEmpty: "Товары не найдены",
    searchResults: "Результаты поиска",
    specsTitle: "Характеристики",
    descTitle: "Описание",
    loading: "Загрузка…",
```

`"English"`:
```ts
    navCatalog: "Catalog",
    navSearch: "Search",
    navSearchPlaceholder: "Search the catalog",
    navSoon: "Coming soon",
    utilInstallment: "0% installment",
    utilDiscounts: "Discounts",
    homeFeatured: "Featured products",
    gridEmpty: "No products found",
    searchResults: "Search results",
    specsTitle: "Specifications",
    descTitle: "Description",
    loading: "Loading…",
```

`"O'zbek tili (Cyrillic)"`:
```ts
    navCatalog: "Каталог",
    navSearch: "Қидириш",
    navSearchPlaceholder: "Каталогдан қидириш",
    navSoon: "Тез орада",
    utilInstallment: "0% муддатли тўлов",
    utilDiscounts: "Чегирмалар",
    homeFeatured: "Танланган маҳсулотлар",
    gridEmpty: "Маҳсулот топилмади",
    searchResults: "Қидирув натижаси",
    specsTitle: "Хусусиятлар",
    descTitle: "Тавсиф",
    loading: "Юкланмоқда…",
```

- [x] **Step 2: Lint, build, test**

Run:
```bash
bun run lint && bun run build && bun run test
```
Expected: xatosiz (Translation tipi to'liq); 10/10.

- [x] **Step 3: Commit**

```bash
git add src/locales.ts
git commit -m "feat: storefront ui locale strings (4 languages)"
```

---

## Self-Review

**Spec coverage (Storefront A spec §2, §5, §7):** Routing + StoreLayout shell (§2) — Task 1. Data loaders (§4 iste'mol) — Task 2. HomePage: banner + kategoriya dumaloqlari + grid (§5) — Task 3. CategoryPage + SearchPage (§5) — Task 4. ProductPage: galereya, narx+chegirma, kalkulyator, Telegram buyurtma, specs, tavsif (§5) — Task 5. i18n (§5) — Task 6. Dizayn/palitra (§7) — barcha komponentlarda toza palitra + chegirma `#E8462D`. Admin UI (§6) — **A3** (qamrovdan tashqari).

**Placeholder scan:** Task 1 Step 3 (Footer) va Step 4 (Header) mavjud markup'ni ko'chirishga tayanadi — bu refaktor ko'rsatmasi, kod repoda mavjud; boshqa placeholder yo'q.

**Type consistency:** `StoreContext` (`{ t, lang }`) `StoreLayout`da beriladi, sahifalarda `useOutletContext<StoreContext>()`. `ProductDetail` (`store.ts`) `Product` + oldPriceUzs/description/images/specs. `discountPercent(cash, old)` ProductCard/ProductPage'da. `ProductCard` proplari `{ t, product, config }`.

**Eslatma:** HomePage' da mavjud marketing bo'limlari (Apple/PC showcase, audience, CTA) olcha tuzilishi bilan almashtiriladi; HowItWorks/Conditions/Faq ixtiyoriy — kerak bo'lsa HomePage oxiriga qo'shiladi (spec §5 ularni taqiqlamaydi). A2 ularni majburiy qilmaydi.
