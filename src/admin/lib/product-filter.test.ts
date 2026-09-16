import { describe, it, expect } from 'vitest';
import { filterProducts, quickFilter } from './product-filter';
import type { ApiProduct } from '../../../shared/types';

function p(over: Partial<ApiProduct>): ApiProduct {
  return {
    id: over.id ?? 'x', name: 'Item', category: 'iphone', condition: 'yangi',
    conditionNote: null, cashPriceUzs: 100, imageUrl: '', isActive: true,
    categoryId: null, brandId: null, minPriceUzs: 100, billzId: null, billzStock: null, ...over,
  } as ApiProduct;
}

describe('filterProducts', () => {
  const items = [
    p({ id: '1', name: 'iPhone 17 Pro', categoryId: 'phones', brandId: 'apple', condition: 'yangi', isActive: true }),
    p({ id: '2', name: 'MacBook Air', categoryId: 'laptops', brandId: 'apple', condition: 'ishlatilgan', isActive: false }),
    p({ id: '3', name: 'Galaxy S24', categoryId: 'phones', brandId: 'samsung', condition: 'yangi', isActive: true }),
  ];

  it("bo'sh filtr → hammasini qaytaradi", () => {
    expect(filterProducts(items, {}).map((x) => x.id)).toEqual(['1', '2', '3']);
  });

  it('nom qidiruv (registrsiz, qism)', () => {
    expect(filterProducts(items, { q: 'iphone' }).map((x) => x.id)).toEqual(['1']);
    expect(filterProducts(items, { q: 'a' }).map((x) => x.id)).toEqual(['2', '3']);
  });

  it('kategoriya + brend + holat + tez filtr birga', () => {
    expect(filterProducts(items, { categoryId: 'phones' }).map((x) => x.id)).toEqual(['1', '3']);
    expect(filterProducts(items, { brandId: 'apple' }).map((x) => x.id)).toEqual(['1', '2']);
    expect(filterProducts(items, { condition: 'ishlatilgan' }).map((x) => x.id)).toEqual(['2']);
    expect(filterProducts(items, { quick: 'hidden' }).map((x) => x.id)).toEqual(['2']);
    expect(filterProducts(items, { quick: 'manual', categoryId: 'phones', brandId: 'samsung' }).map((x) => x.id)).toEqual(['3']);
  });
});

describe('quickFilter', () => {
  const billzNoImg = p({ id: 'b1', billzId: 'x1', imageUrl: '', billzStock: 0 });
  const billzImg = p({ id: 'b2', billzId: 'x2', imageUrl: '/images/products/a.webp', billzStock: 3, isActive: false });
  const manual = p({ id: 'm1', billzId: null, imageUrl: '', billzStock: null });

  it("'' → hammasi", () => {
    expect([billzNoImg, billzImg, manual].every((x) => quickFilter(x, ''))).toBe(true);
  });
  it("needs_image → Billz'dan kelgan, rasmsiz", () => {
    expect(quickFilter(billzNoImg, 'needs_image')).toBe(true);
    expect(quickFilter(billzImg, 'needs_image')).toBe(false);
    expect(quickFilter(manual, 'needs_image')).toBe(false);
  });
  it('hidden → yashirin', () => {
    expect(quickFilter(billzImg, 'hidden')).toBe(true);
    expect(quickFilter(manual, 'hidden')).toBe(false);
  });
  it("stock0 → Billz qoldig'i 0 (qo'lda kiritilganda qoldiq yo'q — emas)", () => {
    expect(quickFilter(billzNoImg, 'stock0')).toBe(true);
    expect(quickFilter(manual, 'stock0')).toBe(false);
  });
  it("manual → billzId yo'q", () => {
    expect(quickFilter(manual, 'manual')).toBe(true);
    expect(quickFilter(billzImg, 'manual')).toBe(false);
  });
});
