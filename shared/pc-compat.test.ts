import { describe, expect, it } from 'vitest';
import { candidateState, hasMatch, issueFor, needsVerify, partAttrs, recommendedWatts, slotForType, summaryIssues, toConfigParts, type ConfigPartRow } from './pc-compat';

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
  it('"Core" so\'zisiz Ultra ham → LGA1851', () => {
    expect(a('cpu', 'Intel Ultra 9 285K')).toEqual({ socket: 'LGA1851', memory: 'DDR5', watts: 250 });
  });
  it('Ryzen 7000/9000 → AM5, 5000 → AM4', () => {
    expect(a('cpu', 'AMD Ryzen 7 9800x3D')).toEqual({ socket: 'AM5', memory: 'DDR5', watts: 150 });
    expect(a('cpu', 'AMD Ryzen 5 5600X')).toEqual({ socket: 'AM4', memory: 'DDR4', watts: 110 });
  });
  it('kod nomi tier va model raqami orasida, savdo belgisi bilan ham', () => {
    expect(a('cpu', 'AMD Ryzen™ 5 Granite Ridge 9600X')).toEqual({ socket: 'AM5', memory: 'DDR5', watts: 110 });
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
  it("H610'da DDR belgisiz — DDR5 taxmin qilinmaydi, operator tasdiqlaydi", () => {
    expect(a('mb', 'Asus Prime H610 M-F / Black').memory).toBeNull();
    expect(a('mb', 'Gigabyte H610M D4').memory).toBe('DDR4');
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
  it('modelga yopishgan Ti/Super ham tanib olinadi', () => {
    expect(a('gpu', 'MSI Ventus 5060Ti 8GB / Black').watts).toBe(180);
    expect(a('gpu', 'Gigabyte 5060Ti 8GB / Black').watts).toBe(180);
    expect(a('gpu', 'Galax 2060Super 8GB / Black').watts).toBe(175);
    expect(a('gpu', 'Hellhound AMD Radeon™ RX 9060 XT 8GB GDDR6').watts).toBe(160);
    expect(a('gpu', 'MSI Shadow Geforce RTX 5060Ti 16GB / Black').watts).toBe(180);
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

describe('candidateState', () => {
  it('oldingi tanlov bilan mos kelmasa ham CPUni bloklamaydi, keyingi platani olib tashlashga taklif qiladi', () => {
    expect(candidateState('cpu', cpu1851, { mb: b760ddr4 })).toEqual({ block: null, drops: ['mb'], warn: null });
  });
  it('mos kelmaydigan plata (oldinroq CPU tanlangan) bloklanadi, hech narsa olib tashlanmaydi', () => {
    expect(candidateState('mb', b760ddr4, { cpu: cpu1851 })).toEqual({
      block: { slot: 'mb', level: 'block', code: 'socket', need: 'LGA1851' }, drops: [], warn: null,
    });
  });
  it('kaskad: plata olib tashlangach RAM cpu bilan solishtiriladi', () => {
    expect(candidateState('cpu', cpu1851, { mb: b760ddr4, ram: ddr5 })).toEqual({ block: null, drops: ['mb'], warn: null });
    expect(candidateState('cpu', cpu1851, { mb: b760ddr4, ram: partAttrs('ram', 'Apacer 8GB 3200Mhz') }))
      .toEqual({ block: null, drops: ['mb', 'ram'], warn: null });
  });
  it('quvvat — block emas, warn', () => {
    expect(candidateState('psu', psu650, { cpu: cpu1700, gpu: rtx4090 })).toEqual({
      block: null, drops: [], warn: { slot: 'psu', level: 'warn', code: 'power', need: '900' },
    });
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
