# PC konfigurator: admin boshqaradigan moslik guruhlari — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Konfigurator mosligi tovar nomidan taxmin qilinmasin — admin har qismga moslik qiymatini (AM5, DDR5…) beradi, ikki qism faol turda umumiy qiymatga ega bo'lsa mos; turlar va qiymatlar admin panelidan boshqariladi.

**Architecture:** Uchta yangi SQLite jadvali (`pc_dimensions`, `pc_dimension_values`, `pc_part_values`). Sof qoida va guruhlash `shared/pc-compat.ts`da (nom parserlari faqat admin "taklifi" va quvvat uchun qoladi). O'qish `functions/lib/pc-db.ts`da — sayt loaderi, admin API va bosh sahifa sanog'i bitta funksiyalardan foydalanadi. Admin: Mahsulotlar → «Konfigurator» tabi (turlar kartasi + qismlar jadvali + ommaviy tasdiqlash), mahsulot tahririda o'sha chiplar.

**Tech Stack:** React Router v7 SSR, Express, SQLite (`env.DB.prepare/batch`), vitest, i18next (admin), Tailwind v4 tokenlari.

**Spec:** `docs/superpowers/specs/2026-10-13-pc-moslik-guruhlari-design.md`

## Global Constraints

- Paket menejeri — **bun** (`bun run lint`, `bun run test`, `bunx vitest run <fayl>`); npm emas.
- Strict TypeScript, **`any` yo'q**. `@types/react` yo'q: `useState<T>` generigi tushib qoladi — qiymat cast bilan olinadi (`const [raw, set] = useState(null as X | null); const x = raw as X | null;`). `key` oladigan komponentlar `FC<{...}>` uslubida.
- **Qo'llangan migratsiya tahrirlanmaydi** — faqat yangi `migrations/0044_pc_dimensions.sql`.
- Billz sinxronizatsiyasi (`server/billz-sync.ts`) yangi jadvallarga **tegmaydi** — u yerga o'zgarish kiritilmaydi.
- Sayt matni `src/locales.ts`da **uz va ru ikkalasida** (tip paritet tekshiradi). Admin matni `src/admin/i18n/uz/*.ts` va `ru/*.ts` ikkalasida (`Dict<typeof uz>`); sonli matnda uzda ham `_one/_few/_many/_other` (bir xil matn).
- Komponentlarda hex rang va `shadow-*` yo'q — faqat tokenlar (`text-muted-2`, `border-line`, `bg-fill-2`…). Admin'da matnli ko'k — `text-link`. Tugma va chip tegish maydoni ≥ 44px (`h-11`).
- `Field` (`src/admin/ui/form.tsx`) `<label>` chizadi — ichiga **tugma qo'yilmaydi** (label bosilganda birinchi tugma "bosiladi"); chip guruhlari uchun oddiy `<div>` + sarlavha `span`.
- Git: `git add` faqat aniq yo'llar bilan (`-A` yo'q — ish papkasida egasining kuzatilmagan fayllari bor); commit formati `feat:`/`fix:`/`docs:`/`chore:`, oxirida `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Har task oxirida `bun run lint` va `bun run test` yashil — **istisno: Task 2** (sof modul almashadi; uning iste'molchilari Task 3da tuzatiladi, Task 2 faqat vitest bilan tekshiriladi).

## Review Focus

- **Billz dublikati:** eski (`is_active = 0`) va yangi qator bir xil nomda — admin vakilni belgilasa, keyinroq ikkinchisi vakil bo'lib qolganda qism saytdan yo'qolmasligi kerak (guruh qiymatlari birlashmasi — Task 2 testi; yozish guruhning hamma id'lariga — Task 6).
- **Ishlatilgan qiymatni o'chirish:** tur tahririda qiymat olib tashlansa, u belgilangan qismlar o'sha turdan "belgilanmagan"ga o'tadi va saytdan yo'qoladi — admin oldindan tasdiq oynasini ko'rishi kerak (Task 8), API `pc_part_values`ni ham tozalaydi (Task 6).
- **Yangi turni yoqish:** hali belgilanmagan qismlar yoqilgan zahoti konfiguratordan yo'qoladi — yoqishdan oldin "N ta qism belgilanmagan" tasdig'i (Task 8).
- **Yashirilgan (`pc_hidden`) mahsulot tahriri:** chiplar ishlashi kerak — `GET/PUT pc-parts` yashirinlarni ham topadi (`includeHidden`, Task 6).
- **Konfigurator yarim tayyor:** CPU/plata/RAMdan biri bo'sh bo'lsa bo'lim ham, unga olib boradigan `PcBuildPromo` kartasi ham chiqmaydi — o'lik `#konfigurator` havolasi qolmaydi (`configuratorReady` testi — Task 2, ishlatilishi — Task 3).

---

## File Structure

| Fayl | Mas'uliyat |
|---|---|
| `migrations/0044_pc_dimensions.sql` (yangi) | 3 jadval, Soket/Xotira seed, eski tuzatishlarni ko'chirish |
| `shared/pc-compat.ts` (qayta yoziladi) | tiplar, nom parserlari → taklif/quvvat, `isTagged`, `issueFor`, `candidateState`, `summaryIssues`, guruhlash, `toConfigParts`, sanoqlar |
| `shared/pc-compat.test.ts` (qayta yoziladi) | yuqoridagilar testi |
| `functions/lib/pc-db.ts` (yangi) | `readDimensions`, `readConfigRows`, `readPartValues`, `readDimensionList` |
| `app/lib/loaders.ts`, `app/routes/category.tsx`, `src/store/PcConfigurator.tsx`, `src/locales.ts` | sayt — yangi model |
| `shared/types.ts`, `functions/lib/db.ts`, `functions/lib/validate.ts`, `app/routes/api.admin.products*.tsx`, `src/admin/lib/product-form*.ts`, `shared/mcp-tools.ts` | `pcSocket`/`pcMemory` olib tashlanadi |
| `functions/lib/validate.ts` (+test), `shared/err-text.ts`, `src/admin/i18n/ru/errors.ts` | `parsePcDimensionInput`, `parsePcPartsInput`, xato matnlari |
| `app/routes/api.admin.pc-dimensions.tsx`, `api.admin.pc-dimensions.$id.tsx`, `api.admin.pc-parts.tsx` (yangi), `app/routes.ts`, `app/routes/api.admin.dashboard.tsx` | admin API |
| `src/admin/api.ts`, `src/admin/lib/pc-parts.ts` (+test, yangi) | klient va sof yordamchilar |
| `src/admin/PcValueChips.tsx`, `src/admin/PcDimensionModal.tsx`, `src/admin/screens/ConfiguratorScreen.tsx`, `src/admin/PcPartValues.tsx` (yangi), `src/admin/nav.ts`, `src/admin/AdminApp.tsx`, `src/admin/screens/ProductEdit.tsx`, `src/admin/screens/Dashboard.tsx`, admin i18n | admin UI |
| `CLAUDE.md`, `docs/egasi-qollanmasi.md` | hujjat |

---

### Task 1: Migratsiya `0044_pc_dimensions.sql`

**Files:**
- Create: `migrations/0044_pc_dimensions.sql`

**Interfaces:**
- Produces: jadvallar `pc_dimensions(id, key, name, name_ru, slots, is_active, sort_order)`, `pc_dimension_values(id, dimension_id, label, sort_order)`, `pc_part_values(product_id, value_id)`; seed — `key='socket'` (slots `["cpu","mb"]`, AM4/AM5/LGA1200/LGA1700/LGA1851), `key='memory'` (slots `["cpu","mb","ram"]`, DDR4/DDR5), ikkalasi `is_active = 1`.

- [ ] **Step 1: Migratsiya faylini yozing**

```sql
-- PC konfigurator — admin boshqaradigan moslik guruhlari
-- (spec: docs/superpowers/specs/2026-10-13-pc-moslik-guruhlari-design.md).
-- Moslik endi nomdan taxmin emas: admin har qismga qiymat (AM5, DDR5…) beradi; ikki qism faol turda
-- kamida bitta umumiy qiymatga ega bo'lsa — mos. products.pc_socket/pc_memory bazada qoladi,
-- kod ularni endi o'qimaydi ham, yozmaydi ham. Billz sinxronizatsiyasi bu jadvallarga tegmaydi.
CREATE TABLE pc_dimensions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  key        TEXT UNIQUE,
  name       TEXT NOT NULL,
  name_ru    TEXT NOT NULL DEFAULT '',
  slots      TEXT NOT NULL DEFAULT '[]',
  is_active  INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE pc_dimension_values (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  dimension_id INTEGER NOT NULL,
  label        TEXT NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  UNIQUE (dimension_id, label)
);

CREATE TABLE pc_part_values (
  product_id TEXT NOT NULL,
  value_id   INTEGER NOT NULL,
  PRIMARY KEY (product_id, value_id)
);
CREATE INDEX idx_pc_part_values_value ON pc_part_values (value_id);

INSERT INTO pc_dimensions (key, name, name_ru, slots, is_active, sort_order) VALUES
  ('socket', 'Soket', 'Сокет', '["cpu","mb"]', 1, 10),
  ('memory', 'Xotira turi', 'Тип памяти', '["cpu","mb","ram"]', 1, 20);

INSERT INTO pc_dimension_values (dimension_id, label, sort_order)
  SELECT d.id, v.label, v.ord FROM pc_dimensions d,
    (SELECT 'AM4' AS label, 10 AS ord UNION ALL SELECT 'AM5', 20 UNION ALL SELECT 'LGA1200', 30
     UNION ALL SELECT 'LGA1700', 40 UNION ALL SELECT 'LGA1851', 50) v
  WHERE d.key = 'socket';

INSERT INTO pc_dimension_values (dimension_id, label, sort_order)
  SELECT d.id, v.label, v.ord FROM pc_dimensions d,
    (SELECT 'DDR4' AS label, 10 AS ord UNION ALL SELECT 'DDR5', 20) v
  WHERE d.key = 'memory';

-- Eski admin tuzatishlari (prod'da 0 ta, lokal bazalarda bo'lishi mumkin) tasdiqlangan qiymatga aylanadi.
INSERT OR IGNORE INTO pc_part_values (product_id, value_id)
  SELECT p.id, v.id FROM products p
  JOIN pc_dimension_values v ON v.label = p.pc_socket
  JOIN pc_dimensions d ON d.id = v.dimension_id AND d.key = 'socket'
  WHERE p.pc_socket IS NOT NULL;

INSERT OR IGNORE INTO pc_part_values (product_id, value_id)
  SELECT p.id, v.id FROM products p
  JOIN pc_dimension_values v ON v.label = p.pc_memory
  JOIN pc_dimensions d ON d.id = v.dimension_id AND d.key = 'memory'
  WHERE p.pc_memory IS NOT NULL;
```

- [ ] **Step 2: Bo'sh bazada sinab ko'ring**

Run:
```bash
T=$(mktemp -d) && DATA_DIR=$T node server/migrate.ts | tail -2 && sqlite3 $T/store.db "SELECT d.key, d.slots, d.is_active, group_concat(v.label) FROM pc_dimensions d JOIN pc_dimension_values v ON v.dimension_id = d.id GROUP BY d.id ORDER BY d.sort_order; SELECT COUNT(*) FROM pc_part_values;"
```
Expected:
```
socket|["cpu","mb"]|1|AM4,AM5,LGA1200,LGA1700,LGA1851
memory|["cpu","mb","ram"]|1|DDR4,DDR5
0
```

- [ ] **Step 3: Lokal bazaga qo'llang**

Run: `bun run migrate`
Expected: `0044_pc_dimensions.sql` qo'llangani haqida qator, xato yo'q.

- [ ] **Step 4: Commit**

```bash
git add migrations/0044_pc_dimensions.sql
git commit -m "feat: konfigurator moslik guruhlari jadvallari (migratsiya 0044)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Sof model — `shared/pc-compat.ts`

**Files:**
- Modify (butunlay almashtiriladi): `shared/pc-compat.ts`
- Test (butunlay almashtiriladi): `shared/pc-compat.test.ts`

**Interfaces:**
- Consumes: —
- Produces (keyingi tasklar shu nomlarni ishlatadi):
  - `type SlotKey = 'cpu' | 'mb' | 'ram' | 'gpu' | 'psu' | 'ssd' | 'case'`; `PC_SLOTS`, `REQUIRED_SLOTS`, `slotForType(type)` — o'zgarmagan.
  - `interface PcDimensionValue { id: number; label: string }`
  - `interface PcDimension { id: number; key: string | null; name: string; nameRu: string; slots: SlotKey[]; active: boolean; values: PcDimensionValue[] }`
  - `type PartValues = Record<number, number[]>` (dimensionId → valueId[])
  - `interface PartAttrs { values: PartValues; watts: number | null }`
  - `interface Issue { slot: SlotKey; level: 'block' | 'warn'; code: 'dimension' | 'power' | 'graphics'; need: string; dimensionId?: number }`
  - `type Picked = Partial<Record<SlotKey, PartAttrs>>`
  - `partWatts(slot, name, override: number | null): number | null`
  - `suggestValues(slot, name, dims: PcDimension[]): PartValues`
  - `isTagged(slot, values: PartValues, dims): boolean`
  - `issueFor(slot, cand: PartAttrs, picked: Picked, dims): Issue | null`
  - `summaryIssues(picked, dims): Issue[]`, `candidateState(slot, cand, picked, dims): CandidateState`
  - `needsVerify(slot, attrs): boolean`, `hasMatch(cpu: PartAttrs, boards: PartAttrs[], dims): boolean`
  - `recommendedWatts(picked)`, `cpuHasGraphics(name)`, `graphicsIssue(cpuName, hasGpu)` — o'zgarmagan.
  - `interface ConfigPartRow { id; name; image_url; type; price; billz_id; billz_stock; is_active; pc_watts }` (pc_socket/pc_memory **yo'q**)
  - `interface ConfigPart { id; name; image; priceUzs; inStock; attrs: PartAttrs }`
  - `interface PartGroup { slot: SlotKey; rep: ConfigPartRow; inStock: boolean; ids: string[] }`
  - `partGroups(rows): PartGroup[]`, `groupValues(ids, byProduct: Map<string, number[]>, dims): PartValues`
  - `toConfigParts(rows, byProduct, dims): Partial<Record<SlotKey, ConfigPart[]>>`
  - `configuratorReady(parts): boolean`
  - `countUntagged(rows, byProduct, dims): number`, `missingCount(dim, groups, byProduct, dims): number`
- O'chiriladi: `partAttrs`, `PartOverride`, `PC_SOCKETS` eksporti, `PcSocket`/`PcMemory` eksporti (ichki tip bo'lib qoladi).

> Bu taskdan keyin `bun run lint` **uchta faylda** qizaradi — `app/lib/loaders.ts`, `src/store/PcConfigurator.tsx`, `src/admin/screens/ProductEdit.tsx`. Bu kutilgan; Task 3 tuzatadi. Bu task faqat vitest bilan tekshiriladi.

- [ ] **Step 1: Testni yozing** — `shared/pc-compat.test.ts`ni to'liq shu bilan almashtiring:

```ts
import { describe, expect, it } from 'vitest';
import {
  candidateState, configuratorReady, countUntagged, cpuHasGraphics, graphicsIssue, groupValues, hasMatch, isTagged,
  issueFor, missingCount, needsVerify, partGroups, partWatts, recommendedWatts, slotForType, suggestValues, summaryIssues,
  toConfigParts, type ConfigPartRow, type PartAttrs, type PartValues, type PcDimension,
} from './pc-compat';

const SOCKET: PcDimension = {
  id: 1, key: 'socket', name: 'Soket', nameRu: 'Сокет', slots: ['cpu', 'mb'], active: true,
  values: [{ id: 11, label: 'AM4' }, { id: 12, label: 'AM5' }, { id: 13, label: 'LGA1200' }, { id: 14, label: 'LGA1700' }, { id: 15, label: 'LGA1851' }],
};
const MEMORY: PcDimension = {
  id: 2, key: 'memory', name: 'Xotira turi', nameRu: 'Тип памяти', slots: ['cpu', 'mb', 'ram'], active: true,
  values: [{ id: 21, label: 'DDR4' }, { id: 22, label: 'DDR5' }],
};
const DIMS = [SOCKET, MEMORY];
const at = (values: PartValues, watts: number | null = null): PartAttrs => ({ values, watts });

const cpu1700 = at({ 1: [14], 2: [21, 22] }, 180);
const cpu1851 = at({ 1: [15], 2: [22] }, 200);
const b760ddr4 = at({ 1: [14], 2: [21] });
const z890 = at({ 1: [15], 2: [22] });
const ddr5 = at({ 2: [22] });
const ddr4 = at({ 2: [21] });
const rtx4090 = at({}, 450);
const psu650 = at({}, 650);
const psu1250 = at({}, 1250);

describe('suggestValues — nomdan taklif', () => {
  const s = (slot: Parameters<typeof suggestValues>[0], name: string) => suggestValues(slot, name, DIMS);
  it('CPU: Intel 12–14 avlod → LGA1700 + DDR4/DDR5', () => {
    expect(s('cpu', 'Intel Core i5 12400F')).toEqual({ 1: [14], 2: [21, 22] });
    expect(s('cpu', 'CPU Intel Core i5  13400F')[1]).toEqual([14]);
  });
  it('CPU: Core Ultra 2xx (Core so\'zisiz ham) → LGA1851 + DDR5', () => {
    expect(s('cpu', 'Intel Core Ultra 7 265F')).toEqual({ 1: [15], 2: [22] });
    expect(s('cpu', 'Intel Ultra 9 285K')).toEqual({ 1: [15], 2: [22] });
  });
  it('CPU: Ryzen 9000 → AM5 + DDR5, 5000 → AM4 + DDR4, kod nomi va ™ bilan ham', () => {
    expect(s('cpu', 'AMD Ryzen 7 9800x3D')).toEqual({ 1: [12], 2: [22] });
    expect(s('cpu', 'AMD Ryzen 5 5600X')).toEqual({ 1: [11], 2: [21] });
    expect(s('cpu', 'AMD Ryzen™ 5 Granite Ridge 9600X')).toEqual({ 1: [12], 2: [22] });
  });
  it('plata: chipset → soket; DDR nomdan yoki soketdan', () => {
    expect(s('mb', 'Gigabyte B760H D3P Plus DDR5')).toEqual({ 1: [14], 2: [22] });
    expect(s('mb', 'MaxSun Challenger B760M-F DDR4')).toEqual({ 1: [14], 2: [21] });
    expect(s('mb', 'Asus Prime B760M-A D4')).toEqual({ 1: [14], 2: [21] });
    expect(s('mb', 'Asus ROG Strix B760-G Gaming WiFi')).toEqual({ 1: [14], 2: [22] });
    expect(s('mb', 'ASUS Z890 AYW Gaming WiFi')).toEqual({ 1: [15], 2: [22] });
    expect(s('mb', 'MSI B650 Tomahawk')).toEqual({ 1: [12], 2: [22] });
    expect(s('mb', 'Asus TUF B550-Plus')).toEqual({ 1: [11], 2: [21] });
  });
  it("H610: DDR belgisiz — xotira taklif qilinmaydi", () => {
    expect(s('mb', 'Asus Prime H610 M-F / Black')).toEqual({ 1: [14] });
    expect(s('mb', 'Gigabyte H610M D4')).toEqual({ 1: [14], 2: [21] });
  });
  it('RAM: DDR nomdan yoki chastotadan', () => {
    expect(s('ram', 'DDR5 Corsair Vengeance 16GB 6000Mhz')).toEqual({ 2: [22] });
    expect(s('ram', 'Apacer 8GB 3200Mhz / Black')).toEqual({ 2: [21] });
    expect(s('ram', 'T-Force 32GB(16*2) 6000Mhz / Black')).toEqual({ 2: [22] });
    expect(s('ram', 'Kingston 16GB')).toEqual({});
  });
  it("tanilmagan nom, bo'g'in turga kirmaydi, turda bunday qiymat yo'q, admin yaratgan tur — taklif yo'q", () => {
    expect(s('cpu', "Noma'lum protsessor")).toEqual({});
    expect(s('gpu', 'NVIDIA GeForce RTX 4090')).toEqual({});
    const noLga1851: PcDimension = { ...SOCKET, values: SOCKET.values.filter((v) => v.label !== 'LGA1851') };
    expect(suggestValues('cpu', 'Intel Core Ultra 7 265F', [noLga1851])).toEqual({});
    const custom: PcDimension = { ...SOCKET, id: 9, key: null };
    expect(suggestValues('cpu', 'AMD Ryzen 7 9800x3D', [custom])).toEqual({});
  });
});

