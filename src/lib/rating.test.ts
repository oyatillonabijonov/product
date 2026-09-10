import { describe, it, expect } from 'vitest';
import { starFillPercent, ruPluralIndex } from './rating';

describe('starFillPercent', () => {
  it('0–5 diapazonini foizga o\'giradi', () => {
    expect(starFillPercent(0)).toBe(0);
    expect(starFillPercent(2.5)).toBe(50);
    expect(starFillPercent(5)).toBe(100);
  });

  it('diapazondan chiqqan qiymatni qisadi', () => {
    expect(starFillPercent(7)).toBe(100);
    expect(starFillPercent(-1)).toBe(0);
  });

  it('ma\'lumot yo\'q bo\'lganda bo\'sh qator beradi', () => {
    expect(starFillPercent(null)).toBe(0);
    expect(starFillPercent(undefined)).toBe(0);
    expect(starFillPercent(Number.NaN)).toBe(0);
  });
});

describe('ruPluralIndex', () => {
  it('birlik shakli — 1, 21, 101', () => {
    for (const n of [1, 21, 101, 1001]) expect(ruPluralIndex(n)).toBe(0);
  });

  it('ikkilik shakli — 2–4, 22–24', () => {
    for (const n of [2, 3, 4, 22, 33, 44]) expect(ruPluralIndex(n)).toBe(1);
  });

  it('ko\'plik shakli — 0, 5–20, 25', () => {
    for (const n of [0, 5, 9, 20, 25, 100]) expect(ruPluralIndex(n)).toBe(2);
  });

  it('11–14 istisnosi ko\'plik shaklini oladi (21 emas, 11)', () => {
    for (const n of [11, 12, 13, 14, 111, 112]) expect(ruPluralIndex(n)).toBe(2);
  });
});
