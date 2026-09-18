# Admin qayta qurilishi — 5a-bosqich (Sozlamalar: Do'kon, Aloqa, SEO) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sozlamalar bo'limining sayt ma'lumotlariga tegishli uchta tabini kit bilan qurish — **Do'kon** (nom, logolar, favicon, narx rejimi, mahsulot sahifasidagi va'dalar), **Aloqa** (bitta telefon maydoni, ijtimoiy havolalar, manzil va ish vaqti) va **SEO** (sarlavha qo'shimchasi, bosh sahifa tavsifi, ulashish rasmi, katalog tavsif shabloni).

**Architecture:** Har ekran ikkita manbani birlashtiradi: `site_config` (yangi `useSiteConfig` hook'i orqali, mavjud `GET/PUT /api/admin/site-config`) va sayt matnlari/rasmlari (4b'dagi `useSiteContent` + `ContentFields`, registrning `store`/`contact`/`seo` guruhlari). Sahifada bitta "Saqlash": avval konfiguratsiya, keyin matn/rasm yoziladi. Telefon endi bitta maydon — bosiladigan raqam sof `phoneFromDisplay` bilan chiqariladi.

**Tech Stack:** React Router v7 admin SPA, `src/admin/ui` kit, lucide-react, vitest.

**Spec:** `docs/superpowers/specs/2026-09-15-admin-redesign-design.md` (§3 navigatsiya, §4 forma qoidalari, §5 Sozlamalar, §6 registr, §9 test). 4b rejasi va uning komponentlari: `docs/superpowers/plans/2026-09-17-admin-redesign-4b-kontent-ekranlari.md`.

## Global Constraints

