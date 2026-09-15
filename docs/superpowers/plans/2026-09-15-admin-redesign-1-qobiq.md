# Admin qayta qurilishi — 1-bosqich: Qobiq + UI-kit + Dashboard (reja)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin panelning yangi qobig'i (5 bo'limli sidebar / iOS tab bar, URL'ga bog'liq navigatsiya), admin UI-kit (`src/admin/ui/`), bosh sahifa (dashboard + `GET /api/admin/dashboard`) va qayta bo'yalgan login — eski ekranlar vaqtincha yangi qobiq ichida ishlaydi.

**Architecture:** `AdminApp` yo'lni sof `parseAdminPath` bilan `{section, tab, id}` ga ajratadi, `nav.ts` registridan bo'lim/tab ma'lumotini oladi va `AdminShell` ichida ekranni chizadi. Kit — sayt tokenlari ustida ~15 primitiv (5 fayl), keyingi bosqichlar faqat shundan quradi. Server tomonida yagona yangi endpoint — dashboard sanoqlari. Eski `*List`/`*Form` komponentlari o'zgarmaydi, faqat yangi qobiqning tegishli tab'iga ulanadi.

**Tech Stack:** React 19 (`@types/react` yo'q — shim'lar), React Router v7 (`Link`, `useLocation`), Tailwind v4 (`app/styles.css` tokenlari), `motion/react` + `src/lib/motion.ts` prujinalari, lucide-react, vitest, better-sqlite3 (`env.DB.prepare().first()`).

**Spec:** `docs/superpowers/specs/2026-09-15-admin-redesign-design.md` (§3 tuzilma, §4 vizual tizim, §6 dashboard API, §10 1-bosqich)

## Global Constraints

- **Node 22.18+, `bun`** (npm emas). Har task oxirida `bun run lint` (react-router typegen + tsc ×2) va `bun run test` toza o'tishi shart.
- **Strict TypeScript, `any` yo'q.** `@types/react` yo'q: `useState<T>(…)` generigi tushib qoladi — `useState(null as T | null)` yozib, qiymatni cast qiling (`const x = raw as T | null`). `key` faqat native elementlarda (`li`, `tr`, `div`) yoki `FC<{…}>` komponentlarda — `Link`/`motion.*` ga `key` bermang, `<li key>` bilan o'rang. Event tiplari: `React.ChangeEvent<HTMLInputElement>`, `React.FormEvent`, `React.SyntheticEvent<HTMLElement>` (`src/admin/react-events.d.ts`).
- **Faqat tokenlar:** hex yo'q (istisno: `white`, `#25D366`); `text-[Npx]` yo'q — shkala: `text-heading` 32 · `text-subhead` 24 · `text-copy` 17 · `text-control` 16 (input) · `text-para` 15 · `text-label` 14 (pol); radius faqat `rounded-xs` 8 · `rounded-sm` 12 · `rounded-md` 18 · `rounded-lg` 20 · `rounded-xl` 28 · `rounded-full`; **`shadow-*` yo'q**; yuzalar `bg-bg`/`bg-surface`/`bg-fill-2`, `bg-white`/`text-white` yuza uchun **yo'q** (`white` faqat `cta`/`danger` to'ldirmasi ustidagi matn va toggle tugmachasi).
- **`press`** har bosiladigan elementda; `press` bor elementga `transition-colors`/`duration-*` qo'shilmaydi (u o'tishni o'zi boshqaradi).
- Tugma matni **400** (`font-normal`), sarlavhalar `font-semibold`. Mobil tegish maydoni 44px (`h-11 md:h-9`).
- UI matni va kod izohlari **o'zbekcha**, qisqa "nega" izohlari (kodbazadagi uslub). Ataylab soddalashtirilgan joyga `// ponytail:` izohi.
- **Commit faqat egasi tasdiqlagach** (CLAUDE.md qoidasi): har task oxirida commit taklif qilinadi, tasdiq kelgunicha keyingi task'ga staged holda o'tiladi. Format `feat:`/`fix:`/`chore:`/`docs:`, oxirida `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Qo'llangan migratsiyalar tahrirlanmaydi (bu bosqichda migratsiya yo'q). `.env` yaratilmaydi.
- Dev server: `bun run dev` (http://localhost:3000). Admin'ga kirish uchun parol **egasi** Browser panelida yozadi — agent parol yozmaydi.

---

## Fayl xaritasi

| Fayl | Vazifasi |
|---|---|
| `src/admin/lib/admin-path.ts` (+ `.test.ts`) | Sof: `/admin/...` → `{section, tab, id}`; `adminPath()` yo'l yasash |
| `src/admin/nav.ts` | Bo'lim/tab registri (`SECTIONS`, `SEGMENTS`, `activeTab`) — keyingi bosqichlar shu yerga tab qo'shadi |
| `src/admin/ui/controls.tsx` | `Button`, `Badge`, `Dot`, `Toggle` |
| `src/admin/ui/layout.tsx` | `Page`, `Card`, `Tabs`, `EmptyState`, `Skeleton` |
| `src/admin/ui/form.tsx` | `INPUT_CLS`, `Field`, `Input`, `Textarea`, `Select`, `SwitchRow`, `LangPair` |
| `src/admin/ui/toast.tsx` | `ToastProvider`, `useToast` |
| `src/admin/ui/confirm.tsx` | `ConfirmProvider`, `useConfirm` (saytdagi `Modal` ustida) |
| `src/admin/ui/DataTable.tsx` | `DataTable<T>`, `Column<T>` — desktopda jadval, mobilda kartalar |
| `src/admin/ui/index.ts` | Re-export (toast/confirm'dan tashqari — ular provider bilan alohida import) |
| `src/admin/AdminShell.tsx` | Sidebar + mobil tab bar + kontent maydoni |
| `src/admin/screens/Dashboard.tsx` | Bosh sahifa: 5 karta |
| `src/admin/AdminApp.tsx` | Qayta yoziladi: auth, yo'l, provider'lar, ekran jadvali |
| `src/admin/Login.tsx` | Kit bilan qayta bo'yaladi (mantiq o'sha) |
| `src/admin/api.ts` | `getDashboard()` |
| `shared/types.ts` | `ApiDashboard` |
| `app/routes/api.admin.dashboard.tsx`, `app/routes.ts` | Dashboard endpoint |
| `CLAUDE.md` | Admin bo'limiga 1-bosqich holati |

---

### Task 1: `parseAdminPath` / `adminPath` (sof, TDD)

**Files:**
- Create: `src/admin/lib/admin-path.ts`
- Test: `src/admin/lib/admin-path.test.ts`

**Interfaces:**
- Produces:
  - `type SectionId = 'home' | 'products' | 'orders' | 'content' | 'settings'`
  - `interface AdminRoute { section: SectionId; tab: string | null; id: string | null }`
  - `parseAdminPath(pathname: string, segments: Record<SectionId, string[]>): AdminRoute`
  - `adminPath(section: SectionId, segment?: string, id?: string): string`

- [ ] **Step 1: Testni yozing**

`src/admin/lib/admin-path.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { adminPath, parseAdminPath, type SectionId } from './admin-path';

const SEG: Record<SectionId, string[]> = {
  home: [],
  products: ['types', 'categories', 'brands', 'models'],
  orders: ['applications'],
  content: ['banners', 'news'],
  settings: ['store', 'account'],
};

describe('parseAdminPath', () => {
  it("/admin va noma'lum bo'lim → bosh sahifa", () => {
    expect(parseAdminPath('/admin', SEG)).toEqual({ section: 'home', tab: null, id: null });
    expect(parseAdminPath('/admin/', SEG)).toEqual({ section: 'home', tab: null, id: null });
    expect(parseAdminPath('/', SEG)).toEqual({ section: 'home', tab: null, id: null });
    expect(parseAdminPath('/admin/foo/bar', SEG)).toEqual({ section: 'home', tab: null, id: null });
    expect(parseAdminPath('/admin/constructor', SEG)).toEqual({ section: 'home', tab: null, id: null });
  });

  it("bo'limning asosiy tabi — segment yo'q, id bo'lishi mumkin", () => {
    expect(parseAdminPath('/admin/products', SEG)).toEqual({ section: 'products', tab: null, id: null });
    expect(parseAdminPath('/admin/products/123', SEG)).toEqual({ section: 'products', tab: null, id: '123' });
    expect(parseAdminPath('/admin/products/new', SEG)).toEqual({ section: 'products', tab: null, id: 'new' });
  });

  it('tab segmenti va undan keyingi id', () => {
    expect(parseAdminPath('/admin/products/categories', SEG)).toEqual({ section: 'products', tab: 'categories', id: null });
    expect(parseAdminPath('/admin/products/categories/apple', SEG)).toEqual({ section: 'products', tab: 'categories', id: 'apple' });
    expect(parseAdminPath('/admin/orders/applications/5', SEG)).toEqual({ section: 'orders', tab: 'applications', id: '5' });
    expect(parseAdminPath('/admin/settings/account', SEG)).toEqual({ section: 'settings', tab: 'account', id: null });
  });

  it("murakkab id (tur: yo'nalish/id) bo'laklari birlashtiriladi", () => {
    expect(parseAdminPath('/admin/products/types/pc/cpu', SEG)).toEqual({ section: 'products', tab: 'types', id: 'pc/cpu' });
  });
});

describe('adminPath', () => {
  it("bo'lim, segment va id dan yo'l yasaydi", () => {
    expect(adminPath('home')).toBe('/admin');
    expect(adminPath('products')).toBe('/admin/products');
    expect(adminPath('products', '', 'new')).toBe('/admin/products/new');
    expect(adminPath('products', 'categories')).toBe('/admin/products/categories');
    expect(adminPath('products', 'categories', 'apple')).toBe('/admin/products/categories/apple');
    expect(adminPath('orders', 'applications', '5')).toBe('/admin/orders/applications/5');
  });
});
```

- [ ] **Step 2: Test yiqilishini tekshiring**

Run: `bunx vitest run src/admin/lib/admin-path.test.ts`
Expected: FAIL — `Failed to resolve import "./admin-path"`.

- [ ] **Step 3: Implementatsiya**

`src/admin/lib/admin-path.ts`:

```ts
export type SectionId = 'home' | 'products' | 'orders' | 'content' | 'settings';

export interface AdminRoute {
  section: SectionId;
  /** URL'dagi tab segmenti (`categories`, `applications`, …) yoki null — bo'limning asosiy tabi. */
  tab: string | null;
  /** Yozuv id'si yoki `new`; murakkab id'lar (`types/pc/cpu` → `pc/cpu`) keyingi bosqichda ajratiladi. */
  id: string | null;
}

const HOME: AdminRoute = { section: 'home', tab: null, id: null };

function isSection(s: string, segments: Record<SectionId, string[]>): s is SectionId {
  // `constructor` kabi prototip kalitlari bo'lim emas.
  return Object.prototype.hasOwnProperty.call(segments, s);
}

/**
 * `/admin/...` yo'lini bo'lim/tab/id ga ajratadi. `segments` — har bo'limning ma'lum tab
 * segmentlari (nav registridan, `SEGMENTS`); segment bo'lmagan birinchi bo'lak id deb olinadi.
 * Noma'lum bo'lim → bosh sahifa: alohida 404 ekran yo'q, sidebar doim turadi.
 */
export function parseAdminPath(pathname: string, segments: Record<SectionId, string[]>): AdminRoute {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'admin') return HOME;
  const sec = parts[1];
  if (sec === undefined || !isSection(sec, segments)) return HOME;
  const first = parts[2];
  if (first === undefined) return { section: sec, tab: null, id: null };
  if (segments[sec].includes(first)) {
    const id = parts.slice(3).join('/');
    return { section: sec, tab: first, id: id || null };
  }
  return { section: sec, tab: null, id: parts.slice(2).join('/') };
}