describe('partWatts', () => {
  it('CPU/GPU/blok — nomdan; boshqa bo\'g\'in — null', () => {
    expect(partWatts('cpu', 'Intel Core i5 13600KF', null)).toBe(180);
    expect(partWatts('cpu', 'Intel Core i9-14900KF', null)).toBe(250);
    expect(partWatts('gpu', 'Gigabyte RTX5060 8GB', null)).toBe(145);
    expect(partWatts('gpu', 'MSI Ventus 5060Ti 8GB / Black', null)).toBe(180);
    expect(partWatts('gpu', 'Galax 2060Super 8GB / Black', null)).toBe(175);
    expect(partWatts('gpu', 'Hellhound AMD Radeon™ RX 9060 XT 8GB GDDR6', null)).toBe(160);
    expect(partWatts('gpu', 'GPU Intel Arc Pro B70 Graphics Black', null)).toBeNull();
    expect(partWatts('psu', 'SAMA  B850W Bronze', null)).toBe(850);
    expect(partWatts('psu', 'PSU SAMA G850 80Plus Gold Black / Black', null)).toBe(850);
    expect(partWatts('psu', 'PSU BEQUITE Dark Power Pro 12 1500W Titanium Black / Black', null)).toBe(1500);
    expect(partWatts('ram', 'DDR5 Corsair 16GB', null)).toBeNull();
  });
  it('admin tuzatishi (> 0) nomdan ustun', () => {
    expect(partWatts('psu', 'SAMA K650W', 750)).toBe(750);
    expect(partWatts('cpu', "Noma'lum", 95)).toBe(95);
    expect(partWatts('psu', 'SAMA K650W', 0)).toBe(650);
  });
});

describe('slotForType', () => {
  it("tur → bo'g'in", () => {
    expect(slotForType('motherboard')).toBe('mb');
    expect(slotForType('korpus')).toBe('case');
    expect(slotForType('noutbuk')).toBeNull();
    expect(slotForType(null)).toBeNull();
  });
});

describe('isTagged', () => {
  it("bo'g'ini kirgan har faol turda qiymat bo'lishi shart", () => {
    expect(isTagged('cpu', cpu1700.values, DIMS)).toBe(true);
    expect(isTagged('cpu', { 1: [14] }, DIMS)).toBe(false);
    expect(isTagged('ram', {}, DIMS)).toBe(false);
  });
  it("nofaol tur talab qilinmaydi; hech qaysi turga kirmagan bo'g'in — doim ko'rinadi", () => {
    expect(isTagged('cpu', { 1: [14] }, [SOCKET, { ...MEMORY, active: false }])).toBe(true);
    expect(isTagged('gpu', {}, DIMS)).toBe(true);
  });
});

describe('issueFor — moslik', () => {
  it('soket kesishmasi bo\'sh → block, ikki tomonga', () => {
    expect(issueFor('mb', b760ddr4, { cpu: cpu1851 }, DIMS)).toEqual({ slot: 'mb', level: 'block', code: 'dimension', dimensionId: 1, need: 'LGA1851' });
    expect(issueFor('cpu', cpu1700, { mb: z890 }, DIMS)).toEqual({ slot: 'cpu', level: 'block', code: 'dimension', dimensionId: 1, need: 'LGA1851' });
    expect(issueFor('mb', z890, { cpu: cpu1851 }, DIMS)).toBeNull();
  });
  it('xotira: plata ham, CPU ham juftlikda tekshiriladi', () => {
    expect(issueFor('ram', ddr5, { mb: b760ddr4 }, DIMS)).toEqual({ slot: 'ram', level: 'block', code: 'dimension', dimensionId: 2, need: 'DDR4' });
    expect(issueFor('mb', b760ddr4, { ram: ddr5 }, DIMS)).toEqual({ slot: 'mb', level: 'block', code: 'dimension', dimensionId: 2, need: 'DDR5' });
    expect(issueFor('ram', ddr5, { cpu: cpu1700 }, DIMS)).toBeNull();
    expect(issueFor('ram', ddr4, { cpu: cpu1851 }, DIMS)?.need).toBe('DDR5');
    // LGA1700 CPU ikkalasini qo'llaydi, D4 plata — DDR4: DDR5 RAM plata bilan to'qnashadi.
    expect(issueFor('ram', ddr5, { cpu: cpu1700, mb: b760ddr4 }, DIMS)?.need).toBe('DDR4');
  });
  it('bir nechta qiymat " / " bilan; nofaol tur va qiymatsiz nomzod — muammo yo\'q', () => {
    expect(issueFor('mb', at({ 1: [12], 2: [21] }), { cpu: at({ 1: [14, 15] }) }, DIMS)?.need).toBe('LGA1700 / LGA1851');
    expect(issueFor('mb', b760ddr4, { cpu: at({ 2: [21, 22] }) }, DIMS)).toBeNull();
    expect(issueFor('ram', at({ 2: [21] }), { mb: at({ 2: [21, 22] }) }, DIMS)).toBeNull();
    expect(issueFor('ram', ddr4, { cpu: at({ 1: [12], 2: [22] }), mb: at({ 1: [12], 2: [22] }) }, DIMS)?.need).toBe('DDR5');
    expect(issueFor('mb', b760ddr4, { cpu: cpu1851 }, [{ ...SOCKET, active: false }])).toBeNull();
    expect(issueFor('mb', at({}), { cpu: cpu1851 }, DIMS)).toBeNull();
  });
  it('blok quvvati → warn', () => {
    expect(recommendedWatts({ cpu: cpu1700, gpu: rtx4090 })).toBe(900);
    expect(issueFor('psu', psu650, { cpu: cpu1700, gpu: rtx4090 }, DIMS)).toEqual({ slot: 'psu', level: 'warn', code: 'power', need: '900' });
    expect(issueFor('psu', psu1250, { cpu: cpu1700, gpu: rtx4090 }, DIMS)).toBeNull();
    expect(issueFor('gpu', rtx4090, { cpu: cpu1700, psu: psu650 }, DIMS)?.level).toBe('warn');
    expect(recommendedWatts({})).toBeNull();
  });
});

describe('summaryIssues / needsVerify / hasMatch', () => {
  it("yig'madagi har juft bir marta", () => {
    const list = summaryIssues({ cpu: cpu1851, mb: b760ddr4, ram: ddr5, gpu: rtx4090, psu: psu650 }, DIMS);
    expect(list.map((i) => `${i.slot}:${i.code}:${i.dimensionId ?? ''}`)).toEqual(['mb:dimension:1', 'ram:dimension:2', 'psu:power:']);
    expect(summaryIssues({ cpu: cpu1851, mb: z890, ram: ddr5 }, DIMS)).toEqual([]);
  });
  it('faqat blok quvvati noma\'lum bo\'lsa operator tasdiqlaydi', () => {
    expect(needsVerify('psu', at({}, null))).toBe(true);
    expect(needsVerify('psu', psu650)).toBe(false);
    expect(needsVerify('ram', at({}))).toBe(false);
  });
  it('CPU uchun ro\'yxatda mos plata bormi', () => {
    expect(hasMatch(cpu1851, [b760ddr4], DIMS)).toBe(false);
    expect(hasMatch(cpu1851, [b760ddr4, z890], DIMS)).toBe(true);
    expect(hasMatch(at({}), [b760ddr4], DIMS)).toBe(true);
  });
});

describe('candidateState', () => {
  it("oldingi tanlov bilan mos kelmasa ham CPU bloklanmaydi, keyingi platani olib tashlashga taklif qiladi", () => {
    expect(candidateState('cpu', cpu1851, { mb: b760ddr4 }, DIMS)).toEqual({ block: null, drops: ['mb'], warn: null });
  });
  it('oldinroq CPU tanlangan — mos kelmaydigan plata bloklanadi', () => {
    expect(candidateState('mb', b760ddr4, { cpu: cpu1851 }, DIMS)).toEqual({
      block: { slot: 'mb', level: 'block', code: 'dimension', dimensionId: 1, need: 'LGA1851' }, drops: [], warn: null,
    });
  });
  it('kaskad: plata olib tashlangach RAM CPU bilan solishtiriladi', () => {
    expect(candidateState('cpu', cpu1851, { mb: b760ddr4, ram: ddr5 }, DIMS)).toEqual({ block: null, drops: ['mb'], warn: null });
    expect(candidateState('cpu', cpu1851, { mb: b760ddr4, ram: ddr4 }, DIMS)).toEqual({ block: null, drops: ['mb', 'ram'], warn: null });
  });
  it('quvvat — block emas, warn', () => {
    expect(candidateState('psu', psu650, { cpu: cpu1700, gpu: rtx4090 }, DIMS)).toEqual({
      block: null, drops: [], warn: { slot: 'psu', level: 'warn', code: 'power', need: '900' },
    });
  });
});

describe('guruhlar va toConfigParts', () => {
  const row = (o: Partial<ConfigPartRow>): ConfigPartRow => ({
    id: 'x', name: 'Intel Core i5 12400F', image_url: '', type: 'cpu', price: 1000, billz_id: 'b', billz_stock: 1,
    is_active: 1, pc_watts: null, ...o,
  });
  const vals = (o: Record<string, number[]>) => new Map(Object.entries(o));

  it('guruhlaydi, belgilanmaganini chiqarmaydi; omborda bori oldin, keyin narx', () => {
    const rows = [
      row({ id: 'a', name: 'Intel Core i7 14700F', price: 5000, billz_stock: 0, is_active: 0 }),
      row({ id: 'b', name: 'Intel Core i5 12400F', price: 3000, billz_stock: 2 }),
      row({ id: 'c', name: 'Intel Core i5 13400F', price: 1000, billz_stock: 0, is_active: 0 }),
      row({ id: 'u', name: 'Intel Core i3 12100F', price: 900 }),
      row({ id: 'm', name: 'MSI Z790 Gaming Pro WiFi', type: 'motherboard', price: 4000 }),
      row({ id: 'g', name: 'NVIDIA GeForce RTX 4090', type: 'gpu', price: 9000 }),
      row({ id: 'n', name: 'Lenovo noutbuk', type: 'noutbuk' }),
    ];
    const byProduct = vals({ a: [14, 21, 22], b: [14, 21, 22], c: [14, 21, 22], m: [14, 22] });
    const out = toConfigParts(rows, byProduct, DIMS);
    expect(out.cpu?.map((p) => [p.id, p.inStock])).toEqual([['b', true], ['c', false], ['a', false]]);
    expect(out.mb?.[0].attrs.values).toEqual({ 1: [14], 2: [22] });
    expect(out.gpu?.[0].attrs).toEqual({ values: {}, watts: 450 });
    expect(Object.keys(out).sort()).toEqual(['cpu', 'gpu', 'mb']);
  });
  it("dublikat: vakil — omborda bori; qiymatlar guruh bo'yicha birlashadi (eski qatorga belgi qo'yilgan bo'lsa ham)", () => {
    const rows = [
      row({ id: 'old', name: 'Intel Core i5 12400F ', billz_stock: 0, is_active: 0 }),
      row({ id: 'new', name: 'intel core i5 12400f', billz_stock: 3 }),
    ];
    const out = toConfigParts(rows, vals({ old: [14, 21, 22] }), DIMS);
    expect(out.cpu?.map((p) => p.id)).toEqual(['new']);
    expect(out.cpu?.[0].attrs.values).toEqual({ 1: [14], 2: [21, 22] });
  });
  it("yaqin-dublikat nomlar (prefiks, \"/ Rang\") bitta guruh; id'lar to'planadi", () => {
    const groups = partGroups([
      row({ id: 'old', name: 'CPU Intel Core i7 14700F / Silver', billz_stock: 0, is_active: 0 }),
      row({ id: 'new', name: 'Intel Core i7 14700f', billz_stock: 2 }),
      row({ id: 'mb1', name: 'Motherboard Asus Z790 Max Gaming WiFi7 Black / Black', type: 'motherboard', billz_stock: 0, is_active: 0 }),
      row({ id: 'mb2', name: 'Asus Z790 Max Gaming WiFi7 / Black', type: 'motherboard', billz_stock: 1 }),
    ]);
    expect(groups.map((g) => [g.slot, g.rep.id, g.ids.sort()])).toEqual([['cpu', 'new', ['new', 'old']], ['mb', 'mb2', ['mb1', 'mb2']]]);
  });
  it("qo'lda kiritilgan faol qism — omborda; quvvat tuzatishi attrs'ga o'tadi", () => {
    const out = toConfigParts(
      [row({ id: 'man', name: 'SAMA K650W', type: 'psu', billz_id: null, billz_stock: null, pc_watts: 750 })], new Map(), DIMS,
    );
    expect(out.psu?.[0]).toMatchObject({ id: 'man', inStock: true, attrs: { values: {}, watts: 750 } });
  });
  it("groupValues begona (o'chirilgan turdagi) qiymatni tashlaydi", () => {
    expect(groupValues(['a'], vals({ a: [14, 999] }), DIMS)).toEqual({ 1: [14] });
  });
  it("sanoqlar: countUntagged — faol turlar bo'yicha; missingCount — bitta tur bo'yicha", () => {
    const rows = [
      row({ id: 'c1', name: 'Intel Core i5 12400F' }),
      row({ id: 'c2', name: 'Intel Core i5 13400F' }),
      row({ id: 'r1', name: 'DDR5 Corsair 16GB', type: 'ram' }),
      row({ id: 'g1', name: 'RTX 4090', type: 'gpu' }),
    ];
    const byProduct = vals({ c1: [14, 21] });
    const groups = partGroups(rows);
    expect(countUntagged(rows, byProduct, DIMS)).toBe(2);
    expect(missingCount(SOCKET, groups, byProduct, DIMS)).toBe(1);
    expect(missingCount(MEMORY, groups, byProduct, DIMS)).toBe(2);
  });
  it("configuratorReady — CPU, plata va RAM'da kamida bitta qism", () => {
    const p = { id: 'x', name: 'x', image: '', priceUzs: 1, inStock: true, attrs: at({}) };
    expect(configuratorReady({ cpu: [p], mb: [p], ram: [p] })).toBe(true);
    expect(configuratorReady({ cpu: [p], mb: [p], ram: [] })).toBe(false);
    expect(configuratorReady({})).toBe(false);
  });
});

describe('cpuHasGraphics', () => {
  it('Intel: F/KF — grafikasiz, qolgani grafikali', () => {
    expect(cpuHasGraphics('Intel Core i5 12400F')).toBe(false);
    expect(cpuHasGraphics('Intel Core i5 13600KF')).toBe(false);
    expect(cpuHasGraphics('Intel Core i5 14400')).toBe(true);
  });
  it('Core Ultra 200: 265F grafikasiz, 285K grafikali', () => {
    expect(cpuHasGraphics('Intel Core Ultra 7 265F')).toBe(false);
    expect(cpuHasGraphics('Intel Core Ultra 9 285K')).toBe(true);
  });
  it('AMD AM5: faqat F grafikasiz; AM4: faqat G grafikali', () => {
    expect(cpuHasGraphics('AMD Ryzen 5 7500F')).toBe(false);
    expect(cpuHasGraphics('AMD Ryzen 7 9800X3D')).toBe(true);
    expect(cpuHasGraphics('AMD Ryzen 5 5600X')).toBe(false);
    expect(cpuHasGraphics('AMD Ryzen 5 5600G')).toBe(true);
  });
  it('tanilmagan nom → null', () => {
    expect(cpuHasGraphics("Noma'lum")).toBeNull();
  });
});

describe('graphicsIssue', () => {
  it("grafikasiz protsessor + videokarta yo'q → ogohlantirish (blok emas)", () => {
    expect(graphicsIssue('Intel Core i5 12400F', false)).toEqual({ slot: 'cpu', level: 'warn', code: 'graphics', need: '' });
  });
  it("videokarta bor, grafikali yoki noma'lum protsessor, protsessor yo'q → muammo yo'q", () => {
    expect(graphicsIssue('Intel Core i5 12400F', true)).toBeNull();
    expect(graphicsIssue('Intel Core i5 14400', false)).toBeNull();
    expect(graphicsIssue("Noma'lum", false)).toBeNull();
    expect(graphicsIssue(undefined, false)).toBeNull();
  });
});
```

- [ ] **Step 2: Test yiqilishini ko'ring**

Run: `bunx vitest run shared/pc-compat.test.ts`
Expected: FAIL — `suggestValues`, `isTagged`, `partGroups` va boshqalar eksport qilinmagan.

- [ ] **Step 3: `shared/pc-compat.ts`ni to'liq almashtiring**

```ts
/**
 * PC konfiguratori — moslik qoidalari va qism guruhlari (sof; sayt loaderi, admin API va admin UI ishlatadi).
 * Moslik admin belgilagan qiymatlardan keladi (`pc_dimensions` / `pc_dimension_values` / `pc_part_values`):
 * ikki qism faol turda kamida bitta umumiy qiymatga ega bo'lsa — mos. Tovar nomi parserlari endi faqat
 * admin ekranidagi **taklif** (`suggestValues`) va quvvat (`partWatts`) uchun ishlaydi.
 * Spec: docs/superpowers/specs/2026-10-13-pc-moslik-guruhlari-design.md
 */

export type SlotKey = 'cpu' | 'mb' | 'ram' | 'gpu' | 'psu' | 'ssd' | 'case';

/** Bo'g'in → tovar turi (`product_types`, `pc` yo'nalishi). Tartib — UI'dagi qadamlar tartibi. */
export const PC_SLOTS: readonly { key: SlotKey; type: string }[] = [
  { key: 'cpu', type: 'cpu' },
  { key: 'mb', type: 'motherboard' },
  { key: 'ram', type: 'ram' },
  { key: 'gpu', type: 'gpu' },
  { key: 'psu', type: 'psu' },
  { key: 'ssd', type: 'xotira' },
  { key: 'case', type: 'korpus' },
];

export function slotForType(type: string | null): SlotKey | null {
  return PC_SLOTS.find((s) => s.type === type)?.key ?? null;
}

export interface PcDimensionValue { id: number; label: string }
export interface PcDimension {
  id: number;
  /** Seed turlari: 'socket' | 'memory' — nomdan taklif shu kalit bo'yicha; admin yaratgan turda null. */
  key: string | null;
  name: string;
  nameRu: string;
  slots: SlotKey[];
  /** Faol tur saytda tekshiriladi va qism ko'rinishi uchun talab qilinadi. */
  active: boolean;
  values: PcDimensionValue[];
}
/** dimensionId → tasdiqlangan qiymat id'lari. */
export type PartValues = Record<number, number[]>;
export interface PartAttrs { values: PartValues; watts: number | null }

// ── Nom parserlari: taklif va quvvat uchun ───────────────────────────────────

type PcSocket = 'LGA1700' | 'LGA1851' | 'LGA1200' | 'AM5' | 'AM4';
type PcMemory = 'DDR4' | 'DDR5';

const CHIPSETS: Record<string, PcSocket> = {};
const addChipsets = (socket: PcSocket, list: string) => { for (const c of list.split(' ')) CHIPSETS[c] = socket; };
addChipsets('LGA1700', 'h610 b660 h670 z690 b760 h770 z790');
addChipsets('LGA1851', 'h810 b860 z890');
addChipsets('AM5', 'a620 b650 x670 b850 x870');
addChipsets('AM4', 'a320 b350 x370 b450 x470 a520 b550 x570');
addChipsets('LGA1200', 'h410 b460 h470 z490 h510 b560 h570 z590');

/** Soketning yagona xotira turi; LGA1700 ikkalasini qo'llaydi → null. */
function socketMemory(socket: PcSocket | null): PcMemory | null {
  if (socket === 'LGA1851' || socket === 'AM5') return 'DDR5';
  if (socket === 'AM4' || socket === 'LGA1200') return 'DDR4';
  return null;
}

function cpuSocket(n: string): PcSocket | null {
  if (/(?:core\s*)?ultra\s*[3579]\s*2\d\d/.test(n)) return 'LGA1851';
  if (/i[3579][\s-]*1[234]\d{3}/.test(n)) return 'LGA1700';
  if (/i[3579][\s-]*1[01]\d{3}/.test(n)) return 'LGA1200';
  // Kod nomi ("Granite Ridge") tier va model raqami orasiga tushishi mumkin — model
  // raqamining birinchi raqami avlodni beradi (7/8/9 → AM5, 3/4/5 → AM4).
  const ryzen = n.match(/ryzen\s*[3579]\b.*?\b([3-9])\d{3}/);
  if (ryzen) {
    if (ryzen[1] === '7' || ryzen[1] === '8' || ryzen[1] === '9') return 'AM5';
    if (ryzen[1] === '3' || ryzen[1] === '4' || ryzen[1] === '5') return 'AM4';
  }
  return null;
}

function cpuWatts(n: string): number | null {
  if (/\bi9\b|i9[\s-]|ultra\s*9/.test(n)) return 250;
  if (/\bi7\b|i7[\s-]|ultra\s*7/.test(n)) return 200;
  if (/\bi5\b|i5[\s-]/.test(n)) return /i5[\s-]*1\d{4}k/.test(n) ? 180 : 125;
  if (/ultra\s*5/.test(n)) return 125;
  if (/\bi3\b|i3[\s-]/.test(n)) return 90;
  if (/ryzen\s*9/.test(n)) return 200;
  if (/ryzen\s*7/.test(n)) return 150;
  if (/ryzen\s*5/.test(n)) return 110;
  return null;
}

