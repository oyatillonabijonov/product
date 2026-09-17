# Admin qayta qurilishi — 4b-bosqich (Kontent ekranlari) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin'ning Kontent bo'limini kit bilan qayta chizish. Unga landing muharriri, Bannerlar, Yangiliklar, Blog, Vakansiyalar (sahifa matni bilan) va Sahifalar ("Biz haqimizda" strukturali forma, huquqiy izohlar) kiradi. Qo'shimcha: video yuklagich, favicon WebP'siz yuklanadi, almashtirilgan video fayli diskdan o'chadi.

**Architecture:** Sayt matnlari va rasmlari uchun bitta forma bor: `useSiteContent(group, keys?)` hook'i va `ContentFields` komponenti. Ular 4a'dagi `GET/PUT /api/admin/texts|assets` API'si ustida ishlaydi, sof qismi `src/admin/lib/content-form.ts`da. Landing muharriri, vakansiyalar sahifasi matni, "Biz haqimizda" va huquqiy sahifalar izohi shu formadan foydalanadi. Kontent ro'yxatlari 2b naqshida quriladi: `screens/*List.tsx` + `*Edit.tsx`, id-ekran o'z `Page`ini chizadi. Faol toggle to'liq yozuvni `PUT` qiladi. Eski `*List`/`*Form` fayllari almashtirilgan task'da o'chadi.

**Tech Stack:** React Router v7 (admin SPA), `src/admin/ui` kit, lucide-react, vitest, Express + disk `ImageStore`.

**Spec:** `docs/superpowers/specs/2026-09-15-admin-redesign-design.md` (§2 YAGNI, §3 navigatsiya va "qayerda nima tahrirlanadi", §4 vizual tizim va forma qoidalari, §5 Kontent, §6 registr va API, §8 xavfsizlik, §10 4-bosqich). 4a rejasi va qoldiqlari: `docs/superpowers/plans/2026-09-17-admin-redesign-4a-kontent-mexanizmi.md` ("Natija va qoldiqlar").

## Global Constraints

- **Migratsiya yo'q;** mavjud migratsiya fayllari o'zgartirilmaydi. Yangi server endpoint yo'q — mavjud kontent CRUD va `texts`/`assets` API'si ishlatiladi.
- **Standart o'zgarmaydi:** `site_texts`/`site_assets` bo'sh bo'lsa sayt hozirgidek chiziladi.
- **Forma qoidalari (spec §4):**
  - Kit — `src/admin/ui`.
  - Bitta asosiy amal — sahifa sarlavhasidagi "Saqlash". O'zgarish bo'lmaguncha u o'chiq.
  - Muvaffaqiyat toast'i: `Saqlandi · saytda 1–5 daqiqada ko'rinadi`.
  - Yaratilgandan keyin ro'yxatga qaytiladi: `navigate(LIST, { state: { leave: true } })`.
  - O'chirish `useConfirm` bilan (`window.confirm` yo'q), `destructive` tugma.
  - Bo'sh holat `EmptyState`, yuklanish `Skeleton`.
  - Faol toggle darhol saqlanadi va toast chiqaradi.
  - Ruscha maydon ixtiyoriy.
- **Admin'da `bg-white` / `text-white` yozilmaydi** (kitdagi `Button` ichidagi mavjud `text-white` bundan mustasno).
- **Xavfsizlik (spec §8):**
  - Fayl yo'li faqat `/images/products/…`; SVG qabul qilinmaydi; video faqat `video/mp4`.
  - Diskdan faqat `products/` kaliti o'chiriladi.
  - Havolalar serverda `link_invalid` bilan tekshiriladi (o'zgarmaydi).
- **TS:** strict, `any` yo'q. `@types/react` yo'q, shuning uchun:
  - holat `useState(x as T)` bilan olinadi va o'qishda cast qilinadi;
  - hook chaqiruvida generik yozilmaydi;
  - `key` faqat native element yoki `FC<{…}>`da.
- **`server/` fayllari** Node type-stripping bilan ishlaydi: `server/`dan import `.ts` kengaytmali bo'ladi.
- **Dizayn tokenlari:** hex yo'q (ruxsat etilgan literal — `#25D366` va `white`); `text-[Npx]` yo'q; `shadow-*` yo'q; bosiladigan elementda `press`.
- **Buyruqlar:** `bun`/`bunx`, npm emas. Har task oxirida `bun run lint && bun run test` yashil bo'lishi kerak.
- **Rollar:** implementer subagent chaqirmaydi, dev server ishga tushirmaydi va brauzer tekshiruvini qilmaydi. "Brauzer" qadamlari **controller**niki (egasi Browser panelida admin'ga kirgan holda).
  - Sinov yozuvlari nomi `SINOV ` bilan boshlanadi va qadam oxirida o'chiriladi.
  - Sinov matni va fayllari standartga qaytariladi.
- **Eski fayllar:** almashtirilgan eski admin komponentlari shu task'da o'chiriladi (2b/3 amaliyoti). `src/admin/IconAction.tsx` qoladi — uni `ReviewsEditor` ishlatadi.
- **Commit trailer:** `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Rejadagi qarorlar (spec'dan farqlar)

1. **Yo'nalish kartalari:** landing muharririda har yo'nalish alohida karta ("Apple kartasi": nom, rasm, poster, 2 video). Registrda bo'lim nomi yo'nalish bo'yicha; 20 maydonli bitta karta o'rniga to'rtta.
2. **Vakansiyalar sahifasi matni:** ro'yxat tepasidagi "Sahifa matni" kartasi tugma bilan alohida ekranni ochadi (`/admin/content/vacancies/matn`). 27 matn va 2 foto karta ichida bo'lsa, lavozimlar ro'yxati ekrandan pastga surilib ketardi.
3. **Diskdan faqat almashtirilgan video fayli o'chiriladi** (`staleVideoFiles`, `ImageStore.delete`).
   - Rasm fayllari qoladi: ular kichik, proxy keshidagi sahifa esa 1–5 daqiqa eski rasmni so'rab, singan rasm ko'rsatardi.
   - Video yo'qolsa cover posterida qoladi.
   - Yuklanib, lekin saqlanmagan fayllar tozalanmaydi (6-bosqich).
4. **Yuklashdagi ishlov kalitga qarab** (`uploadOptions`):
   - Favicon o'zgarishsiz PNG — Safari WebP favicon'ni ko'rsatmaydi.
   - Logolar va "Biz haqimizda" yangiliklar rasmining chekkasi kesiladi.
   - Fotolarning chekkasi kesilmaydi va ular 2400 px gacha kichraytiriladi (`PHOTO_UPLOAD`). Bular: hero, poster, konsultatsiya, about/careers fotolari, banner, blog muqovasi va kategoriya cover'i. Kategoriya cover'i hozir 42% gacha kesilishi mumkin.
5. **Forma maydonlari joriy matn bilan to'ldiriladi** — admin o'zgartirgani, bo'lmasa standart. Maydon bo'shatilsa standart qaytadi (server `planTextWrites`).
6. **Sahifa sarlavhasining ruschasi:** bo'sh qolsa o'zbekchasi yoziladi. Server ruschani talab qiladi, spec §4 qoidasi 8 esa "ruscha ixtiyoriy" deydi.
7. **Maxsus sahifalar (`biz-haqimizda` va huquqiy):** slug maydoni o'chiq, "Xavfli zona" yo'q. Shablon slug'ga bog'langan, header'dagi "Biz haqimizda" havolasi esa qotirilgan.
8. **Faol toggle:** ro'yxatdagi toggle to'liq yozuvni `PUT` qiladi (`useActiveToggle`). Kontent route'larida `PATCH` yo'q, yangi endpoint kerak emas.
9. **Qidiruv:** kontent ro'yxatlarida qidiruv faqat Blog'da. Qolganlarida bir necha yozuv bor.
10. **`legal` guruhining karta sarlavhasi:** "Sarlavha ostidagi izoh". Spec'da bu "Qisqa izoh (hero)" — egasiga "hero" so'zi notanish.
11. **Yuklagich nomi:** `ImageUploader` o'z nomida qoladi (spec §4 `Uploader` deydi). `kind` prop'i qo'shiladi, nomini almashtirish esa 5 faylga tegardi.

## Fayl tuzilmasi

- **T1:**
  - `src/lib/site-content.ts` (+ test): hero bo'limlari, `staleVideoFiles`.
  - `src/lib/page-slugs.ts` (yangi): `ABOUT_SLUG`, `LEGAL_LEDE_KEYS`. Registrdan alohida modul, chunki sahifa route'ining client bundle'iga butun registr tushmasligi kerak.
  - `app/routes/page.tsx`: shu konstantalar bilan.
  - `shared/runtime.ts` va `server/images.ts`: `ImageStore.delete`.
  - `app/routes/api.admin.assets.tsx`: eski videoni o'chirish.
- **T2:**
  - Yangi: `src/admin/lib/content-form.ts` (+ test), `src/admin/ContentFields.tsx` (`useSiteContent`, `ContentFields`, `ContentPage`), `src/admin/SectionTabs.tsx`, `src/admin/screens/ContentHome.tsx`.
  - O'zgaradi: `src/admin/ImageUploader.tsx`, `src/admin/ui/form.tsx` (`LangPair`), `src/admin/api.ts`, `src/admin/errText.ts`, `src/admin/nav.ts`, `src/admin/AdminApp.tsx`.
- **T3:**
  - Yangi: `src/admin/useActiveToggle.ts`, `src/admin/screens/{BannersList,BannerEdit,NewsList,NewsEdit}.tsx`.
  - O'zgaradi: `src/admin/screens/CategoryEdit.tsx`, `nav.ts`, `AdminApp.tsx`.
  - O'chadi: `src/admin/{BannerList,BannerForm,NewsList,NewsForm}.tsx`.
- **T4:**
  - Yangi: `src/admin/MarkdownHelp.tsx`, `src/admin/screens/{PostsList,PostEdit,VacanciesList,VacancyEdit,VacanciesText}.tsx`.
  - O'zgaradi: `nav.ts`, `AdminApp.tsx`.
  - O'chadi: `src/admin/{PostList,PostForm,VacancyList,VacancyForm}.tsx`.
- **T5:**
  - Yangi: `src/admin/screens/{PagesList,PageEdit}.tsx`.
  - O'zgaradi: `nav.ts`, `AdminApp.tsx`, `CLAUDE.md`, spec.
  - O'chadi: `src/admin/{PageList,PageForm}.tsx`.

## Brauzer tekshiruvi yordamchilari (controller uchun)

Admin'da maydonga qiymat yozish va fayl tanlash `javascript_tool` orqali qilinadi: Browser panelida klaviatura injeksiyasi ishonchsiz.

```js
// Matn: React `input` hodisasini tinglaydi.
function setVal(el, value) {
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}
// Fayl: yuklagich ichidagi <input type="file">ga sintetik fayl.
async function pick(input, name, type) {
  let blob;
  if (type.startsWith('image/')) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const g = c.getContext('2d'); g.fillStyle = '#c00'; g.fillRect(0, 0, 64, 64);
    blob = await new Promise((r) => c.toBlob(r, type));
  } else blob = new Blob([new Uint8Array(2000)], { type });
  const dt = new DataTransfer(); dt.items.add(new File([blob], name, { type }));
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}
// Karta (sarlavhasi bo'yicha) ichidagi elementlar.
const card = (title) => [...document.querySelectorAll('section')].find((s) => s.querySelector('h2')?.textContent === title);
```

(Brauzer yordamchisidagi `#c00` — faqat sinov rasmining pikseli, kodga tushmaydi.)

---

### Task 1: Registr yangilanishi va almashtirilgan videoni diskdan o'chirish

**Files:**
- Modify: `src/lib/site-content.ts`
- Create: `src/lib/page-slugs.ts`
- Test: `src/lib/site-content.test.ts`
- Modify: `app/routes/page.tsx:1-28`
- Modify: `shared/runtime.ts` (`ImageStore`)
- Modify: `server/images.ts`
- Modify: `app/routes/api.admin.assets.tsx`

