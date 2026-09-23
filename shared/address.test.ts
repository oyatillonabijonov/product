import { describe, expect, it } from 'vitest';
import { addressStreetLine, addressTitle, formatAddress } from './address';

const base = { region: 'toshkent-shahri', district: 'chilonzor', street: '', house: '', apartment: '', entrance: '', floor: '' };

describe('formatAddress', () => {
  it("viloyat va tumanni nomga o'giradi", () => {
    expect(formatAddress(base)).toBe('Toshkent shahri, Chilonzor');
  });
  it("ko'cha va uyni birga yozadi", () => {
    expect(formatAddress({ ...base, street: 'Bunyodkor', house: '12' }))
      .toBe('Toshkent shahri, Chilonzor, Bunyodkor 12-uy');
  });
  it("to'liq manzil tartibi", () => {
    expect(formatAddress({ ...base, street: 'Bunyodkor', house: '12', apartment: '34', entrance: '2', floor: '5' }))
      .toBe('Toshkent shahri, Chilonzor, Bunyodkor 12-uy, 34-xonadon, 2-podʼezd, 5-qavat');
  });
  it("bo'sh maydonlar tushib qoladi", () => {
    expect(formatAddress({ ...base, street: '  ', house: '', floor: '3' }))
      .toBe('Toshkent shahri, Chilonzor, 3-qavat');
  });
  it("noma'lum viloyat/tuman xato bermaydi", () => {
    expect(formatAddress({ ...base, region: 'yoq', district: 'yoq', street: 'Bunyodkor' })).toBe('Bunyodkor');
  });
});

describe('addressTitle', () => {
  it('faqat viloyat va tuman', () => {
    expect(addressTitle({ ...base, street: 'Bunyodkor', house: '12' })).toBe('Toshkent shahri, Chilonzor');
  });
});

describe('addressStreetLine', () => {
  it("viloyat va tumansiz, faqat o'ziga xos qism", () => {
    expect(addressStreetLine({ ...base, street: 'Bunyodkor', house: '12', apartment: '34' }))
      .toBe('Bunyodkor 12-uy, 34-xonadon');
  });
});