function boardChipsetCode(n: string): string | null {
  for (const m of n.matchAll(/[abhxz]\d{3}/g)) {
    if (CHIPSETS[m[0]]) return m[0];
  }
  return null;
}

function boardSocket(n: string): PcSocket | null {
  const code = boardChipsetCode(n);
  return code ? CHIPSETS[code] : null;
}

function nameMemory(n: string): PcMemory | null {
  if (/ddr5|\bd5\b/.test(n)) return 'DDR5';
  if (/ddr4|\bd4\b/.test(n)) return 'DDR4';
  return null;
}

function ramMemory(n: string): PcMemory | null {
  const explicit = nameMemory(n);
  if (explicit) return explicit;
  const mhz = n.match(/(\d{4})\s*mhz/);
  if (!mhz) return null;
  const f = Number(mhz[1]);
  if (f >= 4800) return 'DDR5';
  if (f >= 2133 && f <= 3600) return 'DDR4';
  return null;
}

/** GPU iste'moli, W. Kalit — normallashtirilgan model ("rtx 4070 ti", "rx 7900 xtx"). `super` → `ti` qiymati. */
const GPU_WATTS: Record<string, number> = {
  'rtx 5090': 575, 'rtx 5080': 360, 'rtx 5070 ti': 300, 'rtx 5070': 250, 'rtx 5060 ti': 180, 'rtx 5060': 145, 'rtx 5050': 130,
  'rtx 4090': 450, 'rtx 4080': 320, 'rtx 4070 ti': 285, 'rtx 4070': 200, 'rtx 4060 ti': 165, 'rtx 4060': 115,
  'rtx 3090': 350, 'rtx 3080': 320, 'rtx 3070 ti': 290, 'rtx 3070': 220, 'rtx 3060 ti': 200, 'rtx 3060': 170, 'rtx 3050': 130,
  'rtx 2080': 215, 'rtx 2070': 175, 'rtx 2060': 160, 'rtx 2060 ti': 175,
  'rx 9070 xt': 304, 'rx 9070': 220, 'rx 9060 xt': 160, 'rx 9060': 150, 'rx 7900 xtx': 355, 'rx 7900 xt': 315, 'rx 7800 xt': 263, 'rx 7700 xt': 245, 'rx 7600': 165,
  'arc b580': 190, 'arc a770': 225,
};

function gpuWatts(n: string): number | null {
  const nv = n.match(/(?:rtx|gtx)?\s*([2345]0[5-9]0)\s*(ti|super)?/);
  // Model raqami ko'pincha nomga "yopishib" keladi ("5060Ti", "2060Super") — bo'sh joysiz
  // qo'shimcha ham chegara ichida hisoblanadi, aks holda \b raqam bilan harf orasida to'xtamaydi.
  if (nv && /rtx|gtx|geforce|\b[2345]0[5-9]0(?:ti|super)?\b|rtx\d/.test(n)) {
    const base = `rtx ${nv[1]}`;
    const withTi = nv[2] ? `${base} ti` : base;
    return GPU_WATTS[withTi] ?? GPU_WATTS[base] ?? null;
  }
  const amd = n.match(/rx\s*(\d{4})\s*(xtx|xt)?/);
  if (amd) {
    const base = `rx ${amd[1]}`;
    return GPU_WATTS[amd[2] ? `${base} ${amd[2]}` : base] ?? GPU_WATTS[base] ?? null;
  }
  const arc = n.match(/arc\s*([ab]\d{3})/);
  if (arc) return GPU_WATTS[`arc ${arc[1]}`] ?? null;
  return null;
}

function psuWatts(n: string): number | null {
  const w = n.match(/(?<!\d)(\d{3,4})\s*w(?![a-z])/);
  if (w) return Number(w[1]);
  for (const m of n.matchAll(/(?<!\d)(\d{3,4})(?!\d)/g)) {
    const v = Number(m[1]);
    if (v >= 300 && v <= 2000) return v;
  }
  return null;
}

// ™/® savdo belgisi tier va model raqami orasiga tushib qolsa \s* uni bo'shliq deb qabul qilmaydi.
const norm = (name: string): string => name.toLowerCase().replace(/[™®]/g, '');

/** Iste'mol (CPU, GPU) yoki quvvat (blok), W: admin tuzatishi (> 0) → nomdan; boshqa bo'g'in — null. */
export function partWatts(slot: SlotKey, name: string, override: number | null): number | null {
  if (override !== null && override > 0) return override;
  const n = norm(name);
  if (slot === 'cpu') return cpuWatts(n);
  if (slot === 'gpu') return gpuWatts(n);
  if (slot === 'psu') return psuWatts(n);
  return null;
}

/** Nomdan taklif yorliqlari — faqat seed turlari kaliti bo'yicha. */
function suggestLabels(key: string | null, slot: SlotKey, n: string): string[] {
  if (key === 'socket') {
    const s = slot === 'cpu' ? cpuSocket(n) : slot === 'mb' ? boardSocket(n) : null;
    return s ? [s] : [];
  }
  if (key !== 'memory') return [];
  if (slot === 'cpu') {
    const socket = cpuSocket(n);
    if (socket === 'LGA1700') return ['DDR4', 'DDR5'];
    const m = socketMemory(socket);
    return m ? [m] : [];
  }
  if (slot === 'mb') {
    // LGA1700 platalar ikkala turda chiqadi; DDR4 versiyasi nomda "D4"/"DDR4" bilan belgilanadi.
    // H610 — asosan DDR4, lekin nomda aytilmasa noaniq: taklif berilmaydi, admin o'zi tanlaydi.
    const socket = boardSocket(n);
    const fallback = boardChipsetCode(n) === 'h610' ? null : socket === 'LGA1700' ? 'DDR5' : socketMemory(socket);
    const m = nameMemory(n) ?? fallback;
    return m ? [m] : [];
  }
  if (slot === 'ram') {
    const m = ramMemory(n);
    return m ? [m] : [];
  }
  return [];
}

/** Admin ekranidagi "taklif": nomdan aniqlangan qiymatlar shu turlarning qiymat id'lariga moslangan. Saytga ta'sir qilmaydi. */
export function suggestValues(slot: SlotKey, name: string, dims: PcDimension[]): PartValues {
  const n = norm(name);
  const out: PartValues = {};
  for (const d of dims) {
    if (!d.slots.includes(slot)) continue;
    const labels = suggestLabels(d.key, slot, n);
    const ids = d.values.filter((v) => labels.includes(v.label)).map((v) => v.id);
    if (ids.length > 0) out[d.id] = ids;
  }
  return out;
}

// ── Moslik qoidalari ─────────────────────────────────────────────────────────

const activeFor = (slot: SlotKey, dims: PcDimension[]): PcDimension[] => dims.filter((d) => d.active && d.slots.includes(slot));
const labelsOf = (d: PcDimension, ids: number[]): string => d.values.filter((v) => ids.includes(v.id)).map((v) => v.label).join(' / ');

/** Qism konfiguratorda ko'rinadimi: bo'g'ini kirgan har bir faol turda kamida bitta tasdiqlangan qiymat. */
export function isTagged(slot: SlotKey, values: PartValues, dims: PcDimension[]): boolean {
  return activeFor(slot, dims).every((d) => (values[d.id]?.length ?? 0) > 0);
}

export interface Issue {
  slot: SlotKey;
  level: 'block' | 'warn';
  code: 'dimension' | 'power' | 'graphics';
  /** dimension: kerakli qiymat(lar) " / " bilan; power: tavsiya etilgan W. */
  need: string;
  /** Faqat `code: 'dimension'` — sabab matnidagi tur nomi uchun. */
  dimensionId?: number;
}
export type Picked = Partial<Record<SlotKey, PartAttrs>>;

/** Buyurtma uchun majburiy bo'g'inlar (GPU — integrallashgan grafika bo'lishi mumkin; qolgani mijozda bo'lishi mumkin). */
export const REQUIRED_SLOTS: readonly SlotKey[] = ['cpu', 'mb', 'ram'];

/** Tavsiya etilgan blok quvvati: (CPU + GPU + 100) × 1.2, 50 ga yaxlitlab. CPU ham GPU ham noma'lum → null. */
export function recommendedWatts(picked: Picked): number | null {
  const cpu = picked.cpu?.watts ?? null;
  const gpu = picked.gpu?.watts ?? null;
  if (cpu === null && gpu === null) return null;
  return Math.ceil(((cpu ?? 0) + (gpu ?? 0) + 100) * 1.2 / 50) * 50;
}

/**
 * `cand` — `slot` bo'g'inining nomzodi; `picked` — boshqa bo'g'inlardagi tanlovlar (`slot`ning o'zi e'tiborsiz).
 * Har faol tur bo'yicha har bir boshqa tanlangan qism bilan juftlik: qiymatlar kesishmasi bo'sh → block.
 * Qiymatsiz qism (sayt ularni ko'rsatmaydi, lekin himoya uchun) — tekshirilmaydi.
 */
export function issueFor(slot: SlotKey, cand: PartAttrs, picked: Picked, dims: PcDimension[]): Issue | null {
  const others: Picked = { ...picked, [slot]: undefined };
  for (const d of activeFor(slot, dims)) {
    const mine = cand.values[d.id] ?? [];
    if (mine.length === 0) continue;
    for (const { key } of PC_SLOTS) {
      if (key === slot || !d.slots.includes(key)) continue;
      const theirs = others[key]?.values[d.id] ?? [];
      if (theirs.length > 0 && !mine.some((v) => theirs.includes(v))) {
        return { slot, level: 'block', code: 'dimension', dimensionId: d.id, need: labelsOf(d, theirs) };
      }
    }
  }
  if (slot === 'psu' || slot === 'cpu' || slot === 'gpu') {
    const next: Picked = { ...others, [slot]: cand };
    const need = recommendedWatts(next);
    const psu = next.psu?.watts ?? null;
    if (need !== null && psu !== null && psu < need) return { slot, level: 'warn', code: 'power', need: String(need) };
  }
  return null;
}

/** Yig'madagi muammolar — har juft bir marta (keyingi bo'g'in oldingilari bilan solishtiriladi). */
export function summaryIssues(picked: Picked, dims: PcDimension[]): Issue[] {
  const out: Issue[] = [];
  const earlier: Picked = {};
  for (const { key } of PC_SLOTS) {
    const cand = picked[key];
    if (!cand) continue;
    const i = issueFor(key, cand, earlier, dims);
    if (i) out.push(i);
    earlier[key] = cand;
  }
  return out;
}

/**
 * Grafikasiz protsessor va videokarta tanlanmagan — bunday kompyuter ekranga hech narsa
 * chiqarmaydi. **Ogohlantirish, blok emas:** videokarta ixtiyoriy bo'g'in, u mijozning o'zida bo'lishi mumkin.
 */
export function graphicsIssue(cpuName: string | undefined, hasGpu: boolean): Issue | null {
  if (!cpuName || hasGpu || cpuHasGraphics(cpuName) !== false) return null;
  return { slot: 'cpu', level: 'warn', code: 'graphics', need: '' };
}

/**
 * Protsessorning o'z grafikasi bormi. Intel 12–14 avlod va Core Ultra 200: "F"/"KF" — grafikasiz.
 * AMD AM5 (7000/8000/9000): "F" — grafikasiz. AMD AM4 (3000/4000/5000): faqat "G"/"GE" grafikali. Tanilmasa — null.
 */
export function cpuHasGraphics(name: string): boolean | null {
  const n = norm(name);
  const ultra = n.match(/ultra\s*[3579]\s*2\d\d([a-z]*)/);
  if (ultra) return !ultra[1].includes('f');
  const intel = n.match(/\bi[3579][\s-]*\d{4,5}([a-z]*)/);
  if (intel) return !intel[1].includes('f');
  const ryzen = n.match(/ryzen\s*[3579]\b.*?\b([3-9])\d{3}([a-z0-9]*)/);
  if (ryzen) return Number(ryzen[1]) >= 7 ? !ryzen[2].includes('f') : ryzen[2].startsWith('g');
  return null;
}

export interface CandidateState { block: Issue | null; drops: SlotKey[]; warn: Issue | null }

/**
 * Nomzod holati faol bo'g'in uchun: `block` — faqat PC_SLOTS tartibida **oldinroq** turgan bo'g'inlar bilan
 * mos kelmasa; `drops` — shu nomzod tanlansa keyingi bo'g'inlardan mos kelmay qoladiganlari (kaskad,
 * xuddi `choose()`dagi kabi); `warn` — quvvat ogohlantirishi (hamma bo'g'inlar bilan).
 */
export function candidateState(slot: SlotKey, cand: PartAttrs, picked: Picked, dims: PcDimension[]): CandidateState {
  const order = PC_SLOTS.map((s) => s.key);
  const idx = order.indexOf(slot);

  const earlier: Picked = {};
  for (const k of order.slice(0, idx)) if (picked[k]) earlier[k] = picked[k];
  const blockIssue = issueFor(slot, cand, earlier, dims);
  const block = blockIssue?.level === 'block' ? blockIssue : null;

  const current: Picked = { ...picked, [slot]: cand };
  const drops: SlotKey[] = [];
  for (const k of order.slice(idx + 1)) {
    const cur = current[k];
    if (!cur) continue;
    const i = issueFor(k, cur, current, dims);
    if (i?.level === 'block') { delete current[k]; drops.push(k); }
  }

  const warnIssue = issueFor(slot, cand, picked, dims);
  const warn = warnIssue?.level === 'warn' ? warnIssue : null;

  return { block, drops, warn };
}

/** Blok quvvati aniqlanmagan → "Moslikni operator tasdiqlaydi". Moslik qiymati yo'q qism umuman ko'rinmaydi. */
export function needsVerify(slot: SlotKey, attrs: PartAttrs): boolean {
  return slot === 'psu' && attrs.watts === null;
}

/** CPU uchun ro'yxatda mos plata bormi (CPU va platani bog'laydigan hamma faol turlarda kesishma). */
export function hasMatch(cpu: PartAttrs, boards: PartAttrs[], dims: PcDimension[]): boolean {
  const shared = dims.filter((d) => d.active && d.slots.includes('cpu') && d.slots.includes('mb'));
  return boards.some((b) => shared.every((d) => {
    const x = cpu.values[d.id] ?? [];
    const y = b.values[d.id] ?? [];
    return x.length === 0 || y.length === 0 || x.some((v) => y.includes(v));
  }));
}

// ── Qismlar: guruhlash va sayt ro'yxati ──────────────────────────────────────

export interface ConfigPartRow {
  id: string; name: string; image_url: string; type: string | null; price: number;
  billz_id: string | null; billz_stock: number | null; is_active: number;
  pc_watts: number | null;
}
export interface ConfigPart { id: string; name: string; image: string; priceUzs: number; inStock: boolean; attrs: PartAttrs }
export interface PartGroup { slot: SlotKey; rep: ConfigPartRow; inStock: boolean; ids: string[] }

/**
 * Konfigurator dedupe kaliti — `nameKey` (billz.ts, sinxronizatsiya guruhlash uchun, o'zgartirilmaydi)
 * dan farqli, karta yozuvidagi yaqin-dublikatlarni ham baholaydi: bir xil tovar turli qatorlarda
 * turli prefiks ("CPU "/"Motherboard ") va rang qo'shimchasi ("/ Black", ba'zan takrorlanib
 * "... Black / Black") bilan kelishi mumkin.
 */
function partKey(name: string): string {
  const stripped = name
    .toLowerCase()
    .replace(/[™®]/g, '')
    .replace(/^(?:cpu|gpu|psu|ram|motherboard)\s+/, '')
    .trim();
  const dedupedColor = stripped.replace(/\s+(\S+)\s*\/\s*\1$/, '');
  const withoutColor = dedupedColor !== stripped ? dedupedColor : stripped.replace(/\s*\/\s*.+$/, '');
  return withoutColor.replace(/\s+/g, ' ').trim();
}

/**
 * Bo'g'in + yaqin-dublikat nom bo'yicha guruhlar. Omborda: Billz qoldig'i > 0 yoki qo'lda kiritilgan faol tovar.
 * Vakil — omborda bori, keyin faoli (sinxronizatsiya eski dublikatni `is_active=0, billz_stock=0` qilib qoldiradi).
 * `ids` — guruhning hamma qatorlari: admin yozuvi ularning hammasiga tushadi.
 */
export function partGroups(rows: ConfigPartRow[]): PartGroup[] {
  const map = new Map<string, PartGroup>();
  const rank = (row: ConfigPartRow, inStock: boolean) => (inStock ? 2 : 0) + (row.is_active === 1 ? 1 : 0);
  for (const row of rows) {
    const slot = slotForType(row.type);
    if (!slot) continue;
    const inStock = (row.billz_stock ?? 0) > 0 || (row.billz_id === null && row.is_active === 1);
    const key = `${slot}|${partKey(row.name)}`;
    const cur = map.get(key);
    if (!cur) { map.set(key, { slot, rep: row, inStock, ids: [row.id] }); continue; }
    cur.ids.push(row.id);
    if (rank(row, inStock) > rank(cur.rep, cur.inStock)) { cur.rep = row; cur.inStock = inStock; }
  }
  return [...map.values()];
}

/** Guruh qiymatlari — guruhdagi hamma qatorlar qiymatlarining birlashmasi, tur bo'yicha; turi topilmagan qiymat tashlanadi. */
export function groupValues(ids: string[], byProduct: Map<string, number[]>, dims: PcDimension[]): PartValues {
  const dimOf = new Map<number, number>();
  for (const d of dims) for (const v of d.values) dimOf.set(v.id, d.id);
  const out: PartValues = {};
  for (const id of ids) {
    for (const v of byProduct.get(id) ?? []) {
      const d = dimOf.get(v);
      if (d === undefined) continue;
      const list = (out[d] ??= []);
      if (!list.includes(v)) list.push(v);
    }
  }
  return out;
}

/** Sayt ro'yxati: belgilanmagan qism chiqmaydi. Tartib: omborda bori oldin, keyin arzonroq. */
export function toConfigParts(rows: ConfigPartRow[], byProduct: Map<string, number[]>, dims: PcDimension[]): Partial<Record<SlotKey, ConfigPart[]>> {
  const out: Partial<Record<SlotKey, ConfigPart[]>> = {};
  for (const g of partGroups(rows)) {
    const values = groupValues(g.ids, byProduct, dims);
    if (!isTagged(g.slot, values, dims)) continue;
    (out[g.slot] ??= []).push({
      id: g.rep.id, name: g.rep.name.trim(), image: g.rep.image_url, priceUzs: g.rep.price, inStock: g.inStock,
      attrs: { values, watts: partWatts(g.slot, g.rep.name, g.rep.pc_watts) },
    });
  }
  for (const list of Object.values(out)) list?.sort((a, b) => Number(b.inStock) - Number(a.inStock) || a.priceUzs - b.priceUzs);
  return out;
}

/** Konfigurator chiziladimi: majburiy bo'g'inlarning har birida kamida bitta qism. */
export function configuratorReady(parts: Partial<Record<SlotKey, ConfigPart[]>>): boolean {
  return REQUIRED_SLOTS.every((k) => (parts[k]?.length ?? 0) > 0);
}

/** Bosh sahifa: faol turlar sabab saytda ko'rinmayotgan qism guruhlari soni. */
export function countUntagged(rows: ConfigPartRow[], byProduct: Map<string, number[]>, dims: PcDimension[]): number {
  return partGroups(rows).filter((g) => activeFor(g.slot, dims).length > 0 && !isTagged(g.slot, groupValues(g.ids, byProduct, dims), dims)).length;
}

/** Admin turlar ro'yxati: shu turning bo'g'inlarida shu tur qiymati yo'q guruhlar (tur faol-nofaolligidan qat'i nazar). */
export function missingCount(dim: PcDimension, groups: PartGroup[], byProduct: Map<string, number[]>, dims: PcDimension[]): number {
  return groups.filter((g) => dim.slots.includes(g.slot) && (groupValues(g.ids, byProduct, dims)[dim.id]?.length ?? 0) === 0).length;
}
```

- [ ] **Step 4: Test o'tishini ko'ring**

Run: `bunx vitest run shared/pc-compat.test.ts`
Expected: PASS (hamma `describe` bloklari).

- [ ] **Step 5: Commit**

```bash
git add shared/pc-compat.ts shared/pc-compat.test.ts
git commit -m "feat: konfigurator mosligi admin qiymatlaridan (sof model, nom — faqat taklif)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Sayt — yangi model bilan konfigurator

