import { describe, it, expect } from 'vitest';
import type { ApiProduct, ApiProductDetail } from './types';
import { catalogStats, imageFilesOf, incompleteProducts, manualFieldsFor, detailToInput } from './mcp-tools';

const p = (over: Partial<ApiProduct>): ApiProduct => ({
  id: 'x', name: 'Tovar', category: 'iphone', condition: 'yangi', conditionNote: null,
  cashPriceUzs: 1000, imageUrl: '/images/products/a.webp', sortOrder: 0, isActive: true,
  categoryId: 'apple', type: 'iphone', oldPriceUzs: null, brandId: 'apple', slug: null,
  minPriceUzs: 1000, ratingAvg: null, reviewCount: 0, preorder: false,
  billzId: 'b1', billzStock: 3, manualFields: [], description: null, ...over,
} as ApiProduct);

describe('catalogStats', () => {
  it('har holatni alohida sanaydi', () => {
    const s = catalogStats([
      p({ id: '1' }),
      p({ id: '2', imageUrl: '', isActive: false }),
      p({ id: '3', description: 'bor', billzStock: 0 }),
      p({ id: '4', billzId: null, billzStock: null }),
    ]);
    expect(s.total).toBe(4);
    expect(s.active).toBe(3);
    expect(s.hidden).toBe(1);
    expect(s.noImage).toBe(1);
    expect(s.noDescription).toBe(3);
    expect(s.stockZero).toBe(1);
    expect(s.billz).toBe(3);
    expect(s.manual).toBe(1);
  });
});

describe('incompleteProducts', () => {
  const items = [
    p({ id: '1', imageUrl: '', description: 'bor' }),
    p({ id: '2', description: null }),
    p({ id: '3', description: 'bor' }),
    p({ id: '4', imageUrl: '', description: null }),
  ];

  it("faqat so'ralgan yetishmovchilikni qaytaradi", () => {
    expect(incompleteProducts(items, { missing: 'image' }).items.map((x) => x.id)).toEqual(['1', '4']);
    expect(incompleteProducts(items, { missing: 'description' }).items.map((x) => x.id)).toEqual(['2', '4']);
    expect(incompleteProducts(items, { missing: 'any' }).items.map((x) => x.id)).toEqual(['1', '2', '4']);
  });

  it('nima yetishmayotganini aytadi', () => {
    expect(incompleteProducts(items, { missing: 'any' }).items[2].missing).toEqual(['image', 'description']);
  });

  it('sahifalaydi: limit va keyingi siljish', () => {
    const first = incompleteProducts(items, { missing: 'any', limit: 2 });
    expect(first.items.map((x) => x.id)).toEqual(['1', '2']);
    expect(first.nextOffset).toBe(2);
    const second = incompleteProducts(items, { missing: 'any', limit: 2, offset: 2 });
    expect(second.items.map((x) => x.id)).toEqual(['4']);
    expect(second.nextOffset).toBe(null);
  });
});

describe('manualFieldsFor', () => {
  it("tegilgan maydon uchun qulf qo'shadi, mavjudini saqlaydi", () => {
    expect(manualFieldsFor(['description'], { cashPriceUzs: 100 })).toEqual(['price', 'description']);
    expect(manualFieldsFor([], { description: 'matn' })).toEqual(['description']);
    expect(manualFieldsFor([], { specs: [{ label: 'Rang', value: 'Qora' }] })).toEqual(['specs']);
  });

  it('tegilmagan maydon uchun qulf qo\'shmaydi', () => {
    expect(manualFieldsFor([], { name: 'Yangi nom' })).toEqual([]);
    expect(manualFieldsFor(['price'], {})).toEqual(['price']);
  });
});

describe('imageFilesOf', () => {
  it("faqat rasm kengaytmalari, nom bo'yicha tartibda", () => {
    expect(imageFilesOf(['b.PNG', 'a.jpg', 'c.txt', 'd.webp', '.DS_Store', 'e.jpeg']))
      .toEqual(['a.jpg', 'b.PNG', 'd.webp', 'e.jpeg']);
  });

  it('raqamli nomlarni to\'g\'ri tartiblaydi', () => {
    expect(imageFilesOf(['img10.jpg', 'img2.jpg', 'img1.jpg'])).toEqual(['img1.jpg', 'img2.jpg', 'img10.jpg']);
  });
});

describe('detailToInput', () => {
  const detail = {
    ...p({ id: 'v1', imageUrl: '/images/products/main.webp' }),
    description: 'Tavsif',
    images: ['/images/products/main.webp', '/images/products/g1.webp'],
    specs: [{ label: 'Chip', value: 'A19' }],
    brand: null,
    options: [{ id: 'o1', name: 'Xotira', sortOrder: 0, values: [
      { id: 'ov1', value: '128GB', sortOrder: 0 },
      { id: 'ov2', value: '256GB', sortOrder: 1 },
    ] }],
    variants: [{
      id: 'var1', sku: 'A1', cashPriceUzs: 900, oldPriceUzs: null, imageUrl: null,
      inStock: true, sortOrder: 0, optionValueIds: ['ov1'],
    }],
  } as unknown as ApiProductDetail;

  it('option qiymatlarini nomga, variantni juftlikka o\'giradi', () => {
    const b = detailToInput(detail);
    expect(b.options).toEqual([{ name: 'Xotira', values: ['128GB', '256GB'] }]);
    expect(b.variants[0].optionValues).toEqual([{ optionName: 'Xotira', value: '128GB' }]);
  });

  it('galereyadan asosiy rasmni chiqaradi', () => {
    expect(detailToInput(detail).images).toEqual(['/images/products/g1.webp']);
  });

  it("noma'lum option qiymati tashlab yuboriladi", () => {
    const d = { ...detail, variants: [{ ...detail.variants[0], optionValueIds: ['yoq'] }] } as ApiProductDetail;
    expect(detailToInput(d).variants[0].optionValues).toEqual([]);
  });
});
