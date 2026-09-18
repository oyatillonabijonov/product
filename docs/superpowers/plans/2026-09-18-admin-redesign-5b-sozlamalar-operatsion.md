# Admin qayta qurilishi — 5b-bosqich (Sozlamalar: To'lov, Integratsiyalar, Akkaunt) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sozlamalar bo'limining qolgan uchta tabini kit bilan qurish — **To'lov va kurs** (boshlang'ich to'lov, muddatlar, dollar kursi), **Integratsiyalar** (Billz, Telegram bot, mijoz kirishi, analitika — hammasi bir joyda) va **Akkaunt** (login/parol, Google bilan kirish). Shu bilan admin panelning oxirgi eski ekranlari (`SettingsForm`, `SiteConfigForm`, `BillzPanel`, `AccountForm`) o'chadi.

**Architecture:** To'lov tabi `GET/PUT /api/admin/settings` bilan ishlaydi; oylik to'lov namunasi biznes yadrosidan (`src/lib/installment.ts`) olinadi — formula admin'da takrorlanmaydi, yadroga kichik `monthlyPayment` primitivi chiqariladi va `calcInstallment` ham o'shani ishlatadi. Integratsiyalar va Akkaunt tablari 5a'dagi `useSiteConfig` hook'i va mavjud `api.ts` funksiyalari ustida quriladi; Billz holati va "Sinxronlash" tugmasi kalit va do'kon tanlash bilan bitta kartada.

**Tech Stack:** React Router v7 admin SPA, `src/admin/ui` kit, lucide-react, vitest.

**Spec:** `docs/superpowers/specs/2026-09-15-admin-redesign-design.md` (§4 forma qoidalari, §5 Sozlamalar, §9 test). Oldingi bosqich: `docs/superpowers/plans/2026-09-18-admin-redesign-5a-sozlamalar-sayt.md`.

## Global Constraints