/** Bo'lim + tab segmenti (+ id) → yo'l. Bo'sh segment = bo'limning asosiy tabi (`/admin/products`). */
export function adminPath(section: SectionId, segment = '', id?: string): string {
  const base = section === 'home' ? '/admin' : `/admin/${section}`;
  const withTab = segment ? `${base}/${segment}` : base;
  return id ? `${withTab}/${id}` : withTab;
}
```

- [ ] **Step 4: Test o'tishini tekshiring**

Run: `bunx vitest run src/admin/lib/admin-path.test.ts`
Expected: PASS (6 test).

- [ ] **Step 5: Commit (egasi tasdig'i bilan)**

```bash
git add src/admin/lib/admin-path.ts src/admin/lib/admin-path.test.ts
git commit -m "feat(admin): parseAdminPath — URL → bo'lim/tab/id (sof, testli)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: UI-kit — boshqaruvlar, joylashuv, forma

**Files:**
- Create: `src/admin/ui/controls.tsx`, `src/admin/ui/layout.tsx`, `src/admin/ui/form.tsx`, `src/admin/ui/index.ts`

**Interfaces:**
- Produces (hammasi `FC<{…}>` — `key` beriladi):
  - `Button { variant?: 'primary'|'secondary'|'destructive'|'quiet'; size?: 'md'|'lg'; type?: 'button'|'submit'; disabled?; onClick?; to?: string; href?: string; external?: boolean; className?; ariaLabel?; children }`
  - `Badge { tone?: Tone; children; className? }`, `Dot { tone: Tone; children? }`, `type Tone = 'neutral'|'attention'|'ok'|'danger'|'info'`
  - `Toggle { on: boolean; onChange(v: boolean); label: string; disabled? }`
  - `Page { title: string; back?: string; description?: string; actions?: ReactNode; children }`
  - `Card { title?; description?; actions?; padded?: boolean; className?; children }`
  - `Tabs { items: { id: string; label: string; to: string }[]; active: string; className? }`
  - `EmptyState { title; text?; action?: ReactNode }`, `Skeleton { rows?: number }`
  - `INPUT_CLS: string`, `Field { label; hint?; error?; required?; className?; children }`
  - `Input { value; onChange(v: string); type?; placeholder?; invalid?; disabled?; autoComplete?; className? }`
  - `Textarea { value; onChange; rows?; placeholder?; invalid?; mono? }`, `Select { value; onChange; disabled?; children }`
  - `SwitchRow { label; hint?; on; onChange; disabled? }`
  - `LangPair { label; uz; ru; onUz; onRu; kind?: 'text'|'textarea'; rows?; hint?; required?; error? }`

- [ ] **Step 1: `controls.tsx`**

```tsx
import type { FC, ReactNode } from 'react';
import { Link } from 'react-router';

/**
 * Admin boshqaruvlari — sayt tokenlari ustida, App Store Connect uslubi.
 * Tugma: `md` 36px (mobilda 44 — tegish maydoni), `lg` 44px pill (sahifaning asosiy amali).
 * Matn 400 (Apple tugmada qalin shrift ishlatmaydi). `press` bosish javobini o'zi boshqaradi —
 * ustiga `transition-*` qo'shilmaydi.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'quiet';
export type ButtonSize = 'md' | 'lg';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-cta text-white hover:bg-cta-hover',
  secondary: 'bg-fill-2 text-primary hover:bg-segment',
  destructive: 'bg-danger text-white hover:opacity-90',
  quiet: 'text-cta hover:bg-fill-2',
};
const SIZE: Record<ButtonSize, string> = {
  md: 'h-11 md:h-9 px-4 rounded-xs text-para',
  lg: 'h-11 px-[21px] rounded-full text-copy',
};
const BASE =
  'press inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-normal disabled:pointer-events-none disabled:opacity-50';

export const Button: FC<{
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  /** Ichki havola — `Link` bo'lib chiziladi. */
  to?: string;
  /** Oddiy havola; `external` bo'lsa yangi tabda. */
  href?: string;
  external?: boolean;
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
}> = ({ variant = 'primary', size = 'md', type = 'button', disabled, onClick, to, href, external, className = '', ariaLabel, children }) => {
  const cls = `${BASE} ${SIZE[size]} ${VARIANT[variant]} ${className}`;
  if (to) return <Link to={to} className={cls} aria-label={ariaLabel}>{children}</Link>;
  if (href) {
    return (
      <a href={href} className={cls} aria-label={ariaLabel} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={cls} aria-label={ariaLabel}>
      {children}
    </button>
  );
};

/** Holat ranglari: `attention` — e'tibor kerak (`new` to'q sariq), `ok` — faol/bajarildi (`verified`). */
export type Tone = 'neutral' | 'attention' | 'ok' | 'danger' | 'info';
const TONE: Record<Tone, string> = {
  neutral: 'bg-fill-2 text-muted',
  attention: 'bg-new/10 text-new',
  ok: 'bg-verified/10 text-verified',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-cta/10 text-cta',
};
const DOT: Record<Tone, string> = {
  neutral: 'bg-muted-3',
  attention: 'bg-new',
  ok: 'bg-verified',
  danger: 'bg-danger',
  info: 'bg-cta',
};

export const Badge: FC<{ tone?: Tone; children: ReactNode; className?: string }> = ({ tone = 'neutral', children, className = '' }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-label font-medium ${TONE[tone]} ${className}`}>{children}</span>
);