**Interfaces:**
- Consumes: 4a registri — `TEXT_FIELDS`, `ASSET_FIELDS`, `SiteAssets`, `TextKey`, `readSiteAssets(env)`, `parseAssetsInput`.
- Produces (keyingi task'lar uchun):
  - `src/lib/page-slugs.ts`:
    - `ABOUT_SLUG = 'biz-haqimizda'`;
    - `LEGAL_LEDE_KEYS: Partial<Record<string, TextKey>>` — `oferta`, `maxfiylik`, `qaytarish`, `muddatli-tolov`.
  - `staleVideoFiles(before: SiteAssets, after: SiteAssets): string[]` (`site-content.ts`).
  - `ImageStore.delete(key: string): Promise<void>`.
  - Registrdagi bo'lim nomlari: `home` guruhida `'Apple kartasi' | 'PC kartasi' | 'Audio kartasi' | 'Video kartasi' | "Xizmat va'dalari" | 'Konsultatsiya' | 'Sarlavhalar'`; `legal` guruhida `'Sarlavha ostidagi izoh'`.

- [ ] **Step 1: Failing testlarni yozish**

`src/lib/site-content.test.ts` — import qatorini almashtiring:

```ts
import { ASSET_FIELDS, ASSET_KEYS, TEXT_FIELDS, isAssetKey, mergeTexts, planTextWrites, staleVideoFiles, textOverrides } from './site-content';
import { LEGAL_LEDE_KEYS } from './page-slugs';
```

Fayl oxiriga qo'shing:

```ts
describe('staleVideoFiles', () => {
  it("almashtirilgan va olib tashlangan video fayllari o'chiriladi", () => {
    expect(staleVideoFiles(
      { 'hero.pc.video1': '/images/products/a.mp4', 'hero.pc.video2': '/images/products/b.mp4' },
      { 'hero.pc.video1': '/images/products/c.mp4' },
    )).toEqual(['products/a.mp4', 'products/b.mp4']);
  });
  it("o'zgarmagan, boshqa kalitda qolgan video va rasmlar o'chirilmaydi", () => {
    expect(staleVideoFiles(
      { 'hero.pc.video1': '/images/products/a.mp4', 'hero.pc.video2': '/images/products/b.mp4', logo: '/images/products/l.webp' },
      { 'hero.pc.video1': '/images/products/a.mp4', 'hero.audio.video1': '/images/products/b.mp4' },
    )).toEqual([]);
  });
});

describe('LEGAL_LEDE_KEYS', () => {
  it('izoh kalitlari legal guruhida', () => {
    for (const key of Object.values(LEGAL_LEDE_KEYS)) expect(TEXT_FIELDS.find((f) => f.key === key)?.group).toBe('legal');
  });
});
```

- [ ] **Step 2: Test yiqilishini ko'rish**

Run: `bunx vitest run src/lib/site-content.test.ts`
Expected: FAIL — `Failed to resolve import "./page-slugs"`.

- [ ] **Step 3: Registrni yangilash (`src/lib/site-content.ts`)**

3a. Qatorni almashtiring:

```ts
const heroCards = inSection('home', "Yo'nalish kartalari");
```

yangisi:

```ts
/** Landing'dagi har yo'nalish kartasi admin'da alohida karta: nom, rasm, poster, 2 video. */
const heroCard = (name: string) => inSection('home', `${name} kartasi`);
```

3b. `TEXT_FIELDS` boshidagi to'rt qatorni almashtiring:

```ts
  heroCards('heroApple', 'Apple kartasi', 'textarea', NEW_LINE),
  heroCards('heroPc', 'PC kartasi', 'textarea', NEW_LINE),
  heroCards('heroAudio', 'Audio kartasi', 'textarea', NEW_LINE),
  heroCards('heroVideo', 'Video kartasi', 'textarea', NEW_LINE),
```

yangisi:

```ts
  heroCard('Apple')('heroApple', 'Nomi', 'textarea', NEW_LINE),
  heroCard('PC')('heroPc', 'Nomi', 'textarea', NEW_LINE),
  heroCard('Audio')('heroAudio', 'Nomi', 'textarea', NEW_LINE),
  heroCard('Video')('heroVideo', 'Nomi', 'textarea', NEW_LINE),
```

3c. `const legal = inSection('legal', 'Hero izohi');` → `const legal = inSection('legal', 'Sarlavha ostidagi izoh');`

3d. `heroAssetFields` funksiyasini to'liq almashtiring:

```ts
function heroAssetFields(id: 'apple' | 'pc' | 'audio' | 'video', name: string): AssetField[] {
  const section = `${name} kartasi`;
  return [
    { key: `hero.${id}.image`, group: 'home', section, label: 'Rasm', kind: 'image', hint: "Landing kartasi va yo'nalish sahifasining cover'i" },
    { key: `hero.${id}.poster`, group: 'home', section, label: 'Video posteri', kind: 'image', hint: 'Video yuklanguncha turadigan kadr' },
    { key: `hero.${id}.video1`, group: 'home', section, label: '1-video', kind: 'video', hint: VIDEO_HINT },
    { key: `hero.${id}.video2`, group: 'home', section, label: '2-video', kind: 'video', hint: VIDEO_HINT },
  ];
}
```

3e. Fayl oxiriga (`planTextWrites`dan keyin) qo'shing:

```ts
/**
 * `PUT /api/admin/assets`dan keyin diskdan o'chiriladigan fayllar (ombor kaliti, `products/…`): video kalitining
 * almashtirilgan yoki olib tashlangan eski fayli, agar u boshqa kalitda ishlatilmasa. Rasmlar o'chirilmaydi — kichik,
 * proxy keshidagi sahifa (1–5 daqiqa) eski rasmni so'rab singan rasm ko'rsatardi; video yo'qolsa cover posterida qoladi.
 */
export function staleVideoFiles(before: SiteAssets, after: SiteAssets): string[] {
  const inUse = new Set(Object.values(after));
  const out = new Set<string>();
  for (const f of ASSET_FIELDS) {
    const old = before[f.key];
    if (f.kind !== 'video' || !old || old === after[f.key] || inUse.has(old) || !old.startsWith('/images/products/')) continue;
    out.add(old.slice('/images/'.length));
  }
  return [...out];
}
```

3f. Yangi fayl `src/lib/page-slugs.ts`:

```ts
import type { TextKey } from './site-content';

/** "Biz haqimizda" — markdown o'rniga `about` matnlari va fotolari bilan chiziladigan sahifa. */
export const ABOUT_SLUG = 'biz-haqimizda';

/**
 * `LegalPage` shablonidagi sahifalar: slug → sarlavha ostidagi izoh kaliti (`legal` guruhi). Registrdan alohida
 * modul — sahifa route'ining client bundle'iga butun registr (`TEXT_FIELDS`) tushmasin.
 */
export const LEGAL_LEDE_KEYS: Partial<Record<string, TextKey>> = {
  oferta: 'legalLedeOferta',
  maxfiylik: 'legalLedePrivacy',
  qaytarish: 'legalLedeReturns',
  'muddatli-tolov': 'termsLede',
};
```

- [ ] **Step 4: Testni o'tkazish**

Run: `bunx vitest run src/lib/site-content.test.ts`
Expected: PASS (11 test).

- [ ] **Step 5: `app/routes/page.tsx` — slug konstantalari**

Importlarga qo'shing (`import { firstParagraph } …` qatoridan keyin):

```ts
import { ABOUT_SLUG, LEGAL_LEDE_KEYS } from '../../src/lib/page-slugs';
```

Quyidagi ikki qatorni o'chiring:

```ts
/** "Biz haqimizda" — markdown o'rniga maxsus sahifa (matn sayt matnlarida); sarlavha va footer havolasi bazadagi yozuvdan. */
const ABOUT_SLUG = 'biz-haqimizda';
```

`legalLede` tanasini almashtiring (izoh bloki qoladi):

```ts
function legalLede(t: Translation, slug: string): string | undefined {
  const key = LEGAL_LEDE_KEYS[slug];
  return key ? t[key] : undefined;
}
```

- [ ] **Step 6: `ImageStore.delete`**

`shared/runtime.ts` — `ImageStore`dagi `put` qatoridan keyin:

```ts
  /** Faylni o'chiradi; yo'q bo'lsa jim (admin almashtirgan video — `api.admin.assets`). */
  delete(key: string): Promise<void>;
```

`server/images.ts`:
- `import { writeFile } from 'node:fs/promises';` → `import { rm, writeFile } from 'node:fs/promises';`
- Fayl boshidagi izoh blokini almashtiring. Eski:

```ts
/**
 * Disk ustidan R2 API'si — rasm va video ombori.
 *
 * Faqat `get`/`put` kerak: admin rasm yuklaydi (`api.admin.upload`), storefront
 * uni `/images/*` orqali beradi. Kalitlar `products/<uuid>.<ext>` ko'rinishida,
 * shu sabab papkadan tashqariga chiqishga yo'l qo'yilmaydi.
 */
```

Yangi:

```ts
/**
 * Disk ustidan R2 API'si — rasm va video ombori.
 *
 * `get`/`put`: admin rasm yuklaydi (`api.admin.upload`), storefront uni `/images/*`
 * orqali beradi; `delete` — admin almashtirgan video fayli (`api.admin.assets`).
 * Kalitlar `products/<uuid>.<ext>` ko'rinishida, shu sabab papkadan tashqariga
 * chiqishga yo'l qo'yilmaydi.
 */
```

- `put` metodidan keyin (`return { … }` ichida):

```ts
    async delete(key) {
      const file = pathFor(dir, key);
      if (file) await rm(file, { force: true });
    },
```

- [ ] **Step 7: `app/routes/api.admin.assets.tsx` — to'liq yangi mazmun**

```tsx
import type { Route } from './+types/api.admin.assets';
import { json } from '../../functions/lib/db';
import { parseAssetsInput } from '../../functions/lib/validate';
import { readSiteAssets } from '../lib/loaders';
import { ASSET_FIELDS, staleVideoFiles, type AssetsResponse } from '../../src/lib/site-content';
import { requireAdmin, parseBody } from './api.admin.guard';

/** Sayt rasm/videolari: registr maydonlari va yuklanganlari (`site_assets`); standartlar klientda (`ASSET_DEFAULTS`). */
export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const body: AssetsResponse = { fields: ASSET_FIELDS, values: await readSiteAssets(env) };
  return json(body);
}

/**
 * `PUT` — kalit → yuklangan fayl yo'li; bo'sh qiymat qatorni o'chiradi (standartga qaytadi). Almashtirilgan yoki
 * olib tashlangan video fayli diskdan ham o'chadi — 40 MB'lik fayllar yig'ilmasin.
 */
export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  if (request.method !== 'PUT') return json({ error: 'method_not_allowed' }, { status: 405 });
  const input = parseBody(await request.json().catch(() => null), (b) => parseAssetsInput(b, ASSET_FIELDS));
  if (input instanceof Response) return input;
  const before = await readSiteAssets(env);
  await env.DB.batch(Object.entries(input).map(([key, url]) => (url === ''
    ? env.DB.prepare('DELETE FROM site_assets WHERE key = ?').bind(key)
    : env.DB.prepare('INSERT OR REPLACE INTO site_assets (key, url) VALUES (?, ?)').bind(key, url))));
  const values = await readSiteAssets(env);
  // Yozuv saqlangan: fayl o'chmay qolsa (ruxsat xatosi) javob buzilmaydi — fayl diskda qoladi xolos.
  await Promise.all(staleVideoFiles(before, values).map((key) => env.IMAGES.delete(key).catch(() => undefined)));
  return json({ values });
}
```

- [ ] **Step 8: Lint va testlar**

Run: `bun run lint && bun run test`
Expected: lint 0; `Test Files 31 passed (31)`, `Tests 353 passed (353)`.

- [ ] **Step 9: Commit**

```bash
git add src/lib/site-content.ts src/lib/page-slugs.ts src/lib/site-content.test.ts app/routes/page.tsx shared/runtime.ts server/images.ts app/routes/api.admin.assets.tsx
git commit -m "feat(content): almashtirilgan video diskdan o'chadi; registrda yo'nalish kartalari va huquqiy sahifalar

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 10 (controller): brauzer/API tekshiruvi**

Admin kirgan panelda (`javascript_tool`):

```js
const up = async (name) => { const fd = new FormData(); fd.append('file', new File([new Uint8Array(2000)], name, { type: 'video/mp4' })); return (await (await fetch('/api/admin/upload', { method: 'POST', body: fd })).json()).imageUrl; };
const put = (v) => fetch('/api/admin/assets', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ 'hero.pc.video1': v }) });
const st = async (u) => (await fetch(u, { cache: 'no-store' })).status;
const a = await up('sinov-a.mp4'), b = await up('sinov-b.mp4');
await put(a); await put(b);
const afterReplace = [await st(a), await st(b)];
await put('');
({ afterReplace, afterClear: await st(b), values: (await (await fetch('/api/admin/assets')).json()).values })
```

Kutiladi:
- `afterReplace` — `[404, 200]`.
- `afterClear` — `404`.
- `values` — `{}`.

Keyin `/page/oferta` va `/page/muddatli-tolov`da sarlavha ostidagi izoh chiqadi, `/page/biz-haqimizda` — `AboutPage` (bento bloklari).

---

### Task 2: Sayt matnlari formasi va landing muharriri