**Files:**
- Create: `functions/lib/pc-db.ts`
- Modify: `app/lib/loaders.ts:17` (import) va `:140-158` (`loadConfiguratorParts`)
- Modify: `app/routes/category.tsx:7,13-14,35-36,49,70-76`
- Modify: `src/store/PcConfigurator.tsx` (props, `reason`, qoida chaqiruvlari)
- Modify: `src/locales.ts` (uz `:58-59`, ru `:382-383`)
- Modify: `src/admin/screens/ProductEdit.tsx:8,226-227,470-496` (kompilyatsiya — soket/xotira select'lari olib tashlanadi)

**Interfaces:**
- Consumes: Task 2 eksportlari.
- Produces:
  - `functions/lib/pc-db.ts`: `readDimensions(env): Promise<PcDimension[]>`, `readConfigRows(env, opts?: { includeHidden?: boolean }): Promise<ConfigPartRow[]>`, `readPartValues(env): Promise<Map<string, number[]>>`.
  - `app/lib/loaders.ts`: `interface ConfiguratorData { parts: Partial<Record<SlotKey, ConfigPart[]>>; dims: PcDimension[] }`, `loadConfiguratorParts(env): Promise<ConfiguratorData>`.
  - `PcConfigurator` props: `{ t; locale; parts; dims: PcDimension[] }`.
  - Locale kaliti `cfgNeedValue` (uz `"{dim} {need} bo'lishi kerak"`, ru `"{dim} — нужен {need}"`); `cfgNeedSocket`, `cfgNeedMemory` o'chiriladi.

- [ ] **Step 1: `functions/lib/pc-db.ts` yarating**

```ts
import type { Env } from '../env';
import { PC_SLOTS, type ConfigPartRow, type PcDimension, type SlotKey } from '../../shared/pc-compat';

interface DimRow { id: number; key: string | null; name: string; name_ru: string; slots: string; is_active: number }
interface ValueRow { id: number; dimension_id: number; label: string }

const SLOT_KEYS: readonly string[] = PC_SLOTS.map((s) => s.key);

function parseSlots(raw: string): SlotKey[] {
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is SlotKey => typeof x === 'string' && SLOT_KEYS.includes(x)) : [];
  } catch {
    return [];
  }
}

/** Hamma moslik turlari qiymatlari bilan (faol va nofaol), `sort_order` bo'yicha. */
export async function readDimensions(env: Env): Promise<PcDimension[]> {
  const [{ results: dims }, { results: values }] = await Promise.all([
    env.DB.prepare('SELECT id, key, name, name_ru, slots, is_active FROM pc_dimensions ORDER BY sort_order, id').all<DimRow>(),
    env.DB.prepare('SELECT id, dimension_id, label FROM pc_dimension_values ORDER BY sort_order, id').all<ValueRow>(),
  ]);
  return dims.map((d) => ({
    id: d.id, key: d.key, name: d.name, nameRu: d.name_ru, slots: parseSlots(d.slots), active: d.is_active === 1,
    values: values.filter((v) => v.dimension_id === d.id).map((v) => ({ id: v.id, label: v.label })),
  }));
}

/**
 * Konfigurator qatorlari: PC yo'nalishi, bo'g'in turlari, narxi bor, faol yoki Billz'dan (qoldiq 0 — "buyurtma asosida"),
 * qo'lda yashirilmagan. `includeHidden` — "Konfiguratorda ko'rsatilmasin" belgilanganlari ham (admin tahriri uchun).
 */
export async function readConfigRows(env: Env, opts: { includeHidden?: boolean } = {}): Promise<ConfigPartRow[]> {
  const types = PC_SLOTS.map((s) => s.type);
  const { results } = await env.DB.prepare(
    `SELECT id, name, image_url, type, COALESCE(
       (SELECT MIN(v.cash_price_uzs) FROM product_variants v WHERE v.product_id = products.id AND v.in_stock = 1),
       cash_price_uzs) AS price,
     billz_id, billz_stock, is_active, pc_watts
     FROM products
     WHERE category_id = 'pc' AND type IN (${types.map(() => '?').join(', ')})
       ${opts.includeHidden ? '' : 'AND pc_hidden = 0'}
       AND cash_price_uzs > 0 AND (is_active = 1 OR billz_id IS NOT NULL)
       AND instr(',' || COALESCE(manual_fields, '') || ',', ',hidden,') = 0`,
  ).bind(...types).all<ConfigPartRow>();
  return results;
}

/** product_id → tasdiqlangan qiymat id'lari. Jadval kichik (≈ 300 qism × 2–3 qiymat) — butunlay o'qiladi. */
export async function readPartValues(env: Env): Promise<Map<string, number[]>> {
  const { results } = await env.DB.prepare('SELECT product_id, value_id FROM pc_part_values').all<{ product_id: string; value_id: number }>();
  const map = new Map<string, number[]>();
  for (const r of results) {
    const list = map.get(r.product_id);
    if (list) list.push(r.value_id);
    else map.set(r.product_id, [r.value_id]);
  }
  return map;
}
```

- [ ] **Step 2: Loaderni almashtiring** — `app/lib/loaders.ts`

Import qatori (`:17`):
```ts
import { toConfigParts, type ConfigPart, type PcDimension, type SlotKey } from '../../shared/pc-compat';
import { readConfigRows, readDimensions, readPartValues } from '../../functions/lib/pc-db';
```
(`PC_SLOTS` va `ConfigPartRow` boshqa joyda ishlatilmasa importdan chiqadi — `bun run lint` aytadi.)

`loadConfiguratorParts` (`:140-158`) to'liq:
```ts
export interface ConfiguratorData { parts: Partial<Record<SlotKey, ConfigPart[]>>; dims: PcDimension[] }

/** PC konfiguratori: admin tasdiqlagan qismlar + faol moslik turlari (sabab matnidagi nomlar uchun). Xato → bo'sh (bo'lim chiqmaydi). */
export async function loadConfiguratorParts(env: Env): Promise<ConfiguratorData> {
  try {
    const [rows, byProduct, dims] = await Promise.all([readConfigRows(env), readPartValues(env), readDimensions(env)]);
    const active = dims.filter((d) => d.active);
    return { parts: toConfigParts(rows, byProduct, active), dims: active };
  } catch (err) {
    console.error('loadConfiguratorParts fallback:', err);
    return { parts: {}, dims: [] };
  }
}
```

- [ ] **Step 3: Kategoriya route** — `app/routes/category.tsx`

Importga qo'shing:
```ts
import { configuratorReady } from '../../shared/pc-compat';
```
Loader (`:34-36`):
```ts
  // PC konfiguratori — admin tasdiqlagan qismlar (omborda va buyurtma asosida) va faol moslik turlari.
  const configurator = slug === 'pc' ? await loadConfiguratorParts(env) : { parts: {}, dims: [] };
  return { result, config, title, brands, filters, requestUrl: request.url, category, tiles, configurator, metaDesc: t.metaCatalogDesc };
```
Komponent: `const { result, config, title, brands, filters, category, tiles, configurator } = useLoaderData<typeof loader>();`
`promo` va konfigurator:
```tsx
        promo={category.id === 'pc' && configuratorReady(configurator.parts) ? <PcBuildPromo t={ctx.t} /> : undefined}
```
```tsx
          <PcConfigurator t={ctx.t} locale={ctx.locale} parts={configurator.parts} dims={configurator.dims} />
```
(Promo `#konfigurator`ga olib boradi — konfigurator chizilmasa promo ham chiqmaydi.)

- [ ] **Step 4: `src/locales.ts`**

uz (`cfgNeedSocket`, `cfgNeedMemory` qatorlari o'rniga):
```ts
    cfgNeedValue: "{dim} {need} bo'lishi kerak",
```
ru (`cfgNeedSocket`, `cfgNeedMemory` o'rniga):
```ts
    cfgNeedValue: "{dim} — нужен {need}",
```

- [ ] **Step 5: `src/store/PcConfigurator.tsx`**

Import:
```ts
import {
  PC_SLOTS, REQUIRED_SLOTS, candidateState, graphicsIssue, hasMatch, issueFor, needsVerify, summaryIssues,
  type ConfigPart, type Issue, type PcDimension, type Picked, type SlotKey,
} from '../../shared/pc-compat';
```
`reason` funksiyasini almashtiring:
```ts
const dimName = (d: PcDimension, locale: Locale): string => (locale === 'ru' && d.nameRu ? d.nameRu : d.name);

const reason = (t: Translation, i: Issue, dims: PcDimension[], locale: Locale): string => {
  if (i.code === 'graphics') return t.cfgNoGraphics;
  if (i.code === 'power') return t.cfgNeedPower.replace('{need}', i.need);
  const d = dims.find((x) => x.id === i.dimensionId);
  return t.cfgNeedValue.replace('{dim}', d ? dimName(d, locale) : '').replace('{need}', i.need);
};
```
Komponent imzosi:
```ts
const PcConfigurator: FC<{ t: Translation; locale: Locale; parts: Partial<Record<SlotKey, ConfigPart[]>>; dims: PcDimension[] }> = ({ t, locale, parts, dims }) => {
```
Doc-izohdagi "Moslik (soket, DDR, blok quvvati)" → "Moslik (admin belgilagan turlar — soket, xotira…, blok quvvati)".
Chaqiruvlarga `dims` qo'shing (hammasi shu faylda):
- `summaryIssues(pickedAttrs)` → `summaryIssues(pickedAttrs, dims)`
- `issueFor(k, cur.attrs, attrsOf(next))` → `issueFor(k, cur.attrs, attrsOf(next), dims)`
- `candidateState(active, part.attrs, pickedAttrs)` → `candidateState(active, part.attrs, pickedAttrs, dims)`
- `hasMatch(part.attrs, boards)` → `hasMatch(part.attrs, boards, dims)`
- uchta `reason(t, X)` (`state.block`, `state.warn`, `i`) → `reason(t, X, dims, locale)`

- [ ] **Step 6: `ProductEdit` kompilyatsiyasi** — `src/admin/screens/ProductEdit.tsx`

Import (`:8`):
```ts
import { partWatts, slotForType } from '../../../shared/pc-compat';
```
`:227`:
```ts
  const autoWatts = pcSlot ? partWatts(pcSlot, form.name, null) : null;
```
"Konfigurator" kartasidan soket (`pcSlot === 'cpu' || pcSlot === 'mb'`) va xotira (`pcSlot === 'mb' || pcSlot === 'ram'`) `Field` bloklarini butunlay olib tashlang. Quvvat maydonida `autoAttrs.watts` → `autoWatts` (ikki joyda: shart va `{ value: … }`). Moslik chiplari Task 9da qo'shiladi.

- [ ] **Step 7: Tekshiring**

Run: `bun run lint && bun run test`
Expected: ikkalasi yashil.

Run (dev server ishlayotgan bo'lsa yoki `preview_start dev`): `/category/pc` — **konfigurator va "yig'ish" promo kartasi chiqmaydi** (lokal bazada hali hech qaysi qism tasdiqlanmagan). Konsolda xato yo'q.

Bitta CPU, plata va RAM'ni qo'lda tasdiqlab sinang (lokal baza, keyin qaytariladi):
```bash
sqlite3 data/store.db "SELECT p.id, p.type, p.name FROM products p WHERE p.category_id='pc' AND p.type IN ('cpu','motherboard','ram') AND p.cash_price_uzs > 0 LIMIT 40;"
```
AM5 CPU, AM5 plata va DDR5 RAM tanlab (id'larni qo'ying):
```bash
sqlite3 data/store.db "INSERT INTO pc_part_values (product_id, value_id) SELECT '<CPU_ID>', id FROM pc_dimension_values WHERE label IN ('AM5','DDR5'); INSERT INTO pc_part_values (product_id, value_id) SELECT '<MB_ID>', id FROM pc_dimension_values WHERE label IN ('AM5','DDR5'); INSERT INTO pc_part_values (product_id, value_id) SELECT '<RAM_ID>', id FROM pc_dimension_values WHERE label = 'DDR5';"
```
Sahifani yangilang: konfigurator chiqadi, uchala bo'g'inda bittadan qism, tanlov "Hammasi mos". Keyin tozalang: `sqlite3 data/store.db "DELETE FROM pc_part_values;"`

- [ ] **Step 8: Commit**

```bash
git add functions/lib/pc-db.ts app/lib/loaders.ts app/routes/category.tsx src/store/PcConfigurator.tsx src/locales.ts src/admin/screens/ProductEdit.tsx
git commit -m "feat: sayt konfiguratori admin tasdiqlagan moslik qiymatlari bilan

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Mahsulot modelidan `pcSocket`/`pcMemory` olib tashlash

**Files:**
- Modify: `shared/types.ts:36-38`
- Modify: `functions/lib/db.ts:66-67,103-104`
- Modify: `functions/lib/validate.ts:127-130,211-212`
- Modify: `app/routes/api.admin.products.tsx:35-36,56-57`
- Modify: `app/routes/api.admin.products.$id.tsx:46,66-67` va DELETE batch (`:113-124`)
- Modify: `src/admin/lib/product-form.ts:38-39,55,75,111`, `src/admin/lib/product-form.test.ts:14,97,110`
- Modify: `shared/mcp-tools.ts:101-102,134-135`
- Modify: `src/admin/i18n/uz/products.ts`, `src/admin/i18n/ru/products.ts` (`productEdit.pc` — `socketLabel`, `autoOption`, `autoUnknown`, `memoryLabel` o'chadi)

**Interfaces:**
- Consumes: —
- Produces: `ApiProduct`, `ProductInput`, `ProductFormState`, MCP `ProductInputLike` endi `pcSocket`/`pcMemory` maydonlarisiz; `pcHidden`, `pcWatts` qoladi.

- [ ] **Step 1: Turlar va mapper**

`shared/types.ts`: `pcSocket` va `pcMemory` qatorlarini o'chiring; izohni yangilang:
```ts
  /** PC konfiguratorida ko'rsatilmasin (egasi eskirgan modelni chiqaradi). */
  pcHidden: boolean;
  /** Iste'mol/quvvat (W) admin tuzatishi; null — nomdan avtomatik. Moslik qiymatlari — `pc_part_values` (admin → Konfigurator). */
  pcWatts: number | null;
```
`functions/lib/db.ts`: `ProductRow`dan `pc_socket`, `pc_memory`; `rowToProduct`dan `pcSocket`, `pcMemory` qatorlarini o'chiring.

- [ ] **Step 2: Validator** — `functions/lib/validate.ts`

`PC_SOCKET_SET`, `pcSocket`, `pcMemory` e'lonlarini (`:127-130`, izoh bilan) va qaytariladigan obyektdagi `pcSocket,` `pcMemory,` qatorlarini o'chiring. `functions/lib/validate.test.ts`da `pcSocket`/`pcMemory` tekshiruvi bo'lsa — o'sha `expect`larni olib tashlang (`grep -n "pcSocket\|pcMemory" functions/lib/validate.test.ts`).

- [ ] **Step 3: Mahsulot route'lari**

`app/routes/api.admin.products.tsx` — INSERT:
```ts
    `INSERT INTO products (id, name, category, condition, condition_note, cash_price_uzs, image_url, sort_order, is_active, category_id, type, old_price_uzs, description, brand_id, slug, rating_avg, review_count, preorder, pc_hidden, pc_watts, created_at)
     VALUES (?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`,
```
va `.bind(...)`dan `input.pcSocket,` `input.pcMemory,` qatorlarini o'chiring (17 ta `?` `''`dan keyin — `condition`dan `pc_watts`gacha 17 ustun).

`app/routes/api.admin.products.$id.tsx` — UPDATE:
```ts
      `UPDATE products SET name=?, condition=?, condition_note=?, cash_price_uzs=?, image_url=?, sort_order=?, is_active=?, category_id=?, type=?, old_price_uzs=?, description=?, brand_id=?, slug=?, rating_avg=?, review_count=?, preorder=?, manual_fields=?, pc_hidden=?, pc_watts=? WHERE id=?`,
```
va `.bind`dan `input.pcSocket,` `input.pcMemory,`ni o'chiring. DELETE batch'iga (`DELETE FROM products` dan oldin) qo'shing:
```ts
      env.DB.prepare('DELETE FROM pc_part_values WHERE product_id = ?').bind(id),
```

- [ ] **Step 4: Admin forma va MCP**

`src/admin/lib/product-form.ts`: `ProductFormState`dan `pcSocket`, `pcMemory`; boshlang'ich holatdan `pcSocket: null, pcMemory: null,`; `detailToForm`dan `pcSocket: d.pcSocket, pcMemory: d.pcMemory,`; `formToPayload`dan `pcSocket: f.pcSocket, pcMemory: f.pcMemory,` — o'chiring.
`src/admin/lib/product-form.test.ts`: `:14`, `:97`, `:110`dagi `pcSocket: …, pcMemory: …,` juftliklarini o'chiring.
`shared/mcp-tools.ts`: `ProductInputLike`dan `pcSocket`, `pcMemory`; `detailToInput`dan `pcSocket: d.pcSocket,` va `pcMemory: d.pcMemory,` — o'chiring.

- [ ] **Step 5: i18n** — `src/admin/i18n/uz/products.ts` va `ru/products.ts`, `productEdit.pc` ichidan `socketLabel`, `autoOption`, `autoUnknown`, `memoryLabel` kalitlarini o'chiring (Task 3dan keyin ishlatilmaydi; `grep -rn "pc.socketLabel\|pc.autoOption\|pc.autoUnknown\|pc.memoryLabel" src` bo'sh bo'lishi kerak).

- [ ] **Step 6: Tekshiring**

Run: `grep -rn "pcSocket\|pcMemory\|pc_socket\|pc_memory" app src shared functions mcp server | grep -v "migrations/"`
Expected: bo'sh.

Run: `bun run lint && bun run test`
Expected: yashil.

- [ ] **Step 7: Commit**

```bash
git add shared/types.ts functions/lib/db.ts functions/lib/validate.ts functions/lib/validate.test.ts app/routes/api.admin.products.tsx app/routes/api.admin.products.\$id.tsx src/admin/lib/product-form.ts src/admin/lib/product-form.test.ts shared/mcp-tools.ts src/admin/i18n/uz/products.ts src/admin/i18n/ru/products.ts
git commit -m "chore: mahsulot modelidan pcSocket/pcMemory olib tashlandi (moslik — pc_part_values)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
(`validate.test.ts` o'zgarmagan bo'lsa ro'yxatdan chiqaring.)

---

### Task 5: Validatorlar va xato matnlari

**Files:**
- Modify: `shared/types.ts` (yangi tiplar)
- Modify: `functions/lib/validate.ts` (oxiriga ikki parser)
- Test: `functions/lib/validate.test.ts`
- Modify: `shared/err-text.ts`, `src/admin/i18n/ru/errors.ts`

**Interfaces:**
- Produces (`shared/types.ts`):
  ```ts
  export interface PcPartWrite { productId: string; dimensionId: number; valueIds: number[] }
  export interface PcDimensionInput { name: string; nameRu: string; slots: SlotKey[]; active: boolean; values: { id: number | null; label: string }[] }
  export interface ApiPcDimension extends PcDimension { /** Shu tur bo'g'inlarida shu tur qiymati yo'q qism guruhlari. */ missing: number }
  export interface ApiPcPart { id: string; ids: string[]; slot: SlotKey; name: string; image: string; inStock: boolean; values: PartValues; suggested: PartValues }
  ```
- Produces (`functions/lib/validate.ts`): `parsePcDimensionInput(body): PcDimensionInput`, `parsePcPartsInput(body): { items: PcPartWrite[] }`.
- Xato kodlari: `name_long`, `slots_invalid`, `values_limit`, `value_invalid`, `value_duplicate`, `items_invalid`, `dimension_not_found`, `dimension_protected`, `part_not_found`, `value_not_in_dimension`, `slot_not_in_dimension`.

- [ ] **Step 1: Tiplarni qo'shing** — `shared/types.ts` boshidagi importlarga:
```ts
import type { PartValues, PcDimension, SlotKey } from './pc-compat';
```
va fayl oxiriga (izohlari bilan):
```ts
/** Admin: bitta qism guruhining bitta turdagi qiymatlarini almashtirish (bo'sh ro'yxat — tozalash). */
export interface PcPartWrite { productId: string; dimensionId: number; valueIds: number[] }

/** Admin: moslik turi yaratish/tahriri. `values[].id` — mavjud qiymat (yorlig'i yangilanadi), null — yangi. */
export interface PcDimensionInput { name: string; nameRu: string; slots: SlotKey[]; active: boolean; values: { id: number | null; label: string }[] }

/** Admin turlar ro'yxati qatori. */
export interface ApiPcDimension extends PcDimension {
  /** Shu tur bo'g'inlarida shu tur qiymati yo'q qism guruhlari soni. */
  missing: number;
}

/** Admin qismlar jadvali qatori — dublikatlar bitta guruh (`ids` — hamma qatorlar, `id` — vakil). */
export interface ApiPcPart {
  id: string;
  ids: string[];
  slot: SlotKey;
  name: string;
  image: string;
  inStock: boolean;
  /** Tasdiqlangan qiymatlar (saytga ta'sir qiladi). */
  values: PartValues;
  /** Nomdan taklif (faqat admin ekrani). */
  suggested: PartValues;
}
```

- [ ] **Step 2: Yiqiladigan testni yozing** — `functions/lib/validate.test.ts` importiga `parsePcDimensionInput, parsePcPartsInput,` qo'shib, oxiriga:

```ts
describe('parsePcDimensionInput', () => {
  const base = { name: 'Form-faktor', nameRu: 'Форм-фактор', slots: ['mb', 'case'], active: false, values: [{ id: null, label: 'ATX' }, { id: 7, label: 'mATX' }] };
  it("to'liq kirish; probellar kesiladi", () => {
    expect(parsePcDimensionInput({ ...base, name: '  Form-faktor ', values: [{ label: ' ATX ' }, { id: 7, label: 'mATX' }] })).toEqual({
      name: 'Form-faktor', nameRu: 'Форм-фактор', slots: ['mb', 'case'], active: false,
      values: [{ id: null, label: 'ATX' }, { id: 7, label: 'mATX' }],
    });
    expect(parsePcDimensionInput({ ...base, active: true }).active).toBe(true);
  });
  it('nom majburiy va ≤ 60', () => {
    expect(() => parsePcDimensionInput({ ...base, name: '' })).toThrow('name_required');
    expect(() => parsePcDimensionInput({ ...base, name: 'x'.repeat(61) })).toThrow('name_long');
  });
  it("bo'g'inlar: kamida 2, ma'lum kalitlar, takrorsiz", () => {
    expect(() => parsePcDimensionInput({ ...base, slots: ['mb'] })).toThrow('slots_invalid');
    expect(() => parsePcDimensionInput({ ...base, slots: ['mb', 'monitor'] })).toThrow('slots_invalid');
    expect(() => parsePcDimensionInput({ ...base, slots: ['mb', 'mb'] })).toThrow('slots_invalid');
  });
  it("qiymatlar: 1–30 belgi, katta-kichik harfsiz takrorlanmas, ≤ 50", () => {
    expect(() => parsePcDimensionInput({ ...base, values: [{ label: '' }] })).toThrow('value_invalid');
    expect(() => parsePcDimensionInput({ ...base, values: [{ label: 'x'.repeat(31) }] })).toThrow('value_invalid');
    expect(() => parsePcDimensionInput({ ...base, values: [{ label: 'ATX' }, { label: 'atx' }] })).toThrow('value_duplicate');
    expect(() => parsePcDimensionInput({ ...base, values: Array.from({ length: 51 }, (_, i) => ({ label: `v${i}` })) })).toThrow('values_limit');
    expect(parsePcDimensionInput({ ...base, values: [] }).values).toEqual([]);
  });
});

describe('parsePcPartsInput', () => {
  it("to'g'ri kirish; qiymat id'lari takrorsiz", () => {
    expect(parsePcPartsInput({ items: [{ productId: ' p1 ', dimensionId: 1, valueIds: [12, 12, 22] }] })).toEqual({
      items: [{ productId: 'p1', dimensionId: 1, valueIds: [12, 22] }],
    });
    expect(parsePcPartsInput({ items: [{ productId: 'p1', dimensionId: 1, valueIds: [] }] }).items[0].valueIds).toEqual([]);
  });
  it("bo'sh, ortiqcha yoki noto'g'ri element → items_invalid", () => {
    expect(() => parsePcPartsInput({ items: [] })).toThrow('items_invalid');
    expect(() => parsePcPartsInput({})).toThrow('items_invalid');
    expect(() => parsePcPartsInput({ items: Array.from({ length: 501 }, () => ({ productId: 'p', dimensionId: 1, valueIds: [] })) })).toThrow('items_invalid');
    expect(() => parsePcPartsInput({ items: [{ productId: '', dimensionId: 1, valueIds: [] }] })).toThrow('items_invalid');
    expect(() => parsePcPartsInput({ items: [{ productId: 'p', dimensionId: '1', valueIds: [] }] })).toThrow('items_invalid');
    expect(() => parsePcPartsInput({ items: [{ productId: 'p', dimensionId: 1, valueIds: ['12'] }] })).toThrow('items_invalid');
  });
});
```

- [ ] **Step 3: Yiqilishini ko'ring**

Run: `bunx vitest run functions/lib/validate.test.ts`
Expected: FAIL — `parsePcDimensionInput is not a function` (yoki eksport topilmadi).

- [ ] **Step 4: Parserlarni yozing** — `functions/lib/validate.ts` importiga `PcDimensionInput, PcPartWrite,` (`../../shared/types`dan) va:
```ts
import { PC_SLOTS, type SlotKey } from '../../shared/pc-compat';
```
fayl oxiriga:
```ts
const PC_SLOT_KEYS: readonly string[] = PC_SLOTS.map((s) => s.key);
const MAX_DIM_VALUES = 50;
const MAX_PC_WRITES = 500;

/** Moslik turi: nom uz (majburiy) / ru, kamida 2 ta bo'g'in, qiymat yorliqlari takrorlanmas. */
export function parsePcDimensionInput(body: unknown): PcDimensionInput {
  const o = asRecord(body);
  const name = reqString(o, 'name');
  const nameRu = typeof o.nameRu === 'string' ? o.nameRu.trim() : '';
  if (name.length > 60 || nameRu.length > 60) throw new ValidationError('name_long');
  const rawSlots: unknown[] = Array.isArray(o.slots) ? o.slots : [];
  const slots = rawSlots.filter((s): s is SlotKey => typeof s === 'string' && PC_SLOT_KEYS.includes(s));
  if (slots.length < 2 || slots.length !== rawSlots.length || new Set(slots).size !== slots.length) throw new ValidationError('slots_invalid');
  const rawValues: unknown[] = Array.isArray(o.values) ? o.values : [];
  if (rawValues.length > MAX_DIM_VALUES) throw new ValidationError('values_limit');
  const values = rawValues.map((raw) => {
    const r = asRecord(raw);
    const label = typeof r.label === 'string' ? r.label.trim() : '';
    if (!label || label.length > 30) throw new ValidationError('value_invalid');
    const id = typeof r.id === 'number' && Number.isInteger(r.id) && r.id > 0 ? r.id : null;
    return { id, label };
  });
  if (new Set(values.map((v) => v.label.toLowerCase())).size !== values.length) throw new ValidationError('value_duplicate');
  return { name, nameRu, slots, active: o.active === true, values };
}

/** Qism qiymatlarini yozish: `[{ productId, dimensionId, valueIds }]`, 1–500 element. Mavjudlik route'da tekshiriladi. */
export function parsePcPartsInput(body: unknown): { items: PcPartWrite[] } {
  const o = asRecord(body);
  const raw: unknown[] = Array.isArray(o.items) ? o.items : [];
  if (raw.length === 0 || raw.length > MAX_PC_WRITES) throw new ValidationError('items_invalid');
  const items = raw.map((x) => {
    const r = asRecord(x);
    const productId = typeof r.productId === 'string' ? r.productId.trim() : '';
    const dimensionId = r.dimensionId;
    const ids: unknown[] = Array.isArray(r.valueIds) ? r.valueIds : [];
    if (!productId || typeof dimensionId !== 'number' || !Number.isInteger(dimensionId)) throw new ValidationError('items_invalid');
    if (!ids.every((v): v is number => typeof v === 'number' && Number.isInteger(v))) throw new ValidationError('items_invalid');
    return { productId, dimensionId, valueIds: [...new Set(ids as number[])] };
  });
  return { items };
}
```

- [ ] **Step 5: Test o'tishini ko'ring**

Run: `bunx vitest run functions/lib/validate.test.ts`
Expected: PASS.

- [ ] **Step 6: Xato matnlari** — `shared/err-text.ts` (`cookie_only`dan keyin):
```ts
  name_long: "Nom 60 belgidan oshmasin",
  slots_invalid: "Kamida ikkita bo'g'in tanlang",
  values_limit: "Qiymatlar 50 tadan oshmasin",
  value_invalid: "Qiymat 1–30 belgi bo'lishi kerak",
  value_duplicate: 'Qiymatlar takrorlanmasin',
  items_invalid: "Saqlanadigan ma'lumot noto'g'ri",
  dimension_not_found: 'Moslik turi topilmadi',
  dimension_protected: "Soket va Xotira turini o'chirib bo'lmaydi",
  part_not_found: "Qism konfiguratorda topilmadi",
  value_not_in_dimension: 'Qiymat bu turga tegishli emas',
  slot_not_in_dimension: "Bu tur shu bo'g'inni bog'lamaydi",
```
`src/admin/i18n/ru/errors.ts` (`cookie_only`dan keyin):
```ts
  name_long: 'Название — не длиннее 60 символов',
  slots_invalid: 'Выберите минимум два звена',
  values_limit: 'Не больше 50 значений',
  value_invalid: 'Значение — от 1 до 30 символов',
  value_duplicate: 'Значения не должны повторяться',
  items_invalid: 'Неверные данные для сохранения',
  dimension_not_found: 'Тип совместимости не найден',
  dimension_protected: 'Типы «Сокет» и «Тип памяти» удалить нельзя',
  part_not_found: 'Деталь не найдена в конфигураторе',
  value_not_in_dimension: 'Значение не относится к этому типу',
  slot_not_in_dimension: 'Этот тип не связывает это звено',
```

- [ ] **Step 7: Tekshiring va commit**

Run: `bun run lint && bun run test` → yashil.
```bash
git add shared/types.ts functions/lib/validate.ts functions/lib/validate.test.ts shared/err-text.ts src/admin/i18n/ru/errors.ts
git commit -m "feat: moslik turi va qism qiymatlari validatorlari

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Admin API — turlar, qismlar, bosh sahifa sanog'i

**Files:**
- Modify: `functions/lib/pc-db.ts` (`readDimensionList`)
- Create: `app/routes/api.admin.pc-dimensions.tsx`, `app/routes/api.admin.pc-dimensions.$id.tsx`, `app/routes/api.admin.pc-parts.tsx`
- Modify: `app/routes.ts` (reviews qatorlaridan keyin)
- Modify: `shared/types.ts` (`ApiDashboard.configuratorUntagged`), `app/routes/api.admin.dashboard.tsx`

**Interfaces:**
- Consumes: Task 2 (`partGroups`, `groupValues`, `suggestValues`, `missingCount`, `countUntagged`), Task 3 (`readDimensions`, `readConfigRows`, `readPartValues`), Task 5 (`parsePcDimensionInput`, `parsePcPartsInput`, tiplar).
- Produces (HTTP):
  - `GET /api/admin/pc-dimensions` → `ApiPcDimension[]`
  - `POST /api/admin/pc-dimensions` (`PcDimensionInput`, `active` e'tiborsiz — yangi tur doim nofaol) → `201 ApiPcDimension[]`
  - `PUT /api/admin/pc-dimensions/:id` (`PcDimensionInput`) → `ApiPcDimension[]`; `DELETE` → `ApiPcDimension[]` (`key` bor turda `400 dimension_protected`)
  - `GET /api/admin/pc-parts?slot=<SlotKey>` → `ApiPcPart[]` (nom bo'yicha); `GET ?product=<id>` → `ApiPcPart` (yashirinlar ham) yoki `404 part_not_found`
  - `PUT /api/admin/pc-parts` (`{ items: PcPartWrite[] }`) → `{ ok: true, updated: number }`
  - `ApiDashboard.configuratorUntagged: number`

- [ ] **Step 1: `readDimensionList`** — `functions/lib/pc-db.ts` oxiriga (importga `missingCount, partGroups` va `import type { ApiPcDimension } from '../../shared/types';`):
```ts
/** Admin turlar ro'yxati: har tur + shu turda qiymati yo'q (saytda ko'rinadigan) qism guruhlari soni. */
export async function readDimensionList(env: Env): Promise<ApiPcDimension[]> {
  const [dims, rows, byProduct] = await Promise.all([readDimensions(env), readConfigRows(env), readPartValues(env)]);
  const groups = partGroups(rows);
  return dims.map((d) => ({ ...d, missing: missingCount(d, groups, byProduct, dims) }));
}
```

- [ ] **Step 2: `app/routes/api.admin.pc-dimensions.tsx`**
```ts
import type { Route } from './+types/api.admin.pc-dimensions';
import { json } from '../../functions/lib/db';
import { readDimensionList } from '../../functions/lib/pc-db';
import { parsePcDimensionInput } from '../../functions/lib/validate';
import { requireAdmin, parseBody } from './api.admin.guard';

/** Konfigurator moslik turlari: ro'yxat (belgilanmagan qismlar soni bilan) va yaratish. */
export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  return json(await readDimensionList(env));
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });
  const input = parseBody(await request.json().catch(() => null), parsePcDimensionInput);
  if (input instanceof Response) return input;
  // Yangi tur doim nofaol: yoqilgan zahoti uning bo'g'inlaridagi hamma qism saytdan yo'qolardi — admin avval belgilaydi.
  // Qiymatlar shu tranzaksiyada `MAX(id)` ga bog'lanadi (batch atomik — oraga boshqa yozuv tushmaydi).
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO pc_dimensions (key, name, name_ru, slots, is_active, sort_order) VALUES (NULL, ?, ?, ?, 0, (SELECT COALESCE(MAX(sort_order), 0) + 10 FROM pc_dimensions))',
    ).bind(input.name, input.nameRu, JSON.stringify(input.slots)),
    ...input.values.map((v, i) =>
      env.DB.prepare('INSERT INTO pc_dimension_values (dimension_id, label, sort_order) VALUES ((SELECT MAX(id) FROM pc_dimensions), ?, ?)').bind(v.label, (i + 1) * 10)),
  ]);
  return json(await readDimensionList(env), { status: 201 });
}
```

- [ ] **Step 3: `app/routes/api.admin.pc-dimensions.$id.tsx`**
```ts
import type { Route } from './+types/api.admin.pc-dimensions.$id';
import { json } from '../../functions/lib/db';
import { readDimensionList } from '../../functions/lib/pc-db';
import { parsePcDimensionInput } from '../../functions/lib/validate';
import { requireAdmin, parseBody } from './api.admin.guard';