/** Holat nuqtasi + yozuv (faol / yashirin / e'tibor kerak) — jadval qatorlari uchun. */
export const Dot: FC<{ tone: Tone; children?: ReactNode }> = ({ tone, children }) => (
  <span className="inline-flex items-center gap-1.5 text-label text-muted">
    <span aria-hidden className={`size-2 rounded-full ${DOT[tone]}`} />
    {children}
  </span>
);

/** iOS/macOS switch (51×31, tugmacha 27) — checkbox o'rniga; yoqilgani `cta` ko'k (macOS Settings). */
export const Toggle: FC<{ on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }> = ({ on, onChange, label, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!on)}
    className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 ease-apple disabled:opacity-50 ${on ? 'bg-cta' : 'bg-disabled'}`}
  >
    <span
      aria-hidden
      className={`absolute left-[2px] top-[2px] size-[27px] rounded-full bg-white transition-transform duration-200 ease-apple ${on ? 'translate-x-[20px]' : ''}`}
    />
  </button>
);
```

- [ ] **Step 2: `layout.tsx`**

```tsx
import type { FC, ReactNode } from 'react';
import { Link } from 'react-router';
import { ChevronLeft } from 'lucide-react';

/**
 * Sahifa: sarlavha chapda, amallar ("Saqlash") o'ngda; sarlavha yopishqoq — asosiy amal doim
 * ko'rinadi. Manfiy margin kontent maydonining padding'ini qoplaydi (fon uzilmasin).
 */
export const Page: FC<{ title: string; back?: string; description?: string; actions?: ReactNode; children: ReactNode }> = ({
  title, back, description, actions, children,
}) => (
  <div>
    <header className="sticky top-0 z-30 -mx-4 mb-6 bg-bg px-4 pb-4 pt-5 md:-mx-8 md:px-8 md:pt-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {back && (
            <Link to={back} className="press mb-1 inline-flex items-center gap-0.5 text-label text-cta">
              <ChevronLeft aria-hidden className="size-4" /> Orqaga
            </Link>
          )}
          <h1 className="truncate text-subhead font-semibold text-primary md:text-heading">{title}</h1>
          {description && <p className="mt-1 text-para text-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
    {children}
  </div>
);

/** Karta — yagona yuza: `surface` + hairline, soya yo'q. `padded={false}` — jadval/qatorlar chetgacha. */
export const Card: FC<{ title?: string; description?: string; actions?: ReactNode; padded?: boolean; className?: string; children: ReactNode }> = ({
  title, description, actions, padded = true, className = '', children,
}) => {
  const body = padded ? (title ? 'px-5 pb-5 pt-4' : 'p-5') : '';
  return (
    <section className={`rounded-sm border border-line bg-surface ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 px-5 pt-5">
          <div className="min-w-0">
            {title && <h2 className="text-copy font-semibold text-primary">{title}</h2>}
            {description && <p className="mt-0.5 text-label text-muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={body}>{children}</div>
    </section>
  );
};

/** Segment-kontrol (URL'ga bog'liq): konteyner 12px, ichki 8px — konsentrik. Mobilda yonga suriladi. */
export const Tabs: FC<{ items: { id: string; label: string; to: string }[]; active: string; className?: string }> = ({ items, active, className = '' }) => (
  <nav aria-label="Tablar" className={`no-scrollbar -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0 ${className}`}>
    <ul className="inline-flex gap-1 rounded-sm bg-fill-2 p-1">
      {items.map((it) => (
        <li key={it.id}>
          <Link
            to={it.to}
            aria-current={it.id === active ? 'page' : undefined}
            className={`press block h-9 whitespace-nowrap rounded-xs px-3.5 text-para leading-9 ${
              it.id === active ? 'bg-surface text-primary' : 'text-muted hover:text-primary'
            }`}
          >
            {it.label}
          </Link>
        </li>
      ))}
    </ul>
  </nav>
);

/** Bo'sh holat — bitta amal bilan ("Hali yangilik yo'q — Qo'shish"). */
export const EmptyState: FC<{ title: string; text?: string; action?: ReactNode }> = ({ title, text, action }) => (
  <div className="flex flex-col items-center gap-2 rounded-sm border border-dashed border-line px-6 py-12 text-center">
    <p className="text-copy font-semibold text-primary">{title}</p>
    {text && <p className="max-w-sm text-para text-muted">{text}</p>}
    {action && <div className="mt-3">{action}</div>}
  </div>
);

/** Yuklanish — skelet qatorlar ("Yuklanmoqda…" matni o'rniga). */
export const Skeleton: FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div aria-busy="true" aria-label="Yuklanmoqda" className="flex flex-col gap-3">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="h-11 animate-pulse rounded-xs bg-fill-2" />
    ))}
  </div>
);
```

- [ ] **Step 3: `form.tsx`**

```tsx
import type { FC, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Toggle } from './controls';

/** Input ko'rinishi bitta joyda; `text-control` (16px) — iOS Safari kichik inputni fokusda zoom qiladi. */
export const INPUT_CLS =
  'h-11 md:h-9 w-full rounded-xs border border-line bg-surface px-3 text-control text-primary placeholder:text-muted-3 focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta/20 disabled:bg-fill-2 disabled:text-muted aria-[invalid=true]:border-danger';

/** Yorliq ustida, ostida izoh yoki xato (xato bo'lsa izoh o'rnini oladi). */
export const Field: FC<{ label: string; hint?: string; error?: string; required?: boolean; className?: string; children: ReactNode }> = ({
  label, hint, error, required, className = '', children,
}) => (
  <label className={`block ${className}`}>
    <span className="mb-1.5 block text-label font-medium text-muted">
      {label}
      {required && <span className="text-danger"> *</span>}
    </span>
    {children}
    {error ? (
      <span className="mt-1 block text-label text-danger">{error}</span>
    ) : hint ? (
      <span className="mt-1 block text-label text-muted-2">{hint}</span>
    ) : null}
  </label>
);

export const Input: FC<{
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  className?: string;
}> = ({ value, onChange, type = 'text', placeholder, invalid, disabled, autoComplete, className = '' }) => (
  <input
    type={type}
    value={value}
    placeholder={placeholder}
    disabled={disabled}
    autoComplete={autoComplete}
    aria-invalid={invalid || undefined}
    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
    className={`${INPUT_CLS} ${className}`}
  />
);

export const Textarea: FC<{ value: string; onChange: (v: string) => void; rows?: number; placeholder?: string; invalid?: boolean; mono?: boolean }> = ({
  value, onChange, rows = 4, placeholder, invalid, mono,
}) => (
  <textarea
    value={value}
    rows={rows}
    placeholder={placeholder}
    aria-invalid={invalid || undefined}
    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
    className={`${INPUT_CLS} h-auto resize-y py-2 ${mono ? 'font-mono text-para' : ''}`}
  />
);

/** Native select — o'z chevroni bilan (brauzer ko'rsatkichi har OS'da har xil). */
export const Select: FC<{ value: string; onChange: (v: string) => void; disabled?: boolean; children: ReactNode }> = ({ value, onChange, disabled, children }) => (
  <span className="relative block">
    <select
      value={value}
      disabled={disabled}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      className={`${INPUT_CLS} appearance-none pr-9`}
    >
      {children}
    </select>
    <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
  </span>
);

