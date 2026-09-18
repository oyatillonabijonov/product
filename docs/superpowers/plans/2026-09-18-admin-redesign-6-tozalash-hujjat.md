# Admin qayta qurilishi — 6-bosqich: tozalash va hujjat

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin qayta qurilishini yopish — yakuniy reviewlarda qoldirilgan mayda sayqal, egasi qo'llanmasini yangi admin bo'yicha qayta yozish va `CLAUDE.md` / spec'dagi eskirgan qatorlarni tuzatish.

**Architecture:** Yangi mexanizm yo'q. T1 — uchta ekrandagi kichik xatti-harakat tuzatishlari (holat xatosi ko'rinadi, ikki marta bosish to'siladi, saqlanmagan o'zgarish ogohlantiriladi). T2 va T3 — faqat hujjat: `docs/egasi-qollanmasi.md` to'liq qayta yoziladi, `CLAUDE.md`ning oltita eskirgan qatori va spec §10 tuzatiladi.

**Tech Stack:** React 19 + React Router v7 (admin — klient SPA), TypeScript (strict, `any` yo'q), Tailwind tokenlari, vitest, bun.

**Spec:** `docs/superpowers/specs/2026-09-15-admin-redesign-design.md` (§10 6-bosqich: "Tozalash + hujjat — eski komponentlar o'chadi, `CLAUDE.md`, `docs/egasi-qollanmasi.md`").

## Global Constraints

- Javob va hujjatlar **o'zbek tilida**; admin UI ham faqat o'zbekcha.
- Strict TypeScript, **`any` yo'q**. `@types/react` yo'q: `useState(x as T)` + o'qishda cast, hook generiklari ishlatilmaydi, `key` faqat native element yoki `FC<{…}>` komponentda.
- Dizayn tokenlari: hex rang yozilmaydi (`#25D366` va `white` istisno), `text-[Npx]` yo'q, `shadow-*` yo'q, bosiladigan elementda `press`, admin'da `bg-white`/`text-white` yo'q.
- `bun` ishlatiladi, `npm` emas. Har task oxirida `bun run lint && bun run test` yashil (33 fayl / 365 test).
- Mavjud migratsiya fayllari o'zgartirilmaydi; yangi migratsiya bu bosqichda yo'q.
- Commit trailer: `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- `git add -A` **ishlatilmaydi** — ish daraxtida bosqichga aloqasiz `public/products/iphone/` bor. Har commit'da fayllar aniq sanaladi.
- Faqat so'ralgan qatorlarga tegiladi: yondosh kod, izoh yoki formatlash "yaxshilanmaydi".

## Fayl xaritasi

- O'zgaradi: `src/admin/screens/SettingsIntegrations.tsx`, `src/admin/screens/SettingsAccount.tsx`, `src/admin/useSiteConfig.ts` (T1); `docs/egasi-qollanmasi.md` (T2); `CLAUDE.md`, `docs/superpowers/specs/2026-09-15-admin-redesign-design.md`, `app/routes/../root.tsx` → `app/root.tsx` (T3).
- Yangi fayl yo'q, o'chiriladigan fayl yo'q: eski admin komponentlari (`SettingsForm`, `SiteConfigForm`, `BillzPanel`, `AccountForm`, `*List`/`*Form`) 2b–5b bosqichlarida allaqachon o'chirilgan; `src/`da ulardan hech narsa qolmagan (tekshirildi).

---

### Task 1: Admin sayqali — holat xatosi, ikki marta bosish, saqlanmagan o'zgarish

Yakuniy reviewlarda 6-bosqichga qoldirilgan mayda topilmalar.

**Files:**
- Modify: `src/admin/screens/SettingsIntegrations.tsx`
- Modify: `src/admin/screens/SettingsAccount.tsx`
- Modify: `src/admin/useSiteConfig.ts`
- Test: yangi test yo'q (uchala o'zgarish — ekran holati; loyihada komponent testi yuritilmaydi, `bun run test` faqat sof mantiqni qamraydi)

**Interfaces:**
- Consumes: `useSiteConfig()` (`src/admin/useSiteConfig.ts`) — `{ loaded, error, config, set, dirty, save }`; `Page` (`src/admin/ui/layout.tsx`) `dirty` propi navigatsiya tasdig'i va `beforeunload`ni yoqadi.
- Produces: `useSiteConfig().dirty` endi **haqiqiy farq** (asl qiymat bilan solishtirish), sticky bayroq emas — Sozlamalarning beshta tabi (`SettingsStore`, `SettingsContact`, `SettingsSeo`, `SettingsIntegrations`) shu qiymatdan foydalanadi, ularning kodi o'zgarmaydi.

- [ ] **Step 1: `useSiteConfig` — haqiqiy `dirty`**

`src/admin/useSiteConfig.ts`da `dirty` hozir `set` chaqirilishi bilan `true` bo'lib qoladi va qiymat asliga qaytsa ham `true` turadi — natijada Saqlash tugmasi yonib turadi va sahifadan chiqishda ortiqcha ogohlantirish chiqadi.

Faylni **to'liq** shu holatga keltiring:

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
 * Bitta admin nazarda tutilgan: ikki tabda (yoki ikki qurilmada) parallel tahrirda oxirgi saqlash butun qatorni yozadi.
 */
export function useSiteConfig(): SiteConfigState {
  const [rawConfig, setConfig] = useState(null as ApiSiteConfig | null);
  const config = rawConfig as ApiSiteConfig | null;
  // Saqlangan holat — `dirty` shu bilan solishtirishdan chiqadi, aks holda qiymat asliga qaytsa ham "o'zgargan" bo'lib qolardi.
  const [rawSaved, setSaved] = useState('');
  const saved = rawSaved as string;
  const [error, setError] = useState('');

  useEffect(() => {
    getSiteConfig()
      .then((c) => { setConfig(c); setSaved(JSON.stringify(c)); })
      .catch(() => setError("Sahifani yangilab qayta urinib ko'ring"));
  }, []);

  return {
    loaded: config !== null,
    error: error as string,
    config,
    dirty: config !== null && JSON.stringify(config) !== saved,
    set: (key, value) => setConfig((c: ApiSiteConfig | null) => (c ? { ...c, [key]: value } : c)),
    save: async () => {
      if (!config) return;
      const next = await updateSiteConfig(config);
      setConfig(next);
      setSaved(JSON.stringify(next));
    },
  };
}
```

Diqqat: `JSON.stringify` maydon tartibiga bog'liq — `set` `{ ...c, [key]: value }` qilgani uchun tartib o'zgarmaydi, `save` esa serverning javobini yangi asl deb oladi.

- [ ] **Step 2: Lint va test**

Run: `bun run lint && bun run test`
Expected: lint 0 xato; 33 fayl / 365 test yashil.

- [ ] **Step 3: `SettingsIntegrations` — Billz holati xatosi ko'rinadi, «Sinxronlash» ikki marta bosilmaydi**

`src/admin/screens/SettingsIntegrations.tsx`:

(a) `shopsBusy` qatoridan keyin ikkita yangi holat qo'shing (16–20-qatorlar atrofi):

```tsx
  const [rawStatusError, setStatusError] = useState('');
  const statusError = rawStatusError as string;
  const [syncBusy, setSyncBusy] = useState(false);
```

(b) `loadStatus` xatoni yutmasin:

```tsx
  function loadStatus() {
    getBillzStatus()
      .then((s) => { setStatus(s); setStatusError(''); })
      .catch((e) => setStatusError(errText(e)));
  }
```

(c) `sync()`ga `busy` qo'riqlovi (Dashboard'dagi naqsh bilan bir xil):