**Files:**
- Create: `src/admin/lib/content-form.ts`
- Test: `src/admin/lib/content-form.test.ts`
- Create: `src/admin/ContentFields.tsx`
- Create: `src/admin/SectionTabs.tsx`
- Create: `src/admin/screens/ContentHome.tsx`
- Modify: `src/admin/ImageUploader.tsx` (to'liq almashtiriladi)
- Modify: `src/admin/ui/form.tsx` (`LangPair`)
- Modify: `src/admin/api.ts`
- Modify: `src/admin/errText.ts`
- Modify: `src/admin/nav.ts`
- Modify: `src/admin/AdminApp.tsx`

**Interfaces:**
- Consumes (T1 va 4a):
  - `TEXT_FIELDS`, `ASSET_FIELDS`, `AssetField`, `AssetKey`, `ContentGroup`, `SiteTexts`, `SiteAssets`, `TextsResponse`, `AssetsResponse` (`src/lib/site-content.ts`).
  - `ASSET_DEFAULTS: Record<AssetKey, string>` (`src/store/SiteAssets.tsx`).
  - `NormalizeOptions`, `normalizeImage(file, opts?)` (`src/admin/lib/image-normalize.ts`).
  - T1'dagi bo'lim nomlari.
- Produces:
  - `content-form.ts`:
    - `type TextFieldDef = TextsResponse['fields'][number]`;
    - `interface ContentSection { title: string; texts: TextFieldDef[]; assets: AssetField[] }`;
    - `contentSections(group, texts, assets, keys?)`;
    - `initialTexts(fields, values): SiteTexts`;
    - `changedTexts(base, draft): SiteTexts`;
    - `changedAssets(base, draft): SiteAssets`;
    - `PHOTO_UPLOAD: NormalizeOptions`;
    - `uploadOptions(key: AssetKey): NormalizeOptions | false`;
    - `withoutId<T extends { id: string }>(item: T): Omit<T, 'id'>`.
  - `ContentFields.tsx`:
    - `useSiteContent(group: ContentGroup, keys?: string[]): SiteContent`, bunda `SiteContent` = `{ loaded, error, sections, texts, assets, dirty, setText, setAsset, save }`;
    - `ContentFields: FC<{ content: SiteContent }>`;
    - `ContentPage: FC<{ group; title; siteHref; back?; top?; footer? }>`.
  - `SectionTabs` (default): `FC<{ section: SectionId; active: string }>`.
  - `ImageUploader` yangi prop'lari: `kind?: 'image' | 'video'`, `normalize?: NormalizeOptions | false`, `fallback?: string`.
  - `LangPair` yangi prop'lari: `ruHint?: string`, `mono?: boolean`.
  - `api.ts`:
    - `getTexts(): Promise<TextsResponse>`;
    - `saveTexts(body: SiteTexts): Promise<{ values: SiteTexts }>`;
    - `getAssets(): Promise<AssetsResponse>`;
    - `saveAssets(body: SiteAssets): Promise<{ values: SiteAssets }>`.
  - `TabDef.ownPage?: boolean`.
  - Kontent bo'limining birinchi tabi: `{ id: 'home', segment: 'home' }`.

- [ ] **Step 1: Failing test — `src/admin/lib/content-form.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { ASSET_FIELDS, TEXT_FIELDS } from '../../lib/site-content';
import { changedAssets, changedTexts, contentSections, initialTexts, uploadOptions, withoutId, type TextFieldDef } from './content-form';

const fields: TextFieldDef[] = TEXT_FIELDS.map((f) => ({ ...f, defaults: { uz: `${f.key}-uz`, ru: `${f.key}-ru` } }));

describe('contentSections', () => {
  it("landing: yo'nalish kartalari matni va rasmlari bilan, keyin xizmatlar, konsultatsiya, sarlavhalar", () => {
    const s = contentSections('home', fields, ASSET_FIELDS);
    expect(s.map((x) => x.title)).toEqual(['Apple kartasi', 'PC kartasi', 'Audio kartasi', 'Video kartasi', "Xizmat va'dalari", 'Konsultatsiya', 'Sarlavhalar']);
    expect(s[1].texts.map((f) => f.key)).toEqual(['heroPc']);
    expect(s[1].assets.map((f) => f.key)).toEqual(['hero.pc.image', 'hero.pc.poster', 'hero.pc.video1', 'hero.pc.video2']);
    expect(s[5].assets.map((f) => f.key)).toEqual(['consult.image']);
  });
  it("faqat rasmli bo'lim oxirida; kalit filtri", () => {
    const about = contentSections('about', fields, ASSET_FIELDS);
    expect(about[about.length - 1].title).toBe('Rasmlar');
    expect(contentSections('legal', fields, ASSET_FIELDS, ['legalLedeOferta'])).toEqual([
      { title: 'Sarlavha ostidagi izoh', texts: [fields.find((f) => f.key === 'legalLedeOferta')], assets: [] },
    ]);
    expect(contentSections('legal', fields, ASSET_FIELDS, [])).toEqual([]);
  });
});

describe('initialTexts / changedTexts', () => {
  it("bo'sh qiymat o'rnida standart; faqat o'zgargan kalit yuboriladi", () => {
    const base = initialTexts(fields, { proTitle: { uz: 'Shior', ru: '' } });
    expect(base.proTitle).toEqual({ uz: 'Shior', ru: 'proTitle-ru' });
    expect(base.newsTitle).toEqual({ uz: 'newsTitle-uz', ru: 'newsTitle-ru' });
    const draft = { ...base, newsTitle: { uz: '', ru: 'newsTitle-ru' } };
    expect(changedTexts(base, draft)).toEqual({ newsTitle: { uz: '', ru: 'newsTitle-ru' } });
    expect(changedTexts(base, base)).toEqual({});
  });
});

describe('changedAssets', () => {
  it("yangi, almashgan va olib tashlangan kalitlar; o'zgarmagani yuborilmaydi", () => {
    expect(changedAssets(
      { logo: '/images/products/a.webp', favicon: '/images/products/f.png' },
      { logo: '/images/products/b.webp', favicon: '/images/products/f.png', 'hero.pc.video1': '/images/products/v.mp4' },
    )).toEqual({ logo: '/images/products/b.webp', 'hero.pc.video1': '/images/products/v.mp4' });
    expect(changedAssets({ logo: '/images/products/a.webp' }, { logo: '' })).toEqual({ logo: '' });
    expect(changedAssets({}, { logo: '' })).toEqual({});
  });
});

describe('uploadOptions', () => {
  it("favicon o'zgarishsiz, logo kesiladi, foto kesilmaydi", () => {
    expect(uploadOptions('favicon')).toBe(false);
    expect(uploadOptions('logoDark')).toEqual({});
    expect(uploadOptions('hero.apple.image')).toEqual({ maxSize: 2400, maxTrimRatio: 0 });
  });
});

describe('withoutId', () => {
  it("id tanadan chiqadi", () => {
    expect(withoutId({ id: 'a', title: 'b', isActive: true })).toEqual({ title: 'b', isActive: true });
  });
});
```

- [ ] **Step 2: Test yiqilishini ko'rish**

Run: `bunx vitest run src/admin/lib/content-form.test.ts`
Expected: FAIL — `Failed to resolve import "./content-form"`.

- [ ] **Step 3: `src/admin/lib/content-form.ts`**

```ts
import type { AssetField, AssetKey, ContentGroup, SiteAssets, SiteTexts, TextsResponse } from '../../lib/site-content';
import type { NormalizeOptions } from './image-normalize';

/** `GET /api/admin/texts` maydoni — registr qatori standart matnlari bilan. */
export type TextFieldDef = TextsResponse['fields'][number];

export interface ContentSection {
  title: string;
  texts: TextFieldDef[];
  assets: AssetField[];
}

/**
 * Guruh maydonlarini admin kartalariga bo'ladi. Tartib registrdagidek: matnli bo'limlar oldin, faqat rasmli bo'limlar
 * ("Rasmlar") oxirida; bo'lim ichida matnlar, keyin rasmlar. `keys` berilsa faqat shu kalitlar (sahifa tahriridagi izoh).
 */
export function contentSections(group: ContentGroup, texts: TextFieldDef[], assets: AssetField[], keys?: string[]): ContentSection[] {
  const wanted = (f: { key: string; group: ContentGroup }) => f.group === group && (!keys || keys.includes(f.key));
  const out: ContentSection[] = [];
  const sectionFor = (title: string): ContentSection => {
    const found = out.find((s) => s.title === title);
    if (found) return found;
    const created: ContentSection = { title, texts: [], assets: [] };
    out.push(created);
    return created;
  };
  for (const f of texts.filter(wanted)) sectionFor(f.section).texts.push(f);
  for (const f of assets.filter(wanted)) sectionFor(f.section).assets.push(f);
  return out;
}

/** Forma qiymatlari: admin o'zgartirgan matn, bo'lmasa standart — maydon bo'sh ko'rinmasin. */
export function initialTexts(fields: TextFieldDef[], values: SiteTexts): SiteTexts {
  const out: SiteTexts = {};
  for (const f of fields) {
    out[f.key] = { uz: values[f.key]?.uz || f.defaults.uz, ru: values[f.key]?.ru || f.defaults.ru };
  }
  return out;
}

/** `PUT /api/admin/texts` tanasi — faqat o'zgargan kalitlar (bo'shatilgan til serverda standartga qaytadi). */
export function changedTexts(base: SiteTexts, draft: SiteTexts): SiteTexts {
  const out: SiteTexts = {};
  for (const [key, v] of Object.entries(draft)) {
    const b = base[key];
    if (!b || b.uz !== v.uz || b.ru !== v.ru) out[key] = v;
  }
  return out;
}

/** `PUT /api/admin/assets` tanasi — faqat o'zgargan kalitlar; `''` — standartga qaytarish. */
export function changedAssets(base: SiteAssets, draft: SiteAssets): SiteAssets {
  const out: SiteAssets = {};
  const keys = new Set([...Object.keys(base), ...Object.keys(draft)]) as Set<AssetKey>;
  for (const key of keys) {
    const next = draft[key] ?? '';
    if ((base[key] ?? '') !== next) out[key] = next;
  }
  return out;
}

/** Foto yuklash: chekkasi kesilmaydi (bir xil rangli chekka — kompozitsiya qismi), keng banner ham sig'adi. */
export const PHOTO_UPLOAD: NormalizeOptions = { maxSize: 2400, maxTrimRatio: 0 };

/**
 * Sayt rasmi yuklanishidagi ishlov: favicon o'zgarishsiz (Safari WebP favicon'ni ko'rsatmaydi), shaffof logolar va
 * "Biz haqimizda" yangiliklar rasmining chekkasi kesiladi, qolgani — foto.
 */
export function uploadOptions(key: AssetKey): NormalizeOptions | false {
  if (key === 'favicon') return false;
  if (key === 'logo' || key === 'logoDark' || key === 'about.news') return {};
  return PHOTO_UPLOAD;
}

/** Ro'yxat yozuvidan forma: `id` URL'da turadi, tanaga kirmaydi. */
export function withoutId<T extends { id: string }>(item: T): Omit<T, 'id'> {
  const { id, ...rest } = item;
  void id;
  return rest;
}
```

- [ ] **Step 4: Testni o'tkazish**

Run: `bunx vitest run src/admin/lib/content-form.test.ts`
Expected: PASS (6 test).

- [ ] **Step 5: `api.ts` va `errText.ts`**

`src/admin/api.ts` — `import type { BillzShop, BillzSyncStatus } …` qatoridan keyin:

```ts
import type { AssetsResponse, SiteAssets, SiteTexts, TextsResponse } from '../lib/site-content';
```

Fayl oxiriga:

```ts
// ── Sayt matnlari va rasmlari ───────────────────────────────────────────────
export async function getTexts(): Promise<TextsResponse> {
  return handle(await fetch('/api/admin/texts'));
}
/** Faqat yuborilgan kalitlar yoziladi; javobda hamma saqlangan qiymatlar. */
export async function saveTexts(body: SiteTexts): Promise<{ values: SiteTexts }> {
  return handle(await fetch('/api/admin/texts', {
    method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  }));
}
export async function getAssets(): Promise<AssetsResponse> {
  return handle(await fetch('/api/admin/assets'));
}
/** `''` — kalit standartga qaytadi. */
export async function saveAssets(body: SiteAssets): Promise<{ values: SiteAssets }> {
  return handle(await fetch('/api/admin/assets', {
    method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  }));
}
```

`src/admin/errText.ts`: `url_invalid: "Rasm yo'li noto'g'ri",` → `url_invalid: "Fayl yo'li noto'g'ri",`

- [ ] **Step 6: `LangPair` — `ruHint` va `mono` (`src/admin/ui/form.tsx`)**

`LangPair` ta'rifini to'liq almashtiring:

```tsx
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
  /** Ruscha maydon izohi — sayt matnlarida bo'sh ruscha koddagi ruscha standartga tushadi. */
  ruHint?: string;
  /** Markdown maydonlari uchun monospace. */
  mono?: boolean;
  required?: boolean;
  error?: string;
}> = ({ label, uz, ru, onUz, onRu, kind = 'text', rows, hint, ruHint = "Bo'sh qolsa o'zbekchasi chiqadi", mono, required, error }) => (
  <div className="grid gap-3 md:grid-cols-2">
    <Field label={label} hint={hint} error={error} required={required}>
      {kind === 'textarea' ? <Textarea value={uz} onChange={onUz} rows={rows} mono={mono} invalid={Boolean(error)} /> : <Input value={uz} onChange={onUz} invalid={Boolean(error)} />}
    </Field>
    <Field label={`${label} (ru)`} hint={ruHint}>
      {kind === 'textarea' ? <Textarea value={ru} onChange={onRu} rows={rows} mono={mono} /> : <Input value={ru} onChange={onRu} />}
    </Field>
  </div>
);
```

- [ ] **Step 7: `src/admin/ImageUploader.tsx` — to'liq yangi mazmun**

```tsx
import { useRef, useState } from 'react';
import type { FC } from 'react';
import { Upload, X } from 'lucide-react';
import { uploadImage } from './api';
import { normalizeImage, type NormalizeOptions } from './lib/image-normalize';
import { moveItem } from './lib/reorder';

/** Server chegarasi (`api.admin.upload`) — katta videoni yuklashdan oldin aytamiz. */
const VIDEO_MAX = 40 * 1024 * 1024;

/**
 * Rasm/video yuklagich. Rasm client'da `normalizeImage` bilan WebP'ga keltiriladi (`normalize={false}` —
 * o'zgarishsiz, favicon uchun); `kind="video"` — MP4 o'zgarishsiz, oldindan ko'rish `<video>` bilan.
 * `fallback` — hech narsa yuklanmaganda turadigan standart fayl (sayt kodidagi).
 */
const ImageUploader: FC<{
  label: string;
  images: string[];
  onChange: (next: string[]) => void;
  multiple?: boolean;
  reorderable?: boolean;
  normalize?: NormalizeOptions | false;
  accept?: string;
  kind?: 'image' | 'video';
  fallback?: string;
}> = ({ label, images, onChange, multiple = false, reorderable = false, normalize, accept, kind = 'image', fallback }) => {
  const video = kind === 'video';
  const [uploading, setUploading] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  // handleFiles boshlanganda olingan `images` yopilmasidan (stale closure) —
  // parallel ikkinchi yuklash birinchisining natijasini yo'q qilmasin.
  const imagesRef = useRef(images);
  imagesRef.current = images;

  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    let files = Array.from(fileList).filter((f) => f.type.startsWith(video ? 'video/' : 'image/'));
    if (!files.length) return;
    if (!multiple) files = files.slice(0, 1);
    if (video && files.some((f) => f.size > VIDEO_MAX)) {
      setError('Video 40 MB dan katta — kichikroq fayl tanlang');
      return;
    }
    setError('');
    setUploading((n) => n + files.length);
    const results = await Promise.all(
      files.map(async (file) => {
        try {
          const body = video || normalize === false ? file : await normalizeImage(file, normalize);
          const { imageUrl } = await uploadImage(body);
          return imageUrl;
        } catch {
          setError(video ? 'Video yuklanmadi' : 'Rasm yuklanmadi');
          return null;
        } finally {
          setUploading((n) => n - 1);
        }
      }),
    );
    const urls = results.filter((u): u is string => u !== null);
    if (urls.length) onChange(multiple ? [...imagesRef.current, ...urls] : [urls[0]]);
  }

  function onZoneDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  function onTileDrop(e: React.DragEvent, to: number) {
    const raw = e.dataTransfer.getData('text/plain');
    if (raw === '') return; // OS-fayl drop'i, tartiblash emas — e'tiborsiz
    e.preventDefault();
    onChange(moveItem(images, Number(raw), to));
  }

  const tile = video ? 'h-24 w-40' : 'size-16';
  const preview = (src: string) => (video
    ? <video src={src} muted playsInline controls preload="metadata" className="size-full object-cover" />
    : <img src={src} alt="" className="size-full object-contain" />);

  return (
    <div>
      <div className="mb-2 text-label font-medium text-muted">{label}</div>

      {(images.length > 0 || uploading > 0) && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {images.map((img, i) => (
            <div
              key={img + i}
              draggable={reorderable}
              onDragStart={(e: React.DragEvent) => e.dataTransfer.setData('text/plain', String(i))}
              onDragOver={(e: React.DragEvent) => { if (reorderable) e.preventDefault(); }}
              onDrop={(e: React.DragEvent) => { if (reorderable) onTileDrop(e, i); }}
              className={`group relative ${tile} overflow-hidden rounded-xs bg-fill-2 ${reorderable ? 'cursor-move' : ''}`}
            >
              {preview(img)}
              <button
                type="button"
                onClick={() => onChange(images.filter((_, j) => j !== i))}
                aria-label={video ? "Videoni o'chirish" : "Rasmni o'chirish"}
                className="press absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-danger text-bg opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </div>
          ))}
          {Array.from({ length: uploading }).map((_, i) => (
            <div key={`u${i}`} className={`${tile} animate-pulse rounded-xs bg-fill-2`} />
          ))}
        </div>
      )}

      {images.length === 0 && uploading === 0 && fallback && (
        <div className="mb-2 flex items-center gap-3">
          <div className={`${tile} overflow-hidden rounded-xs bg-fill-2`}>{preview(fallback)}</div>
          <span className="text-label text-muted-2">Standart</span>
        </div>
      )}

      <label
        onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onZoneDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xs border-2 border-dashed px-4 py-5 ${dragOver ? 'border-cta bg-cta/5 text-cta' : 'border-line text-muted'}`}
      >
        <Upload size={20} />
        <span className="text-label">{video ? 'Video (MP4) tashlang yoki tanlang' : 'Rasm tashlang yoki tanlang'}</span>
        <input
          type="file"
          accept={accept ?? (video ? 'video/mp4' : 'image/png,image/jpeg,image/webp')}
          multiple={multiple}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => { handleFiles(e.target.files); e.target.value = ''; }}
          className="hidden"
        />
      </label>

      {error ? <p className="mt-1 text-label text-danger">{error}</p> : null}
    </div>
  );
};

export default ImageUploader;
```

(`pointer-coarse:opacity-100` — sensorli ekranda hover yo'q, "o'chirish" tugmasi doim ko'rinsin: sayt maydonida u standartga qaytarishning yagona yo'li.)

- [ ] **Step 8: `src/admin/ContentFields.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import type { AssetField, AssetKey, ContentGroup, SiteAssets, SiteTexts } from '../lib/site-content';
import { ASSET_DEFAULTS } from '../store/SiteAssets';
import { getAssets, getTexts, saveAssets, saveTexts } from './api';
import { errText } from './errText';
import ImageUploader from './ImageUploader';
import { changedAssets, changedTexts, contentSections, initialTexts, uploadOptions, type ContentSection, type TextFieldDef } from './lib/content-form';
import { Button, Card, EmptyState, LangPair, Page, Skeleton } from './ui';
import { useToast } from './ui/toast';

export interface SiteContent {
  loaded: boolean;
  error: string;
  sections: ContentSection[];
  texts: SiteTexts;
  assets: SiteAssets;
  dirty: boolean;
  setText: (key: string, lang: 'uz' | 'ru', value: string) => void;
  setAsset: (key: AssetKey, url: string) => void;
  /** Faqat o'zgarganini yuboradi; xato bo'lsa tashlaydi (ekran toast chiqaradi). */
  save: () => Promise<void>;
}

interface Meta { fields: TextFieldDef[]; assetFields: AssetField[] }
interface Values { texts: SiteTexts; assets: SiteAssets }
const NONE: Values = { texts: {}, assets: {} };

/**
 * Sayt matnlari va rasmlari (`site_texts`/`site_assets`) formasi: hammasini bir marta yuklaydi, `group` (va `keys`)
 * bo'yicha kartalarga bo'ladi, qoralamani ushlaydi. Landing muharriri, vakansiyalar sahifasi, "Biz haqimizda" va
 * huquqiy sahifalar izohi shundan foydalanadi.
 */
export function useSiteContent(group: ContentGroup, keys?: string[]): SiteContent {
  const [rawMeta, setMeta] = useState(null as Meta | null);
  const meta = rawMeta as Meta | null;
  const [rawBase, setBase] = useState(NONE);
  const base = rawBase as Values;
  const [rawDraft, setDraft] = useState(NONE);
  const draft = rawDraft as Values;
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getTexts(), getAssets()])
      .then(([t, a]) => {
        const values: Values = { texts: initialTexts(t.fields, t.values), assets: a.values };
        setMeta({ fields: t.fields, assetFields: a.fields });
        setBase(values);
        setDraft(values);
      })
      .catch(() => setError("Sahifani yangilab qayta urinib ko'ring"));
  }, []);

  const textChanges = changedTexts(base.texts, draft.texts);
  const assetChanges = changedAssets(base.assets, draft.assets);

  async function save() {
    if (!meta) return;
    let next = base;
    if (Object.keys(textChanges).length > 0) {
      const res = await saveTexts(textChanges);
      next = { ...next, texts: initialTexts(meta.fields, res.values) };
    }
    if (Object.keys(assetChanges).length > 0) {
      const res = await saveAssets(assetChanges);
      next = { ...next, assets: res.values };
    }
    // ponytail: saqlash paytida yozilgan harf yo'qoladi (so'rov qisqa, tugma band) — kerak bo'lsa faqat yuborilgan kalitlarni almashtirish.
    setBase(next);
    setDraft(next);
  }

  return {
    loaded: meta !== null,
    error: error as string,
    sections: meta ? contentSections(group, meta.fields, meta.assetFields, keys) : [],
    texts: draft.texts,
    assets: draft.assets,
    dirty: Object.keys(textChanges).length > 0 || Object.keys(assetChanges).length > 0,
    setText: (key, lang, value) => setDraft((d: Values) => ({ ...d, texts: { ...d.texts, [key]: { ...d.texts[key], [lang]: value } } })),
    setAsset: (key, url) => setDraft((d: Values) => ({ ...d, assets: { ...d.assets, [key]: url } })),
    save,
  };
}