/** Bitta moslik turi: tahrir (qiymatlar to'liq almashtiriladi) va o'chirish (faqat admin yaratgan tur). */
export async function action({ request, context, params }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const id = Number(params.id);
  const cur = Number.isInteger(id)
    ? await env.DB.prepare('SELECT id, key FROM pc_dimensions WHERE id = ?').bind(id).first<{ id: number; key: string | null }>()
    : null;
  if (!cur) return json({ error: 'dimension_not_found' }, { status: 404 });

  if (request.method === 'PUT') {
    const input = parseBody(await request.json().catch(() => null), parsePcDimensionInput);
    if (input instanceof Response) return input;
    const { results } = await env.DB.prepare('SELECT id FROM pc_dimension_values WHERE dimension_id = ?').bind(id).all<{ id: number }>();
    const existing = results.map((r) => r.id);
    // Begona turning qiymatini shu yo'l bilan "qayta nomlab" olib bo'lmasin.
    if (input.values.some((v) => v.id !== null && !existing.includes(v.id))) return json({ error: 'value_not_in_dimension' }, { status: 400 });
    const kept = input.values.flatMap((v) => (v.id === null ? [] : [v.id]));
    const removed = existing.filter((x) => !kept.includes(x));
    // Tartib: avval o'chirish (eski yorliq bo'shaydi), keyin yangilash, keyin qo'shish — UNIQUE(dimension_id, label) buzilmasin.
    await env.DB.batch([
      env.DB.prepare('UPDATE pc_dimensions SET name = ?, name_ru = ?, slots = ?, is_active = ? WHERE id = ?')
        .bind(input.name, input.nameRu, JSON.stringify(input.slots), input.active ? 1 : 0, id),
      ...removed.flatMap((v) => [
        env.DB.prepare('DELETE FROM pc_part_values WHERE value_id = ?').bind(v),
        env.DB.prepare('DELETE FROM pc_dimension_values WHERE id = ?').bind(v),
      ]),
      ...input.values.map((v, i) => (v.id === null
        ? env.DB.prepare('INSERT INTO pc_dimension_values (dimension_id, label, sort_order) VALUES (?, ?, ?)').bind(id, v.label, (i + 1) * 10)
        : env.DB.prepare('UPDATE pc_dimension_values SET label = ?, sort_order = ? WHERE id = ?').bind(v.label, (i + 1) * 10, v.id))),
    ]);
    return json(await readDimensionList(env));
  }

  if (request.method === 'DELETE') {
    if (cur.key !== null) return json({ error: 'dimension_protected' }, { status: 400 });
    await env.DB.batch([
      env.DB.prepare('DELETE FROM pc_part_values WHERE value_id IN (SELECT id FROM pc_dimension_values WHERE dimension_id = ?)').bind(id),
      env.DB.prepare('DELETE FROM pc_dimension_values WHERE dimension_id = ?').bind(id),
      env.DB.prepare('DELETE FROM pc_dimensions WHERE id = ?').bind(id),
    ]);
    return json(await readDimensionList(env));
  }

  return json({ error: 'method_not_allowed' }, { status: 405 });
}
```

- [ ] **Step 4: `app/routes/api.admin.pc-parts.tsx`**
```ts
import type { Route } from './+types/api.admin.pc-parts';
import type { ApiPcPart } from '../../shared/types';
import { json } from '../../functions/lib/db';
import { readConfigRows, readDimensions, readPartValues } from '../../functions/lib/pc-db';
import { parsePcPartsInput } from '../../functions/lib/validate';
import type { SqlStatement } from '../../functions/env';
import { PC_SLOTS, groupValues, partGroups, suggestValues, type PartGroup, type PcDimension } from '../../shared/pc-compat';
import { requireAdmin, parseBody } from './api.admin.guard';

const toApiPart = (g: PartGroup, byProduct: Map<string, number[]>, dims: PcDimension[]): ApiPcPart => ({
  id: g.rep.id, ids: g.ids, slot: g.slot, name: g.rep.name.trim(), image: g.rep.image_url, inStock: g.inStock,
  values: groupValues(g.ids, byProduct, dims), suggested: suggestValues(g.slot, g.rep.name, dims),
});

/**
 * Konfigurator qismlari admin uchun. `?slot=` — bo'g'in jadvali (saytdagi to'plam: yashirilganlar yo'q);
 * `?product=` — bitta mahsulot guruhi (mahsulot tahriri; "Konfiguratorda ko'rsatilmasin" belgilangani ham).
 */
export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const url = new URL(request.url);
  const productId = url.searchParams.get('product');
  const slot = url.searchParams.get('slot');
  if (!productId && !PC_SLOTS.some((s) => s.key === slot)) return json({ error: 'slots_invalid' }, { status: 400 });
  const [rows, byProduct, dims] = await Promise.all([readConfigRows(env, { includeHidden: !!productId }), readPartValues(env), readDimensions(env)]);
  const groups = partGroups(rows);
  if (productId) {
    const g = groups.find((x) => x.ids.includes(productId));
    return g ? json(toApiPart(g, byProduct, dims)) : json({ error: 'part_not_found' }, { status: 404 });
  }
  return json(groups.filter((g) => g.slot === slot).map((g) => toApiPart(g, byProduct, dims)).sort((a, b) => a.name.localeCompare(b.name)));
}

/** Qiymatlarni yozish: har element — bitta qism guruhining (hamma dublikat qatorlarining) bitta turdagi qiymatlari almashtiriladi. */
export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  if (request.method !== 'PUT') return json({ error: 'method_not_allowed' }, { status: 405 });
  const input = parseBody(await request.json().catch(() => null), parsePcPartsInput);
  if (input instanceof Response) return input;
  const [rows, dims] = await Promise.all([readConfigRows(env, { includeHidden: true }), readDimensions(env)]);
  const groupOf = new Map<string, PartGroup>();
  for (const g of partGroups(rows)) for (const id of g.ids) groupOf.set(id, g);

  const stmts: SqlStatement[] = [];
  for (const item of input.items) {
    const g = groupOf.get(item.productId);
    if (!g) return json({ error: 'part_not_found' }, { status: 400 });
    const d = dims.find((x) => x.id === item.dimensionId);
    if (!d) return json({ error: 'dimension_not_found' }, { status: 400 });
    if (!d.slots.includes(g.slot)) return json({ error: 'slot_not_in_dimension' }, { status: 400 });
    const own = d.values.map((v) => v.id);
    if (item.valueIds.some((v) => !own.includes(v))) return json({ error: 'value_not_in_dimension' }, { status: 400 });
    for (const pid of g.ids) {
      stmts.push(env.DB.prepare('DELETE FROM pc_part_values WHERE product_id = ? AND value_id IN (SELECT id FROM pc_dimension_values WHERE dimension_id = ?)').bind(pid, d.id));
      for (const v of item.valueIds) stmts.push(env.DB.prepare('INSERT OR IGNORE INTO pc_part_values (product_id, value_id) VALUES (?, ?)').bind(pid, v));
    }
  }
  await env.DB.batch(stmts);
  return json({ ok: true, updated: input.items.length });
}
```

- [ ] **Step 5: Route'larni ro'yxatga qo'shing** — `app/routes.ts`, `api/admin/reviews/:id` qatoridan keyin:
```ts
  route('api/admin/pc-dimensions', 'routes/api.admin.pc-dimensions.tsx'),
  route('api/admin/pc-dimensions/:id', 'routes/api.admin.pc-dimensions.$id.tsx'),
  route('api/admin/pc-parts', 'routes/api.admin.pc-parts.tsx'),