```tsx
  async function sync() {
    setSyncBusy(true);
    try {
      await runBillzSync();
      toast('Sinxronizatsiya boshlandi');
      loadStatus();
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setSyncBusy(false);
    }
  }
```

(d) tugmaning `disabled` sharti:

```tsx
                <Button variant="secondary" onClick={sync} disabled={!status?.configured || status.running || syncBusy}>Sinxronlash</Button>
```

(e) holat qatorining birinchi shoxi — xato bo'lsa jim qolmaydi:

```tsx
              <p className="mt-3 text-label text-muted-2">
                {statusError ? `Holat o'qilmadi: ${statusError}`
                  : !status ? 'Holat yuklanmoqda…'
```

(qolgan shoxlar — `!status.configured`, `running`, `!last`, `last.ok` — o'zgarishsiz qoladi).

- [ ] **Step 4: `SettingsAccount` — saqlanmagan o'zgarish ogohlantiriladi**

`src/admin/screens/SettingsAccount.tsx`: hozir `Page`ga `dirty` berilmagan (spec §4.1 har formada saqlanmagan o'zgarish ogohlantirishini talab qiladi), Saqlash esa faqat joriy parolga bog'liq — hech narsa o'zgartirmay saqlansa server `nothing_to_update` xatosini qaytaradi.

(a) yuklangan qiymatlarni eslab qoling — `error` holatidan keyin:

```tsx
  const [rawBase, setBase] = useState({ username: '', googleEmail: '' });
  const base = rawBase as { username: string; googleEmail: string };
