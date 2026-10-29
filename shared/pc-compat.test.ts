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
    expect(partWatts('cpu', 'AMD Ryzen 7 9800x3D', null)).toBe(150);
    expect(partWatts('cpu', 'AMD Ryzen 5 5600X', null)).toBe(110);
    expect(partWatts('cpu', 'Intel Core Ultra 7 265F', null)).toBe(200);
    expect(partWatts('gpu', 'Gigabyte RTX5060 8GB', null)).toBe(145);
    expect(partWatts('gpu', 'MSI Ventus 5060Ti 8GB / Black', null)).toBe(180);
    expect(partWatts('gpu', 'Galax 2060Super 8GB / Black', null)).toBe(175);
    expect(partWatts('gpu', 'Hellhound AMD Radeon™ RX 9060 XT 8GB GDDR6', null)).toBe(160);
    expect(partWatts('gpu', 'PELADN RTX 2060  6GB', null)).toBe(160);
    expect(partWatts('gpu', 'Asus TUF Gaming GeForce RTX3060 12GB / Black', null)).toBe(170);
    expect(partWatts('gpu', 'Sapphire RX 7800 XT', null)).toBe(263);
    expect(partWatts('gpu', 'Gigabyte 5060Ti 8GB / Black', null)).toBe(180);
    expect(partWatts('gpu', 'MSI Shadow Geforce RTX 5060Ti 16GB / Black', null)).toBe(180);
    expect(partWatts('gpu', 'GPU Intel Arc Pro B70 Graphics Black', null)).toBeNull();
    expect(partWatts('psu', 'SAMA  B850W Bronze', null)).toBe(850);
    expect(partWatts('psu', 'PSU SAMA G850 80Plus Gold Black / Black', null)).toBe(850);
    expect(partWatts('psu', 'SAMA K650W 80Plus Bronze, ATX 2.52 Black', null)).toBe(650);
    expect(partWatts('psu', 'PSU Cooler Master MWE 1250W V2 80Plus Gold / Black', null)).toBe(1250);
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

describe('ulkan nomlar — chiziqli', () => {
  it("50k bo'shliqli nomda partGroups, partWatts, suggestValues, cpuHasGraphics tez tugaydi", () => {
    const evil = `gpu ${' '.repeat(50_000)}x`;
    const evil2 = `rtx${' '.repeat(50_000)}/`;
    const t0 = Date.now();
    partGroups([
      { id: 'a', name: evil, image_url: '', type: 'gpu', price: 1, billz_id: 'b', billz_stock: 1, is_active: 1, pc_watts: null },
      { id: 'b', name: evil2, image_url: '', type: 'cpu', price: 1, billz_id: 'c', billz_stock: 1, is_active: 1, pc_watts: null },
    ]);
    for (const n of [evil, evil2, `ryzen 5 ${'1 '.repeat(25_000)}`]) {
      partWatts('gpu', n, null);
      partWatts('cpu', n, null);
      partWatts('psu', n, null);
      suggestValues('mb', n, DIMS);
      suggestValues('ram', n, DIMS);
      cpuHasGraphics(n);
    }
    expect(Date.now() - t0).toBeLessThan(500);
  });
  it("bo'shliq qatorlari natijani o'zgartirmaydi", () => {
    expect(partWatts('gpu', 'NVIDIA GeForce   RTX 4090', null)).toBe(partWatts('gpu', 'NVIDIA GeForce RTX 4090', null));
  });
});