```

- [ ] **Step 6: Bosh sahifa sanog'i**

`shared/types.ts` — `ApiDashboard`ga (`needsImage`dan keyin):
```ts
  /** Konfigurator: faol moslik turlarida qiymati tasdiqlanmagan — saytdagi konfiguratorda ko'rinmaydigan qism guruhlari. */
  configuratorUntagged: number;
```
`app/routes/api.admin.dashboard.tsx` — importlar:
```ts
import { readConfigRows, readDimensions, readPartValues } from '../../functions/lib/pc-db';
import { countUntagged } from '../../shared/pc-compat';
```
`Promise.all` ro'yxatining oxiriga `readConfigRows(env), readPartValues(env), readDimensions(env),` qo'shib, destrukturani `[needsImage, newOrders, newApplications, settings, billz, pcRows, pcValues, pcDims]` qiling; `body`ga:
```ts
    configuratorUntagged: countUntagged(pcRows, pcValues, pcDims),
```

- [ ] **Step 7: Tekshiring**

Run: `bun run lint && bun run test` → yashil (typegen yangi route'lar uchun `+types` yaratadi).

Dev serverda admin sessiyasi bilan (brauzer, `/admin`ga kirgan holda) konsoldan:
```js
await (await fetch('/api/admin/pc-dimensions')).json()
```
Expected: 2 ta tur, `missing` > 0. Keyin:
```js
const parts = await (await fetch('/api/admin/pc-parts?slot=cpu')).json(); parts.slice(0, 2)
```
Expected: `values: {}`, `suggested` to'ldirilgan (masalan `{1:[..],2:[..]}`).

- [ ] **Step 8: Commit**

```bash
git add functions/lib/pc-db.ts app/routes/api.admin.pc-dimensions.tsx app/routes/api.admin.pc-dimensions.\$id.tsx app/routes/api.admin.pc-parts.tsx app/routes.ts shared/types.ts app/routes/api.admin.dashboard.tsx
git commit -m "feat(admin): konfigurator moslik turlari va qism qiymatlari API

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Admin klienti va sof yordamchilar

**Files:**
- Modify: `src/admin/api.ts` (yangi bo'lim, "Tovar turlari"dan keyin)
- Create: `src/admin/lib/pc-parts.ts`, `src/admin/lib/pc-parts.test.ts`

**Interfaces:**
- Consumes: Task 5 tiplari (`ApiPcDimension`, `ApiPcPart`, `PcPartWrite`, `PcDimensionInput`), Task 6 endpoint'lari.
- Produces:
  - `api.ts`: `listPcDimensions(): Promise<ApiPcDimension[]>`, `createPcDimension(input: PcDimensionInput)`, `updatePcDimension(id: number, input: PcDimensionInput)`, `deletePcDimension(id: number)` — uchalasi `Promise<ApiPcDimension[]>`; `listPcParts(slot: SlotKey): Promise<ApiPcPart[]>`, `getPcPart(productId: string): Promise<ApiPcPart>`, `setPcPartValues(items: PcPartWrite[]): Promise<{ ok: true; updated: number }>`.
  - `lib/pc-parts.ts`: `type PartFilter = 'all' | 'untagged' | 'tagged'`, `PART_FILTERS`, `dimsForSlot(slot, dims)`, `isUntagged(part, dims)`, `filterParts(parts, dims, filter, q)`, `acceptSuggestions(parts, dims): { items: PcPartWrite[]; confirmed: number; skipped: number }`, `assignValues(parts, dim, valueIds): PcPartWrite[]`, `toggleValue(current, valueId): number[]`, `dimToForm(dim | null): PcDimensionInput`, `addValue(values, label)`.

- [ ] **Step 1: Yiqiladigan test** — `src/admin/lib/pc-parts.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { ApiPcPart } from '../../../shared/types';
import type { PcDimension } from '../../../shared/pc-compat';
import { acceptSuggestions, addValue, assignValues, dimToForm, dimsForSlot, filterParts, isUntagged, toggleValue } from './pc-parts';

const SOCKET: PcDimension = { id: 1, key: 'socket', name: 'Soket', nameRu: '', slots: ['cpu', 'mb'], active: true, values: [{ id: 12, label: 'AM5' }, { id: 14, label: 'LGA1700' }] };
const MEMORY: PcDimension = { id: 2, key: 'memory', name: 'Xotira turi', nameRu: '', slots: ['cpu', 'mb', 'ram'], active: true, values: [{ id: 21, label: 'DDR4' }, { id: 22, label: 'DDR5' }] };
const FORM: PcDimension = { id: 3, key: null, name: 'Form-faktor', nameRu: '', slots: ['mb', 'case'], active: false, values: [{ id: 31, label: 'ATX' }] };
const DIMS = [SOCKET, MEMORY, FORM];
const part = (o: Partial<ApiPcPart>): ApiPcPart => ({ id: 'p', ids: ['p'], slot: 'cpu', name: 'AMD Ryzen 7 9800X3D', image: '', inStock: true, values: {}, suggested: {}, ...o });

describe('dimsForSlot / isUntagged', () => {
  it("bo'g'inga tegishli turlar (nofaollari ham)", () => {
    expect(dimsForSlot('mb', DIMS).map((d) => d.id)).toEqual([1, 2, 3]);
    expect(dimsForSlot('gpu', DIMS)).toEqual([]);
  });
  it('biror turda qiymat yo\'q → belgilanmagan', () => {
    expect(isUntagged(part({ values: { 1: [12], 2: [22] } }), DIMS)).toBe(false);
    expect(isUntagged(part({ values: { 1: [12] } }), DIMS)).toBe(true);
    expect(isUntagged(part({ slot: 'mb', values: { 1: [12], 2: [22] } }), DIMS)).toBe(true);
  });
});

describe('filterParts', () => {
  const list = [
    part({ id: 'a', name: 'AMD Ryzen 7 9800X3D', values: { 1: [12], 2: [22] } }),
    part({ id: 'b', name: 'Intel Core i5 14400F' }),
  ];
  it('holat filtri va ko\'p so\'zli qidiruv', () => {
    expect(filterParts(list, DIMS, 'all', '').map((p) => p.id)).toEqual(['a', 'b']);
    expect(filterParts(list, DIMS, 'untagged', '').map((p) => p.id)).toEqual(['b']);
    expect(filterParts(list, DIMS, 'tagged', '').map((p) => p.id)).toEqual(['a']);
    expect(filterParts(list, DIMS, 'all', '14400 i5').map((p) => p.id)).toEqual(['b']);
  });
});

describe('acceptSuggestions', () => {
  it("faqat qiymati yo'q turlarga taklif yoziladi; taklifsiz qism skipped", () => {
    const res = acceptSuggestions([
      part({ id: 'a', suggested: { 1: [12], 2: [22] } }),
      part({ id: 'b', values: { 1: [14] }, suggested: { 1: [12], 2: [21, 22] } }),
      part({ id: 'c', suggested: { 1: [14] } }),
      part({ id: 'd', values: { 1: [12], 2: [22] }, suggested: { 1: [12], 2: [22] } }),
    ], DIMS);
    expect(res.items).toEqual([
      { productId: 'a', dimensionId: 1, valueIds: [12] },
      { productId: 'a', dimensionId: 2, valueIds: [22] },
      { productId: 'b', dimensionId: 2, valueIds: [21, 22] },
      { productId: 'c', dimensionId: 1, valueIds: [14] },
    ]);
    expect(res.confirmed).toBe(3);
    expect(res.skipped).toBe(1);
  });
});

describe('assignValues / toggleValue', () => {
  it("faqat tur bo'g'iniga tegishli qismlar", () => {
    expect(assignValues([part({ id: 'a' }), part({ id: 'k', slot: 'case' })], SOCKET, [12])).toEqual([{ productId: 'a', dimensionId: 1, valueIds: [12] }]);
    expect(assignValues([part({ id: 'a' })], SOCKET, [])).toEqual([{ productId: 'a', dimensionId: 1, valueIds: [] }]);
  });
  it("chip: qo'shadi yoki olib tashlaydi", () => {
    expect(toggleValue([12], 14)).toEqual([12, 14]);
    expect(toggleValue([12, 14], 12)).toEqual([14]);
  });
});

describe('dimToForm / addValue', () => {
  it("tahrir formasi: mavjud tur yoki bo'sh yangi tur", () => {
    expect(dimToForm({ ...FORM, missing: 4 })).toEqual({ name: 'Form-faktor', nameRu: '', slots: ['mb', 'case'], active: false, values: [{ id: 31, label: 'ATX' }] });
    expect(dimToForm(null)).toEqual({ name: '', nameRu: '', slots: [], active: false, values: [] });
  });
  it("qiymat qo'shish: probel kesiladi, bo'sh va katta-kichik harfsiz takror e'tiborsiz", () => {
    const vals = [{ id: 31, label: 'ATX' }];
    expect(addValue(vals, ' mATX ')).toEqual([{ id: 31, label: 'ATX' }, { id: null, label: 'mATX' }]);
    expect(addValue(vals, 'atx')).toBe(vals);
    expect(addValue(vals, '  ')).toBe(vals);
  });
});
```

- [ ] **Step 2: Yiqilishini ko'ring**

Run: `bunx vitest run src/admin/lib/pc-parts.test.ts`
Expected: FAIL — `./pc-parts` topilmadi.

- [ ] **Step 3: `src/admin/lib/pc-parts.ts`**
```ts
import type { ApiPcDimension, ApiPcPart, PcDimensionInput, PcPartWrite } from '../../../shared/types';
import type { PcDimension, SlotKey } from '../../../shared/pc-compat';

export type PartFilter = 'all' | 'untagged' | 'tagged';
export const PART_FILTERS: readonly PartFilter[] = ['all', 'untagged', 'tagged'];

/** Bo'g'inga tegishli turlar — faol va nofaol (admin yangi turni yoqishdan oldin to'ldiradi). Jadval ustunlari shular. */
export function dimsForSlot(slot: SlotKey, dims: PcDimension[]): PcDimension[] {
  return dims.filter((d) => d.slots.includes(slot));
}

/** Belgilanmagan: bo'g'ini kirgan biror turda tasdiqlangan qiymati yo'q. */
export function isUntagged(part: ApiPcPart, dims: PcDimension[]): boolean {
  return dimsForSlot(part.slot, dims).some((d) => (part.values[d.id]?.length ?? 0) === 0);
}

/** Holat filtri + ko'p so'zli qidiruv (har so'z nomda, tartibdan qat'i nazar). */
export function filterParts(parts: ApiPcPart[], dims: PcDimension[], filter: PartFilter, q: string): ApiPcPart[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  return parts.filter((p) =>
    (filter === 'all' || (filter === 'untagged') === isUntagged(p, dims)) && words.every((w) => p.name.toLowerCase().includes(w)));
}

/**
 * «Taklifni tasdiqlash»: har qismning qiymati yo'q turlariga nomdan taklif yoziladi (tasdiqlangan qiymat
 * almashtirilmaydi). `confirmed` — kamida bitta yozuv olgan qismlar, `skipped` — qaysidir turda taklifi yo'qlar.
 */
export function acceptSuggestions(parts: ApiPcPart[], dims: PcDimension[]): { items: PcPartWrite[]; confirmed: number; skipped: number } {
  const items: PcPartWrite[] = [];
  let skipped = 0;
  for (const p of parts) {
    let gap = false;
    for (const d of dimsForSlot(p.slot, dims)) {
      if ((p.values[d.id]?.length ?? 0) > 0) continue;
      const s = p.suggested[d.id] ?? [];
      if (s.length === 0) { gap = true; continue; }
      items.push({ productId: p.id, dimensionId: d.id, valueIds: s });
    }
    if (gap) skipped++;
  }
  return { items, confirmed: new Set(items.map((i) => i.productId)).size, skipped };
}

/** «Qiymat berish» / «Tozalash» (`valueIds = []`): faqat tur bog'laydigan bo'g'indagi qismlar. */
export function assignValues(parts: ApiPcPart[], dim: PcDimension, valueIds: number[]): PcPartWrite[] {
  return parts.filter((p) => dim.slots.includes(p.slot)).map((p) => ({ productId: p.id, dimensionId: dim.id, valueIds }));
}

/** Chip bosildi: qiymat bor bo'lsa olib tashlanadi, yo'q bo'lsa qo'shiladi. */
export function toggleValue(current: number[], valueId: number): number[] {
  return current.includes(valueId) ? current.filter((v) => v !== valueId) : [...current, valueId];
}

/** Tur tahriri formasi; null — yangi tur. */
export function dimToForm(dim: ApiPcDimension | null): PcDimensionInput {
  return dim
    ? { name: dim.name, nameRu: dim.nameRu, slots: [...dim.slots], active: dim.active, values: dim.values.map((v) => ({ id: v.id, label: v.label })) }
    : { name: '', nameRu: '', slots: [], active: false, values: [] };
}

/** Yangi qiymat yorlig'i: bo'sh yoki (katta-kichik harfsiz) takror bo'lsa ro'yxat o'zgarmaydi (o'sha massiv qaytadi). */
export function addValue(values: PcDimensionInput['values'], label: string): PcDimensionInput['values'] {
  const l = label.trim();
  if (!l || values.some((v) => v.label.toLowerCase() === l.toLowerCase())) return values;
  return [...values, { id: null, label: l }];
}
```

- [ ] **Step 4: Test o'tishini ko'ring**

Run: `bunx vitest run src/admin/lib/pc-parts.test.ts`
Expected: PASS.

- [ ] **Step 5: Klient** — `src/admin/api.ts`, `shared/types` importiga `ApiPcDimension, ApiPcPart, PcDimensionInput, PcPartWrite,` va `import type { SlotKey } from '../../shared/pc-compat';` qo'shib, "Tovar turlari" bo'limidan keyin:
```ts
// ── Konfigurator mosligi ────────────────────────────────────────────────────
export async function listPcDimensions(): Promise<ApiPcDimension[]> {
  return handle(await fetch('/api/admin/pc-dimensions'));
}
export async function createPcDimension(input: PcDimensionInput): Promise<ApiPcDimension[]> {
  return handle(await fetch('/api/admin/pc-dimensions', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input),
  }));
}
export async function updatePcDimension(id: number, input: PcDimensionInput): Promise<ApiPcDimension[]> {
  return handle(await fetch(`/api/admin/pc-dimensions/${id}`, {
    method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input),
  }));
}
export async function deletePcDimension(id: number): Promise<ApiPcDimension[]> {
  return handle(await fetch(`/api/admin/pc-dimensions/${id}`, { method: 'DELETE' }));
}
export async function listPcParts(slot: SlotKey): Promise<ApiPcPart[]> {
  return handle(await fetch(`/api/admin/pc-parts?slot=${slot}`));
}
export async function getPcPart(productId: string): Promise<ApiPcPart> {
  return handle(await fetch(`/api/admin/pc-parts?product=${encodeURIComponent(productId)}`));
}
export async function setPcPartValues(items: PcPartWrite[]): Promise<{ ok: true; updated: number }> {
  return handle(await fetch('/api/admin/pc-parts', {
    method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items }),
  }));
}
```

- [ ] **Step 6: Tekshiring va commit**

Run: `bun run lint && bun run test` → yashil.
```bash
git add src/admin/api.ts src/admin/lib/pc-parts.ts src/admin/lib/pc-parts.test.ts
git commit -m "feat(admin): konfigurator mosligi klienti va sof yordamchilar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Admin — Mahsulotlar → «Konfigurator» tabi

**Files:**
- Create: `src/admin/PcValueChips.tsx`, `src/admin/PcDimensionModal.tsx`, `src/admin/screens/ConfiguratorScreen.tsx`
- Modify: `src/admin/nav.ts` (products tablari), `src/admin/AdminApp.tsx` (`screenFor`)
- Modify: `src/admin/i18n/uz/shell.ts`, `ru/shell.ts` (`nav.products.configurator`); `src/admin/i18n/uz/products.ts`, `ru/products.ts` (`configurator` bloki)

**Interfaces:**
- Consumes: Task 7 (`api.ts` funksiyalari, `lib/pc-parts.ts`), Task 2 (`PC_SLOTS`, `PcDimension`, `PartValues`, `SlotKey`).
- Produces: `PcValueChips` — `FC<{ dims: PcDimension[]; values: PartValues; suggested?: PartValues; disabled?: boolean; suggestionLabel: string; onToggle: (dimensionId: number, valueId: number) => void }>` (Task 9 ham ishlatadi); i18n `products:configurator.*` (Task 9 `configurator.suggestion`ni ishlatadi).

- [ ] **Step 1: i18n** — `src/admin/i18n/uz/products.ts` (root obyektga, `productEdit`dan oldin):
```ts
  configurator: {
    dimsTitle: 'Moslik turlari',
    dimsDesc: "Ikki qism shu tur bo'yicha kamida bitta umumiy qiymatga ega bo'lsa — mos. «Saytda tekshiriladi» yoqilgan turlar konfiguratorda ishlaydi.",
    newDim: 'Yangi tur',
    missing_one: '{{count}} ta qism belgilanmagan',
    missing_few: '{{count}} ta qism belgilanmagan',
    missing_many: '{{count}} ta qism belgilanmagan',
    missing_other: '{{count}} ta qism belgilanmagan',
    missingNone: 'Hamma qism belgilangan',
    activeLabel: 'Saytda tekshiriladi',
    activateTitle: 'Tur yoqilsinmi?',
    activateMessage: "{{count}} ta qismda bu turning qiymati yo'q — yoqilgach ular konfiguratorda ko'rinmay qoladi.",
    activateConfirm: 'Yoqish',
    editTitle: 'Moslik turi',
    nameLabel: "Nomi (o'zbekcha)",
    nameRuLabel: 'Nomi (ruscha)',
    slotsLabel: "Qaysi bo'g'inlarni bog'laydi",
    slotsHint: "Kamida ikkita. Tanlangan bo'g'inlardagi qismlar shu tur bo'yicha solishtiriladi.",
    valuesLabel: 'Qiymatlar',
    valuePlaceholder: 'Masalan, AM5',
    addValue: "Qo'shish",
    removeValue: '{{label}} qiymatini olib tashlash',
    removeUsedTitle: 'Qiymat olib tashlansinmi?',
    removeUsedMessage: "Qaysi qismlarda belgilangan bo'lsa, saqlaganingizda ulardan ham olib tashlanadi.",
    deleteDim: "Turni o'chirish",
    deleteTitle: "Tur o'chirilsinmi?",
    deleteMessage: "Uning hamma qiymatlari va qismlardagi belgilari o'chadi. Qaytarib bo'lmaydi.",
    protectedHint: "Soket va Xotira turini o'chirib bo'lmaydi.",
    newDimHint: "Yangi tur saytda tekshirilmaydi — avval qismlarni belgilang, keyin ro'yxatda yoqing.",
    partsTitle: 'Qismlar',
    partsDesc: "Punktirli chip — tovar nomidan taklif. Saytda faqat tasdiqlangan qiymat hisobga olinadi; belgilanmagan qism konfiguratorda ko'rinmaydi.",
    slotLabel: "Bo'g'in",
    filterLabel: 'Holat',
    filterAll: 'Hammasi',
    filterUntagged: 'Belgilanmagan',
    filterTagged: 'Tasdiqlangan',
    search: "Nom bo'yicha qidirish…",
    inStock: 'Omborda',
    onOrder: 'Buyurtma asosida',
    suggestion: 'taklif',
    selectPart: '{{name}} — tanlash',
    selectAll: 'Hammasini belgilash ({{count}})',
    clearSelection: 'Belgini olib tashlash',
    selected_one: '{{count}} ta tanlandi',
    selected_few: '{{count}} ta tanlandi',
    selected_many: '{{count}} ta tanlandi',
    selected_other: '{{count}} ta tanlandi',
    acceptSuggestions: 'Taklifni tasdiqlash',
    assign: 'Qiymat berish',
    accepted: '{{done}} ta qism tasdiqlandi',
    acceptedSkipped: "{{done}} ta qism tasdiqlandi, {{skipped}} tasida taklif yo'q — ularga «Qiymat berish» bilan qo'ying",
    nothingToAccept: "Tanlanganlarda tasdiqlanadigan taklif yo'q",
    assignTitle: 'Qiymat berish',
    assignHint: "Tanlangan {{count}} ta qismga yoziladi; shu tur bo'yicha avvalgi qiymati almashtiriladi.",
    assignApply: 'Berish',
    assignClear: 'Tozalash',
    saved: 'Saqlandi',
    partTitle: 'Moslik qiymatlari',
    partHint: 'Bosilgan qiymat darhol saqlanadi.',
    done: 'Tayyor',
    emptyParts: "Bu bo'g'inda qism yo'q",
    emptyFiltered: "Filtrga mos qism yo'q",
    noDims: "Moslik turi yo'q — «Yangi tur» bilan yarating",
    slots: { cpu: 'Protsessor', mb: 'Ona plata', ram: 'Operativ xotira', gpu: 'Videokarta', psu: 'Quvvat bloki', ssd: 'SSD disk', case: 'Korpus' },
  },
```
`src/admin/i18n/ru/products.ts` (xuddi shu joyga):
```ts
  configurator: {
    dimsTitle: 'Типы совместимости',
    dimsDesc: 'Две детали совместимы, если у них есть хотя бы одно общее значение этого типа. В конфигураторе работают типы с включённой проверкой.',
    newDim: 'Новый тип',
    missing_one: '{{count}} деталь не отмечена',
    missing_few: '{{count}} детали не отмечены',
    missing_many: '{{count}} деталей не отмечено',
    missing_other: '{{count}} детали не отмечены',
    missingNone: 'Все детали отмечены',
    activeLabel: 'Проверяется на сайте',
    activateTitle: 'Включить тип?',
    activateMessage: 'У {{count}} деталей нет значения этого типа — после включения они пропадут из конфигуратора.',
    activateConfirm: 'Включить',
    editTitle: 'Тип совместимости',
    nameLabel: 'Название (узбекский)',
    nameRuLabel: 'Название (русский)',
    slotsLabel: 'Какие звенья связывает',
    slotsHint: 'Минимум два. Детали выбранных звеньев сравниваются по этому типу.',
    valuesLabel: 'Значения',
    valuePlaceholder: 'Например, AM5',
    addValue: 'Добавить',
    removeValue: 'Убрать значение {{label}}',
    removeUsedTitle: 'Убрать значение?',
    removeUsedMessage: 'Если оно отмечено у деталей, при сохранении оно будет снято и с них.',
    deleteDim: 'Удалить тип',
    deleteTitle: 'Удалить тип?',
    deleteMessage: 'Будут удалены все его значения и отметки у деталей. Отменить нельзя.',
    protectedHint: 'Типы «Сокет» и «Тип памяти» удалить нельзя.',
    newDimHint: 'Новый тип не проверяется на сайте — сначала отметьте детали, затем включите его в списке.',
    partsTitle: 'Детали',
    partsDesc: 'Пунктирный чип — предложение по названию товара. На сайте учитываются только подтверждённые значения; неотмеченная деталь в конфигураторе не показывается.',
    slotLabel: 'Звено',
    filterLabel: 'Статус',
    filterAll: 'Все',
    filterUntagged: 'Не отмечены',
    filterTagged: 'Подтверждены',
    search: 'Поиск по названию…',
    inStock: 'В наличии',
    onOrder: 'Под заказ',
    suggestion: 'предложение',
    selectPart: 'Выбрать: {{name}}',
    selectAll: 'Выбрать все ({{count}})',
    clearSelection: 'Снять выбор',
    selected_one: 'Выбрана {{count}}',
    selected_few: 'Выбрано {{count}}',
    selected_many: 'Выбрано {{count}}',
    selected_other: 'Выбрано {{count}}',
    acceptSuggestions: 'Подтвердить предложения',
    assign: 'Задать значение',
    accepted: 'Подтверждено деталей: {{done}}',
    acceptedSkipped: 'Подтверждено деталей: {{done}}; у {{skipped}} нет предложения — задайте значение вручную',
    nothingToAccept: 'У выбранных деталей нет предложений для подтверждения',
    assignTitle: 'Задать значение',
    assignHint: 'Будет записано выбранным деталям ({{count}}); прежнее значение этого типа заменится.',
    assignApply: 'Задать',
    assignClear: 'Очистить',
    saved: 'Сохранено',
    partTitle: 'Значения совместимости',
    partHint: 'Нажатое значение сохраняется сразу.',
    done: 'Готово',
    emptyParts: 'В этом звене нет деталей',
    emptyFiltered: 'Нет деталей по фильтру',
    noDims: 'Типов совместимости нет — создайте «Новый тип»',
    slots: { cpu: 'Процессор', mb: 'Материнская плата', ram: 'Оперативная память', gpu: 'Видеокарта', psu: 'Блок питания', ssd: 'SSD', case: 'Корпус' },
  },
```
`src/admin/i18n/uz/shell.ts` — `nav.products`ga `configurator: 'Konfigurator'`; `ru/shell.ts` — `configurator: 'Конфигуратор'`.

- [ ] **Step 2: `src/admin/PcValueChips.tsx`**
```tsx
import type { FC } from 'react';
import type { PartValues, PcDimension } from '../../shared/pc-compat';

/**
 * Tur bo'yicha qiymat chiplari (Konfigurator tabi va mahsulot tahriri). Tasdiqlangan — to'ldirilgan;
 * tur bo'yicha hali qiymat yo'q bo'lsa nomdan taklif — punktir chegara va "taklif" yozuvi. Bosish — `onToggle`.
 */
const PcValueChips: FC<{
  dims: PcDimension[];
  values: PartValues;
  suggested?: PartValues;
  disabled?: boolean;
  suggestionLabel: string;
  onToggle: (dimensionId: number, valueId: number) => void;
}> = ({ dims, values, suggested = {}, disabled, suggestionLabel, onToggle }) => (
  <div className="flex flex-col gap-4">
    {dims.map((d) => {
      const chosen = values[d.id] ?? [];
      return (
        <div key={d.id} className="flex flex-col gap-2">
          <span className="text-label font-medium text-muted">{d.name}</span>
          <div className="flex flex-wrap gap-2">
            {d.values.map((v) => {
              const on = chosen.includes(v.id);
              const hint = chosen.length === 0 && (suggested[d.id] ?? []).includes(v.id);
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={disabled}
                  aria-pressed={on}
                  onClick={() => onToggle(d.id, v.id)}
                  className={`press h-11 rounded-full border px-4 text-para disabled:opacity-50 ${
                    on ? 'border-accent bg-accent text-bg' : hint ? 'border-dashed border-muted-3 text-primary' : 'border-line text-muted'
                  }`}
                >
                  {v.label}
                  {hint && <span className="ml-1 text-label text-muted-2">· {suggestionLabel}</span>}
                </button>
              );
            })}
          </div>
        </div>
      );
    })}
  </div>
);

