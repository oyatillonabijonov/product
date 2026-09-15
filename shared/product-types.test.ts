import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { PRODUCT_TYPES, typeForBillzCategory } from './product-types';

describe('PRODUCT_TYPES', () => {
  it("har bir tur ikonkasi public/ ichida bor — yo'l xatosi qatorda singan rasm bo'lardi", () => {
    const missing = Object.values(PRODUCT_TYPES).flat().filter((t) => !existsSync(`public${t.icon}`));
    expect(missing.map((t) => t.icon)).toEqual([]);
  });
});

describe('typeForBillzCategory', () => {
  it('label va alias, katta-kichik harfsiz', () => {
    expect(typeForBillzCategory('apple', 'iPhone')).toBe('iphone');
    expect(typeForBillzCategory('apple', 'Air Pods')).toBe('airpods');
    expect(typeForBillzCategory('pc', 'ddr5')).toBe('ram');
    expect(typeForBillzCategory('pc', 'PC Case')).toBe('korpus');
    // Aksessuar/Kamera'dan ko'chgan aliaslar — birinchi mos kelgan tur yutadi
    expect(typeForBillzCategory('video', 'Tripod')).toBe('shtativ');
    expect(typeForBillzCategory('video', 'Action Camera')).toBe('action-kamera');
  });
  it("bir nom yo'nalishga qarab boshqa turga tushadi", () => {
    expect(typeForBillzCategory('apple', 'Case')).toBe('aksessuar');
    expect(typeForBillzCategory('pc', 'Case')).toBe('korpus');
  });
  it("noma'lum nom yoki yo'nalish → null", () => {
    expect(typeForBillzCategory('pc', 'Glasspad Deluxe')).toBeNull();
    expect(typeForBillzCategory(null, 'iPhone')).toBeNull();
  });
});