- **Migratsiya yo'q, yangi server endpoint yo'q.** Mavjud `GET/PUT /api/admin/site-config`, `GET/PUT /api/admin/texts|assets`, `POST /api/admin/upload` ishlatiladi; `parseSiteConfigInput` o'zgarmaydi (`name` va `phone` majburiy, havolalar `/` yoki `https://` bilan).
- **`site_config` ustunlari o'chirilmaydi:** `mapLabel` formadan chiqadi, lekin yuklangan qiymat `PUT`da o'z holicha qaytariladi (ustun tozalanmaydi).
- **Sirlar:** `telegramBotToken`, `googleClientSecret`, `billzSecretToken` va `customerSessionSecret` bu bosqichdagi ekranlarda ko'rsatilmaydi (ular Integratsiyalar tabida — 5b).
- **Forma qoidalari (spec §4):** kit (`src/admin/ui`); bitta "Saqlash" sahifa sarlavhasida, o'zgarish bo'lmaguncha o'chiq; toast `Saqlandi · saytda 1–5 daqiqada ko'rinadi`; xato maydon ostida yoki toast'da; bo'sh holat `EmptyState`, yuklanish `Skeleton`; ruscha maydon ixtiyoriy; `window.confirm` yo'q.
- **Admin'da `bg-white` / `text-white` yozilmaydi** (kitdagi `Button` ichidagi mavjud `text-white` bundan mustasno).
- **TS:** strict, `any` yo'q. `@types/react` yo'q: holat `useState(x as T)` bilan olinadi va o'qishda cast qilinadi; hook chaqiruvida generik yozilmaydi; `key` faqat native element yoki `FC<{…}>`da.
- **Dizayn tokenlari:** hex yo'q (ruxsat etilgan literal — `#25D366` va `white`); `text-[Npx]` yo'q; `shadow-*` yo'q; bosiladigan elementda `press`.
- **Buyruqlar:** `bun`/`bunx`, npm emas. Har task oxirida `bun run lint && bun run test` yashil.
- **Rollar:** implementer subagent chaqirmaydi, dev server ishga tushirmaydi va brauzer tekshiruvini qilmaydi. "Brauzer" qadamlari — **controller**niki. Sinov qiymatlari qadam oxirida qaytariladi.
- **Commit trailer:** `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Rejadagi qarorlar (spec'dan farqlar)

1. **Eski `SiteConfigForm` 5b gacha qoladi** — u Integratsiyalar tabiga ko'chiriladi (`BillzPanel` bilan birga). Aks holda Telegram bot, Billz kaliti, mijoz kirishi va Metrica maydonlari 5b gacha umuman ochilmay qolardi.
2. **Telefon bitta maydon:** egasi ko'rinishini yozadi (`+998 (90) 123-45-67`), `phone` client'da `phoneFromDisplay` bilan chiqariladi. Server validatsiyasi o'zgarmaydi; `phone` bo'sh bo'lsa "Saqlash" o'chiq.
3. **Ulashish rasmi (OG) o'zgarishsiz yuklanadi** (`normalize={false}`, faqat PNG/JPG): ijtimoiy tarmoqlar oldindan ko'rishida WebP hamma joyda ishlamaydi. Favicon ham shunday (4b'dagi qoida).
4. **Yuklagich `accept` bo'yicha ham filtrlaydi** — 4b'da qoldirilgan mayda topilma: sudrab tashlangan JPEG `accept="image/png"` bo'lsa ham o'tib ketardi (favicon shu bosqichda ekranга chiqadi).
5. **`ContentFields` `only` propini oladi** (bo'lim sarlavhalari ro'yxati) — Do'kon tabida logo/favicon kartasi va'dalar kartasidan oldin turishi uchun; bitta hook, bitta "Saqlash".
6. **`mapLabel` maydoni olib tashlanadi**, qiymat esa `PUT`da saqlanib qoladi (spec §2: ustun o'chirilmaydi).

## Fayl tuzilmasi

- **T1:** `src/admin/lib/phone.ts` (+ test, yangi), `src/admin/useSiteConfig.ts` (yangi), `src/admin/ContentFields.tsx` (`only` prop), `src/admin/ImageUploader.tsx` (`accept` filtri), `src/admin/screens/SettingsStore.tsx` (yangi), `src/admin/nav.ts`, `src/admin/AdminApp.tsx`.
- **T2:** `src/admin/screens/SettingsContact.tsx` (yangi), `nav.ts`, `AdminApp.tsx`.
- **T3:** `src/admin/screens/SettingsSeo.tsx` (yangi), `nav.ts`, `AdminApp.tsx`, `CLAUDE.md`, spec.

## Brauzer tekshiruvi yordamchilari (controller uchun)

```js
function setVal(el, value) {
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}
async function pick(input, name, type) {
  const c = document.createElement('canvas'); c.width = 240; c.height = 126;
  const g = c.getContext('2d'); g.fillStyle = '#c00'; g.fillRect(0, 0, 240, 126);
  const blob = await new Promise((r) => c.toBlob(r, type));
  const dt = new DataTransfer(); dt.items.add(new File([blob], name, { type }));
  input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
}
const card = (title) => [...document.querySelectorAll('section')].find((s) => s.querySelector('h2')?.textContent === title);
```

---

### Task 1: Telefon yordamchisi, konfiguratsiya hook'i va "Do'kon" tabi

**Files:**
- Create: `src/admin/lib/phone.ts`
- Test: `src/admin/lib/phone.test.ts`
- Create: `src/admin/useSiteConfig.ts`
- Create: `src/admin/screens/SettingsStore.tsx`
- Modify: `src/admin/ContentFields.tsx` (`ContentFields` `only` prop)
- Modify: `src/admin/ImageUploader.tsx` (`accept` bo'yicha filtr)
- Modify: `src/admin/nav.ts`
- Modify: `src/admin/AdminApp.tsx`

**Interfaces:**
- Consumes (4b'dan): `useSiteContent(group, keys?)`, `ContentFields`, `SectionTabs`, `PHOTO_UPLOAD`, kit (`Page`, `Card`, `Field`, `Input`, `Segmented`, `Button`, `Skeleton`, `EmptyState`), `getSiteConfig`/`updateSiteConfig` (`api.ts`, mavjud), `ApiSiteConfig`/`PaymentMode` (`shared/types.ts`).
- Produces (keyingi task'lar uchun):
  - `phoneFromDisplay(display: string): string` (`src/admin/lib/phone.ts`);
  - `useSiteConfig(): SiteConfigState` — `{ loaded: boolean; error: string; config: ApiSiteConfig | null; set: <K extends keyof ApiSiteConfig>(k: K, v: ApiSiteConfig[K]) => void; dirty: boolean; save: () => Promise<void> }`;
  - `ContentFields` `only?: string[]` (bo'lim sarlavhalari);
  - Sozlamalar tabining `ownPage: true` naqshi.

- [ ] **Step 1: Failing test — `src/admin/lib/phone.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { phoneFromDisplay } from './phone';

describe('phoneFromDisplay', () => {
  it("ko'rinishdagi belgilarni tashlab, oldiga + qo'yadi", () => {
    expect(phoneFromDisplay('+998 (90) 123-45-67')).toBe('+998901234567');
    expect(phoneFromDisplay('90 123 45 67')).toBe('+901234567');
  });
  it("raqam bo'lmasa bo'sh qaytaradi", () => {
    expect(phoneFromDisplay('')).toBe('');
    expect(phoneFromDisplay('aloqa')).toBe('');
  });
});
```

- [ ] **Step 2: Test yiqilishini ko'rish**

Run: `bunx vitest run src/admin/lib/phone.test.ts`
Expected: FAIL — `Failed to resolve import "./phone"`.

- [ ] **Step 3: `src/admin/lib/phone.ts`**

```ts
/**
 * Ko'rinishdagi telefondan bosiladigan raqam: faqat raqamlar, oldida `+` (`tel:` havolasi shundan yasaladi).
 * Egasi bitta maydonga ko'rinishini yozadi — `site_config.phone` shu yerda chiqariladi.
 */
