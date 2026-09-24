# Billz qulflari va MCP kengaytmasi — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Billz tovarida qo'lda o'zgartirilgan har bir maydon (admin yoki MCP orqali) sinxronizatsiyada qoladi, qoldig'i 0 tovar oddiy tovardek chiqadi, MCP esa chegirma, darhol faol yaratish, xususiyatlarni qo'shish/o'chirish va telefondan rasm yuklash havolasini oladi.

**Architecture:** Qulf mantig'i `shared/billz.ts` dagi sof funksiyalarda (`applyManualEdits`, `withHiddenLock`, `billzVisible`, `syncTarget`, `billzUpdateColumns`, `billzNameKey`) — admin formasi, MCP va sinxronizatsiya hammasi shulardan foydalanadi, ya'ni qoida bitta joyda. Qulfni **mijoz tomoni** hisoblaydi (foydalanuvchi aynan nimaga tegdi), server esa Billz tovarida ko'rinishni qoidadan chiqaradi. Sinxronizatsiya tovarni yangi `products.billz_name` ustuni bo'yicha topadi, saytdagi `name` qulflanadigan bo'ladi. Yuklash havolasi — `admin_auth.session_secret` dan **alohida kalit** bilan HMAC imzolangan holatsiz token + React Router sahifasi.