- **Migratsiya yo'q, yangi server endpoint yo'q.** Mavjud `GET/PUT /api/admin/settings`, `GET/PUT /api/admin/site-config`, `GET/POST /api/admin/billz`, `GET/POST /api/admin/account` ishlatiladi; validatorlar o'zgarmaydi.
- **Sirlar ekranda `type="password"` bilan chiziladi** (bot tokeni, Google secret, Billz kaliti) va hech qachon log'ga chiqmaydi; `publicSiteConfig` qoidasi o'zgarmaydi.
- **`useSiteConfig` qoidasi (5a):** ekran ko'rsatmagan maydonlar qoralamada saqlanib, `PUT`da qaytariladi.
- **Forma qoidalari (spec §4):** kit (`src/admin/ui`); bitta "Saqlash" sahifa sarlavhasida, o'zgarish bo'lmaguncha o'chiq; toast `Saqlandi · saytda 1–5 daqiqada ko'rinadi`; xato toast'da (`errText`); bo'sh holat `EmptyState`, yuklanish `Skeleton`; `window.confirm` yo'q.
- **Admin'da `bg-white` / `text-white` yozilmaydi** (kitdagi `Button` ichidagi mavjud `text-white` bundan mustasno).
- **TS:** strict, `any` yo'q. `@types/react` yo'q: holat `useState(x as T)` bilan olinadi va o'qishda cast qilinadi; hook chaqiruvida generik yozilmaydi; `key` faqat native element yoki `FC<{…}>`da.
- **Dizayn tokenlari:** hex yo'q (ruxsat etilgan literal — `#25D366` va `white`); `text-[Npx]` yo'q; `shadow-*` yo'q; bosiladigan elementda `press`.
- **Biznes yadrosi:** `src/lib/installment.ts` formulasi o'zgarmaydi — faqat mavjud hisob kichik funksiyaga ajratiladi va ikkala chaqiruvchi o'shani ishlatadi.
- **Buyruqlar:** `bun`/`bunx`, npm emas. Har task oxirida `bun run lint && bun run test` yashil.
- **Rollar:** implementer subagent chaqirmaydi, dev server ishga tushirmaydi va brauzer tekshiruvini qilmaydi. "Brauzer" qadamlari — **controller**niki. Sinov qiymatlari qadam oxirida qaytariladi; **Billz "Sinxronlash" tugmasi bosilmaydi** (haqiqiy tashqi so'rov).
- **Commit trailer:** `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Rejadagi qarorlar (spec'dan farqlar)

1. **Oylik namunasi yadrodan:** eski `SettingsForm` formulani o'zida takrorlagan edi; endi `src/lib/installment.ts`ga `monthlyPayment(cashUzs, term, downPaymentUzs)` chiqariladi va `calcInstallment` ham shuni chaqiradi — takror yo'qoladi, qiymat o'zgarmaydi.
2. **Billz bitta kartada:** kalit, do'kon tanlash, holat va "Sinxronlash" — spec §5 talabi ("bir joyda"). Kalit saqlanmaguncha do'konlar ro'yxati yuklanmaydi (server kalitni bazadan o'qiydi) — izohda yozilgan.
3. **Akkaunt ekrani standart parol ogohlantirishini o'zi chizadi** (hozir `AdminApp`da) — `defaultPw` va `onPasswordChanged` prop bo'lib o'tadi, `AdminApp`dagi banner olib tashlanadi.
4. **"Saqlash" Akkauntda ham sarlavhada:** joriy parol majburiy, shusiz tugma o'chiq; parol maydonlari saqlangach tozalanadi.
5. **Dollar kursi kartasi:** ustama kiritilgan bo'lsa qo'lda kurs maydoni o'rniga hisoblangan do'kon kursi ko'rsatiladi (eski forma mantig'i), MB kursi va sanasi ostida.

6. **5a'dan kelgan eslatmalar (bu bosqichda tuzatilmaydi):** `useSiteConfig`dagi `dirty` bayrog'i asl qiymat bilan qayta solishtirilmaydi (matn qaytarilsa ham "Saqlash" yoniq qoladi) va saqlashda faqat tegilgan kalitlar birlashtirilmaydi (ikki tabda parallel tahrirda oxirgi saqlash butun qatorni yozadi) — ikkalasi 6-bosqichga qoldirildi; bu bosqich `useSiteConfig`ning o'zini o'zgartirmaydi, faqat ishlatadi.

## Fayl tuzilmasi

- **T1:** `src/lib/installment.ts` (+ mavjud `installment.test.ts`ga 2 test), `src/admin/screens/SettingsPayment.tsx` (yangi), `nav.ts`, `AdminApp.tsx`; o'chadi `src/admin/SettingsForm.tsx`.
- **T2:** `src/admin/screens/SettingsIntegrations.tsx` (yangi), `nav.ts`, `AdminApp.tsx`; o'chadi `src/admin/SiteConfigForm.tsx`, `src/admin/BillzPanel.tsx`.
- **T3:** `src/admin/screens/SettingsAccount.tsx` (yangi), `nav.ts`, `AdminApp.tsx`, `CLAUDE.md`, spec; o'chadi `src/admin/AccountForm.tsx`.

## Brauzer tekshiruvi yordamchilari (controller uchun)

```js
function setVal(el, value) {
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}
const card = (title) => [...document.querySelectorAll('section')].find((s) => s.querySelector('h2')?.textContent === title);
const labelInput = (label) => [...document.querySelectorAll('label')].find((l) => l.querySelector('span')?.firstChild?.textContent === label)?.querySelector('input');
```

---

### Task 1: "To'lov va kurs" tabi va oylik namunasining yadrodan olinishi

**Files:**
- Modify: `src/lib/installment.ts`
- Test: `src/lib/installment.test.ts`
- Create: `src/admin/screens/SettingsPayment.tsx`
- Modify: `src/admin/nav.ts`
- Modify: `src/admin/AdminApp.tsx`
- Delete: `src/admin/SettingsForm.tsx`

**Interfaces:**
- Consumes: `getSettings`/`updateSettings` (`api.ts`, mavjud), `ApiSettings`/`Term` (`shared/types.ts`), `storeRate` (`shared/usd-rate.ts`), `formatSum` (`src/admin/lib/format.ts`), `SectionTabs`, kit.
- Produces: `monthlyPayment(cashUzs: number, term: Term, downPaymentUzs: number): number` (`src/lib/installment.ts`); `SettingsPayment` (default eksport); Sozlamalarda `payment` tabi `ownPage: true`.

- [ ] **Step 1: Failing test — `src/lib/installment.test.ts` oxiriga**

```ts
describe('monthlyPayment', () => {
  it("ustama qo'shilgan jamidan boshlang'ichni ayirib, oyga bo'ladi", () => {
    expect(monthlyPayment(10_000_000, { months: 10, markup: 0.2 }, 2_000_000)).toBe(1_000_000);
  });
  it("boshlang'ich jamidan katta bo'lsa 0", () => {
    expect(monthlyPayment(1_000_000, { months: 6, markup: 0 }, 2_000_000)).toBe(0);
  });
});
```

Fayl boshidagi import qatoriga `monthlyPayment` qo'shing (mavjud `import { calcInstallment, … } from './installment';` ro'yxatiga, alifbo tartibida).

- [ ] **Step 2: Test yiqilishini ko'rish**

Run: `bunx vitest run src/lib/installment.test.ts`
Expected: FAIL — `monthlyPayment is not a function` (yoki eksport topilmadi).

- [ ] **Step 3: `src/lib/installment.ts` — primitivni ajratish**

`calcInstallment` ta'rifidan **oldin** qo'shing:

```ts
/**
 * Oylik to'lov: `jami = naqd × (1 + ustama)`, `oylik = (jami − boshlang'ich) / oy`.
 * Biznes yadrosi — `calcInstallment` ham, admin'dagi namuna hisobi ham shu funksiyani chaqiradi.
 */
export function monthlyPayment(cashUzs: number, term: Term, downPaymentUzs: number): number {
  return Math.max(0, (cashUzs * (1 + term.markup) - downPaymentUzs) / term.months);
}
```

`calcInstallment` tanasidagi oxirgi ikki qatorni almashtiring. Eski:

```ts
  const monthly = Math.max(0, (total - down) / term.months);
  return { total, downPaymentUzs: down, monthly };
```

Yangi:

```ts
  return { total, downPaymentUzs: down, monthly: monthlyPayment(product.cashPriceUzs, term, down) };
```

- [ ] **Step 4: Testni o'tkazish**

Run: `bunx vitest run src/lib/installment.test.ts`
Expected: PASS (13 test — mavjud 11 + yangi 2).

- [ ] **Step 5: `src/admin/screens/SettingsPayment.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { X } from 'lucide-react';
import type { ApiSettings, Term } from '../../../shared/types';
import { storeRate } from '../../../shared/usd-rate';
import { monthlyPayment } from '../../lib/installment';
import { getSettings, updateSettings } from '../api';
import { errText } from '../errText';
import { formatSum } from '../lib/format';
import SectionTabs from '../SectionTabs';
import { Button, Card, EmptyState, Field, Input, Page, Skeleton } from '../ui';
import { useToast } from '../ui/toast';

/** Namuna narx — muddat qatorida oylik to'lov qanday chiqishini ko'rsatadi. */
const SAMPLE = 10_000_000;

/** Sozlamalar → To'lov va kurs: boshlang'ich to'lov, muddatlar va ustama, dollar kursi. */
const SettingsPayment: FC = () => {
  const toast = useToast();
  const [rawSettings, setSettings] = useState(null as ApiSettings | null);
  const settings = rawSettings as ApiSettings | null;
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getSettings().then(setSettings).catch(() => setError("Sahifani yangilab qayta urinib ko'ring"));
  }, []);

  const patch = (fn: (prev: ApiSettings) => ApiSettings) => {
    setSettings((prev: ApiSettings | null) => (prev ? fn(prev) : prev));
    setDirty(true);
  };
  const setTerm = (i: number, key: keyof Term, value: number) =>
    patch((prev) => ({ ...prev, terms: prev.terms.map((t, j) => (j === i ? { ...t, [key]: value } : t)) }));

  async function save() {
    if (!settings) return;
    setBusy(true);
    try {
      // Kursni server hisoblaydi (ustama kiritilgan bo'lsa) — formaga saqlangan holat qaytadi.
      setSettings(await updateSettings(settings));
      setDirty(false);
      toast("Saqlandi · saytda 1–5 daqiqada ko'rinadi");
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  const canSave = dirty && !busy && (settings?.terms.length ?? 0) > 0;

  return (
    <Page
      title="To'lov va kurs"
      description="Muddatli to'lov kalkulyatori va Billz narxlari uchun dollar kursi."
      dirty={dirty as boolean}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>}
    >
      <SectionTabs section="settings" active="payment" />
      {error ? <EmptyState title="Sozlamalar yuklanmadi" text={error} />
        : !settings ? <Skeleton rows={8} />
        : (
          <div className="flex flex-col gap-4">
            <Card title="Boshlang'ich to'lov" description="Mahsulot sahifasidagi slayder shu oraliqda suriladi.">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Eng kam (%)" hint="Sukut bo'yicha shu foiz hisoblanadi">
                  <Input type="number" value={String(settings.downPaymentPercent)} onChange={(v) => patch((p) => ({ ...p, downPaymentPercent: Number(v) || 0 }))} />
                </Field>
                <Field label="Eng ko'p (%)" hint="Eng kamdan katta va 100 dan kichik bo'lsin">
                  <Input type="number" value={String(settings.downPaymentMaxPercent)} onChange={(v) => patch((p) => ({ ...p, downPaymentMaxPercent: Number(v) || 0 }))} />
                </Field>
              </div>
            </Card>

            <Card title="Muddatlar va ustama" description={`Oylik to'lov namunasi ${formatSum(SAMPLE)} narxli mahsulot uchun.`}>
              <div className="flex flex-col gap-3">
                {settings.terms.map((t, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-para text-muted">
                      <span className="w-14">Muddat</span>
                      <span className="w-24"><Input type="number" value={String(t.months)} onChange={(v) => setTerm(i, 'months', Number(v) || 0)} /></span>
                      oy
                    </label>
                    <label className="flex items-center gap-2 text-para text-muted">
                      <span className="w-14">Ustama</span>
                      <span className="w-24"><Input type="number" value={String(Math.round(t.markup * 100))} onChange={(v) => setTerm(i, 'markup', (Number(v) || 0) / 100)} /></span>
                      %
                    </label>
                    <span className="text-para text-primary">{formatSum(monthlyPayment(SAMPLE, t, SAMPLE * (settings.downPaymentPercent / 100)))}/oy</span>
                    <span className="ml-auto">
                      <Button variant="quiet" ariaLabel={`${t.months} oylik muddatni o'chirish`} onClick={() => patch((p) => ({ ...p, terms: p.terms.filter((_, j) => j !== i) }))}>
                        <X aria-hidden className="size-4" />
                      </Button>
                    </span>
                  </div>
                ))}
                {settings.terms.length === 0 && <p className="text-para text-danger">Kamida bitta muddat kerak — aks holda saqlab bo'lmaydi.</p>}
                <div>
                  <Button variant="secondary" onClick={() => patch((p) => ({ ...p, terms: [...p.terms, { months: 12, markup: 0 }] }))}>Muddat qo'shish</Button>
                </div>
              </div>
            </Card>

            <Card title="Dollar kursi" description="Billz narxlari USD'da keladi; saytdagi so'm narxlar shu kurs bilan hisoblanadi.">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Ustama (%)" hint="Bo'sh qoldirsangiz kurs qo'lda kiritiladi; kiritilsa Markaziy bank kursiga qo'shiladi va har 6 soatda yangilanadi">
                  <Input
                    type="number"
                    value={settings.usdMarkupPercent === null ? '' : String(settings.usdMarkupPercent)}
                    onChange={(v) => patch((p) => ({ ...p, usdMarkupPercent: v === '' ? null : Number(v) || 0 }))}
                    placeholder="o'chiq"
                  />
                </Field>
                {settings.usdMarkupPercent === null || settings.usdCbuRate === null ? (
                  <Field label="Kurs (so'm)" hint="1 dollar necha so'm">
                    <Input type="number" value={String(settings.usdToUzs)} onChange={(v) => patch((p) => ({ ...p, usdToUzs: Number(v) || 0 }))} />
                  </Field>
                ) : (
                  <Field label="Do'kon kursi" hint="Markaziy bank kursi + ustama; avtomatik yangilanadi">
                    <Input value={formatSum(storeRate(settings.usdCbuRate, settings.usdMarkupPercent))} onChange={() => {}} disabled />
                  </Field>
                )}
              </div>
              <p className="mt-2 text-label text-muted-2">
                {settings.usdCbuRate !== null
                  ? `Markaziy bank: ${formatSum(settings.usdCbuRate)} (${settings.usdRateDate})`
                  : 'Markaziy bank kursi hali olinmadi.'}
              </p>
            </Card>
          </div>
        )}
    </Page>
  );
};

export default SettingsPayment;
```

- [ ] **Step 6: Navigatsiya, ulash va eski formani o'chirish**

`src/admin/nav.ts` — Sozlamalardagi "To'lov va kurs" tabiga `ownPage: true`:

```ts
      { id: 'payment', segment: 'payment', label: "To'lov va kurs", Icon: Wallet, ownPage: true },
```

`src/admin/AdminApp.tsx`:
- `import SettingsForm from './SettingsForm';` qatorini o'chiring va uning o'rniga (importlar orasida, `import SettingsSeo from './screens/SettingsSeo';` qatoridan keyin):

```tsx
import SettingsPayment from './screens/SettingsPayment';
```

- `screenFor`dagi qatorni almashtiring. Eski:

```tsx
    case 'settings/payment': return <SettingsForm />;
```

Yangi:

```tsx
    case 'settings/payment': return <SettingsPayment />;
```

Eski fayl:

```bash
git rm src/admin/SettingsForm.tsx
```

Run: `grep -rn "SettingsForm" src/`
Expected: bo'sh.

- [ ] **Step 7: Lint va testlar**

Run: `bun run lint && bun run test`
Expected: lint exit 0; `Test Files 33 passed (33)`, `Tests 363 passed (363)`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/installment.ts src/lib/installment.test.ts src/admin/screens/SettingsPayment.tsx src/admin/nav.ts src/admin/AdminApp.tsx
git commit -m "feat(admin): Sozlamalar → To'lov va kurs tabi; oylik namunasi yadrodan

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 9 (controller): brauzer**

1. `/admin/settings/payment`: kartalar `Boshlang'ich to'lov`, `Muddatlar va ustama`, `Dollar kursi`; "Saqlash" o'chiq; har muddat qatorida oylik namunasi ko'rinadi va u mahsulot sahifasidagi qiymat bilan mos.
2. Ustamani o'zgartirish → namuna darhol qayta hisoblanadi.
3. Eng kam foizni eng ko'pdan katta qilib saqlash → server xatosi toast'da (`Maksimal boshlang'ich foizi…`); qaytarish.
4. Yangi muddat qo'shish → saqlash → mahsulot sahifasida yangi muddat chiqadi → o'chirish → saqlash (asl holat).
5. Dollar ustamasini bo'shatish → "Kurs (so'm)" maydoni chiqadi; asl qiymatni qaytarish.
6. Oxirida `GET /api/admin/settings` javobi boshlang'ich holat bilan bir xil.