export function phoneFromDisplay(display: string): string {
  const digits = display.replace(/\D+/g, '');
  return digits === '' ? '' : `+${digits}`;
}
```

- [ ] **Step 4: Testni o'tkazish**

Run: `bunx vitest run src/admin/lib/phone.test.ts`
Expected: PASS (2 test).

- [ ] **Step 5: `src/admin/useSiteConfig.ts`**

```ts
import { useEffect, useState } from 'react';
import type { ApiSiteConfig } from '../../shared/types';
import { getSiteConfig, updateSiteConfig } from './api';

export interface SiteConfigState {
  loaded: boolean;
  error: string;
  config: ApiSiteConfig | null;
  set: <K extends keyof ApiSiteConfig>(k: K, v: ApiSiteConfig[K]) => void;
  dirty: boolean;
  /** `PUT` javobi — server tozalagan qiymatlar (masalan bo'sh `seoTitleSuffix` do'kon nomiga aylanadi). */
  save: () => Promise<void>;
}

/**
 * `site_config` formasi — Sozlamalarning to'rt tabi bir xil yozuvning turli qismlarini ko'rsatadi, shuning uchun
 * yuklash/qoralama/saqlash bitta joyda. Ko'rsatilmagan maydonlar (masalan sirlar yoki `mapLabel`) qoralamada
 * o'z holicha qoladi va `PUT`da qaytariladi — boshqa tabdagi qiymat tozalanib ketmasin.
 */