**Tech Stack:** Node 22.18+ (type stripping), React Router v7 SSR + Express, SQLite, React 19 (admin SPA), vitest, `@modelcontextprotocol/sdk` (mavjud — yangi dependency yo'q).

**Spec:** `docs/superpowers/specs/2026-09-24-billz-qulf-va-mcp-kengaytma-design.md`

## Global Constraints

- **Git sinxronizatsiyasini controller boshqaradi** — implementer `fetch`/`merge`/`rebase` qilmaydi. Boshqa Claude sessiyalari `main` ga parallel yozadi (2026-09-24 da `0041`/`0042` migratsiyalari aynan shunday band bo'lgan); controller push'dan oldin `origin/main` bilan tenglashtiradi.
- **Migratsiya raqami `0043`** — yaratishdan oldin `ls migrations/ | tail -3` bilan bo'shligini tekshiring. Band bo'lsa keyingi bo'sh raqamni oling va hisobotda yozing. **Qo'llanilgan migratsiya tahrirlanmaydi.**
- **Docker runtime image faqat `build/`, `server/`, `shared/`, `migrations/` ni tashiydi.** `server/` dagi fayl `functions/` yoki `src/` dan import qilmaydi — boot'da `ERR_MODULE_NOT_FOUND` bilan butun sayt yiqiladi.
- **Node type-stripping:** `server/` va u yuklaydigan `shared/` fayllarda qiymat importi `.ts` kengaytmasi bilan (`./billz.ts`); parametr-xususiyat (`constructor(private x)`) yo'q. `app/` va `src/` fayllari Vite bundle qilinadi — ular kengaytmasiz import yozadi (mavjud uslub).
- **Testlar faqat `src/**`, `functions/**`, `app/**`, `shared/**` dan yig'iladi** — sof mantiq shu papkalarda bo'lishi shart; `server/` testlanmaydi.
- Strict TypeScript, **`any` yo'q**. `react` tiplanmagan — `useState<T>` generigi yo'qoladi, qiymatni cast qiling (`const x = raw as T`, faylda mavjud naqsh).
- **Qabul mezoni har task oxirida:**
  - `bun run test` — hammasi yashil;
  - `npx react-router typegen && npx tsc --noEmit` — **yagona** ruxsat etilgan xato `server/index.ts(…): error TS2307: Cannot find module '../build/server/index.js'` (worktree'da production build yo'q — oldindan mavjud);
  - `npx tsc --noEmit -p functions/tsconfig.json` — toza;
  - `node --experimental-strip-types -e "await import('./server/mcp.ts'); await import('./server/oauth-provider.ts'); await import('./mcp/tools.ts'); await import('./server/billz-sync.ts'); console.log('ok')"` — `ok` (`bun run lint` o'zi build yo'qligi sababli non-zero qaytaradi, bu nuqson emas);
  - `grep -rn "from '\.\./functions/\|from '\.\./src/" server/` — bo'sh.
- **Fayllarni nomma-nom stage qiling — hech qachon `git add -A` yoki `git add .`** (egasining kuzatilmagan fayllari ish papkasida turadi).
- Commit formati `feat:`/`fix:`/`refactor:`/`docs:`; har commit xabari oxirida:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- **Push qilinmaydi.** Faqat lokal commit.
- Komponentlarda hex rang yo'q — faqat tokenlar (`text-muted-2`, `bg-cta`, …); `box-shadow`/`shadow-*` yo'q.
- Matnlar va izohlar o'zbekcha; admin/MCP matnlari **sodda tilda** — egasi mijoz oldida o'qib beradi.
- **Brauzerdagi tekshiruvni controller o'zi bajaradi** (Browser pane, egasining sessiyasi bilan) — implementer faqat yuqoridagi buyruqlarni yurgizadi.
- Lokal bazadagi sinov qatorlari ishdan keyin tozalanadi; `data/store.db` dagi egasining ma'lumotiga tegilmaydi (sinovdan oldin nusxa oling, id bo'yicha emas, **qiymat bo'yicha** tiklang — `PUT` variant id'larini qayta yaratadi).

---

## Fayl xaritasi

| Fayl | Nima o'zgaradi | Task |
|---|---|---|
| `shared/billz.ts` | `MANUAL_FIELDS` 8 ta; `LockSnapshot`, `applyManualEdits`, `withHiddenLock`, `billzVisible`, `syncTarget` (`keepSiteImage` o'rniga), `billzNameKey`, `billzUpdateColumns`; ko'rinishdan qoldiq chiqadi | 1, 2 |
| `shared/billz.test.ts` | yangi testlar, eski qoldiq/`keepSiteImage` testlari yangilanadi | 1, 2 |
| `migrations/0043_billz_name.sql` | `products.billz_name` + to'ldirish | 2 |
| `server/billz-sync.ts` | `billz_name` bo'yicha moslashtirish, qulflangan ustunlar yozilmaydi | 1 (bitta qator), 2 |
| `app/routes/api.admin.products.$id.tsx` | `PUT`/`PATCH` — Billz ko'rinishi qoidadan, `PATCH` yashirish qulfi | 3 |
| `src/admin/lib/product-form.ts` (+test) | `formLocks`, `revertField` | 4 |
| `src/admin/lib/product-filter.ts` (+test) | `summaryText` sabablari | 4 |
| `app/routes/api.admin.dashboard.tsx`, `src/admin/screens/Dashboard.tsx` | «Rasm kerak» qoldiqsiz | 4 |
| `src/admin/screens/ProductEdit.tsx` | Billz tovari to'liq tahrirlanadi, manba belgilari | 5 |
| `shared/mcp-tools.ts` (+test) | `manualFieldsFor`/`LOCKS`/`ProductPatch` o'chadi; `discountPct`, `priceText`, `upsertSpecs`; variant narxida eski narx | 6 |
| `shared/mcp-register.ts` | `product_update`, `product_set_images`, `product_set_visibility`, `product_create`, `image_upload_link` | 6, 7 |
| `functions/lib/upload-link.ts` (+test) | yuklash tokeni (alohida kalit) | 7 |
| `app/routes/api.admin.products.$id.upload-link.tsx` | havola yasash API | 7 |
| `app/routes/yuklash.$token.tsx` | telefon sahifasi + qabul | 7 |
| `app/routes.ts`, `server/index.ts`, `app/routes/robots[.]txt.tsx` | yo'llar, kesh, robots | 7 |
| `CLAUDE.md`, `mcp/README.md`, `docs/egasi-qollanmasi.md`, `docs/superpowers/specs/2026-09-21-admin-mcp-design.md` | hujjat | 8 |

---

### Task 1: Qulf modeli — sof funksiyalar

**Files:**
- Modify: `shared/billz.ts` (`MappedProduct.isActive` izohi, `mapBillzProduct`, `mergeDuplicates`, `keepSiteImage` → `syncTarget`, `MANUAL_FIELDS` va yangi funksiyalar)
- Modify: `server/billz-sync.ts` (faqat `keepSiteImage` chaqiruvi va importi — bitta qator)
- Test: `shared/billz.test.ts`

**Interfaces:**
- Produces (`shared/billz.ts`):
  - `export const MANUAL_FIELDS = ['price', 'specs', 'description', 'category', 'name', 'brand', 'images', 'hidden'] as const;` va `ManualField`
  - `export interface LockSnapshot { name: string; brandId: string | null; categoryId: string | null; type: string | null; description: string | null; cashPriceUzs: number; oldPriceUzs: number | null; specs: { label: string; value: string }[]; imageUrl: string; images: string[]; isActive: boolean }`
  - `export function withHiddenLock(locks: readonly ManualField[], visible: boolean): ManualField[]`
  - `export function applyManualEdits(locks: readonly ManualField[], before: LockSnapshot, after: LockSnapshot): ManualField[]`
  - `export function billzVisible(o: { hasImage: boolean; hiddenLocked: boolean }): boolean`
  - `export function syncTarget(m: MappedProduct, existingImage: string | null, locks: readonly ManualField[], failed: Set<string>): MappedProduct`
  - `export function billzNameKey(r: { name: string; billz_name: string | null }): string`
  - `keepSiteImage` **o'chiriladi**.

- [ ] **Step 1: Yiqiladigan testlarni yozing**

`shared/billz.test.ts` importini almashtiring:

```ts
import {
  toUzs, htmlToText, asciiSlug, photoKey, hiddenIds, productsUrl, utcStamp, mapBillzProduct, nameKey, mergeDuplicates,
  syncTarget, applyManualEdits, withHiddenLock, billzVisible, billzNameKey,
  type BillzProduct, type MapContext, type LockSnapshot,
  parseManualFields,
  serializeManualFields,
} from './billz';
```

`mapBillzProduct` → «rasm yo'q» testidagi oxirgi ikki qatorni almashtiring (qoldiq endi ko'rinishga ta'sir qilmaydi):

```ts
    const noStock = mapBillzProduct(raw({ shop_measurement_values: [{ shop_id: SHOP, active_measurement_value: 0 }] }), { ...ctx, existingImage: '/x.jpg' });
    // 2026-09-24: qoldig'i 0 tovar ham ko'rinadi — egasi uni tez olib keladi.
    expect(noStock?.isActive).toBe(true);
```

`describe('saytdagi rasmni saqlash', …)` blokini **butunlay** shu bilan almashtiring:

```ts
describe('syncTarget — sinxronizatsiya yozadigan yakuniy tovar', () => {
  const photo = { url: 'https://fra1.digitaloceanspaces.com/b/x.jpg', key: 'products/billz-x.jpg' };
  const base = (over: Partial<import('./billz').MappedProduct> = {}): import('./billz').MappedProduct => ({
    billzId: 'a', name: 'MacBook Air', slug: 'macbook-air-a', categoryId: 'apple', type: 'macbook',
    brandId: 'apple', newBrand: null, cashPriceUzs: 1, oldPriceUzs: null, stock: 3, description: null, specs: [],
    photos: [], imageUrl: '', gallery: [], isActive: false, ...over,
  });
  const withBillzPhoto = base({ photos: [photo], imageUrl: '/images/products/billz-x.jpg', gallery: ['/images/products/g.jpg'] });

  it("Billz'da rasm yo'q — saytdagi rasm qoladi va tovar ko'rinadi", () => {
    const out = syncTarget(base(), '/images/products/uploaded.jpg', [], new Set());
    expect(out.imageUrl).toBe('/images/products/uploaded.jpg');
    expect(out.isActive).toBe(true);
    expect(out.gallery).toEqual([]);
  });

  it("rasm yuklab bo'lmadi — saytdagi rasm qoladi", () => {
    const out = syncTarget(withBillzPhoto, '/images/products/uploaded.jpg', [], new Set([photo.key]));
    expect(out.imageUrl).toBe('/images/products/uploaded.jpg');
    expect(out.photos).toEqual([]);
  });

  it("Billz rasmi yuklandi va qulf yo'q — Billz'niki yoziladi", () => {
    const out = syncTarget(withBillzPhoto, '/images/products/uploaded.jpg', [], new Set());
    expect(out.imageUrl).toBe('/images/products/billz-x.jpg');
    expect(out.photos).toEqual([photo]);
    expect(out.gallery).toEqual(['/images/products/g.jpg']);
    expect(out.isActive).toBe(true);
  });

  it("rasmlar qulflangan — Billz'da rasm bo'lsa ham saytdagisi qoladi, galereya yozilmaydi", () => {
    const out = syncTarget(withBillzPhoto, '/images/products/uploaded.jpg', ['images'], new Set());
    expect(out.imageUrl).toBe('/images/products/uploaded.jpg');
    expect(out.photos).toEqual([]);
    expect(out.gallery).toEqual([]);
  });

  it("qo'lda yashirilgan — rasm bo'lsa ham ko'rinmaydi", () => {
    expect(syncTarget(withBillzPhoto, null, ['hidden'], new Set()).isActive).toBe(false);
  });

  it("qoldig'i 0, rasmi bor — ko'rinadi", () => {
    expect(syncTarget(base({ stock: 0 }), '/images/products/uploaded.jpg', [], new Set()).isActive).toBe(true);
  });

  it("ikkala tomonda ham rasm yo'q — ko'rinmaydi", () => {
    expect(syncTarget(base(), null, [], new Set()).isActive).toBe(false);
  });
});

describe('qo\'lda o\'zgartirish qulflari', () => {
  const snap = (over: Partial<LockSnapshot> = {}): LockSnapshot => ({
    name: 'iPhone 17 Pro Sim/E-sim / Silver', brandId: 'apple', categoryId: 'apple', type: 'iphone',
    description: 'Tavsif', cashPriceUzs: 100, oldPriceUzs: null,
    specs: [{ label: 'Xotira', value: '256GB' }], imageUrl: '/a.webp', images: ['/b.webp'], isActive: true, ...over,
  });

  it("hech narsa o'zgarmasa qulflar o'z holicha", () => {
    expect(applyManualEdits(['price'], snap(), snap())).toEqual(['price']);
  });

  it('har guruh o\'z qulfini qo\'yadi', () => {
    expect(applyManualEdits([], snap(), snap({ name: 'iPhone 17 Pro' }))).toEqual(['name']);
    expect(applyManualEdits([], snap(), snap({ brandId: 'samsung' }))).toEqual(['brand']);
    expect(applyManualEdits([], snap(), snap({ type: 'ipad' }))).toEqual(['category']);
    expect(applyManualEdits([], snap(), snap({ description: 'Yangi' }))).toEqual(['description']);
    expect(applyManualEdits([], snap(), snap({ oldPriceUzs: 120 }))).toEqual(['price']);
    expect(applyManualEdits([], snap(), snap({ specs: [{ label: 'Xotira', value: '512GB' }] }))).toEqual(['specs']);
    expect(applyManualEdits([], snap(), snap({ images: [] }))).toEqual(['images']);
  });

  it("tavsifdagi faqat bo'shliq o'zgarishi tahrir emas", () => {
    expect(applyManualEdits([], snap({ description: 'Tavsif' }), snap({ description: '  Tavsif \n' }))).toEqual([]);
    expect(applyManualEdits([], snap({ description: null }), snap({ description: '' }))).toEqual([]);
  });

  it('galereya tartibini almashtirish ham tahrir', () => {
    const b = snap({ images: ['/b.webp', '/c.webp'] });
    expect(applyManualEdits([], b, snap({ images: ['/c.webp', '/b.webp'] }))).toEqual(['images']);
  });

  it("yashirish qulf qo'yadi, ko'rsatish yechadi", () => {
    expect(applyManualEdits([], snap({ isActive: true }), snap({ isActive: false }))).toEqual(['hidden']);
    expect(applyManualEdits(['hidden', 'price'], snap({ isActive: false }), snap({ isActive: true }))).toEqual(['price']);
  });

  it("sinxronizatsiya tahrir paytida narxni o'zgartirgan bo'lsa ham — foydalanuvchi tegmagan narx qulflanmaydi", () => {
    // Egasi 10:00 da narx 100 ni ko'rdi, 10:15 da bazada 120 bo'ldi, 10:20 da faqat tavsifni o'zgartirdi.
    // Forma narxni 100 deb yuboradi, lekin foydalanuvchi uni ko'rgan holatdan o'zgartirmagan.
    expect(applyManualEdits([], snap({ cashPriceUzs: 100 }), snap({ cashPriceUzs: 100, description: 'Yangi' }))).toEqual(['description']);
  });

  it('tartib doim MANUAL_FIELDS bo\'yicha', () => {
    expect(applyManualEdits(['hidden'], snap(), snap({ name: 'X', cashPriceUzs: 5 }))).toEqual(['price', 'name', 'hidden']);
  });

  it('withHiddenLock takrorlansa ham bir xil natija', () => {
    expect(withHiddenLock(['price'], false)).toEqual(['price', 'hidden']);
    expect(withHiddenLock(['price', 'hidden'], false)).toEqual(['price', 'hidden']);
    expect(withHiddenLock(['price', 'hidden'], true)).toEqual(['price']);
    expect(withHiddenLock([], true)).toEqual([]);
  });
});

describe('billzVisible', () => {
  it('rasm bor va qo\'lda yashirilmagan bo\'lsagina ko\'rinadi', () => {
    expect(billzVisible({ hasImage: true, hiddenLocked: false })).toBe(true);
    expect(billzVisible({ hasImage: true, hiddenLocked: true })).toBe(false);
    expect(billzVisible({ hasImage: false, hiddenLocked: false })).toBe(false);
    expect(billzVisible({ hasImage: false, hiddenLocked: true })).toBe(false);
  });
});

describe('billzNameKey', () => {
  it("tovar Billz'dagi nomi bo'yicha topiladi, saytdagi nom bo'yicha emas", () => {
    const renamed = { name: 'iPhone 17 Pro', billz_name: 'iPhone 17 Pro Sim/E-sim / Silver' };
    expect(billzNameKey(renamed)).toBe(nameKey('iPhone 17 Pro Sim/E-sim / Silver'));
    // Billz'dagi boshqa «iPhone 17 Pro» tovari qayta nomlangan tovarga mos kelmaydi.
    expect(billzNameKey(renamed)).not.toBe(nameKey('iPhone 17 Pro'));
  });
  it("billz_name hali bo'sh bo'lsa (migratsiyadan oldingi qator) saytdagi nom", () => {
    expect(billzNameKey({ name: 'HomePod', billz_name: null })).toBe('homepod');
  });
});
```

`describe('manual fields', …)` dagi birinchi testda `parseManualFields('name,description')` qatorini almashtiring (`name` endi ma'lum kalit):

```ts
    expect(parseManualFields('nom,description')).toEqual(['description']);
    expect(parseManualFields('hidden,name,images,brand')).toEqual(['name', 'brand', 'images', 'hidden']);
```

- [ ] **Step 2: Testlar yiqilishiga ishonch hosil qiling**

Run: `bunx vitest run shared/billz.test.ts`
Expected: FAIL — `syncTarget is not a function` (yoki `applyManualEdits`).

- [ ] **Step 3: `shared/billz.ts` ni o'zgartiring**

`MappedProduct` dagi izohni almashtiring:

```ts
  /** Ko'rinish: rasm bor bo'lsa (qoldiqqa qaramaydi, 2026-09-24); qulflar `syncTarget`da qo'llanadi. */
  isActive: boolean;
```

`mapBillzProduct` qaytaradigan obyektda:

```ts
    isActive: billzVisible({ hasImage: imageUrl !== '', hiddenLocked: false }),
```

`mergeDuplicates` ichida:

```ts
    out.push({ ...rep, stock, isActive: billzVisible({ hasImage: rep.imageUrl !== '', hiddenLocked: false }) });
```

`keepSiteImage` funksiyasini (izohi bilan) **o'chiring** va o'rniga yozing:

```ts
/**
 * Ko'rinish qoidasi (spec §4): rasm bor va egasi qo'lda yashirmagan. Qoldiq e'tiborga olinmaydi —
 * egasi tovarni omborda bo'lmasa ham tez olib keladi (2026-09-24). Sinxronizatsiya ham, admin `PUT`/`PATCH`
 * ham shu funksiyani ishlatadi — ikkalasi bir xil natija bermasa, rasm qo'yilgan tovar 30 daqiqa kutardi.
 */
export function billzVisible(o: { hasImage: boolean; hiddenLocked: boolean }): boolean {
  return o.hasImage && !o.hiddenLocked;
}

/**
 * Sinxronizatsiya yozadigan yakuniy tovar. Saytdagi rasm qoladi, agar rasmlar qo'lda qulflangan bo'lsa yoki
 * Billz'da rasm yo'q / CDN'dan yuklab bo'lmasa — aks holda admin/MCP yuklagan rasm har 30 daqiqada o'chardi.
 * `photos: []` bo'lgani uchun galereya ham yozilmaydi. Ko'rinish — `billzVisible`.
 */
export function syncTarget(m: MappedProduct, existingImage: string | null, locks: readonly ManualField[], failed: Set<string>): MappedProduct {
  const siteImage = locks.includes('images') || m.photos.length === 0 || failed.has(m.photos[0].key);
  const base = siteImage ? { ...m, photos: [], imageUrl: existingImage ?? '', gallery: [] } : m;
  return { ...base, isActive: billzVisible({ hasImage: base.imageUrl !== '', hiddenLocked: locks.includes('hidden') }) };
}

/**
 * Sinxronizatsiya mavjud qatorni **Billz'dagi nom** bo'yicha topadi (`products.billz_name`), saytdagi `name`
 * bo'yicha emas: nom endi qulflanadi. Busiz «… / Silver» ni «iPhone 17 Pro» deb qayta nomlasangiz, Billz'dagi
 * boshqa «iPhone 17 Pro» tovarining narx va qoldig'i sizning tovaringizga yozilardi. `billz_name` hali bo'sh
 * bo'lsa (migratsiyadan oldingi qator) — saytdagi nom, u o'sha paytda Billz nomi bilan bir xil edi.
 */
export function billzNameKey(r: { name: string; billz_name: string | null }): string {
  return nameKey(r.billz_name ?? r.name);
}
```

`MANUAL_FIELDS` izohi va qatorini almashtiring:

```ts
/**
 * Billz tovarining **qo'lda o'zgartirilgan** maydonlari (`products.manual_fields`). Ro'yxatdagi guruhga
 * sinxronizatsiya tegmaydi — egasi admin'da yoki MCP orqali nima o'zgartirsa, shunday qoladi
 * (2026-09-24, egasining standarti: «30 daqiqada eski holatga qaytsa — cringe»). `price` naqd va eski
 * narxni, `category` yo'nalish va turni, `images` asosiy rasm va galereyani birga qulflaydi; `hidden` —
 * egasi yashirgan (ko'rsatish qulfni yechadi). Qoldiq hech qachon qulflanmaydi — u ombordan keladi.
 * Yangi kalitlar oxiriga qo'shiladi: bazadagi eski satrlar (`price,specs`) o'zgarishsiz o'qiladi.
 */
export const MANUAL_FIELDS = ['price', 'specs', 'description', 'category', 'name', 'brand', 'images', 'hidden'] as const;
```

Fayl oxiriga (`serializeManualFields` dan keyin) qo'shing:

```ts
/** Qulf solishtiriladigan holat — admin formasi ham, MCP tanasi ham shu shaklga keladi. */
export interface LockSnapshot {
  name: string;
  brandId: string | null;
  categoryId: string | null;
  type: string | null;
  description: string | null;
  cashPriceUzs: number;
  oldPriceUzs: number | null;
  specs: { label: string; value: string }[];
  imageUrl: string;
  images: string[];
  isActive: boolean;
}

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const trimmed = (s: string | null) => (s ?? '').trim();

const GROUPS: { key: ManualField; touched: (a: LockSnapshot, b: LockSnapshot) => boolean }[] = [
  { key: 'price', touched: (a, b) => a.cashPriceUzs !== b.cashPriceUzs || (a.oldPriceUzs ?? null) !== (b.oldPriceUzs ?? null) },
  { key: 'specs', touched: (a, b) => !sameJson(a.specs.map((s) => [s.label, s.value]), b.specs.map((s) => [s.label, s.value])) },
  { key: 'description', touched: (a, b) => trimmed(a.description) !== trimmed(b.description) },
  { key: 'category', touched: (a, b) => a.categoryId !== b.categoryId || a.type !== b.type },
  { key: 'name', touched: (a, b) => a.name.trim() !== b.name.trim() },
  { key: 'brand', touched: (a, b) => a.brandId !== b.brandId },
  { key: 'images', touched: (a, b) => a.imageUrl !== b.imageUrl || !sameJson(a.images, b.images) },
];

/** Ko'rinish qulfi: yashirish `hidden` qo'yadi (Billz qaytarib ochmaydi), ko'rsatish uni yechadi. */
export function withHiddenLock(locks: readonly ManualField[], visible: boolean): ManualField[] {
  const set = new Set<ManualField>(locks);
  if (visible) set.delete('hidden'); else set.add('hidden');
  return MANUAL_FIELDS.filter((f) => set.has(f));
}

/**
 * Saqlashda qo'yiladigan qulflar: `before` — foydalanuvchi ko'rgan holat, `after` — saqlanayotgani.
 * **Mijoz tomonida** hisoblanadi, server farqi bo'yicha emas: sinxronizatsiya tahrir paytida narxni
 * yangilasa, forma eski narxni ham yuboradi — server uni «o'zgartirilgan» deb ko'rib eski narxni abadiy
 * qulflardi (spec §3). Tegilmagan maydon qulflanmaydi va keyingi sinxronizatsiya uni o'zi tuzatadi.
 */
export function applyManualEdits(locks: readonly ManualField[], before: LockSnapshot, after: LockSnapshot): ManualField[] {
  const set = new Set<ManualField>(locks);
  for (const g of GROUPS) if (g.touched(before, after)) set.add(g.key);
  const out = MANUAL_FIELDS.filter((f) => set.has(f));
  return before.isActive === after.isActive ? out : withHiddenLock(out, after.isActive);
}
```

- [ ] **Step 4: `server/billz-sync.ts` dagi yagona chaqiruvni almashtiring**

Importdagi `keepSiteImage` ni `syncTarget` ga almashtiring:

```ts
  BILLZ_BASE, productsUrl, hiddenIds, syncTarget, mapBillzProduct, mergeDuplicates, nameKey,
```

Yozish siklida:

```ts
        const ex = findRow(m.billzId, m.name);
        // Qulflar bo'yicha yakuniy tovar: saytdagi rasm (qulf yoki Billz'da yo'q), ko'rinish — rasm va `hidden`.
        const eff = syncTarget(m, ex?.image_url ?? null, parseManualFields(ex?.manual_fields), failed);
```

(`upsertStatements` va qolgani Task 2 da o'zgaradi.)

- [ ] **Step 5: Testlar yashil**

Run: `bunx vitest run shared/billz.test.ts`
Expected: PASS.

- [ ] **Step 6: Global qabul mezonini yurgizing**

Global Constraints'dagi buyruqlar. `grep -rn keepSiteImage shared server app src functions` — bo'sh bo'lishi kerak.

- [ ] **Step 7: Commit**

```bash
git add shared/billz.ts shared/billz.test.ts server/billz-sync.ts
git commit -F - <<'EOF'
feat(billz): qulf modeli — 8 ta qulf, tegilgan maydonni aniqlash, ko'rinish qoldiqsiz

`applyManualEdits` foydalanuvchi aynan nimaga tegganini aniqlaydi (admin ham,
MCP ham shu funksiyadan); qulflar 4 tadan 8 taga: + nom, brend, rasmlar, yashirish.
Ko'rinish qoidasi `billzVisible` — rasm bor va qo'lda yashirilmagan, qoldiq
e'tiborga olinmaydi. `keepSiteImage` → `syncTarget` (rasm qulfi va yashirish).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2: Sinxronizatsiya — `billz_name` va qulflangan ustunlar

**Files:**
- Create: `migrations/0043_billz_name.sql`
- Modify: `shared/billz.ts` (`billzUpdateColumns`)
- Modify: `server/billz-sync.ts`
- Test: `shared/billz.test.ts`

**Interfaces:**
- Consumes: Task 1 — `syncTarget`, `billzNameKey`, `MANUAL_FIELDS`, `parseManualFields`.
- Produces: `export function billzUpdateColumns(m: MappedProduct, locks: readonly ManualField[]): { cols: string[]; vals: unknown[] }` (`shared/billz.ts`); `products.billz_name TEXT`.

- [ ] **Step 1: Yiqiladigan test**

`shared/billz.test.ts` importiga `billzUpdateColumns` qo'shing va fayl oxiriga:

```ts
describe('billzUpdateColumns — sinxronizatsiya nimani yozadi', () => {
  const m: import('./billz').MappedProduct = {
    billzId: 'a', name: 'iPhone 17 Pro Sim/E-sim / Silver', slug: 's', categoryId: 'apple', type: 'iphone',
    brandId: 'apple', newBrand: null, cashPriceUzs: 100, oldPriceUzs: 120, stock: 2, description: 'd',
    specs: [], photos: [], imageUrl: '/a.webp', gallery: [], isActive: true,
  };
  const cols = (locks: import('./billz').ManualField[]) => billzUpdateColumns(m, locks).cols;

  it("qulf yo'q — hamma Billz ustuni yoziladi", () => {
    expect(cols([])).toEqual([
      'billz_name=?', 'billz_stock=?', 'is_active=?', 'name=?', 'brand_id=?', 'image_url=?',
      'category_id=?', 'type=?', 'cash_price_uzs=?', 'old_price_uzs=?', 'description=?',
    ]);
  });

  it("qulflangan guruh butunlay chiqariladi, Billz nomi, qoldiq va ko'rinish doim yoziladi", () => {
    expect(cols(['name', 'brand', 'images', 'category', 'price', 'description', 'hidden', 'specs'])).toEqual([
      'billz_name=?', 'billz_stock=?', 'is_active=?',
    ]);
  });

  it("qiymatlar ustunlar bilan bir tartibda", () => {
    const r = billzUpdateColumns(m, ['images', 'category', 'price', 'description']);
    expect(r.cols).toEqual(['billz_name=?', 'billz_stock=?', 'is_active=?', 'name=?', 'brand_id=?']);
    expect(r.vals).toEqual(['iPhone 17 Pro Sim/E-sim / Silver', 2, 1, 'iPhone 17 Pro Sim/E-sim / Silver', 'apple']);
  });
});
```

- [ ] **Step 2: Yiqilishini ko'ring**

Run: `bunx vitest run shared/billz.test.ts`
Expected: FAIL — `billzUpdateColumns is not a function`.

- [ ] **Step 3: `billzUpdateColumns` ni yozing**

`shared/billz.ts` da `billzNameKey` dan keyin:

```ts
/**
 * Sinxronizatsiya mavjud Billz qatoriga yozadigan ustunlar (`UPDATE … SET`). Qulflangan guruh butunlay
 * chiqariladi. `billz_name` (moslashtirish kaliti), qoldiq va ko'rinish (`syncTarget` hisoblagan) doim
 * yoziladi. Egasining ustunlari (slug, holat, tartib, reyting) bu yerda umuman yo'q. Xususiyatlar va
 * galereya alohida jadvalda — runner ularni `specs` qulfi va `photos` bo'yicha o'zi hal qiladi.
 */
export function billzUpdateColumns(m: MappedProduct, locks: readonly ManualField[]): { cols: string[]; vals: unknown[] } {
  const cols = ['billz_name=?', 'billz_stock=?', 'is_active=?'];
  const vals: unknown[] = [m.name, m.stock, m.isActive ? 1 : 0];
  const add = (lock: ManualField, pairs: [string, unknown][]) => {
    if (locks.includes(lock)) return;
    for (const [c, v] of pairs) { cols.push(`${c}=?`); vals.push(v); }
  };
  add('name', [['name', m.name]]);
  add('brand', [['brand_id', m.brandId]]);
  add('images', [['image_url', m.imageUrl]]);
  add('category', [['category_id', m.categoryId], ['type', m.type]]);
  add('price', [['cash_price_uzs', m.cashPriceUzs], ['old_price_uzs', m.oldPriceUzs]]);
  add('description', [['description', m.description]]);
  return { cols, vals };
}
```

- [ ] **Step 4: Test yashil**

Run: `bunx vitest run shared/billz.test.ts` → PASS.

- [ ] **Step 5: Migratsiya**

Avval `ls migrations/ | tail -3` bilan `0043` bo'shligini tekshiring. `migrations/0043_billz_name.sql`:

```sql
-- Billz'dagi nom alohida saqlanadi (2026-09-24). Sinxronizatsiya tovarni shu nom bo'yicha topadi,
-- saytdagi `name` esa endi qo'lda qulflanadi (`manual_fields` ichida `name`). Busiz qayta nomlangan
-- tovar Billz'dagi boshqa bir xil nomli tovar bilan adashib, uning narx va qoldig'ini olib qo'yardi.
-- To'ldirish aniq: shu kungacha saytdagi nom har run'da Billz nomi bilan qayta yozilardi.
ALTER TABLE products ADD COLUMN billz_name TEXT;
UPDATE products SET billz_name = name WHERE billz_id IS NOT NULL;
```

- [ ] **Step 6: `server/billz-sync.ts`**

Importni kengaytiring:

```ts
import {
  BILLZ_BASE, productsUrl, hiddenIds, syncTarget, mapBillzProduct, mergeDuplicates, nameKey, billzNameKey, billzUpdateColumns,
  type BillzProduct, type BillzProductsPage, type BillzShop, type BillzSyncResult, type BillzSyncStatus, type MapContext, type MappedProduct,
  parseManualFields,
} from '../shared/billz.ts';
```

`upsertStatements` funksiyasini **butunlay** shu bilan almashtiring (imzo o'zgaradi — mavjud qatorning o'zini oladi):

```ts
  function upsertStatements(m: MappedProduct, ex: ExistingRow | undefined): { stmts: SqlStatement[]; id: string } {
    const id = ex?.id ?? crypto.randomUUID();
    const stmts: SqlStatement[] = [];
    // Egasi qo'lda o'zgartirgan guruhlar (`products.manual_fields`) `UPDATE` dan chiqariladi — aks holda
    // har 30 daqiqada Billz qiymati ustiga yozilardi (spec 2026-09-24 §5).
    const locks = parseManualFields(ex?.manual_fields);
    if (ex) {
      const { cols, vals } = billzUpdateColumns(m, locks);
      stmts.push(env.DB.prepare(`UPDATE products SET ${cols.join(', ')} WHERE id=?`).bind(...vals, id));
    } else {
      stmts.push(env.DB.prepare(
        `INSERT INTO products (id, name, billz_name, category, condition, condition_note, cash_price_uzs, image_url, sort_order, is_active, category_id, type, old_price_uzs, description, brand_id, slug, rating_avg, review_count, created_at, billz_id, billz_stock)
         VALUES (?, ?, ?, '', 'yangi', NULL, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, NULL, 0, unixepoch(), ?, ?)`,
      ).bind(id, m.name, m.name, m.cashPriceUzs, m.imageUrl, m.isActive ? 1 : 0, m.categoryId, m.type, m.oldPriceUzs, m.description, m.brandId, m.slug, m.billzId, m.stock));
    }
    if (!locks.includes('specs')) stmts.push(...specsStatements(env, id, m.specs));
    // Galereya faqat Billz rasmi ishlatilganda yoziladi (`syncTarget` rasm qulfida `photos` ni bo'shatadi).
    if (m.photos.length > 0) stmts.push(...imagesStatements(env, id, m.gallery));
    return { stmts, id };
  }

  interface ExistingRow { id: string; billz_id: string; image_url: string; name: string; billz_name: string | null; manual_fields: string }
```

(Eski `interface ExistingRow …` qatorini o'chiring — u yuqoridagi bilan almashadi.)

`execute` ichida SELECT va indeks:

```ts
    const existingRows = await env.DB.prepare(
      'SELECT id, billz_id, image_url, name, billz_name, manual_fields FROM products WHERE billz_id IS NOT NULL ORDER BY created_at ASC, id ASC',
    ).all<ExistingRow>();
    const byBillzId = new Map(existingRows.results.map((r) => [r.billz_id, r]));
    // Billz'dagi nom bo'yicha — saytdagi nom qulflangan va boshqacha bo'lishi mumkin (`billzNameKey`).
    const byName = new Map<string, ExistingRow>();
    for (const r of existingRows.results) { const k = billzNameKey(r); if (!byName.has(k)) byName.set(k, r); }
```

Yozish siklida:

```ts
        const { stmts: s, id } = upsertStatements(eff, ex);
        stmts.push(...s);
        if (ex) { result.updated++; seenRows.add(ex.billz_id); }
        else {
          result.inserted++;
          seenRows.add(m.billzId);
          const row: ExistingRow = { id, billz_id: m.billzId, image_url: eff.imageUrl, name: m.name, billz_name: m.name, manual_fields: '' };
          byBillzId.set(m.billzId, row);
          byName.set(nameKey(m.name), row);
        }
```

Run oxiridagi yashirish:

```ts
    const toHide = gone.filter((bid) => {
      const r = byBillzId.get(bid);
      return complete || (r !== undefined && seenNames.has(billzNameKey(r)));
    });
```

- [ ] **Step 7: Migratsiyani lokal bazada qo'llang va tekshiring**

```bash
bun run migrate
node -e "const D=require('better-sqlite3')('data/store.db',{readonly:true});console.log(D.prepare(\"SELECT COUNT(*) c FROM pragma_table_info('products') WHERE name='billz_name'\").get(), D.prepare('SELECT COUNT(*) total, SUM(billz_name IS NOT NULL) filled FROM products WHERE billz_id IS NOT NULL').get())"
```

Expected: `{ c: 1 }` va Billz qatorlarida `total === filled`.

- [ ] **Step 8: Global qabul mezoni** (Global Constraints). Modul yuklash buyrug'i `server/billz-sync.ts` ni ham yuklaydi — shart.

- [ ] **Step 9: Commit**

```bash
git add migrations/0043_billz_name.sql shared/billz.ts shared/billz.test.ts server/billz-sync.ts
git commit -F - <<'EOF'
feat(billz): Billz nomi alohida, qulflangan ustunlar sinxronizatsiyada yozilmaydi

Migratsiya 0043 `products.billz_name` ni qo'shadi — sinxronizatsiya tovarni shu
nom bo'yicha topadi, saytdagi nom esa qulflanadi. Busiz qayta nomlangan tovar
Billz'dagi boshqa bir xil nomli tovarning narx va qoldig'ini olib qo'yardi.
`billzUpdateColumns` qulflangan guruhlarni `UPDATE` dan chiqaradi.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 3: Saqlash — Billz ko'rinishi va yashirish qulfi (server)

**Files:**
- Modify: `app/routes/api.admin.products.$id.tsx`

**Interfaces:**
- Consumes: Task 1 — `billzVisible`, `withHiddenLock`, `parseManualFields`, `serializeManualFields` (`shared/billz`).
- Produces: `PUT` Billz tovarida `is_active` ni `billzVisible` dan hisoblaydi; `PATCH {isActive}` Billz tovarida `hidden` qulfini qo'yadi/yechadi va ko'rinishni qoidadan hisoblaydi. Javob shakli o'zgarmaydi (`ApiProduct`).

- [ ] **Step 1: Import**

```ts
import { billzVisible, parseManualFields, serializeManualFields, withHiddenLock } from '../../shared/billz';
```

(eski `import { serializeManualFields } from '../../shared/billz';` ni almashtiradi)

- [ ] **Step 2: `PUT`**

`if (input.slug) input.slug = await ensureUniqueSlug(…);` qatoridan keyin qo'shing:

```ts
    const cur = await env.DB.prepare('SELECT billz_id FROM products WHERE id = ?').bind(id).first<{ billz_id: string | null }>();
    // Billz tovarida ko'rinishni forma emas, qoida belgilaydi (spec 2026-09-24 §4): rasm bor va qo'lda
    // yashirilmagan. Shuning uchun Billz tovariga rasm qo'shilsa u darhol saytda chiqadi, 30 daqiqa kutmaydi.
    const isActive = cur?.billz_id
      ? billzVisible({ hasImage: input.imageUrl !== '', hiddenLocked: input.manualFields.includes('hidden') })
      : input.isActive;
```

`bind(…)` ichidagi `input.isActive ? 1 : 0,` ni `isActive ? 1 : 0,` ga almashtiring.

- [ ] **Step 3: `PATCH`**

`PATCH` blokidagi `await env.DB.prepare('UPDATE products SET is_active = ? WHERE id = ?')…run();` ni almashtiring:

```ts
    const row0 = await env.DB.prepare('SELECT billz_id, image_url, manual_fields FROM products WHERE id = ?')
      .bind(id)
      .first<{ billz_id: string | null; image_url: string | null; manual_fields: string | null }>();
    if (!row0) return json({ error: 'not_found' }, { status: 404 });
    if (row0.billz_id) {
      // Yashirish qulflaydi (Billz qaytarib ochmaydi), ko'rsatish qulfni yechadi — ko'rinish qoidadan:
      // rasmsiz Billz tovarini «ko'rsat» qilsangiz ham u rasm qo'yilmaguncha yashirin qoladi.
      const locks = withHiddenLock(parseManualFields(row0.manual_fields), body.isActive);
      const visible = billzVisible({ hasImage: Boolean(row0.image_url), hiddenLocked: locks.includes('hidden') });
      await env.DB.prepare('UPDATE products SET is_active = ?, manual_fields = ? WHERE id = ?')
        .bind(visible ? 1 : 0, serializeManualFields(locks), id)
        .run();
    } else {
      await env.DB.prepare('UPDATE products SET is_active = ? WHERE id = ?')
        .bind(body.isActive ? 1 : 0, id)
        .run();
    }
```

- [ ] **Step 4: Global qabul mezoni** (Global Constraints).

- [ ] **Step 5: Dev serverda qo'lda tekshirish**

Lokal bazada variantsiz tovarni vaqtincha Billz tovariga aylantirib (`billz_id='SINOV-b'`), token yarating (`label='SINOV-qulf'`, `kind='manual'`, `shared/mcp-auth.ts` `newToken`/`hashToken` — Task 3 hisobotida buyruqlarni yozing), `PORT=<bo'sh> bun run dev` va curl bilan:

1. `PATCH {isActive:false}` → bazada `is_active=0`, `manual_fields` ichida `hidden`.
2. `PATCH {isActive:true}` (rasm bor) → `is_active=1`, `hidden` yo'q.
3. `image_url=''` qilib `PATCH {isActive:true}` → `is_active=0` (rasm yo'q), `hidden` yo'q.
4. `PUT` rasm bilan va `manualFields:[]` → `is_active=1`.
5. `PUT` `manualFields:['hidden']` → `is_active=0`.
6. Oddiy (Billz bo'lmagan) tovarda `PATCH` avvalgidek so'ralganini yozadi.

Chiqishlarni hisobotga yozing. Sinov qatorini va tokenni tozalang, serverni to'xtating.

- [ ] **Step 6: Commit**

```bash
git add "app/routes/api.admin.products.\$id.tsx"
git commit -F - <<'EOF'
feat(admin): Billz tovarida ko'rinish qoidadan, yashirish qulflanadi

`PUT` va `PATCH` Billz tovarida `is_active` ni so'rovdan emas, `billzVisible`
dan hisoblaydi — rasm qo'shilgan tovar darhol saytda chiqadi. `PATCH` yashirish
`hidden` qulfini qo'yadi, ko'rsatish yechadi (admin ro'yxati toggle'i va MCP).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: Admin — sof mantiq va matnlar

**Files:**
- Modify: `src/admin/lib/product-form.ts` (+`product-form.test.ts`)
- Modify: `src/admin/lib/product-filter.ts` (+`product-filter.test.ts`)
- Modify: `app/routes/api.admin.dashboard.tsx`
- Modify: `src/admin/screens/Dashboard.tsx`

**Interfaces:**
- Consumes: Task 1 — `applyManualEdits`, `LockSnapshot`, `ManualField`.
- Produces (`src/admin/lib/product-form.ts`):
  - `export function formLocks(f: ProductFormState, loaded: ProductFormState | null): ManualField[]`
  - `export function revertField(f: ProductFormState, loaded: ProductFormState, field: ManualField): ProductFormState`

- [ ] **Step 1: Yiqiladigan testlar**

`src/admin/lib/product-form.test.ts` importiga `formLocks, revertField` qo'shing. Fayl oxiriga:

```ts
describe('formLocks — saqlashda qo\'yiladigan qulflar', () => {
  const billz = () => detailToForm(detail({ billzId: 'b-1', billzStock: 2, options: [], variants: [], manualFields: [] }));

  it("oddiy tovarda qulf hisoblanmaydi", () => {
    const f = detailToForm(detail());
    expect(formLocks({ ...f, name: 'Boshqa' }, f)).toEqual([]);
  });

  it("yuklanmagan bo'lsa (loaded null) — formadagi qulflar o'z holicha", () => {
    const f = { ...billz(), manualFields: ['price' as const] };
    expect(formLocks(f, null)).toEqual(['price']);
  });

  it("Billz tovarida tahrirlangan maydon qulflanadi", () => {
    const f = billz();
    expect(formLocks({ ...f, name: 'iPhone 17' }, f)).toEqual([]);
    expect(formLocks({ ...f, name: 'iPhone 17 (yangi)' }, f)).toEqual(['name']);
    expect(formLocks({ ...f, brandId: 'samsung', images: [] }, f)).toEqual(['brand', 'images']);
  });

  it("ko'rinishni o'chirish — hidden", () => {
    const f = billz();
    expect(formLocks({ ...f, isActive: false }, f)).toEqual(['hidden']);
  });
});

describe('revertField — «Billz\'ga qaytarish»', () => {
  const loaded = detailToForm(detail({ billzId: 'b-1', options: [], variants: [], manualFields: ['name'] }));

  it("qulfni yechadi va shu seansdagi o'zgarishni bekor qiladi", () => {
    const edited = { ...loaded, name: 'Tahrirlangan', description: 'Yangi tavsif' };
    const out = revertField(edited, loaded, 'name');
    expect(out.manualFields).toEqual([]);
    expect(out.name).toBe(loaded.name);
    expect(out.description).toBe('Yangi tavsif'); // boshqa maydonga tegilmaydi
  });

  it('rasmlar guruhi asosiy rasm va galereyani birga qaytaradi', () => {
    const edited = { ...loaded, imageUrl: '/x.webp', images: [] };
    const out = revertField(edited, loaded, 'images');
    expect(out.imageUrl).toBe(loaded.imageUrl);
    expect(out.images).toEqual(loaded.images);
  });

  it("qaytarilgan maydon endi qulf sifatida hisoblanmaydi", () => {
    const edited = { ...loaded, name: 'Tahrirlangan' };
    expect(formLocks(revertField(edited, loaded, 'name'), loaded)).toEqual([]);
  });
});
```

`src/admin/lib/product-filter.test.ts` dagi `p()` helperida default'larga `manualFields: []` qo'shing:

```ts
    categoryId: null, brandId: null, minPriceUzs: 100, billzId: null, billzStock: null, manualFields: [], ...over,
```

`summaryText` → «sabablar takrorlanmaydi…» testini almashtiring:

```ts
  it("sabablar takrorlanmaydi va yig'indisi ko'rinmayotganlarga teng", () => {
    const items = [
      p({ id: '1', isActive: true, imageUrl: '/a.webp' }),
      p({ id: '2', isActive: false, billzId: 'b', imageUrl: '' }),
      p({ id: '3', isActive: false, billzId: 'c', imageUrl: '/a.webp', manualFields: ['hidden'] }),
      p({ id: '4', isActive: false, imageUrl: '/a.webp' }),
      p({ id: '5', isActive: false, billzId: 'd', imageUrl: '/a.webp' }),
    ];
    expect(summaryText(items)).toBe(
      "Jami 5 ta tovar: 1 tasi saytda e'lon qilingan, 4 tasi ko'rinmaydi. Sababi: 1 tasida rasm yo'q, 2 tasini qo'lda yashirgansiz, 1 tasi Billz'da endi yo'q.",
    );
  });

  it("qoldig'i tugagani sabab emas — bunday tovar saytda ko'rinadi", () => {
    const items = [p({ id: '1', isActive: true, billzId: 'b', imageUrl: '/a.webp', billzStock: 0 })];
    expect(summaryText(items)).toBe("Jami 1 ta tovar: 1 tasi saytda e'lon qilingan.");
  });
```

- [ ] **Step 2: Yiqilishini ko'ring**

Run: `bunx vitest run src/admin/lib/product-form.test.ts src/admin/lib/product-filter.test.ts`
Expected: FAIL — `formLocks is not a function` va summaryText matni mos kelmaydi.

- [ ] **Step 3: `product-form.ts`**

Importlarni almashtiring:

```ts
import { applyManualEdits, type LockSnapshot, type ManualField } from '../../../shared/billz';
```

(`import type { ManualField } …` qatorini o'rniga.) `ProductFormState` dagi Billz izohlarini yangilang:

```ts
  /** Billz tovari — ham to'liq tahrirlanadi; o'zgartirilgan guruh `manualFields`ga qulflanadi. */
  billzId: string | null;
  billzStock: number | null;
  /** Billz tovarida qo'lda o'zgartirilgan (sinxronizatsiya tegmaydigan) guruhlar. */
  manualFields: ManualField[];
```

Fayl oxiriga:

```ts
/** Forma → qulf solishtiruvi uchun holat (`formToPayload` bilan bir xil normallashtirish). */
function lockSnapshot(f: ProductFormState): LockSnapshot {
  const p = formToPayload(f);
  return {
    name: f.name, brandId: f.brandId, categoryId: f.categoryId, type: f.type,
    description: p.description ?? null, cashPriceUzs: p.cashPriceUzs ?? 0, oldPriceUzs: p.oldPriceUzs ?? null,
    specs: p.specs ?? [], imageUrl: f.imageUrl, images: f.images, isActive: f.isActive,
  };
}

/**
 * Saqlashda qo'yiladigan qulflar — belgi («Billz» / «Qo'lda») ham shu bilan jonli ko'rsatiladi, ya'ni egasi
 * nima qulflanishini saqlashdan oldin ko'radi. Faqat Billz tovarida; oddiy tovarga sinxronizatsiya tegmaydi.
 */
export function formLocks(f: ProductFormState, loaded: ProductFormState | null): ManualField[] {
  if (f.billzId === null || loaded === null) return f.manualFields;
  return applyManualEdits(f.manualFields, lockSnapshot(loaded), lockSnapshot(f));
}

/** Qulf guruhi → forma maydonlari (`shared/billz.ts` `GROUPS` bilan bir xil guruhlash). */
const GROUP_FIELDS: Record<ManualField, (keyof ProductFormState)[]> = {
  price: ['cashPriceUzs', 'oldPriceUzs'],
  specs: ['specs'],
  description: ['description'],
  category: ['categoryId', 'type'],
  name: ['name'],
  brand: ['brandId'],
  images: ['imageUrl', 'images'],
  hidden: ['isActive'],
};

/**
 * «Billz'ga qaytarish»: qulf yechiladi va shu seansdagi o'zgarish bekor qilinadi (maydon yuklangan qiymatga
 * qaytadi) — aks holda saqlashda o'sha o'zgarish qulfni qayta qo'yardi. Billz qiymatining o'zi keyingi
 * sinxronizatsiyada (30 daqiqagacha) keladi.
 */
export function revertField(f: ProductFormState, loaded: ProductFormState, field: ManualField): ProductFormState {
  const next = { ...f, manualFields: f.manualFields.filter((x) => x !== field) } as unknown as Record<string, unknown>;
  const src = loaded as unknown as Record<string, unknown>;
  for (const k of GROUP_FIELDS[field]) next[k] = src[k];
  return next as unknown as ProductFormState;
}
```

- [ ] **Step 4: `product-filter.ts` `summaryText`**

Funksiya izohi va sabablar qismini almashtiring:

```ts
/**
 * Ro'yxat ustidagi xulosa — raqam emas, holat: nechtasi saytda va ko'rinmayotganlari nega ko'rinmayapti.
 * Sabablar **bir-birini takrorlamaydi**: har tovar birinchi mos sababga qo'shiladi (rasm → qo'lda →
 * Billz'da yo'q), shuning uchun yig'indisi ko'rinmayotganlar soniga teng. Qoldiq sabab emas (2026-09-24):
 * rasmi bor Billz tovari faqat qo'lda yashirilgan yoki Billz'dan o'chirilgan bo'lsa ko'rinmaydi.
 */
export function summaryText(items: ApiProduct[]): string {
  const total = items.length;
  if (total === 0) return "Hali tovar yo'q.";
  const hidden = items.filter((p) => !p.isActive);
  const head = `Jami ${total} ta tovar: ${total - hidden.length} tasi saytda e'lon qilingan`;
  if (hidden.length === 0) return `${head}.`;

  const noImage = hidden.filter((p) => !p.imageUrl).length;
  const byHand = hidden.filter((p) => p.imageUrl && (!p.billzId || p.manualFields.includes('hidden'))).length;
  const gone = hidden.length - noImage - byHand;
  const why = [
    noImage > 0 ? `${noImage} tasida rasm yo'q` : '',
    byHand > 0 ? `${byHand} tasini qo'lda yashirgansiz` : '',
    gone > 0 ? `${gone} tasi Billz'da endi yo'q` : '',
  ].filter(Boolean);
  return `${head}, ${hidden.length} tasi ko'rinmaydi. Sababi: ${why.join(', ')}.`;
}
```

- [ ] **Step 5: Bosh sahifa**

`app/routes/api.admin.dashboard.tsx`:

```ts
    count("SELECT COUNT(*) AS n FROM products WHERE billz_id IS NOT NULL AND (image_url IS NULL OR image_url = '')"),
```

`src/admin/screens/Dashboard.tsx` — «Rasm kutayotgan tovarlar» kartasining `note`:

```tsx
            note="Rasmi yo'q — shuning uchun saytda ko'rinmayapti. Rasm qo'yilishi bilan o'zi chiqadi."
```

- [ ] **Step 6: Testlar yashil**

Run: `bunx vitest run src/admin/lib/product-form.test.ts src/admin/lib/product-filter.test.ts` → PASS.

- [ ] **Step 7: Global qabul mezoni** (Global Constraints).

- [ ] **Step 8: Commit**

```bash
git add src/admin/lib/product-form.ts src/admin/lib/product-form.test.ts src/admin/lib/product-filter.ts src/admin/lib/product-filter.test.ts app/routes/api.admin.dashboard.tsx src/admin/screens/Dashboard.tsx
git commit -F - <<'EOF'
feat(admin): qulflarni jonli hisoblash va «Billz'ga qaytarish» mantig'i

`formLocks` saqlashda qo'yiladigan qulflarni forma bo'yicha hisoblaydi (belgi
saqlashdan oldin ko'rinadi), `revertField` qulfni yechib seansdagi o'zgarishni
bekor qiladi. «Nega ko'rinmaydi» sabablaridan qoldiq chiqdi, «Billz'da endi yo'q»
qo'shildi; «Rasm kerak» qoldig'i 0 bo'lgan tovarlarni ham sanaydi.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Admin — Billz tovarining tahrir formasi

**Files:**
- Modify: `src/admin/screens/ProductEdit.tsx`

**Interfaces:**
- Consumes: Task 4 — `formLocks(f, loaded)`, `revertField(f, loaded, field)`; `getProductDetail`, `updateProduct` (`src/admin/api.ts`, mavjud).
- Produces: UI (boshqa task bog'liq emas).

- [ ] **Step 1: Import va holat**

`product-form` importiga `formLocks, revertField` qo'shing:

```ts
import {
  COLOR_VALUES, EMPTY_FORM, STORAGE_VALUES, addAxisValue, detailToForm, formLocks, formToPayload, revertField, toggleAxisValue, validateForm, variantLabel,
  type ProductFormState,
} from '../lib/product-form';
```

`const [error, setError] = useState('');` dan keyin:

```ts
  // Yuklangan holat — Billz tovarida «nima o'zgardi»ni shu bilan solishtiramiz (qulflar, spec 2026-09-24 §3).
  const [rawLoaded, setLoaded] = useState(null as ProductFormState | null);
  const loaded = rawLoaded as ProductFormState | null;
```

Detail yuklash effektida `.then` ni almashtiring:

```ts
      .then((d) => { if (stale) return; const f = detailToForm(d); setForm(f); setLoaded(f); setLoad('ready'); })
```

- [ ] **Step 2: Saqlash**

`save()` ichidagi `else` tarmog'ini almashtiring:

```ts
      } else {
        await updateProduct(id, { ...formToPayload(form), manualFields: formLocks(form, loaded) });
        // Billz tovarida ko'rinish va qulflar serverda hisoblanadi — formani haqiqat bilan yangilaymiz,
        // aks holda toggle «ko'rsatilgan» deb tursa-yu, rasmsiz tovar saytda yashirin bo'lardi.
        const fresh = detailToForm(await getProductDetail(id));
        setForm(fresh);
        setLoaded(fresh);
        setDirty(false);
        toast("Saqlandi · saytda 1–5 daqiqada ko'rinadi");
      }
```

- [ ] **Step 3: Manba belgisi komponentlari**

`Chip` komponentidan keyin qo'shing:

```tsx
/**
 * Billz tovari maydonining manbasi: «Billz» — sinxronizatsiya yangilaydi; «Qo'lda» — siz o'zgartirgansiz,
 * Billz tegmaydi. «Billz'ga qaytarish» qulfni yechadi — keyingi sinxronizatsiyada Billz qiymati keladi.
 */
const SourceTag: FC<{ manual: boolean; onUnlock: () => void }> = ({ manual, onUnlock }) =>
  manual ? (
    <span className="flex items-center gap-1.5 text-label">
      <span className="font-medium text-primary">Qo'lda</span>
      <span aria-hidden className="text-muted-3">·</span>
      <button
        type="button"
        onClick={onUnlock}
        title="Keyingi sinxronizatsiyada (30 daqiqagacha) Billz qiymati qaytadi"
        className="press text-link"
      >
        Billz'ga qaytarish
      </button>
    </span>
  ) : (
    <span className="text-label text-muted-2">Billz</span>
  );

/**
 * Maydon + o'ng tepada manba belgisi. Belgi `<label>` dan **tashqarida**: `Field` o'zi `<label>`, uning ichidagi
 * tugma HTML qoidasiga ko'ra yorliq bosilganda ham bosilardi — ya'ni maydon nomiga bosish qulfni jimgina yechardi.
 */
const Tagged: FC<{ tag: ReactNode; className?: string; children: ReactNode }> = ({ tag, className = '', children }) => (
  <div className={`relative ${className}`}>
    {tag && <div className="absolute right-0 top-0">{tag}</div>}
    {children}
  </div>
);
```

- [ ] **Step 4: `manual`/`manualRow`/`catFields` o'rniga**

`// Billz tovarida narx/xususiyat/tavsifni qo'lda olish mumkin…` izohidan boshlab `catFields` konstantasining oxirigacha (`</>\n  );` bilan tugaydi) **butun blokni** shu bilan almashtiring:

```tsx
  // Billz tovarida har maydon manbasini ko'rsatamiz; qaysi qulf qo'yilishi saqlashdan oldin jonli hisoblanadi.
  const locks = formLocks(form, loaded);
  const unlock = (f: ManualField) => { if (loaded) patch((x) => revertField(x, loaded, f)); };
  const tag = (f: ManualField) => (billz ? <SourceTag manual={locks.includes(f)} onUnlock={() => unlock(f)} /> : null);
```

- [ ] **Step 5: Kartalar**

**Rasmlar** kartasining ochuvchi tegini almashtiring:

```tsx
        <Card title="Rasmlar" actions={tag('images')} description={billz ? "Rasm yuklasangiz, Billz rasmi uni almashtirmaydi." : undefined}>
```

**Holat**: `<Card title="Holat">` → `<Card title="Holat" actions={tag('hidden')}>`; «Saytda ko'rsatilsin» `SwitchRow` ining `hint` i:

```tsx
              hint={billz ? "Yashirsangiz shunday qoladi. Ko'rsatsangiz — rasmi bo'lsa saytda chiqadi." : undefined}
```

**Ma'lumot** kartasini (`<Card\n          title="Ma'lumot"` dan uning `</Card>` gacha) **butunlay** almashtiring:

```tsx
        <Card
          title="Ma'lumot"
          description={billz ? "Billz'dan keladi. O'zgartirgan maydoningiz «Qo'lda» bo'ladi va sinxronizatsiya unga tegmaydi." : undefined}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Tagged tag={tag('name')} className="md:col-span-2">
              {billz ? (
                // Billz tovarida model qidiruvi yo'q: model tanlash nom, brend, kategoriya va xususiyatlarni birdaniga
                // to'ldiradi — to'rttasini bir bosishda jimgina qulflab qo'yardi.
                <Field label="Nomi" required>
                  <Input value={form.name} onChange={(v) => set('name', v)} />
                </Field>
              ) : (
                <Field label="Nomi / model qidirish" required hint="Model tanlansa brend, kategoriya va xususiyatlar o'zi to'ladi">
                  <ModelCombobox models={models} value={form.name} onChange={(t) => set('name', t)} onPick={pickModel} className={INPUT_CLS} />
                </Field>
              )}
            </Tagged>
            <Tagged tag={tag('brand')}>
              <Field label="Brend">
                <Select value={form.brandId ?? ''} onChange={(v) => set('brandId', v || null)}>
                  <option value="">— tanlang —</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
            </Tagged>
            <Tagged tag={tag('category')}>
              <Field label="Kategoriya">
                <Select value={form.categoryId ?? ''} onChange={(v) => setCategory(v || null)}>
                  <option value="">— tanlang —</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
            </Tagged>
            <Field label="Turi" hint="Yo'nalish sahifasidagi tur qatori; tursiz mahsulot katalogda qoladi">
              <Select value={form.type ?? ''} disabled={form.categoryId === null} onChange={(v) => set('type', v || null)}>
                <option value="">{form.categoryId === null ? '— avval kategoriya —' : '— tanlang —'}</option>
                {types.filter((t) => t.categoryId === form.categoryId).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </Select>
            </Field>
            <Tagged tag={tag('description')} className="md:col-span-2">
              <Field label="Tavsif">
                <Textarea value={form.description} onChange={(v) => set('description', v)} rows={5} />
              </Field>
            </Tagged>
          </div>
        </Card>
```

**Narx** kartasini (`<Card\n          title="Narx"` dan uning `</Card>` gacha) almashtiring:

```tsx
        <Card
          title="Narx"
          actions={tag('price')}
          description={billz ? "Billz'dagi USD narx × do'kon kursi. O'zgartirsangiz — Billz narxi ham, kurs ham bu tovarga ta'sir qilmaydi." : undefined}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Naqd narx (so'm)" required={form.variants.length === 0} hint={form.variants.length > 0 ? "Bo'sh qolsa eng arzon variant narxi olinadi" : undefined}>
              <PriceInput className={INPUT_CLS} value={form.cashPriceUzs} onChange={(v) => set('cashPriceUzs', v)} />
            </Field>
            <Field label="Eski narx (so'm)" hint="Chegirma belgisi uchun; ixtiyoriy">
              <PriceInput className={INPUT_CLS} value={form.oldPriceUzs} onChange={(v) => set('oldPriceUzs', v)} />
            </Field>
          </div>
          {billz && <p className="mt-3 text-label text-muted-2">{`Qoldiq: ${form.billzStock ?? 0} — Billz'dan.`}</p>}
        </Card>
```

**Xususiyatlar** kartasini (`<Card\n          title="Xususiyatlar"` dan uning `</Card>` gacha) almashtiring:

```tsx
        <Card
          title="Xususiyatlar"
          actions={tag('specs')}
          description={billz ? "Billz'dan keladi. O'zgartirsangiz ro'yxat «Qo'lda» bo'ladi." : 'Nom va qiymat — mahsulot sahifasidagi jadval.'}
        >
          <div className="flex flex-col gap-2">
            {form.specs.map((s, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="Nomi (Xotira)" value={s.label} onChange={(v) => set('specs', form.specs.map((x, j) => (j === i ? { ...x, label: v } : x)))} />
                <Input placeholder="Qiymati (256GB)" value={s.value} onChange={(v) => set('specs', form.specs.map((x, j) => (j === i ? { ...x, value: v } : x)))} />
                <button
                  type="button"
                  aria-label="Xususiyatni olib tashlash"
                  onClick={() => set('specs', form.specs.filter((_, j) => j !== i))}
                  className="press shrink-0 rounded-xs px-2 text-muted-2 hover:text-danger"
                >
                  <X aria-hidden className="size-4" />
                </button>
              </div>
            ))}
            <div>
              <Button variant="quiet" onClick={() => set('specs', [...form.specs, { label: '', value: '' }])}>+ Xususiyat</Button>
            </div>
          </div>
        </Card>
```

- [ ] **Step 6: Fayl izohi va ishlatilmay qolgan importlar**

Komponent ustidagi izohning Billz jumlasini almashtiring:

```ts
 * Billz tovari ham oddiy tovardek tahrirlanadi: o'zgartirilgan guruh «Qo'lda» bo'ladi va sinxronizatsiya unga
 * tegmaydi (`products.manual_fields`, spec 2026-09-24 §3); «Billz'ga qaytarish» qulfni yechadi.
 * O'chirish yo'q (sinxronizatsiya qaytaradi), faqat yashirish.
```

`grep -n "Rows\|formatThousands" src/admin/screens/ProductEdit.tsx` — ishlatilmay qolganlarini importdan olib tashlang (faqat shu o'zgarish ishlatilmay qoldirganlarni).

- [ ] **Step 7: Global qabul mezoni** (Global Constraints). Brauzer tekshiruvini **controller** bajaradi: Billz tovarini ochish → nomni o'zgartirish → belgi saqlashdan oldin «Qo'lda» → saqlash → sahifa yangilanganda ham «Qo'lda» → «Billz'ga qaytarish» → saqlash → «Billz»; `Nomi` yorlig'iga bosish qulfni yechmasligi.

- [ ] **Step 8: Commit**

```bash
git add src/admin/screens/ProductEdit.tsx
git commit -F - <<'EOF'
feat(admin): Billz tovari to'liq tahrirlanadi, har maydonda manba belgisi

«Qo'lda tahrirlash» toggle'lari va faqat-o'qish qatorlari o'rniga oddiy
maydonlar; har guruhda «Billz» yoki «Qo'lda · Billz'ga qaytarish». Belgi
saqlashdan oldin jonli chiqadi. Billz tovarida nom — oddiy matn maydoni
(model qidiruvi to'rt guruhni birdan qulflardi). Saqlagach forma serverdan
qayta o'qiladi — ko'rinish Billz tovarida qoidadan hisoblanadi.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 6: MCP — qulflar, chegirma, faol yaratish, xususiyatlar

**Files:**
- Modify: `shared/mcp-tools.ts` (+`shared/mcp-tools.test.ts`)
- Modify: `shared/mcp-register.ts`

**Interfaces:**
- Consumes: Task 1 — `applyManualEdits` (`shared/billz.ts`); Task 3 — `PATCH` Billz tovarida ko'rinishni qoidadan hisoblaydi, `PUT` ham.
- Produces (`shared/mcp-tools.ts`):
  - `export function discountPct(cash: number, old: number | null): number | null`
  - `export function priceText(cash: number, old: number | null): string`
  - `export function upsertSpecs(current: ApiSpec[], set?: ApiSpec[], remove?: string[]): ApiSpec[]`
  - `export interface VariantPriceUpdate { value: string; price: number; oldPrice?: number | null }`
  - `applyVariantPrices(d, updates: VariantPriceUpdate[])` — eski narxni ham qo'yadi
  - `PriceRow` ga `old: number | null`
  - `manualFieldsFor`, `LOCKS`, `ProductPatch` **o'chiriladi**.

- [ ] **Step 1: Yiqiladigan testlar**

`shared/mcp-tools.test.ts` importini almashtiring:

```ts
import {
  catalogStats, imageFilesOf, incompleteProducts, detailToInput,
  variantPriceGroups, applyVariantPrices, displayedPrice, priceAskText, priceChangeSummary,
  discountPct, priceText, upsertSpecs,
} from './mcp-tools';
import { discountPercent } from '../src/lib/installment';
```

`describe('manualFieldsFor', …)` blokini **o'chiring** (funksiya endi `shared/billz.ts` `applyManualEdits`, u yerda testlangan).

`variantPriceGroups` testlaridagi `rows` kutilmalariga `old: null` qo'shing:

```ts
        rows: [{ label: '256GB', price: 100, old: null }, { label: '512GB', price: 200, old: null }],
```

va

```ts
        { label: '256GB / Black', price: 100, old: null }, { label: '256GB / Silver', price: 110, old: null },
        { label: '512GB / Black', price: 200, old: null }, { label: '512GB / Silver', price: 210, old: null },
```

`describe('variant narxlari', …)` ichida, `applyVariantPrices` describe'iga qo'shing:

```ts
    it("eski narx o'sha qiymatli hamma variantga tushadi, null — chegirmani olib tashlaydi", () => {
      const d = applyVariantPrices(byStorage, [{ value: '256GB', price: 150, oldPrice: 180 }]);
      expect(d.variants.map((v) => v.oldPriceUzs)).toEqual([180, 180, null, null]);
      const cleared = applyVariantPrices(d, [{ value: '256GB', price: 150, oldPrice: null }]);
      expect(cleared.variants.map((v) => v.oldPriceUzs)).toEqual([null, null, null, null]);
    });

    it("eski narx berilmasa — mavjudi o'z holicha", () => {
      const d = applyVariantPrices(applyVariantPrices(byStorage, [{ value: '256GB', price: 150, oldPrice: 180 }]), [{ value: '256GB', price: 160 }]);
      expect(d.variants.map((v) => v.oldPriceUzs)).toEqual([180, 180, null, null]);
    });

    it("eski narx yangisidan katta bo'lmasa — xato, sabab sodda", () => {
      expect(() => applyVariantPrices(byStorage, [{ value: '256GB', price: 150, oldPrice: 150 }]))
        .toThrow(/eski narx.*katta bo'lishi kerak/);
    });
```

Fayl oxiriga:

```ts
describe('chegirma', () => {
  it("discountPct saytdagi discountPercent bilan aynan bir xil", () => {
    for (const [cash, old] of [[25000000, 28000000], [100, 100], [100, 99], [99, 100], [1, 1000], [18887400, null]] as const) {
      expect(discountPct(cash, old)).toBe(discountPercent(cash, old));
    }
  });

  it('priceText chegirma bo\'lsa foiz va eski narxni aytadi', () => {
    expect(priceText(25000000, 28000000)).toBe("25 000 000 so'm — chegirma −11% (eski narx 28 000 000)");
    expect(priceText(25000000, null)).toBe("25 000 000 so'm");
    expect(priceText(25000000, 25000000)).toBe("25 000 000 so'm");
  });

  it("variant ro'yxatida chegirma ko'rinadi", () => {
    const d = applyVariantPrices(byStorageForDiscount(), [{ value: '256GB', price: 100, oldPrice: 120 }]);
    expect(priceChangeSummary(byStorageForDiscount(), d)).toContain("• 256GB — 100 so'm — chegirma −17% (eski narx 120)");
  });
});

describe('upsertSpecs — xususiyatlarni qo\'shish, yangilash, o\'chirish', () => {
  const cur = [{ label: 'Xotira', value: '256GB' }, { label: 'Rang', value: 'Qora' }];

  it("yangi nom oxiriga qo'shiladi, qolganlariga tegilmaydi", () => {
    expect(upsertSpecs(cur, [{ label: 'Chip', value: 'A19' }])).toEqual([...cur, { label: 'Chip', value: 'A19' }]);
  });

  it("bor nom — qiymati yangilanadi, joyi va yozilishi saqlanadi", () => {
    expect(upsertSpecs(cur, [{ label: 'xotira', value: '512GB' }])).toEqual([{ label: 'Xotira', value: '512GB' }, cur[1]]);
  });

  it("o'chirish — nom bo'yicha, katta-kichik harfsiz", () => {
    expect(upsertSpecs(cur, [], ['RANG'])).toEqual([cur[0]]);
  });

  it("bo'sh nom yoki qiymat tashlanadi", () => {
    expect(upsertSpecs(cur, [{ label: ' ', value: 'x' }, { label: 'Port', value: '' }])).toEqual(cur);
  });

  it("asl ro'yxatni o'zgartirmaydi", () => {
    upsertSpecs(cur, [{ label: 'Xotira', value: '1TB' }]);
    expect(cur[0].value).toBe('256GB');
  });
});
```

`describe('variant narxlari', …)` ichidagi `phone` helperidan tashqarida ham foydalanish uchun, fayl oxiridagi `chegirma` describe'idan oldin yozing:

```ts
const byStorageForDiscount = () => ({
  id: 'ip', name: 'iPhone 18 Pro', description: null, images: [], specs: [], brand: null,
  options: [
    { id: 'o1', name: 'Xotira', sortOrder: 0, values: [{ id: 's256', value: '256GB', sortOrder: 0 }, { id: 's512', value: '512GB', sortOrder: 1 }] },
  ],
  variants: [
    { id: 'v0', sku: null, cashPriceUzs: 100, oldPriceUzs: null, imageUrl: null, inStock: true, sortOrder: 0, optionValueIds: ['s256'] },
    { id: 'v1', sku: null, cashPriceUzs: 200, oldPriceUzs: null, imageUrl: null, inStock: true, sortOrder: 1, optionValueIds: ['s512'] },
  ],
}) as unknown as ApiProductDetail;
```

- [ ] **Step 2: Yiqilishini ko'ring**

Run: `bunx vitest run shared/mcp-tools.test.ts`
Expected: FAIL — `discountPct is not a function`.

- [ ] **Step 3: `shared/mcp-tools.ts`**

Birinchi importni almashtiring:

```ts
import type { ManualField } from './billz.ts';
```

`LOCKS`, `ProductPatch` va `manualFieldsFor` (izohlari bilan) **o'chiring**.

Variant bo'limida `som` ni ikkiga ajrating:

```ts
const thousands = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const som = (n: number) => `${thousands(n)} so'm`;
```

`PriceRow` ni almashtiring:

```ts
export interface PriceRow { label: string; price: number; old: number | null }
```

`variantPriceGroups` ichidagi qiymat sikli va fallback:

```ts
    for (const v of sortBy(o.values)) {
      const vs = d.variants.filter((x) => x.optionValueIds.includes(v.id));
      const prices = new Set(vs.map((x) => x.cashPriceUzs));
      if (prices.size === 0) continue;
      if (prices.size > 1) { determines = false; break; }
      const olds = new Set(vs.map((x) => x.oldPriceUzs ?? null));
      rows.push({ label: v.value, price: [...prices][0], old: olds.size === 1 ? [...olds][0] : null });
    }
```

```ts
  return {
    by: null, others: [],
    rows: sortBy(d.variants).map((v) => ({ label: variantLabel(d, v.optionValueIds), price: v.cashPriceUzs, old: v.oldPriceUzs ?? null })),
  };
```

`applyVariantPrices` ni **butunlay** almashtiring:

```ts
export interface VariantPriceUpdate { value: string; price: number; oldPrice?: number | null }

/**
 * Narxni qiymat bo'yicha qo'yadi: «256GB — 150» shu qiymatli **hamma** variantga (hamma rangga) tushadi.
 * `oldPrice` berilsa chegirma (eski narx) ham qo'yiladi, `null` — chegirma olib tashlanadi, berilmasa —
 * mavjudi qoladi. Asl tovar o'zgarmaydi. Noma'lum qiymat, ikki xil narx yoki eski narx yangisidan katta
 * bo'lmasa — hech narsa qo'yilmaydi, sababi sodda tilda aytiladi.
 */
export function applyVariantPrices(d: ApiProductDetail, updates: VariantPriceUpdate[]): ApiProductDetail {
  for (const u of updates) {
    if (u.oldPrice != null && u.oldPrice <= u.price) {
      throw new Error(`«${u.value}»: eski narx (${thousands(u.oldPrice)}) yangi narxdan (${thousands(u.price)}) katta bo'lishi kerak — aks holda saytda chegirma belgisi chiqmaydi.`);
    }
  }
  const matched = updates.map((u) => {
    const ids = d.options.flatMap((o) => o.values).filter((v) => norm(v.value) === norm(u.value)).map((v) => v.id);
    if (ids.length === 0) {
      const have = sortBy(d.options).map((o) => `${o.name}: ${sortBy(o.values).map((v) => v.value).join(', ')}`).join('; ');
      throw new Error(`«${u.value}» topilmadi. Bu tovarda bor variantlar — ${have}.`);
    }
    return { ...u, ids };
  });

  const variants = d.variants.map((v) => {
    const hits = matched.filter((m) => m.ids.some((id) => v.optionValueIds.includes(id)));
    const keys = new Set(hits.map((h) => `${h.price}|${h.oldPrice === undefined ? '~' : String(h.oldPrice)}`));
    if (keys.size > 1) {
      throw new Error(`«${variantLabel(d, v.optionValueIds)}» ga ikki xil narx to'g'ri keldi (${hits.map((h) => h.value).join(' va ')}). Bittasini ayting.`);
    }
    if (hits.length === 0) return v;
    const h = hits[0];
    return { ...v, cashPriceUzs: h.price, oldPriceUzs: h.oldPrice === undefined ? v.oldPriceUzs : h.oldPrice };
  });
  return { ...d, variants };
}
```

`priceAskText` dagi qator:

```ts
    ...g.rows.map((r) => `• ${r.label} — ${priceText(r.price, r.old)}`),
```

`priceChangeSummary` dagi qatorlar:

```ts
  const lines = ["Narx o'zgardi.", ...g.rows.map((r) => {
    const old = was.get(r.label);
    return `• ${r.label} — ${priceText(r.price, r.old)}${old !== undefined && old !== r.price ? ` (avval ${thousands(old)})` : ''}`;
  })];
```

Variant bo'limidan keyin qo'shing:

```ts
// ─── Chegirma va xususiyatlar ─────────────────────────────────────────────────

/**
 * Saytdagi «−N%» belgisi. Formula `src/lib/installment.ts` `discountPercent` bilan **aynan bir xil** —
 * `shared/` dan `src/` ni import qilib bo'lmaydi (Docker image'da `src/` yo'q), shuning uchun nusxa;
 * `mcp-tools.test.ts` ikkalasini bir xil javob berishga majburlaydi.
 */
export function discountPct(cash: number, old: number | null): number | null {
  if (old === null || old <= cash) return null;
  const pct = Math.round(((old - cash) / old) * 100);
  return pct > 0 ? pct : null;
}

/** Narx — chegirma bo'lsa saytdagi foiz va eski narx bilan (egasi mijoz oldida aynan shuni ko'radi). */
export function priceText(cash: number, old: number | null): string {
  const pct = discountPct(cash, old);
  return pct === null || old === null ? som(cash) : `${som(cash)} — chegirma −${pct}% (eski narx ${thousands(old)})`;
}

/**
 * Xususiyatlar nom bo'yicha: bor bo'lsa qiymati yangilanadi (joyi va yozilishi saqlanadi), yo'q bo'lsa oxiriga
 * qo'shiladi, `remove` — o'chiriladi; qolganlariga tegilmaydi. Ilgari `specs` butun ro'yxatni almashtirardi:
 * «Xotira qo'sh» deyilsa Claude bitta qator yuborib qolgan hammasini o'chirib yuborishi mumkin edi.
 */
export function upsertSpecs(current: ApiSpec[], set: ApiSpec[] = [], remove: string[] = []): ApiSpec[] {
  const drop = new Set(remove.map(norm));
  const out = current.filter((s) => !drop.has(norm(s.label))).map((s) => ({ ...s }));
  for (const u of set) {
    const label = u.label.trim();
    const value = u.value.trim();
    if (!label || !value) continue;
    const i = out.findIndex((s) => norm(s.label) === norm(label));
    if (i >= 0) out[i] = { label: out[i].label, value };
    else out.push({ label, value });
  }
  return out;
}
```

`ProductInputBody.manualFields: ManualField[]` o'z holicha qoladi.

- [ ] **Step 4: Testlar yashil**

Run: `bunx vitest run shared/mcp-tools.test.ts` → PASS.

- [ ] **Step 5: `shared/mcp-register.ts`**

Importlarni almashtiring:

```ts
import { z } from 'zod';
import type { ApiAdminBrand, ApiCategory, ApiProduct, ApiProductDetail, ApiProductType, ApiSpec } from './types.ts';
import {
  catalogStats, incompleteProducts, detailToInput,
  applyVariantPrices, displayedPrice, priceAskText, priceChangeSummary, priceText, discountPct, upsertSpecs,
  type VariantPriceUpdate,
} from './mcp-tools.ts';
import { applyManualEdits } from './billz.ts';
import { isSafeImageUrl, tooLarge } from './mcp-image.ts';
import type { AdminClient } from './mcp-client.ts';
```

`image_upload_from_url` ning `description` i:

```ts
    description: "Rasmni https havoladan yuklab saytga qo'yadi. Javob — saytdagi rasm manzillari. Chatga tashlangan rasm faylini bu tool ololmaydi — buning uchun `image_upload_link` bilan havola bering.",
```

`product_create` ni **butunlay** almashtiring:

```ts
  server.registerTool('product_create', {
    description: "Yangi tovar qo'shadi va **darhol saytda chiqaradi**. `type` ni avval `types_list` dan tanlang. Rasm bo'lmasa egasiga ayting va `image_upload_link` bilan havola bering.",
    inputSchema: {
      name: z.string().min(2),
      categoryId: z.enum(['apple', 'pc', 'audio', 'video']),
      type: z.string(),
      cashPriceUzs: z.number().int().positive(),
      oldPriceUzs: z.number().int().positive().optional(),
      description: z.string().optional(),
      brandId: z.string().optional(),
      condition: z.enum(['yangi', 'ishlatilgan']).default('yangi'),
      specs: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
      imageUrls: z.array(z.string()).optional(),
    },
  }, async (args: unknown) => {
    const parsed = args as {
      name: string; categoryId: string; type: string; cashPriceUzs: number; oldPriceUzs?: number;
      description?: string; brandId?: string; condition: 'yangi' | 'ishlatilgan';
      specs?: ApiSpec[]; imageUrls?: string[];
    };
    if (parsed.oldPriceUzs !== undefined && discountPct(parsed.cashPriceUzs, parsed.oldPriceUzs) === null) {
      throw new Error("Eski narx yangi narxdan katta bo'lishi kerak — aks holda saytda chegirma belgisi chiqmaydi.");
    }
    const images = parsed.imageUrls ?? [];
    const created = await api.write<{ id: string }>('/api/admin/products', 'POST', {
      name: parsed.name, categoryId: parsed.categoryId, type: parsed.type,
      condition: parsed.condition, conditionNote: null, cashPriceUzs: parsed.cashPriceUzs,
      oldPriceUzs: parsed.oldPriceUzs ?? null, description: parsed.description ?? null,
      imageUrl: images[0] ?? '', images: images.slice(1), specs: upsertSpecs([], parsed.specs ?? []),
      sortOrder: 0, isActive: true, brandId: parsed.brandId ?? null, slug: null,
      ratingAvg: null, reviewCount: 0, preorder: false, options: [], variants: [], manualFields: [],
    }, 'product_create');
    const link = `${opts.adminUrl}/admin/products/${created.id}`;
    return text(images.length > 0
      ? `Qo'shildi va saytda chiqdi. Narx: ${priceText(parsed.cashPriceUzs, parsed.oldPriceUzs ?? null)}\n${link}`
      : `Qo'shildi va saytda chiqdi, lekin rasmi yo'q — saytda rasmsiz ko'rinadi. Rasm uchun havola bering yoki yuklash havolasini oching.\n${link}`);
  });
```

`product_update` ni **butunlay** almashtiring:

```ts
  server.registerTool('product_update', {
    description: "Mavjud tovarni yangilaydi. Billz tovarida o'zgartirilgan maydon qulflanadi — sinxronizatsiya unga boshqa tegmaydi.\n\n"
      + "NARX: variantsiz tovarda `cashPriceUzs`, chegirma — `oldPriceUzs` (yangi narxdan katta; `null` — chegirmani olib tashlash). "
      + "**Variantli tovarda** (xotira/rang bo'yicha har xil narx) `cashPriceUzs`/`oldPriceUzs` yuborsangiz hech narsa yozilmaydi va tool hozirgi narxlar ro'yxatini qaytaradi: "
      + "uni egasiga sodda qilib o'qib bering va qaysi variant ekanini so'rang. Keyin `variantPrices` bilan qo'ying, masalan "
      + "[{ value: '256GB', price: 25000000, oldPrice: 28000000 }] — o'sha qiymatli hamma variantga (hamma rangga) tushadi. "
      + "Javobdagi «Saytda endi … ko'rinadi» qatorini albatta aytib bering.\n\n"
      + "XUSUSIYATLAR: `specs` nom bo'yicha qo'shadi yoki qiymatini yangilaydi, qolganlariga tegmaydi; `removeSpecs` — nom bo'yicha o'chiradi.\n"
      + "TAVSIF: butun matn almashadi — qo'shimcha kerak bo'lsa avval `product_get` bilan o'qing va to'liq yangi matnni yuboring.",
    inputSchema: {
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      cashPriceUzs: z.number().int().positive().optional(),
      oldPriceUzs: z.number().int().positive().nullable().optional(),
      variantPrices: z.array(z.object({
        value: z.string(), price: z.number().int().positive(), oldPrice: z.number().int().positive().nullable().optional(),
      })).min(1).optional(),
      specs: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
      removeSpecs: z.array(z.string()).optional(),
    },
  }, async (args: unknown) => {
    const a = args as {
      id: string; name?: string; description?: string; cashPriceUzs?: number; oldPriceUzs?: number | null;
      variantPrices?: VariantPriceUpdate[]; specs?: ApiSpec[]; removeSpecs?: string[];
    };
    const current = await api.get<ApiProductDetail>(`/api/admin/products/${a.id}`);
    const hasVariants = current.variants.length > 0;
    const pricing = a.cashPriceUzs !== undefined || a.oldPriceUzs !== undefined;

    // Variantli tovarda asosiy narx saytda ko'rinmaydi — uni jimgina yozib «Saqlandi» deyish mijoz oldida
    // yolg'on muvaffaqiyat edi (2026-09-24). Hech narsa yozmaymiz, tanlov beramiz.
    if (hasVariants && pricing && !a.variantPrices) return text(priceAskText(current));
    if (!hasVariants && a.variantPrices) {
      throw new Error("Bu tovarda xotira yoki rang variantlari yo'q — narxni `cashPriceUzs` bilan o'zgartiring.");
    }
    const cash = a.cashPriceUzs ?? current.cashPriceUzs;
    if (!hasVariants && a.oldPriceUzs != null && a.oldPriceUzs <= cash) {
      throw new Error(`Eski narx (${priceText(a.oldPriceUzs, null)}) yangi narxdan (${priceText(cash, null)}) katta bo'lishi kerak — aks holda saytda chegirma belgisi chiqmaydi.`);
    }

    const next = a.variantPrices ? applyVariantPrices(current, a.variantPrices) : current;
    const before = detailToInput(current);
    const body = detailToInput(next);
    if (a.name !== undefined) body.name = a.name;
    if (a.description !== undefined) body.description = a.description;
    // Variant narxida asosiy narx saytdagi «… dan» narxga tenglanadi.
    if (a.variantPrices) body.cashPriceUzs = displayedPrice(next);
    else if (a.cashPriceUzs !== undefined) body.cashPriceUzs = a.cashPriceUzs;
    if (!a.variantPrices && a.oldPriceUzs !== undefined) body.oldPriceUzs = a.oldPriceUzs;
    if (a.specs || a.removeSpecs) body.specs = upsertSpecs(current.specs, a.specs, a.removeSpecs);
    body.manualFields = current.billzId ? applyManualEdits(current.manualFields, before, body) : current.manualFields;
    await api.write(`/api/admin/products/${a.id}`, 'PUT', body, 'product_update');

    const link = `${opts.adminUrl}/admin/products/${a.id}`;
    if (a.variantPrices) return text(`${priceChangeSummary(current, next)}\n${link}`);
    const lines = ['Saqlandi.'];
    if (pricing) {
      lines.push(`Narx: ${priceText(body.cashPriceUzs, body.oldPriceUzs)}`);
      if (body.oldPriceUzs !== null && discountPct(body.cashPriceUzs, body.oldPriceUzs) === null) {
        lines.push("Eski narx yangi narxdan katta emas — saytda chegirma belgisi chiqmaydi.");
      }
    }
    if (a.specs || a.removeSpecs) lines.push('Xususiyatlar:', ...body.specs.map((s) => `• ${s.label} — ${s.value}`));
    if (current.billzId && body.manualFields.length > current.manualFields.length) {
      lines.push("Billz tovari — bu o'zgarishlar sinxronizatsiyada saqlanadi.");
    }
    lines.push(link);
    return text(lines.join('\n'));
  });
```

`product_set_images` ni **butunlay** almashtiring:

```ts
  server.registerTool('product_set_images', {
    description: "Tovarning rasmlarini almashtiradi: birinchisi asosiy rasm, qolgani galereya. Billz tovarida rasmlar qulflanadi — Billz rasmi ularni almashtirmaydi.",
    inputSchema: { id: z.string(), imageUrls: z.array(z.string()).min(1) },
  }, async (args: unknown) => {
    const parsed = args as { id: string; imageUrls: string[] };
    const current = await api.get<ApiProductDetail>(`/api/admin/products/${parsed.id}`);
    const before = detailToInput(current);
    const body = { ...before, imageUrl: parsed.imageUrls[0], images: parsed.imageUrls.slice(1) };
    body.manualFields = current.billzId ? applyManualEdits(current.manualFields, before, body) : current.manualFields;
    const saved = await api.write<ApiProduct>(`/api/admin/products/${parsed.id}`, 'PUT', body, 'product_set_images');
    return text(`Rasmlar yangilandi (${parsed.imageUrls.length} ta). ${saved.isActive ? "Tovar saytda ko'rinadi." : 'Tovar saytda yashirin.'}\n${opts.adminUrl}/admin/products/${parsed.id}`);
  });
```

`product_set_visibility` ni **butunlay** almashtiring:

```ts
  server.registerTool('product_set_visibility', {
    description: "Tovarni saytda ko'rsatadi yoki yashiradi. Yashirilgan tovar shunday qoladi — Billz uni qaytarib ochmaydi. Tovar o'chirilmaydi. Rasmsiz tovar ko'rsatilmaydi — bunday holda egasiga `image_upload_link` bilan havola bering.",
    inputSchema: { id: z.string(), visible: z.boolean() },
  }, async (args: unknown) => {
    const parsed = args as { id: string; visible: boolean };
    // Admin toggle'i bilan bir xil `PATCH`: faqat `is_active` (va Billz tovarida `hidden` qulfi) yoziladi.
    const updated = await api.write<ApiProduct>(`/api/admin/products/${parsed.id}`, 'PATCH', { isActive: parsed.visible }, 'product_set_visibility');
    const link = `${opts.adminUrl}/admin/products/${parsed.id}`;
    if (parsed.visible && !updated.isActive) {
      return text(`Saytda chiqmadi: tovarda rasm yo'q. Rasm qo'shilishi bilan o'zi chiqadi.\n${link}`);
    }
    return text(`${parsed.visible ? "Saytda ko'rsatildi" : 'Saytdan yashirildi'}: ${link}`);
  });
```

- [ ] **Step 6: Global qabul mezoni** (Global Constraints). `grep -rn "manualFieldsFor\|ProductPatch" shared mcp server app src` — bo'sh.

- [ ] **Step 7: Dev serverda MCP bilan tekshirish**

Task 3 dagidek sinov tokeni va `PORT=<bo'sh> PUBLIC_URL=http://localhost:<port> bun run dev`. `/mcp` ga `tools/call` bilan (verbatim chiqishni hisobotga):

1. `product_update` variantsiz tovarda `{cashPriceUzs, oldPriceUzs}` → «Narx: … — chegirma −N% (eski narx …)».
2. `oldPriceUzs` ≤ narx → xato matni.
3. `specs: [{label:'Chip', value:'A19'}]` → qolgan xususiyatlar saqlangan, Chip oxirida.
4. `removeSpecs: ['chip']` → o'chdi.
5. Billz qilingan sinov tovarida `name` o'zgartirish → bazada `manual_fields` ichida `name`.
6. `product_create` rasmsiz → «Qo'shildi va saytda chiqdi, lekin rasmi yo'q…», bazada `is_active=1`.
7. `product_set_visibility` rasmsiz Billz tovarini ko'rsatish → «Saytda chiqmadi: tovarda rasm yo'q…».
8. Variantli tovarda `variantPrices` `oldPrice` bilan → xulosada «chegirma −N%».

Sinov ma'lumotlarini qiymat bo'yicha tiklang, token va jurnal qatorlarini o'chiring, serverni to'xtating.

- [ ] **Step 8: Commit**

```bash
git add shared/mcp-tools.ts shared/mcp-tools.test.ts shared/mcp-register.ts
git commit -F - <<'EOF'
feat(mcp): chegirma, darhol faol yaratish, xususiyatlarni qo'shish/o'chirish

`product_update` eski narxni (variantlarda ham) qo'yadi va saytdagi foizni
`discountPercent` bilan bir xil formulada aytadi; `specs` endi nom bo'yicha
qo'shadi/yangilaydi, `removeSpecs` o'chiradi — bitta qator butun ro'yxatni
o'chirib yubormaydi. Qulflar `applyManualEdits` dan: Billz tovarida nom va
rasm ham qoladi. `product_create` darhol faol; yashirish endi doimiy.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 7: Yuklash havolasi

**Files:**
- Create: `functions/lib/upload-link.ts`, `functions/lib/upload-link.test.ts`
- Create: `app/routes/api.admin.products.$id.upload-link.tsx`
- Create: `app/routes/yuklash.$token.tsx`
- Modify: `app/routes.ts`, `server/index.ts`, `app/routes/robots[.]txt.tsx`, `shared/mcp-register.ts`

**Interfaces:**
- Consumes: `createSession`/`verifySession` (`functions/lib/auth.ts`), `loadAdminAuth` (`functions/lib/db.ts`), `imagesStatements` (`shared/product-statements.ts`), `billzVisible`/`parseManualFields`/`serializeManualFields` (`shared/billz.ts`), `createLimiter` (`shared/rate-limit.ts`), `normalizeImage` (`src/admin/lib/image-normalize.ts`).
- Produces:
  - `functions/lib/upload-link.ts`: `export const UPLOAD_TTL = 1800`; `createUploadToken(productId: string, sessionSecret: string, now: number): Promise<string>`; `verifyUploadToken(token: string, sessionSecret: string, now: number): Promise<string | null>`
  - `POST /api/admin/products/:id/upload-link` → `{ url: string; expiresAt: number }`
  - `GET/POST /yuklash/:token`
  - MCP tool `image_upload_link({ id })`

- [ ] **Step 1: Yiqiladigan test**

`functions/lib/upload-link.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createSession, verifySession } from './auth';
import { createUploadToken, verifyUploadToken, UPLOAD_TTL } from './upload-link';

const SECRET = 'a'.repeat(64);
const NOW = 1_800_000_000;

describe('yuklash havolasi tokeni', () => {
  it("imzolangan tovar id'sini qaytaradi", async () => {
    const t = await createUploadToken('iphone-18-pro', SECRET, NOW);
    expect(await verifyUploadToken(t, SECRET, NOW + 60)).toBe('iphone-18-pro');
  });

  it('30 daqiqadan keyin o\'ladi', async () => {
    const t = await createUploadToken('p1', SECRET, NOW);
    expect(UPLOAD_TTL).toBe(1800);
    expect(await verifyUploadToken(t, SECRET, NOW + UPLOAD_TTL + 1)).toBeNull();
  });

  it('buzilgan token o\'tmaydi', async () => {
    const t = await createUploadToken('p1', SECRET, NOW);
    expect(await verifyUploadToken(`${t}x`, SECRET, NOW)).toBeNull();
    expect(await verifyUploadToken('salom', SECRET, NOW)).toBeNull();
  });

  it("admin parol almashsa (session_secret aylansa) hamma havola o'ladi", async () => {
    const t = await createUploadToken('p1', SECRET, NOW);
    expect(await verifyUploadToken(t, 'b'.repeat(64), NOW)).toBeNull();
  });

  it('admin sessiya tokeni yuklash tokeni sifatida o\'tmaydi', async () => {
    const adminCookie = await createSession('admin', SECRET, 3600, NOW);
    expect(await verifyUploadToken(adminCookie, SECRET, NOW)).toBeNull();
  });

  it('yuklash tokeni admin sessiyasi sifatida o\'tmaydi — aks holda havola 30 daqiqalik admin kaliti bo\'lardi', async () => {
    const t = await createUploadToken('p1', SECRET, NOW);
    expect(await verifySession(t, SECRET, NOW)).toBeNull();
  });
});
```

- [ ] **Step 2: Yiqilishini ko'ring**

Run: `bunx vitest run functions/lib/upload-link.test.ts` → FAIL (modul yo'q).

- [ ] **Step 3: `functions/lib/upload-link.ts`**

```ts
import { createSession, verifySession } from './auth';

/** Yuklash havolasining umri — 30 daqiqa (spec 2026-09-24 §8). */
export const UPLOAD_TTL = 30 * 60;

/**
 * Admin sessiyasi bilan **bir xil sir, lekin boshqa kalit**. `requireAdmin` cookie'dagi tokenning ichidagi
 * ismni tekshirmaydi (imzo to'g'ri bo'lsa bas), shuning uchun yuklash tokenini aynan `session_secret` bilan
 * imzolash uni 30 daqiqalik **to'liq admin sessiyasiga** aylantirardi. Qo'shimcha bilan kalit ajraladi —
 * bir tomonning tokeni ikkinchisida o'tmaydi (`upload-link.test.ts`). Parol almashsa `session_secret`
 * aylanadi va hamma ochiq havola o'ladi.
 */
const keyOf = (sessionSecret: string) => `${sessionSecret}:yuklash`;

export function createUploadToken(productId: string, sessionSecret: string, now: number): Promise<string> {
  return createSession(productId, keyOf(sessionSecret), UPLOAD_TTL, now);
}

export function verifyUploadToken(token: string, sessionSecret: string, now: number): Promise<string | null> {
  return verifySession(token, keyOf(sessionSecret), now);
}
```

- [ ] **Step 4: Test yashil** — `bunx vitest run functions/lib/upload-link.test.ts` → PASS.

- [ ] **Step 5: Havola yasash API — `app/routes/api.admin.products.$id.upload-link.tsx`**

```ts
import type { Route } from './+types/api.admin.products.$id.upload-link';
import { json, loadAdminAuth } from '../../functions/lib/db';
import { createUploadToken, UPLOAD_TTL } from '../../functions/lib/upload-link';
import { requireAdmin } from './api.admin.guard';

/**
 * Bir martalik rasm yuklash havolasi (spec 2026-09-24 §8) — MCP `image_upload_link` shuni chaqiradi.
 * Manzil so'rovdan: MCP o'z saytini `PUBLIC_URL` orqali chaqiradi, ya'ni host — saytning haqiqiy domeni.
 */
export async function action({ request, context, params }: Route.ActionArgs) {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const id = String(params.id);
  const product = await env.DB.prepare('SELECT id FROM products WHERE id = ?').bind(id).first<{ id: string }>();
  if (!product) return json({ error: 'not_found' }, { status: 404 });
  const auth = await loadAdminAuth(env);
  if (!auth) return json({ error: 'not_initialized' }, { status: 500 });
  const now = Math.floor(Date.now() / 1000);
  const token = await createUploadToken(id, auth.sessionSecret, now);
  return json({ url: `${new URL(request.url).origin}/yuklash/${token}`, expiresAt: now + UPLOAD_TTL });
}
```

- [ ] **Step 6: Sahifa — `app/routes/yuklash.$token.tsx`**

```tsx
import { useState } from 'react';
import { data, useFetcher, useLoaderData } from 'react-router';
import type { Route } from './+types/yuklash.$token';
import type { Env } from '../../shared/runtime';
import { loadAdminAuth } from '../../functions/lib/db';
import { verifyUploadToken } from '../../functions/lib/upload-link';
import { imagesStatements } from '../../shared/product-statements';
import { billzVisible, parseManualFields, serializeManualFields } from '../../shared/billz';
import { createLimiter } from '../../shared/rate-limit';
import { normalizeImage } from '../../src/admin/lib/image-normalize';

/**
 * Telefondan rasm yuklash (spec 2026-09-24 §8). Claude chatga tashlangan rasmni tool'ga uzata olmaydi —
 * shuning uchun egasiga bir martalik havola beriladi: bosadi, galereyadan tanlaydi, rasmlar tovarga qo'shiladi.
 * Parolsiz: token faqat **shu tovar** uchun va 30 daqiqa ishlaydi, faqat rasm **qo'shadi**.
 */
const EXPIRED = "Havola eskirgan yoki noto'g'ri — Claude'dan yangisini so'rang.";
const MB = 1024 * 1024;
const MAX_FILES = 10;
const ALLOWED: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
/** Bitta IP'dan daqiqasiga 30 so'rov — havola ochiq, parolsiz. */
const allowUpload = createLimiter(30, 60 * 1000);

type Product = { name: string; main: string; gallery: string[]; billzId: string | null; manual: string | null };

async function productFromToken(env: Env, token: string): Promise<string | null> {
  const auth = await loadAdminAuth(env);
  if (!auth) return null;
  return verifyUploadToken(token, auth.sessionSecret, Math.floor(Date.now() / 1000));
}

async function readProduct(env: Env, id: string): Promise<Product | null> {
  const row = await env.DB.prepare('SELECT name, image_url, billz_id, manual_fields FROM products WHERE id = ?')
    .bind(id)
    .first<{ name: string; image_url: string | null; billz_id: string | null; manual_fields: string | null }>();
  if (!row) return null;
  const gallery = await env.DB.prepare('SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order ASC')
    .bind(id)
    .all<{ image_url: string }>();
  return { name: row.name, main: row.image_url ?? '', gallery: gallery.results.map((g) => g.image_url), billzId: row.billz_id, manual: row.manual_fields };
}

function isFile(obj: unknown): obj is File {
  return typeof obj === 'object' && obj !== null && 'arrayBuffer' in obj && 'type' in obj && 'size' in obj;
}

export const meta: Route.MetaFunction = () => [{ title: 'Rasm yuklash' }, { name: 'robots', content: 'noindex, nofollow' }];

export async function loader({ context, params }: Route.LoaderArgs) {
  const id = await productFromToken(context.env, String(params.token));
  const p = id ? await readProduct(context.env, id) : null;
  if (!p) return { ok: false as const };
  return { ok: true as const, name: p.name, images: p.main ? [p.main, ...p.gallery] : p.gallery };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const env = context.env;
  if (!allowUpload(context.ip)) return data({ ok: false as const, error: "Juda ko'p urinish — bir daqiqadan keyin qayta urining." }, { status: 429 });
  const id = await productFromToken(env, String(params.token));
  if (!id) return data({ ok: false as const, error: EXPIRED }, { status: 403 });
  if (Number(request.headers.get('content-length') ?? '0') > (MAX_FILES * 5 + 2) * MB) {
    return data({ ok: false as const, error: 'Rasmlar juda katta — kamroq tanlang.' }, { status: 413 });
  }
  const files = (await request.formData()).getAll('files').filter(isFile);
  if (files.length === 0) return data({ ok: false as const, error: 'Rasm tanlanmagan.' }, { status: 400 });
  if (files.length > MAX_FILES) return data({ ok: false as const, error: `Bir martada ${MAX_FILES} tagacha rasm.` }, { status: 400 });
  // Avval hammasi tekshiriladi — bittasi yaroqsiz bo'lsa hech narsa yozilmaydi.
  for (const f of files) {
    if (!ALLOWED[f.type]) return data({ ok: false as const, error: 'Faqat JPG, PNG yoki WebP rasm.' }, { status: 400 });
    if (f.size > 5 * MB) return data({ ok: false as const, error: '5 MB dan katta rasm bor.' }, { status: 400 });
  }
  const p = await readProduct(env, id);
  if (!p) return data({ ok: false as const, error: EXPIRED }, { status: 404 });

  const urls: string[] = [];
  for (const f of files) {
    const key = `products/${crypto.randomUUID()}.${ALLOWED[f.type]}`;
    await env.IMAGES.put(key, await f.arrayBuffer(), { httpMetadata: { contentType: f.type } });
    urls.push(`/images/${key}`);
  }
  const main = p.main || urls[0];
  const gallery = [...p.gallery, ...(p.main ? urls : urls.slice(1))];
  const now = Math.floor(Date.now() / 1000);

  let update;
  if (p.billzId) {
    // Billz tovarida rasmlar qulflanadi (Billz rasmi ularni almashtirmaydi) va ko'rinish qoidadan —
    // ya'ni rasm qo'shilgan tovar **darhol** saytda chiqadi.
    const locks = parseManualFields(serializeManualFields([...parseManualFields(p.manual), 'images']));
    const visible = billzVisible({ hasImage: true, hiddenLocked: locks.includes('hidden') });
    update = env.DB.prepare('UPDATE products SET image_url = ?, manual_fields = ?, is_active = ? WHERE id = ?')
      .bind(main, serializeManualFields(locks), visible ? 1 : 0, id);
  } else {
    update = env.DB.prepare('UPDATE products SET image_url = ? WHERE id = ?').bind(main, id);
  }
  await env.DB.batch([
    update,
    ...imagesStatements(env, id, gallery),
    // Havola orqali yozuv ham jurnalga tushadi — tokenli yozuvlar kabi.
    env.DB.prepare('INSERT INTO admin_audit (at, token_label, tool, target_id) VALUES (?, ?, ?, ?)')
      .bind(now, 'yuklash havolasi', 'yuklash', id),
  ]);
  return data({ ok: true as const, added: urls.length, images: [main, ...gallery] });
}

export default function Yuklash() {
  const page = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [rawPreparing, setPreparing] = useState(false);
  const preparing = rawPreparing as boolean;
  const busy = preparing || fetcher.state !== 'idle';
  const result = fetcher.data;
  const images = result && result.ok ? result.images : page.ok ? page.images : [];

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_FILES);
    e.target.value = '';
    if (files.length === 0) return;
    setPreparing(true);
    const fd = new FormData();
    // Admin'dagi kabi: chekka kesiladi, kichraytiriladi, WebP — server rasmni qayta ishlamaydi.
    for (const f of files) fd.append('files', await normalizeImage(f));
    setPreparing(false);
    fetcher.submit(fd, { method: 'post', encType: 'multipart/form-data' });
  }

  if (!page.ok) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md items-center bg-bg px-4">
        <p className="text-copy text-primary">{EXPIRED}</p>
      </main>
    );
  }
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 bg-bg px-4 py-8">
      <div>
        <p className="text-label text-muted-2">Rasm qo'shish</p>
        <h1 className="text-subhead font-semibold text-primary">{page.name}</h1>
      </div>
      {images.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {images.map((src) => (
            <img key={src} src={src} alt="" className="aspect-square w-full rounded-sm border border-line bg-white object-contain" />
          ))}
        </div>
      ) : (
        <p className="text-para text-muted">Hozircha rasm yo'q.</p>
      )}
      <label className={`press flex h-13 cursor-pointer items-center justify-center rounded-full bg-cta text-control text-white ${busy ? 'opacity-60' : ''}`}>
        {busy ? 'Yuklanmoqda…' : 'Rasm tanlash'}
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={busy} onChange={pick} />
      </label>
      {result && (
        <p className={`text-para ${result.ok ? 'text-verified' : 'text-danger'}`}>
          {result.ok ? `${result.added} ta rasm qo'shildi.` : result.error}
        </p>
      )}
      <p className="text-label text-muted-2">Havola 30 daqiqa ishlaydi. Rasmlar tovarga qo'shiladi; tartibini admin panelida o'zgartirish mumkin.</p>
    </main>
  );
}
```

`text-danger` va `text-verified` — mavjud tokenlar. `h-13` = 52px (asosiy CTA balandligi).

- [ ] **Step 7: Yo'llar, kesh, robots**

`app/routes.ts` — `route('oauth/consent', …)` dan keyin:

```ts
  route('yuklash/:token', 'routes/yuklash.$token.tsx'),
```

`route('api/admin/products/:id', …)` dan keyin:

```ts
  route('api/admin/products/:id/upload-link', 'routes/api.admin.products.$id.upload-link.tsx'),
```

`server/index.ts` `NO_CACHE` ro'yxatiga `'/yuklash'` qo'shing. `app/routes/robots[.]txt.tsx` ga `'Disallow: /oauth',` dan keyin `'Disallow: /yuklash',`.

- [ ] **Step 8: MCP tool**

`shared/mcp-register.ts` da `product_set_visibility` dan keyin:

```ts
  server.registerTool('image_upload_link', {
    description: "Telefondan rasm yuklash uchun bir martalik havola: 30 daqiqa, faqat shu tovar uchun. Chatga tashlangan rasmni saytga uzatib bo'lmaydi — egasi rasm yubormoqchi bo'lsa yoki tovarda rasm yo'q bo'lsa shu havolani bering. Bosadi, galereyadan tanlaydi, rasmlar tovarga o'zi qo'shiladi; Billz tovari rasm qo'shilishi bilan saytda chiqadi.",
    inputSchema: { id: z.string() },
  }, async (args: unknown) => {
    const { id } = args as { id: string };
    const r = await api.write<{ url: string; expiresAt: number }>(`/api/admin/products/${id}/upload-link`, 'POST', {}, 'image_upload_link');
    return text(`Rasm yuklash havolasi (30 daqiqa ishlaydi):\n${r.url}\n\nBosing → «Rasm tanlash» → galereyadan rasmlarni tanlang. Rasmlar tovarga o'zi qo'shiladi.`);
  });
```

- [ ] **Step 9: Global qabul mezoni** (Global Constraints).

- [ ] **Step 10: Dev serverda tekshirish**

`PORT=<bo'sh> PUBLIC_URL=http://localhost:<port> bun run dev`, sinov tokeni bilan:

1. `/mcp` `tools/call image_upload_link {id}` → havola.
2. `curl` bilan `GET` havola → 200, sahifada tovar nomi.
3. `curl -F files=@<kichik.png>` `POST` → JSON `{ok:true, added:1}`; bazada `image_url` yoki galereya yangilangan.
4. Billz qilingan rasmsiz sinov tovarida 3-qadam → `manual_fields` ichida `images`, `is_active=1`.
5. Yaroqsiz token → sahifada «Havola eskirgan…», `POST` → 403.
6. `.gif` → 400 «Faqat JPG, PNG yoki WebP».
7. **Yuklash tokenini admin cookie sifatida:** `curl -H "Cookie: session=<token>" /api/admin/products` → **401**.

Sinov fayllarini (`data/images/products/…` dagi sinov rasmlari), qatorlarni va tokenni tozalang.

- [ ] **Step 11: Commit**

```bash
git add functions/lib/upload-link.ts functions/lib/upload-link.test.ts "app/routes/api.admin.products.\$id.upload-link.tsx" "app/routes/yuklash.\$token.tsx" app/routes.ts server/index.ts "app/routes/robots[.]txt.tsx" shared/mcp-register.ts
git commit -F - <<'EOF'
feat(mcp): telefondan rasm yuklash havolasi

claude.ai chatga tashlangan rasm faylini tool'ga uzata olmaydi. `image_upload_link`
bir martalik havola beradi: 30 daqiqa, faqat shu tovar uchun, parolsiz, faqat rasm
qo'shadi. Token admin sessiyasi sirining **boshqa kaliti** bilan imzolanadi — aks
holda `requireAdmin` uni to'liq admin sessiyasi sifatida qabul qilardi. Billz
tovarida rasmlar qulflanadi va tovar darhol saytda chiqadi.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 8: Hujjatlar

**Files:**
- Modify: `CLAUDE.md`, `mcp/README.md`, `docs/egasi-qollanmasi.md`, `docs/superpowers/specs/2026-09-21-admin-mcp-design.md`

- [ ] **Step 1: `CLAUDE.md`** — faqat tegishli joylar, qolganiga tegmang:
  - **Billz → «Ustun egaligi»**: qo'l maydonlari endi 8 ta (`price · specs · description · category · name · brand · images · hidden`); qulf **tegilgan maydonga avtomatik** qo'yiladi (`applyManualEdits`, admin va MCP bitta funksiyadan); «Qo'lda tahrirlash» toggle'lari o'rniga manba belgisi va «Billz'ga qaytarish».
  - **Billz → «Ko'rinish»**: `is_active = rasm bor && hidden qulflanmagan` — **qoldiq e'tiborga olinmaydi** (2026-09-24, egasi: omborda bo'lmasa ham tez olib keladi); `billzVisible` sinxronizatsiyada ham, `PUT`/`PATCH` da ham — rasm qo'shilgan tovar darhol chiqadi.
  - **Billz → moslashtirish**: tovar `products.billz_name` bo'yicha topiladi (migratsiya `0043`), saytdagi `name` qulflanadi; sabab — o'g'irlash misoli.
  - **Admin panel → 2b** paragrafidagi «Billz tovarida sinxron maydonlar faqat o'qiladi… «Qo'lda tahrirlash» almashtirgichi» jumlasini yangi xulq bilan almashtiring.
  - **Admin MCP**: tool'lar 13 ta (stdio) / 12 ta (remote) — `image_upload_link` qo'shildi; `product_create` **darhol faol**; `product_update` chegirma va `removeSpecs`; `specs` nom bo'yicha qo'shadi; yuklash havolasi — `functions/lib/upload-link.ts` (alohida kalit, sababi bilan) va `/yuklash/:token`.
  - **Data model** migratsiyalar ro'yxatiga `0043` **billz_name**.
- [ ] **Step 2: `mcp/README.md`** — «Cheklovlar»: yangi tovar darhol faol; chegirma; xususiyatlar qo'shiladi/o'chiriladi; telefondan rasm — «rasm yuklash havolasini ber» deng; Billz tovarida o'zgartirilgan maydon qoladi (eski «30 daqiqada qaytib ochilishi mumkin» bandini olib tashlang).
- [ ] **Step 3: `docs/egasi-qollanmasi.md`** — sodda tilda: Billz tovarida o'zgartirgan narsangiz qoladi, «Qo'lda» belgisi va «Billz'ga qaytarish» nima qiladi; qoldig'i 0 tovar ham saytda turadi; chatda rasm kerak bo'lsa «rasm yuklash havolasini ber» deysiz.
- [ ] **Step 4: `docs/superpowers/specs/2026-09-21-admin-mcp-design.md` §13** — 2-qaror («`product_create` doim yashirin») ostiga: «2026-09-24 egasi bekor qildi — yangi tovar darhol faol (`2026-09-24-billz-qulf-va-mcp-kengaytma-design.md`)».
- [ ] **Step 5: Global qabul mezoni** — `bun run test` va tsc (hujjat ularga ta'sir qilmasligi kerak).
- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md mcp/README.md docs/egasi-qollanmasi.md docs/superpowers/specs/2026-09-21-admin-mcp-design.md
git commit -F - <<'EOF'
docs: Billz qulflari, qoldiqsiz ko'rinish va MCP kengaytmasi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

## Self-Review

**Spec coverage:**

| Spec bandi | Task |
|---|---|
| §3 8 ta qulf, migratsiyasiz | 1 |
| §3 `applyManualEdits` (mijoz tomoni), `hidden` qo'yish/yechish, poyga misoli testda | 1 |
| §3 uch ishlatuvchi: admin, MCP, `PATCH` | 5, 6, 3 |
| §4 `billzVisible`, qoldiq chiqadi, sinxronizatsiya va saqlashda bir xil | 1, 2, 3, 7 |
| §5 `billz_name` (`0043`), o'g'irlash/dublikat, qulflangan ustunlar yozilmaydi, rasm qulfi | 1, 2 |
| §6 admin: to'liq tahrir, manba belgisi, «Billz'ga qaytarish», jonli oldindan ko'rish, Billz'da oddiy nom maydoni | 4, 5 |
| §6 izohlar, «Rasm kerak», «nega ko'rinmaydi» sabablari | 4, 5 |
| §7 MCP qulflar, chegirma (+variant, foiz formulasi), darhol faol, `specs` upsert + `removeSpecs`, tavsif qoidasi | 6 |
| §8 yuklash havolasi: token (alohida kalit), API, sahifa, cheklovlar, `NO_CACHE`/robots, eskirgan sahifa, tool | 7 |
| §9 deploy ta'siri | 8 (hujjatda) |
| §10 testlar | 1, 2, 4, 6, 7 |

Spec'dan tashqari, reja yozishda qo'shilgan ikki himoya: yuklash tokeni admin sessiyasiga aylanmasligi (Task 7 test + qo'lda tekshiruv) va «Billz'ga qaytarish» tugmasi `<label>` ichida bo'lmasligi (Task 5 `Tagged`). Yuklash havolasi orqali yozuv `admin_audit` ga tushadi (Task 7) — spec'da yo'q edi, jurnalning to'liqligi uchun.

**Placeholder scan:** «TBD/TODO» yo'q. Task 3 Step 5 va Task 6/7 dagi qo'lda tekshiruv qadamlari aniq holatlar ro'yxati bilan berilgan; sinov tokenini yaratish buyrug'i Task 3 hisobotiga yoziladi (naqsh — 2026-09-21 rejasining Task 3 Step 7).

**Type consistency:** `LockSnapshot` (Task 1) — `lockSnapshot()` (Task 4) va `ProductInputBody` (Task 6) unga strukturaviy mos. `ManualField` 8 kaliti Task 4 `GROUP_FIELDS` da to'liq (`Record<ManualField, …>` — kalit yetmasa tsc yiqiladi). `billzUpdateColumns(m, locks)` va `upsertStatements(m, ex)` imzolari Task 2 da. `VariantPriceUpdate` Task 6 da e'lon qilinib, o'sha task'dagi `product_update` da ishlatiladi. `priceText`/`discountPct`/`upsertSpecs` Task 6 da e'lon qilinib, `product_create`/`product_update` da ishlatiladi. `UPLOAD_TTL`/`createUploadToken`/`verifyUploadToken` Task 7 ichida.
