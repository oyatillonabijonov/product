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

/** Bo'shliq qatorlari bittaga, nom 200 belgigacha: parserlardagi `\s*`/`.*?` regexlari ulkan Billz nomida
 * kvadratik ishlamasin (patternlar uchun bitta bo'shliq ko'pi bilan bir xil). */
const clip = (name: string): string => name.replace(/\s+/g, ' ').slice(0, 200);

// ™/® savdo belgisi tier va model raqami orasiga tushib qolsa \s* uni bo'shliq deb qabul qilmaydi.
const norm = (name: string): string => clip(name).toLowerCase().replace(/[™®]/g, '');

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
  const stripped = clip(name)
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
