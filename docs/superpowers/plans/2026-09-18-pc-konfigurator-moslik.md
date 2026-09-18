# PC konfigurator: moslik va buyurtma asosidagi qismlar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PC konfiguratori qismlar mosligini (soket, DDR, blok quvvati) tekshiradi va omborda yo'q Billz qismlarini ham "Buyurtma asosida" sifatida taklif qiladi.

**Architecture:** Sof modul `shared/pc-compat.ts` qism atributlarini nomdan (admin tuzatishi ustun) chiqaradi va moslik qoidalarini beradi. `loadConfiguratorParts` barcha Billz PC qismlarini (faol va yashirin) bitta so'rovda oladi. `PcConfigurator` moslikni ko'rsatadi va savatga yuboradi. Admin'da `products.pc_*` ustunlari (sinxronizatsiya tegmaydi) orqali tuzatish va yashirish.

**Tech Stack:** React Router v7 SSR, SQLite, vitest, Tailwind v4 tokenlari, lucide-react.

**Spec:** `docs/superpowers/specs/2026-09-18-pc-konfigurator-moslik-design.md`

## Global Constraints

- Strict TypeScript, `any` yo'q; `@types/react` yo'q — `useState<T>` generigi yo'qoladi, qiymatni `as` bilan cast qiling; `key` oladigan komponent `FC<{...}>` uslubida.
- `server/`dan import qilinadigan `shared/` fayllar `.ts` kengaytmali import yozadi. `shared/pc-compat.ts` faqat `./billz.ts`ni import qiladi.
- Komponentlarda hex rang yo'q, `shadow-*` yo'q, `rounded-[Npx]` yo'q, `text-[Npx]` yo'q — tokenlar va shkala (`text-label`…`text-title`, `rounded-xs…xl`).
- Eng kichik shrift 14px (`text-label`).
- Har yangi `locales.ts` kaliti uz **va** ru'da (lint tekshiradi).
- Mavjud migratsiyani o'zgartirmang — yangi `0037`.
- Buyruqlar: `bun run test`, `bunx vitest run <fayl>`, `bun run lint` (lint'da `server/index.ts(72,31) … build/server/index.js` xatosi avvaldan bor — e'tiborsiz; boshqa xato bo'lmasligi kerak).
- Commit formati: `feat:`/`fix:`/`docs:`, oxirida `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

---

## File Structure

| Fayl | Mas'uliyat |
|---|---|
| `shared/pc-compat.ts` (yangi) | Bo'g'inlar ro'yxati, `partAttrs`, `issueFor`, `summaryIssues`, `needsVerify`, `hasMatch`, `recommendedWatts`, `toConfigParts` — sof |
| `shared/pc-compat.test.ts` (yangi) | Yuqoridagilarning testlari (haqiqiy Billz nomlari bilan) |
| `migrations/0037_pc_configurator.sql` (yangi) | `pc_hidden`, `pc_socket`, `pc_memory`, `pc_watts` |
| `shared/types.ts`, `functions/lib/db.ts`, `functions/lib/validate.ts`, `app/routes/api.admin.products.tsx`, `app/routes/api.admin.products.$id.tsx` | Yangi maydonlar API orqali |
| `src/admin/lib/product-form.ts` (+test), `src/admin/screens/ProductEdit.tsx` | "Konfigurator" kartasi |
| `app/lib/loaders.ts`, `app/routes/category.tsx` | `loadConfiguratorParts` |
| `src/store/PcConfigurator.tsx`, `src/locales.ts` | UI |
| `CLAUDE.md` | Hujjat |

---

### Task 1: Qism atributlari (`partAttrs`)

**Files:**
- Create: `shared/pc-compat.ts`
- Test: `shared/pc-compat.test.ts`

**Interfaces:**
- Produces:
  - `type SlotKey = 'cpu' | 'mb' | 'ram' | 'gpu' | 'psu' | 'ssd' | 'case'`
  - `const PC_SLOTS: readonly { key: SlotKey; type: string }[]` (tartib: cpu, mb, ram, gpu, psu, ssd, case; turlar: `cpu`, `motherboard`, `ram`, `gpu`, `psu`, `xotira`, `korpus`)
  - `const PC_SOCKETS = ['LGA1700', 'LGA1851', 'LGA1200', 'AM5', 'AM4'] as const; type PcSocket`
  - `type PcMemory = 'DDR4' | 'DDR5'`
  - `interface PartAttrs { socket: PcSocket | null; memory: PcMemory | null; watts: number | null }`
  - `interface PartOverride { socket: string | null; memory: string | null; watts: number | null }`
  - `function partAttrs(slot: SlotKey, name: string, override?: PartOverride): PartAttrs`
  - `function slotForType(type: string | null): SlotKey | null`

- [ ] **Step 1: Write the failing test** — `shared/pc-compat.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { partAttrs, slotForType } from './pc-compat';

const a = (slot: Parameters<typeof partAttrs>[0], name: string) => partAttrs(slot, name);

describe('partAttrs — CPU', () => {
  it('Intel 12–14 avlod → LGA1700, xotira ikkalasi', () => {
    expect(a('cpu', 'Intel Core i5 12400F')).toEqual({ socket: 'LGA1700', memory: null, watts: 125 });
    expect(a('cpu', 'CPU Intel Core i5  13400F').socket).toBe('LGA1700');
    expect(a('cpu', 'Intel Core i5 13600KF')).toEqual({ socket: 'LGA1700', memory: null, watts: 180 });
    expect(a('cpu', 'Intel Core i9-14900KF').watts).toBe(250);
    expect(a('cpu', 'Intel Core i7 14700F / Silver').watts).toBe(200);
  });
  it('Core Ultra 2xx → LGA1851 + DDR5', () => {
    expect(a('cpu', 'Intel Core Ultra 7 265F')).toEqual({ socket: 'LGA1851', memory: 'DDR5', watts: 200 });
  });
  it('Ryzen 7000/9000 → AM5, 5000 → AM4', () => {
    expect(a('cpu', 'AMD Ryzen 7 9800x3D')).toEqual({ socket: 'AM5', memory: 'DDR5', watts: 150 });
    expect(a('cpu', 'AMD Ryzen 5 5600X')).toEqual({ socket: 'AM4', memory: 'DDR4', watts: 110 });
  });
  it('tanilmagan nom → null', () => {
    expect(a('cpu', 'Noma\'lum protsessor')).toEqual({ socket: null, memory: null, watts: null });
  });
});

describe('partAttrs — plata', () => {
  it('chipset → soket, DDR nomdan yoki soketdan', () => {
    expect(a('mb', 'Gigabyte B760H D3P Plus DDR5')).toEqual({ socket: 'LGA1700', memory: 'DDR5', watts: null });
    expect(a('mb', 'MaxSun Challenger B760M-F DDR4')).toEqual({ socket: 'LGA1700', memory: 'DDR4', watts: null });
    expect(a('mb', 'Asus Prime B760M-A D4')).toEqual({ socket: 'LGA1700', memory: 'DDR4', watts: null });
    expect(a('mb', 'Asus ROG Strix B760-G Gaming WiFi')).toEqual({ socket: 'LGA1700', memory: 'DDR5', watts: null });
    expect(a('mb', 'ASUS Z890 AYW Gaming WiFi')).toEqual({ socket: 'LGA1851', memory: 'DDR5', watts: null });
    expect(a('mb', 'MSI B650 Tomahawk')).toEqual({ socket: 'AM5', memory: 'DDR5', watts: null });
    expect(a('mb', 'Asus TUF B550-Plus')).toEqual({ socket: 'AM4', memory: 'DDR4', watts: null });
    expect(a('mb', 'Asus Prime H610 M-F / Black').socket).toBe('LGA1700');
  });
  it('chipset yo\'q → null', () => {
    expect(a('mb', 'Noma\'lum plata')).toEqual({ socket: null, memory: null, watts: null });
  });
});

describe('partAttrs — RAM, GPU, blok', () => {
  it('RAM: DDR nomdan yoki chastotadan', () => {
    expect(a('ram', 'DDR5 Corsair Vengeance 16GB 6000Mhz').memory).toBe('DDR5');
    expect(a('ram', 'Apacer 8GB 3200Mhz / Black').memory).toBe('DDR4');
    expect(a('ram', 'T-Force 32GB(16*2) 6000Mhz / Black').memory).toBe('DDR5');
    expect(a('ram', 'Kingston 16GB').memory).toBeNull();
  });
  it('GPU: model jadvalidan', () => {
    expect(a('gpu', 'Gigabyte RTX5060 8GB').watts).toBe(145);
    expect(a('gpu', 'PELADN RTX 2060  6GB').watts).toBe(160);
    expect(a('gpu', 'MSI 2060 Super 8GB / Black').watts).toBe(175);
    expect(a('gpu', 'Asus TUF Gaming GeForce RTX3060 12GB / Black').watts).toBe(170);
    expect(a('gpu', 'NVIDIA GeForce RTX 4090').watts).toBe(450);
    expect(a('gpu', 'Sapphire RX 7800 XT').watts).toBe(263);
    expect(a('gpu', 'GPU Intel Arc Pro B70 Graphics Black').watts).toBeNull();
  });
  it('Blok: W yoki nomdagi son', () => {
    expect(a('psu', 'SAMA  B850W Bronze').watts).toBe(850);
    expect(a('psu', 'SAMA K650W 80Plus Bronze, ATX 2.52 Black').watts).toBe(650);
    expect(a('psu', 'PSU SAMA G850 80Plus Gold Black / Black').watts).toBe(850);
    expect(a('psu', 'PSU BEQUITE Dark Power Pro 12 1500W Titanium Black / Black').watts).toBe(1500);
    expect(a('psu', 'PSU Cooler Master MWE 1250W V2 80Plus Gold / Black').watts).toBe(1250);
  });
});

describe('partAttrs — admin tuzatishi ustun', () => {
  it('override qiymati nomdan ustun, noto\'g\'ri qiymat e\'tiborsiz', () => {
    expect(partAttrs('mb', 'Asus ROG Strix B760-G', { socket: null, memory: 'DDR4', watts: null }).memory).toBe('DDR4');
    expect(partAttrs('cpu', 'Noma\'lum', { socket: 'AM5', memory: null, watts: 95 })).toEqual({ socket: 'AM5', memory: 'DDR5', watts: 95 });
    expect(partAttrs('cpu', 'Intel Core i5 12400F', { socket: 'XYZ', memory: null, watts: null }).socket).toBe('LGA1700');
  });
});

describe('slotForType', () => {
  it('tur → bo\'g\'in', () => {
    expect(slotForType('motherboard')).toBe('mb');
    expect(slotForType('korpus')).toBe('case');
    expect(slotForType('noutbuk')).toBeNull();
    expect(slotForType(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run shared/pc-compat.test.ts`
Expected: FAIL — `Failed to resolve import "./pc-compat"`.

- [ ] **Step 3: Write minimal implementation** — `shared/pc-compat.ts`:

```ts
/**
 * PC konfiguratori — qism atributlari va moslik qoidalari (sof; sayt, loader va admin ishlatadi).
 * Billz'da soket/DDR maydoni yo'q, shuning uchun atributlar tovar NOMIDAN chiqariladi;
 * admin tuzatishi (`products.pc_socket|pc_memory|pc_watts`) nomdan ustun turadi.
 * Spec: docs/superpowers/specs/2026-09-18-pc-konfigurator-moslik-design.md
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

export const PC_SOCKETS = ['LGA1700', 'LGA1851', 'LGA1200', 'AM5', 'AM4'] as const;
export type PcSocket = (typeof PC_SOCKETS)[number];
export type PcMemory = 'DDR4' | 'DDR5';

export interface PartAttrs { socket: PcSocket | null; memory: PcMemory | null; watts: number | null }
export interface PartOverride { socket: string | null; memory: string | null; watts: number | null }

export function slotForType(type: string | null): SlotKey | null {
  return PC_SLOTS.find((s) => s.type === type)?.key ?? null;
}

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
  if (/core\s*ultra\s*[3579]\s*2\d\d/.test(n)) return 'LGA1851';
  if (/i[3579][\s-]*1[234]\d{3}/.test(n)) return 'LGA1700';
  if (/i[3579][\s-]*1[01]\d{3}/.test(n)) return 'LGA1200';
  if (/ryzen\s*[3579]\s*[789]\d{3}/.test(n)) return 'AM5';
  if (/ryzen\s*[3579]\s*[345]\d{3}/.test(n)) return 'AM4';
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

function boardSocket(n: string): PcSocket | null {
  for (const m of n.matchAll(/[abhxz]\d{3}/g)) {
    const s = CHIPSETS[m[0]];
    if (s) return s;
  }
  return null;
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
  'rx 9070 xt': 304, 'rx 9070': 220, 'rx 7900 xtx': 355, 'rx 7900 xt': 315, 'rx 7800 xt': 263, 'rx 7700 xt': 245, 'rx 7600': 165,
  'arc b580': 190, 'arc a770': 225,
};

function gpuWatts(n: string): number | null {
  const nv = n.match(/(?:rtx|gtx)?\s*([2345]0[5-9]0)\s*(ti|super)?/);
  if (nv && /rtx|gtx|geforce|\b[2345]0[5-9]0\b|rtx\d/.test(n)) {
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

const asSocket = (v: string | null): PcSocket | null => (PC_SOCKETS as readonly string[]).includes(v ?? '') ? (v as PcSocket) : null;
const asMemory = (v: string | null): PcMemory | null => (v === 'DDR4' || v === 'DDR5' ? v : null);

/** Qism atributlari: admin tuzatishi (to'g'ri qiymat bo'lsa) → nom → null. */
export function partAttrs(slot: SlotKey, name: string, override?: PartOverride): PartAttrs {
  const n = name.toLowerCase();
  const o = override ?? { socket: null, memory: null, watts: null };
  const oWatts = o.watts !== null && o.watts > 0 ? o.watts : null;
  if (slot === 'cpu') {
    const socket = asSocket(o.socket) ?? cpuSocket(n);
    return { socket, memory: asMemory(o.memory) ?? socketMemory(socket), watts: oWatts ?? cpuWatts(n) };
  }
  if (slot === 'mb') {
    const socket = asSocket(o.socket) ?? boardSocket(n);
    // LGA1700 platalar ikkala turda chiqadi; DDR4 versiyasi nomda "D4"/"DDR4" bilan belgilanadi.
    const fallback = socket === 'LGA1700' ? 'DDR5' : socketMemory(socket);
    return { socket, memory: asMemory(o.memory) ?? nameMemory(n) ?? fallback, watts: null };
  }
  if (slot === 'ram') return { socket: null, memory: asMemory(o.memory) ?? ramMemory(n), watts: null };
  if (slot === 'gpu') return { socket: null, memory: null, watts: oWatts ?? gpuWatts(n) };
  if (slot === 'psu') return { socket: null, memory: null, watts: oWatts ?? psuWatts(n) };
  return { socket: null, memory: null, watts: null };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run shared/pc-compat.test.ts`
Expected: PASS. Agar biror naqsh testdagi haqiqiy nomga tushmasa — regex'ni tuzating, testni emas (test nomlari bazadagi haqiqiy Billz nomlari).

- [ ] **Step 5: Commit**

```bash
git add shared/pc-compat.ts shared/pc-compat.test.ts
git commit -m "feat(pc): qism atributlari nomdan — soket, DDR, quvvat

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Moslik qoidalari va qismlar ro'yxati

**Files:**
- Modify: `shared/pc-compat.ts` (oxiriga qo'shish)
- Test: `shared/pc-compat.test.ts` (oxiriga qo'shish)

**Interfaces:**
- Consumes: Task 1 `SlotKey`, `PartAttrs`, `PC_SLOTS`, `partAttrs`, `slotForType`; `nameKey(name: string): string` from `./billz.ts`.
- Produces:
  - `interface Issue { slot: SlotKey; level: 'block' | 'warn'; code: 'socket' | 'memory' | 'power'; need: string }`
  - `type Picked = Partial<Record<SlotKey, PartAttrs>>`
  - `function recommendedWatts(picked: Picked): number | null`
  - `function issueFor(slot: SlotKey, cand: PartAttrs, picked: Picked): Issue | null`
  - `function summaryIssues(picked: Picked): Issue[]`
  - `function needsVerify(slot: SlotKey, attrs: PartAttrs): boolean`
  - `function hasMatch(cpu: PartAttrs, boards: PartAttrs[]): boolean`
  - `interface ConfigPartRow { id: string; name: string; image_url: string; type: string | null; price: number; billz_id: string | null; billz_stock: number | null; is_active: number; pc_socket: string | null; pc_memory: string | null; pc_watts: number | null }`
  - `interface ConfigPart { id: string; name: string; image: string; priceUzs: number; inStock: boolean; attrs: PartAttrs }`
  - `function toConfigParts(rows: ConfigPartRow[]): Partial<Record<SlotKey, ConfigPart[]>>`
  - `const REQUIRED_SLOTS: readonly SlotKey[] = ['cpu', 'mb', 'ram']`

- [ ] **Step 1: Write the failing test** — `shared/pc-compat.test.ts` oxiriga (importni ham kengaytiring: `import { hasMatch, issueFor, needsVerify, partAttrs, recommendedWatts, slotForType, summaryIssues, toConfigParts, type ConfigPartRow } from './pc-compat';`):

```ts
const cpu1700 = partAttrs('cpu', 'Intel Core i5 13600KF');
const cpu1851 = partAttrs('cpu', 'Intel Core Ultra 7 265F');
const b760ddr4 = partAttrs('mb', 'MaxSun Challenger B760M-F DDR4');
const z890 = partAttrs('mb', 'ASUS Z890 AYW Gaming WiFi');
const ddr5 = partAttrs('ram', 'DDR5 Corsair Vengeance 16GB 6000Mhz');
const rtx4090 = partAttrs('gpu', 'NVIDIA GeForce RTX 4090');
const psu650 = partAttrs('psu', 'SAMA K650W 80Plus Bronze');
const psu1250 = partAttrs('psu', 'PSU Cooler Master MWE 1250W V2 80Plus Gold / Black');

describe('issueFor', () => {
  it('soket mos emas → block, ikki tomonga', () => {
    expect(issueFor('mb', b760ddr4, { cpu: cpu1851 })).toEqual({ slot: 'mb', level: 'block', code: 'socket', need: 'LGA1851' });
    expect(issueFor('cpu', cpu1700, { mb: z890 })).toEqual({ slot: 'cpu', level: 'block', code: 'socket', need: 'LGA1851' });
    expect(issueFor('mb', z890, { cpu: cpu1851 })).toBeNull();
  });
  it('xotira: plata yoki (plata yo\'q bo\'lsa) CPU bo\'yicha', () => {
    expect(issueFor('ram', ddr5, { mb: b760ddr4 })).toEqual({ slot: 'ram', level: 'block', code: 'memory', need: 'DDR4' });
    expect(issueFor('mb', b760ddr4, { ram: ddr5 })).toEqual({ slot: 'mb', level: 'block', code: 'memory', need: 'DDR5' });
    expect(issueFor('ram', ddr5, { cpu: cpu1700 })).toBeNull();
    expect(issueFor('ram', partAttrs('ram', 'Apacer 8GB 3200Mhz'), { cpu: cpu1851 })?.need).toBe('DDR5');
  });
  it('noma\'lum atribut → muammo yo\'q', () => {
    expect(issueFor('mb', partAttrs('mb', 'Noma\'lum plata'), { cpu: cpu1851 })).toBeNull();
  });
  it('blok quvvati → warn', () => {
    expect(recommendedWatts({ cpu: cpu1700, gpu: rtx4090 })).toBe(900);
    expect(issueFor('psu', psu650, { cpu: cpu1700, gpu: rtx4090 })).toEqual({ slot: 'psu', level: 'warn', code: 'power', need: '900' });
    expect(issueFor('psu', psu1250, { cpu: cpu1700, gpu: rtx4090 })).toBeNull();
    expect(issueFor('gpu', rtx4090, { cpu: cpu1700, psu: psu650 })?.level).toBe('warn');
    expect(recommendedWatts({})).toBeNull();
  });
});

describe('summaryIssues / needsVerify / hasMatch', () => {
  it('yig\'madagi hamma muammo', () => {
    const list = summaryIssues({ cpu: cpu1851, mb: b760ddr4, ram: ddr5, gpu: rtx4090, psu: psu650 });
    expect(list.map((i) => i.code).sort()).toEqual(['memory', 'power', 'socket']);
    expect(summaryIssues({ cpu: cpu1851, mb: z890, ram: ddr5 })).toEqual([]);
  });
  it('tegishli atribut null → operator tasdiqlaydi', () => {
    expect(needsVerify('mb', partAttrs('mb', 'Noma\'lum'))).toBe(true);
    expect(needsVerify('ram', ddr5)).toBe(false);
    expect(needsVerify('case', partAttrs('case', 'Korpus'))).toBe(false);
  });
  it('CPU uchun mos plata bormi', () => {
    expect(hasMatch(cpu1851, [b760ddr4])).toBe(false);
    expect(hasMatch(cpu1851, [b760ddr4, z890])).toBe(true);
    expect(hasMatch(partAttrs('cpu', 'Noma\'lum'), [b760ddr4])).toBe(true);
  });
});

describe('toConfigParts', () => {
  const row = (o: Partial<ConfigPartRow>): ConfigPartRow => ({
    id: 'x', name: 'Intel Core i5 12400F', image_url: '', type: 'cpu', price: 1000, billz_id: 'b', billz_stock: 1,
    is_active: 1, pc_socket: null, pc_memory: null, pc_watts: null, ...o,
  });
  it('guruhlaydi, omborda bori oldin, keyin narx', () => {
    const out = toConfigParts([
      row({ id: 'a', name: 'Intel Core i7 14700F', price: 5000, billz_stock: 0, is_active: 0 }),
      row({ id: 'b', name: 'Intel Core i5 12400F', price: 3000, billz_stock: 2 }),
      row({ id: 'c', name: 'Intel Core i5 13400F', price: 1000, billz_stock: 0, is_active: 0 }),
      row({ id: 'm', name: 'MSI Z790 Gaming Pro WiFi', type: 'motherboard', price: 4000 }),
      row({ id: 'n', name: 'Lenovo noutbuk', type: 'noutbuk' }),
    ]);
    expect(out.cpu?.map((p) => [p.id, p.inStock])).toEqual([['b', true], ['c', false], ['a', false]]);
    expect(out.mb?.[0].attrs.socket).toBe('LGA1700');
    expect(Object.keys(out).sort()).toEqual(['cpu', 'mb']);
  });
  it('nom bo\'yicha dublikat — omborda bori qoladi; qo\'lda kiritilgan qism faol bo\'lsa omborda', () => {
    const out = toConfigParts([
      row({ id: 'old', name: 'Intel Core i5 12400F ', billz_stock: 0, is_active: 0 }),
      row({ id: 'new', name: 'intel core i5 12400f', billz_stock: 3 }),
      row({ id: 'man', name: 'AMD Ryzen 5 5600X', billz_id: null, billz_stock: null, is_active: 1 }),
    ]);
    expect(out.cpu?.map((p) => p.id)).toEqual(['new', 'man']);
    expect(out.cpu?.[1].inStock).toBe(true);
  });
  it('admin tuzatishi atributga o\'tadi', () => {
    const out = toConfigParts([row({ name: 'Noma\'lum', pc_socket: 'AM5' })]);
    expect(out.cpu?.[0].attrs.socket).toBe('AM5');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run shared/pc-compat.test.ts`
Expected: FAIL — `issueFor is not a function` (yoki eksport yo'q).

- [ ] **Step 3: Write minimal implementation** — `shared/pc-compat.ts` boshiga `import { nameKey } from './billz.ts';`, oxiriga:

```ts
export interface Issue { slot: SlotKey; level: 'block' | 'warn'; code: 'socket' | 'memory' | 'power'; need: string }
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

/** Xotira talabi: plata tanlangan bo'lsa plata, aks holda CPU (LGA1700 → null). */
const memoryNeed = (picked: Picked): PcMemory | null => (picked.mb ? picked.mb.memory : picked.cpu?.memory ?? null);

/** `cand` — `slot` bo'g'inining nomzodi; `picked` — boshqa bo'g'inlardagi tanlovlar (`slot`ning o'zi e'tiborsiz). */
export function issueFor(slot: SlotKey, cand: PartAttrs, picked: Picked): Issue | null {
  const others: Picked = { ...picked, [slot]: undefined };
  if (slot === 'cpu' || slot === 'mb') {
    const other = slot === 'cpu' ? others.mb : others.cpu;
    if (cand.socket && other?.socket && cand.socket !== other.socket) return { slot, level: 'block', code: 'socket', need: other.socket };
  }
  if (slot === 'ram') {
    const need = memoryNeed(others);
    if (cand.memory && need && cand.memory !== need) return { slot, level: 'block', code: 'memory', need };
  }
  if (slot === 'mb' || slot === 'cpu') {
    const ram = others.ram?.memory ?? null;
    const own = cand.memory;
    // CPU faqat plata yo'q bo'lsa RAM bilan solishtiriladi — plata bo'lsa talabni plata belgilaydi.
    if (ram && own && own !== ram && (slot === 'mb' || !others.mb)) return { slot, level: 'block', code: 'memory', need: ram };
  }
  if (slot === 'psu' || slot === 'cpu' || slot === 'gpu') {
    const next: Picked = { ...others, [slot]: cand };
    const need = recommendedWatts(next);
    const psu = next.psu?.watts ?? null;
    if (need !== null && psu !== null && psu < need) return { slot, level: 'warn', code: 'power', need: String(need) };
  }
  return null;
}

/** Yig'madagi barcha muammolar (har juft bir marta: soket — plata, xotira — RAM, quvvat — blok). */
export function summaryIssues(picked: Picked): Issue[] {
  const out: Issue[] = [];
  for (const slot of ['mb', 'ram', 'psu'] as const) {
    const cand = picked[slot];
    if (!cand) continue;
    const i = issueFor(slot, cand, picked);
    if (i) out.push(i);
  }
  // RAM bor, plata yo'q: CPU ↔ RAM xotirasi RAM tomonida allaqachon tekshirildi.
  return out;
}

/** Qismning moslikka kerakli atributi aniqlanmagan → operator tasdiqlaydi. */
export function needsVerify(slot: SlotKey, attrs: PartAttrs): boolean {
  if (slot === 'cpu' || slot === 'mb') return attrs.socket === null;
  if (slot === 'ram') return attrs.memory === null;
  if (slot === 'psu') return attrs.watts === null;
  return false;
}

/** CPU uchun ro'yxatda mos plata bormi (soketi noma'lum CPU yoki plata — mos deb hisoblanadi). */
export function hasMatch(cpu: PartAttrs, boards: PartAttrs[]): boolean {
  if (!cpu.socket) return true;
  return boards.some((b) => b.socket === null || b.socket === cpu.socket);
}

export interface ConfigPartRow {
  id: string; name: string; image_url: string; type: string | null; price: number;
  billz_id: string | null; billz_stock: number | null; is_active: number;
  pc_socket: string | null; pc_memory: string | null; pc_watts: number | null;
}
export interface ConfigPart { id: string; name: string; image: string; priceUzs: number; inStock: boolean; attrs: PartAttrs }

/**
 * Loader qatorlari → bo'g'in bo'yicha qismlar. Omborda: Billz qoldig'i > 0 yoki qo'lda kiritilgan faol tovar.
 * Nom bo'yicha dublikat (sinxronizatsiya eski dublikatni `is_active=0, billz_stock=0` qilib qoldiradi) —
 * omborda bori, keyin faoli saqlanadi. Tartib: omborda bori oldin, keyin arzonroq.
 */
export function toConfigParts(rows: ConfigPartRow[]): Partial<Record<SlotKey, ConfigPart[]>> {
  const best = new Map<string, { row: ConfigPartRow; inStock: boolean; slot: SlotKey }>();
  const rank = (x: { row: ConfigPartRow; inStock: boolean }) => (x.inStock ? 2 : 0) + (x.row.is_active === 1 ? 1 : 0);
  for (const row of rows) {
    const slot = slotForType(row.type);
    if (!slot) continue;
    const inStock = (row.billz_stock ?? 0) > 0 || (row.billz_id === null && row.is_active === 1);
    const key = `${slot}|${nameKey(row.name)}`;
    const cur = best.get(key);
    const cand = { row, inStock, slot };
    if (!cur || rank(cand) > rank(cur)) best.set(key, cand);
  }
  const out: Partial<Record<SlotKey, ConfigPart[]>> = {};
  for (const { row, inStock, slot } of best.values()) {
    const part: ConfigPart = {
      id: row.id, name: row.name.trim(), image: row.image_url, priceUzs: row.price, inStock,
      attrs: partAttrs(slot, row.name, { socket: row.pc_socket, memory: row.pc_memory, watts: row.pc_watts }),
    };
    (out[slot] ??= []).push(part);
  }
  for (const list of Object.values(out)) list?.sort((a, b) => Number(b.inStock) - Number(a.inStock) || a.priceUzs - b.priceUzs);
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run shared/pc-compat.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/pc-compat.ts shared/pc-compat.test.ts
git commit -m "feat(pc): moslik qoidalari va konfigurator qismlari ro'yxati

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: `pc_*` ustunlari — migratsiya, API, admin "Konfigurator" kartasi

**Files:**
- Create: `migrations/0037_pc_configurator.sql`
- Modify: `shared/types.ts` (`ApiProduct`), `functions/lib/db.ts` (`ProductRow`, `rowToProduct`), `functions/lib/validate.ts` (`parseProductInput`), `app/routes/api.admin.products.tsx` (INSERT), `app/routes/api.admin.products.$id.tsx` (UPDATE), `src/admin/lib/product-form.ts`, `src/admin/lib/product-form.test.ts`, `src/admin/screens/ProductEdit.tsx`
- Test: `src/admin/lib/product-form.test.ts`

**Interfaces:**
- Consumes: Task 1 `partAttrs`, `slotForType`, `PC_SOCKETS`.
- Produces: `ApiProduct.pcHidden: boolean`, `pcSocket: string | null`, `pcMemory: string | null`, `pcWatts: number | null`; bazada `products.pc_hidden`, `pc_socket`, `pc_memory`, `pc_watts` (Task 4 loader o'qiydi).

Naqsh — `preorder` maydoni (shu branch'da qo'shilgan): har joyda `preorder` qatorining yonidan joy toping (`grep -n preorder <fayl>`).

- [ ] **Step 1: Migratsiya** — `migrations/0037_pc_configurator.sql`:

```sql
-- PC konfiguratori (spec: docs/superpowers/specs/2026-09-18-pc-konfigurator-moslik-design.md).
-- pc_hidden — egasi eskirgan modelni konfiguratordan chiqaradi; pc_socket/pc_memory/pc_watts —
-- nomdan aniqlangan atributning admin tuzatishi (NULL = avtomatik). Billz sinxronizatsiyasi
-- bu ustunlarga tegmaydi (slug, condition kabi — egasiniki).
ALTER TABLE products ADD COLUMN pc_hidden INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN pc_socket TEXT;
ALTER TABLE products ADD COLUMN pc_memory TEXT;
ALTER TABLE products ADD COLUMN pc_watts INTEGER;
```

- [ ] **Step 2: Tip va mapper**
  - `shared/types.ts` `ApiProduct`ga, `preorder` ostiga:
    ```ts
      /** PC konfiguratorida ko'rsatilmasin (egasi eskirgan modelni chiqaradi). */
      pcHidden: boolean;
      /** Konfigurator atributlarining admin tuzatishi; null — nomdan avtomatik (shared/pc-compat.ts). */
      pcSocket: string | null;
      pcMemory: string | null;
      pcWatts: number | null;
    ```
  - `functions/lib/db.ts` `ProductRow`ga `preorder: number;` ostiga: `pc_hidden: number; pc_socket: string | null; pc_memory: string | null; pc_watts: number | null;`; `rowToProduct`ga `preorder:` ostiga:
    ```ts
        pcHidden: row.pc_hidden === 1,
        pcSocket: row.pc_socket ?? null,
        pcMemory: row.pc_memory ?? null,
        pcWatts: row.pc_watts ?? null,
    ```

- [ ] **Step 3: Validator** — `functions/lib/validate.ts` `parseProductInput`da `const preorder = o.preorder === true;` ostiga:

```ts
  const pcHidden = o.pcHidden === true;
  const PC_SOCKET_SET = ['LGA1700', 'LGA1851', 'LGA1200', 'AM5', 'AM4'];
  const pcSocket = typeof o.pcSocket === 'string' && PC_SOCKET_SET.includes(o.pcSocket) ? o.pcSocket : null;
  const pcMemory = o.pcMemory === 'DDR4' || o.pcMemory === 'DDR5' ? o.pcMemory : null;
  const pcWatts =
    typeof o.pcWatts === 'number' && Number.isInteger(o.pcWatts) && o.pcWatts > 0 && o.pcWatts <= 3000 ? o.pcWatts : null;
```

(`functions/` `shared/`ni import qila oladi, lekin bu ro'yxat 5 ta qiymat — `shared/pc-compat.ts`ni `functions/` tsconfig'iga olib kirmaslik uchun takrorlanadi; izoh bilan: `// shared/pc-compat.ts PC_SOCKETS bilan bir xil`.) Qaytariladigan obyektga `preorder,` ostiga `pcHidden, pcSocket, pcMemory, pcWatts,`.

- [ ] **Step 4: API SQL**
  - `app/routes/api.admin.products.tsx` INSERT: ustunlar ro'yxatiga `preorder,` dan keyin `pc_hidden, pc_socket, pc_memory, pc_watts,`; VALUES'ga 4 ta `?` qo'shing (jami 22 `?` + `unixepoch()`); `.bind(...)`da `input.preorder ? 1 : 0,` ostiga:
    ```ts
        input.pcHidden ? 1 : 0,
        input.pcSocket,
        input.pcMemory,
        input.pcWatts,
    ```
  - `app/routes/api.admin.products.$id.tsx` UPDATE: `preorder=?` dan keyin `, pc_hidden=?, pc_socket=?, pc_memory=?, pc_watts=?`; bind'da `input.preorder ? 1 : 0,` ostiga xuddi shu 4 qator.

- [ ] **Step 5: Forma testi (failing)** — `src/admin/lib/product-form.test.ts`:
  - `detail()` fikstura qatoridagi `preorder: false,` dan keyin: `pcHidden: false, pcSocket: null, pcMemory: null, pcWatts: null,`
  - aylanma testidagi `detail({...})` ichida `preorder: true,` dan keyin: `pcHidden: true, pcSocket: 'AM5', pcMemory: 'DDR5', pcWatts: 650,`
  - kutilgan payload'da `preorder: true,` dan keyin: `pcHidden: true, pcSocket: 'AM5', pcMemory: 'DDR5', pcWatts: 650,`

Run: `bunx vitest run src/admin/lib/product-form.test.ts`
Expected: FAIL — payload'da `pcHidden` yo'q.

- [ ] **Step 6: Forma** — `src/admin/lib/product-form.ts`:
  - `ProductFormState`ga `preorder: boolean;` ostiga: `pcHidden: boolean; pcSocket: string | null; pcMemory: string | null; pcWatts: number | null;`
  - `EMPTY_FORM`da `preorder: false,` dan keyin: `pcHidden: false, pcSocket: null, pcMemory: null, pcWatts: null,`
  - `detailToForm`da `preorder: d.preorder,` dan keyin: `pcHidden: d.pcHidden, pcSocket: d.pcSocket, pcMemory: d.pcMemory, pcWatts: d.pcWatts,`
  - `formToPayload`da `preorder: f.preorder,` dan keyin: `pcHidden: f.pcHidden, pcSocket: f.pcSocket, pcMemory: f.pcMemory, pcWatts: f.pcWatts,`

Run: `bunx vitest run src/admin/lib/product-form.test.ts` → PASS.

- [ ] **Step 7: "Konfigurator" kartasi** — `src/admin/screens/ProductEdit.tsx`:
  - importlar: `import { PC_SOCKETS, partAttrs, slotForType } from '../../../shared/pc-compat';` (nisbiy yo'lni faylning mavjud `shared/` importlariga qarab tekshiring).
  - `Xususiyatlar` kartasidan (`<Card title="Xususiyatlar"`) **keyin**:

```tsx
        {pcSlot && (
          <Card title="Konfigurator" description="Kompyuter konfiguratoridagi moslik. «Avtomatik» — tovar nomidan aniqlangan qiymat.">
            <div className="divide-y divide-line">
              <SwitchRow
                label="Konfiguratorda ko'rsatilmasin"
                hint="Eskirgan yoki keltirib bo'lmaydigan model uchun."
                on={form.pcHidden}
                onChange={(v) => set('pcHidden', v)}
              />
              <div className="grid gap-4 py-3 sm:grid-cols-3">
                {(pcSlot === 'cpu' || pcSlot === 'mb') && (
                  <Field label="Soket">
                    <Select value={form.pcSocket ?? ''} onChange={(v) => set('pcSocket', v || null)}>
                      <option value="">Avtomatik ({autoAttrs.socket ?? 'aniqlanmadi'})</option>
                      {PC_SOCKETS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </Field>
                )}
                {(pcSlot === 'mb' || pcSlot === 'ram') && (
                  <Field label="Xotira turi">
                    <Select value={form.pcMemory ?? ''} onChange={(v) => set('pcMemory', v || null)}>
                      <option value="">Avtomatik ({autoAttrs.memory ?? 'aniqlanmadi'})</option>
                      <option value="DDR4">DDR4</option>
                      <option value="DDR5">DDR5</option>
                    </Select>
                  </Field>
                )}
                {(pcSlot === 'cpu' || pcSlot === 'gpu' || pcSlot === 'psu') && (
                  <Field label={pcSlot === 'psu' ? 'Quvvat, W' : "Iste'mol, W"}>
                    <Input
                      value={form.pcWatts ? String(form.pcWatts) : ''}
                      onChange={(v) => { const n = Number(v.replace(/\D/g, '')); set('pcWatts', n > 0 ? n : null); }}
                      placeholder={autoAttrs.watts ? `Avtomatik: ${autoAttrs.watts}` : 'Aniqlanmadi'}
                    />
                  </Field>
                )}
              </div>
            </div>
          </Card>
        )}
```

  - `const billz = form.billzId !== null;` qatori ostiga:

```tsx
  // PC bo'g'in turlarida — konfigurator kartasi; "Avtomatik" qiymatlar tuzatishsiz, faqat nomdan.
  const pcSlot = form.categoryId === 'pc' ? slotForType(form.type) : null;
  const autoAttrs = pcSlot ? partAttrs(pcSlot, form.name) : { socket: null, memory: null, watts: null };
```

  Karta Billz tovarida ham tahrirlanadi (bu ustunlarga sinxronizatsiya tegmaydi). `Field`, `Select`, `Input`, `SwitchRow`, `Card` allaqachon import qilingan (`../ui`) — yo'q bo'lsa qo'shing.

- [ ] **Step 8: Tekshirish**

Run: `bun run lint` → faqat avvaldan bor `build/server/index.js` xatosi. Boshqa `ApiProduct` fiksturalari (`grep -rn "preorder: false" src app functions shared`) yangi maydonlarsiz lint yiqitsa — ularga ham `pcHidden: false, pcSocket: null, pcMemory: null, pcWatts: null` qo'shing.
Run: `bun run test` → hammasi PASS.
Run: sinov bazasiga migratsiya: `DATA_DIR=<scratchpad>/data node server/migrate.ts` → `✓ 0037_pc_configurator.sql`.

- [ ] **Step 9: Commit**

```bash
git add migrations/0037_pc_configurator.sql shared/types.ts functions/lib/db.ts functions/lib/validate.ts app/routes/api.admin.products.tsx 'app/routes/api.admin.products.$id.tsx' src/admin/lib/product-form.ts src/admin/lib/product-form.test.ts src/admin/screens/ProductEdit.tsx
git commit -m "feat(admin): konfigurator kartasi — yashirish va soket/DDR/quvvat tuzatishi

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Loader — hamma Billz PC qismlari

**Files:**
- Modify: `app/lib/loaders.ts` (yangi `loadConfiguratorParts`; route'ga ulash — Task 5da, komponent props'i bilan birga)

**Interfaces:**
- Consumes: Task 2 `ConfigPartRow`, `ConfigPart`, `toConfigParts`, `PC_SLOTS`, `SlotKey`; Task 3 ustunlari.
- Produces: `loadConfiguratorParts(env: Env): Promise<Partial<Record<SlotKey, ConfigPart[]>>>` (Task 5 `category.tsx`ga ulaydi).

- [ ] **Step 1: Loader** — `app/lib/loaders.ts` `loadProductsBy`dan keyin:

```ts
/**
 * PC konfiguratori qismlari — saytda yashirin bo'lsa ham (qoldiq 0 → "Buyurtma asosida"; rasmsiz qoldiqli).
 * Qo'lda kiritilgan (billz_id yo'q) nofaol mahsulotlar — namuna ma'lumot, chiqmaydi. Xato → {} (bo'lim chiqmaydi).
 */
export async function loadConfiguratorParts(env: Env): Promise<Partial<Record<SlotKey, ConfigPart[]>>> {
  try {
    const types = PC_SLOTS.map((s) => s.type);
    const { results } = await env.DB.prepare(
      `SELECT id, name, image_url, type, COALESCE(
         (SELECT MIN(v.cash_price_uzs) FROM product_variants v WHERE v.product_id = products.id AND v.in_stock = 1),
         cash_price_uzs) AS price,
       billz_id, billz_stock, is_active, pc_socket, pc_memory, pc_watts
       FROM products
       WHERE category_id = 'pc' AND type IN (${types.map(() => '?').join(', ')}) AND pc_hidden = 0
         AND cash_price_uzs > 0 AND (is_active = 1 OR billz_id IS NOT NULL)`,
    ).bind(...types).all<ConfigPartRow>();
    return toConfigParts(results);
  } catch (err) {
    console.error('loadConfiguratorParts fallback:', err);
    return {};
  }
}
```

Import: `import { PC_SLOTS, toConfigParts, type ConfigPart, type ConfigPartRow, type SlotKey } from '../../shared/pc-compat';`

- [ ] **Step 2: Tekshirish** — `bun run lint` (faqat avvaldan bor xato). Sinov bazasida so'rov sonlari:
  `sqlite3 <scratchpad>/data/store.db "select type, count(*) from products where category_id='pc' and type in ('cpu','motherboard','ram','gpu','psu','xotira','korpus') and pc_hidden=0 and cash_price_uzs>0 and (is_active=1 or billz_id is not null) group by type"` — spec'dagi faol + yashirin yig'indiga yaqin.

- [ ] **Step 3: Commit**

```bash
git add app/lib/loaders.ts
git commit -m "feat(pc): konfigurator hamma Billz PC qismlarini oladi

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: `PcConfigurator` — moslik UI

**Files:**
- Modify: `src/store/PcConfigurator.tsx` (qayta yozish), `src/locales.ts`, `app/routes/category.tsx`

**Interfaces:**
- Consumes: Task 2 `ConfigPart`, `SlotKey`, `PC_SLOTS`, `issueFor`, `summaryIssues`, `needsVerify`, `hasMatch`, `REQUIRED_SLOTS`, `type Picked`; Task 4 `parts: Partial<Record<SlotKey, ConfigPart[]>>`.
- Produces: `PcConfigurator: FC<{ t: Translation; locale: Locale; parts: Partial<Record<SlotKey, ConfigPart[]>> }>` (default export).

- [ ] **Step 1: Tarjimalar** — `src/locales.ts`, uz bo'limida `cfgSsd` ostiga (va `cfgHint`ni almashtiring):

```ts
    cfgPsu: "Quvvat bloki",
    cfgCase: "Korpus",
    cfgInStock: "Omborda",
    cfgOnOrder: "Buyurtma asosida",
    cfgApprox: "taxminiy",
    cfgNeedSocket: "{need} soket kerak",
    cfgNeedMemory: "{need} xotira kerak",
    cfgNeedPower: "Kamida {need} W tavsiya etiladi",
    cfgNoBoard: "Mos plata ro'yxatda yo'q",
    cfgVerify: "Moslikni operator tasdiqlaydi",
    cfgAllOk: "Hammasi mos",
    cfgRemoved: "Mos kelmagani uchun olib tashlandi: {slots}",
    cfgOnOrderNote: "Buyurtma asosidagi qismlarning narxi va muddatini operator tasdiqlaydi.",
    cfgMissing: "Kerakli model ro'yxatda yo'qmi? Operator topib beradi",
    cfgClear: "Bekor qilish",
```

`cfgHint: "Buyurtma uchun protsessor, plata va operativ xotirani tanlang.",`

ru bo'limida `cfgSsd` ostiga:

```ts
    cfgPsu: "Блок питания",
    cfgCase: "Корпус",
    cfgInStock: "В наличии",
    cfgOnOrder: "Под заказ",
    cfgApprox: "примерно",
    cfgNeedSocket: "Нужен сокет {need}",
    cfgNeedMemory: "Нужна память {need}",
    cfgNeedPower: "Рекомендуется от {need} Вт",
    cfgNoBoard: "Нет подходящей платы в списке",
    cfgVerify: "Совместимость подтвердит оператор",
    cfgAllOk: "Всё совместимо",
    cfgRemoved: "Убрано из-за несовместимости: {slots}",
    cfgOnOrderNote: "Цену и срок комплектующих под заказ подтвердит оператор.",
    cfgMissing: "Нет нужной модели? Оператор найдёт",
    cfgClear: "Убрать",
```

`cfgHint: "Для заказа выберите процессор, плату и оперативную память.",`

`cfgMb` qiymatini uz'da "Ona plata" ga o'zgartiring (sabab matnlarida "plata" so'zi bilan bir xil bo'lsin).

- [ ] **Step 2: Komponent** — `src/store/PcConfigurator.tsx`ni butunlay almashtiring:

```tsx
import { useState, type FC } from 'react';
import { Link, useNavigate } from 'react-router';
import { Cpu, CircuitBoard, MemoryStick, MonitorPlay, HardDrive, Zap, Box, Check, ChevronRight, AlertTriangle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Translation } from '../locales';
import { localizedPath, type Locale } from '../../app/lib/i18n';
import {
  PC_SLOTS, REQUIRED_SLOTS, hasMatch, issueFor, needsVerify, summaryIssues,
  type ConfigPart, type Issue, type Picked, type SlotKey,
} from '../../shared/pc-compat';
import { useCart } from './CartContext';
import { useCurrency } from './CurrencyContext';
import { SECTION_HEADING, BTN_LG, LINK_MORE } from './ui';

const SLOT_UI: Record<SlotKey, { icon: LucideIcon; label: (t: Translation) => string }> = {
  cpu: { icon: Cpu, label: (t) => t.cfgCpu },
  mb: { icon: CircuitBoard, label: (t) => t.cfgMb },
  ram: { icon: MemoryStick, label: (t) => t.cfgRam },
  gpu: { icon: MonitorPlay, label: (t) => t.cfgGpu },
  psu: { icon: Zap, label: (t) => t.cfgPsu },
  ssd: { icon: HardDrive, label: (t) => t.cfgSsd },
  case: { icon: Box, label: (t) => t.cfgCase },
};

const reason = (t: Translation, i: Issue): string =>
  (i.code === 'socket' ? t.cfgNeedSocket : i.code === 'memory' ? t.cfgNeedMemory : t.cfgNeedPower).replace('{need}', i.need);

/**
 * Kompyuter konfiguratori — hamma Billz PC qismlari: omborda va "Buyurtma asosida" (qoldiq 0, narx taxminiy).
 * Moslik (soket, DDR, blok quvvati) `shared/pc-compat.ts`da; mos kelmaydigan nomzod yashirilmaydi —
 * kulrang va sababi bilan. Tanlov o'zgarib boshqa bo'g'indagi tanlov mos kelmay qolsa, u olib tashlanadi.
 * Yig'ma savatga tushadi (buyurtma asosidagisi `variantLabel` bilan — savat va Telegram'da ko'rinadi).
 */
const PcConfigurator: FC<{ t: Translation; locale: Locale; parts: Partial<Record<SlotKey, ConfigPart[]>> }> = ({ t, locale, parts }) => {
  const slots = PC_SLOTS.map((s) => s.key).filter((k) => (parts[k]?.length ?? 0) > 0);
  const [activeRaw, setActive] = useState(slots[0] ?? 'cpu');
  const [pickedRaw, setPicked] = useState({});
  const [removedRaw, setRemoved] = useState([]);
  const picked = pickedRaw as Partial<Record<SlotKey, ConfigPart>>;
  const removed = removedRaw as SlotKey[];
  const cart = useCart();
  const navigate = useNavigate();
  const { price } = useCurrency();

  if (!REQUIRED_SLOTS.every((k) => slots.includes(k))) return null;
  const active = (slots.includes(activeRaw as SlotKey) ? activeRaw : slots[0]) as SlotKey;
  const attrsOf = (p: Partial<Record<SlotKey, ConfigPart>>): Picked =>
    Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v?.attrs])) as Picked;
  const pickedAttrs = attrsOf(picked);
  const issues = summaryIssues(pickedAttrs);
  const blocked = issues.some((i) => i.level === 'block');
  const complete = REQUIRED_SLOTS.every((k) => picked[k]) && !blocked;
  const total = slots.reduce((sum, k) => sum + (picked[k]?.priceUzs ?? 0), 0);
  const anyOnOrder = slots.some((k) => picked[k] && !picked[k]?.inStock);
  const boards = (parts.mb ?? []).map((b) => b.attrs);

  const choose = (part: ConfigPart) => {
    const next: Partial<Record<SlotKey, ConfigPart>> = { ...picked, [active]: part };
    // Yangi tanlovga endi mos kelmay qolgan boshqa bo'g'inlar olib tashlanadi.
    const dropped: SlotKey[] = [];
    for (const k of slots) {
      const cur = next[k];
      if (k === active || !cur) continue;
      const i = issueFor(k, cur.attrs, attrsOf(next));
      if (i?.level === 'block') { delete next[k]; dropped.push(k); }
    }
    setPicked(next);
    setRemoved(dropped);
    const following = slots.find((k) => k !== active && !next[k]);
    if (following) setActive(following);
  };

  const unpick = (k: SlotKey) => {
    const next = { ...picked };
    delete next[k];
    setPicked(next);
    setRemoved([]);
  };

  const order = () => {
    for (const k of slots) {
      const p = picked[k];
      if (p) cart.add({ productId: p.id, name: p.name, image: p.image, priceUzs: p.priceUzs, variantId: null, variantLabel: p.inStock ? '' : t.cfgOnOrder, qty: 1 });
    }
    navigate(localizedPath(locale, '/savat'));
  };

  const Icon = SLOT_UI[active].icon;
  return (
    <section className="flex flex-col gap-8 md:gap-10">
      <div className="max-w-[680px]">
        <h2 className={SECTION_HEADING}>{t.cfgTitle}</h2>
        <p className="mt-4 text-para text-muted text-pretty md:text-copy">{t.cfgLede}</p>
      </div>

      {/* Bo'g'inlar — gorizontal scroll (mobil), tanlangani belgili */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {slots.map((k) => {
          const S = SLOT_UI[k];
          const on = k === active;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setActive(k)}
              aria-pressed={on}
              className={`press inline-flex h-11 shrink-0 items-center gap-2 rounded-full border-[1.5px] px-5 text-copy ${
                on ? 'border-cta text-primary' : 'border-line text-muted hover:border-muted-3'
              }`}
            >
              <S.icon aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.6} />
              {S.label(t)}
              {picked[k] && <Check aria-hidden className="h-4 w-4 text-verified" strokeWidth={2.4} />}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="rounded-xl bg-surface p-4 md:p-6">
          <h3 className="px-1 text-lede font-semibold">{SLOT_UI[active].label(t)}</h3>
          {removed.length > 0 && (
            <p className="mt-3 px-1 text-label text-new">
              {t.cfgRemoved.replace('{slots}', removed.map((k) => SLOT_UI[k].label(t)).join(', '))}
            </p>
          )}
          <ul className="mt-4 flex max-h-[560px] flex-col gap-2 overflow-y-auto">
            {(parts[active] ?? []).map((part) => {
              const on = picked[active]?.id === part.id;
              const issue = issueFor(active, part.attrs, pickedAttrs);
              const disabled = issue?.level === 'block';
              const noBoard = active === 'cpu' && !hasMatch(part.attrs, boards);
              const note = issue ? reason(t, issue) : noBoard ? t.cfgNoBoard : needsVerify(active, part.attrs) ? t.cfgVerify : '';
              return (
                <li key={part.id}>
                  <button
                    type="button"
                    onClick={() => choose(part)}
                    disabled={disabled}
                    aria-pressed={on}
                    className={`press flex w-full items-center gap-4 rounded-sm border-[1.5px] p-3 text-left ${
                      on ? 'border-cta' : 'border-transparent bg-bg hover:border-muted-3'
                    } disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-transparent`}
                  >
                    <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xs bg-white">
                      {part.image
                        ? <img src={part.image} alt="" loading="lazy" className="h-full w-full object-contain" />
                        : <Icon aria-hidden className="h-6 w-6 text-muted-3" strokeWidth={1.5} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-para font-medium text-primary">{part.name}</span>
                      <span className={`block text-label ${part.inStock ? 'text-verified' : 'text-muted-2'}`}>
                        {part.inStock ? t.cfgInStock : t.cfgOnOrder}
                      </span>
                      {note && (
                        <span className={`block text-label ${issue?.level === 'warn' ? 'text-new' : 'text-muted-2'}`}>{note}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-right text-para font-semibold tabular-nums text-primary">
                      {price(part.priceUzs)}
                      {!part.inStock && <span className="block text-label font-normal text-muted-2">{t.cfgApprox}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <Link to={`${localizedPath(locale, '/')}#konsultatsiya`} className={`${LINK_MORE} mt-4 px-1`}>
            {t.cfgMissing} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Yig'ma */}
        <div className="flex h-fit flex-col rounded-xl bg-surface p-6 lg:sticky lg:top-24">
          <h3 className="text-lede font-semibold">{t.cfgSummary}</h3>
          <dl className="mt-5 flex flex-col divide-y divide-divider">
            {slots.map((k) => {
              const p = picked[k];
              return (
                <div key={k} className="flex flex-col gap-1 py-3 first:pt-0">
                  <dt className="text-label text-muted-2">{SLOT_UI[k].label(t)}</dt>
                  <dd className="flex items-baseline justify-between gap-3 text-para">
                    <span className={p ? 'font-medium' : 'text-disabled-2'}>{p?.name ?? t.cfgNotChosen}</span>
                    {p && (
                      <span className="flex shrink-0 items-baseline gap-2">
                        <span className="tabular-nums text-muted">{price(p.priceUzs)}</span>
                        <button type="button" onClick={() => unpick(k)} className="press text-label text-link hover:underline">{t.cfgClear}</button>
                      </span>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>

          <div className="mt-4 flex flex-col gap-1.5 border-t border-line pt-4">
            {issues.length === 0 && REQUIRED_SLOTS.every((k) => picked[k]) && (
              <p className="flex items-center gap-1.5 text-label font-medium text-verified"><Check className="h-4 w-4" strokeWidth={2.4} /> {t.cfgAllOk}</p>
            )}
            {issues.map((i) => (
              <p key={i.slot + i.code} className={`flex items-center gap-1.5 text-label ${i.level === 'block' ? 'text-sale' : 'text-new'}`}>
                <AlertTriangle className="h-4 w-4 shrink-0" /> {SLOT_UI[i.slot].label(t)}: {reason(t, i)}
              </p>
            ))}
            {anyOnOrder && <p className="text-label text-muted-2">{t.cfgOnOrderNote}</p>}
          </div>

          <div className="mt-4 flex items-baseline justify-between gap-3">
            <span className="text-para text-muted">{t.cfgTotal}</span>
            <span className="text-subhead font-semibold tabular-nums">{price(total)}</span>
          </div>

          <button
            type="button"
            onClick={order}
            disabled={!complete}
            className={`${BTN_LG} mt-5 w-full bg-cta text-white hover:bg-cta-hover disabled:cursor-not-allowed disabled:bg-fill-2 disabled:text-disabled`}
          >
            {t.cfgCta}
          </button>
          {!complete && <p className="mt-3 text-center text-label text-muted-2">{t.cfgHint}</p>}
        </div>
      </div>
    </section>
  );
};

export default PcConfigurator;
```

- [ ] **Step 2b: Route** — `app/routes/category.tsx`:
  - importlarda `loadProductsBy`ni olib tashlang (faylda boshqa joyda ishlatilmasa), `loadConfiguratorParts` qo'shing; `import PcConfigurator, { PC_SLOTS } from '../../src/store/PcConfigurator';` → `import PcConfigurator from '../../src/store/PcConfigurator';`
  - loader'dagi `parts` blokini (`const parts: Record<…> = {}; if (slug === 'pc') { … }`) almashtiring:

```ts
  // PC konfiguratori — hamma Billz PC qismlari (omborda va buyurtma asosida), moslik atributlari bilan.
  const parts = slug === 'pc' ? await loadConfiguratorParts(env) : {};
```

Eski `cfgSelect`/`cfgSelected` kalitlari endi ishlatilmaydi — ikkala tildan o'chiring (`grep -rn "cfgSelect" src app` bo'sh bo'lishi kerak). `Zap`, `Box`, `AlertTriangle` lucide'da bor (`node -e "const l=require('lucide-react');console.log(!!l.Zap,!!l.Box,!!l.AlertTriangle)"` → `true true true`; bo'lmasa `TriangleAlert`).

- [ ] **Step 3: Tekshirish**

Run: `bun run lint` → faqat avvaldan bor xato.
Run: `bun run test` → PASS.
Brauzer (dev server, sinov bazasi, 0037 qo'llangan): `/category/pc` → konfigurator:
1. CPU'da "Intel Core Ultra 7 265F" tanlang → Plata bo'g'inida B760 platalar kulrang, "LGA1851 soket kerak"; Z890 bosiladi.
2. B760 plata tanlangan holatda Ultra 7 tanlansa — plata olib tashlanadi, "Mos kelmagani uchun olib tashlandi: Ona plata".
3. "MaxSun Challenger B760M-F DDR4" tanlangan bo'lsa RAM'da DDR5 xotiralar kulrang.
4. RTX 4090 + 650W blok → blok qatorida va yig'mada to'q sariq "Kamida 900 W tavsiya etiladi"; buyurtma tugmasi bloklanmaydi.
5. Qoldiq 0 qism: "Buyurtma asosida" + narx ostida "taxminiy"; savatga qo'shilgach savat qatorida "Buyurtma asosida".
6. 375px kenglikda gorizontal scroll yo'q.

- [ ] **Step 4: Commit**

```bash
git add src/store/PcConfigurator.tsx src/locales.ts app/routes/category.tsx
git commit -m "feat(pc): konfigurator moslikni ko'rsatadi, buyurtma asosidagi qismlar bilan

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Hujjat

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1:** `CLAUDE.md`dagi `/category/pc` jumlasini (`PcConfigurator` (5-slot build + running total) … `ponytail:` izohi) — operator qo'ng'iroqda tasdiqlaydi.`) quyidagiga almashtiring:

```markdown
`/category/pc` additionally ends with `PcConfigurator` — **moslik tekshiruvi bilan (2026-09-18, spec `docs/superpowers/specs/2026-09-18-pc-konfigurator-moslik-design.md`)**: 7 bo'g'in (CPU · ona plata · RAM · GPU · blok · SSD · korpus; majburiy — CPU, plata, RAM), qismlar `loadConfiguratorParts` bilan **hamma Billz PC qismlaridan** (saytda yashirinlari ham: qoldiq 0 → "Buyurtma asosida", narx "taxminiy"; savatga `variantLabel` bilan, Telegram'da ko'rinadi), nom bo'yicha dublikatsiz. Atributlar (soket, DDR, W) sof `shared/pc-compat.ts`da **tovar nomidan** (chipset/model jadvallari) — Billz'da bunday maydon yo'q; admin tuzatishi `products.pc_socket|pc_memory|pc_watts` (migratsiya `0037`, sinxronizatsiya tegmaydi; `product_specs` emas — sinxronizatsiya ularni har run'da qayta yozadi) va `pc_hidden` ("Konfiguratorda ko'rsatilmasin") — `ProductEdit` → "Konfigurator" kartasi. Soket va DDR mos kelmasa nomzod kulrang + sabab (bloklaydi), blok quvvati — ogohlantirish (`(CPU+GPU+100)×1.2`); tanlov o'zgarsa mos kelmay qolgan boshqa tanlov olib tashlanadi. Korpus o'lchami va sovutgich soketi tekshirilmaydi.
```

`Migrations` ro'yxati oxiriga (`0035` jumlasidan keyin): `` `0037` **PC konfiguratori** (`products.pc_hidden`, `pc_socket`, `pc_memory`, `pc_watts` — egasining tuzatishi, Billz tegmaydi). ``

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: PC konfigurator mosligi

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```
