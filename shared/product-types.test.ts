import { describe, it, expect } from 'vitest';
import { typeForBillzCategory } from './product-types';

describe('typeForBillzCategory', () => {
  it('label va alias, katta-kichik harfsiz', () => {
    expect(typeForBillzCategory('apple', 'iPhone')).toBe('iphone');
    expect(typeForBillzCategory('apple', 'Air Pods')).toBe('airpods');
    expect(typeForBillzCategory('pc', 'ddr5')).toBe('ram');
    expect(typeForBillzCategory('pc', 'PC Case')).toBe('korpus');
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