---

### Task 2: "Integratsiyalar" tabi

**Files:**
- Create: `src/admin/screens/SettingsIntegrations.tsx`
- Modify: `src/admin/nav.ts`
- Modify: `src/admin/AdminApp.tsx`
- Delete: `src/admin/SiteConfigForm.tsx`, `src/admin/BillzPanel.tsx`

**Interfaces:**
- Consumes: `useSiteConfig` (5a), `getBillzStatus`/`getBillzShops`/`runBillzSync` (`api.ts`, mavjud), `BillzShop`/`BillzSyncStatus` (`shared/billz.ts`), `errText`, `SectionTabs`, kit.
- Produces: `SettingsIntegrations` (default eksport); Sozlamalarda `integrations` tabi `ownPage: true`.

- [ ] **Step 1: `src/admin/screens/SettingsIntegrations.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { FC } from 'react';
import type { BillzShop, BillzSyncStatus } from '../../../shared/billz';
import { getBillzShops, getBillzStatus, runBillzSync } from '../api';
import { errText } from '../errText';
import SectionTabs from '../SectionTabs';
import { useSiteConfig } from '../useSiteConfig';
import { Button, Card, EmptyState, Field, Input, Page, Select, Skeleton } from '../ui';
import { useToast } from '../ui/toast';

/** Sozlamalar → Integratsiyalar: Billz, buyurtma boti, mijoz kirishi va analitika — hammasi bir sahifada. */
const SettingsIntegrations: FC = () => {
  const cfg = useSiteConfig();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [rawStatus, setStatus] = useState(null as BillzSyncStatus | null);
  const status = rawStatus as BillzSyncStatus | null;
  const [rawShops, setShops] = useState([] as BillzShop[]);
  const shops = rawShops as BillzShop[];
  const [shopsBusy, setShopsBusy] = useState(false);
  const config = cfg.config;

  function loadStatus() {
    getBillzStatus().then(setStatus).catch(() => setStatus(null));
  }
  useEffect(() => { loadStatus(); }, []);
  // Sinxronizatsiya fon vazifasi — ishlayotganda 3 soniyada bir holat so'raladi.
  useEffect(() => {
    if (!status?.running) return;
    const t = setInterval(loadStatus, 3000);
    return () => clearInterval(t);
  }, [status?.running]);

  async function save() {
    setBusy(true);
    try {
      await cfg.save();
      toast('Saqlandi');
      loadStatus();
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function loadShops() {
    setShopsBusy(true);
    try {
      setShops(await getBillzShops());
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setShopsBusy(false);
    }
  }

  async function sync() {
    try {
      await runBillzSync();
      toast('Sinxronizatsiya boshlandi');
      loadStatus();
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const last = status?.last ?? null;
  const when = last ? new Date(last.at).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' }) : null;

  return (
    <Page
      title="Integratsiyalar"
      description="Billz ombori, buyurtma boti, mijoz kirishi va tashrif statistikasi."
      dirty={cfg.dirty}
      actions={<Button onClick={save} disabled={!cfg.dirty || busy}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>}
    >
      <SectionTabs section="settings" active="integrations" />
      {cfg.error ? <EmptyState title="Sozlamalar yuklanmadi" text={cfg.error} />
        : !config ? <Skeleton rows={8} />
        : (
          <div className="flex flex-col gap-4">
            <Card title="Billz (ombor va narxlar)" description="Tovar, narx, qoldiq va rasmlar Billz'dan o'zi keladi; Billz'ga hech narsa yozilmaydi.">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Integratsiya kaliti" hint="Billz → Sozlamalar → Integratsiya bo'limida yaratiladi">
                  <Input type="password" value={config.billzSecretToken} onChange={(v) => cfg.set('billzSecretToken', v)} />
                </Field>
                <Field label="Do'kon" hint="Narx va qoldiq shu do'kondan olinadi. Avval kalitni saqlang, keyin ro'yxatni yuklang.">
                  {shops.length > 0 ? (
                    <Select value={config.billzShopId} onChange={(v) => cfg.set('billzShopId', v)}>
                      <option value="">— tanlang —</option>
                      {shops.map((sh) => <option key={sh.id} value={sh.id}>{sh.name}</option>)}
                    </Select>
                  ) : (
                    <Input value={config.billzShopId} onChange={(v) => cfg.set('billzShopId', v)} placeholder="shop UUID" />
                  )}
                </Field>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={loadShops} disabled={shopsBusy}>{shopsBusy ? 'Yuklanmoqda…' : "Do'konlarni yuklash"}</Button>
                <Button variant="secondary" onClick={sync} disabled={!status?.configured || status.running}>Sinxronlash</Button>
              </div>
              <p className="mt-3 text-label text-muted-2">
                {!status ? 'Holat yuklanmoqda…'
                  : !status.configured ? "Sozlanmagan — kalit va do'konni saqlang."
                  : status.running ? 'Ishlayapti…'
                  : !last ? 'Hali sinxronlanmagan.'
                  : last.ok
                    ? `Oxirgi: ${when} · ko'rildi ${last.seen}/${last.count} · yangi ${last.inserted} · yangilandi ${last.updated} · yashirildi ${last.hidden} · rasm ${last.photos}`
                    : `Oxirgi urinish xato: ${errText(new Error(last.error ?? 'network'))} (${when})`}
              </p>
              <p className="mt-1 text-label text-muted-2">Har 30 daqiqada butun katalog qayta o'qiladi. Billz tovarining nomi, narxi, qoldig'i, turi va tavsifi har safar qayta yoziladi; reyting, sharhlar va tartib sizniki.</p>
            </Card>

            <Card title="Buyurtma xabarnomasi (Telegram bot)" description="Yangi buyurtma va ariza kelganda botga xabar boradi.">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Bot tokeni" hint="@BotFather'da bot yarating va tokenni shu yerga qo'ying">
                  <Input type="password" value={config.telegramBotToken} onChange={(v) => cfg.set('telegramBotToken', v)} />
                </Field>
                <Field label="Chat yoki guruh ID" hint="Botni guruhga admin qilib qo'shing va guruh ID sini yozing">
                  <Input value={config.telegramOrderChatId} onChange={(v) => cfg.set('telegramOrderChatId', v)} placeholder="-1001234567890" />
                </Field>
              </div>
            </Card>

            <Card title="Mijoz kirishi" description="Mijoz Google yoki Telegram bilan kirib, buyurtma tarixini ko'ra oladi. Bo'sh qolsa kirish tugmasi ishlamaydi, mehmon buyurtmasi ishlayveradi.">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Google Client ID">
                  <Input value={config.googleClientId} onChange={(v) => cfg.set('googleClientId', v)} />
                </Field>
                <Field label="Google Client Secret">
                  <Input type="password" value={config.googleClientSecret} onChange={(v) => cfg.set('googleClientSecret', v)} />
                </Field>
                <Field label="Telegram login bot" hint="Bot username (@ siz); BotFather'da domen ko'rsatilgan bo'lsin">
                  <Input value={config.telegramLoginBot} onChange={(v) => cfg.set('telegramLoginBot', v)} placeholder="my_login_bot" />
                </Field>
              </div>
            </Card>

            <Card title="Analitika" description="Yandex Metrica hisoblagichi; bo'sh qolsa skript umuman yuklanmaydi.">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Metrica raqami" hint="Faqat raqamlar">
                  <Input value={config.yandexMetricaId} onChange={(v) => cfg.set('yandexMetricaId', v)} placeholder="12345678" />
                </Field>
              </div>
            </Card>
          </div>
        )}
    </Page>
  );
};

