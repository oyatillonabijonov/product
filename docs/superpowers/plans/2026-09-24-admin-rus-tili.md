# Admin panelga rus tili (i18next) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin paneldagi (`/admin/*`) hamma UI matni o'zbek va rus tilida chiqadi; til har brauzerda alohida tanlanadi va eslab qolinadi.

**Architecture:** i18next + react-i18next, faqat admin'dan import qilinadi. Tarjimalar 8 namespace bo'yicha `src/admin/i18n/{uz,ru}/*.ts` fayllarida: o'zbekcha — manba (`as const`), ruscha — `Dict<typeof uz>` tipida, shuning uchun tuzilma farqi lint'ni yiqitadi. Komponentlar `useTranslation(ns)` bilan satr kalitlarini o'qiydi, sof yordamchilar `t` ni parametr sifatida oladi, statik ro'yxatlar matn o'rniga kalit saqlaydi.

**Tech Stack:** React 19 (tiplarsiz — `@types/react` yo'q), React Router v7 SSR, TypeScript 5.8 strict, i18next 26, react-i18next 17, vitest, bun.

**Spec:** `docs/superpowers/specs/2026-09-24-admin-rus-tili-design.md` — rejani bajaruvchi uni ham o'qiydi; ziddiyatda spec ustun.

## Global Constraints

- Bog'liqliklar: `i18next@^26.4`, `react-i18next@^17.0` — `dependencies`ga `bun add` bilan; **`package-lock.json` ham yangilanadi** (`npm install --package-lock-only`) — Dockerfile `npm ci` qiladi.
- `i18next-browser-languagedetector` qo'shilmaydi. Brauzer tili avtomatik aniqlanmaydi.
- Kutubxona **faqat admin'dan** import qilinadi (`src/admin/**`); storefront (`src/store/**`, `app/routes/*` storefront route'lari) unga tegmaydi.
- Til: `localStorage.adminLang` (`'uz' | 'ru'`), sukut `uz`. Til almashganda `document.documentElement.lang` ham yangilanadi.
- Init: `lng: 'uz'`, `fallbackLng: 'uz'`, `supportedLngs: ['uz', 'ru']`, `defaultNS: 'common'`, `initAsync: false`, `interpolation: { escapeValue: false }`, `returnNull: false`, resurslar ichki (tarmoq yuklashi yo'q). Serverda `changeLanguage` hech qachon chaqirilmaydi.
- Namespace'lar (8): `common`, `shell`, `products`, `orders`, `content`, `site`, `settings`, `errors`.
- `uz/*.ts` — `as const`, manba. `ru/*.ts` — `Dict<typeof uzX>`. Kalit tushib qolsa yoki ortiqcha bo'lsa lint yiqiladi.
- **Ko'plik:** sonli matn ruschada shakl o'zgartirsa (1 товар · 2 товара · 5 товаров) — kalit **ikkala tilda to'rt shaklda**: `_one`, `_few`, `_many`, `_other` (o'zbekchada to'rttasi bir xil matn); chaqiruv `t('key', { count })`. Shakl o'zgarmasa (`скрыто {{count}}`, `+ ещё {{count}}`) — oddiy kalit, `{{count}}` — interpolatsiya. Son o'zbekchadagi kabi `${n} ta` qilib kodda yopishtirilmaydi — son doim resurs ichida.
- Kalit nomlari camelCase, birinchi segment — ekran yoki komponent nomi (`productEdit.images.title`, `ordersList.empty`). Satr kalitlari ishlatiladi, selector API (`$ => $.key`) emas.
- Matn ichida havola/qalin bo'lak — `<Trans t={t} i18nKey="…" components={{ link: <Link … /> }} />`, resursda `<link>…</link>`. `t` **doim** uzatiladi.
- Sof yordamchilar (`src/admin/lib/*`) `t: TFunction<'ns'>` ni parametr sifatida oladi; ular ichida `i18n` global instansiyasi o'qilmaydi. Istisno — `errText(e)` (chaqiruvchilar 40 ta, imzo o'zgarmaydi; 7-bosqich).
- `formatSum(n, sum)` — qo'shimchani chaqiruvchi beradi (`t('common:sum')`).
- Statik ro'yxatlar (`nav.ts`, holat nomlari, tez filtrlar, segment variantlari) matn o'rniga kalit saqlaydi (`labelKey: ParseKeys<'ns'>`).
- **Tarjima qilinmaydi:** bazaga yoziladigan yoki server bilan solishtiriladigan matn (masalan `lib/models.ts` spec nomlari «Protsessor», variant o'qi «Xotira»/«Rang»), Telegram xabarlari, MCP matnlari (`shared/err-text.ts` MCP uchun o'zbekcha qoladi), OAuth rozilik sahifasi, sayt (`src/locales.ts`), `<title>` («Admin — ProDuct»), til nomlari (`O'zbekcha` / `Русский` — har biri o'z tilida).
- Ruscha atamalar — **spec'dagi lug'at jadvalidan so'zma-so'z**. Ton: «вы» (kichik harf), tugma infinitivda («Сохранить»), gap boshida bosh harf.
- Loyiha qoidalari: strict TypeScript, `any` yo'q; `bun`; `useState<T>` generik tushib qoladi — qiymatni `as T` bilan olish; `key` propi faqat `FC<{…}>` komponentlarda tipga mos; hex rang komponentda yo'q (tokenlar); `press` klassi ustiga `transition-*` qo'shilmaydi; `git add -A` yo'q — fayllar nomma-nom; commit xabari o'zbekcha, `feat(admin): …` / `test(admin): …`, oxirida `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; migratsiyalarga tegilmaydi.
- **Qaror (spec'dan kichik chetlanish):** `CustomTypeOptions` kengaytmasi `src/admin/i18n/index.ts` ichida, alohida `i18next.d.ts` emas — `skipLibCheck: true` loyihaning o'z `.d.ts` fayllarini ham tekshirmaydi, `.ts` ichida esa xato ko'rinadi.

## Umumiy tekshiruv buyruqlari

- `bun run lint` — typegen + `tsc` (ikkala tsconfig). Kalit va tuzilma xatolari shu yerda chiqadi.
- `bun run test` — vitest (`src/**/*.test.ts`).
- **Qoldiq skaneri** (1-bosqichda yaratiladi, commit qilinmaydi): `bun .superpowers/sdd/2026-09-24-admin-rus-tili/scan.ts <fayl|papka ...>` — bosqich fayllarida `UZ` belgili qator qolmasligi kerak; `?` qatorlar ko'rib chiqiladi (texnik so'z yoki tarjima qilinmaydigan ma'lumot bo'lsa — qoldiriladi, hisobotda sababi yoziladi).

## Tarjima tartibi (2–6-bosqichlardagi har ekran fayli uchun)

1. Faylni o'qing va odam ko'radigan har matnni toping: JSX matni; `label`, `title`, `description`, `placeholder`, `hint`, `aria-label`, `confirmLabel`, `message`, `text` kabi proplar; `toast(...)` / `confirm({...})` matnlari; jadval ustunlari; bo'sh holat matnlari; template literal'lar.
2. Kalit: `<fayl nomi camelCase>.<ma'noli nom>` (`productEdit.images.title`, `ordersList.columns.sum`). Namespace ichida bir necha faylda takrorlansa — `shared.*` (`products:shared.active`); butun admin'da takrorlansa — `common:` (2-bosqich ro'yxati; yangi umumiy so'z kerak bo'lsa `common` ga qo'shing).
3. `uz` faylga matn **o'zgarishsiz** ko'chadi (mazmuni tahrirlanmaydi); `ru` faylga — spec lug'ati bo'yicha tarjima.
4. Komponentda: `const { t } = useTranslation('<ns>')`; bir nechta ns — `useTranslation(['<ns>', 'common'])` va `t('common:save')`. Modul darajasidagi matnli konstantalar (massiv/xarita) matn o'rniga kalit saqlaydi (`labelKey: ParseKeys<'<ns>'>`, `import type { ParseKeys } from 'i18next'`), chizishda `t(x.labelKey)`. Fayl ichida `t` nomli boshqa o'zgaruvchi bo'lsa (masalan `.map((t) => …)`), o'sha o'zgaruvchini qayta nomlang (`term`, `tab`) — `t` faqat tarjima funksiyasi.
5. O'zgaruvchi qiymat (son, ism, nom, sana, summa) — resursda **nomlangan interpolatsiya**: `t('ordersList.count', { count: n })`, `t('brandEdit.confirmDelete', { name })`; matn bo'laklari kodda yopishtirilmaydi (`` `${name} ni o'chirasizmi?` `` emas). Ruscha shakl o'zgarsa — to'rt shakl (Global Constraints «Ko'plik»).
6. Matn ichida JSX (havola, `<b>`): `<Trans t={t} i18nKey="…" components={{ link: <Link to="…" className="…" /> }} />` (`Trans` — `react-i18next` dan), resursda `<link>…</link>`.
7. Tarjima qilinmaydigan matn (bazaga yoziladi, server bilan solishtiriladi, qidiruv kaliti) o'zgarmaydi; ustiga `// i18n: ma'lumot — tarjima qilinmaydi (<sabab>)` izohi qo'yiladi.
8. Sana/vaqt formati o'zgarmaydi (`formatDateTime`, raqamli `toLocaleString('ru-RU', …)`).
9. Fayl tugagach: `bun run lint` va `bun .superpowers/sdd/2026-09-24-admin-rus-tili/scan.ts <fayl>` — `UZ` qatori qolmasin.

---

### Task 1: Infratuzilma — i18next, tiplar, til tanlovi

**Files:**
- Modify: `package.json`, `package-lock.json`, `bun.lock` (bog'liqliklar)
- Create: `src/admin/i18n/index.ts`, `src/admin/i18n/dict.ts`, `src/admin/i18n/i18n.test.ts`
- Create: `src/admin/i18n/uz/{common,shell,products,orders,content,site,settings,errors}.ts`
- Create: `src/admin/i18n/ru/{common,shell,products,orders,content,site,settings,errors}.ts`
- Create: `src/admin/LangSwitch.tsx`
- Modify: `src/admin/AdminApp.tsx` (til tiklash effekti), `src/admin/AdminShell.tsx` (sidebar «Til» qatori), `src/admin/screens/SettingsAccount.tsx` («Ko'rinish» kartasiga «Til» qatori)
- Create (commit qilinmaydi): `.superpowers/sdd/2026-09-24-admin-rus-tili/scan.ts`

**Interfaces:**
- Produces:
  - `src/admin/i18n/index.ts`: `i18n` (i18next instansiyasi), `type AdminLang = 'uz' | 'ru'`, `ADMIN_LANGS: AdminLang[]`, `LANG_NAMES: Record<AdminLang, string>`, `parseLang(raw: string | null): AdminLang`, `restoreAdminLang(): void`, `useAdminLang(): { lang: AdminLang; setLang: (l: AdminLang) => void }`.
  - `src/admin/i18n/dict.ts`: `type Dict<T>`.
  - `src/admin/LangSwitch.tsx`: default `LangSwitch: FC<{ label: string }>`.
  - Resurs fayllari: har namespace uchun `uz/<ns>.ts` (`export default {...} as const`) va `ru/<ns>.ts` (`export default` `Dict<typeof uz>`). Keyingi bosqichlar faqat shu fayllarga kalit qo'shadi.
  - Kalitlar: `shell:footer.language` («Til» / «Язык»), `settings:account.language` («Til» / «Язык»).

- [ ] **Step 1: Bog'liqliklarni o'rnatish**

```bash
bun add i18next@^26.4.2 react-i18next@^17.0.15
npm install --package-lock-only
git diff --stat package.json package-lock.json bun.lock
```
Expected: `package.json` `dependencies`da ikkala paket; `package-lock.json` va `bun.lock` o'zgargan.

- [ ] **Step 2: `Dict` tipi**

`src/admin/i18n/dict.ts`:
```ts
/**
 * Ruscha resurs fayli tipi: o'zbekcha manba (`as const`) bilan bir xil tuzilma, qiymatlari — istalgan satr.
 * Kalit tushib qolsa yoki ortiqcha bo'lsa lint yiqiladi (`src/locales.ts` bilan bir xil kafolat).
 */
export type Dict<T> = { [K in keyof T]: T[K] extends string ? string : Dict<T[K]> };
```

- [ ] **Step 3: Resurs fayllari (8 × 2)**

`src/admin/i18n/uz/shell.ts`:
```ts
/** Qobiq: menyu, sidebar pasti, bosh sahifa, kirish sahifasi. */
const shell = {
  footer: {
    language: 'Til',
  },
} as const;

export default shell;
```
`src/admin/i18n/ru/shell.ts`:
```ts
import type { Dict } from '../dict';
import type uz from '../uz/shell';

const shell: Dict<typeof uz> = {
  footer: {
    language: 'Язык',
  },
};

export default shell;
```
`src/admin/i18n/uz/settings.ts`:
```ts
/** Sozlamalar: Do'kon, Aloqa, To'lov va kurs, Integratsiyalar, SEO, Akkaunt. */
const settings = {
  account: {
    language: 'Til',
  },
} as const;

export default settings;
```
`src/admin/i18n/ru/settings.ts`:
```ts
import type { Dict } from '../dict';
import type uz from '../uz/settings';

const settings: Dict<typeof uz> = {
  account: {
    language: 'Язык',
  },
};

export default settings;
```
Qolgan olti namespace (`common`, `products`, `orders`, `content`, `site`, `errors`) hozircha bo'sh — har biri uchun shu naqsh (izoh qatori namespace vazifasini aytadi):
```ts
// src/admin/i18n/uz/products.ts
/** Mahsulotlar, turlar, kategoriyalar, brendlar, modellar. */
const products = {} as const;

export default products;
```
```ts
// src/admin/i18n/ru/products.ts
import type { Dict } from '../dict';
import type uz from '../uz/products';

const products: Dict<typeof uz> = {};

export default products;
```
Izohlar: `common` — «Umumiy: UI-kit, yuklagich, summa qo'shimchasi.»; `orders` — «Buyurtmalar, ish arizalari, e'lonlar.»; `content` — «Kontent: bosh sahifa, bannerlar, yangiliklar, blog, sahifalar, vakansiyalar.»; `site` — «Sayt matnlari registri: maydon nomlari, izohlar, bo'lim sarlavhalari.»; `errors` — «Server xato kodlari.».

- [ ] **Step 4: Failing test**

`src/admin/i18n/i18n.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { Dict } from './dict';
import { i18n, parseLang } from './index';

describe('admin i18n', () => {
  it("sinxron init: server va birinchi render o'zbekcha", () => {
    expect(i18n.isInitialized).toBe(true);
    expect(i18n.language).toBe('uz');
  });

  it('bir kalit ikkala tilda', () => {
    expect(i18n.getFixedT('uz', 'shell')('footer.language')).toBe('Til');
    expect(i18n.getFixedT('ru', 'shell')('footer.language')).toBe('Язык');
  });

  it("saqlangan qiymat: faqat 'ru' ruscha, qolgani o'zbekcha", () => {
    expect(parseLang('ru')).toBe('ru');
    expect(parseLang('uz')).toBe('uz');
    expect(parseLang(null)).toBe('uz');
    expect(parseLang('en')).toBe('uz');
  });

  it("tiplar: noma'lum kalit va chala ruscha fayl lint'ni yiqitadi", () => {
    // @ts-expect-error — mavjud bo'lmagan kalit (strictKeyChecks)
    i18n.t('shell:footer.nope');
    // @ts-expect-error — ruscha faylda kalit tushib qolgan
    const broken: Dict<{ a: 'x'; b: 'y' }> = { a: 'x' };
    expect(broken.a).toBe('x');
  });
});
```
Run: `bunx vitest run src/admin/i18n/i18n.test.ts`
Expected: FAIL — `./index` topilmaydi.

- [ ] **Step 5: `src/admin/i18n/index.ts`**

```ts
import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import uzCommon from './uz/common';
import uzShell from './uz/shell';
import uzProducts from './uz/products';
import uzOrders from './uz/orders';
import uzContent from './uz/content';
import uzSite from './uz/site';
import uzSettings from './uz/settings';
import uzErrors from './uz/errors';
import ruCommon from './ru/common';
import ruShell from './ru/shell';
import ruProducts from './ru/products';
import ruOrders from './ru/orders';
import ruContent from './ru/content';
import ruSite from './ru/site';
import ruSettings from './ru/settings';
import ruErrors from './ru/errors';

/**
 * Admin tarjimalari (spec `docs/superpowers/specs/2026-09-24-admin-rus-tili-design.md`).
 * O'zbekcha — manba (`uz/*`, `as const`), ruscha `Dict<typeof uz>` bilan tuzilmasi tekshiriladi.
 * Faqat admin import qiladi — storefront chunk'lariga tushmaydi. Serverda til hech qachon
 * almashtirilmaydi (`changeLanguage` faqat klient effektida) — so'rovlar orasida til sizmaydi.
 */
export type AdminLang = 'uz' | 'ru';
export const ADMIN_LANGS: AdminLang[] = ['uz', 'ru'];
/** Til nomi o'z tilida — tarjima qilinmaydi. */
export const LANG_NAMES: Record<AdminLang, string> = { uz: "O'zbekcha", ru: 'Русский' };
const KEY = 'adminLang';

const uz = {
  common: uzCommon, shell: uzShell, products: uzProducts, orders: uzOrders,
  content: uzContent, site: uzSite, settings: uzSettings, errors: uzErrors,
};
const ru = {
  common: ruCommon, shell: ruShell, products: ruProducts, orders: ruOrders,
  content: ruContent, site: ruSite, settings: ruSettings, errors: ruErrors,
};

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: typeof uz;
    strictKeyChecks: true;
  }
}

