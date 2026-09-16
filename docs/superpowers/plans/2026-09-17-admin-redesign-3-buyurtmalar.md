# Admin qayta qurilishi — 3-bosqich (Buyurtmalar) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Buyurtmalar (konsultatsiya arizalari bilan) va Ish arizalari ekranlarini yangi UI-kit bilan qayta chizish — ro'yxat + tafsilot, holat qatorda va tafsilotda darhol saqlanadi; eski `OrdersPage`/`JobApplicationsList` (va o'lik `CareersAdmin`) o'chiriladi.

**Architecture:** Har inbox ikki ekran — ro'yxat (`DataTable`, filtrlar URL'da: `status` sukut «Yangi», `q`, `page`) va tafsilot (`TabDef.detail` tab, o'z `Page`i, "Orqaga" filtrni saqlaydi). Filtr/summa/telefon mantiqi sof `src/admin/lib/inbox.ts`da (testli), holat boshqaruvlari `src/admin/StatusControls.tsx`da (ikkala inbox uchun bitta). Tafsilot alohida GET'siz — mavjud ro'yxat API'sidan id bo'yicha topiladi. Holat o'zgarsa `AdminApp` sidebar sanog'ini yangilaydi. Server, API, migratsiya — o'zgarmaydi. Kitga 2b qoldig'i qo'shiladi: kechikkan `SearchInput` (hamma ro'yxatda), `Rows`, `Select.ariaLabel`, segmentlar mobilda 44px.

**Tech Stack:** React Router v7 (SPA admin, `useSearchParams`, `useLocation`), kit `src/admin/ui/`, lucide-react, vitest.

**Spec:** `docs/superpowers/specs/2026-09-15-admin-redesign-design.md` (§3 URL'lar, §4 vizual tizim va forma qoidalari, §5 "Buyurtmalar", §9 test, §10 3-bosqich). 2b qoldiqlari (kechikkan qidiruv naqshi, `Segmented`/`Tabs` mobilda `h-9`): `docs/superpowers/plans/2026-09-16-admin-redesign-2b-mahsulotlar.md` → "Natija va qoldiqlar"; `CareersAdmin` o'chirilishi: `docs/superpowers/plans/2026-09-15-admin-redesign-1-qobiq.md` → "Natija va qoldiqlar" (6-bosqichdan 3-bosqichga ko'chdi — u o'chiriladigan `JobApplicationsList`ni import qiladi).

## Global Constraints

- **Tokenlar:** hex yo'q; `text-[Npx]` yo'q — shkala `text-heading/subhead/copy/control/para/label`; radius faqat `xs/sm/md/lg/xl/full`; `shadow-*` yo'q; `bg-white`/`text-white` yuza uchun yozilmaydi (istisno: kit `primary`/chip'dagi `bg-cta text-white`). `danger` to'ldirmasi ustida matn `text-bg`. Holat ranglari (spec §4): `new` — e'tibor kerak (yangi), `verified` — bajarildi, `danger` — xato.
- **`press`** har bosiladigan elementda (havolalar ham); `press` bor elementga `transition-*` qo'shilmaydi. `text-muted-3` faqat ikonka/hairline.
- **TS:** strict, `any` yo'q; `@types/react` yo'q — `useState(x as T)` + o'qishda cast, hook chaqiruvida generik yo'q, `useRef(x) as { current: T }`; `key` faqat native element yoki `FC<{…}>` komponentda; event tiplari `React.ChangeEvent / KeyboardEvent / SyntheticEvent` (shim `src/admin/react-events.d.ts`).
- **Forma/ro'yxat qoidalari (spec §4):** holat o'zgarishi darhol saqlanadi (toast bilan), xato — `errText` + xato toast va optimistik qiymat qaytadi; bo'sh holat `EmptyState` bitta amal bilan; yuklanish `Skeleton`; ro'yxat: qidiruv + segmentlar + son, sahifalash «‹ 3 / 80 ›» (`Pagination`, 20 tadan).
- **Server/API o'zgarmaydi** (spec §1.5): `GET /api/admin/orders`, `PATCH /api/admin/orders/:id`, `GET /api/admin/job-applications`, `PATCH /api/admin/job-applications/:id` va `src/admin/api.ts`dagi `listOrders`/`setOrderStatus`/`listJobApplications`/`setJobApplicationStatus` aynan ishlatiladi. Migratsiya yo'q.
- Telefon havolasi faqat `telHref(phone)`; tashqi havola (rezyume) faqat `safeHref` o'tkazsa, `target="_blank" rel="noopener noreferrer"` bilan.
- Admin UI faqat o'zbekcha. `bun`/`bunx`, npm emas. Har task oxirida `bun run lint && bun run test` yashil. Implementer subagent chaqirmaydi va brauzer tekshiruvini qilmaydi — brauzer qadamlari **controller**niki (egasi Browser panelida kirgan holda, 1440 / 1024 / 375px).
- Sinov yozuvlari **API orqali emas** (`/api/order` Telegram'ga yuboradi va rate-limit'ga tushadi) — faqat lokal `data/store.db`ga to'g'ridan-to'g'ri (Task 3 skripti), bosqich oxirida o'chiriladi.
- Eski ekranlar (`src/admin/OrdersPage.tsx`, `src/admin/JobApplicationsList.tsx`, `src/admin/CareersAdmin.tsx`) faqat o'chiriladi, "yaxshilanmaydi".
- Commit trailer: `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Fayl tuzilmasi

- `src/admin/ui/form.tsx` — `+SearchInput` (lokal matn, `onChange` 250 ms kechikib), `Select` `+ariaLabel`. `src/admin/ui/layout.tsx` — `+Rows` (`ProductEdit`dan ko'chadi), `Tabs` mobilda 44px. `src/admin/ui/controls.tsx` — `Segmented` mobilda 44px. `src/admin/ui/index.ts` — eksportlar.
- `src/admin/screens/ProductEdit.tsx` — lokal `Rows` o'rniga kit'dagisi. `ProductsList.tsx`, `ModelsList.tsx`, `BrandsList.tsx` — qidiruv `SearchInput`ga.
- `src/admin/lib/inbox.ts` (+ `inbox.test.ts`, yangi) — `StatusFilter`, `STATUSES`, `ORDER_STATUS`, `APPLICATION_STATUS`, `parseStatus`, `statusSegments`, `filterInbox`, `telHref`, `itemsTotal`, `orderSource`, `orderSummary`, `orderTotal`. `src/admin/lib/format.ts` (+ test) — `+formatDateTime`, `+formatSum`.
- `src/admin/StatusControls.tsx` (yangi) — `StatusSelect` (qator), `StatusCard` (tafsilot).
- `src/admin/screens/OrdersList.tsx`, `OrderDetail.tsx`, `ApplicationsList.tsx`, `ApplicationDetail.tsx` (yangi).
- `src/admin/nav.ts` — `orders` bo'limining ikkala tabida `detail: true`; `src/admin/AdminApp.tsx` — `screenFor` yangi ekranlarga + `refreshCounts`.
- O'chadi: `src/admin/OrdersPage.tsx`, `src/admin/JobApplicationsList.tsx`, `src/admin/CareersAdmin.tsx`.
- Hujjat: `CLAUDE.md` (admin bo'limi, sof yordamchilar, o'lik kod), spec §3/§5 (3-bosqich qarorlari).

URL'lar: `/admin/orders` (`status`, `q`, `page`), `/admin/orders/:id`; `/admin/orders/applications` (`status`, `q`, `page`), `/admin/orders/applications/:id` (`parseAdminPath`: `applications` — segment; raqamli id segment nomi bilan to'qnashmaydi).

---

### Task 1: Kit — `SearchInput`, `Rows`, `Select.ariaLabel`, mobil segmentlar 44px; ro'yxatlar qidiruvi

**Files:**
- Modify: `src/admin/ui/form.tsx` (importlar, `Select`, `+SearchInput`)
- Modify: `src/admin/ui/layout.tsx` (`+Rows`, `Tabs`)
- Modify: `src/admin/ui/controls.tsx:126` (`Segmented` tugmasi)
- Modify: `src/admin/ui/index.ts`
- Modify: `src/admin/screens/ProductEdit.tsx:23,30-40`
- Modify: `src/admin/screens/ProductsList.tsx:9,115`, `src/admin/screens/ModelsList.tsx:7,68`, `src/admin/screens/BrandsList.tsx:6,64`

**Interfaces:**
- Produces: `SearchInput: FC<{ value: string; onChange: (v: string) => void; placeholder: string }>` — `value` URL'dan, `onChange` URL'ga yozadi (250 ms kechikib, har doim eng oxirgi `onChange` bilan). `Rows: FC<{ rows: { k: string; v: ReactNode }[] }>`. `Select` props'iga `ariaLabel?: string`. Hammasi `src/admin/ui/index.ts`dan eksport.

- [ ] **Step 1: `form.tsx` — importlar.** Fayl boshidagi uchta import qatorini almashtiring:
```ts
import { useEffect, useRef, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Toggle } from './controls';
```

- [ ] **Step 2: `form.tsx` — `SearchInput`.** `Input` komponentidan keyin (`export const Textarea` dan oldin) qo'shing:
```tsx
/**
 * Ro'yxat qidiruvi: matn lokal holatda, `onChange` (URL'ga yozish) 250 ms kechikib chaqiriladi — har harfda
 * navigatsiya bo'lmaydi. Tashqaridan kelgan qiymat ("Filtrni tozalash", orqaga) maydonni yangilaydi; o'zimiz
 * yuborgan qiymat qaytib kelganda esa yangilamaydi — aks holda shu orada yozilgan harf yo'qolardi.
 */
export const SearchInput: FC<{ value: string; onChange: (v: string) => void; placeholder: string }> = ({ value, onChange, placeholder }) => {
  const [raw, setText] = useState(value);
  const text = raw as string;
  const sent = useRef(value) as { current: string };
  // Taymer eng oxirgi `onChange`ni chaqirsin: eskisi eski URL parametrlarini yozib, shu orada tanlangan filtrni bekor qilardi.
  const latest = useRef(onChange) as { current: (v: string) => void };
  useEffect(() => { latest.current = onChange; });
  useEffect(() => {
    if (value === sent.current) return;
    sent.current = value;
    setText(value);
  }, [value]);
  useEffect(() => {
    if (text === sent.current) return;
    const t = setTimeout(() => { sent.current = text; latest.current(text); }, 250);
    return () => clearTimeout(t);
  }, [text]);
  return (
    <span className="relative block">
      <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
      <input
        type="search"
        value={text}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setText(e.target.value)}
        className={`${INPUT_CLS} appearance-none pl-9`}
      />
    </span>
  );
};
```

- [ ] **Step 3: `form.tsx` — `Select`ga `ariaLabel`.** `Select` komponentini (izoh bilan) shu bilan almashtiring:
```tsx
/** Native select — o'z chevroni bilan (brauzer ko'rsatkichi har OS'da har xil). `ariaLabel` — `Field`siz (jadval qatorida) ishlatilganda. */
export const Select: FC<{ value: string; onChange: (v: string) => void; disabled?: boolean; ariaLabel?: string; children: ReactNode }> = ({
  value, onChange, disabled, ariaLabel, children,
}) => (
  <span className="relative block">
    <select
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      className={`${INPUT_CLS} appearance-none pr-9`}
    >
      {children}
    </select>
    <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
  </span>
);
```

- [ ] **Step 4: `layout.tsx` — `Rows`.** `Card` komponentidan keyin (`/** Segment-kontrol (URL'ga bog'liq)` izohidan oldin) qo'shing (`ReactNode` importi faylda bor):
```tsx
/** Faqat o'qiladigan kalit/qiymat ro'yxati (Billz'dan kelgan maydonlar, buyurtma tafsiloti). */
export const Rows: FC<{ rows: { k: string; v: ReactNode }[] }> = ({ rows }) => (
  <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-para">
    {rows.map((r, i) => (
      <div key={`${i}-${r.k}`} className="contents">
        <dt className="text-muted">{r.k}</dt>
        <dd className="min-w-0 break-words text-primary">{r.v}</dd>
      </div>
    ))}
  </dl>
);
```

- [ ] **Step 5: `layout.tsx` — `Tabs` mobilda 44px.** `Tabs` izohini va `Link`ning `className`ini almashtiring:
```tsx
/** Segment-kontrol (URL'ga bog'liq): konteyner 12px, ichki 8px — konsentrik. Mobilda yonga suriladi, tugma 44px (tegish maydoni), `md`dan 36px. */
```
```tsx
            className={`press flex h-11 items-center whitespace-nowrap rounded-xs px-3.5 text-para md:h-9 ${
              it.id === active ? 'bg-surface text-primary' : 'text-muted hover:text-primary'
            }`}
```
(Eskisi: `` `press block h-9 whitespace-nowrap rounded-xs px-3.5 text-para leading-9 ${ `` — `block`/`leading-9` o'rniga `flex items-center`.)

- [ ] **Step 6: `controls.tsx:126` — `Segmented` tugmasi mobilda 44px.** `className` qatori:
```tsx
          className={`press h-11 whitespace-nowrap rounded-xs px-3.5 text-para md:h-9 ${o.id === value ? 'bg-surface text-primary' : 'text-muted hover:text-primary'}`}
```
`Segmented` izohining oxiriga qo'shing: `Tugma mobilda 44px, \`md\`dan 36px.`

- [ ] **Step 7: `index.ts`** — ikki qator:
```ts
export { Page, Card, Rows, Tabs, EmptyState, Skeleton, Pagination } from './layout';
export { INPUT_CLS, Field, Input, SearchInput, Textarea, Select, SwitchRow, LangPair } from './form';
```

- [ ] **Step 8: `ProductEdit.tsx` — kit'dagi `Rows`.** 30–40-qatorlarni (izoh `/** Billz tovarida sinxron ustunlar faqat o'qiladi — kalit/qiymat ro'yxati. */` va `const Rows … );`) ortidagi bo'sh qator bilan birga o'chiring. 23-qatordagi importga `Rows` qo'shing:
```ts
import { Button, Card, EmptyState, Field, INPUT_CLS, Input, Page, Rows, Segmented, Select, Skeleton, SwitchRow, Textarea } from '../ui';
```
(`ReactNode` importi qoladi — `Chip` ishlatadi. `<Rows rows={…} />` chaqiruvlari o'zgarmaydi.)

- [ ] **Step 9: ro'yxatlar qidiruvi `SearchInput`ga.** Uchala faylda `Input` faqat qidiruv uchun ishlatilgan — importdan chiqadi:
  - `ProductsList.tsx:9` → `import { Badge, Button, Card, DataTable, EmptyState, Pagination, SearchInput, Segmented, Select, Skeleton, Toggle, type Column } from '../ui';`; 115-qator → `<SearchInput value={q} onChange={(v) => update('q', v)} placeholder="Nom bo'yicha qidirish…" />`
  - `ModelsList.tsx:7` → `import { Button, Card, DataTable, EmptyState, Pagination, SearchInput, Select, Skeleton, type Column } from '../ui';`; 68-qator → `<SearchInput value={q} onChange={(v) => update('q', v)} placeholder="Qidirish (masalan: 16 pro)" />`
  - `BrandsList.tsx:6` → `import { Button, Card, DataTable, EmptyState, SearchInput, Skeleton, type Column } from '../ui';`; 64-qator → `<SearchInput value={q} onChange={updateQ} placeholder="Nom bo'yicha qidirish…" />`

- [ ] **Step 10: Tekshiruv.**
Run: `bun run lint && bun run test`
Expected: lint xatosiz; `Test Files 28 passed (28)`, `Tests 310 passed (310)` (bu task test qo'shmaydi — komponent testlari loyihada yo'q, `SearchInput` brauzerda tekshiriladi).
Run: `grep -rn "const Rows" src/admin` → faqat `src/admin/ui/layout.tsx`.

- [ ] **Step 11: Commit**
```bash
git add src/admin/ui/form.tsx src/admin/ui/layout.tsx src/admin/ui/controls.tsx src/admin/ui/index.ts src/admin/screens/ProductEdit.tsx src/admin/screens/ProductsList.tsx src/admin/screens/ModelsList.tsx src/admin/screens/BrandsList.tsx
git commit -m "feat(admin): kit — kechikkan SearchInput, Rows, Select ariaLabel, mobil segmentlar 44px

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 12 (controller, brauzer):** `/admin/products` — "iphone 16" tez yoziladi: harf yo'qolmaydi, URL `q` bir marta pauzadan keyin yoziladi; yozib bo'lib 250 ms ichida "Yashirin" segmenti bosiladi — `f` ham, `q` ham qoladi; bo'sh natijada "Filtrni tozalash" maydonni ham tozalaydi; mahsulotga kirib "Orqaga" — maydonda qidiruv turadi; qidiruv ikonkasi matnga tegmaydi. `/admin/products/models`, `/admin/products/brands` qidiruvi. Billz tovari tahririda faqat-o'qish ro'yxatlari avvalgidek. 375px: segment va mobil tab tugmalari 44px.

---

### Task 2: Sof yordamchilar — `inbox.ts`, `formatDateTime`, `formatSum`

**Files:**
- Create: `src/admin/lib/inbox.ts`
- Test: `src/admin/lib/inbox.test.ts`
- Modify: `src/admin/lib/format.ts`
- Test: `src/admin/lib/format.test.ts`

**Interfaces:**
- Consumes: `ApiOrder`, `OrderItemInput`, `OrderStatus` (`shared/types.ts`); `formatThousands` (`format.ts`).
- Produces (`inbox.ts`):
  - `type StatusFilter = OrderStatus | 'all'`
  - `STATUSES: OrderStatus[]` (`['new', 'contacted', 'done']`)
  - `ORDER_STATUS: Record<OrderStatus, string>` (Yangi / Bog'lanildi / Bajarildi), `APPLICATION_STATUS: Record<OrderStatus, string>` (Yangi / Bog'lanildi / Yopildi)
  - `parseStatus(raw: string | null): StatusFilter` — bo'sh/noma'lum → `'new'`
  - `statusSegments(labels: Record<OrderStatus, string>, newCount: number): { id: StatusFilter; label: string }[]`
  - `filterInbox<T extends { name: string; phone: string; status: OrderStatus }>(items: T[], status: StatusFilter, q: string): T[]`
  - `telHref(phone: string): string`
  - `itemsTotal(items: OrderItemInput[]): number`
  - `orderSource(o: Pick<ApiOrder, 'source' | 'paymentKind'>): string`
  - `orderSummary(o: Pick<ApiOrder, 'source' | 'items' | 'note'>): string`
  - `orderTotal(o: Pick<ApiOrder, 'source' | 'paymentKind' | 'items' | 'totalUzs'>): number | null`
- Produces (`format.ts`): `formatDateTime(sec: number): string` («17.09.2026 14:05», Toshkent vaqti), `formatSum(n: number | null): string` (`null` → «—», aks holda «12 500 000 so'm», 0 → «0 so'm»).

- [ ] **Step 1: `inbox.test.ts` — muvaffaqiyatsiz test.**
```ts
import { describe, expect, it } from 'vitest';
import type { ApiOrder, OrderItemInput } from '../../../shared/types';
import {
  APPLICATION_STATUS, ORDER_STATUS, filterInbox, itemsTotal, orderSource, orderSummary, orderTotal, parseStatus, statusSegments, telHref,
} from './inbox';

const order = (over: Partial<ApiOrder> = {}): ApiOrder => ({
  id: 1, createdAt: 0, name: 'Ali Valiyev', phone: '+998 90 123-45-67', note: '',
  paymentKind: 'cash', termMonths: null, downPaymentUzs: null, monthlyUzs: null, totalUzs: null,
  items: [{ productId: 'p1', name: 'iPhone 16', variantLabel: '128GB', qty: 1, priceUzs: 12_000_000 }],
  source: 'product', status: 'new', telegramSent: true,
  ...over,
});

describe('parseStatus', () => {
  it("bo'sh va noma'lum qiymat — new", () => {
    expect(parseStatus(null)).toBe('new');
    expect(parseStatus('')).toBe('new');
    expect(parseStatus('archived')).toBe('new');
  });
  it("ma'lum qiymatlar o'zicha qoladi", () => {
    expect(parseStatus('contacted')).toBe('contacted');
    expect(parseStatus('done')).toBe('done');
    expect(parseStatus('all')).toBe('all');
  });
});

describe('statusSegments', () => {
  it("yangi soni faqat 0 dan katta bo'lsa yoziladi, Hammasi oxirida", () => {
    expect(statusSegments(ORDER_STATUS, 3).map((s) => s.label)).toEqual(['Yangi 3', "Bog'lanildi", 'Bajarildi', 'Hammasi']);
    expect(statusSegments(APPLICATION_STATUS, 0).map((s) => s.label)).toEqual(['Yangi', "Bog'lanildi", 'Yopildi', 'Hammasi']);
    expect(statusSegments(ORDER_STATUS, 0).map((s) => s.id)).toEqual(['new', 'contacted', 'done', 'all']);
  });
});

describe('filterInbox', () => {
  const items = [
    order({ id: 1, name: 'Ali Valiyev', phone: '+998 90 123-45-67', status: 'new' }),
    order({ id: 2, name: 'Olim Karimov', phone: '+998 (93) 555 00 11', status: 'contacted' }),
    order({ id: 3, name: 'Aliya', phone: '998977770000', status: 'done' }),
  ];
  const ids = (xs: ApiOrder[]) => xs.map((x) => x.id);
  it("holat bo'yicha; all — hammasi", () => {
    expect(ids(filterInbox(items, 'new', ''))).toEqual([1]);
    expect(ids(filterInbox(items, 'all', ''))).toEqual([1, 2, 3]);
  });
  it("ism bo'yicha, katta-kichik harfsiz, chetdagi bo'shliqsiz", () => {
    expect(ids(filterInbox(items, 'all', '  ALI '))).toEqual([1, 3]);
  });
  it("raqamli so'rov — telefon raqamlari bo'yicha (bo'shliq, tire, qavs, + farqsiz)", () => {
    expect(ids(filterInbox(items, 'all', '93 555'))).toEqual([2]);
    expect(ids(filterInbox(items, 'all', '+99890123'))).toEqual([1]);
    expect(ids(filterInbox(items, 'all', '(93)'))).toEqual([2]);
  });
  it('qidiruv holat filtri bilan birga ishlaydi', () => {
    expect(ids(filterInbox(items, 'new', 'aliya'))).toEqual([]);
  });
});

describe('telHref', () => {
  it("ko'rinish belgilarini olib tashlaydi, + qoladi", () => {
    expect(telHref('+998 (90) 123-45-67')).toBe('tel:+998901234567');
    expect(telHref('90 123 45 67')).toBe('tel:901234567');
  });
});

describe('orderSource', () => {
  it('konsultatsiya, muddatli, naqd', () => {
    expect(orderSource(order({ source: 'consult' }))).toBe('Konsultatsiya');
    expect(orderSource(order({ paymentKind: 'installment' }))).toBe('Muddatli');
    expect(orderSource(order({ source: 'cart' }))).toBe('Naqd');
  });
});

describe('orderSummary', () => {
  it('bitta tovar — variant bilan', () => {
    expect(orderSummary(order())).toBe('iPhone 16 (128GB)');
  });
  it('birinchi tovar soni va qolgan qatorlar', () => {
    const o = order({
      items: [
        { productId: 'a', name: 'AirPods Pro', variantLabel: '', qty: 2, priceUzs: 3_000_000 },
        { productId: 'b', name: 'Case', variantLabel: '', qty: 1, priceUzs: 100_000 },
        { productId: 'c', name: 'Cable', variantLabel: '', qty: 1, priceUzs: 50_000 },
      ],
    });
    expect(orderSummary(o)).toBe('AirPods Pro ×2 + yana 2');
  });
  it("konsultatsiya — izoh (mavzular), bo'sh bo'lsa tire", () => {
    expect(orderSummary(order({ source: 'consult', items: [], note: 'Apple · PC' }))).toBe('Apple · PC');
    expect(orderSummary(order({ source: 'consult', items: [], note: '' }))).toBe('—');
  });
});

describe('orderTotal / itemsTotal', () => {
  const items: OrderItemInput[] = [
    { productId: 'a', name: 'A', variantLabel: '', qty: 2, priceUzs: 1_000_000 },
    { productId: 'b', name: 'B', variantLabel: '', qty: 1, priceUzs: 500_000 },
  ];
  it("naqd — tovarlar yig'indisi", () => {
    expect(itemsTotal(items)).toBe(2_500_000);
    expect(orderTotal(order({ items }))).toBe(2_500_000);
  });
  it("muddatli — totalUzs, bo'lmasa naqd yig'indi", () => {
    expect(orderTotal(order({ items, paymentKind: 'installment', totalUzs: 3_100_000 }))).toBe(3_100_000);
    expect(orderTotal(order({ items, paymentKind: 'installment', totalUzs: null }))).toBe(2_500_000);
  });
  it('konsultatsiya — null', () => {
    expect(orderTotal(order({ source: 'consult', items: [] }))).toBeNull();
  });
});
```

- [ ] **Step 2: Muvaffaqiyatsizligini ko'ring.**
Run: `bunx vitest run src/admin/lib/inbox.test.ts`
Expected: FAIL — `./inbox` moduli topilmadi.

- [ ] **Step 3: `inbox.ts`.**
```ts
import type { ApiOrder, OrderItemInput, OrderStatus } from '../../../shared/types';

/** Holat filtri (URL `status`): `new` — sukut, ro'yxat kiruvchi quti bo'lib ochiladi; `all` — hammasi. */
export type StatusFilter = OrderStatus | 'all';

export const STATUSES: OrderStatus[] = ['new', 'contacted', 'done'];

export const ORDER_STATUS: Record<OrderStatus, string> = { new: 'Yangi', contacted: "Bog'lanildi", done: 'Bajarildi' };
/** Nomzod arizasi "bajarilmaydi" — yopiladi (eski ekrandagi so'z). */
export const APPLICATION_STATUS: Record<OrderStatus, string> = { new: 'Yangi', contacted: "Bog'lanildi", done: 'Yopildi' };

/** URL qiymati → filtr; bo'sh yoki noma'lum qiymat → `new`. */
export function parseStatus(raw: string | null): StatusFilter {
  return raw === 'contacted' || raw === 'done' || raw === 'all' ? raw : 'new';
}

/** Segmentlar «Yangi 3 · Bog'lanildi · Bajarildi · Hammasi» (spec §5); yangi yo'q bo'lsa son yozilmaydi. */
export function statusSegments(labels: Record<OrderStatus, string>, newCount: number): { id: StatusFilter; label: string }[] {
  return [
    { id: 'new', label: newCount > 0 ? `${labels.new} ${newCount}` : labels.new },
    { id: 'contacted', label: labels.contacted },
    { id: 'done', label: labels.done },
    { id: 'all', label: 'Hammasi' },
  ];
}

/**
 * Holat + qidiruv (client'da). Raqamli so'rov ("93 555", "+998…") telefon raqamlari bo'yicha — bo'shliq, tire,
 * qavsdan qat'i nazar; harfli so'rov ism bo'yicha, katta-kichik harfsiz.
 */
export function filterInbox<T extends { name: string; phone: string; status: OrderStatus }>(items: T[], status: StatusFilter, q: string): T[] {
  const needle = q.trim().toLowerCase();
  const digits = /^[\d\s()+-]+$/.test(needle) ? needle.replace(/\D/g, '') : '';
  return items.filter((x) => {
    if (status !== 'all' && x.status !== status) return false;
    if (!needle) return true;
    return digits ? x.phone.replace(/\D/g, '').includes(digits) : x.name.toLowerCase().includes(needle);
  });
}

/** `tel:` havolasi: ko'rinish belgilari (bo'shliq, tire, qavs) tushib qoladi, `+` qoladi. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/** Tovarlar yig'indisi (naqd narx × soni). */
export function itemsTotal(items: OrderItemInput[]): number {
  return items.reduce((s, it) => s + it.priceUzs * it.qty, 0);
}

/** Manba: konsultatsiya arizasi (mahsulotsiz) yoki to'lov turi. */
export function orderSource(o: Pick<ApiOrder, 'source' | 'paymentKind'>): string {
  if (o.source === 'consult') return 'Konsultatsiya';
  return o.paymentKind === 'installment' ? 'Muddatli' : 'Naqd';
}

/** Qatordagi tarkib: birinchi tovar (variant, soni) va «+ yana N»; konsultatsiyada mavzular/izoh. */
export function orderSummary(o: Pick<ApiOrder, 'source' | 'items' | 'note'>): string {
  const first = o.items[0];
  if (o.source === 'consult' || !first) return o.note || '—';
  let label = first.variantLabel ? `${first.name} (${first.variantLabel})` : first.name;
  if (first.qty > 1) label += ` ×${first.qty}`;
  return o.items.length > 1 ? `${label} + yana ${o.items.length - 1}` : label;
}

/**
 * Summa — Telegram xabaridagi bilan bir xil (`shared/order.ts`): muddatlida mijoz to'laydigan jami (`totalUzs`,
 * bo'lmasa naqd yig'indi), naqdda tovarlar yig'indisi; konsultatsiyada summa yo'q.
 */
export function orderTotal(o: Pick<ApiOrder, 'source' | 'paymentKind' | 'items' | 'totalUzs'>): number | null {
  if (o.source === 'consult') return null;
  if (o.paymentKind === 'installment' && o.totalUzs != null) return o.totalUzs;
  return itemsTotal(o.items);
}
```

- [ ] **Step 4: O'tishini ko'ring.**
Run: `bunx vitest run src/admin/lib/inbox.test.ts`
Expected: PASS (15 test).

- [ ] **Step 5: `format.test.ts` — muvaffaqiyatsiz testlar.** 2-qatordagi importni almashtiring va fayl oxiriga qo'shing:
```ts
import { formatDateTime, formatSum, formatThousands, parseDigits } from './format';
```
```ts
describe('formatDateTime', () => {
  it('Toshkent vaqtida (UTC+5)', () => {
    expect(formatDateTime(Date.UTC(2026, 8, 17, 9, 5) / 1000)).toBe('17.09.2026 14:05');
  });
  it("yarim tundan o'tganda sana ham o'tadi", () => {
    expect(formatDateTime(Date.UTC(2026, 11, 31, 20, 30) / 1000)).toBe('01.01.2027 01:30');
  });
});

describe('formatSum', () => {
  it("ming bo'lib, so'm bilan", () => {
    expect(formatSum(12_500_000)).toBe("12 500 000 so'm");
  });
  it("null — tire, 0 — «0 so'm»", () => {
    expect(formatSum(null)).toBe('—');
    expect(formatSum(0)).toBe("0 so'm");
  });
});
```

Run: `bunx vitest run src/admin/lib/format.test.ts`
Expected: FAIL — `formatDateTime`/`formatSum` eksport qilinmagan.

- [ ] **Step 6: `format.ts` — fayl oxiriga.**
```ts
/** Unix soniya → «17.09.2026 14:05», Toshkent vaqti (UTC+5, yozgi vaqt yo'q) — brauzer mintaqasidan qat'i nazar. */
export function formatDateTime(sec: number): string {
  const d = new Date((sec + 5 * 3600) * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/** So'mdagi summa; yo'q bo'lsa «—». 0 — «0 so'm» (masalan, boshlang'ich to'lovsiz muddatli). */
export function formatSum(n: number | null): string {
  if (n == null) return '—';
  return `${formatThousands(n) || '0'} so'm`;
}
```

- [ ] **Step 7: Hammasi.**
Run: `bun run lint && bun run test`
Expected: lint xatosiz; `Test Files 29 passed (29)`, `Tests 329 passed (329)`.

- [ ] **Step 8: Commit**
```bash
git add src/admin/lib/inbox.ts src/admin/lib/inbox.test.ts src/admin/lib/format.ts src/admin/lib/format.test.ts
git commit -m "feat(admin): buyurtma/ariza yordamchilari — holat filtri, qidiruv, summa, Toshkent vaqti

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Buyurtmalar — ro'yxat, tafsilot, holat boshqaruvlari

**Files:**
- Create: `src/admin/StatusControls.tsx`
- Create: `src/admin/screens/OrdersList.tsx`
- Create: `src/admin/screens/OrderDetail.tsx`
- Modify: `src/admin/nav.ts:37`
- Modify: `src/admin/AdminApp.tsx:24,38-39,46,72,74,140`
- Delete: `src/admin/OrdersPage.tsx`

**Interfaces:**
- Consumes: Task 1 — `SearchInput`, `Rows`, `Select` `ariaLabel`; Task 2 — `inbox.ts` va `formatDateTime`/`formatSum` (imzolar yuqorida); mavjud kit — `Badge`, `Button` (`href`, `to`), `Card`, `DataTable`/`Column`, `Dot`, `EmptyState`, `Page` (`title`, `description`, `back`, `actions`), `Pagination`, `Segmented`, `Skeleton`, `Tone`, `useToast` (`toast(text, 'error'?)`); `api.ts` — `listOrders(): Promise<ApiOrder[]>`, `setOrderStatus(id: number, status: OrderStatus)`; `errText(e: unknown): string`.
- Produces:
  - `StatusSelect: FC<{ value: OrderStatus; labels: Record<OrderStatus, string>; onChange: (s: OrderStatus) => void; ariaLabel: string }>` va `StatusCard: FC<{ value: OrderStatus; labels: Record<OrderStatus, string>; onChange: (s: OrderStatus) => void; telegramSent: boolean }>` (`src/admin/StatusControls.tsx`, Task 4 ishlatadi).
  - `OrdersList: FC<{ onCountsChange: () => void }>`, `OrderDetail: FC<{ id: string; onCountsChange: () => void }>` (default eksport).
  - `AdminApp`: `screenFor(key, clearDefaultPw, defaultPw, id, refreshCounts: () => void)`; `SectionPage` propi `refreshCounts` (Task 4 ishlatadi).

- [ ] **Step 1: `src/admin/StatusControls.tsx`.**
```tsx
import type { FC } from 'react';
import type { OrderStatus } from '../../shared/types';
import { STATUSES } from './lib/inbox';
import { Card, Dot, Segmented, Select, type Tone } from './ui';

/** Holat rangi (spec §4): yangi — e'tibor kerak, bog'lanildi — jarayonda, bajarildi/yopildi — tugagan. */
const TONE: Record<OrderStatus, Tone> = { new: 'attention', contacted: 'info', done: 'ok' };

/** Jadval qatoridagi holat: rang nuqtasi + select; o'zgarish darhol saqlanadi (`DataTable` select bosilganda qatorni ochmaydi). */
export const StatusSelect: FC<{ value: OrderStatus; labels: Record<OrderStatus, string>; onChange: (s: OrderStatus) => void; ariaLabel: string }> = ({
  value, labels, onChange, ariaLabel,
}) => (
  <span className="flex items-center gap-2">
    <Dot tone={TONE[value]} />
    <span className="w-full md:w-36">
      <Select value={value} onChange={(v) => onChange(v as OrderStatus)} ariaLabel={ariaLabel}>
        {STATUSES.map((s) => <option key={s} value={s}>{labels[s]}</option>)}
      </Select>
    </span>
  </span>
);

/** Tafsilot sahifasidagi holat kartasi: segment darhol saqlanadi; Telegram'ga ketmagan bo'lsa ogohlantiradi. */
export const StatusCard: FC<{ value: OrderStatus; labels: Record<OrderStatus, string>; onChange: (s: OrderStatus) => void; telegramSent: boolean }> = ({
  value, labels, onChange, telegramSent,
}) => (
  <Card title="Holat">
    <Segmented
      label="Holat"
      value={value}
      onChange={(v) => onChange(v as OrderStatus)}
      options={STATUSES.map((s) => ({ id: s, label: labels[s] }))}
    />
    {!telegramSent && (
      <p className="mt-3 text-para text-danger">
        Telegram guruhiga yuborilmagan — Sozlamalar'da bot tokeni va guruh ID'sini tekshiring.
      </p>
    )}
  </Card>
);
```

- [ ] **Step 2: `src/admin/screens/OrdersList.tsx`.**
```tsx
import { useEffect, useMemo, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { ApiOrder, OrderStatus } from '../../../shared/types';
import { listOrders, setOrderStatus } from '../api';
import { errText } from '../errText';
import { formatDateTime, formatSum } from '../lib/format';
import { ORDER_STATUS, filterInbox, orderSummary, orderTotal, parseStatus, statusSegments, telHref } from '../lib/inbox';
import { StatusSelect } from '../StatusControls';
import { Badge, Button, Card, DataTable, EmptyState, Pagination, SearchInput, Segmented, Skeleton, type Column } from '../ui';
import { useToast } from '../ui/toast';

const PAGE_SIZE = 20;
const LIST = '/admin/orders';

/**
 * Buyurtmalar va konsultatsiya arizalari (spec §5). Filtrlar URL'da — `status` (sukut «Yangi»: ro'yxat kiruvchi
 * quti bo'lib ochiladi, dashboard havolasi shu yerga), `q` (ism yoki telefon), `page`. Holat qatorda darhol
 * saqlanadi va sidebar sanog'i yangilanadi; «Yangi» filtrida holati o'zgargan qator ro'yxatdan chiqadi.
 * Tarkib ustuni `xl`dan — 1024px'da jadval sig'sin (mobil kartada doim bor).
 * ponytail: API oxirgi 200 ta buyurtmani beradi — ko'proq kerak bo'lsa server tomonda sahifalash.
 */
const OrdersList: FC<{ onCountsChange: () => void }> = ({ onCountsChange }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const status = parseStatus(params.get('status'));
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [rawItems, setItems] = useState(null as ApiOrder[] | null);
  const items = rawItems as ApiOrder[] | null;
  const [error, setError] = useState('');

  function load() {
    setError('');
    listOrders().then(setItems).catch(() => setError('Yuklashda xatolik'));
  }
  useEffect(load, []);

  /** URL parametrini yozadi; filtr o'zgarsa sahifa 1 ga qaytadi. */
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  }

  const filtered = useMemo(() => filterInbox(items ?? [], status, q), [items, status, q]);
  const newCount = (items ?? []).filter((o) => o.status === 'new').length;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function changeStatus(o: ApiOrder, next: OrderStatus) {
    // Optimistik: qator darhol almashadi, xato bo'lsa qaytadi.
    const put = (s: OrderStatus) => setItems((xs: ApiOrder[] | null) => xs && xs.map((x) => (x.id === o.id ? { ...x, status: s } : x)));
    put(next);
    try {
      await setOrderStatus(o.id, next);
      toast(`${o.name} — ${ORDER_STATUS[next]}`);
      onCountsChange();
    } catch (e) {
      put(o.status);
      toast(errText(e), 'error');
    }
  }

  const columns: Column<ApiOrder>[] = [
    {
      id: 'who', label: 'Mijoz', mobile: 'title',
      cell: (o) => (
        <span className="flex min-w-0 flex-col gap-1">
          <span className="max-w-48 truncate text-primary">{o.name}</span>
          <span className="flex flex-wrap items-center gap-1.5">
            <a href={telHref(o.phone)} className="press whitespace-nowrap text-label text-cta">{o.phone}</a>
            {o.source === 'consult' && <Badge>Konsultatsiya</Badge>}
            {o.source !== 'consult' && o.paymentKind === 'installment' && <Badge tone="info">Muddatli</Badge>}
            {!o.telegramSent && <Badge tone="danger">TG yuborilmadi</Badge>}
          </span>
        </span>
      ),
    },
    {
      id: 'items', label: 'Tarkib', className: 'hidden xl:table-cell',
      cell: (o) => <span className="block max-w-56 truncate text-muted">{orderSummary(o)}</span>,
    },
    { id: 'sum', label: 'Summa', align: 'right', cell: (o) => <span className="whitespace-nowrap tabular-nums">{formatSum(orderTotal(o))}</span> },
    { id: 'date', label: 'Sana', cell: (o) => <span className="whitespace-nowrap text-label text-muted">{formatDateTime(o.createdAt)}</span> },
    {
      id: 'status', label: 'Holat',
      cell: (o) => <StatusSelect value={o.status} labels={ORDER_STATUS} onChange={(s) => changeStatus(o, s)} ariaLabel={`${o.name} — holat`} />,
    },
  ];

  let empty: ReactNode;
  if (q) {
    empty = (
      <EmptyState
        title="Hech narsa topilmadi"
        text="Ism yoki telefon raqamini tekshiring."
        action={<Button variant="secondary" onClick={() => update('q', '')}>Qidiruvni tozalash</Button>}
      />
    );
  } else if (status === 'all') {
    empty = <EmptyState title="Hozircha buyurtma yo'q" text="Saytdagi buyurtmalar va konsultatsiya arizalari shu yerda saqlanadi." />;
  } else {
    empty = (
      <EmptyState
        title={status === 'new' ? "Yangi buyurtma yo'q" : "Bu holatda buyurtma yo'q"}
        action={<Button variant="secondary" onClick={() => update('status', 'all')}>Hammasini ko'rish</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          label="Holat"
          value={status}
          onChange={(v) => update('status', v === 'new' ? '' : v)}
          options={statusSegments(ORDER_STATUS, newCount)}
        />
        <div className="lg:w-64">
          <SearchInput value={q} onChange={(v) => update('q', v)} placeholder="Ism yoki telefon…" />
        </div>
      </div>

      {error ? (
        <EmptyState title="Ma'lumot yuklanmadi" text={error} action={<Button variant="secondary" onClick={load}>Qayta urinish</Button>} />
      ) : !items ? (
        <Skeleton rows={8} />
      ) : (
        <>
          <p className="text-label text-muted">{filtered.length} ta buyurtma</p>
          <Card padded={false}>
            <div className="px-2 py-1">
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(o) => String(o.id)}
                onRowClick={(o) => navigate(`${LIST}/${o.id}`, { state: { search: params.toString() } })}
                empty={empty}
              />
            </div>
          </Card>
          <Pagination page={safePage} pageCount={pageCount} onChange={(p) => update('page', String(p))} />
        </>
      )}
    </div>
  );
};

export default OrdersList;
```

- [ ] **Step 3: `src/admin/screens/OrderDetail.tsx`.**
```tsx
import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Link, useLocation } from 'react-router';
import { Phone } from 'lucide-react';
import type { ApiOrder, OrderStatus } from '../../../shared/types';
import { listOrders, setOrderStatus } from '../api';
import { errText } from '../errText';
import { formatDateTime, formatSum } from '../lib/format';
import { ORDER_STATUS, itemsTotal, orderSource, telHref } from '../lib/inbox';
import { StatusCard } from '../StatusControls';
import { Button, Card, EmptyState, Page, Rows, Skeleton } from '../ui';
import { useToast } from '../ui/toast';

const LIST = '/admin/orders';
type LoadState = 'loading' | 'ready' | 'missing' | 'error';

/**
 * Buyurtma tafsiloti (`/admin/orders/:id`): to'liq tarkib, muddatli shartlar, izoh; holat darhol saqlanadi.
 * Alohida GET yo'q — ro'yxat API'si (oxirgi 200 ta) yuklanib id bo'yicha topiladi. "Orqaga" ro'yxat filtrini
 * saqlaydi (`location.state.search`).
 */
const OrderDetail: FC<{ id: string; onCountsChange: () => void }> = ({ id, onCountsChange }) => {
  const location = useLocation();
  const search = (location.state as { search?: string } | null)?.search;
  const backTo = search ? `${LIST}?${search}` : LIST;
  const toast = useToast();
  const [rawOrder, setOrder] = useState(null as ApiOrder | null);
  const order = rawOrder as ApiOrder | null;
  const [rawLoad, setLoad] = useState('loading' as LoadState);
  const load = rawLoad as LoadState;

  function fetchOrder() {
    setLoad('loading');
    listOrders()
      .then((xs) => {
        const found = xs.find((x) => String(x.id) === id) ?? null;
        setOrder(found);
        setLoad(found ? 'ready' : 'missing');
      })
      .catch(() => setLoad('error'));
  }
  useEffect(fetchOrder, [id]);

  async function changeStatus(next: OrderStatus) {
    if (!order) return;
    setOrder({ ...order, status: next });
    try {
      await setOrderStatus(order.id, next);
      toast(`Holat: ${ORDER_STATUS[next]}`);
      onCountsChange();
    } catch (e) {
      setOrder(order);
      toast(errText(e), 'error');
    }
  }

  if (load !== 'ready' || !order) {
    return (
      <Page title="Buyurtma" back={backTo}>
        {load === 'loading' ? (
          <Skeleton rows={4} />
        ) : load === 'missing' ? (
          <EmptyState
            title="Buyurtma topilmadi"
            text="Faqat oxirgi 200 ta buyurtma ochiladi."
            action={<Button variant="secondary" to={LIST}>Buyurtmalarga qaytish</Button>}
          />
        ) : (
          <EmptyState
            title="Ma'lumot yuklanmadi"
            text="Tarmoq yoki server xatosi — qayta urinib ko'ring."
            action={<Button variant="secondary" onClick={fetchOrder}>Qayta urinish</Button>}
          />
        )}
      </Page>
    );
  }

  const installment = order.source !== 'consult' && order.paymentKind === 'installment';
  return (
    <Page
      title={order.name}
      description={`№${order.id} · ${formatDateTime(order.createdAt)}`}
      back={backTo}
      actions={<Button variant="secondary" href={telHref(order.phone)}><Phone aria-hidden className="size-4" /> Qo'ng'iroq</Button>}
    >
      <div className="flex flex-col gap-4">
        <StatusCard value={order.status} labels={ORDER_STATUS} onChange={changeStatus} telegramSent={order.telegramSent} />
        <Card title="Mijoz">
          <Rows
            rows={[
              { k: 'Telefon', v: <a href={telHref(order.phone)} className="press text-cta">{order.phone}</a> },
              { k: 'Manba', v: orderSource(order) },
              ...(order.note ? [{ k: 'Izoh', v: <span className="whitespace-pre-line">{order.note}</span> }] : []),
            ]}
          />
        </Card>
        {order.items.length > 0 && (
          <Card title="Tarkib" padded={false}>
            <ul className="mt-2 divide-y divide-line-3 px-5">
              {order.items.map((it, i) => (
                <li key={`${i}-${it.productId}`} className="flex items-start justify-between gap-4 py-3 text-para">
                  <div className="min-w-0">
                    <Link to={`/admin/products/${it.productId}`} className="press inline-block text-primary hover:text-cta">{it.name}</Link>
                    {it.variantLabel && <p className="text-label text-muted-2">{it.variantLabel}</p>}
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <p className="text-primary">{formatSum(it.priceUzs * it.qty)}</p>
                    {it.qty > 1 && <p className="text-label text-muted-2">{it.qty} × {formatSum(it.priceUzs)}</p>}
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-3 text-para font-semibold text-primary">
              <span>{installment ? 'Naqd narxi' : 'Jami'}</span>
              <span className="tabular-nums">{formatSum(itemsTotal(order.items))}</span>
            </div>
          </Card>
        )}
        {installment && (
          <Card title="Muddatli to'lov">
            <Rows
              rows={[
                { k: 'Muddat', v: order.termMonths ? `${order.termMonths} oy` : '—' },
                { k: "Boshlang'ich to'lov", v: formatSum(order.downPaymentUzs) },
                { k: "Oylik to'lov", v: formatSum(order.monthlyUzs) },
                { k: 'Jami', v: formatSum(order.totalUzs) },
              ]}
            />
          </Card>
        )}
      </div>
    </Page>
  );
};

export default OrderDetail;
```

- [ ] **Step 4: `nav.ts:37`** — buyurtmalar tabi o'z `Page`ini chizadi:
```ts
      { id: 'list', segment: '', label: 'Buyurtmalar', Icon: Inbox, detail: true },
```

- [ ] **Step 5: `AdminApp.tsx`.**
  - 24-qator `import OrdersPage from './OrdersPage';` o'rniga:
```ts
import OrdersList from './screens/OrdersList';
import OrderDetail from './screens/OrderDetail';
```
  - 38–39-qatorlar (izoh va imzo) o'rniga:
```tsx
/** Bo'lim + tab → ekran. Kalit `${section}/${tab.id}`; `refreshCounts` — holat o'zgarganda sidebar sanog'ini yangilaydi. */
function screenFor(key: string, clearDefaultPw: () => void, defaultPw: boolean, id: string | null, refreshCounts: () => void) {
```
  - 46-qator `case 'orders/list': return <OrdersPage />;` o'rniga:
```tsx
    case 'orders/list': return id ? <OrderDetail key={id} id={id} onCountsChange={refreshCounts} /> : <OrdersList onCountsChange={refreshCounts} />;
```
  - 72-qator (`SectionPage` imzosi) o'rniga:
```tsx
function SectionPage({ section, tab, route, clearDefaultPw, defaultPw, refreshCounts }: { section: SectionDef; tab: TabDef; route: AdminRoute; clearDefaultPw: () => void; defaultPw: boolean; refreshCounts: () => void }) {
```
  - 74-qatorda `screenFor(…)` chaqiruvi oxiriga `refreshCounts` argumenti qo'shiladi — qator shunday bo'ladi:
```tsx
  const screen = <div key={`${section.id}/${tab.id}/${route.id ?? ''}`}>{screenFor(`${section.id}/${tab.id}`, clearDefaultPw, defaultPw, route.id, refreshCounts)}</div>;
```
  - 140-qator `<SectionPage … />` ga prop qo'shing: `refreshCounts={refreshDash}` (`refreshDash` — mavjud `useCallback`).

- [ ] **Step 6: Eski ekranni o'chiring.**
```bash
git rm src/admin/OrdersPage.tsx
grep -rn "OrdersPage" src app
```
Expected: `grep` hech narsa topmaydi (`CLAUDE.md`dagi eslatma Task 4'da yangilanadi).

- [ ] **Step 7: Tekshiruv.**
Run: `bun run lint && bun run test`
Expected: lint xatosiz; `Test Files 29 passed (29)`, `Tests 329 passed (329)`.

- [ ] **Step 8: Commit**
```bash
git add src/admin/StatusControls.tsx src/admin/screens/OrdersList.tsx src/admin/screens/OrderDetail.tsx src/admin/nav.ts src/admin/AdminApp.tsx
git commit -m "feat(admin): buyurtmalar ro'yxati va tafsiloti kit bilan; eski OrdersPage o'chirildi

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 9 (controller): sinov yozuvlari.** Skriptni scratchpad'ga `seed-inbox.cjs` nomi bilan yozing va loyiha ildizidan ishga tushiring: `NODE_PATH=node_modules node <scratchpad>/seed-inbox.cjs` (o'chirish: `… seed-inbox.cjs --clean`). Faqat lokal `data/store.db`; ism `SINOV ` bilan boshlanadi.
```js
// Lokal sinov yozuvlari (faqat data/store.db). Tozalash: --clean
const Database = require('better-sqlite3');
const db = new Database('data/store.db');
if (process.argv.includes('--clean')) {
  const orders = db.prepare("DELETE FROM orders WHERE name LIKE 'SINOV %'").run().changes;
  const applications = db.prepare("DELETE FROM job_applications WHERE name LIKE 'SINOV %'").run().changes;
  console.log({ orders, applications });
  process.exit(0);
}
const [p1, p2] = db.prepare('SELECT id, name FROM products ORDER BY name LIMIT 2').all();
const it = (p, variantLabel, qty, priceUzs) => ({ productId: p.id, name: p.name, variantLabel, qty, priceUzs });
const now = Math.floor(Date.now() / 1000);
const order = db.prepare(`INSERT INTO orders (created_at, name, phone, note, payment_kind, term_months, down_payment_uzs,
  monthly_uzs, total_uzs, items_json, source, status, telegram_sent) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
order.run(now - 300, 'SINOV Ali Valiyev', '+998 90 123-45-67', '', 'cash', null, null, null, null,
  JSON.stringify([it(p1, '24GB/512GB', 1, 21_500_000)]), 'product', 'new', 1);
order.run(now - 3600, 'SINOV Olim Karimov', '+998 (93) 555 00 11', "Kechqurun qo'ng'iroq qiling", 'cash', null, null, null, null,
  JSON.stringify([it(p1, '', 2, 1_200_000), it(p2, 'Qora', 1, 300_000), it(p2, 'Oq', 1, 300_000)]), 'cart', 'new', 0);
order.run(now - 86400, 'SINOV Aziza Rahimova', '+998 97 777 00 00', '', 'installment', 12, 5_000_000, 1_450_000, 22_400_000,
  JSON.stringify([it(p1, '', 1, 18_000_000)]), 'product', 'contacted', 1);
order.run(now - 2 * 86400, 'SINOV Bekzod', '+998 99 000 11 22', 'Apple · PC — MacBook tanlashda yordam', 'cash', null, null, null, null,
  '[]', 'consult', 'new', 1);
order.run(now - 5 * 86400, 'SINOV Dilnoza', '+998 91 222 33 44', '', 'cash', null, null, null, null,
  JSON.stringify([it(p2, '', 1, 450_000)]), 'product', 'done', 1);
const appl = db.prepare(`INSERT INTO job_applications (created_at, vacancy_id, position, name, phone, message, resume_url, status,
  telegram_sent) VALUES (?,?,?,?,?,?,?,?,?)`);
appl.run(now - 900, null, 'Umumiy ariza', 'SINOV Sardor Tursunov', '+998 90 111 22 33',
  "Savdo bo'limida 3 yil tajriba.\nApple mahsulotlarini yaxshi bilaman.", 'https://t.me/sardor_cv', 'new', 1);
appl.run(now - 7200, null, 'Sotuv menejeri', 'SINOV Malika', '+998 93 444 55 66', '', '', 'new', 0);
appl.run(now - 3 * 86400, null, 'Servis muhandisi', 'SINOV Javlon', '+998 95 777 88 99', 'Tajriba: 5 yil',
  'https://example.com/cv.pdf', 'done', 1);
console.log('ok');
```

- [ ] **Step 10 (controller, brauzer):** `/admin/orders` — sukut «Yangi 3» segmenti, 3 qator (konsultatsiya belgisi, "TG yuborilmadi", savat qatorida «+ yana 2» — 1440px'da); «Hammasi» — 5 ta; qidiruv "olim" va "93 555"; qatordagi select bilan holat o'zgaradi — toast, qator «Yangi»dan chiqadi, sidebar badge kamayadi; qator bosilsa tafsilot — Holat kartasi, Mijoz (izoh), Tarkib (mahsulot havolasi, «2 × …», Jami), muddatli buyurtmada «Muddatli to'lov» kartasi va «Naqd narxi», konsultatsiyada Tarkib yo'q; tafsilotda segment bilan holat — toast; "Orqaga" filtr va qidiruvni saqlaydi; `/admin/orders/999999` — «Buyurtma topilmadi». 1024px — jadval gorizontal siljimaydi; 375px — kartalar, select to'liq enli, tab va segment 44px.

---

### Task 4: Ish arizalari — ro'yxat, tafsilot; eski ekranlar va hujjat

**Files:**
- Create: `src/admin/screens/ApplicationsList.tsx`
- Create: `src/admin/screens/ApplicationDetail.tsx`
- Modify: `src/admin/nav.ts:38`
- Modify: `src/admin/AdminApp.tsx` (import, `orders/applications` holati)
- Delete: `src/admin/JobApplicationsList.tsx`, `src/admin/CareersAdmin.tsx`
- Modify: `CLAUDE.md`, `docs/superpowers/specs/2026-09-15-admin-redesign-design.md`

**Interfaces:**
- Consumes: Task 3 — `StatusSelect`, `StatusCard` (`src/admin/StatusControls.tsx`), `screenFor(…, refreshCounts)`; Task 2 — `APPLICATION_STATUS`, `filterInbox`, `parseStatus`, `statusSegments`, `telHref`, `formatDateTime`; Task 1 — `SearchInput`, `Rows`; `api.ts` — `listJobApplications(): Promise<ApiJobApplication[]>`, `setJobApplicationStatus(id: number, status: OrderStatus)`; `safeHref(url: string): string | null` (`src/lib/safe-href.ts`).
- Produces: `ApplicationsList: FC<{ onCountsChange: () => void }>`, `ApplicationDetail: FC<{ id: string; onCountsChange: () => void }>` (default eksport).

Ruling (reja): `CareersAdmin.tsx` 1-bosqichdan beri hech qayerdan import qilinmaydi (CLAUDE.md "Known dead code"), lekin o'chiriladigan `JobApplicationsList`ni import qiladi — shu task'da birga o'chadi (1-bosqich qoldig'ida 6-bosqichga yozilgan edi).

- [ ] **Step 1: `src/admin/screens/ApplicationsList.tsx`.**
```tsx
import { useEffect, useMemo, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ExternalLink } from 'lucide-react';
import type { ApiJobApplication, OrderStatus } from '../../../shared/types';
import { safeHref } from '../../lib/safe-href';
import { listJobApplications, setJobApplicationStatus } from '../api';
import { errText } from '../errText';
import { formatDateTime } from '../lib/format';
import { APPLICATION_STATUS, filterInbox, parseStatus, statusSegments, telHref } from '../lib/inbox';
import { StatusSelect } from '../StatusControls';
import { Badge, Button, Card, DataTable, EmptyState, Pagination, SearchInput, Segmented, Skeleton, type Column } from '../ui';
import { useToast } from '../ui/toast';

const PAGE_SIZE = 20;
const LIST = '/admin/orders/applications';

/**
 * Ish arizalari (spec §5) — buyurtmalar ro'yxati naqshi: filtrlar URL'da (`status` sukut «Yangi», `q`, `page`),
 * holat qatorda darhol saqlanadi. Rezyume havolasi faqat `safeHref` o'tkazsa chiziladi; ustun `xl`dan.
 * ponytail: API oxirgi 200 ta arizani beradi.
 */
const ApplicationsList: FC<{ onCountsChange: () => void }> = ({ onCountsChange }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const status = parseStatus(params.get('status'));
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [rawItems, setItems] = useState(null as ApiJobApplication[] | null);
  const items = rawItems as ApiJobApplication[] | null;
  const [error, setError] = useState('');

  function load() {
    setError('');
    listJobApplications().then(setItems).catch(() => setError('Yuklashda xatolik'));
  }
  useEffect(load, []);

  /** URL parametrini yozadi; filtr o'zgarsa sahifa 1 ga qaytadi. */
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  }

  const filtered = useMemo(() => filterInbox(items ?? [], status, q), [items, status, q]);
  const newCount = (items ?? []).filter((a) => a.status === 'new').length;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function changeStatus(a: ApiJobApplication, next: OrderStatus) {
    // Optimistik: qator darhol almashadi, xato bo'lsa qaytadi.
    const put = (s: OrderStatus) =>
      setItems((xs: ApiJobApplication[] | null) => xs && xs.map((x) => (x.id === a.id ? { ...x, status: s } : x)));
    put(next);
    try {
      await setJobApplicationStatus(a.id, next);
      toast(`${a.name} — ${APPLICATION_STATUS[next]}`);
      onCountsChange();
    } catch (e) {
      put(a.status);
      toast(errText(e), 'error');
    }
  }

  const columns: Column<ApiJobApplication>[] = [
    {
      id: 'who', label: 'Nomzod', mobile: 'title',
      cell: (a) => (
        <span className="flex min-w-0 flex-col gap-1">
          <span className="max-w-48 truncate text-primary">{a.name}</span>
          <span className="flex flex-wrap items-center gap-1.5">
            <a href={telHref(a.phone)} className="press whitespace-nowrap text-label text-cta">{a.phone}</a>
            {!a.telegramSent && <Badge tone="danger">TG yuborilmadi</Badge>}
          </span>
        </span>
      ),
    },
    { id: 'position', label: 'Lavozim', cell: (a) => <span className="block max-w-56 truncate text-muted">{a.position}</span> },
    {
      id: 'resume', label: 'Rezyume', className: 'hidden xl:table-cell',
      cell: (a) => {
        const href = safeHref(a.resumeUrl);
        return href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="press inline-flex items-center gap-1 text-label text-cta">
            Ochish <ExternalLink aria-hidden className="size-3.5" />
          </a>
        ) : (
          <span className="text-muted-2">—</span>
        );
      },
    },
    { id: 'date', label: 'Sana', cell: (a) => <span className="whitespace-nowrap text-label text-muted">{formatDateTime(a.createdAt)}</span> },
    {
      id: 'status', label: 'Holat',
      cell: (a) => <StatusSelect value={a.status} labels={APPLICATION_STATUS} onChange={(s) => changeStatus(a, s)} ariaLabel={`${a.name} — holat`} />,
    },
  ];

  let empty: ReactNode;
  if (q) {
    empty = (
      <EmptyState
        title="Hech narsa topilmadi"
        text="Ism yoki telefon raqamini tekshiring."
        action={<Button variant="secondary" onClick={() => update('q', '')}>Qidiruvni tozalash</Button>}
      />
    );
  } else if (status === 'all') {
    empty = <EmptyState title="Hozircha ariza yo'q" text="«Vakansiyalar» sahifasidan yuborilgan arizalar shu yerda saqlanadi." />;
  } else {
    empty = (
      <EmptyState
        title={status === 'new' ? "Yangi ariza yo'q" : "Bu holatda ariza yo'q"}
        action={<Button variant="secondary" onClick={() => update('status', 'all')}>Hammasini ko'rish</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          label="Holat"
          value={status}
          onChange={(v) => update('status', v === 'new' ? '' : v)}
          options={statusSegments(APPLICATION_STATUS, newCount)}
        />
        <div className="lg:w-64">
          <SearchInput value={q} onChange={(v) => update('q', v)} placeholder="Ism yoki telefon…" />
        </div>
      </div>

      {error ? (
        <EmptyState title="Ma'lumot yuklanmadi" text={error} action={<Button variant="secondary" onClick={load}>Qayta urinish</Button>} />
      ) : !items ? (
        <Skeleton rows={8} />
      ) : (
        <>
          <p className="text-label text-muted">{filtered.length} ta ariza</p>
          <Card padded={false}>
            <div className="px-2 py-1">
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(a) => String(a.id)}
                onRowClick={(a) => navigate(`${LIST}/${a.id}`, { state: { search: params.toString() } })}
                empty={empty}
              />
            </div>
          </Card>
          <Pagination page={safePage} pageCount={pageCount} onChange={(p) => update('page', String(p))} />
        </>
      )}
    </div>
  );
};

export default ApplicationsList;
```

- [ ] **Step 2: `src/admin/screens/ApplicationDetail.tsx`.**
```tsx
import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useLocation } from 'react-router';
import { Phone } from 'lucide-react';
import type { ApiJobApplication, OrderStatus } from '../../../shared/types';
import { safeHref } from '../../lib/safe-href';
import { listJobApplications, setJobApplicationStatus } from '../api';
import { errText } from '../errText';
import { formatDateTime } from '../lib/format';
import { APPLICATION_STATUS, telHref } from '../lib/inbox';
import { StatusCard } from '../StatusControls';
import { Button, Card, EmptyState, Page, Rows, Skeleton } from '../ui';
import { useToast } from '../ui/toast';

const LIST = '/admin/orders/applications';
type LoadState = 'loading' | 'ready' | 'missing' | 'error';

/** Nomzod arizasi (`/admin/orders/applications/:id`) — `OrderDetail` naqshi: ro'yxat API'sidan id bo'yicha, holat darhol saqlanadi. */
const ApplicationDetail: FC<{ id: string; onCountsChange: () => void }> = ({ id, onCountsChange }) => {
  const location = useLocation();
  const search = (location.state as { search?: string } | null)?.search;
  const backTo = search ? `${LIST}?${search}` : LIST;
  const toast = useToast();
  const [rawItem, setItem] = useState(null as ApiJobApplication | null);
  const item = rawItem as ApiJobApplication | null;
  const [rawLoad, setLoad] = useState('loading' as LoadState);
  const load = rawLoad as LoadState;

  function fetchItem() {
    setLoad('loading');
    listJobApplications()
      .then((xs) => {
        const found = xs.find((x) => String(x.id) === id) ?? null;
        setItem(found);
        setLoad(found ? 'ready' : 'missing');
      })
      .catch(() => setLoad('error'));
  }
  useEffect(fetchItem, [id]);

  async function changeStatus(next: OrderStatus) {
    if (!item) return;
    setItem({ ...item, status: next });
    try {
      await setJobApplicationStatus(item.id, next);
      toast(`Holat: ${APPLICATION_STATUS[next]}`);
      onCountsChange();
    } catch (e) {
      setItem(item);
      toast(errText(e), 'error');
    }
  }

  if (load !== 'ready' || !item) {
    return (
      <Page title="Ariza" back={backTo}>
        {load === 'loading' ? (
          <Skeleton rows={4} />
        ) : load === 'missing' ? (
          <EmptyState
            title="Ariza topilmadi"
            text="Faqat oxirgi 200 ta ariza ochiladi."
            action={<Button variant="secondary" to={LIST}>Arizalarga qaytish</Button>}
          />
        ) : (
          <EmptyState
            title="Ma'lumot yuklanmadi"
            text="Tarmoq yoki server xatosi — qayta urinib ko'ring."
            action={<Button variant="secondary" onClick={fetchItem}>Qayta urinish</Button>}
          />
        )}
      </Page>
    );
  }

  const resume = safeHref(item.resumeUrl);
  return (
    <Page
      title={item.name}
      description={`${item.position} · ${formatDateTime(item.createdAt)}`}
      back={backTo}
      actions={<Button variant="secondary" href={telHref(item.phone)}><Phone aria-hidden className="size-4" /> Qo'ng'iroq</Button>}
    >
      <div className="flex flex-col gap-4">
        <StatusCard value={item.status} labels={APPLICATION_STATUS} onChange={changeStatus} telegramSent={item.telegramSent} />
        <Card title="Nomzod">
          <Rows
            rows={[
              { k: 'Telefon', v: <a href={telHref(item.phone)} className="press text-cta">{item.phone}</a> },
              { k: 'Lavozim', v: item.position },
              {
                k: 'Rezyume',
                v: resume
                  ? <a href={resume} target="_blank" rel="noopener noreferrer" className="press break-all text-cta">{item.resumeUrl}</a>
                  : '—',
              },
            ]}
          />
        </Card>
        {item.message && (
          <Card title="Xabar">
            <p className="whitespace-pre-line text-para text-primary">{item.message}</p>
          </Card>
        )}
      </div>
    </Page>
  );
};

export default ApplicationDetail;
```

- [ ] **Step 3: `nav.ts:38`** —
```ts
      { id: 'applications', segment: 'applications', label: 'Ish arizalari', Icon: Users, detail: true },
```

- [ ] **Step 4: `AdminApp.tsx`.**
  - `import JobApplicationsList from './JobApplicationsList';` o'rniga:
```ts
import ApplicationsList from './screens/ApplicationsList';
import ApplicationDetail from './screens/ApplicationDetail';
```
  - `case 'orders/applications': return <JobApplicationsList />;` o'rniga:
```tsx
    case 'orders/applications': return id ? <ApplicationDetail key={id} id={id} onCountsChange={refreshCounts} /> : <ApplicationsList onCountsChange={refreshCounts} />;
```

- [ ] **Step 5: Eski ekranlarni o'chiring.**
```bash
git rm src/admin/JobApplicationsList.tsx src/admin/CareersAdmin.tsx
grep -rn "JobApplicationsList\|CareersAdmin" src app
```
Expected: `grep` hech narsa topmaydi.

- [ ] **Step 6: Tekshiruv va commit.**
Run: `bun run lint && bun run test`
Expected: lint xatosiz; `Test Files 29 passed (29)`, `Tests 329 passed (329)`.
```bash
git add src/admin/screens/ApplicationsList.tsx src/admin/screens/ApplicationDetail.tsx src/admin/nav.ts src/admin/AdminApp.tsx
git commit -m "feat(admin): ish arizalari ro'yxati va tafsiloti kit bilan; eski JobApplicationsList va o'lik CareersAdmin o'chirildi

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 7: `CLAUDE.md`** — sakkizta aniq almashtirish (Edit, matn aynan):
  1. `` Admin **"Buyurtmalar"** (`src/admin/OrdersPage.tsx`) lists them `` → `` Admin **"Buyurtmalar"** (`src/admin/screens/OrdersList.tsx` + `OrderDetail.tsx`) lists them ``
  2. `6 bosqich; 1-, 2a- va 2b-bosqich bajarildi):` → `6 bosqich; 1-, 2a-, 2b- va 3-bosqich bajarildi):`
  3. `` `Page`/`Card`/`Tabs`/`EmptyState`/`Skeleton` (layout), `Field`/`Input`/`Textarea`/`Select`/`SwitchRow`/`LangPair` (form) `` → `` `Page`/`Card`/`Rows`/`Tabs`/`EmptyState`/`Skeleton`/`Pagination` (layout), `Field`/`Input`/`SearchInput`/`Textarea`/`Select`/`SwitchRow`/`LangPair` (form) ``
  4. `Buyurtmalar/Kontent/Sozlamalar ekranlari hali eski (3–5-bosqichlar); quyidagi tavsifning o'sha qismlari eski ekranlar haqida.` →
     ``**3 (2026-09-17) — Buyurtmalar bo'limi kit bilan:** `src/admin/screens/OrdersList.tsx` / `OrderDetail.tsx` (`/admin/orders[/:id]`) va `ApplicationsList.tsx` / `ApplicationDetail.tsx` (`/admin/orders/applications[/:id]`) — filtrlar URL'da (`status` — sukut «Yangi», kiruvchi quti; `q` — ism yoki telefon raqamlari; `page`), holat qatorda (`StatusSelect`) va tafsilotda (`StatusCard`; ikkalasi `src/admin/StatusControls.tsx`) darhol `PATCH` + sidebar sanog'i yangilanadi (`screenFor`ning `refreshCounts`i); tafsilot alohida GET'siz — ro'yxat API'sidan (oxirgi 200 ta) id bo'yicha; sof yordamchilar `src/admin/lib/inbox.ts` (`filterInbox`, `statusSegments`, `orderTotal` — Telegram xabaridagi summa bilan bir xil, `telHref`). Ro'yxatlar qidiruvi hamma joyda `SearchInput` (lokal matn, URL'ga 250 ms kechikib); segment va tab tugmalari mobilda 44px. Kontent/Sozlamalar ekranlari hali eski (4–5-bosqichlar); quyidagi tavsifning o'sha qismlari eski ekranlar haqida.``
  5. `` **Vakansiyalar** (`CareersAdmin` — ikki tab: `VacancyList`/`VacancyForm` (lavozim, bo'lim, maosh uz/ru; bandlik turi; markdown tavsif) va `JobApplicationsList` (nomzod arizalari, holat select, rezyume havolasi `safeHref`)) `` → `` **Vakansiyalar** (`VacancyList`/`VacancyForm` — lavozim, bo'lim, maosh uz/ru; bandlik turi; markdown tavsif; nomzod arizalari — Buyurtmalar → Ish arizalari) ``
  6. `` Pure admin helpers live in `src/admin/lib/` (variant-gen, format, models, `` → `` Pure admin helpers live in `src/admin/lib/` (variant-gen, format (`formatDateTime` — Toshkent vaqti, `formatSum`), models, `inbox` (buyurtma/ariza filtri, summa, `telHref`), ``
  7. `` 2026-09-15 (admin qayta qurilishi, 1-bosqich): `src/admin/CareersAdmin.tsx` endi hech qayerdan import qilinmaydi — `VacancyList`/`JobApplicationsList` yangi qobiqning tab'lariga to'g'ridan-to'g'ri ulangan; 6-bosqich o'chiradi. `` → `` 3-bosqich (2026-09-17): eski `OrdersPage`, `JobApplicationsList` va o'lik `CareersAdmin` (1-bosqichdan beri hech qayerdan import qilinmasdi) o'chirildi. ``
  8. `` `IconAction.tsx` Bannerlar/Yangiliklar/Blog/Sahifalar/Vakansiyalar ro'yxatlarida qoladi (3–5-bosqichlar). `` → `` `IconAction.tsx` Bannerlar/Yangiliklar/Blog/Sahifalar/Vakansiyalar ro'yxatlarida qoladi (4–5-bosqichlar). ``

- [ ] **Step 8: Spec** (`docs/superpowers/specs/2026-09-15-admin-redesign-design.md`):
  - §3 kod blokida `/admin/orders[?status=] ·` → `/admin/orders[?status=&q=&page=] ·` va `/admin/orders/applications[/:id]` → `/admin/orders/applications[?status=&q=&page=][/:id]`.
  - §5 "Buyurtmalar" bandidan keyin (u `holat, sana;` va ariza tafsiloti yo'li bilan tugaydi; "### Kontent" sarlavhasidan oldin) bo'sh qator va shu xatboshini qo'shing:
```markdown
3-bosqich qarorlari: sukut filtri **Yangi** (`status` URL'da bo'lmasa — kiruvchi quti; dashboard havolasi shu); arizada
«Bajarildi» o'rniga **Yopildi**; qatorda manba belgisi faqat Muddatli/Konsultatsiya (naqd — sukut), tarkib va rezyume
ustunlari `xl`dan (1024px'da jadval sig'sin; mobil kartada doim); summa Telegram xabaridagi bilan bir xil (muddatlida
`totalUzs`, naqdda tovarlar yig'indisi); raqamli qidiruv telefon raqamlari bo'yicha, harfli — ism bo'yicha; tafsilot ro'yxat
API'sidan (oxirgi 200 ta) id bo'yicha — alohida GET yo'q; holat o'zgarsa sidebar sanog'i yangilanadi.
```

- [ ] **Step 9: Commit (hujjat)**
```bash
git add CLAUDE.md docs/superpowers/specs/2026-09-15-admin-redesign-design.md
git commit -m "docs: CLAUDE.md va spec — 3-bosqich: buyurtma va ariza ekranlari kit bilan

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 10 (controller, brauzer):** `/admin/orders/applications` — «Yangi 2», «Yopildi» segmenti, qatorda rezyume «Ochish» (1440px; `href` `https://…`, `target="_blank"`), rezyumesiz qatorda «—», "TG yuborilmadi"; holat o'zgarishi — toast, sidebar badge; tafsilot — Holat, Nomzod (rezyume havolasi), Xabar (qator tashlanishi saqlangan); "Orqaga" filtrni saqlaydi; `/admin/orders/applications/999999` — «Ariza topilmadi». 1024 / 375px. Dashboard «Yangi arizalar» havolasi shu ro'yxatga. Tekshiruvdan keyin: `NODE_PATH=node_modules node <scratchpad>/seed-inbox.cjs --clean` (yakuniy review tuzatishlari tekshirilgunicha qayta yaratish mumkin; bosqich oxirida baza toza).

---

## O'z-o'zini tekshirish (reja yozilgandan keyin)

- **Spec qamrovi (§5 "Buyurtmalar"):** tablar Buyurtmalar · Ish arizalari — mavjud `nav.ts` (Task 3/4 `detail`); holat segmentlari «Yangi N · Bog'lanildi · Bajarildi · Hammasi» — `statusSegments` (T2) + ro'yxatlar (T3/T4); ism/telefon qidiruvi client'da — `filterInbox` + `SearchInput` (T1/T2); qator: ism + `tel:` · manba · birinchi tovar + «yana N» · summa · sana · holat select — `OrdersList` (T3); `/admin/orders/:id` — tarkib, muddatli tafsilot, izoh, "TG yuborilmadi" — `OrderDetail` + `StatusCard` (T3); arizalar: ism, telefon, lavozim, rezyume (`safeHref`), holat, sana; `/admin/orders/applications/:id` — T4. §3 sidebar sanog'i — `refreshCounts` (T3). §4 forma qoidalari 4, 6, 7 — ro'yxat/tafsilot kodida; mobil 44px — T1. §9 test — `inbox.test.ts`, `format.test.ts` (T2).
- **2b qoldiqlari:** kechikkan qidiruv naqshi (T1, uchala mavjud ro'yxat + ikki yangi); `Segmented`/`Tabs` mobilda 44px (T1). 1-bosqich qoldig'i `CareersAdmin` (T4).
- **Tiplar izchilligi:** `StatusFilter`/`OrderStatus` (T2) ↔ `Segmented value`/`StatusSelect` (T3/T4); `onCountsChange` (ekran propi) ↔ `refreshCounts` (`screenFor` argumenti, `SectionPage` propi); `formatSum(number | null)` ↔ `orderTotal(): number | null`, `downPaymentUzs: number | null`; `Rows` props `{ k, v }` — `ProductEdit` chaqiruvlari o'zgarmaydi.
- **Placeholder:** yo'q — har kod qadami to'liq kod yoki aniq eski → yangi matn bilan.

## Natija va qoldiqlar (bajarilgandan keyin, 2026-09-17)

Bajarildi: `feat/admin-3` branch'ida 7 commit (`513b213..d7911a6`) — 4 task, har biri alohida review (T3 — bitta tuzatish
raundi: mobilda mijozning to'liq ismi), yakuniy butun-branch review (fable) — "merge'ga tayyor", 0 jiddiy, 6 mayda izoh;
ikkitasi bitta to'lqinda tuzatildi (mobil kartada ism cheklovi, spec §3 qatorlari), qayta review toza. Lint 0, 29 fayl /
329 test. Brauzerda egasi kirgan holda tekshirildi (lokal bazaga `SINOV` sinov yozuvlari, oxirida o'chirildi): buyurtmalar —
sukut «Yangi N», ism va telefon raqami bo'yicha qidiruv, qatordagi va tafsilotdagi holat o'zgarishi (toast, sidebar sanog'i
kamayadi), xato holatida qiymat qaytishi, savat / muddatli / konsultatsiya tafsilotlari, topilmagan id, "Orqaga" filtrni
saqlaydi; arizalar — «Yopildi», rezyume havolasi (`rel`), qator tashlanishli xabar; 1440 / 1024 / 375px (1024'da jadval
aynan sig'adi); mahsulotlar / modellar / brendlar qidiruvi yangi `SearchInput` bilan (tez yozish, 250 ms ichida filtr,
tozalash, orqaga).

Reja matnidan farqlar (ledger ruling'lari): ikkala tafsilot kartasida birinchi qator «Ism» (kit `Page` sarlavhasi 375px'da
"Qo'ng'iroq" yonida qisqaradi); ro'yxat kartasida ism cheklovi faqat `md`dan (`md:max-w-48`); spec §3 buyurtma yo'llari
to'rt qatorga bo'lindi; `CareersAdmin` 6-bosqich o'rniga shu bosqichda o'chirildi (o'chirilgan `JobApplicationsList`ni
import qilardi); yakuniy tuzatish commit'ining trailer'i controller tomonidan tuzatildi (kod o'zgarmagan).

Qoldiqlar:

- **6-bosqich (tozalash):** umumiy `useListParams`/`useUrlParam` hook — URL yozuvchi `update()` endi 4 ro'yxatda takror;
  tez ketma-ket holat o'zgarishida in-flight himoyasi (birinchi PATCH yiqilsa UI eski holatga qaytadi);
  `api.admin.orders.$id` va `api.admin.job-applications.$id`ga GET `loader` (hozir tafsilot ro'yxat API'sidan — oxirgi
  200 ta; hajm oshsa); `docs/egasi-qollanmasi.md` Buyurtmalar bo'limi (yorliq «Bajarildi», Ish arizalari endi Buyurtmalar
  ostida).
- **Mavjud, 3-bosqich regressiyasi emas:** `errText` noma'lum kodda xom kodni ko'rsatadi; server muddatli buyurtmada
  `totalUzs`ni talab qilmaydi (admin ro'yxatida naqd yig'indi, tafsilotda «Naqd narxi» + «Jami: —»); `SearchInput`ga
  komponent testi yo'q (loyihada komponent test muhiti yo'q); `type=search` native ×; `<html data-theme>` gidratatsiya
  ogohlantirishi; Browser panelida 1440px emulyatsiya ref-bosishlarini siljitadi, yashirin panelda taymerlar sekinlashadi.
- **Ma'lumot (2b'dan, egasining qarori kerak):** 117 `device_models` yozuvi eski kategoriya id'lari bilan — `0036`
  migratsiya.
- **Deploy kuni tekshiruv:** `/admin/orders` (sukut «Yangi», qatordagi holat va sidebar sanog'i), buyurtma tafsiloti
  (muddatli / konsultatsiya), `/admin/orders/applications` (rezyume havolasi), mobil ko'rinish; dashboard'dagi «Yangi
  buyurtmalar» va «Yangi arizalar» havolalari.
