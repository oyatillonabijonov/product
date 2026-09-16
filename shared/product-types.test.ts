import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { PRODUCT_TYPES, typeForBillzCategory, rowToProductType, typesOf, matchBillzType, type ProductTypeRow } from './product-types';

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

const ROWS: ProductTypeRow[] = [
  { id: 'iphone', categoryId: 'apple', label: 'iPhone', labelRu: 'iPhone', iconUrl: '/sections/a.png', billzAliases: [], sortOrder: 10 },
  { id: 'aksessuar', categoryId: 'apple', label: 'Aksessuar', labelRu: 'Аксессуары', iconUrl: '', billzAliases: ['Case', 'Cable'], sortOrder: 90 },
  { id: 'korpus', categoryId: 'pc', label: 'Korpus', labelRu: 'Корпуса', iconUrl: '', billzAliases: ['PC Case', 'Case'], sortOrder: 80 },
  { id: 'ram', categoryId: 'pc', label: 'RAM', labelRu: 'RAM', iconUrl: '', billzAliases: ['DDR4', 'DDR5'], sortOrder: 60 },
];

describe('rowToProductType', () => {
  it('JSON aliaslarni ochadi, buzilgan JSON → bo\'sh ro\'yxat', () => {
    const base = { id: 'ram', category_id: 'pc', label: 'RAM', label_ru: 'RAM', icon_url: '/x.webp', sort_order: 3 };
    expect(rowToProductType({ ...base, billz_aliases: '["DDR4","DDR5"]' })).toEqual({
      id: 'ram', categoryId: 'pc', label: 'RAM', labelRu: 'RAM', iconUrl: '/x.webp', billzAliases: ['DDR4', 'DDR5'], sortOrder: 3,
    });
    expect(rowToProductType({ ...base, billz_aliases: 'oops' }).billzAliases).toEqual([]);
    expect(rowToProductType({ ...base, billz_aliases: '[1, "ok"]' }).billzAliases).toEqual(['ok']);
  });
});

describe('typesOf', () => {
  it("yo'nalishning turlari tartib bo'yicha; noma'lum yoki bo'sh yo'nalish → []", () => {
    expect(typesOf(ROWS, 'pc').map((t) => t.id)).toEqual(['ram', 'korpus']);
    expect(typesOf(ROWS, 'apple').map((t) => t.id)).toEqual(['iphone', 'aksessuar']);
    expect(typesOf(ROWS, 'video')).toEqual([]);
    expect(typesOf(ROWS, null)).toEqual([]);
  });
});

describe('matchBillzType', () => {
  it('nom yoki alias, katta-kichik harfsiz', () => {
    expect(matchBillzType(typesOf(ROWS, 'apple'), 'iPhone')).toBe('iphone');
    expect(matchBillzType(typesOf(ROWS, 'pc'), 'ddr5')).toBe('ram');
    expect(matchBillzType(typesOf(ROWS, 'pc'), 'PC Case')).toBe('korpus');
  });
  it("bir nom yo'nalishga qarab boshqa turga tushadi", () => {
    expect(matchBillzType(typesOf(ROWS, 'apple'), 'Case')).toBe('aksessuar');
    expect(matchBillzType(typesOf(ROWS, 'pc'), 'Case')).toBe('korpus');
  });
  it("noma'lum nom yoki bo'sh → null", () => {
    expect(matchBillzType(typesOf(ROWS, 'pc'), 'Glasspad Deluxe')).toBeNull();
    expect(matchBillzType(typesOf(ROWS, 'pc'), '  ')).toBeNull();
    expect(matchBillzType([], 'iPhone')).toBeNull();
  });
});