export default SettingsIntegrations;
```

- [ ] **Step 2: Navigatsiya, ulash va eski fayllarni o'chirish**

`src/admin/nav.ts`:

```ts
      { id: 'integrations', segment: 'integrations', label: 'Integratsiyalar', Icon: Plug, ownPage: true },
```

`src/admin/AdminApp.tsx`:
- `import SiteConfigForm from './SiteConfigForm';` va `import BillzPanel from './BillzPanel';` qatorlarini o'chiring; ularning o'rniga (`import SettingsPayment from './screens/SettingsPayment';` qatoridan keyin):

```tsx
import SettingsIntegrations from './screens/SettingsIntegrations';
```

- `screenFor`dagi blokni almashtiring. Eski:

```tsx
    case 'settings/integrations':
      return (
        <>
          <SiteConfigForm />
          <div className="mt-4"><BillzPanel /></div>
        </>
      );
```

Yangi:

```tsx
    case 'settings/integrations': return <SettingsIntegrations />;
```

Eski fayllar:

```bash
git rm src/admin/SiteConfigForm.tsx src/admin/BillzPanel.tsx
```

Run: `grep -rn "SiteConfigForm\|BillzPanel" src/`
Expected: bo'sh.

- [ ] **Step 3: Lint va testlar**

Run: `bun run lint && bun run test`
Expected: lint exit 0; `Test Files 33 passed (33)`, `Tests 363 passed (363)`.

- [ ] **Step 4: Commit**

```bash
git add src/admin/screens/SettingsIntegrations.tsx src/admin/nav.ts src/admin/AdminApp.tsx
git commit -m "feat(admin): Sozlamalar → Integratsiyalar tabi; Billz, bot, mijoz kirishi va analitika bir joyda

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 5 (controller): brauzer**

