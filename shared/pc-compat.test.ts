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