```

(b) yuklashda va saqlashdan keyin `base`ni yangilang:

```tsx
  useEffect(() => {
    getAccount()
      .then((a) => {
        setUsername(a.username);
        setGoogleEmail(a.adminGoogleEmail);
        setBase({ username: a.username, googleEmail: a.adminGoogleEmail });
        setLoaded(true);
      })
      .catch(() => setError("Sahifani yangilab qayta urinib ko'ring"));
  }, []);
```

`save()`da `setCurrentPassword('')` va `setNewPassword('')` yonida:

```tsx
      setBase({ username: (username as string).trim(), googleEmail: (googleEmail as string).trim() });
```

(c) `canSave` o'rniga ikki qiymat:

```tsx
  const dirty = (username as string).trim() !== base.username
    || (googleEmail as string).trim() !== base.googleEmail
    || (newPassword as string) !== '';
  const canSave = !busy && dirty && (currentPassword as string) !== '';
```

(d) `Page`ga `dirty` propini bering (`description`dan keyin, `actions`dan oldin):

```tsx
      dirty={dirty}
```

- [ ] **Step 5: Lint va test**

Run: `bun run lint && bun run test`
Expected: lint 0 xato; 33 fayl / 365 test yashil.

- [ ] **Step 6: Commit**

```bash
git add src/admin/useSiteConfig.ts src/admin/screens/SettingsIntegrations.tsx src/admin/screens/SettingsAccount.tsx
git commit -m "$(cat <<'MSG'
fix(admin): haqiqiy "o'zgardi" holati, Billz holati xatosi va sinxronlash qo'riqlovi

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 2: Egasi qo'llanmasi — yangi admin bo'yicha qayta yozish

`docs/egasi-qollanmasi.md` hali eski panelni tasvirlaydi: "Sozlamalar → Dollar kursi"ni haftada bir yangilashni aytadi (endi ustama bilan avtomatik), egasini mavjud bo'lmagan "Sayt ma'lumotlari" tabiga yo'llaydi va Kontent bo'limi haqida umuman gapirmaydi.