const AssetInput: FC<{ field: AssetField; value: string; onChange: (url: string) => void }> = ({ field, value, onChange }) => (
  <div>
    <ImageUploader
      label={field.label}
      kind={field.kind}
      images={value ? [value] : []}
      onChange={(next) => onChange(next[0] ?? '')}
      normalize={uploadOptions(field.key)}
      accept={field.key === 'favicon' ? 'image/png' : undefined}
      fallback={ASSET_DEFAULTS[field.key] || undefined}
    />
    {field.hint && <p className="mt-1 text-label text-muted-2">{field.hint}</p>}
  </div>
);

/** Bo'limlar kartalari: matn — uz/ru juftligi, rasm/video — yuklagich (fayl o'chirilsa standart qaytadi). */
export const ContentFields: FC<{ content: SiteContent }> = ({ content }) => {
  if (content.error) return <EmptyState title="Sayt matnlari yuklanmadi" text={content.error} />;
  if (!content.loaded) return <Skeleton rows={6} />;
  return (
    <>
      {content.sections.map((s) => (
        <Card key={s.title} title={s.title}>
          <div className="flex flex-col gap-4">
            {s.texts.map((f) => (
              <LangPair
                key={f.key}
                label={f.label}
                hint={f.hint}
                kind={f.kind}
                rows={3}
                uz={content.texts[f.key]?.uz ?? ''}
                ru={content.texts[f.key]?.ru ?? ''}
                onUz={(v) => content.setText(f.key, 'uz', v)}
                onRu={(v) => content.setText(f.key, 'ru', v)}
                ruHint="Bo'sh qolsa standart matn chiqadi"
              />
            ))}
            {s.assets.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {s.assets.map((f) => (
                  <AssetInput key={f.key} field={f} value={content.assets[f.key] ?? ''} onChange={(url) => content.setAsset(f.key, url)} />
                ))}
              </div>
            )}
          </div>
        </Card>
      ))}
    </>
  );
};

/** Faqat sayt matnlari va rasmlaridan iborat ekran (landing muharriri, vakansiyalar sahifasi). */
export const ContentPage: FC<{ group: ContentGroup; title: string; siteHref: string; back?: string; top?: ReactNode; footer?: ReactNode }> = ({
  group, title, siteHref, back, top, footer,
}) => {
  const content = useSiteContent(group);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await content.save();
      toast("Saqlandi · saytda 1–5 daqiqada ko'rinadi");
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page
      title={title}
      back={back}
      description="Maydon bo'shatilsa yoki fayl o'chirilsa saytdagi standart matn va rasm qaytadi."
      dirty={content.dirty}
      actions={(
        <>
          <Button variant="quiet" href={siteHref} external>Saytda ko'rish</Button>
          <Button onClick={save} disabled={!content.dirty || busy}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>
        </>
      )}
    >
      {top}
      <div className="flex flex-col gap-4">
        <ContentFields content={content} />
        {footer}
      </div>
    </Page>
  );
};
```

- [ ] **Step 9: `src/admin/SectionTabs.tsx`**

```tsx
import type { FC } from 'react';
import { adminPath, type SectionId } from './lib/admin-path';
import { SECTIONS } from './nav';
import { Tabs } from './ui';

/** Bo'lim tablari — mobilda sahifa tepasida (desktopda tablar sidebar'da). */
const SectionTabs: FC<{ section: SectionId; active: string }> = ({ section, active }) => {
  const def = SECTIONS.find((s) => s.id === section);
  if (!def || def.tabs.length < 2) return null;
  return (
    <Tabs
      className="mb-6 md:hidden"
      active={active}
      items={def.tabs.map((t) => ({ id: t.id, label: t.label, to: adminPath(def.id, t.segment) }))}
    />
  );
};

export default SectionTabs;
```

- [ ] **Step 10: `src/admin/screens/ContentHome.tsx`**

```tsx
import type { FC } from 'react';
import { Link } from 'react-router';
import { ContentPage } from '../ContentFields';
import SectionTabs from '../SectionTabs';

/** Kontent → Bosh sahifa: landing matnlari va rasmlari landing tartibida (spec §5). */
const ContentHome: FC = () => (
  <ContentPage
    group="home"
    title="Saytning bosh sahifasi"
    siteHref="/"
    top={<SectionTabs section="content" active="home" />}
    footer={(
      <p className="text-para text-muted">
        Bannerlar, yangiliklar va brend logotiplari o'z bo'limlarida:{' '}
        <Link to="/admin/content/banners" className="press text-cta">Bannerlar</Link>
        {' · '}
        <Link to="/admin/content/news" className="press text-cta">Yangiliklar</Link>
        {' · '}
        <Link to="/admin/products/brands" className="press text-cta">Brendlar</Link>
      </p>
    )}
  />
);

export default ContentHome;
```

- [ ] **Step 11: `src/admin/nav.ts`**

- lucide importiga `House` qo'shing (alifbo tartibida `FileText`dan keyin): `BookOpen, Boxes, Briefcase, FileText, House, Image, Inbox, …`.
- `TabDef` ichida `detail?: boolean;` qatoridan keyin:

```ts
  /** Tab'ning asosiy ekrani forma (landing muharriri) — o'z `Page`ini (Saqlash bilan) va mobil tablarni (`SectionTabs`) chizadi. */
  ownPage?: boolean;
```

- Izohdagi `(Turlar, Kontent → Bosh sahifa, Sozlamalar → Aloqa/SEO)` → `(Sozlamalar → Aloqa/SEO)`.
- Kontent bo'limining `tabs` ro'yxati boshiga:

```ts
      { id: 'home', segment: 'home', label: 'Bosh sahifa', Icon: House, ownPage: true },
```

- [ ] **Step 12: `src/admin/AdminApp.tsx`**

Importlar — bu qatorlarni:

```tsx
import { adminPath, parseAdminPath, type AdminRoute } from './lib/admin-path';
import { SECTIONS, SEGMENTS, activeTab, type SectionDef, type TabDef } from './nav';
import AdminShell from './AdminShell';
import Login from './Login';
import Dashboard from './screens/Dashboard';
import { Page, Tabs } from './ui';
```

shunga almashtiring:

```tsx
import { parseAdminPath, type AdminRoute } from './lib/admin-path';
import { SECTIONS, SEGMENTS, activeTab, type SectionDef, type TabDef } from './nav';
import AdminShell from './AdminShell';
import Login from './Login';
import SectionTabs from './SectionTabs';
import Dashboard from './screens/Dashboard';
import ContentHome from './screens/ContentHome';
import { Page } from './ui';
```

`screenFor`da `case 'content/banners': …` qatoridan oldin:

```tsx
    case 'content/home': return <ContentHome />;
```

`SectionPage` ichidagi bu qismni:

```tsx
  // Id ekranlari o'z Page'ini (orqaga havola + nom) chizadi — sarlavha ikki marta chiqmasin.
  if (route.id !== null && tab.detail) return screen;
  return (
    <Page title={tab.label}>
      {section.tabs.length > 1 && (
        <Tabs
          className="mb-6 md:hidden"
          active={tab.id}
          items={section.tabs.map((t) => ({ id: t.id, label: t.label, to: adminPath(section.id, t.segment) }))}
        />
      )}
      {screen}
    </Page>
  );
```

shunga almashtiring:

```tsx
  // Id ekranlari va forma-tablar (landing muharriri) o'z Page'ini chizadi — sarlavha ikki marta chiqmasin.
  if ((route.id !== null && tab.detail) || (route.id === null && tab.ownPage)) return screen;
  return (
    <Page title={tab.label}>
      <SectionTabs section={section.id} active={tab.id} />
      {screen}
    </Page>
  );
```

- [ ] **Step 13: Lint va testlar**

Run: `bun run lint && bun run test`
Expected: lint 0; `Test Files 32 passed (32)`, `Tests 359 passed (359)`.

- [ ] **Step 14: Commit**

```bash
git add src/admin/lib/content-form.ts src/admin/lib/content-form.test.ts src/admin/ContentFields.tsx src/admin/SectionTabs.tsx src/admin/screens/ContentHome.tsx src/admin/ImageUploader.tsx src/admin/ui/form.tsx src/admin/api.ts src/admin/errText.ts src/admin/nav.ts src/admin/AdminApp.tsx
git commit -m "feat(admin): sayt matnlari formasi va landing muharriri; video yuklagich, favicon WebP'siz

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 15 (controller): brauzer**

1. `/admin/content` → "Saytning bosh sahifasi". Sidebar'dagi Kontent guruhida "Bosh sahifa" birinchi.
2. Kartalar tartibi (`[...document.querySelectorAll('section h2')].map(h => h.textContent)`): `Apple kartasi, PC kartasi, Audio kartasi, Video kartasi, Xizmat va'dalari, Konsultatsiya, Sarlavhalar`.
   - Maydonlar standart matn bilan to'ldirilgan (PC nomi: `Personal↵Computers`).
   - Apple kartasida rasm, poster va 2 video "Standart" bo'lib ko'rinadi; PC'da faqat rasm.
   - "Saqlash" o'chiq.
3. Matn: `card('PC kartasi')` ichidagi birinchi textarea'ga `setVal(..., 'SINOV PC')`.
   - "Saqlash" yoqiladi → bosiladi → toast.
   - `(await (await fetch('/')).text()).includes('SINOV PC')` → `true`.
4. Rasm: `pick(card('PC kartasi').querySelectorAll('input[type=file]')[0], 'sinov.png', 'image/png')`.
   - Eskiz chiqadi → "Saqlash".
   - Landing'dagi PC karta rasmi `/images/products/….webp`.
5. Video: `pick(card('PC kartasi').querySelectorAll('input[type=file]')[2], 'sinov.mp4', 'video/mp4')`.
   - `<video>` tile chiqadi → "Saqlash".
   - `/category/pc` HTML'ida shu `.mp4` yo'li bor.
6. Qaytarish:
   - PC nomi textarea'si `setVal(..., '')`.
   - PC rasm va video tile'larida "o'chirish" (×) tugmalari bosiladi.
   - "Saqlash".
   - `GET /api/admin/texts` → `values` `{}`; `GET /api/admin/assets` → `values` `{}`.
   - Video fayli 404 (T1).
   - Textarea'da yana `Personal↵Computers`.
7. Saqlanmagan o'zgarish bilan "Bannerlar"ga o'tish → "Saqlanmagan o'zgarishlar bor" dialogi → "Bekor qilish".
8. `resize_window` mobile + `read_page`: sahifa tepasida Kontent tablari (6 ta) bor. Keyin `resize_window` desktop.

Favicon ekrani 5-bosqichda (Sozlamalar → Do'kon); uning o'zgarishsiz yuklanishi `uploadOptions('favicon') === false` unit testi bilan qoplangan.

---

### Task 3: Bannerlar va Yangiliklar kit bilan

**Files:**
- Create: `src/admin/useActiveToggle.ts`
- Create: `src/admin/screens/BannersList.tsx`
- Create: `src/admin/screens/BannerEdit.tsx`
- Create: `src/admin/screens/NewsList.tsx`
- Create: `src/admin/screens/NewsEdit.tsx`
- Modify: `src/admin/screens/CategoryEdit.tsx` (cover yuklash)
- Modify: `src/admin/nav.ts`
- Modify: `src/admin/AdminApp.tsx`
- Delete: `src/admin/BannerList.tsx`, `src/admin/BannerForm.tsx`, `src/admin/NewsList.tsx`, `src/admin/NewsForm.tsx`

**Interfaces:**
- Consumes:
  - `PHOTO_UPLOAD`, `withoutId` (T2 `src/admin/lib/content-form.ts`);
  - `ImageUploader` (`normalize` prop);
  - `listBanners/createBanner/updateBanner/deleteBanner`, `listNews/createNews/updateNews/deleteNews` (`api.ts`, mavjud);
  - `ApiBanner`, `ApiNews` (`shared/types.ts`).
- Produces: `useActiveToggle<T extends { id: string; isActive: boolean }>(setItems, save: (item: T) => Promise<unknown>): (item: T, on: boolean) => Promise<void>` — T4/T5 ro'yxatlari ishlatadi.

- [ ] **Step 1: `src/admin/useActiveToggle.ts`**

```ts
import { errText } from './errText';
import { useToast } from './ui/toast';

type Setter<T> = (update: (items: T[] | null) => T[] | null) => void;

/**
 * Ro'yxat qatoridagi "Saytda" toggle'i: qator darhol almashadi, `save` (to'liq yozuv bilan `PUT`) xato bersa qaytadi.
 * Kontent route'larida `PATCH` yo'q — yozuv ro'yxatdan to'liq keladi.
 */
export function useActiveToggle<T extends { id: string; isActive: boolean }>(setItems: Setter<T>, save: (item: T) => Promise<unknown>) {
  const toast = useToast();
  return async (item: T, on: boolean) => {
    const flip = (v: boolean) => setItems((xs) => xs && xs.map((x) => (x.id === item.id ? { ...x, isActive: v } : x)));
    flip(on);
    try {
      await save({ ...item, isActive: on });
      toast(on ? "Saytda ko'rsatildi" : 'Yashirildi');
    } catch (e) {
      flip(!on);
      toast(errText(e), 'error');
    }
  };
}
```

- [ ] **Step 2: `src/admin/screens/BannersList.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import type { ApiBanner } from '../../../shared/types';
import { listBanners, updateBanner } from '../api';
import { Button, Card, DataTable, EmptyState, Skeleton, Toggle, type Column } from '../ui';
import { useActiveToggle } from '../useActiveToggle';

const LIST = '/admin/content/banners';

/** Bannerlar — bosh sahifadagi slayder; faollari tartib bo'yicha, bittasi ham bo'lmasa slayder chiqmaydi. */
const BannersList: FC = () => {
  const navigate = useNavigate();
  const [rawItems, setItems] = useState(null as ApiBanner[] | null);
  const items = rawItems as ApiBanner[] | null;
  const [error, setError] = useState('');
  const toggle = useActiveToggle(setItems, (b: ApiBanner) => updateBanner(b.id, b));

  useEffect(() => {
    listBanners().then(setItems).catch(() => setError('Yuklashda xatolik'));
  }, []);

  const columns: Column<ApiBanner>[] = [
    { id: 'img', label: '', className: 'w-28', mobile: 'hide', cell: (b) => <img src={b.imageUrl} alt="" className="h-12 w-24 rounded-xs bg-fill-2 object-cover" /> },
    {
      id: 'name', label: 'Banner', mobile: 'title',
      cell: (b) => (
        <span className="flex flex-col">
          <span className="text-primary">{b.altText || 'Nomsiz banner'}</span>
          <span className="text-label text-muted-2">{b.linkUrl || 'Havolasiz'}</span>
        </span>
      ),
    },
    { id: 'sort', label: 'Tartib', align: 'right', className: 'w-20', cell: (b) => <span className="text-muted">{b.sortOrder}</span> },
    { id: 'active', label: 'Saytda', align: 'right', className: 'w-20', cell: (b) => <Toggle on={b.isActive} onChange={(v) => toggle(b, v)} label={`${b.altText || 'Banner'} — saytda ko'rsatish`} /> },
  ];

  if (error) return <EmptyState title="Ma'lumot yuklanmadi" text={error} />;
  if (!items) return <Skeleton rows={4} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-para text-muted">Bosh sahifadagi slayder: faol bannerlar tartib bo'yicha aylanadi, bittasi ham bo'lmasa slayder chiqmaydi.</p>
        <div className="sm:ml-auto">
          <Button to={`${LIST}/new`}>Yangi banner</Button>
        </div>
      </div>
      <Card padded={false}>
        <div className="px-2 py-1">
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(b) => b.id}
            onRowClick={(b) => navigate(`${LIST}/${b.id}`)}
            empty={<EmptyState title="Banner yo'q" text="Bosh sahifada slayder chiqmaydi." action={<Button to={`${LIST}/new`}>Yangi banner</Button>} />}
          />
        </div>
      </Card>
    </div>
  );
};

export default BannersList;
```

- [ ] **Step 3: `src/admin/screens/BannerEdit.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import type { ApiBanner } from '../../../shared/types';
import { createBanner, deleteBanner, listBanners, updateBanner } from '../api';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import { PHOTO_UPLOAD, withoutId } from '../lib/content-form';
import { Button, Card, Field, Input, Page, Skeleton, SwitchRow } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/content/banners';

type Form = Omit<ApiBanner, 'id'>;
const EMPTY: Form = { imageUrl: '', linkUrl: '', altText: '', sortOrder: 0, isActive: true };

