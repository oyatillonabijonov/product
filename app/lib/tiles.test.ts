import { describe, it, expect } from 'vitest';
import { categoryTiles } from './tiles';
import type { ProductTypeRow } from '../../shared/product-types';

const ROWS: ProductTypeRow[] = [
  { id: 'gpu', categoryId: 'pc', label: 'GPU', labelRu: '', iconUrl: '/sections/gpu.webp', billzAliases: [], sortOrder: 40 },
  { id: 'noutbuk', categoryId: 'pc', label: 'Noutbuk', labelRu: 'Ноутбуки', iconUrl: '/sections/laptops.webp', billzAliases: [], sortOrder: 10 },
  { id: 'iphone', categoryId: 'apple', label: 'iPhone', labelRu: 'iPhone', iconUrl: '/sections/i.png', billzAliases: [], sortOrder: 10 },
];

describe('categoryTiles', () => {
  it("yo'nalish turlari tartib bo'yicha, ikonka bilan", () => {
    expect(categoryTiles(ROWS, 'pc', 'uz')).toEqual([
      { id: 'noutbuk', label: 'Noutbuk', img: '/sections/laptops.webp' },
      { id: 'gpu', label: 'GPU', img: '/sections/gpu.webp' },
    ]);
  });
  it("ru: labelRu, bo'sh bo'lsa o'zbekchasi", () => {
    expect(categoryTiles(ROWS, 'pc', 'ru').map((t) => t.label)).toEqual(['Ноутбуки', 'GPU']);
  });
  it("noma'lum yo'nalish → []", () => {
    expect(categoryTiles(ROWS, 'video', 'uz')).toEqual([]);
  });
});
