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