export default PcValueChips;
```

- [ ] **Step 3: `src/admin/PcDimensionModal.tsx`**
```tsx
import { useState } from 'react';
import type { FC } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ApiPcDimension, PcDimensionInput } from '../../shared/types';
import { PC_SLOTS } from '../../shared/pc-compat';
import Modal from '../store/Modal';
import { createPcDimension, deletePcDimension, updatePcDimension } from './api';
import { errText } from './errText';
import { addValue, dimToForm } from './lib/pc-parts';
import { Button, Field, Input } from './ui';
import { useConfirm } from './ui/confirm';
import { useToast } from './ui/toast';

/**
 * Moslik turi tahriri / yaratish. Yangi tur nofaol yaratiladi (server ham shunday qiladi) — faolligi ro'yxatdagi
 * almashtirgichda. Ota komponent `key` bilan qayta yaratadi, shuning uchun forma holati har ochilishda yangi.
 * Chip guruhlari `Field` ichida emas — `Field` `<label>` chizadi, ichidagi tugma label bosilganda "bosilib" ketardi.
 */
const PcDimensionModal: FC<{
  open: boolean;
  dim: ApiPcDimension | null;
  onClose: () => void;
  onExited: () => void;
  onSaved: (list: ApiPcDimension[]) => void;
}> = ({ open, dim, onClose, onExited, onSaved }) => {
  const { t } = useTranslation('products');
  const toast = useToast();
  const confirm = useConfirm();
  const [rawForm, setForm] = useState(dimToForm(dim));
  const [rawLabel, setLabel] = useState('');
  const [rawBusy, setBusy] = useState(false);
  const form = rawForm as PcDimensionInput;
  const label = rawLabel as string;
  const busy = rawBusy as boolean;

  const toggleSlot = (key: PcDimensionInput['slots'][number]) =>
    setForm({ ...form, slots: form.slots.includes(key) ? form.slots.filter((s) => s !== key) : [...form.slots, key] });
  const add = () => { setForm({ ...form, values: addValue(form.values, label) }); setLabel(''); };
  const removeValue = async (i: number) => {
    const v = form.values[i];
    if (v.id !== null && !(await confirm({ title: t('configurator.removeUsedTitle'), message: t('configurator.removeUsedMessage'), destructive: true, confirmLabel: t('shared.delete') }))) return;
    setForm({ ...form, values: form.values.filter((_, j) => j !== i) });
  };

  const save = async () => {
    setBusy(true);
    try {
      // Yozilib qolgan, lekin «Qo'shish» bosilmagan qiymat ham saqlanadi.
      const input: PcDimensionInput = { ...form, values: addValue(form.values, label) };
      onSaved(dim ? await updatePcDimension(dim.id, input) : await createPcDimension(input));
      toast(t('configurator.saved'));
      onClose();
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!dim || !(await confirm({ title: t('configurator.deleteTitle'), message: t('configurator.deleteMessage'), destructive: true, confirmLabel: t('shared.delete') }))) return;
    setBusy(true);
    try {
      onSaved(await deletePcDimension(dim.id));
      onClose();
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} label={t('configurator.editTitle')} onClose={onClose} onExited={onExited} panelClass="max-w-lg">
      <div className="flex flex-col gap-5 p-6">
        <h2 className="text-copy font-semibold text-primary">{t('configurator.editTitle')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('configurator.nameLabel')} required>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          </Field>
          <Field label={t('configurator.nameRuLabel')}>
            <Input value={form.nameRu} onChange={(v) => setForm({ ...form, nameRu: v })} />
          </Field>
        </div>

        <div>
          <span className="mb-1.5 block text-label font-medium text-muted">{t('configurator.slotsLabel')}</span>
          <div className="flex flex-wrap gap-2">
            {PC_SLOTS.map(({ key }) => {
              const on = form.slots.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleSlot(key)}
                  className={`press h-11 rounded-full border px-4 text-para ${on ? 'border-accent bg-accent text-bg' : 'border-line text-muted'}`}
                >
                  {t(`configurator.slots.${key}`)}
                </button>
              );
            })}
          </div>
          <span className="mt-1 block text-label text-muted-2">{t('configurator.slotsHint')}</span>
        </div>

        <div>
          <span className="mb-1.5 block text-label font-medium text-muted">{t('configurator.valuesLabel')}</span>
          <div className="flex flex-wrap gap-2">
            {form.values.map((v, i) => (
              <span key={`${v.id ?? 'new'}-${v.label}`} className="inline-flex h-9 items-center gap-1 rounded-full bg-fill-2 pl-3 pr-1 text-para text-primary">
                {v.label}
                <button
                  type="button"
                  aria-label={t('configurator.removeValue', { label: v.label })}
                  onClick={() => removeValue(i)}
                  className="press grid size-7 place-items-center rounded-full text-muted-2 hover:text-danger"
                >
                  <X aria-hidden className="size-4" />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Input value={label} onChange={setLabel} placeholder={t('configurator.valuePlaceholder')} />
            <Button variant="secondary" onClick={add} disabled={!label.trim()}>{t('configurator.addValue')}</Button>
          </div>
        </div>

        {!dim && <p className="text-label text-muted-2">{t('configurator.newDimHint')}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {dim && dim.key === null
            ? <Button variant="destructive" onClick={remove} disabled={busy}>{t('configurator.deleteDim')}</Button>
            : <span className="text-label text-muted-2">{dim ? t('configurator.protectedHint') : ''}</span>}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>{t('common:cancel')}</Button>
            <Button onClick={save} disabled={busy}>{t('shared.save')}</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PcDimensionModal;
```

- [ ] **Step 4: `src/admin/screens/ConfiguratorScreen.tsx`**
```tsx
import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { ApiPcDimension, ApiPcPart, PcPartWrite } from '../../../shared/types';
import { PC_SLOTS, type PcDimension, type SlotKey } from '../../../shared/pc-compat';
import Modal from '../../store/Modal';
import { listPcDimensions, listPcParts, setPcPartValues, updatePcDimension } from '../api';
import { errText } from '../errText';
import { acceptSuggestions, assignValues, dimsForSlot, filterParts, PART_FILTERS, toggleValue, type PartFilter } from '../lib/pc-parts';
import PcDimensionModal from '../PcDimensionModal';
import PcValueChips from '../PcValueChips';
import { Badge, Button, Card, DataTable, EmptyState, SearchInput, Segmented, Skeleton, Toggle, type Column } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

/** Ommaviy «Qiymat berish» oynasi: tur va qiymat(lar) tanlanadi — «Berish» yoki «Tozalash». */
const AssignForm: FC<{ dims: PcDimension[]; count: number; busy: boolean; onApply: (dim: PcDimension, valueIds: number[]) => void; onCancel: () => void }> = ({
  dims, count, busy, onApply, onCancel,
}) => {
  const { t } = useTranslation('products');
  const [rawDimId, setDimId] = useState(dims[0]?.id ?? 0);
  const [rawIds, setIds] = useState([] as number[]);
  const dimId = rawDimId as number;
  const ids = rawIds as number[];
  const dim = dims.find((d) => d.id === dimId) ?? dims[0];
  if (!dim) return null;
  return (
    <div className="flex flex-col gap-5 p-6">
      <div>
        <h2 className="text-copy font-semibold text-primary">{t('configurator.assignTitle')}</h2>
        <p className="mt-1 text-para text-muted">{t('configurator.assignHint', { count })}</p>
      </div>
      {dims.length > 1 && (
        <Segmented label={t('configurator.dimsTitle')} value={String(dim.id)} onChange={(v) => { setDimId(Number(v)); setIds([]); }}
          options={dims.map((d) => ({ id: String(d.id), label: d.name }))} />
      )}
      <PcValueChips dims={[dim]} values={{ [dim.id]: ids }} suggestionLabel="" onToggle={(_, v) => setIds(toggleValue(ids, v))} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="quiet" onClick={onCancel}>{t('common:cancel')}</Button>
        <Button variant="secondary" onClick={() => onApply(dim, [])} disabled={busy}>{t('configurator.assignClear')}</Button>
        <Button onClick={() => onApply(dim, ids)} disabled={busy || ids.length === 0}>{t('configurator.assignApply')}</Button>
      </div>
    </div>
  );
};

/**
 * Mahsulotlar → Konfigurator: moslik turlari (yaratish, qiymatlar, yoqish) va bo'g'in bo'yicha qismlar jadvali
 * (taklif, ommaviy tasdiqlash, qiymat berish). Filtrlar URL'da: `slot`, `f`, `q`.
 */
const ConfiguratorScreen: FC = () => {
  const { t } = useTranslation('products');
  const toast = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const [rawDims, setDims] = useState(null as ApiPcDimension[] | null);
  const [rawParts, setParts] = useState(null as ApiPcPart[] | null);
  const [rawSel, setSel] = useState([] as string[]);
  const [rawBusy, setBusy] = useState(false);
  const [rawError, setError] = useState('');
  const [rawDimModal, setDimModal] = useState({ open: false, dim: null as ApiPcDimension | null, n: 0 });
  const [rawPart, setPart] = useState(null as ApiPcPart | null);
  const [rawPartOpen, setPartOpen] = useState(false);
  const [rawAssignOpen, setAssignOpen] = useState(false);
  const dims = rawDims as ApiPcDimension[] | null;
  const parts = rawParts as ApiPcPart[] | null;
  const selected = rawSel as string[];
  const busy = rawBusy as boolean;
  const error = rawError as string;
  const dimModal = rawDimModal as { open: boolean; dim: ApiPcDimension | null; n: number };
  const editPart = rawPart as ApiPcPart | null;
  const partOpen = rawPartOpen as boolean;
  const assignOpen = rawAssignOpen as boolean;

  // Faqat biror turga kirgan bo'g'inlar — qolganlarida belgilaydigan narsa yo'q.
  const slots = PC_SLOTS.map((s) => s.key).filter((k) => (dims ?? []).some((d) => d.slots.includes(k)));
  const rawSlot = params.get('slot') as SlotKey | null;
  const slot: SlotKey | undefined = rawSlot && slots.includes(rawSlot) ? rawSlot : slots[0];
  const rawF = params.get('f') as PartFilter | null;
  const filter: PartFilter = rawF && PART_FILTERS.includes(rawF) ? rawF : 'all';
  const q = params.get('q') ?? '';
  const slotDims = slot && dims ? dimsForSlot(slot, dims) : [];
  const visible = parts && dims ? filterParts(parts, dims, filter, q) : [];

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };
  const reloadDims = () => listPcDimensions().then(setDims).catch(() => setError(t('shared.loadError')));
  useEffect(() => { reloadDims(); }, []);
  useEffect(() => {
    if (!slot) return;
    setParts(null);
    setSel([]);
    listPcParts(slot).then(setParts).catch((e) => toast(errText(e), 'error'));
  }, [slot]);

  const write = async (items: PcPartWrite[], message: string) => {
    setBusy(true);
    try {
      await setPcPartValues(items);
      toast(message);
      setSel([]);
      if (slot) setParts(await listPcParts(slot));
      reloadDims();
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const chosen = () => (parts ?? []).filter((p) => selected.includes(p.id));
  const accept = () => {
    const { items, confirmed, skipped } = acceptSuggestions(chosen(), dims ?? []);
    if (items.length === 0) { toast(t('configurator.nothingToAccept'), 'error'); return; }
    write(items, skipped > 0 ? t('configurator.acceptedSkipped', { done: confirmed, skipped }) : t('configurator.accepted', { done: confirmed }));
  };
  const assign = async (dim: PcDimension, valueIds: number[]) => {
    await write(assignValues(chosen(), dim, valueIds), t('configurator.saved'));
    setAssignOpen(false);
  };

  const toggleActive = async (d: ApiPcDimension, on: boolean) => {
    if (on && d.missing > 0 && !(await confirm({
      title: t('configurator.activateTitle'), message: t('configurator.activateMessage', { count: d.missing }), confirmLabel: t('configurator.activateConfirm'),
    }))) return;
    try {
      setDims(await updatePcDimension(d.id, { name: d.name, nameRu: d.nameRu, slots: d.slots, active: on, values: d.values.map((v) => ({ id: v.id, label: v.label })) }));
    } catch (e) {
      toast(errText(e), 'error');
    }
  };

  const togglePartValue = async (p: ApiPcPart, dimId: number, valueId: number) => {
    const next = toggleValue(p.values[dimId] ?? [], valueId);
    setBusy(true);
    try {
      await setPcPartValues([{ productId: p.id, dimensionId: dimId, valueIds: next }]);
      const updated: ApiPcPart = { ...p, values: { ...p.values, [dimId]: next } };
      setPart(updated);
      setParts((parts ?? []).map((x) => (x.id === p.id ? updated : x)));
      reloadDims();
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (error) return <EmptyState title={t('shared.loadErrorTitle')} text={error} />;
  if (!dims) return <Skeleton rows={6} />;

  const valueCell = (d: PcDimension, p: ApiPcPart) => {
    const own = p.values[d.id] ?? [];
    const sug = p.suggested[d.id] ?? [];
    const labels = (ids: number[]) => d.values.filter((v) => ids.includes(v.id)).map((v) => v.label);
    if (own.length > 0) return <span className="flex flex-wrap gap-1">{labels(own).map((l) => <Badge key={l}>{l}</Badge>)}</span>;
    if (sug.length > 0) {
      return (
        <span className="inline-flex items-center rounded-full border border-dashed border-muted-3 px-2 py-0.5 text-label text-primary">
          {labels(sug).join(' / ')} <span className="ml-1 text-muted-2">· {t('configurator.suggestion')}</span>
        </span>
      );
    }
    return <span className="text-muted-2">—</span>;
  };

  const columns: Column<ApiPcPart>[] = [
    {
      id: 'sel', label: '', className: 'w-10',
      cell: (p) => (
        <input
          type="checkbox"
          checked={selected.includes(p.id)}
          onChange={() => setSel(selected.includes(p.id) ? selected.filter((x) => x !== p.id) : [...selected, p.id])}
          aria-label={t('configurator.selectPart', { name: p.name })}
          className="size-5 accent-accent"
        />
      ),
    },
    {
      id: 'img', label: '', className: 'w-14', mobile: 'hide',
      cell: (p) => (
        <span className="grid size-10 place-items-center overflow-hidden rounded-xs border border-line bg-white">
          {p.image && <img src={p.image} alt="" loading="lazy" className="h-full w-full object-contain" />}
        </span>
      ),
    },
    {
      id: 'name', label: t('shared.name'), mobile: 'title',
      cell: (p) => (
        <span className="flex flex-col">
          <span className="text-primary">{p.name}</span>
          <span className="text-label text-muted-2">{p.inStock ? t('configurator.inStock') : t('configurator.onOrder')}</span>
        </span>
      ),
    },
    ...slotDims.map((d): Column<ApiPcPart> => ({ id: `d${d.id}`, label: d.name, cell: (p) => valueCell(d, p) })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <Card
        title={t('configurator.dimsTitle')}
        description={t('configurator.dimsDesc')}
        actions={<Button variant="secondary" onClick={() => setDimModal({ open: true, dim: null, n: dimModal.n + 1 })}>{t('configurator.newDim')}</Button>}
      >
        {dims.length === 0 ? <p className="py-3 text-para text-muted-2">{t('configurator.noDims')}</p> : (
          <ul className="divide-y divide-line">
            {dims.map((d) => (
              <li key={d.id} className="flex items-center gap-4 py-3">
                <button type="button" onClick={() => setDimModal({ open: true, dim: d, n: dimModal.n + 1 })} className="press flex min-w-0 flex-1 flex-col items-start gap-1.5 text-left">
                  <span className="text-copy text-primary">{d.name}</span>
                  <span className="text-label text-muted-2">{d.slots.map((s) => t(`configurator.slots.${s}`)).join(' ↔ ')}</span>
                  <span className="flex flex-wrap gap-1">{d.values.map((v) => <Badge key={v.id}>{v.label}</Badge>)}</span>
                  <span className={`text-label ${d.missing > 0 ? 'font-medium text-primary' : 'text-muted-2'}`}>
                    {d.missing > 0 ? t('configurator.missing', { count: d.missing }) : t('configurator.missingNone')}
                  </span>
                </button>
                <Toggle on={d.active} onChange={(v) => toggleActive(d, v)} label={t('configurator.activeLabel')} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {slot && (
        <Card title={t('configurator.partsTitle')} description={t('configurator.partsDesc')}>
          <div className="flex flex-col gap-4">
            <Segmented label={t('configurator.slotLabel')} value={slot} onChange={(v) => setParam('slot', v)}
              options={slots.map((s) => ({ id: s, label: t(`configurator.slots.${s}`) }))} />
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Segmented label={t('configurator.filterLabel')} value={filter} onChange={(v) => setParam('f', v === 'all' ? '' : v)}
                options={[{ id: 'all', label: t('configurator.filterAll') }, { id: 'untagged', label: t('configurator.filterUntagged') }, { id: 'tagged', label: t('configurator.filterTagged') }]} />
              <div className="md:ml-auto md:w-72"><SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder={t('configurator.search')} /></div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selected.length === 0 ? (
                <Button variant="quiet" onClick={() => setSel(visible.map((p) => p.id))} disabled={visible.length === 0}>
                  {t('configurator.selectAll', { count: visible.length })}
                </Button>
              ) : (
                <>
                  <span className="text-para text-primary">{t('configurator.selected', { count: selected.length })}</span>
                  <Button onClick={accept} disabled={busy}>{t('configurator.acceptSuggestions')}</Button>
                  <Button variant="secondary" onClick={() => setAssignOpen(true)} disabled={busy}>{t('configurator.assign')}</Button>
                  <Button variant="quiet" onClick={() => setSel([])}>{t('configurator.clearSelection')}</Button>
                </>
              )}
            </div>
            {parts === null ? <Skeleton rows={6} /> : (
              <DataTable
                columns={columns}
                rows={visible}
                rowKey={(p) => p.id}
                onRowClick={(p) => { setPart(p); setPartOpen(true); }}
                empty={<EmptyState title={parts.length === 0 ? t('configurator.emptyParts') : t('configurator.emptyFiltered')} />}
              />
            )}
          </div>
        </Card>
      )}

      <PcDimensionModal
        key={dimModal.n}
        open={dimModal.open}
        dim={dimModal.dim}
        onClose={() => setDimModal({ ...dimModal, open: false })}
        onExited={() => {}}
        onSaved={(list) => { setDims(list); if (slot) listPcParts(slot).then(setParts).catch(() => {}); }}
      />

      <Modal open={partOpen} label={t('configurator.partTitle')} onClose={() => setPartOpen(false)} onExited={() => setPart(null)} panelClass="max-w-lg">
        {editPart && (
          <div className="flex flex-col gap-5 p-6">
            <div>
              <h2 className="text-copy font-semibold text-primary">{editPart.name}</h2>
              <p className="mt-1 text-para text-muted">{t('configurator.partHint')}</p>
            </div>
            <PcValueChips dims={slotDims} values={editPart.values} suggested={editPart.suggested} disabled={busy}
              suggestionLabel={t('configurator.suggestion')} onToggle={(dimId, valueId) => togglePartValue(editPart, dimId, valueId)} />
            <div className="flex justify-end"><Button variant="secondary" onClick={() => setPartOpen(false)}>{t('configurator.done')}</Button></div>
          </div>
        )}
      </Modal>

      <Modal open={assignOpen} label={t('configurator.assignTitle')} onClose={() => setAssignOpen(false)} panelClass="max-w-lg">
        <AssignForm dims={slotDims} count={selected.length} busy={busy} onApply={assign} onCancel={() => setAssignOpen(false)} />
      </Modal>
    </div>
  );
};

export default ConfiguratorScreen;
```
(`accent-accent` — Tailwind `accent-color` utilitasi `accent` tokenidan; native checkbox rangi mavzuga ergashadi.)

- [ ] **Step 5: Navigatsiya va ekran** — `src/admin/nav.ts`, `products` tablarida `models`dan keyin (`Cpu` lucide importiga qo'shiladi):
```ts
      { id: 'configurator', segment: 'configurator', labelKey: 'nav.products.configurator', Icon: Cpu },
```
`src/admin/AdminApp.tsx` — import `import ConfiguratorScreen from './screens/ConfiguratorScreen';` va `screenFor`ga (`products/models`dan keyin):
```tsx
    case 'products/configurator': return <ConfiguratorScreen />;
```

- [ ] **Step 6: Brauzerda tekshiring**

Run: `bun run lint && bun run test` → yashil.

`preview_start dev` → admin'ga kiring → Mahsulotlar → Konfigurator (`/admin/products/configurator`). Tekshiring:
1. "Moslik turlari" — Soket (Protsessor ↔ Ona plata, 5 chip) va Xotira turi, "N ta qism belgilanmagan", ikkalasida almashtirgich yoqilgan.
2. Qismlar: Protsessor segmenti, punktirli taklif chiplari; "Belgilanmagan" filtri → «Hammasini belgilash» → «Taklifni tasdiqlash» → toast, filtr bo'shaydi (taklifsizlari qoladi), tur kartasidagi son kamayadi.
3. Taklifsiz qatorni bosing → oyna, AM5 chipini bosing → saqlanadi; oynani yoping → jadvalda AM5 to'liq chip.
4. "Yangi tur" → "Form-faktor", Ona plata + Korpus, ATX qiymati → Saqlash: ro'yxatda nofaol; almashtirgichni yoqing → tasdiq oynasi "N ta qismda…" → Bekor qilish.
5. Form-faktorni oching → «Turni o'chirish» → tasdiq → ro'yxatdan yo'qoladi. Soketni ochganda o'chirish tugmasi yo'q, "Soket va Xotira turini o'chirib bo'lmaydi".
6. Telefon kengligi (`resize_window mobile`): jadval kartalarga aylanadi, belgilash katakchasi bosiladi.
7. `/category/pc` (sayt): tasdiqlangan CPU/plata/RAM bilan konfigurator chiqadi; mos kelmagan plata kulrang, sabab "Soket AM5 bo'lishi kerak".
8. Admin tilini RU qiling — ekran ruscha, konsolda i18next "missing key" yo'q.

Tekshiruvdan keyin lokal bazadagi sinov belgilarini qoldirish mumkin (lokal ma'lumot).

- [ ] **Step 7: Commit**

```bash
git add src/admin/PcValueChips.tsx src/admin/PcDimensionModal.tsx src/admin/screens/ConfiguratorScreen.tsx src/admin/nav.ts src/admin/AdminApp.tsx src/admin/i18n/uz/products.ts src/admin/i18n/ru/products.ts src/admin/i18n/uz/shell.ts src/admin/i18n/ru/shell.ts
git commit -m "feat(admin): Mahsulotlar → Konfigurator — moslik turlari va qismlarni tasdiqlash

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Mahsulot tahriridagi chiplar va bosh sahifa kartasi

**Files:**
- Create: `src/admin/PcPartValues.tsx`
- Modify: `src/admin/screens/ProductEdit.tsx` ("Konfigurator" kartasi)
- Modify: `src/admin/screens/Dashboard.tsx`
- Modify: `src/admin/i18n/uz/products.ts`, `ru/products.ts` (`productEdit.pc`), `src/admin/i18n/uz/shell.ts`, `ru/shell.ts` (`dashboard.configurator`)

**Interfaces:**
- Consumes: Task 7 (`getPcPart`, `listPcDimensions`, `setPcPartValues`, `dimsForSlot`, `toggleValue`), Task 8 (`PcValueChips`, `products:configurator.suggestion`), Task 6 (`ApiDashboard.configuratorUntagged`).
- Produces: `PcPartValues: FC<{ productId: string }>`.

- [ ] **Step 1: i18n**

`src/admin/i18n/uz/products.ts`, `productEdit.pc`: `desc`ni almashtiring va ikki kalit qo'shing:
```ts
      desc: "Kompyuter konfiguratori. Moslik qiymatlari — shu yerda yoki Mahsulotlar → Konfigurator'da; quvvat bo'sh bo'lsa tovar nomidan aniqlanadi.",
      valuesHint: "Bosilgan qiymat darhol saqlanadi. Punktirli — nomdan taklif; qiymati tasdiqlanmagan qism konfiguratorda ko'rinmaydi.",
      valuesNone: "Bu tovar hozir konfiguratorga tushmaydi (narxi yo'q yoki saytda emas).",
```
`ru/products.ts`:
```ts
      desc: 'Конфигуратор ПК. Значения совместимости — здесь или в «Товары → Конфигуратор»; мощность, если пусто, определяется по названию.',
      valuesHint: 'Нажатое значение сохраняется сразу. Пунктир — предложение по названию; деталь без подтверждённых значений не показывается в конфигураторе.',
      valuesNone: 'Этот товар сейчас не попадает в конфигуратор (нет цены или не на сайте).',
```
`src/admin/i18n/uz/shell.ts`, `dashboard`ga (`needsImage`dan keyin):
```ts
    configurator: {
      label: 'Konfigurator qismlari',
      note: "Moslik qiymati tasdiqlanmagan — shuning uchun saytdagi konfiguratorda ko'rinmayapti.",
      zero: 'Konfiguratordagi hamma qismlar tasdiqlangan.',
      action: 'Tasdiqlash',
    },
```
`ru/shell.ts`:
```ts
    configurator: {
      label: 'Детали конфигуратора',
      note: 'Совместимость не подтверждена — поэтому их нет в конфигураторе на сайте.',
      zero: 'Все детали конфигуратора подтверждены.',
      action: 'Подтвердить',
    },
```

- [ ] **Step 2: `src/admin/PcPartValues.tsx`**
```tsx
import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import type { ApiPcDimension, ApiPcPart } from '../../shared/types';
import { getPcPart, listPcDimensions, setPcPartValues } from './api';
import { errText } from './errText';
import { dimsForSlot, toggleValue } from './lib/pc-parts';
import PcValueChips from './PcValueChips';
import { useToast } from './ui/toast';

/**
 * Mahsulot tahriridagi moslik chiplari — Konfigurator tabidagi bilan bir xil; bosish darhol saqlaydi
 * (mahsulot formasining "Saqlash"iga bog'liq emas). Yozuv mahsulotning hamma dublikat qatorlariga tushadi (server).
 */
const PcPartValues: FC<{ productId: string }> = ({ productId }) => {
  const { t } = useTranslation('products');
  const toast = useToast();
  const [rawPart, setPart] = useState(null as ApiPcPart | null);
  const [rawDims, setDims] = useState([] as ApiPcDimension[]);
  const [rawState, setState] = useState('loading' as 'loading' | 'ready' | 'none');
  const [rawBusy, setBusy] = useState(false);
  const part = rawPart as ApiPcPart | null;
  const dims = rawDims as ApiPcDimension[];
  const state = rawState as 'loading' | 'ready' | 'none';
  const busy = rawBusy as boolean;

  useEffect(() => {
    Promise.all([getPcPart(productId), listPcDimensions()])
      .then(([p, d]) => { setPart(p); setDims(d); setState('ready'); })
      .catch(() => setState('none'));
  }, [productId]);

  if (state === 'loading') return null;
  if (state === 'none' || !part) return <p className="py-3 text-para text-muted-2">{t('productEdit.pc.valuesNone')}</p>;
  const slotDims = dimsForSlot(part.slot, dims);
  if (slotDims.length === 0) return null;

  const toggle = async (dimId: number, valueId: number) => {
    const next = toggleValue(part.values[dimId] ?? [], valueId);
    setBusy(true);
    try {
      await setPcPartValues([{ productId: part.id, dimensionId: dimId, valueIds: next }]);
      setPart({ ...part, values: { ...part.values, [dimId]: next } });
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 py-3">
      <p className="text-para text-muted">{t('productEdit.pc.valuesHint')}</p>
      <PcValueChips dims={slotDims} values={part.values} suggested={part.suggested} disabled={busy} suggestionLabel={t('configurator.suggestion')} onToggle={toggle} />
    </div>
  );
};

export default PcPartValues;
```

- [ ] **Step 3: `ProductEdit` kartasi** — `src/admin/screens/ProductEdit.tsx`: import `import PcPartValues from '../PcPartValues';`; "Konfigurator" kartasida `SwitchRow`dan keyin (quvvat grid'idan oldin):
```tsx
              {!isNew && <PcPartValues productId={id} />}
```

- [ ] **Step 4: Bosh sahifa kartasi** — `src/admin/screens/Dashboard.tsx`: lucide importiga `Cpu`; `needsImage` `Stat`idan keyin:
```tsx
          <Stat
            label={t('dashboard.configurator.label')} value={data.configuratorUntagged} Icon={Cpu}
            note={t('dashboard.configurator.note')}
            zero={t('dashboard.configurator.zero')}
            to="/admin/products/configurator?f=untagged" action={t('dashboard.configurator.action')}
          />
```

- [ ] **Step 5: Tekshiring**

Run: `bun run lint && bun run test` → yashil.

Brauzerda: Bosh sahifada "Konfigurator qismlari" kartasi son bilan, "Tasdiqlash" → `/admin/products/configurator?f=untagged`. PC protsessor mahsulotini oching → "Konfigurator" kartasida Soket va Xotira turi chiplari, taklif punktir; chip bosilsa saqlanadi (Konfigurator tabida ham ko'rinadi). "Konfiguratorda ko'rsatilmasin" yoqilgan mahsulotda ham chiplar ishlaydi. Noutbuk (`pc`, tur `noutbuk`) — karta umuman chiqmaydi (avvalgidek).

- [ ] **Step 6: Commit**

```bash
git add src/admin/PcPartValues.tsx src/admin/screens/ProductEdit.tsx src/admin/screens/Dashboard.tsx src/admin/i18n/uz/products.ts src/admin/i18n/ru/products.ts src/admin/i18n/uz/shell.ts src/admin/i18n/ru/shell.ts
git commit -m "feat(admin): mahsulot tahririda moslik chiplari, bosh sahifada belgilanmagan qismlar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Hujjatlar va yakuniy tekshiruv

**Files:**
- Modify: `CLAUDE.md` (PC konfigurator paragrafi, migratsiyalar ro'yxati)
- Modify: `docs/egasi-qollanmasi.md` (yangi bo'lim)

- [ ] **Step 1: `CLAUDE.md`**

"`/category/pc` additionally ends with `PcConfigurator`…" paragrafida "Atributlar (soket, DDR, W) sof `shared/pc-compat.ts`da **tovar nomidan** (chipset/model jadvallari) — Billz'da bunday maydon yo'q; admin tuzatishi `products.pc_socket|pc_memory|pc_watts` (migratsiya `0038`…)" jumlasini shu bilan almashtiring:

> **Moslik admin belgilagan guruhlardan (2026-10-13, spec `docs/superpowers/specs/2026-10-13-pc-moslik-guruhlari-design.md`):** `pc_dimensions` (moslik turi — nom uz/ru, bog'laydigan bo'g'inlar, faol), `pc_dimension_values` (AM5, DDR5…), `pc_part_values` (qism ↔ qiymat) — migratsiya `0044`, seed: Soket (CPU ↔ plata), Xotira turi (CPU, plata, RAM). Qoida bitta: ikki qism faol turda kamida bitta umumiy qiymatga ega bo'lsa — mos (`issueFor`); **qiymati tasdiqlanmagan qism konfiguratorda ko'rinmaydi** (`isTagged`), CPU/plata/RAMdan biri bo'sh bo'lsa bo'lim ham, `PcBuildPromo` ham chiqmaydi (`configuratorReady`). Nom parserlari endi faqat admin ekranidagi **taklif** (`suggestValues`, faqat `key = socket|memory` turlar) va quvvat (`partWatts`, `products.pc_watts` tuzatishi) uchun. Dublikat qatorlar (`partGroups`, `partKey`) qiymatlarni bo'lishadi: o'qishda birlashma, yozishda server guruhning hamma id'lariga yozadi. O'qish `functions/lib/pc-db.ts`da (sayt, admin API, bosh sahifa bitta funksiyalardan). Admin: Mahsulotlar → **Konfigurator** (`ConfiguratorScreen`: turlar kartasi + qismlar jadvali, ommaviy «Taklifni tasdiqlash» / «Qiymat berish»; yangi tur nofaol yaratiladi, yoqishdan oldin tasdiq), `ProductEdit` "Konfigurator" kartasida o'sha chiplar (`PcPartValues`), bosh sahifada "Konfigurator qismlari" kartasi. `products.pc_socket/pc_memory` bazada qoladi, kod ularni o'qimaydi. Billz bu jadvallarga tegmaydi.

"### Data model (SQLite)" ro'yxatining oxiriga (`0043`dan keyin):

> `0044` **PC moslik guruhlari** (`pc_dimensions`, `pc_dimension_values`, `pc_part_values` — admin boshqaradi; seed Soket va Xotira turi; eski `pc_socket`/`pc_memory` tuzatishlari qiymatga ko'chirildi).

- [ ] **Step 2: `docs/egasi-qollanmasi.md`** — "## 3. Narx va dollar kursi"dan keyin yangi bo'lim (keyingi raqamlarni bittaga suring):

```markdown
## 4. Kompyuter konfiguratori — qismlarning mosligi

Saytdagi konfigurator (PC bo'limi pastida) qaysi protsessor qaysi plata va xotira bilan ishlashini **siz belgilagan qiymatlardan** biladi. Qiymati tasdiqlanmagan qism konfiguratorda ko'rinmaydi.

**Qayerda:** Mahsulotlar → **Konfigurator**.

- **Moslik turlari** — masalan, *Soket* (protsessor ↔ ona plata: AM5, LGA1700…) va *Xotira turi* (protsessor, plata, RAM: DDR4, DDR5). Ikki qism shu turda bir xil qiymatga ega bo'lsa — mos.
- **Qismlar** — bo'g'inni tanlang (Protsessor, Ona plata…). Punktirli chip — tizim tovar nomidan *taklif qilgan* qiymat; u hali saytga ta'sir qilmaydi.

**Tez tasdiqlash:** «Belgilanmagan» filtri → «Hammasini belgilash» → takliflarni ko'zdan kechiring → «Taklifni tasdiqlash». Taklifi yo'q qismlarni belgilab, «Qiymat berish» bilan qiymatni o'zingiz qo'ying. Bitta qismni tuzatish uchun qatorini bosing.

**Yangi tovar** Billz'dan kelsa, u konfiguratorda chiqishi uchun shu yerda tasdiqlanishi kerak — Bosh sahifadagi «Konfigurator qismlari» kartasi nechta qism kutayotganini ko'rsatadi.

**Yangi moslik turi** (masalan, plata va korpus uchun *Form-faktor*: ATX, mATX) — «Yangi tur». U avval o'chiq turadi: qismlarga qiymat bering, keyin ro'yxatda «Saytda tekshiriladi»ni yoqing (aks holda qiymatsiz qismlar konfiguratordan yo'qoladi).
```

- [ ] **Step 3: Yakuniy tekshiruv**

Run: `bun run lint && bun run test && bun run build`
Expected: uchalasi yashil.

`preview_start dev`: `/category/pc` (bir nechta qism tasdiqlangan holda) — konfigurator ishlaydi, mos kelmagan nomzod kulrang va sababli, `/ru/category/pc` — sabab ruscha ("Сокет — нужен AM5"). Konsolda xato yo'q.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md docs/egasi-qollanmasi.md
git commit -m "docs: konfigurator moslik guruhlari — CLAUDE.md va egasi qo'llanmasi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Deploy eslatmasi (plan tashqarisida, egasi bilan)

Push → Coolify migratsiya `0044`ni o'zi qo'llaydi. Shu zahoti saytdagi konfigurator **yashirinadi** (hech qaysi CPU/plata/RAM tasdiqlanmagan). Egasi (yoki uning ruxsati bilan biz) admin → Mahsulotlar → Konfigurator'da uch bo'g'inni tasdiqlaydi (~10–15 daqiqa) — konfigurator qaytadi. Push faqat egasining roziligi bilan.