/** Banner tahriri. `id` = 'new' yoki banner id'si. */
const BannerEdit: FC<{ id: string }> = ({ id }) => {
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [rawForm, setForm] = useState(EMPTY as Form);
  const form = rawForm as Form;
  const [loaded, setLoaded] = useState(isNew);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isNew) return;
    listBanners().then((all) => {
      const b = all.find((x) => x.id === id);
      if (!b) { setError('Banner topilmadi'); return; }
      setForm(withoutId(b));
      setLoaded(true);
    }).catch(() => setError('Yuklashda xatolik'));
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };

  async function save() {
    setBusy(true); setError('');
    try {
      if (isNew) {
        await createBanner(form);
        setDirty(false);
        toast("Banner qo'shildi");
        navigate(LIST, { state: { leave: true } });
      } else {
        await updateBanner(id, form);
        setDirty(false);
        toast("Saqlandi · saytda 1–5 daqiqada ko'rinadi");
      }
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: "Bannerni o'chirish",
      message: "Banner slayderdan olib tashlanadi. Faqat yashirish kerak bo'lsa «Saytda ko'rsatilsin»ni o'chiring.",
      confirmLabel: "O'chirish", destructive: true,
    });
    if (!ok) return;
    try {
      await deleteBanner(id);
      setDirty(false);
      toast("Banner o'chirildi");
      navigate(LIST, { state: { leave: true } });
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const canSave = dirty && !busy && form.imageUrl !== '';

  return (
    <Page
      title={isNew ? 'Yangi banner' : form.altText || 'Banner'}
      back={LIST}
      dirty={dirty}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>}
    >
      {!loaded && !error ? <Skeleton rows={4} /> : (
        <div className="flex flex-col gap-4">
          {error && <p className="text-para text-danger">{error}</p>}
          <Card title="Rasm" description="Keng rasm, 3:1 (masalan 2400×800); mobilda chetlari biroz kesiladi. Rasm majburiy.">
            <ImageUploader label="Banner rasmi" images={form.imageUrl ? [form.imageUrl] : []} onChange={(next) => set('imageUrl', next[0] ?? '')} normalize={PHOTO_UPLOAD} />
          </Card>
          <Card title="Ma'lumot">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Havola" hint="/chegirmalar yoki https://… — bo'sh bo'lsa banner bosilmaydi">
                <Input value={form.linkUrl} onChange={(v) => set('linkUrl', v)} placeholder="/chegirmalar" />
              </Field>
              <Field label="Rasm tavsifi" hint="Ko'rmaydiganlar va qidiruv tizimlari uchun; ro'yxatda nom bo'lib chiqadi">
                <Input value={form.altText} onChange={(v) => set('altText', v)} />
              </Field>
              <Field label="Tartib" hint="Kichigi oldin">
                <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
              </Field>
            </div>
            <div className="mt-2 divide-y divide-line">
              <SwitchRow label="Saytda ko'rsatilsin" on={form.isActive} onChange={(v) => set('isActive', v)} />
            </div>
          </Card>
          {!isNew && (
            <Card title="Xavfli zona">
              <Button variant="destructive" onClick={remove}>Bannerni o'chirish</Button>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
};

export default BannerEdit;
```

- [ ] **Step 4: `src/admin/screens/NewsList.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import type { ApiNews } from '../../../shared/types';
import { listNews, updateNews } from '../api';
import { Badge, Button, Card, DataTable, EmptyState, Skeleton, Toggle, type Column } from '../ui';
import { useActiveToggle } from '../useActiveToggle';

const LIST = '/admin/content/news';

/** Yangiliklar — landing tile'lari; tartib bo'yicha birinchi 3 ta faoli bosh sahifada. Qator bosilsa tahrir. */
const NewsList: FC = () => {
  const navigate = useNavigate();
  const [rawItems, setItems] = useState(null as ApiNews[] | null);
  const items = rawItems as ApiNews[] | null;
  const [error, setError] = useState('');
  const toggle = useActiveToggle(setItems, (n: ApiNews) => updateNews(n.id, n));

  useEffect(() => {
    listNews().then(setItems).catch(() => setError('Yuklashda xatolik'));
  }, []);

  if (error) return <EmptyState title="Ma'lumot yuklanmadi" text={error} />;
  if (!items) return <Skeleton rows={4} />;

  // Ro'yxat ham, landing ham `sort_order` bo'yicha — birinchi 3 ta faoli bosh sahifada.
  const onHome = new Set(items.filter((n) => n.isActive).slice(0, 3).map((n) => n.id));
  const columns: Column<ApiNews>[] = [
    { id: 'img', label: '', className: 'w-14', mobile: 'hide', cell: (n) => <img src={n.imageUrl} alt="" className="size-11 rounded-xs bg-fill-2 object-contain" /> },
    {
      id: 'title', label: 'Sarlavha', mobile: 'title',
      cell: (n) => (
        <span className="flex flex-col">
          <span className="text-primary">{n.title}</span>
          <span className="text-label text-muted-2">{[n.badge, n.tag].filter(Boolean).join(' · ') || 'Yorliqsiz'}</span>
        </span>
      ),
    },
    { id: 'home', label: 'Bosh sahifada', className: 'w-32', cell: (n) => (onHome.has(n.id) ? <Badge tone="ok">Ko'rinadi</Badge> : <span className="text-muted-2">—</span>) },
    { id: 'sort', label: 'Tartib', align: 'right', className: 'w-20', cell: (n) => <span className="text-muted">{n.sortOrder}</span> },
    { id: 'active', label: 'Saytda', align: 'right', className: 'w-20', cell: (n) => <Toggle on={n.isActive} onChange={(v) => toggle(n, v)} label={`${n.title} — saytda ko'rsatish`} /> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-para text-muted">Bosh sahifada tartib bo'yicha birinchi 3 ta faol yangilik chiqadi: 1-si chapda katta, qolgan ikkitasi o'ngda.</p>
        <div className="sm:ml-auto">
          <Button to={`${LIST}/new`}>Yangi yangilik</Button>
        </div>
      </div>
      <Card padded={false}>
        <div className="px-2 py-1">
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(n) => n.id}
            onRowClick={(n) => navigate(`${LIST}/${n.id}`)}
            empty={<EmptyState title="Yangilik yo'q" text="Bosh sahifada yangiliklar bo'limi chiqmaydi." action={<Button to={`${LIST}/new`}>Yangi yangilik</Button>} />}
          />
        </div>
      </Card>
    </div>
  );
};

export default NewsList;
```

- [ ] **Step 5: `src/admin/screens/NewsEdit.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import type { ApiNews } from '../../../shared/types';
import { createNews, deleteNews, listNews, updateNews } from '../api';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import { withoutId } from '../lib/content-form';
import { Button, Card, Field, Input, LangPair, Page, Skeleton, SwitchRow } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/content/news';

type Form = Omit<ApiNews, 'id'>;
const EMPTY: Form = {
  badge: '', badgeRu: '', tag: '', tagRu: '', title: '', titleRu: '', text: '', textRu: '',
  cta: '', ctaRu: '', linkUrl: '', imageUrl: '', sortOrder: 0, isActive: true,
};

/** Yangilik (landing tile'i) tahriri. `id` = 'new' yoki yangilik id'si. */
const NewsEdit: FC<{ id: string }> = ({ id }) => {
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [rawForm, setForm] = useState(EMPTY as Form);
  const form = rawForm as Form;
  const [loaded, setLoaded] = useState(isNew);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isNew) return;
    listNews().then((all) => {
      const n = all.find((x) => x.id === id);
      if (!n) { setError('Yangilik topilmadi'); return; }
      setForm(withoutId(n));
      setLoaded(true);
    }).catch(() => setError('Yuklashda xatolik'));
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };

  async function save() {
    setBusy(true); setError('');
    try {
      if (isNew) {
        await createNews(form);
        setDirty(false);
        toast("Yangilik qo'shildi");
        navigate(LIST, { state: { leave: true } });
      } else {
        await updateNews(id, form);
        setDirty(false);
        toast("Saqlandi · saytda 1–5 daqiqada ko'rinadi");
      }
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: `«${form.title}» yangiligini o'chirish`,
      message: "Bosh sahifadan olib tashlanadi. Faqat yashirish kerak bo'lsa «Saytda ko'rsatilsin»ni o'chiring.",
      confirmLabel: "O'chirish", destructive: true,
    });
    if (!ok) return;
    try {
      await deleteNews(id);
      setDirty(false);
      toast("Yangilik o'chirildi");
      navigate(LIST, { state: { leave: true } });
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const canSave = dirty && !busy && form.title.trim() !== '' && form.imageUrl !== '';

  return (
    <Page
      title={isNew ? 'Yangi yangilik' : form.title || 'Yangilik'}
      back={LIST}
      dirty={dirty}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>}
    >
      {!loaded && !error ? <Skeleton rows={6} /> : (
        <div className="flex flex-col gap-4">
          {error && <p className="text-para text-danger">{error}</p>}
          <Card title="Rasm" description="Shaffof fonli PNG yoki WebP (mahsulot renderi) — qorong'i mavzuda ham toza turadi. Rasm majburiy.">
            <ImageUploader label="Rasm" images={form.imageUrl ? [form.imageUrl] : []} onChange={(next) => set('imageUrl', next[0] ?? '')} />
          </Card>
          <Card title="Matn">
            <div className="flex flex-col gap-4">
              <LangPair label="Sarlavha" required hint="80 belgigacha" uz={form.title} ru={form.titleRu} onUz={(v) => set('title', v)} onRu={(v) => set('titleRu', v)} />
              <LangPair label="Matn" kind="textarea" rows={2} hint="Bir-ikki qator, 200 belgigacha" uz={form.text} ru={form.textRu} onUz={(v) => set('text', v)} onRu={(v) => set('textRu', v)} />
              <LangPair label="Yorliq" hint="To'q sariq, masalan «Yangi»" uz={form.badge} ru={form.badgeRu} onUz={(v) => set('badge', v)} onRu={(v) => set('badgeRu', v)} />
              <LangPair label="Teg" hint="Yashil, masalan «Tez orada»" uz={form.tag} ru={form.tagRu} onUz={(v) => set('tag', v)} onRu={(v) => set('tagRu', v)} />
              <LangPair label="Tugma matni" hint="Bo'sh bo'lsa «Batafsil»" uz={form.cta} ru={form.ctaRu} onUz={(v) => set('cta', v)} onRu={(v) => set('ctaRu', v)} />
            </div>
          </Card>
          <Card title="Havola va ko'rinish">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Havola" hint="Bo'sh bo'lsa tugma chiqmaydi">
                <Input value={form.linkUrl} onChange={(v) => set('linkUrl', v)} placeholder="/category/apple?tur=iphone" />
              </Field>
              <Field label="Tartib" hint="Bosh sahifada birinchi 3 ta faoli chiqadi — kichigi oldin">
                <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
              </Field>
            </div>
            <div className="mt-2 divide-y divide-line">
              <SwitchRow label="Saytda ko'rsatilsin" on={form.isActive} onChange={(v) => set('isActive', v)} />
            </div>
          </Card>
          {!isNew && (
            <Card title="Xavfli zona">
              <Button variant="destructive" onClick={remove}>Yangilikni o'chirish</Button>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
};

export default NewsEdit;
```

- [ ] **Step 6: Kategoriya cover'i — foto rejimi**

`src/admin/screens/CategoryEdit.tsx`:
- Importlarga (`import ImageUploader from '../ImageUploader';`dan keyin): `import { PHOTO_UPLOAD } from '../lib/content-form';`
- `<ImageUploader label="Cover" images={form.coverUrl ? [form.coverUrl] : []} onChange={(next) => set('coverUrl', next[0] ?? '')} />` → oxiriga `normalize={PHOTO_UPLOAD}` qo'shing:

```tsx
            <ImageUploader label="Cover" images={form.coverUrl ? [form.coverUrl] : []} onChange={(next) => set('coverUrl', next[0] ?? '')} normalize={PHOTO_UPLOAD} />
```

- [ ] **Step 7: Navigatsiya, ulash, eski fayllarni o'chirish**

`src/admin/nav.ts` — kontent tablarida:

```ts
      { id: 'banners', segment: 'banners', label: 'Bannerlar', Icon: Image, detail: true },
      { id: 'news', segment: 'news', label: 'Yangiliklar', Icon: Megaphone, detail: true },
```

`src/admin/AdminApp.tsx`:
- `import BannerList from './BannerList';` va `import NewsList from './NewsList';` qatorlari o'rniga:

```tsx
import BannersList from './screens/BannersList';
import BannerEdit from './screens/BannerEdit';
import NewsList from './screens/NewsList';
import NewsEdit from './screens/NewsEdit';
```

- `screenFor`dagi ikki qator o'rniga:

```tsx
    case 'content/banners': return id ? <BannerEdit key={id} id={id} /> : <BannersList />;
    case 'content/news': return id ? <NewsEdit key={id} id={id} /> : <NewsList />;
```

Eski fayllar:

```bash
git rm src/admin/BannerList.tsx src/admin/BannerForm.tsx src/admin/NewsList.tsx src/admin/NewsForm.tsx
```

Run: `grep -rn "from './BannerList'\|from './NewsList'\|BannerForm\|NewsForm" src/`
Expected: bo'sh.

- [ ] **Step 8: Lint va testlar**

Run: `bun run lint && bun run test`
Expected: lint 0; `Test Files 32 passed (32)`, `Tests 359 passed (359)`.

- [ ] **Step 9: Commit**

```bash
git add src/admin/useActiveToggle.ts src/admin/screens/BannersList.tsx src/admin/screens/BannerEdit.tsx src/admin/screens/NewsList.tsx src/admin/screens/NewsEdit.tsx src/admin/screens/CategoryEdit.tsx src/admin/nav.ts src/admin/AdminApp.tsx
git commit -m "feat(admin): bannerlar va yangiliklar kit bilan; ro'yxatda faol toggle, foto yuklash kesilmaydi

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 10 (controller): brauzer**

1. **Banner yaratish.** `/admin/content/banners` → "Yangi banner".
   - Rasm tanlanmaguncha "Saqlash" o'chiq.
   - Yuklagichga `pick(..., 'sinov.png', 'image/png')`.
   - "Rasm tavsifi" = `SINOV banner`; havola `javascript:x` → "Saqlash" → xato matni `Link '/' yoki 'https://' bilan boshlanishi kerak`.
   - Havolani `/chegirmalar`ga tuzatib "Saqlash" → ro'yxatga qaytadi, toast.
2. **Banner ro'yxati.**
   - `SINOV banner` qatori eskiz bilan ko'rinadi.
   - Toggle o'chiriladi → toast "Yashirildi"; `/api/admin/banners`da `isActive: false`.
   - Toggle qayta yoqiladi.
   - `(await (await fetch('/')).text()).includes(<rasm yo'li>)` → `true`.
3. **Banner o'chirish.** Qatorni bosish → tahrir → "Bannerni o'chirish" → tasdiq dialogi → "O'chirish" → ro'yxatda yo'q.
4. **Yangilik.** `/admin/content/news` → "Yangi yangilik".
   - Sarlavha `SINOV yangilik`, rasm → saqlanadi.
   - Ro'yxatda "Bosh sahifada — Ko'rinadi" (agar 3 tadan kam faol bo'lsa); landing HTML'ida `SINOV yangilik` bor.
   - Oxirida o'chiriladi.
5. **Kategoriya cover'i.** `/admin/products/categories/pc` sahifasi xatosiz ochiladi. Cover yuklanmaydi — ishlov unit testda.
6. **Tozalash.** Konsolda xato yo'q; sinov yozuvlari o'chirilgan.

---

### Task 4: Blog va Vakansiyalar kit bilan, vakansiyalar sahifasi matni

**Files:**
- Create: `src/admin/MarkdownHelp.tsx`
- Create: `src/admin/screens/PostsList.tsx`
- Create: `src/admin/screens/PostEdit.tsx`
- Create: `src/admin/screens/VacanciesList.tsx`
- Create: `src/admin/screens/VacancyEdit.tsx`
- Create: `src/admin/screens/VacanciesText.tsx`
- Modify: `src/admin/nav.ts`
- Modify: `src/admin/AdminApp.tsx`
- Delete: `src/admin/PostList.tsx`, `src/admin/PostForm.tsx`, `src/admin/VacancyList.tsx`, `src/admin/VacancyForm.tsx`

**Interfaces:**
- Consumes:
  - `useActiveToggle` (T3);
  - `ContentPage` (T2);
  - `PHOTO_UPLOAD`, `withoutId` (T2);
  - `LangPair` `mono` (T2);
  - `listPosts/createPost/updatePost/deletePost`, `listVacancies/createVacancy/updateVacancy/deleteVacancy` (mavjud);
  - `ApiPost`, `ApiVacancy`, `EmploymentType`.
- Produces:
  - `MarkdownHelp` (default, `FC`) — T5 ishlatadi;
  - `VACANCIES_TEXT_ID = 'matn'`;
  - `EMPLOYMENT_LABEL: Record<EmploymentType, string>` (`VacancyEdit.tsx`dan eksport).

- [ ] **Step 1: `src/admin/MarkdownHelp.tsx`**

```tsx
import type { FC } from 'react';

/** `src/lib/markdown.ts` tushunadigan 6 sintaksis. */
const ROWS: [string, string][] = [
  ['## Sarlavha', "Bo'lim sarlavhasi"],
  ['### Kichik sarlavha', 'Kichik sarlavha'],
  ['- Band', "Ro'yxat"],
  ['1. Band', "Raqamli ro'yxat (raqamdan keyin nuqta va bo'shliq)"],
  ['**qalin**', 'Qalin matn'],
  ['[matn](/katalog)', "Havola — / yoki https:// bilan"],
];

/** Markdown maydoni ostidagi yig'ma yordam. */
const MarkdownHelp: FC = () => (
  <details className="text-label text-muted">
    <summary className="press w-fit cursor-pointer text-cta">Matn qanday yoziladi</summary>
    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
      {ROWS.map(([code, text]) => (
        <div key={code} className="contents">
          <dt><code className="font-mono text-primary">{code}</code></dt>
          <dd>{text}</dd>
        </div>
      ))}
    </dl>
    <p className="mt-2">Ketma-ket qatorlar bitta xatboshi bo'ladi; yangi xatboshi — bo'sh qator.</p>
  </details>
);

export default MarkdownHelp;
```

- [ ] **Step 2: `src/admin/screens/PostsList.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { ApiPost } from '../../../shared/types';
import { listPosts, updatePost } from '../api';
import { Button, Card, DataTable, EmptyState, SearchInput, Skeleton, Toggle, type Column } from '../ui';
import { useActiveToggle } from '../useActiveToggle';

const LIST = '/admin/content/posts';

/** ISO sana (YYYY-MM-DD) → dd.mm.yyyy. */
const showDate = (iso: string) => (iso ? iso.split('-').reverse().join('.') : 'Sanasiz');

/** Blog maqolalari — yangisi tepada (saytdagi tartib); qidiruv URL'da (`q`). Qator bosilsa tahrir. */
const PostsList: FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [rawItems, setItems] = useState(null as ApiPost[] | null);
  const items = rawItems as ApiPost[] | null;
  const [error, setError] = useState('');
  const toggle = useActiveToggle(setItems, (p: ApiPost) => updatePost(p.id, p));

  useEffect(() => {
    listPosts().then(setItems).catch(() => setError('Yuklashda xatolik'));
  }, []);

  function updateQ(value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set('q', value); else next.delete('q');
    setParams(next, { replace: true });
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items ?? [];
    return (items ?? []).filter((p) => `${p.title} ${p.titleRu} ${p.slug}`.toLowerCase().includes(needle));
  }, [items, q]);

  const columns: Column<ApiPost>[] = [
    {
      id: 'cover', label: '', className: 'w-24', mobile: 'hide',
      cell: (p) => (p.coverUrl
        ? <img src={p.coverUrl} alt="" className="h-12 w-20 rounded-xs bg-fill-2 object-cover" />
        : <span className="block h-12 w-20 rounded-xs bg-fill-2" />),
    },
    {
      id: 'title', label: 'Sarlavha', mobile: 'title',
      cell: (p) => (
        <span className="flex flex-col">
          <span className="text-primary">{p.title}</span>
          <span className="text-label text-muted-2">/blog/{p.slug}</span>
        </span>
      ),
    },
    { id: 'date', label: 'Sana', className: 'w-28', cell: (p) => <span className="tabular-nums text-muted">{showDate(p.publishedAt)}</span> },
    { id: 'active', label: 'Saytda', align: 'right', className: 'w-20', cell: (p) => <Toggle on={p.isActive} onChange={(v) => toggle(p, v)} label={`${p.title} — saytda ko'rsatish`} /> },
  ];

  if (error) return <EmptyState title="Ma'lumot yuklanmadi" text={error} />;
  if (!items) return <Skeleton rows={6} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-64">
          <SearchInput value={q} onChange={updateQ} placeholder="Sarlavha bo'yicha qidirish…" />
        </div>
        <div className="sm:ml-auto">
          <Button to={`${LIST}/new`}>Yangi maqola</Button>
        </div>
      </div>
      <p className="text-label text-muted">{filtered.length} ta maqola · saytda /blog sahifasida</p>
      <Card padded={false}>
        <div className="px-2 py-1">
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(p) => p.id}
            onRowClick={(p) => navigate(`${LIST}/${p.id}`)}
            empty={q
              ? <EmptyState title="Maqola topilmadi" action={<Button variant="secondary" onClick={() => setParams({}, { replace: true })}>Filtrni tozalash</Button>} />
              : <EmptyState title="Maqola yo'q" action={<Button to={`${LIST}/new`}>Yangi maqola</Button>} />}
          />
        </div>
      </Card>
    </div>
  );
};

export default PostsList;
```

- [ ] **Step 3: `src/admin/screens/PostEdit.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import type { ApiPost } from '../../../shared/types';
import { createPost, deletePost, listPosts, updatePost } from '../api';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import { PHOTO_UPLOAD, withoutId } from '../lib/content-form';
import MarkdownHelp from '../MarkdownHelp';
import { Button, Card, Field, Input, LangPair, Page, Skeleton, SwitchRow } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/content/posts';

type Form = Omit<ApiPost, 'id'>;
const EMPTY: Form = {
  slug: '', title: '', titleRu: '', excerpt: '', excerptRu: '', content: '', contentRu: '',
  coverUrl: '', publishedAt: '', sortOrder: 0, isActive: true,
};

/** Brauzerning bugungi sanasi (YYYY-MM-DD) — yangi maqolaga. */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Blog maqolasi tahriri. `id` = 'new' yoki maqola id'si. */
const PostEdit: FC<{ id: string }> = ({ id }) => {
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [rawForm, setForm] = useState((isNew ? { ...EMPTY, publishedAt: today() } : EMPTY) as Form);
  const form = rawForm as Form;
  // "Saytda ko'rish" saqlangan slug bo'yicha — maydonda yozilayotgani hali saytda yo'q.
  const [savedSlug, setSavedSlug] = useState('');
  const [loaded, setLoaded] = useState(isNew);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isNew) return;
    listPosts().then((all) => {
      const p = all.find((x) => x.id === id);
      if (!p) { setError('Maqola topilmadi'); return; }
      setForm(withoutId(p));
      setSavedSlug(p.slug);
      setLoaded(true);
    }).catch(() => setError('Yuklashda xatolik'));
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };

  async function save() {
    setBusy(true); setError('');
    try {
      if (isNew) {
        await createPost(form);
        setDirty(false);
        toast("Maqola qo'shildi");
        navigate(LIST, { state: { leave: true } });
      } else {
        // Server bo'sh slug'ni sarlavhadan yasaydi — forma saqlangan qiymatni oladi.
        const saved = await updatePost(id, form);
        setForm(withoutId(saved));
        setSavedSlug(saved.slug);
        setDirty(false);
        toast("Saqlandi · saytda 1–5 daqiqada ko'rinadi");
      }
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: `«${form.title}» maqolasini o'chirish`,
      message: "Maqola blogdan olib tashlanadi. Faqat yashirish kerak bo'lsa «Saytda ko'rsatilsin»ni o'chiring.",
      confirmLabel: "O'chirish", destructive: true,
    });
    if (!ok) return;
    try {
      await deletePost(id);
      setDirty(false);
      toast("Maqola o'chirildi");
      navigate(LIST, { state: { leave: true } });
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const canSave = dirty && !busy && form.title.trim() !== '';

  return (
    <Page
      title={isNew ? 'Yangi maqola' : form.title || 'Maqola'}
      back={LIST}
      dirty={dirty}
      actions={(
        <>
          {!isNew && form.isActive && savedSlug && <Button variant="quiet" href={`/blog/${savedSlug}`} external>Saytda ko'rish</Button>}
          <Button onClick={save} disabled={!canSave}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>
        </>
      )}
    >
      {!loaded && !error ? <Skeleton rows={6} /> : (
        <div className="flex flex-col gap-4">
          {error && <p className="text-para text-danger">{error}</p>}
          <Card title="Muqova" description="Blog ro'yxatidagi kartada va maqola tepasida chiqadi.">
            <ImageUploader label="Muqova rasmi" images={form.coverUrl ? [form.coverUrl] : []} onChange={(next) => set('coverUrl', next[0] ?? '')} normalize={PHOTO_UPLOAD} />
          </Card>
          <Card title="Sarlavha va qisqa matn">
            <div className="flex flex-col gap-4">
              <LangPair label="Sarlavha" required uz={form.title} ru={form.titleRu} onUz={(v) => set('title', v)} onRu={(v) => set('titleRu', v)} />
              <LangPair label="Qisqa matn" kind="textarea" rows={2} hint="Ro'yxatdagi kartada chiqadi" uz={form.excerpt} ru={form.excerptRu} onUz={(v) => set('excerpt', v)} onRu={(v) => set('excerptRu', v)} />
            </div>
          </Card>
          <Card title="Matn">
            <div className="flex flex-col gap-3">
              <LangPair label="Matn" kind="textarea" rows={14} mono uz={form.content} ru={form.contentRu} onUz={(v) => set('content', v)} onRu={(v) => set('contentRu', v)} />
              <MarkdownHelp />
            </div>
          </Card>
          <Card title="Manzil va ko'rinish">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Slug" hint="Saytdagi /blog/<slug> manzili; bo'sh qolsa sarlavhadan yasaladi">
                <Input value={form.slug} onChange={(v) => set('slug', v)} placeholder="montaj-uchun-pc" />
              </Field>
              <Field label="Sana" hint="Bo'sh bo'lsa sana ko'rsatilmaydi; blog yangisidan boshlanadi">
                <Input type="date" value={form.publishedAt} onChange={(v) => set('publishedAt', v)} />
              </Field>
              <Field label="Tartib" hint="Bir kundagi maqolalar orasida — kichigi oldin">
                <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
              </Field>
            </div>
            <div className="mt-2 divide-y divide-line">
              <SwitchRow label="Saytda ko'rsatilsin" on={form.isActive} onChange={(v) => set('isActive', v)} />
            </div>
          </Card>
          {!isNew && (
            <Card title="Xavfli zona">
              <Button variant="destructive" onClick={remove}>Maqolani o'chirish</Button>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
};

export default PostEdit;
```

- [ ] **Step 4: `src/admin/screens/VacancyEdit.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import type { ApiVacancy, EmploymentType } from '../../../shared/types';
import { createVacancy, deleteVacancy, listVacancies, updateVacancy } from '../api';
import { errText } from '../errText';
import { withoutId } from '../lib/content-form';
import MarkdownHelp from '../MarkdownHelp';
import { Button, Card, Field, Input, LangPair, Page, Select, Skeleton, SwitchRow } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/content/vacancies';

export const EMPLOYMENT_LABEL: Record<EmploymentType, string> = { full: "To'liq stavka", part: 'Yarim stavka', intern: 'Amaliyot' };

type Form = Omit<ApiVacancy, 'id'>;
const EMPTY: Form = {
  title: '', titleRu: '', department: '', departmentRu: '', employment: 'full',
  salary: '', salaryRu: '', description: '', descriptionRu: '', sortOrder: 0, isActive: true,
};

/** Vakansiya tahriri. `id` = 'new' yoki vakansiya id'si. */
const VacancyEdit: FC<{ id: string }> = ({ id }) => {
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [rawForm, setForm] = useState(EMPTY as Form);
  const form = rawForm as Form;
  const [loaded, setLoaded] = useState(isNew);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isNew) return;
    listVacancies().then((all) => {
      const v = all.find((x) => x.id === id);
      if (!v) { setError('Vakansiya topilmadi'); return; }
      setForm(withoutId(v));
      setLoaded(true);
    }).catch(() => setError('Yuklashda xatolik'));
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };

  async function save() {
    setBusy(true); setError('');
    try {
      if (isNew) {
        await createVacancy(form);
        setDirty(false);
        toast("Vakansiya qo'shildi");
        navigate(LIST, { state: { leave: true } });
      } else {
        await updateVacancy(id, form);
        setDirty(false);
        toast("Saqlandi · saytda 1–5 daqiqada ko'rinadi");
      }
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: `«${form.title}» vakansiyasini o'chirish`,
      message: "Saytdan olib tashlanadi; unga kelgan arizalar qoladi. Faqat yashirish kerak bo'lsa «Saytda ko'rsatilsin»ni o'chiring.",
      confirmLabel: "O'chirish", destructive: true,
    });
    if (!ok) return;
    try {
      await deleteVacancy(id);
      setDirty(false);
      toast("Vakansiya o'chirildi");
      navigate(LIST, { state: { leave: true } });
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const canSave = dirty && !busy && form.title.trim() !== '';

  return (
    <Page
      title={isNew ? 'Yangi vakansiya' : form.title || 'Vakansiya'}
      back={LIST}
      dirty={dirty}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>}
    >
      {!loaded && !error ? <Skeleton rows={6} /> : (
        <div className="flex flex-col gap-4">
          {error && <p className="text-para text-danger">{error}</p>}
          <Card title="Lavozim">
            <div className="flex flex-col gap-4">
              <LangPair label="Lavozim" required uz={form.title} ru={form.titleRu} onUz={(v) => set('title', v)} onRu={(v) => set('titleRu', v)} />
              <LangPair label="Bo'lim" hint="Masalan «Sotuv», «Servis»" uz={form.department} ru={form.departmentRu} onUz={(v) => set('department', v)} onRu={(v) => set('departmentRu', v)} />
              <LangPair label="Maosh" hint="Bo'sh bo'lsa ko'rsatilmaydi" uz={form.salary} ru={form.salaryRu} onUz={(v) => set('salary', v)} onRu={(v) => set('salaryRu', v)} />
              <Field label="Bandlik turi" className="md:w-1/2">
                <Select value={form.employment} onChange={(v) => set('employment', v as EmploymentType)}>
                  {(Object.keys(EMPLOYMENT_LABEL) as EmploymentType[]).map((k) => <option key={k} value={k}>{EMPLOYMENT_LABEL[k]}</option>)}
                </Select>
              </Field>
            </div>
          </Card>
          <Card title="Tavsif" description="Vazifalar va talablar — saytda vakansiya qatori ochilganda chiqadi.">
            <div className="flex flex-col gap-3">
              <LangPair label="Tavsif" kind="textarea" rows={10} mono hint="«## Vazifalar» sarlavhasi, «- » bilan ro'yxat" uz={form.description} ru={form.descriptionRu} onUz={(v) => set('description', v)} onRu={(v) => set('descriptionRu', v)} />
              <MarkdownHelp />
            </div>
          </Card>
          <Card title="Ko'rinish">
            <Field label="Tartib" hint="Saytdagi ro'yxatda — kichigi oldin" className="md:w-1/2">
              <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
            </Field>
            <div className="mt-2 divide-y divide-line">
              <SwitchRow label="Saytda ko'rsatilsin" on={form.isActive} onChange={(v) => set('isActive', v)} />
            </div>
          </Card>
          {!isNew && (
            <Card title="Xavfli zona">
              <Button variant="destructive" onClick={remove}>Vakansiyani o'chirish</Button>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
};

export default VacancyEdit;
```

- [ ] **Step 5: `src/admin/screens/VacanciesText.tsx`**

```tsx
import type { FC } from 'react';
import { ContentPage } from '../ContentFields';

/** `/admin/content/vacancies/matn` — vakansiya id'lari UUID, shu so'z bilan to'qnashmaydi. */
export const VACANCIES_TEXT_ID = 'matn';

/** Vakansiyalar sahifasining matnlari va fotolari (`careers` guruhi). */
const VacanciesText: FC = () => (
  <ContentPage group="careers" title="Vakansiyalar sahifasi" siteHref="/vakansiyalar" back="/admin/content/vacancies" />
);

export default VacanciesText;
```

- [ ] **Step 6: `src/admin/screens/VacanciesList.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Link, useNavigate } from 'react-router';
import type { ApiVacancy } from '../../../shared/types';
import { listVacancies, updateVacancy } from '../api';
import { Button, Card, DataTable, EmptyState, Skeleton, Toggle, type Column } from '../ui';
import { useActiveToggle } from '../useActiveToggle';
import { EMPLOYMENT_LABEL } from './VacancyEdit';
import { VACANCIES_TEXT_ID } from './VacanciesText';

const LIST = '/admin/content/vacancies';

/** Vakansiyalar: tepada sahifa matni kartasi, ostida lavozimlar (faollari saytda tartib bo'yicha). */
const VacanciesList: FC = () => {
  const navigate = useNavigate();
  const [rawItems, setItems] = useState(null as ApiVacancy[] | null);
  const items = rawItems as ApiVacancy[] | null;
  const [error, setError] = useState('');
  const toggle = useActiveToggle(setItems, (v: ApiVacancy) => updateVacancy(v.id, v));

  useEffect(() => {
    listVacancies().then(setItems).catch(() => setError('Yuklashda xatolik'));
  }, []);

  const columns: Column<ApiVacancy>[] = [
    {
      id: 'title', label: 'Lavozim', mobile: 'title',
      cell: (v) => (
        <span className="flex flex-col">
          <span className="text-primary">{v.title}</span>
          <span className="text-label text-muted-2">{[v.department, EMPLOYMENT_LABEL[v.employment]].filter(Boolean).join(' · ')}</span>
        </span>
      ),
    },
    { id: 'salary', label: 'Maosh', cell: (v) => <span className="text-muted">{v.salary || '—'}</span> },
    { id: 'sort', label: 'Tartib', align: 'right', className: 'w-20', cell: (v) => <span className="text-muted">{v.sortOrder}</span> },
    { id: 'active', label: 'Saytda', align: 'right', className: 'w-20', cell: (v) => <Toggle on={v.isActive} onChange={(on) => toggle(v, on)} label={`${v.title} — saytda ko'rsatish`} /> },
  ];

  if (error) return <EmptyState title="Ma'lumot yuklanmadi" text={error} />;
  if (!items) return <Skeleton rows={4} />;

  return (
    <div className="flex flex-col gap-4">
      <Card
        title="Sahifa matni"
        description="Vakansiyalar sahifasidagi sarlavha, matnlar va 2 ta foto."
        actions={<Button variant="secondary" to={`${LIST}/${VACANCIES_TEXT_ID}`}>Tahrirlash</Button>}
      >
        <a href="/vakansiyalar" target="_blank" rel="noopener noreferrer" className="press text-para text-cta">Saytda ko'rish</a>
      </Card>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-para text-muted">
          Faol vakansiyalar saytda tartib bo'yicha chiqadi; bittasi ham bo'lmasa umumiy ariza formasi turadi. Nomzodlar arizalari —{' '}
          <Link to="/admin/orders/applications" className="press text-cta">Ish arizalari</Link>.
        </p>
        <div className="sm:ml-auto">
          <Button to={`${LIST}/new`}>Yangi vakansiya</Button>
        </div>
      </div>
      <Card padded={false}>
        <div className="px-2 py-1">
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(v) => v.id}
            onRowClick={(v) => navigate(`${LIST}/${v.id}`)}
            empty={<EmptyState title="Vakansiya yo'q" text="Saytda umumiy ariza formasi chiqadi." action={<Button to={`${LIST}/new`}>Yangi vakansiya</Button>} />}
          />
        </div>
      </Card>
    </div>
  );
};

export default VacanciesList;
```

- [ ] **Step 7: Navigatsiya, ulash, eski fayllarni o'chirish**

`src/admin/nav.ts` — kontent tablarida:

```ts
      { id: 'posts', segment: 'posts', label: 'Blog', Icon: Newspaper, detail: true },
```

```ts
      { id: 'vacancies', segment: 'vacancies', label: 'Vakansiyalar', Icon: Briefcase, detail: true },
```

`src/admin/AdminApp.tsx`:
- `import PostList from './PostList';` o'rniga:

```tsx
import PostsList from './screens/PostsList';
import PostEdit from './screens/PostEdit';
```

- `import VacancyList from './VacancyList';` o'rniga:

```tsx
import VacanciesList from './screens/VacanciesList';
import VacancyEdit from './screens/VacancyEdit';
import VacanciesText, { VACANCIES_TEXT_ID } from './screens/VacanciesText';
```

- `screenFor`da:

```tsx
    case 'content/posts': return id ? <PostEdit key={id} id={id} /> : <PostsList />;
```

```tsx
    case 'content/vacancies':
      if (id === VACANCIES_TEXT_ID) return <VacanciesText />;
      return id ? <VacancyEdit key={id} id={id} /> : <VacanciesList />;
```

Eski fayllar:

```bash
git rm src/admin/PostList.tsx src/admin/PostForm.tsx src/admin/VacancyList.tsx src/admin/VacancyForm.tsx
```

Run: `grep -rn "PostForm\|VacancyForm\|from './PostList'\|from './VacancyList'" src/`
Expected: bo'sh.

- [ ] **Step 8: Lint va testlar**

Run: `bun run lint && bun run test`
Expected: lint 0; `Test Files 32 passed (32)`, `Tests 359 passed (359)`.

- [ ] **Step 9: Commit**

```bash
git add src/admin/MarkdownHelp.tsx src/admin/screens/PostsList.tsx src/admin/screens/PostEdit.tsx src/admin/screens/VacanciesList.tsx src/admin/screens/VacancyEdit.tsx src/admin/screens/VacanciesText.tsx src/admin/nav.ts src/admin/AdminApp.tsx
git commit -m "feat(admin): blog va vakansiyalar kit bilan; vakansiyalar sahifasi matni admin'dan

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 10 (controller): brauzer**

1. **Blog.** `/admin/content/posts` → "Yangi maqola".
   - Sana bugungi.
   - Sarlavha `SINOV maqola`, matn `## Bir\n\n- ikki` → saqlanadi → ro'yxatda.
   - Qidiruv `sinov` → 1 ta.
   - Tahrirda slug `sinov-maqola`, "Saytda ko'rish" → `/blog/sinov-maqola` (fetch 200, HTML'da `SINOV maqola`).
   - "Matn qanday yoziladi" ochiladi.
   - O'chiriladi.
2. **Vakansiya.** `/admin/content/vacancies` → "Yangi vakansiya": `SINOV lavozim`, bandlik "Yarim stavka" → saqlanadi.
   - Qatorda `Yarim stavka` ko'rinadi.
   - `/vakansiyalar` HTML'ida `SINOV lavozim` bor.
   - Toggle o'chiriladi → saytda yo'q → qayta yoqiladi → o'chiriladi.
3. **Sahifa matni.** "Sahifa matni → Tahrirlash" → `/admin/content/vacancies/matn`.
   - Kartalar: `Qidiruv tizimlari … Vakansiyalar va ariza, Rasmlar`.
   - "Hero va kirish → Sarlavha" = `SINOV sarlavha` → saqlanadi → `/vakansiyalar`da chiqadi.
   - Qaytariladi (maydon bo'shatiladi → saqlanadi → yana standart); `GET /api/admin/texts` `values` `{}`.
   - "Orqaga" ro'yxatga qaytaradi.
4. **Tozalash.** Konsolda xato yo'q.

---

### Task 5: Sahifalar ("Biz haqimizda", huquqiy izohlar) va hujjat

**Files:**
- Create: `src/admin/screens/PagesList.tsx`
- Create: `src/admin/screens/PageEdit.tsx`
- Modify: `src/admin/nav.ts`
- Modify: `src/admin/AdminApp.tsx`
- Delete: `src/admin/PageList.tsx`, `src/admin/PageForm.tsx`
- Modify: `CLAUDE.md`
- Modify: `docs/superpowers/specs/2026-09-15-admin-redesign-design.md`

**Interfaces:**
- Consumes:
  - `ABOUT_SLUG`, `LEGAL_LEDE_KEYS` (T1, `src/lib/page-slugs.ts`);
  - `useSiteContent`, `ContentFields` (T2);
  - `MarkdownHelp` (T4);
  - `useActiveToggle` (T3);
  - `listPages/createPage/updatePage/deletePage` (mavjud; `updatePage` saqlangan `ApiPage`ni qaytaradi);
  - `ApiPage`.
- Produces: `PagesList`, `PageEdit` (default eksportlar).

- [ ] **Step 1: `src/admin/screens/PagesList.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import { ExternalLink } from 'lucide-react';
import type { ApiPage } from '../../../shared/types';
import { ABOUT_SLUG, LEGAL_LEDE_KEYS } from '../../lib/page-slugs';
import { listPages, updatePage } from '../api';
import { Badge, Button, Card, DataTable, EmptyState, Skeleton, Toggle, type Column } from '../ui';
import { useActiveToggle } from '../useActiveToggle';

const LIST = '/admin/content/pages';

/** Maxsus shablonli sahifalar — tahririda qo'shimcha maydonlar bor. */
function pageKind(slug: string): string {
  if (slug === ABOUT_SLUG) return 'Biz haqimizda';
  return LEGAL_LEDE_KEYS[slug] ? 'Huquqiy' : '';
}

/** Kontent sahifalari — faollari saytda ochiladi va footer'da chiqadi. Qator bosilsa tahrir. */
const PagesList: FC = () => {
  const navigate = useNavigate();
  const [rawItems, setItems] = useState(null as ApiPage[] | null);
  const items = rawItems as ApiPage[] | null;
  const [error, setError] = useState('');
  const toggle = useActiveToggle(setItems, (p: ApiPage) => updatePage(p.id, p));

  useEffect(() => {
    listPages().then(setItems).catch(() => setError('Yuklashda xatolik'));
  }, []);

  const columns: Column<ApiPage>[] = [
    {
      id: 'title', label: 'Sahifa', mobile: 'title',
      cell: (p) => (
        <span className="flex flex-col">
          <span className="text-primary">{p.title.uz}</span>
          <span className="text-label text-muted-2">/page/{p.slug}</span>
        </span>
      ),
    },
    { id: 'kind', label: 'Shablon', className: 'w-36', cell: (p) => (pageKind(p.slug) ? <Badge>{pageKind(p.slug)}</Badge> : <span className="text-muted-2">Matn</span>) },
    { id: 'sort', label: 'Tartib', align: 'right', className: 'w-20', cell: (p) => <span className="text-muted">{p.sortOrder}</span> },
    {
      id: 'open', label: '', className: 'w-12', mobile: 'hide',
      cell: (p) => (
        <a
          href={`/page/${p.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${p.title.uz} — saytda ko'rish`}
          className="press inline-flex size-9 items-center justify-center rounded-xs text-muted hover:bg-fill-2 hover:text-primary"
        >
          <ExternalLink aria-hidden className="size-4" />
        </a>
      ),
    },
    { id: 'active', label: 'Saytda', align: 'right', className: 'w-20', cell: (p) => <Toggle on={p.isActive} onChange={(v) => toggle(p, v)} label={`${p.title.uz} — saytda ko'rsatish`} /> },
  ];

  if (error) return <EmptyState title="Ma'lumot yuklanmadi" text={error} />;
  if (!items) return <Skeleton rows={6} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-para text-muted">Faol sahifalar saytda ochiladi va footer'da chiqadi. «Biz haqimizda» va huquqiy hujjatlar tahririda qo'shimcha maydonlar bor.</p>
        <div className="sm:ml-auto">
          <Button to={`${LIST}/new`}>Yangi sahifa</Button>
        </div>
      </div>
      <Card padded={false}>
        <div className="px-2 py-1">
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(p) => p.id}
            onRowClick={(p) => navigate(`${LIST}/${p.id}`)}
            empty={<EmptyState title="Sahifa yo'q" action={<Button to={`${LIST}/new`}>Yangi sahifa</Button>} />}
          />
        </div>
      </Card>
    </div>
  );
};

export default PagesList;
```

- [ ] **Step 2: `src/admin/screens/PageEdit.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import type { ApiPage } from '../../../shared/types';
import { ABOUT_SLUG, LEGAL_LEDE_KEYS } from '../../lib/page-slugs';
import { createPage, deletePage, listPages, updatePage } from '../api';
import { ContentFields, useSiteContent } from '../ContentFields';
import { errText } from '../errText';
import MarkdownHelp from '../MarkdownHelp';
import { Button, Card, Field, Input, LangPair, Page, Skeleton, SwitchRow } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/content/pages';

interface Form { slug: string; titleUz: string; titleRu: string; contentUz: string; contentRu: string; sortOrder: number; isActive: boolean }
const EMPTY: Form = { slug: '', titleUz: '', titleRu: '', contentUz: '', contentRu: '', sortOrder: 0, isActive: true };

function toForm(p: ApiPage): Form {
  return { slug: p.slug, titleUz: p.title.uz, titleRu: p.title.ru, contentUz: p.content.uz, contentRu: p.content.ru, sortOrder: p.sortOrder, isActive: p.isActive };
}

/**
 * Sahifa tahriri. `biz-haqimizda` — markdown o'rniga `about` matnlari va fotolari; huquqiy sahifalarda sarlavha
 * ostidagi izoh (sayt matni). Shablon saqlangan slug'ga bog'liq — maxsus sahifaning slug'i o'zgarmaydi, o'chirilmaydi.
 */
const PageEdit: FC<{ id: string }> = ({ id }) => {
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [rawForm, setForm] = useState(EMPTY as Form);
  const form = rawForm as Form;
  const [rawInitial, setInitial] = useState(null as ApiPage | null);
  const initial = rawInitial as ApiPage | null;
  const [loaded, setLoaded] = useState(isNew);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const savedSlug = initial?.slug ?? '';
  const isAbout = savedSlug === ABOUT_SLUG;
  const ledeKey = LEGAL_LEDE_KEYS[savedSlug];
  const special = isAbout || Boolean(ledeKey);
  // Oddiy sahifada kalit ro'yxati bo'sh — sayt matni kartasi chizilmaydi.
  const content = useSiteContent(isAbout ? 'about' : 'legal', isAbout ? undefined : ledeKey ? [ledeKey] : []);

  useEffect(() => {
    if (isNew) return;
    listPages().then((all) => {
      const p = all.find((x) => x.id === id);
      if (!p) { setError('Sahifa topilmadi'); return; }
      setInitial(p);
      setForm(toForm(p));
      setLoaded(true);
    }).catch(() => setError('Yuklashda xatolik'));
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };

  async function save() {
    setBusy(true); setError('');
    // en/uzCyrl ustunlari saytda chiqmaydi — eski qiymat saqlanadi. Ruscha sarlavha serverda majburiy:
    // bo'sh qolsa o'zbekchasi yoziladi (saytdagi "ruscha bo'lmasa o'zbekchasi" qoidasi).
    const payload: Partial<ApiPage> = {
      slug: form.slug.trim(),
      title: { uz: form.titleUz, ru: form.titleRu.trim() || form.titleUz, en: initial?.title.en ?? '', uzCyrl: initial?.title.uzCyrl ?? '' },
      content: { uz: form.contentUz, ru: form.contentRu, en: initial?.content.en ?? '', uzCyrl: initial?.content.uzCyrl ?? '' },
      sortOrder: form.sortOrder,
      isActive: form.isActive,
    };
    try {
      if (isNew) {
        await createPage(payload);
        setDirty(false);
        toast("Sahifa qo'shildi");
        navigate(LIST, { state: { leave: true } });
        return;
      }
      if (dirty) {
        const saved = await updatePage(id, payload);
        setInitial(saved);
        setForm(toForm(saved));
        setDirty(false);
      }
      if (content.dirty) await content.save();
      toast("Saqlandi · saytda 1–5 daqiqada ko'rinadi");
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!initial) return;
    const ok = await confirm({
      title: `«${initial.title.uz}» sahifasini o'chirish`,
      message: "Sahifa saytdan va footer'dan olib tashlanadi. Faqat yashirish kerak bo'lsa «Saytda ko'rsatilsin»ni o'chiring.",
      confirmLabel: "O'chirish", destructive: true,
    });
    if (!ok) return;
    try {
      await deletePage(id);
      setDirty(false);
      toast("Sahifa o'chirildi");
      navigate(LIST, { state: { leave: true } });
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const canSave = (dirty || content.dirty) && !busy && form.titleUz.trim() !== '' && form.slug.trim() !== '';

  return (
    <Page
      title={isNew ? 'Yangi sahifa' : form.titleUz || initial?.title.uz || 'Sahifa'}
      back={LIST}
      dirty={dirty || content.dirty}
      actions={(
        <>
          {initial?.isActive && <Button variant="quiet" href={`/page/${savedSlug}`} external>Saytda ko'rish</Button>}
          <Button onClick={save} disabled={!canSave}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>
        </>
      )}
    >
      {!loaded && !error ? <Skeleton rows={6} /> : (
        <div className="flex flex-col gap-4">
          {error && <p className="text-para text-danger">{error}</p>}
          <Card title="Sarlavha" description={isAbout ? 'Sahifa tepasida va footer havolasida chiqadi; matn va fotolar quyida.' : undefined}>
            <LangPair label="Sarlavha" required uz={form.titleUz} ru={form.titleRu} onUz={(v) => set('titleUz', v)} onRu={(v) => set('titleRu', v)} />
          </Card>
          {special && <ContentFields content={content} />}
          {!isAbout && (
            <Card title="Matn" description="Sahifaning asosiy matni.">
              <div className="flex flex-col gap-3">
                <LangPair label="Matn" kind="textarea" rows={16} mono uz={form.contentUz} ru={form.contentRu} onUz={(v) => set('contentUz', v)} onRu={(v) => set('contentRu', v)} />
                <MarkdownHelp />
              </div>
            </Card>
          )}
          <Card title="Manzil va ko'rinish">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Slug" required hint={special ? "Maxsus sahifa — manzili o'zgarmaydi" : "Saytdagi /page/<slug> manzili: kichik lotin harflari, raqam va «-»"}>
                <Input value={form.slug} onChange={(v) => set('slug', v)} disabled={special} placeholder="qaytarish" />
              </Field>
              <Field label="Tartib" hint="Footer'dagi o'rni — kichigi oldin">
                <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
              </Field>
            </div>
            <div className="mt-2 divide-y divide-line">
              <SwitchRow label="Saytda ko'rsatilsin" hint="O'chirilsa sahifa ochilmaydi va footer'da chiqmaydi" on={form.isActive} onChange={(v) => set('isActive', v)} />
            </div>
          </Card>
          {!isNew && !special && (
            <Card title="Xavfli zona">
              <Button variant="destructive" onClick={remove}>Sahifani o'chirish</Button>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
};

export default PageEdit;
```

- [ ] **Step 3: Navigatsiya, ulash, eski fayllarni o'chirish**

`src/admin/nav.ts`:

```ts
      { id: 'pages', segment: 'pages', label: 'Sahifalar', Icon: BookOpen, detail: true },
```

`src/admin/AdminApp.tsx`:
- `// Eski ekranlar — bosqichma-bosqich almashtiriladi (2–5-bosqichlar), shu jadval orqali ulanadi.` → `// Ekranlar shu jadval orqali ulanadi; Sozlamalar hali eski komponentlar (5-bosqich).`
- `import PageList from './PageList';` o'rniga:

```tsx
import PagesList from './screens/PagesList';
import PageEdit from './screens/PageEdit';
```

- `screenFor`da:

```tsx
    case 'content/pages': return id ? <PageEdit key={id} id={id} /> : <PagesList />;
```

Eski fayllar:

```bash
git rm src/admin/PageList.tsx src/admin/PageForm.tsx
```

Run: `grep -rn "PageForm\|from './PageList'\|window.confirm" src/admin`
Expected: bo'sh.

- [ ] **Step 4: Lint va testlar**

Run: `bun run lint && bun run test`
Expected: lint 0; `Test Files 32 passed (32)`, `Tests 359 passed (359)`.

- [ ] **Step 5: `CLAUDE.md`**

Har almashtirish — `Edit` bilan, eski matn aynan shunday.

5a. Eski:

```text
6 bosqich; 1-, 2a-, 2b-, 3-bosqich va 4a — kontent mexanizmi bajarildi):**
```

Yangi:

```text
6 bosqich; 1–4-bosqichlar bajarildi (4a — kontent mexanizmi, 4b — kontent ekranlari)):**
```

5b. Eski:

```text
Kontent/Sozlamalar ekranlari hali eski (4–5-bosqichlar); quyidagi tavsifning o'sha qismlari eski ekranlar haqida.
```

Yangi:

```markdown
**4b (2026-09-17) — Kontent bo'limi kit bilan:** `Kontent → Bosh sahifa` (`/admin/content/home`, `screens/ContentHome.tsx`) — landing matnlari va rasmlari landing tartibida (har yo'nalish alohida karta: nom, rasm, poster, 2 video); Bannerlar/Yangiliklar/Blog/Vakansiyalar/Sahifalar — `screens/*List.tsx` + `*Edit.tsx` (`/admin/content/<tab>[/new|/:id]`; ro'yxatdagi faol toggle darhol to'liq yozuvni `PUT` qiladi — `useActiveToggle`; o'chirish tahrirning «Xavfli zona»sida). Sayt matnlari formasi bitta — `ContentFields.tsx`: `useSiteContent(group, keys?)` (`GET/PUT /api/admin/texts|assets`, faqat o'zgargan kalitlar; sof qism `lib/content-form.ts`), `ContentFields` (bo'lim kartalari), `ContentPage` (faqat matn/rasmdan iborat ekran). Maydonlar joriy matn bilan to'ldiriladi, bo'shatilsa (fayl o'chirilsa) standart qaytadi. Vakansiyalar sahifasi matni — `/admin/content/vacancies/matn` (`VacanciesText`); `biz-haqimizda` tahririda markdown o'rniga `about` matnlari va 4 foto, huquqiy sahifalarda (`LEGAL_LEDE_KEYS`, `src/lib/page-slugs.ts` — `page.tsx` bilan umumiy) sarlavha ostidagi izoh; maxsus sahifaning slug'i o'zgarmaydi va o'chirilmaydi; ruscha sarlavha bo'sh qolsa o'zbekchasi yoziladi. `ImageUploader`: `kind: 'video'` (MP4 ≤ 40 MB, normalizatsiyasiz, `<video>` eskiz), `normalize={false}` (favicon — PNG o'zgarishsiz), `fallback` (standart fayl "Standart" bo'lib ko'rinadi); fotolar `PHOTO_UPLOAD` bilan (chekkasi kesilmaydi, 2400 px — banner, blog muqovasi, kategoriya cover'i), sayt rasmlari `uploadOptions(key)` bo'yicha. Forma-tab o'z `Page`ini chizadi (`TabDef.ownPage`; mobil tablar — `SectionTabs`). Markdown yordami — `MarkdownHelp`. Sozlamalar ekranlari hali eski (5-bosqich); quyidagi tavsifning o'sha qismlari eski ekranlar haqida.
```

5c. Bo'limlar ro'yxatida (`Sections: Products, …` jumlasi) uchta almashtirish — eski → yangi:

```text
**Yangiliklar** (`NewsList`/`NewsForm` — rasm
**Yangiliklar** (rasm
```

```text
**Sahifalar** (`PageList`/`PageForm` — kontent sahifalari
**Sahifalar** (kontent sahifalari
```

```text
**Vakansiyalar** (`VacancyList`/`VacancyForm` — lavozim
**Vakansiyalar** (lavozim
```

5d. Eski ("Sayt matnlari va rasmlari" bo'limi):

```text
- Admin ekranlari (landing muharriri, Sahifalar, Sozlamalar) — 4b va 5-bosqich.
```

Yangi:

```markdown
- Admin (4b): landing — Kontent → Bosh sahifa; "Biz haqimizda" matni va fotolari hamda huquqiy sahifalar izohi — Kontent → Sahifalar; vakansiyalar sahifasi — Kontent → Vakansiyalar → Sahifa matni. `store`/`contact`/`seo` guruhlari va logo/favicon — Sozlamalar (5-bosqich). `PUT /api/admin/assets` almashtirilgan yoki olib tashlangan **video** faylini diskdan o'chiradi (`staleVideoFiles`, `ImageStore.delete`); rasmlar diskda qoladi — proxy keshidagi sahifa eski rasmni so'rashi mumkin.
```

5e. Eski ("Known dead code" bo'limi):

```text
`IconAction.tsx` Bannerlar/Yangiliklar/Blog/Sahifalar/Vakansiyalar ro'yxatlarida qoladi (4–5-bosqichlar).
```

Yangi:

```text
4b (2026-09-17): eski `BannerList/BannerForm/NewsList/NewsForm/PostList/PostForm/PageList/PageForm/VacancyList/VacancyForm` o'chirildi; `IconAction.tsx` faqat `ReviewsEditor`da qoladi.
```

- [ ] **Step 6: Spec — 4b qarorlari**

`docs/superpowers/specs/2026-09-15-admin-redesign-design.md` — quyidagi jumladan (4a qarorlari xatboshisining oxiri) keyin yangi xatboshi qo'shing:

```text
«bo'sh = standart» ustun); `PUT /api/admin/texts` standartga teng tilni bo'sh saqlaydi.
```

Qo'shiladigan xatboshi:

```markdown

4b qarorlari (2026-09-17): landing muharririda har yo'nalish alohida karta (registrda bo'lim nomi yo'nalish bo'yicha);
vakansiyalar sahifasi matni ro'yxat tepasidagi kartadan ochiladigan alohida ekranda (`/admin/content/vacancies/matn`);
`legal` bo'limi admin'da "Sarlavha ostidagi izoh"; diskdan faqat almashtirilgan **video** fayli o'chiriladi (rasm — kichik,
keshdagi sahifa uni so'rashi mumkin); yuklash ishlovi kalit bo'yicha (favicon — PNG o'zgarishsiz, logolar kesiladi, fotolar
kesilmaydi, 2400 px); forma maydonlari joriy matn bilan to'ldiriladi, bo'shatilsa standart qaytadi; sahifaning ruscha
sarlavhasi bo'sh qolsa o'zbekchasi yoziladi; maxsus sahifalarda (`biz-haqimizda`, huquqiy) slug o'zgarmaydi va o'chirish
yo'q; ro'yxatdagi faol toggle to'liq yozuvni `PUT` qiladi (yangi endpoint yo'q); kontent ro'yxatlarida qidiruv faqat Blog'da.
```

- [ ] **Step 7: Commit**

```bash
git add src/admin/screens/PagesList.tsx src/admin/screens/PageEdit.tsx src/admin/nav.ts src/admin/AdminApp.tsx CLAUDE.md docs/superpowers/specs/2026-09-15-admin-redesign-design.md
git commit -m "feat(admin): Sahifalar kit bilan — Biz haqimizda strukturali forma, huquqiy izohlar; hujjat

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 8 (controller): brauzer**

1. **Ro'yxat.** `/admin/content/pages`:
   - `biz-haqimizda` — "Biz haqimizda" belgisi;
   - `oferta`, `maxfiylik`, `qaytarish`, `muddatli-tolov` — "Huquqiy";
   - qolganlari "Matn".
   - ↗ tugmasi yangi tabda `/page/<slug>`ni ochadi (`href` tekshiriladi).
2. **`oferta`.** Kartalar: Sarlavha, "Sarlavha ostidagi izoh" (bitta maydon "Ommaviy oferta", standart matn bilan), Matn (+ yordam), Manzil va ko'rinish.
   - Slug maydoni o'chiq, "Xavfli zona" yo'q.
   - Izohga `SINOV izoh` → "Saqlash" → `/page/oferta` HTML'ida bor.
   - Qaytariladi (bo'shatib saqlash → `values` `{}`).
3. **`biz-haqimizda`.** Kartalar: Sarlavha, Kirish, Mutaxassislar, …, Yangiliklar, Rasmlar (4 foto, "Standart"). "Matn" kartasi yo'q.
   - "Kirish → Bo'lim sarlavhasi" = `SINOV nega` → saqlanadi → `/page/biz-haqimizda`da chiqadi → qaytariladi.
4. **Yangi sahifa.** "Yangi sahifa": sarlavha `SINOV sahifa` (ruschasi bo'sh), slug `sinov-sahifa`, matn `Salom` → saqlanadi → ro'yxatda.
   - `/page/sinov-sahifa` 200; `/ru/page/sinov-sahifa` sarlavhasi `SINOV sahifa`.
   - Ro'yxatda toggle o'chiriladi → `/page/sinov-sahifa` 404.
   - Tahrirda "Sahifani o'chirish" → tasdiq → ro'yxatda yo'q.
   - Slug `Katta Harf` bilan saqlash → xato `Slug faqat kichik lotin harflari…`.
5. **Oddiy sahifa.** `kontakt` (yoki boshqa oddiy sahifa) tahririda sayt matni kartasi va skeleton yo'q.
6. **Umumiy.**
   - Sidebar: Kontent tablari 6 ta, hammasi yangi ekranlar.
   - `window.confirm` hech qayerda chiqmaydi.
   - Konsolda xato yo'q.

---

## O'z-o'zini tekshirish (reja yozilgandan keyin)

- **Spec qamrovi:**
  - §5 Kontent → Bosh sahifa: kartalar landing tartibida, yo'nalish kartasi nom/rasm/poster/2 video bilan, xizmatlar, konsultatsiya (rasm bilan), shior va sarlavhalar; pastda bannerlar/yangiliklar/brendlar eslatmasi; bitta "Saqlash" ikkala API'ga yozadi — T2.
  - Bannerlar/Yangiliklar/Blog/Vakansiyalar (eskiz, nom, faol toggle, tartib; kit bilan forma) — T3/T4.
  - "Sahifa matni" (careers + 2 foto) — T4, qaror 2.
  - Sahifalar (slug, sarlavha, faol, "Saytda ko'rish"; forma: sarlavha uz/ru, markdown + yordam, slug, faol; `biz-haqimizda` strukturali; huquqiy — izoh maydoni) — T5.
  - §4 `Uploader` `kind: video` — T2 (qaror 11).
  - Forma qoidalari 1–8 — hamma ekranda.
  - Markdown yordami (§2: 6 sintaksis) — T4.
  - 4a qoldiqlari: `api.ts` funksiyalari, favicon WebP'siz, video uploader, almashtirilgan fayl (video — qaror 3), `url_invalid` umumlashtirildi — T1/T2.
  - Sozlamalar (`store`/`contact`/`seo`, logo/favicon ekrani) — 5-bosqich.
- **Tiplar izchilligi:**
  - `TextFieldDef` (T2) = `TextsResponse['fields'][number]` (4a).
  - `ContentSection.title` ↔ T1 bo'lim nomlari (test T2).
  - `LEGAL_LEDE_KEYS: Partial<Record<string, TextKey>>` (T1) ↔ `page.tsx` va `PageEdit` (`ledeKey ? [ledeKey] : []`).
  - `useActiveToggle(setItems, save)` (T3) ↔ T3–T5 ro'yxatlari (`ApiBanner`/`ApiNews`/`ApiPost`/`ApiVacancy`/`ApiPage` — hammasida `id: string`, `isActive: boolean`).
  - `VACANCIES_TEXT_ID` (T4) ↔ `AdminApp` va `VacanciesList`.
  - `EMPLOYMENT_LABEL` `VacancyEdit`dan eksport.
  - `withoutId` (T2) ↔ T3/T4 formalari.
  - `ImageStore.delete` (T1) — yagona amalga oshirish `server/images.ts`.
- **Test sonlari:**
  - T1: +3 → 31 fayl / 353.
  - T2: +6 (yangi fayl) → 32 / 359.
  - T3–T5: o'zgarmaydi.
- **Placeholder:** yo'q — har kod qadami to'liq kod yoki aniq eski → yangi matn bilan.