void i18n.use(initReactI18next).init({
  resources: { uz, ru },
  lng: 'uz',
  fallbackLng: 'uz',
  supportedLngs: ADMIN_LANGS,
  ns: Object.keys(uz),
  defaultNS: 'common',
  initAsync: false, // v26 sukuti `true` — SSR'da sinxron bo'lishi shart
  interpolation: { escapeValue: false }, // React o'zi escape qiladi
  returnNull: false,
});

export { i18n };

/** Saqlangan qiymat → til; noma'lum yoki bo'sh — o'zbekcha. */
export function parseLang(raw: string | null): AdminLang {
  return raw === 'ru' ? 'ru' : 'uz';
}

function apply(lang: AdminLang): void {
  void i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
}

/** `AdminApp`ning birinchi effekti: saqlangan tilni qo'llaydi (server va gidratatsiya — o'zbekcha). */
export function restoreAdminLang(): void {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(KEY);
  } catch {
    /* private rejimda localStorage yo'q — sukut o'zbekcha */
  }
  const lang = parseLang(saved);
  if (lang !== i18n.language) apply(lang);
}

/** Joriy til va almashtirgich; tanlov darhol qo'llanadi va shu brauzerda eslab qolinadi. */
export function useAdminLang(): { lang: AdminLang; setLang: (l: AdminLang) => void } {
  const { i18n: instance } = useTranslation();
  const setLang = (l: AdminLang) => {
    apply(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* private rejim — til shu sahifada baribir almashadi */
    }
  };
  return { lang: parseLang(instance.language), setLang };
}
```

- [ ] **Step 6: Test va lint o'tishi**

Run: `bunx vitest run src/admin/i18n/i18n.test.ts && bun run lint`
Expected: 4 test PASS; lint toza. **Agar lint `Unused '@ts-expect-error' directive` desa** — i18next tiplari kalitni tekshirmayapti (spec «Xavflar» — `@types/react` yo'qligi). Bu holda to'xtang va `BLOCKED` bilan qaytaring: nima ko'rganingizni (xato matni, `i18n.t` imzosi) yozing — yechim alohida kelishiladi.

- [ ] **Step 7: `LangSwitch`**

`src/admin/LangSwitch.tsx`:
```tsx
import type { FC } from 'react';
import { ADMIN_LANGS, LANG_NAMES, useAdminLang } from './i18n';

/**
 * Admin tili — ixcham `UZ | RU` pill segment (sidebar pasti va Akkaunt → Ko'rinish). Tanlov darhol qo'llanadi.
 * Pill ichida pill — radiuslar o'z-o'zidan konsentrik; tanlangani `raised` (qorong'ida ham fondan ko'tariladi).
 */