/** macOS Settings qatori: chapda nom (+ izoh), o'ngda toggle. Karta ichida `divide-y divide-line` bilan. */
export const SwitchRow: FC<{ label: string; hint?: string; on: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({
  label, hint, on, onChange, disabled,
}) => (
  <div className="flex items-center justify-between gap-4 py-3">
    <div className="min-w-0">
      <p className="text-para text-primary">{label}</p>
      {hint && <p className="text-label text-muted-2">{hint}</p>}
    </div>
    <Toggle on={on} onChange={onChange} label={label} disabled={disabled} />
  </div>
);

/** uz/ru juftligi — hamma ikki tilli maydon uchun bitta komponent. Ruscha ixtiyoriy (saytda uz'ga tushadi). */
export const LangPair: FC<{
  label: string;
  uz: string;
  ru: string;
  onUz: (v: string) => void;
  onRu: (v: string) => void;
  kind?: 'text' | 'textarea';
  rows?: number;
  hint?: string;
  required?: boolean;
  error?: string;
}> = ({ label, uz, ru, onUz, onRu, kind = 'text', rows, hint, required, error }) => (
  <div className="grid gap-3 md:grid-cols-2">
    <Field label={label} hint={hint} error={error} required={required}>
      {kind === 'textarea' ? <Textarea value={uz} onChange={onUz} rows={rows} invalid={Boolean(error)} /> : <Input value={uz} onChange={onUz} invalid={Boolean(error)} />}
    </Field>
    <Field label={`${label} (ru)`} hint="Bo'sh qolsa o'zbekchasi chiqadi">
      {kind === 'textarea' ? <Textarea value={ru} onChange={onRu} rows={rows} /> : <Input value={ru} onChange={onRu} />}
    </Field>
  </div>
);
```

- [ ] **Step 4: `index.ts`**

```ts
export { Button, Badge, Dot, Toggle } from './controls';
export type { ButtonVariant, ButtonSize, Tone } from './controls';
export { Page, Card, Tabs, EmptyState, Skeleton } from './layout';
export { INPUT_CLS, Field, Input, Textarea, Select, SwitchRow, LangPair } from './form';
// toast/confirm provider bilan keladi — alohida `./ui/toast`, `./ui/confirm` dan import qilinadi.
```

- [ ] **Step 5: Lint**

Run: `bun run lint`
Expected: xatosiz (fayllar hali ishlatilmaydi, faqat tiplar tekshiriladi).

- [ ] **Step 6: Commit (egasi tasdig'i bilan)**

```bash
git add src/admin/ui/controls.tsx src/admin/ui/layout.tsx src/admin/ui/form.tsx src/admin/ui/index.ts
git commit -m "feat(admin): UI-kit — tugma, badge, toggle, sahifa, karta, tablar, forma maydonlari

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: UI-kit — toast, tasdiq varag'i, DataTable

**Files:**
- Create: `src/admin/ui/toast.tsx`, `src/admin/ui/confirm.tsx`, `src/admin/ui/DataTable.tsx`
- Modify: `src/admin/ui/index.ts` (DataTable re-export)

**Interfaces:**
- Consumes: `Modal` (`src/store/Modal.tsx`: `{ open, label, onClose, onExited?, panelClass?, children }`), `Button` (Task 2), `SPRING_UI` (`src/lib/motion.ts`).
- Produces:
  - `ToastProvider: FC<{ children }>`, `useToast(): (text: string, kind?: 'success' | 'error') => void`
  - `ConfirmProvider: FC<{ children }>`, `useConfirm(): (opts: ConfirmOpts) => Promise<boolean>`, `ConfirmOpts { title: string; message?: string; confirmLabel?: string; destructive?: boolean }`
  - `DataTable<T>({ columns: Column<T>[]; rows: T[]; rowKey(row): string; onRowClick?(row); empty?: ReactNode })`, `Column<T> { id; label; cell(row): ReactNode; className?; align?: 'left'|'right'; mobile?: 'title'|'hide' }`

- [ ] **Step 1: `toast.tsx`**

```tsx
import { createContext, useCallback, useContext, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SPRING_UI } from '../../lib/motion';

type Kind = 'success' | 'error';
interface ToastItem { id: number; text: string; kind: Kind }
type Push = (text: string, kind?: Kind) => void;

// react tipsiz — `createContext<Push>` generigi tushib qoladi; qiymat cast bilan tiplanadi.
const ToastCtx = createContext((() => {}) as Push);

/** `const toast = useToast(); toast('Saqlandi')` — pastda 3.5 s turadi, mobilda tab bar ustida. */
export function useToast(): Push {
  return useContext(ToastCtx) as Push;
}

export const ToastProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [raw, setItems] = useState([] as ToastItem[]);
  const items = raw as ToastItem[];
  const push = useCallback((text: string, kind: Kind = 'success') => {
    const id = Date.now() + Math.random();
    setItems((xs: ToastItem[]) => [...xs, { id, text, kind }]);
    setTimeout(() => setItems((xs: ToastItem[]) => xs.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[80] flex flex-col items-center gap-2 px-4 md:bottom-6">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              role="status"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={SPRING_UI}
              className={`rounded-full px-5 py-2.5 text-para ${t.kind === 'error' ? 'bg-danger text-white' : 'bg-primary text-bg'}`}
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
};
```

Izoh: `motion.div`ga `key` berish loyihada bor naqsh (`Header.tsx` `motion.li key`), shuning uchun ruxsat.

- [ ] **Step 2: `confirm.tsx`**

```tsx
import { createContext, useCallback, useContext, useState } from 'react';
import type { FC, ReactNode } from 'react';
import Modal from '../../store/Modal';
import { Button } from './controls';

export interface ConfirmOpts {
  title: string;
  message?: string;
  /** Sukut "Tasdiqlash"; o'chirishda "O'chirish". */
  confirmLabel?: string;
  destructive?: boolean;
}
type Ask = (opts: ConfirmOpts) => Promise<boolean>;
interface Pending { opts: ConfirmOpts; resolve: (v: boolean) => void }

const ConfirmCtx = createContext((async () => false) as Ask);

/** `const confirm = useConfirm(); if (await confirm({ title: '…', destructive: true })) …` — `window.confirm` o'rniga. */
export function useConfirm(): Ask {
  return useContext(ConfirmCtx) as Ask;
}

export const ConfirmProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [raw, setPending] = useState(null as Pending | null);
  const pending = raw as Pending | null;
  const [open, setOpen] = useState(false);

  // `useCallback<Ask>` yozilmaydi — react tipsiz, hook'lardagi generik tushib qoladi; param tipi yetadi.
  const ask = useCallback((opts: ConfirmOpts) => new Promise<boolean>((resolve) => {
    setPending({ opts, resolve });
    setOpen(true);
  }), []);
  // Yopish faqat animatsiyani boshlaydi; ma'lumot `onExited`da tashlanadi (Modal shartnomasi).
  const finish = useCallback((v: boolean) => {
    pending?.resolve(v);
    setOpen(false);
  }, [pending]);
  const close = useCallback(() => finish(false), [finish]);

  return (
    <ConfirmCtx.Provider value={ask}>
      {children}
      <Modal open={open} label={pending?.opts.title ?? 'Tasdiqlash'} onClose={close} onExited={() => setPending(null)} panelClass="max-w-sm">
        {pending && (
          <div className="p-6">
            <h2 className="text-copy font-semibold text-primary">{pending.opts.title}</h2>
            {pending.opts.message && <p className="mt-2 text-para text-muted">{pending.opts.message}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={close}>Bekor qilish</Button>
              <Button variant={pending.opts.destructive ? 'destructive' : 'primary'} onClick={() => finish(true)}>
                {pending.opts.confirmLabel ?? 'Tasdiqlash'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </ConfirmCtx.Provider>
  );
};
```

- [ ] **Step 3: `DataTable.tsx`**

```tsx
import type { ReactNode } from 'react';

export interface Column<T> {
  id: string;
  label: string;
  cell: (row: T) => ReactNode;
  /** Ustun klassi (masalan `w-14`). */
  className?: string;
  align?: 'left' | 'right';
  /** Mobil kartada: `title` — sarlavha qatori, `hide` — chiqmaydi, sukut — "yorliq: qiymat". */
  mobile?: 'title' | 'hide';
}

/** Qator ichidagi boshqaruv (toggle, select, havola) bosilganda qator navigatsiyasi ishlamasin. */
function fromControl(e: React.SyntheticEvent<HTMLElement>): boolean {
  return Boolean(e.target.closest('button, a, select, input, label'));
}

/**
 * Jadval — `md`dan desktopda `<table>` (vertikal chiziqsiz, hover qator), pastda kartalar:
 * bitta ustun ta'rifi ikkala ko'rinishni beradi. Qator bosilsa `onRowClick`.
 */
export function DataTable<T>({ columns, rows, rowKey, onRowClick, empty }: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
}) {
  if (rows.length === 0) return <>{empty ?? null}</>;
  const clickable = onRowClick ? 'press-surface cursor-pointer hover:bg-fill-2' : '';
  const click = (row: T) => (onRowClick ? (e: React.SyntheticEvent<HTMLElement>) => { if (!fromControl(e)) onRowClick(row); } : undefined);
  const title = columns.find((c) => c.mobile === 'title');
  const rest = columns.filter((c) => c !== title && c.mobile !== 'hide');
  const align = (c: Column<T>) => (c.align === 'right' ? 'text-right' : '');
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-para">
          <thead>
            <tr className="border-b border-line text-left text-label text-muted-2">
              {columns.map((c) => (
                <th key={c.id} scope="col" className={`px-3 py-2.5 font-medium ${align(c)} ${c.className ?? ''}`}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={rowKey(r)} onClick={click(r)} className={`border-b border-line-3 last:border-0 ${clickable}`}>
                {columns.map((c) => (
                  <td key={c.id} className={`px-3 py-3 ${align(c)} ${c.className ?? ''}`}>{c.cell(r)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col gap-2 md:hidden">
        {rows.map((r) => (
          <li key={rowKey(r)} onClick={click(r)} className={`rounded-sm border border-line bg-surface p-4 ${clickable}`}>
            {title && <div className="mb-2 text-para font-medium text-primary">{title.cell(r)}</div>}
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-label">
              {rest.map((c) => (
                <div key={c.id} className="contents">
                  <dt className="text-muted-2">{c.label}</dt>
                  <dd className="text-primary">{c.cell(r)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
```

- [ ] **Step 4: `index.ts`ga qo'shing**

```ts
export { DataTable } from './DataTable';
export type { Column } from './DataTable';
```

- [ ] **Step 5: Lint**

Run: `bun run lint`
Expected: xatosiz. Agar `e.target.closest` tip xatosi bersa — `src/admin/react-events.d.ts`dagi `SyntheticEvent<T>` `target: T` beradi, `T = HTMLElement` bo'lgani uchun `closest` bor; xato boshqa joyda.

- [ ] **Step 6: Commit (egasi tasdig'i bilan)**

```bash
git add src/admin/ui/toast.tsx src/admin/ui/confirm.tsx src/admin/ui/DataTable.tsx src/admin/ui/index.ts
git commit -m "feat(admin): UI-kit — toast, tasdiq varag'i (Modal ustida), DataTable (jadval/karta)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Dashboard API — `GET /api/admin/dashboard`

**Files:**
- Modify: `shared/types.ts` (oxiriga `ApiDashboard`), `app/routes.ts:54` (`api/admin/me` qatoridan keyin), `src/admin/api.ts` (import + `getDashboard`)
- Create: `app/routes/api.admin.dashboard.tsx`

**Interfaces:**
- Consumes: `requireAdmin` (`app/routes/api.admin.guard.ts`), `json` (`functions/lib/db.ts`), `context.billz.status(): Promise<BillzSyncStatus>` (`app/load-context.d.ts`), `env.DB.prepare(sql).first<T>()`.
- Produces: `ApiDashboard { needsImage: number; newOrders: number; newApplications: number; billz: BillzSyncStatus; usd: { rate: number; auto: boolean } }`, `getDashboard(): Promise<ApiDashboard>`.

- [ ] **Step 1: `shared/types.ts` — tip**

Fayl boshiga (birinchi qator) import, oxiriga interfeys:

```ts
import type { BillzSyncStatus } from './billz';
```

```ts
/** Admin bosh sahifasi — faqat harakat talab qiladigan sanoqlar (`GET /api/admin/dashboard`). */
export interface ApiDashboard {
  /** Billz tovarlari: qoldiq bor, rasm yo'q — saytda ko'rinmaydi. */
  needsImage: number;
  newOrders: number;
  newApplications: number;
  billz: BillzSyncStatus;
  /** Do'kon kursi; `auto` — Markaziy bank + ustama bilan hisoblanadi. */
  usd: { rate: number; auto: boolean };
}
```

- [ ] **Step 2: Route fayli**

`app/routes/api.admin.dashboard.tsx`:

```tsx
import type { Route } from './+types/api.admin.dashboard';
import type { ApiDashboard } from '../../shared/types';
import { json } from '../../functions/lib/db';
import { requireAdmin } from './api.admin.guard';

/** Bosh sahifa kartalari; qobiq sidebar badge'i (yangi buyurtma + ariza) uchun ham shuni oladi. */
export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;

  const count = async (sql: string): Promise<number> =>
    (await env.DB.prepare(sql).first<{ n: number }>())?.n ?? 0;

  const [needsImage, newOrders, newApplications, settings, billz] = await Promise.all([
    count("SELECT COUNT(*) AS n FROM products WHERE billz_id IS NOT NULL AND billz_stock > 0 AND (image_url IS NULL OR image_url = '')"),
    count("SELECT COUNT(*) AS n FROM orders WHERE status = 'new'"),
    count("SELECT COUNT(*) AS n FROM job_applications WHERE status = 'new'"),
    env.DB.prepare('SELECT usd_to_uzs, usd_markup_percent FROM settings WHERE id = 1')
      .first<{ usd_to_uzs: number; usd_markup_percent: number | null }>(),
    context.billz.status(),
  ]);

  const body: ApiDashboard = {
    needsImage,
    newOrders,
    newApplications,
    billz,
    usd: { rate: settings?.usd_to_uzs ?? 0, auto: settings?.usd_markup_percent != null },
  };
  return json(body);
}
```

- [ ] **Step 3: `app/routes.ts`** — `route('api/admin/me', …)` qatoridan keyin:

```ts
  route('api/admin/dashboard', 'routes/api.admin.dashboard.tsx'),
```

- [ ] **Step 4: `src/admin/api.ts`** — import ro'yxatiga `ApiDashboard` (alifbo tartibida `ApiCategory`dan keyin), fayl oxiriga:

```ts
// ── Bosh sahifa ─────────────────────────────────────────────────────────────
export async function getDashboard(): Promise<ApiDashboard> {
  return handle(await fetch('/api/admin/dashboard'));
}
```

- [ ] **Step 5: Lint (typegen `+types/api.admin.dashboard`ni yaratadi)**

Run: `bun run lint`
Expected: xatosiz.

- [ ] **Step 6: Endpoint guard'ini tekshiring (parolsiz)**

Dev server ishlayotgan bo'lsin (`bun run dev` — Browser panelidagi `dev` konfiguratsiyasi). Run:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/admin/dashboard
```
Expected: `401` (route ro'yxatdan o'tgan, `requireAdmin` ishlayapti). Kirgan holdagi javob 6-task'da brauzerda tekshiriladi.

- [ ] **Step 7: Commit (egasi tasdig'i bilan)**

```bash
git add shared/types.ts app/routes.ts app/routes/api.admin.dashboard.tsx src/admin/api.ts
git commit -m "feat(admin): GET /api/admin/dashboard — rasm kerak, yangi buyurtma/ariza, Billz, kurs

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Nav registri, qobiq, bosh sahifa, `AdminApp`

**Files:**
- Create: `src/admin/nav.ts`, `src/admin/AdminShell.tsx`, `src/admin/screens/Dashboard.tsx`
- Modify: `src/admin/AdminApp.tsx` (to'liq qayta yoziladi)

**Interfaces:**
- Consumes: `parseAdminPath`, `adminPath`, `AdminRoute`, `SectionId` (Task 1); kit (Task 2–3); `getDashboard`, `getMe`, `logout`, `runBillzSync` (`api.ts`); `errText` (`src/admin/errText.ts`); `formatThousands(n: number): string` (`src/admin/lib/format.ts`); eski ekranlar (default export'lar): `ProductList`, `CategoryList`, `BrandList`, `ModelList`, `OrdersPage`, `JobApplicationsList`, `BannerList`, `NewsList`, `PostList`, `PageList`, `VacancyList`, `SiteConfigForm`, `SettingsForm`, `BillzPanel`, `AccountForm({ onPasswordChanged? })`, `Login({ onSuccess(defaultPassword: boolean) })`.
- Produces:
  - `nav.ts`: `TabDef { id: string; segment: string; label: string }`, `SectionDef { id: SectionId; label: string; short: string; Icon: LucideIcon; tabs: TabDef[] }`, `SECTIONS: SectionDef[]`, `SEGMENTS: Record<SectionId, string[]>`, `activeTab(section: SectionDef, route: AdminRoute): TabDef | null`
  - `AdminShell: FC<{ route: AdminRoute; badge: number; onLogout(): void; children }>`
  - `Dashboard: FC<{ data: ApiDashboard | null; onRefresh(): void; defaultPw: boolean }>`

- [ ] **Step 1: `src/admin/nav.ts`**

```ts
import type { LucideIcon } from 'lucide-react';
import { FileText, LayoutDashboard, Package, Receipt, Settings } from 'lucide-react';
import type { AdminRoute, SectionId } from './lib/admin-path';

export interface TabDef { id: string; segment: string; label: string }
export interface SectionDef { id: SectionId; label: string; short: string; Icon: LucideIcon; tabs: TabDef[] }

/**
 * Navigatsiya registri — bo'limlar va tablar bitta joyda; keyingi bosqichlar shu yerga tab
 * qo'shadi (Turlar, Kontent → Bosh sahifa, Sozlamalar → Aloqa/SEO). `segment: ''` — bo'limning
 * asosiy tabi (URL'da segment yo'q: `/admin/products`). `short` — mobil tab bar yozuvi (5 ta
 * 375px'ga sig'ishi uchun qisqa).
 */
export const SECTIONS: SectionDef[] = [
  { id: 'home', label: 'Bosh sahifa', short: 'Asosiy', Icon: LayoutDashboard, tabs: [] },
  {
    id: 'products', label: 'Mahsulotlar', short: 'Tovarlar', Icon: Package,
    tabs: [
      { id: 'list', segment: '', label: 'Mahsulotlar' },
      { id: 'categories', segment: 'categories', label: 'Kategoriyalar' },
      { id: 'brands', segment: 'brands', label: 'Brendlar' },
      { id: 'models', segment: 'models', label: 'Modellar' },
    ],
  },
  {
    id: 'orders', label: 'Buyurtmalar', short: 'Buyurtma', Icon: Receipt,
    tabs: [
      { id: 'list', segment: '', label: 'Buyurtmalar' },
      { id: 'applications', segment: 'applications', label: 'Ish arizalari' },
    ],
  },
  {
    id: 'content', label: 'Kontent', short: 'Kontent', Icon: FileText,
    tabs: [
      { id: 'banners', segment: 'banners', label: 'Bannerlar' },
      { id: 'news', segment: 'news', label: 'Yangiliklar' },
      { id: 'posts', segment: 'posts', label: 'Blog' },
      { id: 'pages', segment: 'pages', label: 'Sahifalar' },
      { id: 'vacancies', segment: 'vacancies', label: 'Vakansiyalar' },
    ],
  },
  {
    id: 'settings', label: 'Sozlamalar', short: 'Sozlash', Icon: Settings,
    tabs: [
      { id: 'store', segment: 'store', label: "Do'kon" },
      { id: 'payment', segment: 'payment', label: "To'lov va kurs" },
      { id: 'integrations', segment: 'integrations', label: 'Integratsiyalar' },
      { id: 'account', segment: 'account', label: 'Akkaunt' },
    ],
  },
];

/** `parseAdminPath` uchun: har bo'limning URL segmentlari (bo'sh segment — asosiy tab — kirmaydi). */
export const SEGMENTS = Object.fromEntries(
  SECTIONS.map((s) => [s.id, s.tabs.map((t) => t.segment).filter(Boolean)]),
) as Record<SectionId, string[]>;

/** Joriy tab: URL segmenti mos kelgani, bo'lmasa birinchisi. Tabsiz bo'lim (bosh sahifa) → null. */
export function activeTab(section: SectionDef, route: AdminRoute): TabDef | null {
  if (section.tabs.length === 0) return null;
  return section.tabs.find((t) => t.segment === (route.tab ?? '')) ?? section.tabs[0];
}
```

- [ ] **Step 2: `src/admin/AdminShell.tsx`**

```tsx
import type { FC, ReactNode } from 'react';
import { Link } from 'react-router';
import { ExternalLink, LogOut } from 'lucide-react';
import logo from '../assets/logo.svg';
import logoDark from '../assets/hero/wordmark.webp';
import { adminPath, type AdminRoute } from './lib/admin-path';
import { SECTIONS, activeTab } from './nav';

/**
 * Qobiq: desktopda chap sidebar (5 bo'lim, sub-bandlari doim ochiq — akkordeon yo'q),
 * telefonda iOS pastki tab bar. App Store Connect / macOS Settings naqshi: sidebar `bg-surface`,
 * o'ng hairline, tanlangan bo'lim `bg-fill-2` pill. Sukut yorug'; egasi saytda qorong'ini
 * tanlagan bo'lsa tokenlar orqali o'zi qorong'i bo'ladi — shuning uchun `bg-white` yo'q.
 */
const ITEM = 'press flex h-9 items-center gap-3 rounded-xs px-3 text-para';
const BADGE = 'rounded-full bg-new px-1.5 text-label leading-5 text-white';

const AdminShell: FC<{ route: AdminRoute; badge: number; onLogout: () => void; children: ReactNode }> = ({ route, badge, onLogout, children }) => {
  const current = SECTIONS.find((s) => s.id === route.section) ?? SECTIONS[0];
  const tab = activeTab(current, route);

  return (
    <div className="min-h-screen bg-bg md:flex">
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r border-line bg-surface md:flex">
        <Link to="/admin" className="flex h-16 items-center gap-2 px-5">
          <img src={logo} alt="ProDuct" className="logo-light h-6" />
          <img src={logoDark} alt="" aria-hidden className="logo-dark h-6" />
          <span className="text-label text-muted">Admin</span>
        </Link>
        <nav aria-label="Bo'limlar" className="flex-1 overflow-y-auto px-3 py-2">
          <ul className="flex flex-col gap-1">
            {SECTIONS.map((s) => {
              const active = s.id === route.section;
              const Icon = s.Icon;
              return (
                <li key={s.id}>
                  <Link
                    to={adminPath(s.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`${ITEM} ${active ? 'bg-fill-2 text-primary' : 'text-primary hover:bg-fill-2/60'}`}
                  >
                    <Icon aria-hidden className="size-[18px] text-muted" strokeWidth={1.8} />
                    <span className="flex-1">{s.label}</span>
                    {s.id === 'orders' && badge > 0 && <span className={BADGE}>{badge}</span>}
                  </Link>
                  {s.tabs.length > 1 && (
                    <ul className="mb-1 mt-0.5 flex flex-col">
                      {s.tabs.map((t) => {
                        const on = active && tab?.id === t.id;
                        return (
                          <li key={t.id}>
                            <Link
                              to={adminPath(s.id, t.segment)}
                              aria-current={on ? 'page' : undefined}
                              className={`press flex h-8 items-center rounded-xs pl-11 pr-3 text-label ${on ? 'text-primary' : 'text-muted hover:text-primary'}`}
                            >
                              {t.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="flex flex-col gap-1 border-t border-line px-3 py-3">
          <a href="/" target="_blank" rel="noopener noreferrer" className={`${ITEM} text-muted hover:text-primary`}>
            <ExternalLink aria-hidden className="size-[18px]" strokeWidth={1.8} /> Saytni ochish
          </a>
          <button type="button" onClick={onLogout} className={`${ITEM} w-full text-left text-muted hover:text-primary`}>
            <LogOut aria-hidden className="size-[18px]" strokeWidth={1.8} /> Chiqish
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        {/* pb-28 — mobil tab bar (52px + safe area) kontentni yopmasin. */}
        <div className="mx-auto max-w-[1100px] px-4 pb-28 md:px-8 md:pb-10">{children}</div>
      </main>

      <nav aria-label="Bo'limlar" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="flex">
          {SECTIONS.map((s) => {
            const active = s.id === route.section;
            const Icon = s.Icon;
            return (
              <li key={s.id} className="flex-1">
                <Link
                  to={adminPath(s.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`press relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 ${active ? 'text-cta' : 'text-muted'}`}
                >
                  <Icon aria-hidden className="size-6" strokeWidth={active ? 2 : 1.8} />
                  <span className="text-label leading-none">{s.short}</span>
                  {s.id === 'orders' && badge > 0 && <span className={`absolute left-1/2 top-1 ml-1 ${BADGE}`}>{badge}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

export default AdminShell;
```

- [ ] **Step 3: `src/admin/screens/Dashboard.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { DollarSign, ImageOff, Inbox, RefreshCw, Users } from 'lucide-react';
import type { ApiDashboard } from '../../../shared/types';
import type { BillzSyncStatus } from '../../../shared/billz';
import { runBillzSync } from '../api';
import { errText } from '../errText';
import { formatThousands } from '../lib/format';
import { Button, Card, Page, Skeleton } from '../ui';
import { useToast } from '../ui/toast';

/** Sanoq kartasi: yorliq, katta raqam, ostida amal. 0 bo'lsa raqam och — e'tibor talab qilmaydi. */
const Stat: FC<{ label: string; value: number; Icon: LucideIcon; to: string; action: string }> = ({ label, value, Icon, to, action }) => (
  <Card>
    <div className="flex items-center gap-2 text-label text-muted">
      <Icon aria-hidden className="size-4" strokeWidth={1.8} /> {label}
    </div>
    <p className={`mt-2 text-heading font-semibold ${value > 0 ? 'text-primary' : 'text-muted-3'}`}>{value}</p>
    <div className="mt-3 -ml-3">
      <Button variant="quiet" to={to}>{action}</Button>
    </div>
  </Card>
);

/** BillzPanel'dagi holat matni — bir xil so'zlar, egasi ikki joyda bir narsani o'qiydi. */
function billzSummary(s: BillzSyncStatus): ReactNode {
  if (!s.configured) return <span className="text-danger">Sozlanmagan — Integratsiyalar'da kalit va do'konni saqlang.</span>;
  if (s.running) return 'Ishlayapti…';
  const last = s.last;
  if (!last) return 'Hali sinxronlanmagan.';
  const when = new Date(last.at).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' });
  if (!last.ok) return <span className="text-danger">Xato: {errText(new Error(last.error ?? 'network'))} ({when})</span>;
  return `${when} · ko'rildi ${last.seen}/${last.count} · yangi ${last.inserted} · yangilandi ${last.updated} · yashirildi ${last.hidden}`;
}

const Dashboard: FC<{ data: ApiDashboard | null; onRefresh: () => void; defaultPw: boolean }> = ({ data, onRefresh, defaultPw }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  // Sinxronizatsiya fon vazifasi — ishlayotganda 3 s da bir yangilanadi.
  const running = data?.billz.running ?? false;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(onRefresh, 3000);
    return () => clearInterval(t);
  }, [running, onRefresh]);

  async function sync() {
    setBusy(true);
    try {
      await runBillzSync();
      toast('Sinxronizatsiya boshlandi');
      onRefresh();
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title="Bosh sahifa">
      {defaultPw && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-para text-danger">
          <span><b>Diqqat:</b> standart «admin» paroli ishlatilmoqda — hoziroq o'zgartiring.</span>
          <Button variant="quiet" to="/admin/settings/account" className="-my-1">Parolni o'zgartirish</Button>
        </div>
      )}
      {!data ? (
        <Skeleton rows={3} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Rasm kerak" value={data.needsImage} Icon={ImageOff} to="/admin/products?f=needs_image" action="Ro'yxatni ochish" />
          <Stat label="Yangi buyurtmalar" value={data.newOrders} Icon={Inbox} to="/admin/orders" action="Buyurtmalarga o'tish" />
          <Stat label="Yangi arizalar" value={data.newApplications} Icon={Users} to="/admin/orders/applications" action="Arizalarga o'tish" />
          <Card className="sm:col-span-2">
            <div className="flex items-center gap-2 text-label text-muted">
              <RefreshCw aria-hidden className="size-4" strokeWidth={1.8} /> Billz sinxronizatsiyasi
            </div>
            <p className="mt-2 text-para text-primary">{billzSummary(data.billz)}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={sync} disabled={busy || running || !data.billz.configured}>Sinxronlash</Button>
              <Button variant="quiet" to="/admin/settings/integrations">Sozlamalar</Button>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-2 text-label text-muted">
              <DollarSign aria-hidden className="size-4" strokeWidth={1.8} /> Dollar kursi
            </div>
            <p className="mt-2 text-heading font-semibold text-primary">{formatThousands(data.usd.rate)}</p>
            <p className="text-label text-muted-2">{data.usd.auto ? 'Markaziy bank + ustama, avtomatik' : "Qo'lda kiritilgan"}</p>
            <div className="mt-3 -ml-3">
              <Button variant="quiet" to="/admin/settings/payment">O'zgartirish</Button>
            </div>
          </Card>
        </div>
      )}
    </Page>
  );
};

export default Dashboard;
```

Imzolar (tekshirilgan): `formatThousands(n: number): string` (`src/admin/lib/format.ts`), `errText(e: unknown): string` (`src/admin/errText.ts`).

- [ ] **Step 4: `src/admin/AdminApp.tsx` — to'liq qayta yozish**

```tsx
import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import type { ApiDashboard } from '../../shared/types';
import { getDashboard, getMe, logout } from './api';
import { adminPath, parseAdminPath, type AdminRoute } from './lib/admin-path';
import { SECTIONS, SEGMENTS, activeTab, type SectionDef, type TabDef } from './nav';
import AdminShell from './AdminShell';
import Login from './Login';
import Dashboard from './screens/Dashboard';
import { Page, Tabs } from './ui';
import { ToastProvider } from './ui/toast';
import { ConfirmProvider } from './ui/confirm';
// Eski ekranlar — bosqichma-bosqich almashtiriladi (2–5-bosqichlar), shu jadval orqali ulanadi.
import ProductList from './ProductList';
import CategoryList from './CategoryList';
import BrandList from './BrandList';
import ModelList from './ModelList';
import OrdersPage from './OrdersPage';
import JobApplicationsList from './JobApplicationsList';
import BannerList from './BannerList';
import NewsList from './NewsList';
import PostList from './PostList';
import PageList from './PageList';
import VacancyList from './VacancyList';
import SiteConfigForm from './SiteConfigForm';
import SettingsForm from './SettingsForm';
import BillzPanel from './BillzPanel';
import AccountForm from './AccountForm';

const DEFAULT_PW_KEY = 'admin-default-pw';

/** Bo'lim + tab → ekran. Kalit `${section}/${tab.id}`. */
function screenFor(key: string, clearDefaultPw: () => void) {
  switch (key) {
    case 'products/list': return <ProductList />;
    case 'products/categories': return <CategoryList />;
    case 'products/brands': return <BrandList />;
    case 'products/models': return <ModelList />;
    case 'orders/list': return <OrdersPage />;
    case 'orders/applications': return <JobApplicationsList />;
    case 'content/banners': return <BannerList />;
    case 'content/news': return <NewsList />;
    case 'content/posts': return <PostList />;
    case 'content/pages': return <PageList />;
    case 'content/vacancies': return <VacancyList />;
    case 'settings/store': return <SiteConfigForm />;
    case 'settings/payment': return <SettingsForm />;
    case 'settings/integrations': return <BillzPanel />;
    case 'settings/account': return <AccountForm onPasswordChanged={clearDefaultPw} />;
    default: return null;
  }
}

/** Bo'lim sahifasi: sarlavha + (mobilda) tab segmenti + ekran. Desktopda tablar sidebar'da. */
function SectionPage({ section, tab, route, clearDefaultPw }: { section: SectionDef; tab: TabDef; route: AdminRoute; clearDefaultPw: () => void }) {
  return (
    <Page title={section.label}>
      {section.tabs.length > 1 && (
        <Tabs
          className="mb-6 md:hidden"
          active={tab.id}
          items={section.tabs.map((t) => ({ id: t.id, label: t.label, to: adminPath(section.id, t.segment) }))}
        />
      )}
      {/* `key` — tab almashganda eski ekran holati (ochiq forma) qolib ketmasin. */}
      <div key={`${section.id}/${tab.id}/${route.id ?? ''}`}>{screenFor(`${section.id}/${tab.id}`, clearDefaultPw)}</div>
    </Page>
  );
}

export default function AdminApp() {
  const [authed, setAuthed] = useState(null as boolean | null);
  const [defaultPw, setDefaultPw] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem(DEFAULT_PW_KEY) === '1',
  );
  const [rawDash, setDash] = useState(null as ApiDashboard | null);
  const dash = rawDash as ApiDashboard | null;
  const location = useLocation();
  const route = parseAdminPath(location.pathname, SEGMENTS);

  useEffect(() => {
    getMe().then(() => setAuthed(true)).catch(() => setAuthed(false));
  }, []);

  // ponytail: sanoqlar har navigatsiyada qayta so'raladi (3 ta COUNT — arzon); real-time kerak emas.
  const refreshDash = useCallback(() => { getDashboard().then(setDash).catch(() => {}); }, []);
  useEffect(() => { if (authed) refreshDash(); }, [authed, location.pathname, refreshDash]);

  if (authed === null) return <div className="p-8 text-para text-muted">Yuklanmoqda…</div>;
  if (!authed) {
    return (
      <Login
        onSuccess={(defaultPassword) => {
          setAuthed(true);
          setDefaultPw(defaultPassword);
          if (defaultPassword) sessionStorage.setItem(DEFAULT_PW_KEY, '1');
          else sessionStorage.removeItem(DEFAULT_PW_KEY);
        }}
      />
    );
  }

  const clearDefaultPw = () => { setDefaultPw(false); sessionStorage.removeItem(DEFAULT_PW_KEY); };
  const handleLogout = async () => { await logout(); setAuthed(false); };
  const section = SECTIONS.find((s) => s.id === route.section) ?? SECTIONS[0];
  const tab = activeTab(section, route);
  const badge = (dash?.newOrders ?? 0) + (dash?.newApplications ?? 0);

  return (
    <ToastProvider>
      <ConfirmProvider>
        <AdminShell route={route} badge={badge} onLogout={handleLogout}>
          {tab === null
            ? <Dashboard data={dash} onRefresh={refreshDash} defaultPw={defaultPw as boolean} />
            : <SectionPage section={section} tab={tab} route={route} clearDefaultPw={clearDefaultPw} />}
        </AdminShell>
      </ConfirmProvider>
    </ToastProvider>
  );
}
```

- [ ] **Step 5: Lint va test**

Run: `bun run lint && bun run test`
Expected: ikkalasi toza. Ehtimoliy xato: `useState(() => …)` boshlang'ich funksiya bilan `defaultPw` `unknown` bo'lib qaytsa — `defaultPw as boolean` cast allaqachon qo'yilgan; `setDefaultPw(false)` chaqiruvi ham ishlaydi.

- [ ] **Step 6: Brauzerda tekshirish (egasi kiradi)**

1. `bun run dev` ishlayotganini tekshiring; Browser panelida `http://localhost:3000/admin` oching.
2. Egasidan admin login/parolini **o'zi** yozishini so'rang (agent parol yozmaydi).
3. Kirgach `read_page`/skrinshot bilan: sidebar 5 bo'lim + sub-bandlar, `/admin` da 5 karta (raqamlar `GET /api/admin/dashboard` javobi bilan mos — `read_network_requests`), "Buyurtmalar" badge'i `newOrders + newApplications` bo'lsa ko'rinadi.
4. `/admin/products/categories`, `/admin/orders/applications`, `/admin/content/news`, `/admin/settings/account` — har biri o'z eski ekranini ochadi; sidebar'da to'g'ri sub-band belgilangan; F5 dan keyin o'sha sahifa qoladi.
5. `resize_window` 375px: pastki tab bar 5 band, bo'lim ichida segment-tablar, "Chiqish" faqat desktop sidebar'da (mobilda `Sozlamalar → Akkaunt`ga keyingi bosqichda qo'shiladi — hozircha mobilda chiqish yo'q, bu 1-bosqich uchun qabul qilingan cheklov; egasiga ayting).
6. Console'da xato yo'q (`read_console_messages onlyErrors`).
7. Tekshiruv oxirida `resize_window preset=desktop`.

- [ ] **Step 7: Commit (egasi tasdig'i bilan)**

```bash
git add src/admin/nav.ts src/admin/AdminShell.tsx src/admin/screens/Dashboard.tsx src/admin/AdminApp.tsx
git commit -m "feat(admin): yangi qobiq — 5 bo'limli sidebar/tab bar, URL navigatsiya, bosh sahifa

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Login — kit bilan qayta bo'yash

**Files:**
- Modify: `src/admin/Login.tsx` (JSX qismi; `submit`, `oauthError`, `GoogleG`, effect'lar o'zgarmaydi)

**Interfaces:**
- Consumes: `Button`, `Field`, `Input` (Task 2). `Login({ onSuccess(defaultPassword: boolean) })` imzosi o'zgarmaydi.

- [ ] **Step 1: Import va `inputCls`ni almashtiring**

`inputCls` konstantasi o'chiriladi; importlarga qo'shiladi:

```tsx
import logoDark from '../assets/hero/wordmark.webp';
import { Button, Field, Input } from './ui';
```

- [ ] **Step 2: `return` JSX'ini almashtiring**

```tsx
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2.5">
          <img src={logo} alt="ProDuct" className="logo-light h-9 w-auto" />
          <img src={logoDark} alt="" aria-hidden className="logo-dark h-9 w-auto" />
          <p className="text-label text-muted-2">Admin panel</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-7">
          <Field label="Login">
            <Input value={username} onChange={setUsername} autoComplete="username" />
          </Field>
          <Field label="Parol" error={error || undefined}>
            <Input type="password" value={password} onChange={setPassword} autoComplete="current-password" invalid={Boolean(error)} />
          </Field>

          <Button type="submit" size="lg" disabled={busy} className="w-full">
            {busy ? 'Kirilmoqda…' : 'Kirish'}
          </Button>

          {googleAvailable && (
            <>
              <div className="my-0.5 flex items-center gap-3 text-label text-muted-2">
                <span className="h-px flex-1 bg-line" />yoki<span className="h-px flex-1 bg-line" />
              </div>
              <Button variant="secondary" size="lg" href="/admin/auth/google" className="w-full">
                <GoogleG /> Google bilan kirish
              </Button>
            </>
          )}
        </form>
      </div>
    </div>
  );
```

`error` holati Login'da hozir ham `useState('')` — `Field error={error || undefined}` bo'sh satrda izohsiz qoladi. `GoogleG` SVG'sidagi Google brend ranglari (hex) — brend belgisi, sayt qoidasidan istisno (hozir ham shunday), tegilmaydi.

- [ ] **Step 3: Lint**

Run: `bun run lint`
Expected: xatosiz. `setUsername`/`setPassword`ni to'g'ridan-to'g'ri `onChange`ga berish — `Input.onChange: (v: string) => void` bilan mos.

- [ ] **Step 4: Brauzerda tekshirish**

Chiqib (`Chiqish`) `/admin`ga qayting: login kartasi tokenlarda (oq karta emas — `bg-surface`), logo, "Kirish" 44px ko'k pill, Google tugmasi (sozlangan bo'lsa). Noto'g'ri parolda xato **maydon ostida** qizil. Egasi qayta kiradi.

- [ ] **Step 5: Commit (egasi tasdig'i bilan)**

```bash
git add src/admin/Login.tsx
git commit -m "feat(admin): login sahifasi UI-kit bilan

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Hujjat — CLAUDE.md admin bo'limi

**Files:**
- Modify: `CLAUDE.md` — "### Admin panel (`src/admin/`, …)" bo'limining **birinchi xatboshisidan oldin** yangi xatboshi.

- [ ] **Step 1: Xatboshi qo'shing**

`### Admin panel (` bilan boshlanadigan sarlavha qatoridan keyin, mavjud "Sidebar layout (desktop `aside`, mobile pill bar)…" xatboshisidan **oldin**:

```markdown
**Qayta qurilish (2026-09-15, spec `docs/superpowers/specs/2026-09-15-admin-redesign-design.md`, 6 bosqich; 1-bosqich bajarildi):** yangi qobiq — `AdminApp` yo'lni sof `parseAdminPath` (`src/admin/lib/admin-path.ts`) bilan `{section, tab, id}` ga ajratadi, bo'lim/tab registri `src/admin/nav.ts` (`SECTIONS` — yangi tab shu yerga qo'shiladi, `segment: ''` = bo'limning asosiy tabi), `AdminShell` desktopda 5 bo'limli sidebar (sub-bandlar doim ochiq), mobilda iOS pastki tab bar. Bosh sahifa `src/admin/screens/Dashboard.tsx` + `GET /api/admin/dashboard` (rasm kerak / yangi buyurtma / yangi ariza / Billz / kurs; sidebar badge'i ham shundan). **UI-kit `src/admin/ui/`** — `Button`/`Badge`/`Dot`/`Toggle` (controls), `Page`/`Card`/`Tabs`/`EmptyState`/`Skeleton` (layout), `Field`/`Input`/`Textarea`/`Select`/`SwitchRow`/`LangPair` (form), `ToastProvider`+`useToast`, `ConfirmProvider`+`useConfirm` (saytdagi `Modal` ustida, `window.confirm` o'rniga), `DataTable<T>` (desktopda jadval, `md`dan pastda kartalar). Admin'da `bg-white`/`text-white` yuza uchun yozilmaydi — egasi saytda qorong'ini tanlasa admin tokenlar orqali o'zi qorong'i bo'ladi (sukut yorug'). Eski `*List`/`*Form` ekranlari hozircha yangi qobiqning tab'lariga ulangan (`AdminApp.screenFor`) va 2–5-bosqichlarda kit bilan qayta chiziladi; quyidagi tavsif o'sha eski ekranlar haqida.
```

- [ ] **Step 2: Commit (egasi tasdig'i bilan)**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md — admin qobig'i va UI-kit (1-bosqich)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## O'z-o'zini tekshirish (spec bilan)

- §3 tuzilma: 5 bo'lim, URL sxemasi, sidebar sub-bandlar, mobil tab bar, dashboard 5 karta, badge — Task 1, 4, 5. ✔ Content/Settings'dagi hali mavjud bo'lmagan tablar (Turlar, Kontent → Bosh sahifa, Aloqa, SEO) keyingi bosqichlarda `nav.ts`ga qo'shiladi — ataylab.
- §4 vizual tizim: tokenlar, shkala, radius, soya yo'q, `press`, 400 tugma, primitivlar ro'yxati — Task 2–3. `Uploader` (ImageUploader qayta bo'yash + video) — 2-bosqichda (mahsulot rasmi ekrani bilan), `PriceInput` bor.
- §4 forma qoidalari (Saqlash o'ngda, xato maydon ostida, toast, toggle darhol, tasdiq varag'i, bo'sh holat, skelet, sahifalash, ru ixtiyoriy) — primitivlar tayyor (`Page.actions`, `Field.error`, `useToast`, `Toggle`, `useConfirm`, `EmptyState`, `Skeleton`, `LangPair`); ekranlarga qo'llash 2–5-bosqich.
- §5 Login — Task 6. §6 dashboard API — Task 4 (SQL spec'dagidek). §10.1 — to'liq.
- Cheklov: mobilda "Chiqish" 1-bosqichda yo'q (desktop sidebar'da bor) — Task 5 tekshiruvida egasiga aytiladi, 5-bosqich (Akkaunt tabi) yopadi.