**Files:**
- Modify: `docs/egasi-qollanmasi.md` (to'liq almashtiriladi)
- Test: yo'q (hujjat)

**Interfaces:**
- Consumes: admin navigatsiyasi `src/admin/nav.ts`dagi yorliqlar bilan **so'zma-so'z** bir xil bo'lishi shart: bo'limlar — Bosh sahifa · Mahsulotlar · Buyurtmalar · Kontent · Sozlamalar; Mahsulotlar tablari — Mahsulotlar/Turlar/Kategoriyalar/Brendlar/Modellar; Buyurtmalar — Buyurtmalar/Ish arizalari; Kontent — Bosh sahifa/Bannerlar/Yangiliklar/Blog/Sahifalar/Vakansiyalar; Sozlamalar — Do'kon/Aloqa/To'lov va kurs/Integratsiyalar/SEO/Akkaunt.
- Produces: yo'q (boshqa hujjat bu faylga havola qilmaydi).

- [ ] **Step 1: Faylni to'liq yangi matn bilan almashtiring**

`docs/egasi-qollanmasi.md` mazmuni **aynan** shu bo'lsin:

```markdown
# ProDuct sayti — egasi uchun qo'llanma

Bir sahifa. Sayt o'zi ishlaydi; sizdan faqat shu yerdagi narsalar kutiladi.

Admin: saytingiz manzili + `/admin`. Chapda beshta bo'lim: **Bosh sahifa · Mahsulotlar · Buyurtmalar · Kontent · Sozlamalar** (telefonda — pastdagi qator).

## 1. Kunni Bosh sahifadan boshlang

Bosh sahifada faqat harakat talab qiladigan narsa turadi: **Rasm kerak** (rasmi yo'qligi uchun saytda ko'rinmayotgan tovarlar — bosilsa o'sha ro'yxat ochiladi), **Yangi buyurtmalar**, **Yangi arizalar**, **Billz** (oxirgi sinxronizatsiya) va **Dollar kursi**. Bo'sh bo'lsa — qiladigan ish yo'q.

## 2. Tovar saytda qanday paydo bo'ladi

Sayt tovarlarni **Billz**dan oladi (har 30 daqiqada, o'zi). Tovar saytda ko'rinishi uchun Billz'da uchta narsa bo'lishi shart:

1. **Rasm** — Billz'da rasmsiz tovar saytga tushadi, lekin ko'rinmaydi. Rasmni Billz'ga yuklang (bir marta) yoki admin → Mahsulotlar → «Rasm kerak» ro'yxatidan saytning o'zida yuklang.
2. **Qoldiq > 0** — qoldiq nolga tushsa tovar o'zi yashirinadi, qaytsa o'zi chiqadi.
3. **«Nad Kategoriya»** maydoni: `Apple`, `PC`, `Audio` yoki `Video`. Bo'sh bo'lsa tovar hech qaysi bo'limga tushmaydi.

Bir xil nomdagi Billz yozuvlari (har dona alohida) saytda **bitta** tovar bo'lib chiqadi, qoldig'i yig'iladi. Shuning uchun nomni bir xil yozing: «MacBook Pro 14" …» va «MacBook Pro 14inch …» ikkita alohida tovar bo'ladi.

Billz'dagi kategoriya nomi (iPhone, MacBook, Laptop, Processor, Microphone…) saytdagi **tur**ga aylanadi. Tanimagan nomi bo'lsa tovar bo'limda turadi, lekin tur bo'yicha filtrda chiqmaydi — buni o'zingiz tuzatasiz: **Mahsulotlar → Turlar**'da tegishli turni oching, «Billz aliaslari»ga o'sha nomni yozib Enter bosing, so'ng Saqlash; keyingi sinxronizatsiyada tovar joyiga tushadi.

## 3. Narx va dollar kursi

Billz'da narx dollarda, saytda so'mda. Hammasi **Sozlamalar → To'lov va kurs**da:

- **Dollar kursi** — «Ustama (%)» ga bir marta raqam yozing (masalan 2). Sayt Markaziy bank kursini har 6 soatda o'zi oladi va ustama qo'shib do'kon kursini hisoblaydi; endi kursni qo'lda yangilash shart emas. Ustamani bo'sh qoldirsangiz kursni o'zingiz yozasiz va u o'zi o'zgarmaydi.
- **Boshlang'ich to'lov** — mahsulot sahifasidagi slayder shu oraliqda suriladi.
- **Muddatlar va ustama** — muddatli to'lov qatorlari. Har qator yonida 10 mln so'mlik tovar uchun namunaviy oylik to'lov ko'rinadi: raqamni o'zgartirsangiz namunasi darhol yangilanadi, shuning uchun saqlashdan oldin natijani ko'rasiz.

Billz'da «promo narx» qo'ysangiz saytda chegirma (eski narx chizilgan) va «Chegirmalar» sahifasi o'zi paydo bo'ladi.

## 4. Buyurtmalar

Mijoz saytda ism va telefon qoldiradi. Buyurtma ikki joyga tushadi: **Telegram guruhingizga** (bot orqali) va admin → **Buyurtmalar**ga. Operator 30 daqiqa ichida qo'ng'iroq qilib narxni tasdiqlaydi (sayt shuni va'da qiladi). Statusni admin'da o'zgartiring: Yangi → Bog'lanildi → Bajarildi. Konsultatsiya arizalari shu ro'yxatda «Konsultatsiya» belgisi bilan turadi.

Vakansiyaga kelgan arizalar alohida: **Buyurtmalar → Ish arizalari**.

## 5. Sayt matnlari va rasmlari — Kontent

Saytdagi deyarli har bir matn va rasm admin'da tahrirlanadi. Maydonni bo'shatsangiz standart matn qaytadi.

- **Kontent → Bosh sahifa** — to'rt yo'nalish kartasi (nom, rasm, poster va ikkitagacha video), xizmat va'dalari, konsultatsiya bloki, bo'lim sarlavhalari.
- **Kontent → Sahifalar** — Shartlar, FAQ, Biz haqimizda, Trade-In, Qaytarish, Ommaviy oferta, Maxfiylik. «Biz haqimizda» alohida forma (matnlar va to'rtta foto), huquqiy sahifalarda «Qisqa izoh» sarlavha ostida chiqadi. Matn oddiy belgilar bilan yoziladi: `## Sarlavha`, `- ro'yxat`, `1. band`, `**qalin**`. Ikki tilda (uz/ru); ruscha sarlavha bo'sh qolsa o'zbekchasi ishlatiladi.
- **Kontent → Yangiliklar** — bosh sahifadagi uchta plitka. **Blog** — maqolalar. **Bannerlar** — bosh sahifada hero'dan keyin chiqadigan aksiya rasmlari (1200×400 atrofida); bo'sh bo'lsa hech narsa ko'rinmaydi.
- **Kontent → Vakansiyalar** — lavozimlar ro'yxati; «Sahifa matni» kartasida vakansiyalar sahifasining matni va ikkita fotosi.

**Birinchi kunlardayoq to'ldiring:** Oferta va Maxfiylik sahifalarida `[MCHJ / YaTT nomi]` va `[STIR raqami]` qavslari bor — o'z rekvizitlaringizni yozing.

## 6. Sozlamalar

- **Do'kon** — do'kon nomi, narx rejimi (naqd / muddatli / ikkalasi), logo (yorug' va qorong'i mavzu uchun) va favicon, mahsulot sahifasidagi va'dalar, buyurtma va cookie matnlari.
- **Aloqa** — telefon (qanday yozsangiz saytda shunday chiqadi), Telegram, Instagram, WhatsApp, manzil, ish vaqti, xarita koordinatasi. Bo'sh qoldirilgan havola saytda umuman chiqmaydi.
- **To'lov va kurs** — 3-bo'limga qarang.
- **Integratsiyalar** — Billz kaliti va do'koni (+ «Sinxronlash» tugmasi va oxirgi natija), buyurtma xabarnomasi uchun Telegram bot tokeni va guruh chat id, mijoz kirishi (Google / Telegram), Yandex Metrica hisoblagichi.
- **SEO** — sarlavha qo'shimchasi, bosh sahifa tavsifi, ulashish rasmi (havola Telegram yoki ijtimoiy tarmoqda tashlanganda ko'rinadi), katalog sahifalari uchun tavsif shabloni.
- **Akkaunt** — login va parol. Standart `admin/admin` parolini birinchi kuni o'zgartiring; har o'zgarish joriy parol bilan tasdiqlanadi va parol almashgach barcha ochiq sessiyalar bekor bo'ladi.