const LangSwitch: FC<{ label: string }> = ({ label }) => {
  const { lang, setLang } = useAdminLang();
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex shrink-0 rounded-full bg-fill-2 p-0.5">
      {ADMIN_LANGS.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={l === lang}
          aria-label={LANG_NAMES[l]}
          lang={l}
          onClick={() => { if (l !== lang) setLang(l); }}
          className={`press h-7 rounded-full px-2.5 text-label ${l === lang ? 'bg-raised text-primary' : 'text-muted hover:text-primary'}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

export default LangSwitch;
```

- [ ] **Step 8: Ulash — `AdminApp`, sidebar, Akkaunt**

`src/admin/AdminApp.tsx` — importlarga `import { restoreAdminLang } from './i18n';`, `AdminApp` funksiyasining boshida (birinchi `useState`lardan keyin, `getMe` effektidan **oldin**):
```tsx
  // Saqlangan admin tili — server va gidratatsiya o'zbekcha, keyin shu effekt almashtiradi.
  useEffect(() => restoreAdminLang(), []);
```
`src/admin/AdminShell.tsx` — lucide importiga `Languages`; `import { useTranslation } from 'react-i18next';`, `import LangSwitch from './LangSwitch';`; komponent boshida `const { t } = useTranslation('shell');`. Sidebar pastida «Qorong'i mavzu» qatoridan keyin (Chiqish'dan oldin):
```tsx
          <div className="flex h-9 items-center gap-3 px-3 text-para text-muted">
            <Languages aria-hidden className="size-[18px]" strokeWidth={1.8} />
            <span className="flex-1">{t('footer.language')}</span>
            <LangSwitch label={t('footer.language')} />
          </div>
```
`src/admin/screens/SettingsAccount.tsx` — `import { useTranslation } from 'react-i18next';`, `import LangSwitch from '../LangSwitch';`; komponent boshida `const { t } = useTranslation('settings');`. «Ko'rinish» kartasida `SwitchRow`dan keyin:
```tsx
              <div className="flex items-center justify-between gap-4 py-3">
                <p className="text-para text-primary">{t('account.language')}</p>
                <LangSwitch label={t('account.language')} />
              </div>
```
(Kartaning qolgan matnlari — «Ko'rinish», «Qorong'i mavzu» — 6-bosqichda tarjima qilinadi.)

- [ ] **Step 9: Qoldiq skaneri (commit qilinmaydi)**

`.superpowers/sdd/2026-09-24-admin-rus-tili/scan.ts`:
```ts
/**
 * Admin i18n qoldiq skaneri (bir martalik; SDD workspace'da, commit qilinmaydi).
 * `src/admin` (i18n/ dan tashqari) fayllaridagi odam o'qiydigan lotin matnni topadi: JSX matni va satr
 * literallari. className, import yo'li, `to`/`href` kabi atributlar va `t(...)` kalitlari hisobga olinmaydi.
 * UZ — o'zbekcha belgisi bor (tarjima qilinishi kerak), ? — ko'rib chiqing (texnik so'z yoki ma'lumot bo'lishi mumkin).
 * Ishlatish: bun .superpowers/sdd/2026-09-24-admin-rus-tili/scan.ts [fayl|papka ...]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const SKIP_ATTRS = new Set([
  'className', 'key', 'to', 'href', 'src', 'type', 'id', 'role', 'name', 'autoComplete', 'accept', 'lang',
  'inputMode', 'rel', 'target', 'htmlFor', 'i18nKey', 'labelKey', 'shortKey', 'aria-controls',
]);
const TECH = /^(Billz|SEO|MCP|Telegram|Google|Instagram|WhatsApp|ProDuct|Apple|PC|Audio|Video|PNG|JPEG|JPG|WebP|MP4|URL|ID|API|OK|UZS|USD|SKU|Trade|In|iPhone|iPad|MacBook|Mac|Metrica|Yandex|OAuth|Client|Secret|Chat|Bot|Pro|Max|Air|mini|UZ|RU)$/;
const UZ = /[oOgG]['ʻ’‘]|ʻ|\b(va|yoki|uchun|bilan|emas|kerak|mumkin|ta|tasi|dona|oy|ixtiyoriy|majburiy|hammasi|yangi|saqlash|bekor|qilish|kiriting|tanlang)\b/i;
const CODEY = /^[a-z0-9:[\]/().%#!_ .,=+*-]*$/; // className, id, yo'l, enum

const files: string[] = [];
const walk = (p: string): void => {
  if (statSync(p).isDirectory()) {
    for (const f of readdirSync(p)) if (f !== 'i18n') walk(join(p, f));
  } else if (/\.tsx?$/.test(p) && !/\.(test|d)\.ts$/.test(p)) files.push(p);
};
(process.argv.slice(2).length ? process.argv.slice(2) : ['src/admin']).forEach(walk);

let hits = 0;
for (const file of files) {
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const src = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, kind);
  const report = (node: ts.Node, text: string) => {
    const s = text.replace(/\s+/g, ' ').trim();
    if (!/[A-Za-z]{2}/.test(s)) return;
    if (CODEY.test(s) && !UZ.test(s)) return;
    const words = s.match(/[A-Za-zʻ'’]{2,}/g) ?? [];
    if (words.length > 0 && words.every((w) => TECH.test(w))) return;
    const { line } = src.getLineAndCharacterOfPosition(node.getStart());
    console.log(`${UZ.test(s) ? 'UZ' : '? '} ${file}:${line + 1}  ${s.slice(0, 100)}`);
    hits++;
  };
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    if (ts.isJsxAttribute(node) && SKIP_ATTRS.has(node.name.getText(src))) return;
    if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && SKIP_ATTRS.has(node.name.text)) return;
    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(src);
      if (callee === 't' || callee.endsWith('.t') || callee === 'useTranslation' || callee.endsWith('getFixedT') || callee.endsWith('.exists')) {
        node.arguments.slice(1).forEach(visit); // kalit tashlanadi, qolgan argumentlar (qiymatlar) ko'riladi
        return;
      }
    }
    if (ts.isJsxText(node)) report(node, node.text);
    else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) report(node, node.text);
    else if (ts.isTemplateExpression(node)) report(node, [node.head.text, ...node.templateSpans.map((sp) => sp.literal.text)].join(' … '));
    ts.forEachChild(node, visit);
  };
  visit(src);
}
console.log(`\n${hits} ta (UZ — o'zbekcha, ? — tekshiring)`);
```
Run: `bun .superpowers/sdd/2026-09-24-admin-rus-tili/scan.ts src/admin/LangSwitch.tsx src/admin/i18n`
Expected: `0 ta` (LangSwitch'da odam matni yo'q, `i18n/` papkasi skanerlanmaydi).
Run: `bun .superpowers/sdd/2026-09-24-admin-rus-tili/scan.ts src/admin | tail -1`
Expected: bir necha yuz qator — keyingi bosqichlar uchun boshlang'ich son (hisobotga yozing).

- [ ] **Step 10: To'liq tekshiruv**

Run: `bun run lint && bun run test`
Expected: lint toza, hamma test PASS.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json bun.lock src/admin/i18n src/admin/LangSwitch.tsx src/admin/AdminApp.tsx src/admin/AdminShell.tsx src/admin/screens/SettingsAccount.tsx
git commit -m "feat(admin): i18next asosi va til tanlovi (UZ | RU)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `common` + `shell` — UI-kit, qobiq, menyu, bosh sahifa, kirish

**Files:**
- Modify: `src/admin/i18n/{uz,ru}/common.ts`, `src/admin/i18n/{uz,ru}/shell.ts`
- Modify (common): `src/admin/ui/layout.tsx`, `ui/form.tsx`, `ui/confirm.tsx`, `src/admin/ImageUploader.tsx`, `MarkdownHelp.tsx`, `useActiveToggle.ts`
- **Tegilmaydi (o'z matni yo'q, hammasi prop orqali):** `ui/controls.tsx`, `ui/DataTable.tsx`, `ui/toast.tsx`, `IconAction.tsx`, `PriceInput.tsx`, `api.ts` (xato kodi `http_${status}` — kod, `errText` ko'rsatadi)
- Modify: `src/admin/lib/format.ts`, `src/admin/lib/format.test.ts`
- Modify (faqat `formatSum` chaqiruvlari): `src/admin/screens/OrderDetail.tsx`, `OrdersList.tsx`, `SettingsPayment.tsx`
- Modify (shell): `src/admin/nav.ts`, `AdminShell.tsx`, `SectionTabs.tsx`, `AdminApp.tsx`, `Login.tsx`, `screens/Dashboard.tsx`

**Interfaces:**
- Consumes: Task 1 — `i18n`, `Dict`, `useAdminLang`, `LangSwitch`, `shell:footer.language`.
- Produces:
  - `formatSum(n: number | null, sum: string): string` (`src/admin/lib/format.ts`).
  - `src/admin/nav.ts`: `TabDef.labelKey: ParseKeys<'shell'>` (o'rniga `label`), `SectionDef.labelKey` / `shortKey: ParseKeys<'shell'>` (o'rniga `label` / `short`).
  - `common` namespace'i: `sum`, `errorGeneric` emas (u 7-bosqichda), UI-kit matnlari va keyingi bosqichlar ishlatadigan umumiy so'zlar — kalitlar ro'yxatini bosqich oxirida hisobotga yozing (3–6-bosqich bajaruvchilari `src/admin/i18n/uz/common.ts` ni o'qib oladi).
  - `shell` namespace'i: `nav.*`, `footer.*`, `dashboard.*`, `login.*`.

- [ ] **Step 1: `formatSum` — failing test**

`src/admin/lib/format.test.ts` dagi `formatSum` bloki:
```ts
describe('formatSum', () => {
  it("ming bo'lib, qo'shimcha bilan", () => {
    expect(formatSum(12_500_000, "so'm")).toBe("12 500 000 so'm");
    expect(formatSum(12_500_000, 'сум')).toBe('12 500 000 сум');
  });
  it("null — tire, 0 — «0 so'm»", () => {
    expect(formatSum(null, "so'm")).toBe('—');
    expect(formatSum(0, "so'm")).toBe("0 so'm");
  });
});
```
Run: `bunx vitest run src/admin/lib/format.test.ts` — Expected: FAIL (`сум` chiqmaydi).

- [ ] **Step 2: `formatSum(n, sum)`**

`src/admin/lib/format.ts`:
```ts
/** So'mdagi summa; yo'q bo'lsa «—». 0 — «0 so'm». Qo'shimchani chaqiruvchi beradi: `t('common:sum')` (saytdagi `formatUzs(value, t.sum)` naqshi). */
export function formatSum(n: number | null, sum: string): string {
  if (n == null) return '—';
  return `${formatThousands(n) || '0'} ${sum}`;
}
```
`common` resurslariga: uz `sum: "so'm"`, ru `sum: 'сум'`.
Chaqiruvchilar (`OrderDetail`, `OrdersList`, `SettingsPayment`) — komponent boshida `const sum = useTranslation('common').t('sum');` (`import { useTranslation } from 'react-i18next';`) va har `formatSum(x)` → `formatSum(x, sum)`. Bu fayllarning qolgan matnlari 4- va 6-bosqichda.
Run: `bunx vitest run src/admin/lib/format.test.ts` — Expected: PASS.

- [ ] **Step 3: Menyu — `nav.ts` kalitlarga**

`shell` resurslariga (Task 1 dagi `footer` ni kengaytirib):
```ts
// src/admin/i18n/uz/shell.ts
const shell = {
  brand: 'Admin',
  nav: {
    aria: "Bo'limlar",
    expand: '{{name}} — ochish',
    collapse: '{{name}} — yopish',
    home: { label: 'Bosh sahifa', short: 'Asosiy' },
    products: { label: 'Mahsulotlar', short: 'Tovarlar', list: 'Mahsulotlar', types: 'Turlar', categories: 'Kategoriyalar', brands: 'Brendlar', models: 'Modellar' },
    orders: { label: 'Buyurtmalar', short: 'Buyurtma', list: 'Buyurtmalar', applications: 'Ish arizalari', announcements: "E'lonlar" },
    content: { label: 'Kontent', short: 'Kontent', home: 'Bosh sahifa', banners: 'Bannerlar', news: 'Yangiliklar', posts: 'Blog', pages: 'Sahifalar', vacancies: 'Vakansiyalar' },
    settings: { label: 'Sozlamalar', short: 'Sozlash', store: "Do'kon", contact: 'Aloqa', payment: "To'lov va kurs", integrations: 'Integratsiyalar', seo: 'SEO', account: 'Akkaunt' },
  },
  footer: {
    openSite: 'Saytni ochish',
    darkTheme: "Qorong'i mavzu",
    language: 'Til',
    logout: 'Chiqish',
  },
} as const;
```
```ts
// src/admin/i18n/ru/shell.ts
const shell: Dict<typeof uz> = {
  brand: 'Admin',
  nav: {
    aria: 'Разделы',
    expand: '{{name}} — развернуть',
    collapse: '{{name}} — свернуть',
    home: { label: 'Главная', short: 'Главная' },
    products: { label: 'Товары', short: 'Товары', list: 'Товары', types: 'Типы', categories: 'Категории', brands: 'Бренды', models: 'Модели' },
    orders: { label: 'Заказы', short: 'Заказы', list: 'Заказы', applications: 'Отклики', announcements: 'Объявления' },
    content: { label: 'Контент', short: 'Контент', home: 'Главная', banners: 'Баннеры', news: 'Новости', posts: 'Блог', pages: 'Страницы', vacancies: 'Вакансии' },
    settings: { label: 'Настройки', short: 'Настройки', store: 'Магазин', contact: 'Контакты', payment: 'Оплата и курс', integrations: 'Интеграции', seo: 'SEO', account: 'Аккаунт' },
  },
  footer: {
    openSite: 'Открыть сайт',
    darkTheme: 'Тёмная тема',
    language: 'Язык',
    logout: 'Выйти',
  },
};
```
`src/admin/nav.ts`: `import type { ParseKeys } from 'i18next';`; `TabDef` da `label: string` → `labelKey: ParseKeys<'shell'>`; `SectionDef` da `label: string; short: string` → `labelKey: ParseKeys<'shell'>; shortKey: ParseKeys<'shell'>`. `SECTIONS` qatorlari: `label: 'Bosh sahifa', short: 'Asosiy'` → `labelKey: 'nav.home.label', shortKey: 'nav.home.short'`; tablar `label: 'Turlar'` → `labelKey: 'nav.products.types'` (va h.k. — kalit `nav.<bo'lim id>.<tab id>`). Izohdagi «`short` — mobil tab bar yozuvi» → «`shortKey`».
Chizish: `AdminShell` (sidebar, mobil tab bar, `aria-label`lar; ichki `.map((t) =>` → `.map((tab) =>`), `SectionTabs` (`label: t(tab.labelKey)`), `AdminApp` (`SectionPage` sarlavhasi `t(tab.labelKey)`, «Yuklanmoqda…») — hammasi `useTranslation('shell')` (yoki `['shell', 'common']`).

- [ ] **Step 4: UI-kit (`common`)**

«Tarjima tartibi» bo'yicha, `common` namespace'iga (inventarizatsiya bo'yicha jami ~40 matn):
- `ui/layout.tsx` (9): «Orqaga»; saqlanmagan o'zgarish tasdig'i (`confirm({ title: "Saqlanmagan o'zgarishlar bor", message: "Chiqilsa o'zgarishlar yo'qoladi.", confirmLabel: 'Chiqish' })`); aria-label'lar «Tablar», «Yuklanmoqda», «Sahifalash», «Oldingi sahifa», «Keyingi sahifa».
- `ui/confirm.tsx` (3): standart «Tasdiqlash» (sarlavha va tugma) va «Bekor qilish».
- `ui/form.tsx` (2): `LangPair` standart `ruHint` («Bo'sh qolsa o'zbekchasi chiqadi») → `common`; ruscha maydon yorlig'idagi `` `${label} (ru)` `` qo'shimchasi — til kodi, **o'zgarmaydi**.
- `ImageUploader.tsx` (~10): yuklash/tashlash yozuvlari, «Standart», fayl turi va hajmi xatolari — son va birlik resurs ichida (`'{{size}} MB gacha'`), `acceptLabel(...)` natijasi `{{types}}` bo'lib uzatiladi.
- `MarkdownHelp.tsx` (~14): modul darajasidagi `ROWS` jadvali — izoh so'zlari kalitga (`labelKey`), markdown namunasining sintaksisi (`## `, `**…**`, `[matn](/yo'l)`, `1. `) o'zgarmaydi, namunadagi so'z tarjima qilinadi (`## Sarlavha` → `## Заголовок`).
- `useActiveToggle.ts` (2): toast «Saytda ko'rsatildi» / «Yashirildi» (hook — `useTranslation` shu yerda).

- [ ] **Step 5: Qobiq ekranlari**

- `AdminShell`: `brand` («Admin»), `nav.aria`, bo'lim tugmasining `aria-label` shabloni (`t('nav.expand' | 'nav.collapse', { name })`), footer'ning to'rt qatori (`footer.openSite`, `footer.darkTheme` — qator matni va `Toggle` `label` i, `footer.language`, `footer.logout`).
- `Login.tsx` (13) → `shell:login.*`: `oauthError()` dagi 4 xabar, «Admin panel», «Login», «Parol», «Kirish» / «Kirilmoqda…», «yoki», «Google bilan kirish», «Urinishlar ko'payib ketdi…», «Login yoki parol noto'g'ri».
- `screens/Dashboard.tsx` (24) → `shell:dashboard.*`: uchta sanoq kartasi (sarlavha, izoh, nol holati, havola), Billz kartasi sarlavhasi va tugmalari, dollar kursi kartasi, standart parol ogohlantirishi — undagi `<b>Diqqat:</b>` → `<Trans t={t} i18nKey="dashboard.defaultPassword" components={{ b: <b /> }} />`, resursda `<b>Diqqat:</b> …` (ru `<b>Внимание:</b> …`). **Billz holati qatori** (`billzStatusText(...)`) — 6-bosqichda, hozir tegilmaydi.

- [ ] **Step 6: Tekshiruv**

Run: `bun run lint && bun run test`
Expected: toza; hamma test PASS.
Run: `bun .superpowers/sdd/2026-09-24-admin-rus-tili/scan.ts src/admin/ui src/admin/ImageUploader.tsx src/admin/MarkdownHelp.tsx src/admin/useActiveToggle.ts src/admin/nav.ts src/admin/AdminShell.tsx src/admin/SectionTabs.tsx src/admin/AdminApp.tsx src/admin/Login.tsx src/admin/screens/Dashboard.tsx`
Expected: `UZ` qatori faqat `Dashboard.tsx` dagi Billz holati bilan bog'liq bo'lsa (u 6-bosqichda), boshqa yo'q.

- [ ] **Step 7: Commit**

```bash
git add src/admin/i18n src/admin/lib/format.ts src/admin/lib/format.test.ts src/admin/ui/layout.tsx src/admin/ui/form.tsx src/admin/ui/confirm.tsx src/admin/ImageUploader.tsx src/admin/MarkdownHelp.tsx src/admin/useActiveToggle.ts src/admin/nav.ts src/admin/AdminShell.tsx src/admin/SectionTabs.tsx src/admin/AdminApp.tsx src/admin/Login.tsx src/admin/screens/Dashboard.tsx src/admin/screens/OrderDetail.tsx src/admin/screens/OrdersList.tsx src/admin/screens/SettingsPayment.tsx
git commit -m "feat(admin): qobiq, menyu va UI-kit rus tilida

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `products` — mahsulotlar, turlar, kategoriyalar, brendlar, modellar

**Files:**
- Modify: `src/admin/i18n/{uz,ru}/products.ts`
- Modify: `src/admin/lib/product-filter.ts`, `src/admin/lib/product-filter.test.ts`
- Modify: `src/admin/screens/ProductsList.tsx`, `ProductEdit.tsx`, `TypesList.tsx`, `TypeEdit.tsx`, `CategoriesList.tsx`, `CategoryEdit.tsx`, `BrandsList.tsx`, `BrandEdit.tsx`, `ModelsList.tsx`, `ModelEdit.tsx`
- Modify: `src/admin/ReviewsEditor.tsx`
- Modify: `src/admin/lib/product-form.ts`, `src/admin/lib/product-form.test.ts` (faqat `validateForm` xabarlari)
- **Tegilmaydi (ma'lumot):** `src/admin/lib/models.ts` (`modelToSpecs` spec nomlari «Protsessor»/«Operativ xotira»/«Kamera»/«Displey» bazaga yoziladi, `models.test.ts` ularni qotiradi); `src/admin/lib/variant-gen.ts`; `product-form.ts` dagi `STORAGE_VALUES`, `COLOR_VALUES` (Qora/Oq/… — variant qiymati bo'lib saqlanadi va saytda chip bo'lib chiqadi), `AXES = ['Xotira', 'Rang']` va `'yangi'`/`'ishlatilgan'` solishtiruvlari; `ProductEdit.tsx` dagi xuddi shu literal solishtiruvlar; `ProductsList.tsx` dagi `<option value="yangi">` qiymatlari (faqat ichidagi «Yangi»/«Ishlatilgan» matni tarjima qilinadi). Rang chiplari ruscha admin'da ham o'zbekcha ko'rinadi — bu ma'lumot, xato emas.

**Interfaces:**
- Consumes: Task 1 (`i18n`), Task 2 (`common:` so'zlari, `formatSum(n, sum)`).
- Produces:
  - `QUICK_FILTERS: { id: QuickFilter; labelKey: ParseKeys<'products'> }[]` (o'rniga `label`).
  - `summaryText(items: ApiProduct[], t: TFunction<'products'>): string`.
  - `validateForm(f: ProductFormState, t: TFunction<'products'>): string | null`.

- [ ] **Step 1: Failing test — `summaryText` ikki tilda**

`src/admin/lib/product-filter.test.ts` — importlarga `import { i18n } from '../i18n';`, fayl boshiga:
```ts
const tUz = i18n.getFixedT('uz', 'products');
const tRu = i18n.getFixedT('ru', 'products');
```
`summaryText` bloki:
```ts
describe('summaryText', () => {
  const four = [
    p({ id: '1', isActive: true, imageUrl: '/a.webp' }),
    p({ id: '2', isActive: false, billzId: 'b', imageUrl: '', billzStock: 0 }),
    p({ id: '3', isActive: false, billzId: 'c', imageUrl: '/a.webp', billzStock: 0 }),
    p({ id: '4', isActive: false, billzId: 'd', imageUrl: '/a.webp', billzStock: 7 }),
  ];
  const active = (n: number) => Array.from({ length: n }, (_, i) => p({ id: String(i), isActive: true }));

  it("bo'sh ro'yxat", () => {
    expect(summaryText([], tUz)).toBe("Hali tovar yo'q.");
    expect(summaryText([], tRu)).toBe('Товаров пока нет.');
  });

  it("hammasi saytda — sabab qatori yo'q", () => {
    expect(summaryText(active(1), tUz)).toBe("Jami 1 ta tovar: 1 tasi saytda e'lon qilingan.");
  });

  it("sabablar takrorlanmaydi va yig'indisi ko'rinmayotganlarga teng", () => {
    expect(summaryText(four, tUz)).toBe(
      "Jami 4 ta tovar: 1 tasi saytda e'lon qilingan, 3 tasi ko'rinmaydi. Sababi: 1 tasida rasm yo'q, 1 tasining qoldig'i tugagan, 1 tasini qo'lda yashirgansiz.",
    );
    expect(summaryText(four, tRu)).toBe(
      'Всего 4 товара: на сайте 1, скрыто 3. Причина: без фото — 1, нет остатка — 1, скрыты вручную — 1.',
    );
  });

  it("ruscha ko'plik: 1 товар · 2 товара · 5, 11 товаров · 21 товар · 22 товара", () => {
    expect(summaryText(active(1), tRu)).toBe('Всего 1 товар: на сайте 1.');
    expect(summaryText(active(2), tRu)).toBe('Всего 2 товара: на сайте 2.');
    expect(summaryText(active(5), tRu)).toBe('Всего 5 товаров: на сайте 5.');
    expect(summaryText(active(11), tRu)).toBe('Всего 11 товаров: на сайте 11.');
    expect(summaryText(active(21), tRu)).toBe('Всего 21 товар: на сайте 21.');
    expect(summaryText(active(22), tRu)).toBe('Всего 22 товара: на сайте 22.');
  });
});
```
Run: `bunx vitest run src/admin/lib/product-filter.test.ts` — Expected: FAIL (`summaryText` ikkinchi argumentni qabul qilmaydi / ruscha yo'q).

- [ ] **Step 2: Resurslar — filtr va xulosa (to'liq matn)**

`src/admin/i18n/uz/products.ts` ga:
```ts
  filter: {
    quick: { all: 'Hammasi', active: 'Saytda bor', hidden: "Saytda yo'q", needsImage: 'Rasm kerak', stock0: 'Qoldiq tugagan', manual: "Qo'lda kiritilgan" },
    empty: "Hali tovar yo'q.",
    total_one: "Jami {{count}} ta tovar: {{active}} tasi saytda e'lon qilingan",
    total_few: "Jami {{count}} ta tovar: {{active}} tasi saytda e'lon qilingan",
    total_many: "Jami {{count}} ta tovar: {{active}} tasi saytda e'lon qilingan",
    total_other: "Jami {{count}} ta tovar: {{active}} tasi saytda e'lon qilingan",
    hidden: "{{count}} tasi ko'rinmaydi",
    reason: 'Sababi: {{list}}',
    noImage: "{{count}} tasida rasm yo'q",
    noStock: "{{count}} tasining qoldig'i tugagan",
    byHand: "{{count}} tasini qo'lda yashirgansiz",
  },
```
`src/admin/i18n/ru/products.ts` ga:
```ts
  filter: {
    quick: { all: 'Все', active: 'На сайте', hidden: 'Скрытые', needsImage: 'Нужно фото', stock0: 'Нет остатка', manual: 'Добавлены вручную' },
    empty: 'Товаров пока нет.',
    total_one: 'Всего {{count}} товар: на сайте {{active}}',
    total_few: 'Всего {{count}} товара: на сайте {{active}}',
    total_many: 'Всего {{count}} товаров: на сайте {{active}}',
    total_other: 'Всего {{count}} товара: на сайте {{active}}',
    hidden: 'скрыто {{count}}',
    reason: 'Причина: {{list}}',
    noImage: 'без фото — {{count}}',
    noStock: 'нет остатка — {{count}}',
    byHand: 'скрыты вручную — {{count}}',
  },
```

- [ ] **Step 3: `product-filter.ts`**

```ts
import type { ParseKeys, TFunction } from 'i18next';
```
```ts
export const QUICK_FILTERS: { id: QuickFilter; labelKey: ParseKeys<'products'> }[] = [
  { id: '', labelKey: 'filter.quick.all' },
  { id: 'active', labelKey: 'filter.quick.active' },
  { id: 'hidden', labelKey: 'filter.quick.hidden' },
  { id: 'needs_image', labelKey: 'filter.quick.needsImage' },
  { id: 'stock0', labelKey: 'filter.quick.stock0' },
  { id: 'manual', labelKey: 'filter.quick.manual' },
];
```
```ts
export function summaryText(items: ApiProduct[], t: TFunction<'products'>): string {
  const total = items.length;
  if (total === 0) return t('filter.empty');
  const hidden = items.filter((p) => !p.isActive);
  const head = t('filter.total', { count: total, active: total - hidden.length });
  if (hidden.length === 0) return `${head}.`;

  const noImage = hidden.filter((p) => !p.imageUrl).length;
  const noStock = hidden.filter((p) => p.imageUrl && p.billzStock === 0).length;
  const byHand = hidden.length - noImage - noStock;
  const why = [
    noImage > 0 ? t('filter.noImage', { count: noImage }) : '',
    noStock > 0 ? t('filter.noStock', { count: noStock }) : '',
    byHand > 0 ? t('filter.byHand', { count: byHand }) : '',
  ].filter(Boolean);
  return `${head}, ${t('filter.hidden', { count: hidden.length })}. ${t('filter.reason', { list: why.join(', ') })}.`;
}
```
Izohlar (sabablar tartibi, takrorlanmasligi) o'z joyida qoladi.
Run: `bunx vitest run src/admin/lib/product-filter.test.ts` — Expected: PASS.

- [ ] **Step 4: `validateForm` — xabarlar tarjimada**

`product-form.test.ts` — `import { i18n } from '../i18n';`, `const tUz = i18n.getFixedT('uz', 'products'); const tRu = i18n.getFixedT('ru', 'products');`; mavjud to'rt `validateForm(x)` → `validateForm(x, tUz)` (regex'lar o'zgarmaydi) va qo'shing:
```ts
    expect(validateForm(EMPTY_FORM, tRu)).toBe('Введите название товара.');
```
Resurslar — uz:
```ts
  form: {
    nameRequired: 'Mahsulot nomini kiriting.',
    priceRequired: 'Naqd narx yoki kamida bitta variant narxini kiriting.',
    variantPriceRequired: "Variant narxlarini kiriting yoki o'lchovlarni olib tashlang.",
  },
```
ru:
```ts
  form: {
    nameRequired: 'Введите название товара.',
    priceRequired: 'Укажите цену за наличные или цену хотя бы одного варианта.',
    variantPriceRequired: 'Укажите цены вариантов или удалите параметры.',
  },
```
`validateForm(f, t)` — uchta satr → `t('form.nameRequired')`, `t('form.priceRequired')`, `t('form.variantPriceRequired')`; chaqiruvchi `ProductEdit` — `validateForm(form, t)`.
Run: `bunx vitest run src/admin/lib/product-form.test.ts` — Expected: avval FAIL (ruscha), keyin PASS.

- [ ] **Step 5: Ekranlar**

«Tarjima tartibi» bo'yicha, `products` namespace'iga. `ProductsList`: `options={QUICK_FILTERS.map((q) => ({ id: q.id, label: t(q.labelKey) }))}`, `{summaryText(items, t)}`. `ProductEdit` — eng katta fayl (≈130 matn): kartalar (Rasmlar → Holat → Ma'lumot → Narx → Variantlar → Xususiyatlar → Reyting va sharhlar → Konfigurator → Xavfli zona), «Qo'lda tahrirlash» almashtirgichlari, toast'lar; `types.filter(...).map((t) =>` → `.map((type) =>`. Variant o'qi nomlari va chiplar qiymati (`64GB`…`2TB`, rang nomlari) — ma'lumot, tegilmaydi. `ReviewsEditor`, Turlar/Kategoriyalar/Brendlar/Modellar ekranlari — xuddi shu tartib (`ModelCombobox` da o'z matni yo'q — tegilmaydi). Inventarizatsiyadan:
- **Sonli xulosalar** (ruscha to'rt shakl): `ProductsList.tsx:150`, `TypesList.tsx:66`, `BrandsList.tsx:70`, `ModelsList.tsx:92` dagi `` `${n} ta …` `` — `t('<ekran>.count', { count })` (товар/товара/товаров; тип/типа/типов; бренд/бренда/брендов; модель/модели/моделей).
- **O'chirish tasdig'i nom bilan** (`ProductEdit.tsx:159`, `TypeEdit.tsx:92`, `CategoryEdit.tsx:72`, `BrandEdit.tsx:69`, `ModelEdit.tsx:82`) — nomlangan interpolatsiya `t('<ekran>.confirmDelete', { name })`, matn bo'laklari kodda yopishtirilmaydi.
- `ModelEdit.tsx:132–135` dagi «Protsessor», «Operativ xotira», «Kamera», «Displey» — forma maydoni **yorlig'i** (UI), tarjima qilinadi (ru «Процессор», «Оперативная память», «Камера», «Дисплей»); `lib/models.ts` dagi xuddi shu so'zlar — ma'lumot, tegilmaydi.

- [ ] **Step 6: Tekshiruv**

Run: `bun run lint && bun run test` — Expected: toza, PASS.
Run: `bun .superpowers/sdd/2026-09-24-admin-rus-tili/scan.ts src/admin/screens/ProductsList.tsx src/admin/screens/ProductEdit.tsx src/admin/screens/TypesList.tsx src/admin/screens/TypeEdit.tsx src/admin/screens/CategoriesList.tsx src/admin/screens/CategoryEdit.tsx src/admin/screens/BrandsList.tsx src/admin/screens/BrandEdit.tsx src/admin/screens/ModelsList.tsx src/admin/screens/ModelEdit.tsx src/admin/ReviewsEditor.tsx src/admin/lib/product-filter.ts src/admin/lib/product-form.ts`
Expected: `UZ` qatori yo'q (ma'lumot qatorlari `// i18n: ma'lumot` izohi bilan `?` bo'lib qolishi mumkin — hisobotda sanang).

- [ ] **Step 7: Commit**

```bash
git add src/admin/i18n/uz/products.ts src/admin/i18n/ru/products.ts src/admin/i18n/uz/common.ts src/admin/i18n/ru/common.ts src/admin/lib/product-filter.ts src/admin/lib/product-filter.test.ts src/admin/lib/product-form.ts src/admin/lib/product-form.test.ts src/admin/screens/ProductsList.tsx src/admin/screens/ProductEdit.tsx src/admin/screens/TypesList.tsx src/admin/screens/TypeEdit.tsx src/admin/screens/CategoriesList.tsx src/admin/screens/CategoryEdit.tsx src/admin/screens/BrandsList.tsx src/admin/screens/BrandEdit.tsx src/admin/screens/ModelsList.tsx src/admin/screens/ModelEdit.tsx src/admin/ReviewsEditor.tsx
git commit -m "feat(admin): Mahsulotlar bo'limi rus tilida

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `orders` — buyurtmalar, ish arizalari, e'lonlar

**Files:**
- Modify: `src/admin/i18n/{uz,ru}/orders.ts`
- Modify: `src/admin/lib/inbox.ts`, `src/admin/lib/inbox.test.ts`
- Modify: `src/admin/screens/OrdersList.tsx`, `OrderDetail.tsx`, `ApplicationsList.tsx`, `ApplicationDetail.tsx`, `Announcements.tsx`, `src/admin/StatusControls.tsx`

**Interfaces:**
- Consumes: Task 1 (`i18n`), Task 2 (`common:`, `formatSum(n, sum)` — bu fayllarda allaqachon `const sum = useTranslation('common').t('sum')` bor; ekran o'z `t` ini olgach `t('common:sum')` ga o'tkazsa bo'ladi).
- Produces (`src/admin/lib/inbox.ts`):
  - `orderStatusLabels(t: TFunction<'orders'>): Record<OrderStatus, string>` va `applicationStatusLabels(t: TFunction<'orders'>): Record<OrderStatus, string>` (o'rniga `ORDER_STATUS` / `APPLICATION_STATUS` konstantalari).
  - `statusSegments(labels: Record<OrderStatus, string>, newCount: number, t: TFunction<'orders'>): { id: StatusFilter; label: string }[]`.
  - `orderSource(o, t: TFunction<'orders'>): string`, `orderSummary(o, t: TFunction<'orders'>): string`.
  - `StatusSelect` / `StatusCard` (`StatusControls.tsx`) `labels` propi o'zgarmaydi — chaqiruvchi `orderStatusLabels(t)` beradi.

- [ ] **Step 1: Failing test**

`src/admin/lib/inbox.test.ts` — import qatori `APPLICATION_STATUS, ORDER_STATUS, …` → `applicationStatusLabels, orderStatusLabels, …`; `import { i18n } from '../i18n';` va fayl boshida:
```ts
const tUz = i18n.getFixedT('uz', 'orders');
const tRu = i18n.getFixedT('ru', 'orders');
```
`statusSegments` bloki:
```ts
describe('statusSegments', () => {
  it("«Yangi 3 · Bog'lanildi · Bajarildi · Hammasi»; yangi yo'q bo'lsa son yozilmaydi", () => {
    expect(statusSegments(orderStatusLabels(tUz), 3, tUz).map((s) => s.label)).toEqual(['Yangi 3', "Bog'lanildi", 'Bajarildi', 'Hammasi']);
    expect(statusSegments(applicationStatusLabels(tUz), 0, tUz).map((s) => s.label)).toEqual(['Yangi', "Bog'lanildi", 'Yopildi', 'Hammasi']);
    expect(statusSegments(orderStatusLabels(tUz), 0, tUz).map((s) => s.id)).toEqual(['new', 'contacted', 'done', 'all']);
  });

  it('ruscha', () => {
    expect(statusSegments(orderStatusLabels(tRu), 2, tRu).map((s) => s.label)).toEqual(['Новый 2', 'Связались', 'Выполнен', 'Все']);
    expect(statusSegments(applicationStatusLabels(tRu), 0, tRu).map((s) => s.label)).toEqual(['Новый', 'Связались', 'Закрыт', 'Все']);
  });
});
```
`orderSource` bloki — mavjud uchta `expect` ga `, tUz` qo'shing va ruschasini qo'shing:
```ts
    expect(orderSource(order({ source: 'consult' }), tRu)).toBe('Консультация');
    expect(orderSource(order({ paymentKind: 'installment' }), tRu)).toBe('Рассрочка');
    expect(orderSource(order({ source: 'cart' }), tRu)).toBe('Наличные');
```
`orderSummary` bloki — mavjud `expect` larga `, tUz`; ko'p tovarli holatga ruscha:
```ts
    expect(orderSummary(o, tRu)).toBe('AirPods Pro ×2 + ещё 2');
```
Run: `bunx vitest run src/admin/lib/inbox.test.ts` — Expected: FAIL (yangi funksiyalar yo'q).

- [ ] **Step 2: Resurslar (to'liq matn)**

`src/admin/i18n/uz/orders.ts` ga:
```ts
  status: { new: 'Yangi', contacted: "Bog'lanildi", done: 'Bajarildi', closed: 'Yopildi', all: 'Hammasi' },
  source: { consult: 'Konsultatsiya', installment: 'Muddatli', cash: 'Naqd' },
  summary: { more: '+ yana {{count}}' },
```
`src/admin/i18n/ru/orders.ts` ga:
```ts
  status: { new: 'Новый', contacted: 'Связались', done: 'Выполнен', closed: 'Закрыт', all: 'Все' },
  source: { consult: 'Консультация', installment: 'Рассрочка', cash: 'Наличные' },
  summary: { more: '+ ещё {{count}}' },
```

- [ ] **Step 3: `inbox.ts`**

```ts
import type { TFunction } from 'i18next';
```
`ORDER_STATUS` va `APPLICATION_STATUS` o'rniga:
```ts
export function orderStatusLabels(t: TFunction<'orders'>): Record<OrderStatus, string> {
  return { new: t('status.new'), contacted: t('status.contacted'), done: t('status.done') };
}
/** Nomzod arizasi "bajarilmaydi" — yopiladi (eski ekrandagi so'z). */
export function applicationStatusLabels(t: TFunction<'orders'>): Record<OrderStatus, string> {
  return { new: t('status.new'), contacted: t('status.contacted'), done: t('status.closed') };
}
```
`statusSegments` — uchinchi parametr `t: TFunction<'orders'>`, `'Hammasi'` → `t('status.all')`.
`orderSource(o, t)`: `'Konsultatsiya'` → `t('source.consult')`, `'Muddatli'` → `t('source.installment')`, `'Naqd'` → `t('source.cash')`.
`orderSummary(o, t)`: `` `${label} + yana ${o.items.length - 1}` `` → `` `${label} ${t('summary.more', { count: o.items.length - 1 })}` ``.
Run: `bunx vitest run src/admin/lib/inbox.test.ts` — Expected: PASS.

- [ ] **Step 4: Ekranlar**

«Tarjima tartibi» bo'yicha, `orders` namespace'iga. Chaqiruvchilar: `ORDER_STATUS` → `orderStatusLabels(t)`, `APPLICATION_STATUS` → `applicationStatusLabels(t)` (komponent ichida bir marta: `const labels = orderStatusLabels(t);`); `statusSegments(labels, newCount, t)`; `orderSource(order, t)`; `orderSummary(o, t)`. Toast'lar: `` `${o.name} — ${labels[next]}` `` shakli qoladi (ism — ma'lumot), `` `Holat: ${…}` `` → `t('orderDetail.statusToast', { status: labels[next] })`. `OrderDetail` tafsilot qatorlari (`k: 'Manba'`, `'Telefon'`, `"Boshlang'ich to'lov"`, `"Oylik to'lov"`, `'Jami'` …) — kalit bilan. Inventarizatsiyadan:
- **Sonli matn** (ruscha to'rt shakl): `OrdersList.tsx:136` (заказ / заказа / заказов), `ApplicationsList.tsx:144` (отклик / отклика / откликов), `Announcements.tsx:34` (klient / mijoz soni — клиент / клиента / клиентов), `OrderDetail.tsx:126` `` `${order.termMonths} oy` `` → `t('orderDetail.months', { count })` (месяц / месяца / месяцев; o'zbekcha to'rttasi «{{count}} oy»).
- `StatusControls.tsx`: «Holat» yorlig'i va 36-qatordagi ogohlantirish gapi. `E'lonlar` ekranidagi qaytarib bo'lmaydigan tasdiq matni — aniq tarjima (u hamma mijozga yuboriladi).

- [ ] **Step 5: Tekshiruv**

Run: `bun run lint && bun run test` — Expected: toza, PASS.
Run: `bun .superpowers/sdd/2026-09-24-admin-rus-tili/scan.ts src/admin/screens/OrdersList.tsx src/admin/screens/OrderDetail.tsx src/admin/screens/ApplicationsList.tsx src/admin/screens/ApplicationDetail.tsx src/admin/screens/Announcements.tsx src/admin/StatusControls.tsx src/admin/lib/inbox.ts`
Expected: `UZ` qatori yo'q.

- [ ] **Step 6: Commit**

```bash
git add src/admin/i18n/uz/orders.ts src/admin/i18n/ru/orders.ts src/admin/i18n/uz/common.ts src/admin/i18n/ru/common.ts src/admin/lib/inbox.ts src/admin/lib/inbox.test.ts src/admin/screens/OrdersList.tsx src/admin/screens/OrderDetail.tsx src/admin/screens/ApplicationsList.tsx src/admin/screens/ApplicationDetail.tsx src/admin/screens/Announcements.tsx src/admin/StatusControls.tsx
git commit -m "feat(admin): Buyurtmalar bo'limi rus tilida

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `content` + `site` — sayt matnlari registri va Kontent ekranlari

**Files:**
- Modify: `src/lib/site-content.ts` (registrdan odam matni chiqadi, `section` — id)
- Modify: `src/admin/i18n/{uz,ru}/site.ts`, `src/admin/i18n/{uz,ru}/content.ts`
- Modify: `src/admin/lib/content-form.ts`, `src/admin/lib/content-form.test.ts`
- Create: `src/admin/i18n/site.test.ts`
- Modify: `src/admin/ContentFields.tsx`, `src/admin/screens/ContentHome.tsx`, `BannersList.tsx`, `BannerEdit.tsx`, `NewsList.tsx`, `NewsEdit.tsx`, `PostsList.tsx`, `PostEdit.tsx`, `PagesList.tsx`, `PageEdit.tsx`, `VacanciesList.tsx`, `VacancyEdit.tsx`, `VacanciesText.tsx`
- Modify (faqat `only` qiymatlari): `src/admin/screens/SettingsStore.tsx`

**Interfaces:**
- Consumes: Task 1 — `i18n`, `Dict`, resurs fayllari naqshi; Task 2 — `common` kalitlari (Saqlash, O'chirish va h.k.).
- Produces:
  - `src/lib/site-content.ts`: `export type SiteSection = 'heroApple' | 'heroPc' | 'heroAudio' | 'heroVideo' | 'services' | 'consult' | 'homeTitles' | 'productPage' | 'orderCookie' | 'logo' | 'contact' | 'aboutIntro' | 'aboutExperts' | 'aboutWarranty' | 'aboutBuy' | 'aboutPersonal' | 'aboutNear' | 'aboutNews' | 'careersSeo' | 'careersHero' | 'careersWork' | 'careersLife' | 'careersWhy' | 'careersRoles' | 'images' | 'legal' | 'seo'`; `TextField { key: TextKey; group: ContentGroup; section: SiteSection; kind: 'text' | 'textarea' }`; `AssetField { key: AssetKey; group: ContentGroup; section: SiteSection; kind: 'image' | 'video' }` (`label`/`hint` yo'q).
  - `src/admin/lib/content-form.ts`: `ContentSection { id: SiteSection; texts: TextFieldDef[]; assets: AssetField[] }`.
  - `ContentFields`: `only?: SiteSection[]`.
  - Resurs kalitlari: `site:sections.<SiteSection>`, `site:fields.<textKey>.label` / `.hint`, `site:assets.<assetKey>.label` / `.hint` (asset kalitidagi nuqta — ichma-ich obyekt: `assets.hero.apple.image.label`).

- [ ] **Step 1: `site` resurslari (to'liq matn — ko'chiring)**

`src/admin/i18n/uz/site.ts`:
```ts
/**
 * Sayt matnlari registri (`src/lib/site-content.ts`) yozuvlari: karta sarlavhalari, maydon nomlari va izohlari.
 * Registrda faqat tuzilma qoladi; qamrovni `src/admin/i18n/site.test.ts` tekshiradi.
 */
const NEW_LINE = 'Enter — yangi qator';
const TOPIC = 'Konsultatsiya formasidagi mavzu tugmasi';
const MUTED = 'Och rangda chiqadi';
const VIDEO_HINT = "Landing kartasida emas — yo'nalish sahifasining cover'ida aylanadi; bo'lmasa cover'da rasm turadi. MP4, 40 MB gacha; tavsiya — 10 soniyagacha, 1080p, iloji boricha 8 MB dan kichik (sahifa mobilda ham videoni to'liq yuklaydi)";
const heroAssets = {
  image: { label: 'Rasm', hint: "Landing kartasi va yo'nalish sahifasining cover'i" },
  poster: { label: 'Video posteri', hint: 'Video yuklanguncha turadigan kadr' },
  video1: { label: '1-video', hint: VIDEO_HINT },
  video2: { label: '2-video', hint: VIDEO_HINT },
} as const;

const site = {
  sections: {
    heroApple: 'Apple kartasi', heroPc: 'PC kartasi', heroAudio: 'Audio kartasi', heroVideo: 'Video kartasi',
    services: "Xizmat va'dalari", consult: 'Konsultatsiya', homeTitles: 'Sarlavhalar',
    productPage: 'Mahsulot sahifasi', orderCookie: 'Buyurtma va cookie', logo: 'Logo va favicon',
    contact: 'Manzil va ish vaqti',
    aboutIntro: 'Kirish', aboutExperts: 'Mutaxassislar', aboutWarranty: 'Kafolat va servis', aboutBuy: 'Qulay xarid',
    aboutPersonal: 'Shaxsiy yondashuv', aboutNear: 'Doim yaqinda', aboutNews: 'Yangiliklar',
    careersSeo: 'Qidiruv tizimlari', careersHero: 'Hero va kirish', careersWork: "ProDuct'da ishlash",
    careersLife: 'Jamoadagi hayot', careersWhy: 'Bizda ish qanday', careersRoles: 'Vakansiyalar va ariza',
    images: 'Rasmlar', legal: 'Sarlavha ostidagi izoh', seo: 'Katalog sahifalari',
  },
  fields: {
    heroApple: { label: 'Nomi', hint: NEW_LINE },
    heroPc: { label: 'Nomi', hint: NEW_LINE },
    heroAudio: { label: 'Nomi', hint: NEW_LINE },
    heroVideo: { label: 'Nomi', hint: NEW_LINE },
    svcTitle: { label: "Bo'lim sarlavhasi" },
    svcPrompt: { label: 'Sarlavha davomi (och rangda)' },
    heroCtaPrimary: { label: 'Katalog tugmasi', hint: 'Sarlavha yonidagi tugma' },
    svcWarrantyCard: { label: 'Kafolat — sarlavha' },
    svcWarrantyDesc: { label: 'Kafolat — matn' },
    svcDeliveryCard: { label: 'Yetkazib berish — sarlavha' },
    svcDeliveryDesc: { label: 'Yetkazib berish — matn' },
    svcServiceCard: { label: 'Servis — sarlavha' },
    svcServiceDesc: { label: 'Servis — matn' },
    consultTitle: { label: 'Sarlavha' },
    consultLead: { label: 'Izoh' },
    consultTopicApple: { label: '1-mavzu', hint: TOPIC },
    consultTopicPc: { label: '2-mavzu', hint: TOPIC },
    consultTopicAudio: { label: '3-mavzu', hint: TOPIC },
    consultTopicVideo: { label: '4-mavzu', hint: TOPIC },
    consultTopicService: { label: '5-mavzu', hint: TOPIC },
    consultTopicOther: { label: '6-mavzu', hint: TOPIC },
    consultDoneTitle: { label: 'Yuborilgandan keyin — sarlavha' },
    consultDoneText: { label: 'Yuborilgandan keyin — matn' },
    proTitle: { label: 'Shior', hint: "Yo'nalish sahifasida nomdan keyin chiqadi: «PC — Professional yondashuv»" },
    newsTitle: { label: "Yangiliklar bo'limi" },
    homeBrands: { label: 'Brendlar tasmasi' },
    svcDeliveryTitle: { label: 'Yetkazish — nom' },
    svcDeliveryFact: { label: 'Yetkazish — muddat' },
    feature3: { label: 'Yetkazish — izoh' },
    svcWarrantyTitle: { label: 'Kafolat — nom' },
    svcWarrantyFact: { label: 'Kafolat — muddat' },
    feature2: { label: 'Kafolat — izoh' },
    trustShort: { label: "Muddatli to'lov qatori", hint: "Faqat muddatli to'lov yoqilganda chiqadi" },
    setupTitle: { label: 'Apple sozlash — sarlavha', hint: 'Faqat Apple mahsulotlarida, sahifa oxirida' },
    setupText: { label: 'Apple sozlash — matn' },
    setupCta: { label: 'Apple sozlash — tugma' },
    orderSuccessNote: { label: 'Buyurtmadan keyingi xabar', hint: "Qo'ng'iroq muddati va'dasi shu yerda" },
    cookieText: { label: 'Cookie ogohlantirishi' },
    cookieAccept: { label: 'Cookie tugmasi' },
    footerAddressText1: { label: 'Manzil — 1-qator', hint: "Masalan: O'zbekiston, Toshkent shahar," },
    footerAddressText2: { label: 'Manzil — 2-qator' },
    footerTime: { label: 'Ish vaqti', hint: 'Saytda shunday chiqadi: Du–Yak, 10:00–21:00' },
    seoOpeningHours: { label: 'Google uchun ish vaqti', hint: 'Format: Mo-Su 10:00-21:00 — ikkala tilda bir xil' },
    aboutLede: { label: 'Hero izohi', hint: 'Qidiruv tizimlaridagi tavsif ham shu' },
    aboutWhyTitle: { label: "Bo'lim sarlavhasi" },
    aboutWhyMuted: { label: 'Sarlavha davomi', hint: MUTED },
    aboutExpertsLabel: { label: 'Yorliq' },
    aboutExpertsTitle: { label: 'Sarlavha' },
    aboutExpertsText: { label: 'Matn' },
    aboutWarrantyTitle: { label: 'Sarlavha' },
    aboutWarrantyText: { label: 'Matn' },
    aboutBuyTitle: { label: 'Sarlavha' },
    aboutBuyText: { label: 'Matn' },
    aboutTradeInLink: { label: 'Trade-In havolasi' },
    aboutPersonalTitle: { label: 'Sarlavha' },
    aboutPersonalText: { label: 'Matn' },
    aboutNearTitle: { label: 'Sarlavha' },
    aboutNearText: { label: 'Matn' },
    aboutNewsTitle: { label: 'Sarlavha' },
    aboutNewsText: { label: 'Matn' },
    aboutBlogLink: { label: 'Blog havolasi' },
    careersMetaDesc: { label: 'Qidiruv tavsifi', hint: "{store} o'z joyida qoladi — do'kon nomiga almashadi" },
    careersHeroTitle: { label: 'Sarlavha' },
    careersHeroCta: { label: 'Tugma' },
    careersIntro: { label: 'Kirish matni' },
    careersWorkEyebrow: { label: 'Yorliq' },
    careersWorkTitle: { label: 'Sarlavha' },
    careersWorkText: { label: 'Matn' },
    careersWorkQuote: { label: 'Iqtibos' },
    careersQuoteBy: { label: 'Iqtibos muallifi' },
    careersLifeEyebrow: { label: 'Yorliq' },
    careersLifeTitle: { label: 'Sarlavha' },
    careersLifeText: { label: 'Matn' },
    careersLifeCard: { label: 'Rasm ustidagi matn' },
    careersWhyTitle: { label: 'Sarlavha' },
    careersWhyMuted: { label: 'Sarlavha davomi', hint: MUTED },
    careersWhyTechTitle: { label: '1-karta — sarlavha' },
    careersWhyTechText: { label: '1-karta — matn' },
    careersWhyClientTitle: { label: '2-karta — sarlavha' },
    careersWhyClientText: { label: '2-karta — matn' },
    careersWhyServiceTitle: { label: '3-karta — sarlavha' },
    careersWhyServiceText: { label: '3-karta — matn' },
    careersWhyTeamTitle: { label: '4-karta — sarlavha' },
    careersWhyTeamText: { label: '4-karta — matn' },
    careersRolesTitle: { label: "Ro'yxat sarlavhasi" },
    careersRolesEmpty: { label: "Vakansiya yo'q bo'lsa" },
    careersDoneTitle: { label: 'Arizadan keyin — sarlavha' },
    careersDoneText: { label: 'Arizadan keyin — matn' },
    legalLedeOferta: { label: 'Ommaviy oferta' },
    legalLedePrivacy: { label: 'Maxfiylik siyosati' },
    legalLedeReturns: { label: 'Qaytarish va almashtirish' },
    termsLede: { label: 'Shartlar', hint: 'Sahifa: /page/muddatli-tolov' },
    metaCatalogDesc: { label: 'Tavsif shabloni', hint: "{title} — sahifa nomi, {store} — do'kon nomi; ikkalasi o'z joyida qoladi" },
  },
  assets: {
    logo: { label: "Logo — yorug' fon uchun", hint: 'Shaffof PNG; header va kirish oynasida' },
    logoDark: { label: "Logo — qorong'i fon uchun", hint: "Shaffof PNG; qorong'i mavzu, bosh sahifa va vakansiyalar" },
    favicon: { label: 'Favicon', hint: 'Kvadrat PNG, kamida 512×512' },
    hero: { apple: heroAssets, pc: heroAssets, audio: heroAssets, video: heroAssets },
    consult: { image: { label: 'Rasm' } },
    about: {
      hero: { label: 'Hero foni', hint: "Huquqiy sahifalar hero'sida ham; qorong'i mavzuda ranglari teskari aylanadi" },
      experts: { label: 'Mutaxassislar fotosi' },
      delivery: { label: '«Doim yaqinda» fotosi' },
      news: { label: 'Yangiliklar rasmi', hint: 'Shaffof PNG' },
    },
    careers: {
      work: { label: "«ProDuct'da ishlash» fotosi" },
      life: { label: '«Jamoadagi hayot» foni', hint: "Qorong'i mavzuda ranglari teskari aylanadi" },
    },
  },
} as const;

export default site;
```
`src/admin/i18n/ru/site.ts`:
```ts
import type { Dict } from '../dict';
import type uz from '../uz/site';

const NEW_LINE = 'Enter — новая строка';
const TOPIC = 'Кнопка темы в форме консультации';
const MUTED = 'Выводится светлым цветом';
const VIDEO_HINT = 'Не в карточке на главной — крутится в обложке страницы направления; если видео нет, в обложке стоит изображение. MP4 до 40 МБ; рекомендуется до 10 секунд, 1080p, по возможности меньше 8 МБ (на телефоне страница тоже загружает видео целиком)';
const heroAssets = {
  image: { label: 'Изображение', hint: 'Карточка на главной и обложка страницы направления' },
  poster: { label: 'Постер видео', hint: 'Кадр, который виден, пока загружается видео' },
  video1: { label: 'Видео 1', hint: VIDEO_HINT },
  video2: { label: 'Видео 2', hint: VIDEO_HINT },
};

const site: Dict<typeof uz> = {
  sections: {
    heroApple: 'Карточка Apple', heroPc: 'Карточка PC', heroAudio: 'Карточка Audio', heroVideo: 'Карточка Video',
    services: 'Обещания сервиса', consult: 'Консультация', homeTitles: 'Заголовки',
    productPage: 'Страница товара', orderCookie: 'Заказ и cookie', logo: 'Логотип и favicon',
    contact: 'Адрес и время работы',
    aboutIntro: 'Вступление', aboutExperts: 'Специалисты', aboutWarranty: 'Гарантия и сервис', aboutBuy: 'Удобная покупка',
    aboutPersonal: 'Индивидуальный подход', aboutNear: 'Всегда рядом', aboutNews: 'Новости',
    careersSeo: 'Поисковые системы', careersHero: 'Hero и вступление', careersWork: 'Работа в ProDuct',
    careersLife: 'Жизнь в команде', careersWhy: 'Как у нас работается', careersRoles: 'Вакансии и отклик',
    images: 'Фотографии', legal: 'Подзаголовок', seo: 'Страницы каталога',
  },
  fields: {
    heroApple: { label: 'Название', hint: NEW_LINE },
    heroPc: { label: 'Название', hint: NEW_LINE },
    heroAudio: { label: 'Название', hint: NEW_LINE },
    heroVideo: { label: 'Название', hint: NEW_LINE },
    svcTitle: { label: 'Заголовок раздела' },
    svcPrompt: { label: 'Продолжение заголовка (светлым цветом)' },
    heroCtaPrimary: { label: 'Кнопка каталога', hint: 'Кнопка рядом с заголовком' },
    svcWarrantyCard: { label: 'Гарантия — заголовок' },
    svcWarrantyDesc: { label: 'Гарантия — текст' },
    svcDeliveryCard: { label: 'Доставка — заголовок' },
    svcDeliveryDesc: { label: 'Доставка — текст' },
    svcServiceCard: { label: 'Сервис — заголовок' },
    svcServiceDesc: { label: 'Сервис — текст' },
    consultTitle: { label: 'Заголовок' },
    consultLead: { label: 'Описание' },
    consultTopicApple: { label: 'Тема 1', hint: TOPIC },
    consultTopicPc: { label: 'Тема 2', hint: TOPIC },
    consultTopicAudio: { label: 'Тема 3', hint: TOPIC },
    consultTopicVideo: { label: 'Тема 4', hint: TOPIC },
    consultTopicService: { label: 'Тема 5', hint: TOPIC },
    consultTopicOther: { label: 'Тема 6', hint: TOPIC },
    consultDoneTitle: { label: 'После отправки — заголовок' },
    consultDoneText: { label: 'После отправки — текст' },
    proTitle: { label: 'Слоган', hint: 'Выводится на странице направления после названия: «PC — Профессиональный подход»' },
    newsTitle: { label: 'Раздел новостей' },
    homeBrands: { label: 'Лента брендов' },
    svcDeliveryTitle: { label: 'Доставка — название' },
    svcDeliveryFact: { label: 'Доставка — срок' },
    feature3: { label: 'Доставка — пояснение' },
    svcWarrantyTitle: { label: 'Гарантия — название' },
    svcWarrantyFact: { label: 'Гарантия — срок' },
    feature2: { label: 'Гарантия — пояснение' },
    trustShort: { label: 'Строка рассрочки', hint: 'Показывается, только когда включена рассрочка' },
    setupTitle: { label: 'Настройка Apple — заголовок', hint: 'Только на товарах Apple, в конце страницы' },
    setupText: { label: 'Настройка Apple — текст' },
    setupCta: { label: 'Настройка Apple — кнопка' },
    orderSuccessNote: { label: 'Сообщение после заказа', hint: 'Здесь обещание, когда вам перезвонят' },
    cookieText: { label: 'Уведомление о cookie' },
    cookieAccept: { label: 'Кнопка cookie' },
    footerAddressText1: { label: 'Адрес — строка 1', hint: 'Например: Узбекистан, город Ташкент,' },
    footerAddressText2: { label: 'Адрес — строка 2' },
    footerTime: { label: 'Время работы', hint: 'На сайте выглядит так: Пн–Вс, 10:00–21:00' },
    seoOpeningHours: { label: 'Время работы для Google', hint: 'Формат: Mo-Su 10:00-21:00 — одинаково на обоих языках' },
    aboutLede: { label: 'Подзаголовок hero', hint: 'Он же — описание в поисковых системах' },
    aboutWhyTitle: { label: 'Заголовок раздела' },
    aboutWhyMuted: { label: 'Продолжение заголовка', hint: MUTED },
    aboutExpertsLabel: { label: 'Метка' },
    aboutExpertsTitle: { label: 'Заголовок' },
    aboutExpertsText: { label: 'Текст' },
    aboutWarrantyTitle: { label: 'Заголовок' },
    aboutWarrantyText: { label: 'Текст' },
    aboutBuyTitle: { label: 'Заголовок' },
    aboutBuyText: { label: 'Текст' },
    aboutTradeInLink: { label: 'Ссылка на Trade-In' },
    aboutPersonalTitle: { label: 'Заголовок' },
    aboutPersonalText: { label: 'Текст' },
    aboutNearTitle: { label: 'Заголовок' },
    aboutNearText: { label: 'Текст' },
    aboutNewsTitle: { label: 'Заголовок' },
    aboutNewsText: { label: 'Текст' },
    aboutBlogLink: { label: 'Ссылка на блог' },
    careersMetaDesc: { label: 'Описание для поиска', hint: '{store} оставьте как есть — подставится название магазина' },
    careersHeroTitle: { label: 'Заголовок' },
    careersHeroCta: { label: 'Кнопка' },
    careersIntro: { label: 'Вступительный текст' },
    careersWorkEyebrow: { label: 'Метка' },
    careersWorkTitle: { label: 'Заголовок' },
    careersWorkText: { label: 'Текст' },
    careersWorkQuote: { label: 'Цитата' },
    careersQuoteBy: { label: 'Автор цитаты' },
    careersLifeEyebrow: { label: 'Метка' },
    careersLifeTitle: { label: 'Заголовок' },
    careersLifeText: { label: 'Текст' },
    careersLifeCard: { label: 'Текст на фото' },
    careersWhyTitle: { label: 'Заголовок' },
    careersWhyMuted: { label: 'Продолжение заголовка', hint: MUTED },
    careersWhyTechTitle: { label: 'Карточка 1 — заголовок' },
    careersWhyTechText: { label: 'Карточка 1 — текст' },
    careersWhyClientTitle: { label: 'Карточка 2 — заголовок' },
    careersWhyClientText: { label: 'Карточка 2 — текст' },
    careersWhyServiceTitle: { label: 'Карточка 3 — заголовок' },
    careersWhyServiceText: { label: 'Карточка 3 — текст' },
    careersWhyTeamTitle: { label: 'Карточка 4 — заголовок' },
    careersWhyTeamText: { label: 'Карточка 4 — текст' },
    careersRolesTitle: { label: 'Заголовок списка' },
    careersRolesEmpty: { label: 'Если вакансий нет' },
    careersDoneTitle: { label: 'После отклика — заголовок' },
    careersDoneText: { label: 'После отклика — текст' },
    legalLedeOferta: { label: 'Публичная оферта' },
    legalLedePrivacy: { label: 'Политика конфиденциальности' },
    legalLedeReturns: { label: 'Возврат и обмен' },
    termsLede: { label: 'Условия', hint: 'Страница: /page/muddatli-tolov' },
    metaCatalogDesc: { label: 'Шаблон описания', hint: '{title} — название страницы, {store} — название магазина; оставьте их как есть' },
  },
  assets: {
    logo: { label: 'Логотип — для светлого фона', hint: 'Прозрачный PNG; в шапке и окне входа' },
    logoDark: { label: 'Логотип — для тёмного фона', hint: 'Прозрачный PNG; тёмная тема, главная и вакансии' },
    favicon: { label: 'Favicon', hint: 'Квадратный PNG, не меньше 512×512' },
    hero: { apple: heroAssets, pc: heroAssets, audio: heroAssets, video: heroAssets },
    consult: { image: { label: 'Изображение' } },
    about: {
      hero: { label: 'Фон hero', hint: 'Также в hero юридических страниц; в тёмной теме цвета инвертируются' },
      experts: { label: 'Фото специалистов' },
      delivery: { label: 'Фото «Всегда рядом»' },
      news: { label: 'Изображение новостей', hint: 'Прозрачный PNG' },
    },
    careers: {
      work: { label: 'Фото «Работа в ProDuct»' },
      life: { label: 'Фон «Жизнь в команде»', hint: 'В тёмной теме цвета инвертируются' },
    },
  },
};

export default site;
```

- [ ] **Step 2: Registr — faqat tuzilma**

`src/lib/site-content.ts`:
1. `TextField` va `AssetField` dan `label` va `hint` ni olib tashlang, `section: string` → `section: SiteSection`; faylga `SiteSection` tipini (Interfaces'dagi ro'yxat) qo'shing. Fayl boshidagi izohga qo'shing: «Maydon nomlari, izohlar va karta sarlavhalari admin tarjimasida (`src/admin/i18n/*/site.ts`), bu yerda faqat tuzilma.»
2. Fabrika:
```ts
const inSection = (group: ContentGroup, section: SiteSection) =>
  (key: TextKey, kind: TextField['kind'] = 'text'): TextField => ({ key, group, section, kind });
```
3. `NEW_LINE`, `TOPIC`, `MUTED`, `VIDEO_HINT` konstantalari va `heroCard(name)` o'chadi. Bo'lim fabrikalari id bilan: `const heroApple = inSection('home', 'heroApple')` (xuddi shunday `heroPc`, `heroAudio`, `heroVideo`), `services` → `'services'`, `consult` → `'consult'`, `homeTitles` → `'homeTitles'`, `productPage` → `'productPage'`, `orderCookie` → `'orderCookie'`, `contact` → `'contact'`, `aboutIntro` … `aboutNews` → o'z nomi, `careersSeo` … `careersRoles` → o'z nomi, `legal` → `'legal'`, `seo` → `'seo'`.
4. `TEXT_FIELDS` qatorlari tartibi **o'zgarmaydi**, faqat nom/izoh argumentlari tushadi: `heroApple('heroApple', 'textarea')`, `services('svcTitle')`, `services('svcWarrantyDesc', 'textarea')`, `consult('consultLead', 'textarea')`, … (`'textarea'` bo'lganlar `'textarea'` bilan qoladi, `'text'` — argumentsiz).
5. `ASSET_FIELDS`:
```ts
const HERO_SECTION = { apple: 'heroApple', pc: 'heroPc', audio: 'heroAudio', video: 'heroVideo' } as const;

function heroAssetFields(id: 'apple' | 'pc' | 'audio' | 'video'): AssetField[] {
  const section = HERO_SECTION[id];
  return [
    { key: `hero.${id}.image`, group: 'home', section, kind: 'image' },
    { key: `hero.${id}.poster`, group: 'home', section, kind: 'image' },
    { key: `hero.${id}.video1`, group: 'home', section, kind: 'video' },
    { key: `hero.${id}.video2`, group: 'home', section, kind: 'video' },
  ];
}

export const ASSET_FIELDS: AssetField[] = [
  { key: 'logo', group: 'store', section: 'logo', kind: 'image' },
  { key: 'logoDark', group: 'store', section: 'logo', kind: 'image' },
  { key: 'favicon', group: 'store', section: 'logo', kind: 'image' },
  ...heroAssetFields('apple'),
  ...heroAssetFields('pc'),
  ...heroAssetFields('audio'),
  ...heroAssetFields('video'),
  { key: 'consult.image', group: 'home', section: 'consult', kind: 'image' },
  { key: 'about.hero', group: 'about', section: 'images', kind: 'image' },
  { key: 'about.experts', group: 'about', section: 'images', kind: 'image' },
  { key: 'about.delivery', group: 'about', section: 'images', kind: 'image' },
  { key: 'about.news', group: 'about', section: 'images', kind: 'image' },
  { key: 'careers.work', group: 'careers', section: 'images', kind: 'image' },
  { key: 'careers.life', group: 'careers', section: 'images', kind: 'image' },
];
```
Server (`app/routes/api.admin.texts.tsx`, `api.admin.assets.tsx`) o'zgarmaydi — u registr qatorlarini tarqatadi, endi ularda nom yo'q.

- [ ] **Step 3: Qamrov testi (failing)**

`src/admin/i18n/site.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { ASSET_FIELDS, TEXT_FIELDS } from '../../lib/site-content';
import { i18n } from './index';
import uzSite from './uz/site';

const has = (lng: string, key: string) => typeof i18n.getResource(lng, 'site', key) === 'string';

describe('sayt matnlari registri tarjimasi', () => {
  it('har matn maydoni ikkala tilda nomlangan', () => {
    for (const lng of ['uz', 'ru']) {
      expect(TEXT_FIELDS.filter((f) => !has(lng, `fields.${f.key}.label`)).map((f) => f.key)).toEqual([]);
    }
  });

  it('har rasm/video maydoni ikkala tilda nomlangan', () => {
    for (const lng of ['uz', 'ru']) {
      expect(ASSET_FIELDS.filter((f) => !has(lng, `assets.${f.key}.label`)).map((f) => f.key)).toEqual([]);
    }
  });

  it("resursda registrda yo'q maydon qolmagan", () => {
    const keys = new Set<string>(TEXT_FIELDS.map((f) => f.key));
    expect(Object.keys(uzSite.fields).filter((k) => !keys.has(k))).toEqual([]);
  });
});
```
Run: `bunx vitest run src/admin/i18n/site.test.ts`
Expected: Step 1–2 bajarilgan bo'lsa PASS; Step 1 dan oldin ishga tushirilsa — FAIL (`fields.* ` topilmaydi). Agar birinchi yozishda PASS bo'lsa, `uz/site.ts` dan bitta maydonni vaqtincha o'chirib FAIL ko'rganingizni tasdiqlang va qaytaring.

- [ ] **Step 4: `content-form` — bo'lim id bilan**

`src/admin/lib/content-form.ts`: `ContentSection` → `{ id: SiteSection; texts: TextFieldDef[]; assets: AssetField[] }` (`SiteSection` — `../../lib/site-content` dan import); `contentSections` ichida `sectionFor(title: string)` → `sectionFor(id: SiteSection)`, `s.title === title` → `s.id === id`, `{ title, texts: [], assets: [] }` → `{ id, texts: [], assets: [] }`. Izohdagi «("Rasmlar")» → «(`images`)».
`src/admin/lib/content-form.test.ts` — `contentSections` testidagi kutilgan qiymatlar:
```ts
    expect(s.map((x) => x.id)).toEqual(['heroApple', 'heroPc', 'heroAudio', 'heroVideo', 'services', 'consult', 'homeTitles']);
```
```ts
    expect(about[about.length - 1].id).toBe('images');
```
```ts
    expect(contentSections('legal', fields, ASSET_FIELDS, ['legalLedeOferta'])).toEqual([
      { id: 'legal', texts: [fields.find((f) => f.key === 'legalLedeOferta')], assets: [] },
    ]);
```
Run: `bunx vitest run src/admin/lib/content-form.test.ts` — Expected: PASS.

- [ ] **Step 5: `ContentFields` — nomlar tarjimadan**

`src/admin/ContentFields.tsx`:
- `const { t, i18n } = useTranslation(['site', 'content', 'common']);` — `ContentFields` va `AssetInput` ichida (hook komponent ichida).
- Karta sarlavhasi: `title={t(`sections.${s.id}`)}`, `key={s.id}`; `only?: SiteSection[]`, filtr `only.includes(s.id)`.
- Matn maydoni: `label={t(`fields.${f.key}.label` as ParseKeys<'site'>)}`, izoh faqat mavjud bo'lsa: `hint={i18n.exists(`site:fields.${f.key}.hint`) ? t(`fields.${f.key}.hint` as ParseKeys<'site'>) : undefined}` (`ParseKeys` — `import type { ParseKeys } from 'i18next'`; registr kaliti keng `TextKey` bo'lgani uchun keltirish kerak — qamrovni Step 3 testi kafolatlaydi).
- Rasm maydoni: `label={t(`assets.${field.key}.label`)}` (**keltirishsiz** — `AssetKey` birlashmasi to'liq tipli, biror asset nomsiz qolsa lint yiqiladi), izoh: `i18n.exists(`site:assets.${field.key}.hint`) ? t(`assets.${field.key}.hint` as ParseKeys<'site'>) : undefined`.
- Qolgan matnlar (`ruHint` «Bo'sh qolsa standart matn chiqadi», «Sayt matnlari yuklanmadi», `ContentPage` va `useSiteContent` xabarlari) — `content` namespace'iga, kalit `contentFields.*`.

`src/admin/screens/SettingsStore.tsx` — faqat ikki qator:
```tsx
            <ContentFields content={content} only={['logo']} />
            <ContentFields content={content} only={['productPage', 'orderCookie']} />
```

- [ ] **Step 6: Kontent ekranlari**

`ContentHome`, `Banners*`, `News*`, `Posts*`, `Pages*`, `Vacanc*`, `VacanciesText` — «Tarjima tartibi» bo'yicha, `content` namespace'iga; kalitning birinchi segmenti — fayl nomi camelCase'da (`bannersList.*`, `bannerEdit.*`, `vacanciesText.title` …). Butun admin'da takrorlanadigan so'zlar — `common:` dan. Inventarizatsiyadan:
- **Ichida havola bor gaplar** → `<Trans>`: `ContentHome.tsx:14–21` (uchta `<Link>` — `components={{ banners: <Link to="/admin/content/banners" className="press text-link" />, news: <Link … />, brands: <Link … /> }}`, resursda `<banners>Bannerlar</banners>` va h.k.); `VacanciesList.tsx:53–55` (bitta `<Link>` — `<link>…</link>`).
- **Sonli matn:** `PostsList.tsx:73` (ru: запись / записи / записей).
- **O'chirish tasdig'i nom bilan:** `NewsEdit.tsx:68`, `PostEdit.tsx:81`, `PageEdit.tsx:98`, `VacancyEdit.tsx:70` — `{{name}}`.
- `VacancyEdit.tsx` dagi eksport qilingan `EMPLOYMENT_LABEL` (`VacanciesList` ham ishlatadi) → `EMPLOYMENT_LABEL_KEY: Record<…, ParseKeys<'content'>>`, chizishda `t(...)`.
- `PagesList.tsx` `pageKind()` qaytaradigan «Biz haqimizda» / «Huquqiy» — UI yorlig'i, tarjima qilinadi; slug solishtiruvi (`ABOUT_SLUG`, `LEGAL_LEDE_KEYS` — `src/lib/page-slugs.ts`) — ma'lumot, tegilmaydi.
- **Tegilmaydi:** `VacanciesText.tsx` dagi `VACANCIES_TEXT_ID = 'matn'` (URL segmenti), `content-form.ts` `acceptLabel()` dagi `'fayl'` (chaqiruvchilar aniq ro'yxat beradi, bu shox ishlatilmaydi).

- [ ] **Step 7: Tekshiruv**

Run: `bun run lint && bun run test`
Expected: toza; hamma test PASS.
Run: `bun .superpowers/sdd/2026-09-24-admin-rus-tili/scan.ts src/admin/ContentFields.tsx src/admin/lib/content-form.ts src/admin/screens/ContentHome.tsx src/admin/screens/Banner* src/admin/screens/News* src/admin/screens/Post* src/admin/screens/Page* src/admin/screens/Vacanc*`
Expected: `UZ` qatori yo'q.
Run: `grep -nE "label: '|hint: '|section: '[A-Z]" src/lib/site-content.ts` — Expected: bo'sh (registrda odam matni qolmagan).

- [ ] **Step 8: Commit**

```bash
git add src/lib/site-content.ts src/admin/i18n src/admin/lib/content-form.ts src/admin/lib/content-form.test.ts src/admin/ContentFields.tsx src/admin/screens/ContentHome.tsx src/admin/screens/BannersList.tsx src/admin/screens/BannerEdit.tsx src/admin/screens/NewsList.tsx src/admin/screens/NewsEdit.tsx src/admin/screens/PostsList.tsx src/admin/screens/PostEdit.tsx src/admin/screens/PagesList.tsx src/admin/screens/PageEdit.tsx src/admin/screens/VacanciesList.tsx src/admin/screens/VacancyEdit.tsx src/admin/screens/VacanciesText.tsx src/admin/screens/SettingsStore.tsx
git commit -m "feat(admin): Kontent bo'limi va sayt matnlari registri rus tilida

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: `settings` — Sozlamalar va Billz holati

**Files:**
- Modify: `src/admin/i18n/{uz,ru}/settings.ts`
- Modify: `src/admin/lib/billz-status.ts`, `src/admin/lib/billz-status.test.ts`
- Modify: `src/admin/screens/SettingsStore.tsx`, `SettingsContact.tsx`, `SettingsPayment.tsx`, `SettingsIntegrations.tsx`, `SettingsSeo.tsx`, `SettingsAccount.tsx`, `src/admin/useSiteConfig.ts`
- Modify (faqat Billz holati qatori): `src/admin/screens/Dashboard.tsx`

**Interfaces:**
- Consumes: Task 1 (`settings:account.language`, `LangSwitch`), Task 2 (`common:`, `formatSum(n, sum)`), Task 5 (`ContentFields` `only?: SiteSection[]`).
- Produces: `billzStatusText(s: BillzSyncStatus | null, t: TFunction<'settings'>): { text: string; error: boolean }`.

- [ ] **Step 1: Failing test**

`src/admin/lib/billz-status.test.ts` — `import { i18n } from '../i18n';`, fayl boshida:
```ts
const tUz = i18n.getFixedT('uz', 'settings');
const tRu = i18n.getFixedT('ru', 'settings');
```
Mavjud har `billzStatusText(x)` → `billzStatusText(x, tUz)` (kutilgan o'zbekcha matnlar o'zgarmaydi). Yangi blok:
```ts
  it('ruscha', () => {
    const text = billzStatusText(ok(), tRu).text;
    expect(text).toContain('Из Billz получено 1596 товаров');
    expect(text).toContain('обновлено — 1198');
    expect(text).toContain('скрыто с сайта — 398');
    expect(text).not.toContain('новых');
    expect(billzStatusText(ok({ count: 21, inserted: 0, updated: 0, hidden: 0 }), tRu).text).toContain('Из Billz получен 21 товар, изменений нет');
    expect(billzStatusText({ configured: true, running: true, last: null }, tRu).text).toBe('Идёт обновление…');
  });
```
Run: `bunx vitest run src/admin/lib/billz-status.test.ts` — Expected: FAIL.

- [ ] **Step 2: Resurslar — Billz holati (to'liq matn)**

`src/admin/i18n/uz/settings.ts` ga:
```ts
  billz: {
    loading: 'Holat yuklanmoqda…',
    notConfigured: "Billz ulanmagan. Integratsiyalar bo'limida kalit va do'konni saqlang.",
    running: 'Hozir yangilanmoqda…',
    never: 'Hali bir marta ham yangilanmagan.',
    failed: '{{when}} da urinish xato bilan tugadi: {{error}}',
    read_one: "Billz'dan {{count}} ta tovar o'qildi",
    read_few: "Billz'dan {{count}} ta tovar o'qildi",
    read_many: "Billz'dan {{count}} ta tovar o'qildi",
    read_other: "Billz'dan {{count}} ta tovar o'qildi",
    inserted: "{{count}} tasi yangi qo'shildi",
    updated: "{{count}} tasining ma'lumoti yangilandi",
    hidden: '{{count}} tasi saytdan yashirildi',
    noChanges: "o'zgarish bo'lmadi",
    done: '{{when}} da yangilandi. {{list}}.',
  },
```
`src/admin/i18n/ru/settings.ts` ga:
```ts
  billz: {
    loading: 'Загрузка статуса…',
    notConfigured: 'Billz не подключён. Сохраните ключ и магазин в разделе «Интеграции».',
    running: 'Идёт обновление…',
    never: 'Ещё ни разу не обновлялось.',
    failed: '{{when}} попытка завершилась ошибкой: {{error}}',
    read_one: 'Из Billz получен {{count}} товар',
    read_few: 'Из Billz получено {{count}} товара',
    read_many: 'Из Billz получено {{count}} товаров',
    read_other: 'Из Billz получено {{count}} товара',
    inserted: 'новых — {{count}}',
    updated: 'обновлено — {{count}}',
    hidden: 'скрыто с сайта — {{count}}',
    noChanges: 'изменений нет',
    done: 'Обновлено {{when}}. {{list}}.',
  },
```

- [ ] **Step 3: `billz-status.ts`**

```ts
import type { TFunction } from 'i18next';
```
```ts
export function billzStatusText(s: BillzSyncStatus | null, t: TFunction<'settings'>): { text: string; error: boolean } {
  if (!s) return { text: t('billz.loading'), error: false };
  if (!s.configured) return { text: t('billz.notConfigured'), error: true };
  if (s.running) return { text: t('billz.running'), error: false };
  const last = s.last;
  if (!last) return { text: t('billz.never'), error: false };

  // Soniyasiz: egasiga aniq lahza emas, qachonligi kerak.
  const when = new Date(last.at).toLocaleString('ru-RU', {
    timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  if (!last.ok) {
    return { text: t('billz.failed', { when, error: errText(new Error(last.error ?? 'network')) }), error: true };
  }
  const parts = [t('billz.read', { count: last.count })];
  if (last.inserted > 0) parts.push(t('billz.inserted', { count: last.inserted }));
  if (last.updated > 0) parts.push(t('billz.updated', { count: last.updated }));
  if (last.hidden > 0) parts.push(t('billz.hidden', { count: last.hidden }));
  if (parts.length === 1) parts.push(t('billz.noChanges'));
  return { text: t('billz.done', { when, list: parts.join(', ') }), error: false };
}
```
Chaqiruvchilar: `SettingsIntegrations` — `billzStatusText(status, t)` (ekranning `settings` `t` i); `Dashboard` — `const { t: tSettings } = useTranslation('settings');` va `billzStatusText(data.billz, tSettings)` (ikki joyda).
Run: `bunx vitest run src/admin/lib/billz-status.test.ts` — Expected: PASS.

- [ ] **Step 4: Sozlamalar ekranlari**

«Tarjima tartibi» bo'yicha, `settings` namespace'iga (inventarizatsiya: Integrations ~48, Payment ~28, Account ~20, Contact ~18, Store ~14, SEO ~11). `SettingsStore`: `MODES` massivi — `id` (`cash`/`both`/`installment`) ma'lumot, `label` → `labelKey`. `SettingsPayment`: `settings.terms.map((t, i) =>` va `prev.terms.map((t, j) =>` → `term`; «Oylik to'lov namunasi … narxli mahsulot uchun.» → `t('payment.sampleNote', { price: formatSum(SAMPLE, t('common:sum')) })`; `` `${formatSum(...)}/oy` `` → `t('payment.perMonth', { sum: formatSum(…, t('common:sum')) })` (ru `'{{sum}}/мес.'`); MB kursi qatori — `t('payment.cbRate', { rate: formatSum(x, t('common:sum')), date })`. Task 2 qo'ygan `const sum = useTranslation('common').t('sum')` ni ekranning o'z `t` i bilan almashtiring. `SettingsIntegrations`: MCP tokenlari bloki (`tokens.map((t) =>` → `token`), sirli maydonlar, Billz kartasi. `SettingsAccount`: «Ko'rinish» kartasi va `SwitchRow` «Qorong'i mavzu» — `settings:account.appearance`, `account.darkTheme`, `account.darkThemeHint`. `useSiteConfig.ts`: bitta umumiy xato satri (hook — `useTranslation` shu yerda ishlaydi).

- [ ] **Step 5: Tekshiruv**

Run: `bun run lint && bun run test` — Expected: toza, PASS.
Run: `bun .superpowers/sdd/2026-09-24-admin-rus-tili/scan.ts src/admin/screens/SettingsStore.tsx src/admin/screens/SettingsContact.tsx src/admin/screens/SettingsPayment.tsx src/admin/screens/SettingsIntegrations.tsx src/admin/screens/SettingsSeo.tsx src/admin/screens/SettingsAccount.tsx src/admin/useSiteConfig.ts src/admin/lib/billz-status.ts src/admin/screens/Dashboard.tsx`
Expected: `UZ` qatori yo'q.

- [ ] **Step 6: Commit**

```bash
git add src/admin/i18n/uz/settings.ts src/admin/i18n/ru/settings.ts src/admin/i18n/uz/common.ts src/admin/i18n/ru/common.ts src/admin/lib/billz-status.ts src/admin/lib/billz-status.test.ts src/admin/screens/SettingsStore.tsx src/admin/screens/SettingsContact.tsx src/admin/screens/SettingsPayment.tsx src/admin/screens/SettingsIntegrations.tsx src/admin/screens/SettingsSeo.tsx src/admin/screens/SettingsAccount.tsx src/admin/useSiteConfig.ts src/admin/screens/Dashboard.tsx
git commit -m "feat(admin): Sozlamalar bo'limi va Billz holati rus tilida

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: `errors` — server xato kodlari

**Files:**
- Modify: `shared/err-text.ts` (o'zbekcha xaritani eksport qilish)
- Modify: `src/admin/i18n/uz/errors.ts`, `src/admin/i18n/ru/errors.ts`, `src/admin/i18n/{uz,ru}/common.ts` (`errorGeneric`)
- Modify: `src/admin/errText.ts`
- Create: `src/admin/errText.test.ts`

**Interfaces:**
- Consumes: Task 1 — `i18n`, `Dict`.
- Produces: `shared/err-text.ts`: `export const ERR_MESSAGES` (`as const`, 74 kod); `errText(e)` (shared) xulqi o'zgarmaydi. `src/admin/errText.ts`: `errText(e: unknown): string` — imzo o'zgarmaydi, matn joriy admin tilida.

- [ ] **Step 1: Failing test**

`src/admin/errText.test.ts`:
```ts
import { afterEach, describe, expect, it } from 'vitest';
import { errText } from './errText';
import { i18n } from './i18n';

describe('errText', () => {
  afterEach(async () => {
    await i18n.changeLanguage('uz');
  });

  it("ma'lum kod — joriy admin tilida", async () => {
    expect(errText(new Error('slug_required'))).toBe('Slug majburiy');
    await i18n.changeLanguage('ru');
    expect(errText(new Error('slug_required'))).toBe('Укажите slug');
  });

  it("noma'lum kod — kodning o'zi, kodsiz — umumiy xato", async () => {
    expect(errText(new Error('weird_code'))).toBe('weird_code');
    expect(errText('not an error')).toBe('Xatolik yuz berdi');
    await i18n.changeLanguage('ru');
    expect(errText(null)).toBe('Произошла ошибка');
  });
});
```
Run: `bunx vitest run src/admin/errText.test.ts`
Expected: FAIL — ruscha matn chiqmaydi (hozirgi `errText` doim o'zbekcha).

- [ ] **Step 2: `shared/err-text.ts` — xaritani eksport qilish**

`const MESSAGES: Record<string, string> = {` → `export const ERR_MESSAGES = {`, yopilishi `} as const;`, undan keyin:
```ts
/** Qidiruv uchun keng tip: server istalgan kod qaytarishi mumkin. */
const MESSAGES: Record<string, string> = ERR_MESSAGES;
```
`errText` (shared) o'zgarmaydi. **Fayl Node'da type-stripping bilan ishlaydi** (`shared/mcp-client.ts` → `server/mcp.ts`): yangi import qo'shmang; `as const` — o'chiriladigan sintaksis, muammo emas. Tekshiruv — `bun run lint` boshidagi `node --experimental-strip-types` qadami.

- [ ] **Step 3: Resurslar**

`src/admin/i18n/uz/errors.ts`:
```ts
/** Server xato kodlari. Manba — `shared/err-text.ts` (MCP ham shu o'zbekcha xaritani o'qiydi), bu yerda qayta yozilmaydi. */
import { ERR_MESSAGES } from '../../../../shared/err-text';

export default ERR_MESSAGES;
```
`src/admin/i18n/ru/errors.ts` — 74 kodning hammasi, `Dict<typeof uz>` tipida (tushib qolgan kod lint'ni yiqitadi). Test kutgan qiymat: `slug_required: 'Укажите slug'`. Qolganini lug'at bo'yicha tarjima qiling; naqshlar: «X majburiy» → «Укажите X» / «Нужно X»; «… bo'lishi kerak» → «… должен быть …»; «topilmadi» → «не найден(о)»; «… bilan boshlanishi kerak» → «… должна начинаться с …». Kod nomlari, yo'llar (`/`, `https://`) va texnik so'zlar (slug, URL, PNG) o'zgarmaydi.
`common` ga: uz `errorGeneric: 'Xatolik yuz berdi'`, ru `errorGeneric: 'Произошла ошибка'`.

- [ ] **Step 4: Admin `errText` — i18next orqali**

`src/admin/errText.ts`:
```ts
import { i18n } from './i18n';
import type uzErrors from './i18n/uz/errors';

/**
 * Server xato kodi → joriy admin tilidagi matn (`errors` namespace). Noma'lum kod — kodning o'zi, kodsiz — umumiy
 * xato. Imzo o'zgarmagan: ~40 chaqiruvchi (asosan event handler'lar) chaqirilgan paytdagi tilni oladi.
 * MCP klienti o'zbekcha `shared/err-text.ts` ni o'qishda davom etadi.
 */
export function errText(e: unknown): string {
  const code = e instanceof Error ? e.message : '';
  if (code && i18n.exists(code, { ns: 'errors' })) return i18n.t(code as keyof typeof uzErrors, { ns: 'errors' });
  return code || i18n.t('common:errorGeneric');
}
```

- [ ] **Step 5: Tekshiruv**

Run: `bun run lint && bun run test`
Expected: toza; `errText.test.ts` va `billz-status.test.ts` (o'zbekcha `kalitni tekshiring` kutadi) PASS.

- [ ] **Step 6: Commit**

```bash
git add shared/err-text.ts src/admin/i18n/uz/errors.ts src/admin/i18n/ru/errors.ts src/admin/i18n/uz/common.ts src/admin/i18n/ru/common.ts src/admin/errText.ts src/admin/errText.test.ts
git commit -m "feat(admin): server xatolari rus tilida

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Yakun — qoldiqlar, ikki tilda ko'rik, bundle, hujjat

**Files:**
- Modify: topilgan qoldiqlar (qaysi fayl bo'lsa), `CLAUDE.md`

**Interfaces:**
- Consumes: 1–7-bosqichlarning hammasi.

- [ ] **Step 1: Qoldiq skaneri — butun admin**

Run: `bun .superpowers/sdd/2026-09-24-admin-rus-tili/scan.ts src/admin`
Expected: `UZ` qatori **yo'q**. Har `?` qatorini ko'rib chiqing: odam o'qiydigan matn bo'lsa — tegishli namespace'ga ko'chiring; ma'lumot yoki texnik so'z bo'lsa (masalan `lib/models.ts` spec nomlari, variant o'qi nomlari) — qoldiring va hisobotda fayl:qator + sababini yozing.

- [ ] **Step 2: Bundle — storefront i18next'ni yuklamaydi**

```bash
bun run build
for f in $(grep -l "i18next" build/client/assets/*.js); do echo "== $f"; grep -l "$(basename "$f")" build/client/assets/*.js; done
```
Expected: `i18next` bo'lgan chunk'larni faqat admin route chunk'i (nomida `admin`) import qiladi; `manifest-*.js` ning ro'yxatda chiqishi normal (u hamma route'larni sanaydi). `root`, `store`, `home`, `category`, `product` kabi storefront chunk'lari ro'yxatda **yo'q**. Aks holda — qaysi storefront fayli `src/admin/i18n` ni import qilayotganini toping va uzing. `build/` commit qilinmaydi.

- [ ] **Step 3: Brauzer — ikkala tilda** (**controller bajaradi, implementer emas**; dev server: `.claude/launch.json` → `dev`; admin'ga egasi preview panelida o'zi kiradi, parol kiritilmaydi)

Desktop (≥1024px) va telefon (375px), avval `RU`, keyin `UZ`:
- har bo'lim va tab: Bosh sahifa, Mahsulotlar (ro'yxat, tahrir, Turlar, Kategoriyalar, Brendlar, Modellar), Buyurtmalar (ro'yxat, tafsilot, Ish arizalari, E'lonlar), Kontent (Bosh sahifa, Bannerlar, Yangiliklar, Blog, Sahifalar, Vakansiyalar + sahifa matni), Sozlamalar (6 tab), kirish sahifasi (chiqib-kirib);
- o'zbekcha qoldiq yo'q; ruscha nomlar 240px sidebar'ga, mobil tab bar'ga (5 × 75px), tugma va segmentlarga sig'adi — qator buzilmaydi, matn ikki qatorga tushmaydi;
- `RU` tanlangach sahifani yangilash — til saqlanadi, `<html lang="ru">`; kirish sahifasi ruscha;
- qorong'i mavzu + `RU` birga;
- tasdiqlash oynasi (saqlanmagan formadan chiqish), toast (saqlash), server xatosi (masalan bo'sh majburiy maydon bilan saqlash) — ruscha.
Topilganini shu bosqichda tuzating; ruscha nom sig'masa — lug'at ruhidagi qisqaroq sinonim (dizayn o'zgarmaydi).

- [ ] **Step 4: CLAUDE.md**

Admin bo'limidagi «Admin UI is Uzbek-only» / «Admin panel (… Uzbek-only)» iboralarini almashtiring va Admin bo'limiga qisqa paragraf qo'shing:
«**Admin tili (2026-09-24, mijoz feedbacki; spec `docs/superpowers/specs/2026-09-24-admin-rus-tili-design.md`):** i18next + react-i18next, faqat admin'da (`src/admin/i18n`). 8 namespace (`common`, `shell`, `products`, `orders`, `content`, `site`, `settings`, `errors`), `uz/*.ts` — manba (`as const`), `ru/*.ts` — `Dict<typeof uz>`: kalit tushib qolsa lint yiqiladi, `strictKeyChecks` noma'lum kalitni ushlaydi. **Yangi matn = ikkala faylga kalit**; komponentda `useTranslation(ns)` + `t('ekran.kalit')`, matn ichida havola — `<Trans t={t} components={{ link: … }} />`. Ruscha shakl o'zgaradigan sonli matn — `_one/_few/_many/_other` (o'zbekchada bir xil), qolgani `{{count}}` interpolatsiya. Sof yordamchilar `t` ni parametr oladi; `formatSum(n, t('common:sum'))`; `errText(e)` global instansiyadan (MCP o'zbekcha `shared/err-text.ts` ni o'qiydi, admin'ning o'zbekcha xatolari ham shu xarita). Sayt matnlari registrida odam matni yo'q — nom/izoh/karta sarlavhasi `site` namespace'ida (`site.test.ts` qamrovni tekshiradi). Til `localStorage.adminLang` (sukut `uz`, brauzer tili aniqlanmaydi), almashtirgich — sidebar pastida `UZ | RU` va Akkaunt → Ko'rinish; server va gidratatsiya o'zbekcha, `restoreAdminLang()` birinchi effektda almashtiradi. Tarjima qilinmaydi: bazaga yoziladigan matn (spec nomlari, variant o'qlari), Telegram, MCP, sayt.»

- [ ] **Step 5: To'liq tekshiruv va commit**

Run: `bun run lint && bun run test`
Expected: toza, hamma test PASS.
```bash
git add CLAUDE.md <tuzatilgan fayllar nomma-nom>
git commit -m "docs(admin): rus tili — yakuniy ko'rik va CLAUDE.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