1. `/admin/settings/integrations`: kartalar `Billz (ombor va narxlar)`, `Buyurtma xabarnomasi (Telegram bot)`, `Mijoz kirishi`, `Analitika`; "Saqlash" o'chiq.
2. Sirlar `type="password"`: Billz kaliti, bot tokeni, Google secret.
3. Billz holati qatori ma'lumot ko'rsatadi (oxirgi sinxronizatsiya yoki "Hali sinxronlanmagan"). **"Sinxronlash" bosilmaydi** — haqiqiy Billz so'rovi.
4. Metrica raqamiga `abc` yozib saqlash → server xatosi toast'da (`Metrica raqami…`); qaytarish.
5. Chat ID'ni o'zgartirib saqlash → `GET /api/admin/site-config`da yangi qiymat; Billz kaliti va boshqa sirlar o'zgarmagan (`site_config` bazasidan tekshiriladi); asl qiymatni qaytarish.
6. "Do'konlarni yuklash" bosilmaydi (tashqi so'rov) — tugma bor va faol ekani ko'rinsa yetarli.

---

### Task 3: "Akkaunt" tabi va hujjat

**Files:**
- Create: `src/admin/screens/SettingsAccount.tsx`
- Modify: `src/admin/nav.ts`
- Modify: `src/admin/AdminApp.tsx`
- Delete: `src/admin/AccountForm.tsx`
- Modify: `CLAUDE.md`
- Modify: `docs/superpowers/specs/2026-09-15-admin-redesign-design.md`

**Interfaces:**
- Consumes: `getAccount`/`updateAccount` (`api.ts`, mavjud), `errText`, `SectionTabs`, kit.
- Produces: `SettingsAccount: FC<{ defaultPw: boolean; onPasswordChanged: () => void }>` (default eksport); Sozlamalarda `account` tabi `ownPage: true`.

- [ ] **Step 1: `src/admin/screens/SettingsAccount.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { getAccount, updateAccount } from '../api';
import { errText } from '../errText';
import SectionTabs from '../SectionTabs';
import { Button, Card, EmptyState, Field, Input, Page, Skeleton } from '../ui';
import { useToast } from '../ui/toast';

/** Sozlamalar → Akkaunt: admin login/paroli va Google bilan kirish. Har o'zgarish joriy parol bilan tasdiqlanadi. */
const SettingsAccount: FC<{ defaultPw: boolean; onPasswordChanged: () => void }> = ({ defaultPw, onPasswordChanged }) => {
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getAccount()
      .then((a) => { setUsername(a.username); setGoogleEmail(a.adminGoogleEmail); setLoaded(true); })
      .catch(() => setError("Sahifani yangilab qayta urinib ko'ring"));
  }, []);

  async function save() {
    setBusy(true);
    const changedPassword = (newPassword as string) !== '';
    try {
      await updateAccount({
        currentPassword: currentPassword as string,
        username: (username as string).trim() || undefined,
        newPassword: changedPassword ? (newPassword as string) : undefined,
        adminGoogleEmail: (googleEmail as string).trim(),
      });
      setCurrentPassword('');
      setNewPassword('');
      toast('Saqlandi · keyingi kirishda yangi maʼlumotlardan foydalaning');
      if (changedPassword) onPasswordChanged();
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  const canSave = !busy && (currentPassword as string) !== '';

  return (
    <Page
      title="Akkaunt"
      description="Admin panelga kirish maʼlumotlari. O'zgartirish uchun joriy parolni kiriting."
      actions={<Button onClick={save} disabled={!canSave}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>}
    >
      <SectionTabs section="settings" active="account" />
      {error ? <EmptyState title="Ma'lumot yuklanmadi" text={error} />
        : !loaded ? <Skeleton rows={5} />
        : (
          <div className="flex flex-col gap-4">
            {defaultPw && (
              <Card title="Standart parol ishlatilmoqda" description="Panelga «admin» paroli bilan kirilgan — hoziroq yangi parol qo'ying.">
                <p className="text-para text-danger">Parol o'zgartirilgach barcha ochiq sessiyalar bekor bo'ladi.</p>
              </Card>
            )}
            <Card title="Kirish maʼlumotlari">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Login" hint="Kamida 3 belgi">
                  <Input value={username as string} onChange={setUsername} autoComplete="username" />
                </Field>
                <Field label="Yangi parol" hint="Bo'sh qoldirsangiz parol o'zgarmaydi; kamida 8 belgi">
                  <Input type="password" value={newPassword as string} onChange={setNewPassword} autoComplete="new-password" placeholder="••••••" />
                </Field>
                <Field label="Google email" hint="Shu Google akkaunt «Google bilan kirish» orqali panelga kira oladi; bo'sh qolsa o'chiq">
                  <Input type="email" value={googleEmail as string} onChange={setGoogleEmail} placeholder="siz@gmail.com" />
                </Field>
                <Field label="Joriy parol" required hint="Har qanday o'zgarishni tasdiqlaydi">
                  <Input type="password" value={currentPassword as string} onChange={setCurrentPassword} autoComplete="current-password" />
                </Field>
              </div>
            </Card>
          </div>
        )}
    </Page>
  );
};

export default SettingsAccount;
```

- [ ] **Step 2: Navigatsiya, ulash va eski formani o'chirish**

`src/admin/nav.ts`:

```ts
      { id: 'account', segment: 'account', label: 'Akkaunt', Icon: UserRound, ownPage: true },
```

`src/admin/AdminApp.tsx`:
- `import AccountForm from './AccountForm';` qatorini o'chiring; o'rniga (`import SettingsIntegrations from './screens/SettingsIntegrations';` qatoridan keyin):

```tsx
import SettingsAccount from './screens/SettingsAccount';
```

- `screenFor`dagi blokni almashtiring. Eski:

```tsx
    case 'settings/account':
      return (
        <>
          {defaultPw && (
            <p className="mb-6 rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-para text-danger">
              <b>Diqqat:</b> standart «admin» paroli ishlatilmoqda — quyida yangi parol qo'ying.
            </p>
          )}
          <AccountForm onPasswordChanged={clearDefaultPw} />
        </>
      );
```

Yangi:

```tsx
    case 'settings/account': return <SettingsAccount defaultPw={defaultPw} onPasswordChanged={clearDefaultPw} />;
```

Eski fayl:

```bash
git rm src/admin/AccountForm.tsx
```

Run: `grep -rn "AccountForm" src/`
Expected: bo'sh.

- [ ] **Step 3: Lint va testlar**

Run: `bun run lint && bun run test`
Expected: lint exit 0; `Test Files 33 passed (33)`, `Tests 363 passed (363)`.

- [ ] **Step 4: `CLAUDE.md`**

Eski (5a xatboshisining oxiri):

```text
To'lov, Integratsiyalar va Akkaunt tablari hali eski (5b); quyidagi tavsifning o'sha qismlari eski ekranlar haqida.
```

Yangi:

```text
**5b (2026-09-18) — Sozlamalarning operatsion tablari:** `To'lov va kurs` (`screens/SettingsPayment.tsx` — boshlang'ich to'lov oralig'i, muddat qatorlari (oy + ustama %, yonida 10 mln uchun namuna oylik — hisob `src/lib/installment.ts`dagi `monthlyPayment` bilan, formula admin'da takrorlanmaydi), dollar: ustama % yoki qo'lda kurs, MB kursi va sanasi), `Integratsiyalar` (`SettingsIntegrations.tsx` — Billz kaliti/do'koni/holati va «Sinxronlash» bitta kartada, Telegram bot, mijoz kirishi, Metrica; sirlar `type="password"`) va `Akkaunt` (`SettingsAccount.tsx` — login, yangi parol, Google email, joriy parol bilan tasdiq; standart parol ogohlantirishi shu ekranda). Shu bilan admin butunlay yangi kitda — eski `SettingsForm`, `SiteConfigForm`, `BillzPanel`, `AccountForm` o'chirildi.
```

- [ ] **Step 5: Spec — 5b qarorlari**

`docs/superpowers/specs/2026-09-15-admin-redesign-design.md` — 5a qarorlari xatboshisidan keyin (u `ham filtrlaydi.` bilan tugaydi) yangi xatboshi qo'shing:

```text

5b qarorlari (2026-09-18): muddat qatoridagi namuna oylik to'lov biznes yadrosidan (`monthlyPayment` — `calcInstallment` ham
shuni chaqiradi, admin formulani takrorlamaydi); Billz kaliti, do'koni, holati va «Sinxronlash» bitta kartada; standart parol
ogohlantirishi `AdminApp`dan Akkaunt ekraniga ko'chdi; Akkauntda «Saqlash» joriy parol kiritilguncha o'chiq turadi.
```

- [ ] **Step 6: Commit**

```bash
git add src/admin/screens/SettingsAccount.tsx src/admin/nav.ts src/admin/AdminApp.tsx CLAUDE.md docs/superpowers/specs/2026-09-15-admin-redesign-design.md
git commit -m "feat(admin): Sozlamalar → Akkaunt tabi; eski admin formalari o'chirildi; hujjat

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 7 (controller): brauzer**

1. `/admin/settings/account`: `Kirish maʼlumotlari` kartasi; "Saqlash" joriy parol kiritilgunga qadar o'chiq. **Parol yozilmaydi** — egasi o'zi tekshiradi; controller faqat tugmaning holati va maydonlarni ko'radi.
2. Google email maydoni yuklangan qiymatni ko'rsatadi.
3. `/admin/settings` → oltala tab ochiladi va hech biri eski forma emas (`text-[13px]` kabi eski uslub yo'q).
4. Mobil 375px: tablar `SectionTabs`da, gorizontal scroll yo'q.
5. Konsolda xato yo'q; `grep -rn "SettingsForm\|SiteConfigForm\|BillzPanel\|AccountForm" src/` bo'sh.

---

## O'z-o'zini tekshirish (reja yozilgandan keyin)

- **Spec qamrovi:** §5 To'lov va kurs (boshlang'ich min/max, muddatlar + namuna oylik, dollar ustama/qo'lda, MB kursi) — T1; Integratsiyalar (Billz bir joyda, Telegram bot, mijoz kirishi, analitika) — T2; Akkaunt (login/parol, Google) — T3. §4 forma qoidalari — uch ekranda. §9: yangi sof mantiq faqat `monthlyPayment` — testi T1'da.
- **Tiplar izchilligi:** `monthlyPayment(cashUzs, term, downPaymentUzs)` ↔ `calcInstallment` ichida va `SettingsPayment`da bir xil tartibda; `ApiSettings.usdMarkupPercent: number | null` ↔ forma bo'sh matnni `null` qiladi; `SettingsAccount` proplari ↔ `AdminApp`dagi `defaultPw`/`clearDefaultPw`.
- **Test sonlari:** T1 +2 (33 fayl / 363), T2/T3 o'zgarmaydi.
- **Placeholder:** yo'q — har kod qadami to'liq kod yoki aniq eski → yangi matn bilan.
