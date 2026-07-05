import { describe, it, expect } from 'vitest';
import { filterProducts } from './product-filter';
import type { ApiProduct } from '../../../shared/types';

function p(over: Partial<ApiProduct>): ApiProduct {
  return {
    id: over.id ?? 'x', name: 'Item', category: 'iphone', condition: 'yangi',
    conditionNote: null, cashPriceUzs: 100, imageUrl: '', isActive: true,
    categoryId: null, brandId: null, minPriceUzs: 100, ...over,
  } as ApiProduct;
}

describe('filterProducts', () => {
  const items = [
    p({ id: '1', name: 'iPhone 17 Pro', categoryId: 'phones', brandId: 'apple', condition: 'yangi', isActive: true }),
    p({ id: '2', name: 'MacBook Air', categoryId: 'laptops', brandId: 'apple', condition: 'ishlatilgan', isActive: false }),
    p({ id: '3', name: 'Galaxy S24', categoryId: 'phones', brandId: 'samsung', condition: 'yangi', isActive: true }),
  ];

  it('bo\'sh filtr → hammasini qaytaradi', () => {
    expect(filterProducts(items, {}).map((x) => x.id)).toEqual(['1', '2', '3']);
  });

  it('nom qidiruv (registrsiz, qism)', () => {
    expect(filterProducts(items, { q: 'iphone' }).map((x) => x.id)).toEqual(['1']);
    expect(filterProducts(items, { q: 'a' }).map((x) => x.id)).toEqual(['2', '3']);
  });

  it('kategoriya + brend + holat + status birga', () => {
    expect(filterProducts(items, { categoryId: 'phones' }).map((x) => x.id)).toEqual(['1', '3']);
    expect(filterProducts(items, { brandId: 'apple' }).map((x) => x.id)).toEqual(['1', '2']);
    expect(filterProducts(items, { condition: 'ishlatilgan' }).map((x) => x.id)).toEqual(['2']);
    expect(filterProducts(items, { status: 'hidden' }).map((x) => x.id)).toEqual(['2']);
    expect(filterProducts(items, { status: 'active', categoryId: 'phones', brandId: 'samsung' }).map((x) => x.id)).toEqual(['3']);
  });
});