## 7. Sharhlar

Sayt o'zi sharh yig'maydi. Admin → **Mahsulotlar** → tovarni oching → «Reyting va sharhlar» kartasi: muallif, baho, matn, sana. Reyting o'zi hisoblanadi. Sharhsiz tovarda yulduzcha ko'rinmaydi.

## 8. Mijoz akkauntlari

Mijozlar ro'yxatdan o'tmasdan buyurtma beradi. Google/Telegram orqali kirish faqat **Sozlamalar → Integratsiyalar**da Google Client ID yoki Telegram login boti kiritilgan bo'lsa ko'rinadi. Kiritilmagan bo'lsa saytda «Kirish» tugmasi umuman yo'q — bu normal.

## 9. Zaxira nusxa

Server har kuni bazaning nusxasini `data/backups/` papkasiga oladi (oxirgi 7 kun). Oyda bir marta shu papkani va `data/images/` ni kompyuteringizga ko'chirib oling — bu sizning butun saytingiz.

## 10. Kimga murojaat qilish

- Tovar saytda ko'rinmayapti → 2-bo'limdagi uchta shartni tekshiring.
- Narx noto'g'ri → kurs (3-bo'lim) yoki Billz'dagi narx.
- Buyurtma Telegramga kelmayapti → bot token va chat id (Sozlamalar → Integratsiyalar); buyurtma baribir admin'da turadi.
- Matnni o'zgartirdim, saytda eskisi turibdi → 1–5 daqiqa kuting, sahifa keshi shuncha vaqtda yangilanadi.
- Boshqa hamma narsa → dasturchi.
```

- [ ] **Step 2: Eskirgan yo'llanma qolmaganini tekshiring**

Run: `grep -n "Sayt ma'lumotlari\|Dollar kursi maydonida\|haftada bir" docs/egasi-qollanmasi.md`
Expected: hech narsa topilmaydi (chiqish bo'sh, `grep` 1 qaytaradi).

- [ ] **Step 3: Commit**

```bash
git add docs/egasi-qollanmasi.md
git commit -m "$(cat <<'MSG'
docs: egasi qo'llanmasi yangi admin bo'yicha qayta yozildi

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 3: Dasturchi hujjatlari — `CLAUDE.md` va spec

Yakuniy review `CLAUDE.md`ni "o'z-o'ziga zid" deb belgiladi: 5b xatboshisi eski formalar o'chirilganini yozadi, boshqa oltita qator esa ularni hali tirik deb tasvirlaydi. Qatorlar aniq: **74, 79, 96, 102, 106, 127**.

**Files:**
- Modify: `CLAUDE.md` (oltita qator + admin xatboshisining yakuni)
- Modify: `docs/superpowers/specs/2026-09-15-admin-redesign-design.md` (§10 holati)
- Modify: `app/root.tsx` (24-qatordagi izoh)
- Test: yo'q (hujjat va bitta izoh)

**Interfaces:**
- Consumes: T1'dagi o'zgarishlar (`CLAUDE.md` yakunida eslatilmaydi — ular xatti-harakat sayqali, hujjatga tushadigan yangi qoida emas).
- Produces: yo'q.

- [ ] **Step 1: `CLAUDE.md` — Billz xatboshisidagi ikki qator**

74-qatorning oxiridagi:

```
Admin `BillzPanel`da bitta "Sinxronlash" tugmasi, API `POST` body'siz.
```

→

```
Admin Sozlamalar → Integratsiyalar'da bitta "Sinxronlash" tugmasi, API `POST` body'siz.
```

79-qatorning boshidagi:

```
- **Admin:** "Sayt ma'lumotlari" → "Billz (ombor va narxlar)" guruhi (kalit + "Do'konlarni yuklash" select); Sozlamalarda `BillzPanel` (holat, "Sinxronlash"/"To'liq sinxronlash", ishlayotganda 3 s polling);
```

→

```
- **Admin:** Sozlamalar → Integratsiyalar → "Billz (ombor va narxlar)" kartasi (kalit + "Do'konlarni yuklash" select + holat qatori + "Sinxronlash", ishlayotganda 3 s polling);
```

(qatorning qolgan qismi — "mahsulotlar ro'yxatida "Billz" / "Rasm kerak" / "Qoldiq 0" belgilari…" — o'zgarishsiz).

- [ ] **Step 2: `CLAUDE.md` — 96, 106, 127-qatorlar**

96-qator:

```
- **Setup the store owner must do** for these to work (admin "Sayt ma'lumotlari" tab):
```

→

```
- **Setup the store owner must do** for these to work (admin Sozlamalar → Integratsiyalar):
```

106-qator:

```
Secret site-config fields (bot token, OAuth secret) render as `type="password"` in `SiteConfigForm`.
```

→

```
Secret site-config fields (bot token, OAuth secret, Billz kaliti) render as `type="password"` in `SettingsIntegrations`.
```

127-qator:

```
**A rebrand = `@theme` values + `app/lib/site.config.ts` (or the admin "Sayt ma'lumotlari" tab) + logo/images — never component code.**
```

→

```
**A rebrand = `@theme` values + `app/lib/site.config.ts` (or the admin Sozlamalar bo'limi) + logo/images — never component code.**
```

- [ ] **Step 3: `CLAUDE.md` — 102-qatordagi bo'limlar ro'yxati**

102-qatorning oxiridagi Settings tavsifi:

```
Settings (calculator + **dollar kursi** (Markaziy bank + "Ustama (%)", bo'sh bo'lsa qo'lda kurs) + **Billz paneli** (`BillzPanel`) + site-config + **account** login/password change via `AccountForm`).
```

→

```
Sozlamalar (olti tab: Do'kon · Aloqa · To'lov va kurs (kalkulyator + **dollar kursi**: Markaziy bank + "Ustama (%)", bo'sh bo'lsa qo'lda kurs) · Integratsiyalar (Billz kartasi + holat + "Sinxronlash", bot, mijoz kirishi, Metrica) · SEO · Akkaunt).
```

- [ ] **Step 4: `CLAUDE.md` — admin xatboshisining yakuni**

Admin bo'limining 5b jumlasi (`**5b (2026-09-18) — Sozlamalarning operatsion tablari:** …`) shu gap bilan tugaydi:

```
Shu bilan admin butunlay yangi kitda — eski `SettingsForm`, `SiteConfigForm`, `BillzPanel`, `AccountForm` o'chirildi.
```

Uning ortidan yangi jumla qo'shing (xuddi shu xatboshida, yangi qator emas):

```
**6 (2026-09-18) — yakun:** olti bosqich tugadi, `src/admin/`da eski forma qolmadi (33 ekran + 18 umumiy fayl); `useSiteConfig`ning "o'zgardi" holati asl qiymat bilan solishtiriladi, Integratsiyalarda Billz holati xatosi ko'rsatiladi va "Sinxronlash" ikki marta bosilmaydi, Akkaunt saqlanmagan o'zgarishda ogohlantiradi; egasi qo'llanmasi (`docs/egasi-qollanmasi.md`) yangi admin bo'yicha qayta yozildi.
```

- [ ] **Step 5: Spec §10 — bosqichlar holati**

`docs/superpowers/specs/2026-09-15-admin-redesign-design.md`, "## 10. Bosqichlar" sarlavhasi ostidagi kirish qatoriga (ro'yxatdan oldin) shu qatorni qo'shing:

```
**Holat (2026-09-18): oltala bosqich bajarildi** — 1 qobiq, 2 mahsulotlar, 3 buyurtmalar, 4a/4b kontent, 5a/5b sozlamalar, 6 tozalash va hujjat.
```

Ro'yxatning 6-bandi oxiriga qo'shing:

```
Eski komponentlar bosqichma-bosqich (2b, 3, 4b, 5b) o'chirilgani uchun bu bosqichda o'chiriladigan fayl qolmadi.
```

- [ ] **Step 6: `app/root.tsx` izohi**

24-qatordagi:

```ts
  // Yandex Metrica — faqat hisoblagich sozlanganda (admin "Sayt ma'lumotlari") va
```

→

```ts
  // Yandex Metrica — faqat hisoblagich sozlanganda (admin Sozlamalar → Integratsiyalar) va
```

- [ ] **Step 7: Eskirgan havola qolmaganini tekshiring**

Run: `grep -rn --include="*.ts" --include="*.tsx" -E "SettingsForm|SiteConfigForm|BillzPanel|AccountForm|Sayt ma.lumotlari" src app shared functions server; grep -n -E "BillzPanel|SiteConfigForm|AccountForm|Sayt ma.lumotlari" CLAUDE.md`
Expected: ikkala `grep` ham hech narsa topmaydi (eski plan/spec fayllari — tarix, ularga tegilmaydi).

- [ ] **Step 8: Lint va test**

Run: `bun run lint && bun run test`
Expected: lint 0 xato; 33 fayl / 365 test yashil.

- [ ] **Step 9: Commit**

```bash
git add CLAUDE.md docs/superpowers/specs/2026-09-15-admin-redesign-design.md app/root.tsx
git commit -m "$(cat <<'MSG'
docs: CLAUDE.md va spec — o'chirilgan admin formalariga havolalar tuzatildi

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

## Brauzer tekshiruvi (kontroller bajaradi, implementer emas)

T1'dan keyin, `bun run dev` ochiq turgan holda (`/admin`, egasi o'zi kirgan):

1. Sozlamalar → Do'kon: bir maydonni o'zgartiring, so'ng **asl qiymatga qaytaring** — Saqlash yana o'chishi kerak (eski xatti-harakatda yonib turardi).
2. Sozlamalar → Integratsiyalar: holat qatori va «Sinxronlash» tugmasi joyida (tugma **bosilmaydi** — haqiqiy tashqi so'rov).
3. Sozlamalar → Akkaunt: loginni o'zgartiring — Saqlash hali o'chiq (joriy parol yo'q), boshqa tabga o'tishda ogohlantirish chiqadi; **parol yozilmaydi**.