export function useSiteConfig(): SiteConfigState {
  const [rawConfig, setConfig] = useState(null as ApiSiteConfig | null);
  const config = rawConfig as ApiSiteConfig | null;
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getSiteConfig()
      .then(setConfig)
      .catch(() => setError("Sahifani yangilab qayta urinib ko'ring"));
  }, []);

  return {
    loaded: config !== null,
    error: error as string,
    config,
    dirty: dirty as boolean,
    set: (key, value) => { setConfig((c: ApiSiteConfig | null) => (c ? { ...c, [key]: value } : c)); setDirty(true); },
    save: async () => {
      if (!config) return;
      setConfig(await updateSiteConfig(config));
      setDirty(false);
    },
  };
}
```

- [ ] **Step 6: `ContentFields` — `only` propi**

`src/admin/ContentFields.tsx` — `ContentFields` ta'rifining boshini almashtiring. Eski:

```tsx
/** Bo'limlar kartalari: matn — uz/ru juftligi, rasm/video — yuklagich (fayl o'chirilsa standart qaytadi). */
export const ContentFields: FC<{ content: SiteContent }> = ({ content }) => {
  if (content.error) return <EmptyState title="Sayt matnlari yuklanmadi" text={content.error} />;
  if (!content.loaded) return <Skeleton rows={6} />;
  return (
    <>
      {content.sections.map((s) => (
```

Yangi:

```tsx
/**
 * Bo'limlar kartalari: matn — uz/ru juftligi, rasm/video — yuklagich (fayl o'chirilsa standart qaytadi).
 * `only` — faqat shu sarlavhali bo'limlar (bitta guruhning kartalarini ekranda ajratib qo'yish uchun).
 */
export const ContentFields: FC<{ content: SiteContent; only?: string[] }> = ({ content, only }) => {
  if (content.error) return <EmptyState title="Sayt matnlari yuklanmadi" text={content.error} />;
  if (!content.loaded) return <Skeleton rows={6} />;
  return (
    <>
      {content.sections.filter((s) => !only || only.includes(s.title)).map((s) => (
```

- [ ] **Step 7: `ImageUploader` — `accept` bo'yicha filtr**

`src/admin/ImageUploader.tsx` — `handleFiles`ning boshidagi filtr qatorini almashtiring. Eski:

```tsx
    let files = Array.from(fileList).filter((f) => f.type.startsWith(video ? 'video/' : 'image/'));
```

Yangi:

```tsx
    // `accept` berilgan bo'lsa (favicon — faqat PNG) sudrab tashlangan boshqa tur ham o'tmasin.
    const allowed = accept ? accept.split(',').map((t) => t.trim()) : null;
    let files = Array.from(fileList).filter((f) => f.type.startsWith(video ? 'video/' : 'image/') && (!allowed || allowed.includes(f.type)));
```

- [ ] **Step 8: `src/admin/screens/SettingsStore.tsx`**

```tsx
import { useState } from 'react';
import type { FC } from 'react';
import type { PaymentMode } from '../../../shared/types';
import { ContentFields, useSiteContent } from '../ContentFields';
import { errText } from '../errText';
import SectionTabs from '../SectionTabs';
import { useSiteConfig } from '../useSiteConfig';
import { Button, Card, EmptyState, Field, Input, Page, Segmented, Skeleton } from '../ui';
import { useToast } from '../ui/toast';

const MODES = [
  { id: 'cash', label: 'Faqat naqd' },
  { id: 'both', label: "Naqd + muddatli" },
  { id: 'installment', label: 'Faqat muddatli' },
];

/** Sozlamalar → Do'kon: nom, narx rejimi, logolar va favicon, mahsulot sahifasidagi va'dalar (`store` guruhi). */
const SettingsStore: FC = () => {
  const cfg = useSiteConfig();
  const content = useSiteContent('store');
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const config = cfg.config;

  async function save() {
    setBusy(true);
    try {
      if (cfg.dirty) await cfg.save();
      if (content.dirty) await content.save();
      toast("Saqlandi · saytda 1–5 daqiqada ko'rinadi");
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  const dirty = cfg.dirty || content.dirty;
  const canSave = dirty && !busy && (config?.name.trim() ?? '') !== '';
  const error = cfg.error || content.error;

  return (
    <Page
      title="Do'kon"
      description="Do'kon nomi, narx rejimi, logolar va mahsulot sahifasidagi va'dalar. Matn maydoni bo'shatilsa standart qaytadi."
      dirty={dirty}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>}
    >
      <SectionTabs section="settings" active="store" />
      {error ? <EmptyState title="Sozlamalar yuklanmadi" text={error} />
        : !config || !content.loaded ? <Skeleton rows={8} />
        : (
          <div className="flex flex-col gap-4">
            <Card title="Do'kon">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Do'kon nomi" required hint="Sayt sarlavhasida, footer'da va Telegram xabarlarida chiqadi">
                  <Input value={config.name} onChange={(v) => cfg.set('name', v)} />
                </Field>
              </div>
              <div className="mt-4">
                <p className="mb-1.5 text-label font-medium text-muted">Narx ko'rsatish rejimi</p>
                <Segmented
                  label="Narx ko'rsatish rejimi"
                  value={config.paymentMode}
                  onChange={(v) => cfg.set('paymentMode', v as PaymentMode)}
                  options={MODES}
                />
                <p className="mt-1 text-label text-muted-2">Mahsulot narxi qanday ko'rsatiladi. «Faqat naqd» — oylik to'lov qatori va muddatli tugma chiqmaydi.</p>
              </div>
            </Card>
            <ContentFields content={content} only={['Logo va favicon']} />
            <ContentFields content={content} only={['Mahsulot sahifasi', 'Buyurtma va cookie']} />
          </div>
        )}
    </Page>
  );
};

export default SettingsStore;
```

- [ ] **Step 9: Navigatsiya va ulash**

`src/admin/nav.ts` — Sozlamalar bo'limidagi "Do'kon" tabiga `ownPage: true` qo'shing:

```ts
      { id: 'store', segment: 'store', label: "Do'kon", Icon: Store, ownPage: true },
```

`src/admin/AdminApp.tsx`:
- Importlarga qo'shing (`import ContentHome from './screens/ContentHome';` qatoridan keyin):

```tsx
import SettingsStore from './screens/SettingsStore';
```

- `screenFor`da ikki qatorni almashtiring. Eski:

```tsx
    case 'settings/store': return <SiteConfigForm />;
    case 'settings/payment': return <SettingsForm />;
    case 'settings/integrations': return <BillzPanel />;
```

Yangi (eski forma 5b gacha Integratsiyalar tabida qoladi — reja qarori 1):

```tsx
    case 'settings/store': return <SettingsStore />;
    case 'settings/payment': return <SettingsForm />;
    case 'settings/integrations':
      return (
        <>
          <SiteConfigForm />
          <div className="mt-4"><BillzPanel /></div>
        </>
      );
```

- [ ] **Step 10: Lint va testlar**

Run: `bun run lint && bun run test`
Expected: lint exit 0; `Test Files 33 passed (33)`, `Tests 361 passed (361)`.

- [ ] **Step 11: Commit**

```bash
git add src/admin/lib/phone.ts src/admin/lib/phone.test.ts src/admin/useSiteConfig.ts src/admin/screens/SettingsStore.tsx src/admin/ContentFields.tsx src/admin/ImageUploader.tsx src/admin/nav.ts src/admin/AdminApp.tsx
git commit -m "feat(admin): Sozlamalar → Do'kon tabi kit bilan; telefon yordamchisi va konfiguratsiya hook'i

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 12 (controller): brauzer**

1. `/admin/settings` → "Do'kon" ekrani; kartalar: `Do'kon`, `Logo va favicon`, `Mahsulot sahifasi`, `Buyurtma va cookie`; "Saqlash" o'chiq.
2. Logo/wordmark/favicon uchlasi "Standart" eskizi bilan; favicon yuklagichining `accept` — `image/png`.
3. Do'kon nomini o'zgartirish → "Saqlash" yoqiladi → saqlash → toast; `GET /api/admin/site-config`da yangi nom; sayt sarlavhasi (`/` HTML `<title>`) yangilanadi; nomni qaytarish.
4. Narx rejimi segmenti: `installment` → saqlash → mahsulot sahifasida oylik to'lov qatori; `cash`ga qaytarish (bazadagi asl qiymat).
5. Favicon: PNG yuklash → `/images/products/….png` (WebP EMAS) → saqlash → `/` HTML'ida `<link rel="icon">` shu yo'l bilan; × → standart qaytadi → saqlash.
6. Va'dalar kartasidagi bitta matnni (`Kafolat — muddat`) o'zgartirish → saqlash → mahsulot sahifasida ko'rinadi → bo'shatib qaytarish.
7. Oxirida: `GET /api/admin/texts` va `assets` → `values` `{}`; `site_config` qiymatlari asliga qaytgan; yuklangan sinov fayllari diskdan o'chirilgan.

---

### Task 2: "Aloqa" tabi

**Files:**
- Create: `src/admin/screens/SettingsContact.tsx`
- Modify: `src/admin/nav.ts`
- Modify: `src/admin/AdminApp.tsx`

**Interfaces:**
- Consumes: `useSiteConfig` va `phoneFromDisplay` (T1), `useSiteContent`/`ContentFields` (4b), kit.
- Produces: `SettingsContact` (default eksport); Sozlamalarda `contact` tabi (`/admin/settings/contact`).

- [ ] **Step 1: `src/admin/screens/SettingsContact.tsx`**

```tsx
import { useState } from 'react';
import type { FC } from 'react';
import { ContentFields, useSiteContent } from '../ContentFields';
import { errText } from '../errText';
import { phoneFromDisplay } from '../lib/phone';
import SectionTabs from '../SectionTabs';
import { useSiteConfig } from '../useSiteConfig';
import { Button, Card, EmptyState, Field, Input, Page, Skeleton } from '../ui';
import { useToast } from '../ui/toast';

/** Sozlamalar → Aloqa: telefon, ijtimoiy havolalar, xarita koordinatasi va manzil/ish vaqti matnlari (`contact` guruhi). */
const SettingsContact: FC = () => {
  const cfg = useSiteConfig();
  const content = useSiteContent('contact');
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const config = cfg.config;

  async function save() {
    setBusy(true);
    try {
      if (cfg.dirty) await cfg.save();
      if (content.dirty) await content.save();
      toast("Saqlandi · saytda 1–5 daqiqada ko'rinadi");
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  // Egasi faqat ko'rinishini yozadi; bosiladigan raqam shundan chiqariladi (server uni majburiy deb tekshiradi).
  function setPhone(display: string) {
    cfg.set('phoneDisplay', display);
    cfg.set('phone', phoneFromDisplay(display));
  }

  const dirty = cfg.dirty || content.dirty;
  const canSave = dirty && !busy && (config?.phone ?? '') !== '';
  const error = cfg.error || content.error;

  return (
    <Page
      title="Aloqa"
      description="Footer va aloqa tugmalarida chiqadigan ma'lumotlar. Matn maydoni bo'shatilsa standart qaytadi."
      dirty={dirty}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>}
    >
      <SectionTabs section="settings" active="contact" />
      {error ? <EmptyState title="Sozlamalar yuklanmadi" text={error} />
        : !config || !content.loaded ? <Skeleton rows={8} />
        : (
          <div className="flex flex-col gap-4">
            <Card title="Telefon va ijtimoiy tarmoqlar" description="Bo'sh qoldirilgan havola saytda chiqmaydi.">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Telefon" required hint={`Saytda shunday chiqadi; bosilganda ${config.phone || '—'} raqamiga qo'ng'iroq ochiladi`}>
                  <Input value={config.phoneDisplay} onChange={setPhone} placeholder="+998 (90) 123-45-67" />
                </Field>
                <Field label="Telegram" hint="https://t.me/… yoki / bilan boshlanadigan yo'l">
                  <Input value={config.telegram} onChange={(v) => cfg.set('telegram', v)} placeholder="https://t.me/username" />
                </Field>
                <Field label="Instagram">
                  <Input value={config.instagram} onChange={(v) => cfg.set('instagram', v)} placeholder="https://instagram.com/username" />
                </Field>
                <Field label="WhatsApp" hint="To'ldirilsa mobil aloqa tugmasida WhatsApp chiqadi">
                  <Input value={config.whatsapp} onChange={(v) => cfg.set('whatsapp', v)} placeholder="https://wa.me/998901234567" />
                </Field>
              </div>
            </Card>
            <Card title="Xarita" description="Footer'dagi «Xaritada ko'rish» havolasi shu koordinataga olib boradi.">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Koordinata" hint="Yandex Xaritada do'konni toping → o'ng tugma → koordinatani nusxalang (lon,lat)">
                  <Input value={config.mapLl} onChange={(v) => cfg.set('mapLl', v)} placeholder="69.240562,41.311081" />
                </Field>
              </div>
            </Card>
            <ContentFields content={content} />
          </div>
        )}
    </Page>
  );
};

export default SettingsContact;
```

- [ ] **Step 2: Navigatsiya va ulash**

`src/admin/nav.ts`:
- lucide importiga `Phone` qo'shing (alifbo tartibida `Package`dan keyin): `… Newspaper, Package, Phone, Plug, …`.
- Sozlamalar tablarida "Do'kon"dan keyin:

```ts
      { id: 'contact', segment: 'contact', label: 'Aloqa', Icon: Phone, ownPage: true },
```

`src/admin/AdminApp.tsx`:
- Importlarga (`import SettingsStore from './screens/SettingsStore';` qatoridan keyin):

```tsx
import SettingsContact from './screens/SettingsContact';
```

- `screenFor`da `case 'settings/store'` qatoridan keyin:

```tsx
    case 'settings/contact': return <SettingsContact />;
```

- [ ] **Step 3: Lint va testlar**

Run: `bun run lint && bun run test`
Expected: lint exit 0; `Test Files 33 passed (33)`, `Tests 361 passed (361)`.

- [ ] **Step 4: Commit**

```bash
git add src/admin/screens/SettingsContact.tsx src/admin/nav.ts src/admin/AdminApp.tsx
git commit -m "feat(admin): Sozlamalar → Aloqa tabi; bitta telefon maydoni

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 5 (controller): brauzer**

1. `/admin/settings/contact`: kartalar `Telefon va ijtimoiy tarmoqlar`, `Xarita`, `Manzil va ish vaqti`; "Manzil yozuvi" maydoni yo'q; "Saqlash" o'chiq.
2. Telefon maydoniga `+998 (99) 000-11-22` → izohda `+998990001122` ko'rinadi → saqlash → `GET /api/admin/site-config`da `phone` `+998990001122`, `phoneDisplay` yozilgani; footer'da yangi raqam va `tel:` havolasi; asl qiymatni qaytarish.
3. Telefonni bo'shatish → "Saqlash" o'chadi.
4. Telegram maydoniga `javascript:x` → saqlash → toast xatosi `Telegram havolasi…`; qaytarish.
5. `Manzil — 2-qator`ni o'zgartirish → saqlash → footer'da va sahifa manbaidagi JSON-LD `streetAddress`da ko'rinadi → bo'shatib qaytarish.
6. Oxirida `GET /api/admin/texts` → `values` `{}`, `site_config` asliga qaytgan.

---

### Task 3: "SEO" tabi va hujjat

**Files:**
- Create: `src/admin/screens/SettingsSeo.tsx`
- Modify: `src/admin/nav.ts`
- Modify: `src/admin/AdminApp.tsx`
- Modify: `CLAUDE.md`
- Modify: `docs/superpowers/specs/2026-09-15-admin-redesign-design.md`

**Interfaces:**
- Consumes: `useSiteConfig` (T1), `useSiteContent`/`ContentFields` (4b), `ImageUploader` (`normalize={false}`), kit.
- Produces: `SettingsSeo` (default eksport); Sozlamalarda `seo` tabi (`/admin/settings/seo`).

- [ ] **Step 1: `src/admin/screens/SettingsSeo.tsx`**

```tsx
import { useState } from 'react';
import type { FC } from 'react';
import { ContentFields, useSiteContent } from '../ContentFields';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import SectionTabs from '../SectionTabs';
import { useSiteConfig } from '../useSiteConfig';
import { Button, Card, EmptyState, Field, Input, Page, Skeleton, Textarea } from '../ui';
import { useToast } from '../ui/toast';

/** Sozlamalar → SEO: qidiruv tizimlari uchun sarlavha/tavsif, ulashish rasmi va katalog tavsif shabloni (`seo` guruhi). */
const SettingsSeo: FC = () => {
  const cfg = useSiteConfig();
  const content = useSiteContent('seo');
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const config = cfg.config;

  async function save() {
    setBusy(true);
    try {
      if (cfg.dirty) await cfg.save();
      if (content.dirty) await content.save();
      toast("Saqlandi · saytda 1–5 daqiqada ko'rinadi");
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  const dirty = cfg.dirty || content.dirty;
  const error = cfg.error || content.error;

  return (
    <Page
      title="SEO"
      description="Qidiruv tizimlari va ijtimoiy tarmoqlarda sayt qanday ko'rinadi."
      dirty={dirty}
      actions={<Button onClick={save} disabled={!dirty || busy}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>}
    >
      <SectionTabs section="settings" active="seo" />
      {error ? <EmptyState title="Sozlamalar yuklanmadi" text={error} />
        : !config || !content.loaded ? <Skeleton rows={8} />
        : (
          <div className="flex flex-col gap-4">
            <Card title="Sarlavha va tavsif">
              <div className="flex flex-col gap-4">
                <Field label="Sarlavha qo'shimchasi" hint="Har bir sahifa sarlavhasi oxiriga qo'shiladi; bo'sh qolsa do'kon nomi ishlatiladi">
                  <Input value={config.seoTitleSuffix} onChange={(v) => cfg.set('seoTitleSuffix', v)} />
                </Field>
                <Field label="Bosh sahifa tavsifi" hint="Google natijalarida sayt ostidagi matn">
                  <Textarea value={config.seoDescription} onChange={(v) => cfg.set('seoDescription', v)} rows={3} />
                </Field>
              </div>
            </Card>
            <Card title="Ulashish rasmi" description="Havola Telegram, WhatsApp yoki ijtimoiy tarmoqda tashlanganda shu rasm chiqadi. 1200×630, PNG yoki JPG — rasm o'zgarishsiz yuklanadi.">
              <ImageUploader
                label="Ulashish rasmi"
                images={config.ogImage ? [config.ogImage] : []}
                onChange={(next) => cfg.set('ogImage', next[0] ?? '')}
                normalize={false}
                accept="image/png,image/jpeg"
              />
              <p className="mt-1 text-label text-muted-2">Bo'sh qolsa ulashishda rasm ko'rsatilmaydi.</p>
            </Card>
            <ContentFields content={content} />
          </div>
        )}
    </Page>
  );
};

export default SettingsSeo;
```

- [ ] **Step 2: Navigatsiya va ulash**

`src/admin/nav.ts`:
- lucide importiga `Search` qo'shing (alifbo tartibida `Receipt`dan keyin): `… Receipt, Search, Settings, …`.
- Sozlamalar tablarida "Integratsiyalar"dan keyin:

```ts
      { id: 'seo', segment: 'seo', label: 'SEO', Icon: Search, ownPage: true },
```

`src/admin/AdminApp.tsx`:
- Importlarga (`import SettingsContact from './screens/SettingsContact';` qatoridan keyin):

```tsx
import SettingsSeo from './screens/SettingsSeo';
```

- `screenFor`da `case 'settings/integrations'` blokidan keyin:

```tsx
    case 'settings/seo': return <SettingsSeo />;
```

- [ ] **Step 3: Lint va testlar**

Run: `bun run lint && bun run test`
Expected: lint exit 0; `Test Files 33 passed (33)`, `Tests 361 passed (361)`.

- [ ] **Step 4: `CLAUDE.md`**

Eski (admin bo'limidagi 4b xatboshisining oxiri):

```text
Sozlamalar ekranlari hali eski (5-bosqich); quyidagi tavsifning o'sha qismlari eski ekranlar haqida.
```

Yangi:

```text
**5a (2026-09-18) — Sozlamalarning sayt tablari:** `Do'kon` (`screens/SettingsStore.tsx` — nom, narx rejimi segmenti, logo/wordmark/favicon va `store` guruhidagi va'dalar), `Aloqa` (`SettingsContact.tsx` — bitta telefon maydoni: egasi ko'rinishini yozadi, `phone` client'da `phoneFromDisplay` bilan chiqariladi; Telegram/Instagram/WhatsApp, xarita koordinatasi, `contact` guruhidagi manzil va ish vaqti; «Manzil yozuvi» maydoni olib tashlandi, ustun tegilmaydi) va `SEO` (`SettingsSeo.tsx` — sarlavha qo'shimchasi, bosh sahifa tavsifi, ulashish rasmi (o'zgarishsiz PNG/JPG) va `seo` guruhidagi katalog shabloni). `site_config` formasi `useSiteConfig` hook'ida (yuklash, qoralama, `PUT`); ko'rsatilmagan maydonlar qoralamada saqlanib, `PUT`da qaytariladi. `ContentFields` `only` propi bilan bitta guruhning kartalari ekranda ajratiladi. To'lov, Integratsiyalar va Akkaunt tablari hali eski (5b); quyidagi tavsifning o'sha qismlari eski ekranlar haqida.
```

- [ ] **Step 5: Spec — 5a qarorlari**

`docs/superpowers/specs/2026-09-15-admin-redesign-design.md` — 4b qarorlari xatboshisidan keyin (u `kontent ro'yxatlarida qidiruv faqat Blog'da.` bilan tugaydi) yangi xatboshi qo'shing:

```text

5a qarorlari (2026-09-18): Sozlamalarning har tabi bitta `site_config` yozuvining bir qismini ko'rsatadi — forma `useSiteConfig`
hook'ida, ko'rsatilmagan maydonlar (sirlar, `mapLabel`) qoralamada saqlanib `PUT`da qaytariladi; eski `SiteConfigForm` 5b gacha
Integratsiyalar tabida qoladi (aks holda bot/Billz/OAuth maydonlari ochilmay qolardi); telefon bitta maydon (`phoneFromDisplay`);
ulashish rasmi va favicon o'zgarishsiz yuklanadi (WebP ijtimoiy oldindan ko'rishda ishonchsiz), yuklagich endi `accept` bo'yicha
ham filtrlaydi.
```

- [ ] **Step 6: Commit**

```bash
git add src/admin/screens/SettingsSeo.tsx src/admin/nav.ts src/admin/AdminApp.tsx CLAUDE.md docs/superpowers/specs/2026-09-15-admin-redesign-design.md
git commit -m "feat(admin): Sozlamalar → SEO tabi; hujjat

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 7 (controller): brauzer**

1. `/admin/settings/seo`: kartalar `Sarlavha va tavsif`, `Ulashish rasmi`, `Katalog sahifalari`; mavjud `ogImage` eskizda ko'rinadi.
2. Sarlavha qo'shimchasini o'zgartirish → saqlash → `/` HTML `<title>` oxiri yangilanadi → qaytarish.
3. `Tavsif shabloni`dagi `{title}`/`{store}`ni saqlab matnni o'zgartirish → saqlash → `/katalog` HTML'idagi `meta[name=description]` yangi shablon bo'yicha → bo'shatib qaytarish.
4. Ulashish rasmiga PNG yuklash → yo'l `.png` bilan tugaydi (WebP emas) → saqlash → `/` HTML'ida `og:image` shu yo'l; eski qiymatni qaytarish va yuklangan faylni diskdan o'chirish.
5. Sozlamalar tablari: Do'kon · Aloqa · To'lov va kurs · Integratsiyalar · SEO · Akkaunt (mobilda `SectionTabs`da hammasi ko'rinadi).
6. Integratsiyalar tabi hali eski forma + Billz paneli bilan ochiladi (5b gacha shunday).

---

## O'z-o'zini tekshirish (reja yozilgandan keyin)

- **Spec qamrovi:** §5 Sozlamalar → Do'kon (nom, logo, wordmark, favicon, to'lov rejimi, «Va'dalar va matnlar») — T1; Aloqa (bitta telefon, TG/IG/WA, manzil 2 qator uz/ru, ish vaqti, Google uchun ish vaqti, xarita koordinatasi, «Manzil yozuvi» yo'q) — T2; SEO (sarlavha qo'shimchasi, bosh sahifa tavsifi, OG rasm yuklash, `metaCatalogDesc`) — T3. To'lov va kurs, Integratsiyalar, Akkaunt — 5b. §4 forma qoidalari — har uch ekranda. §9 `phoneFromDisplay` testi — T1.
- **Tiplar izchilligi:** `useSiteConfig().set` `keyof ApiSiteConfig` bilan tiplangan; `paymentMode` `PaymentMode`ga cast qilinadi (`Segmented` string beradi); `ContentFields` `only` — bo'lim sarlavhalari (`contentSections` qaytargan `title`lar: `Logo va favicon`, `Mahsulot sahifasi`, `Buyurtma va cookie`, `Manzil va ish vaqti`, `Katalog sahifalari`).
- **Test sonlari:** T1 +2 (33 fayl / 361), T2/T3 o'zgarmaydi.
- **Placeholder:** yo'q — har kod qadami to'liq kod yoki aniq eski → yangi matn bilan.
