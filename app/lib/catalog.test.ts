import { describe, it, expect } from 'vitest';
import { parseCatalogFilters, applyFilters, hasActiveParams, PAGE_SIZE } from './catalog';
import type { Product } from '../../src/data/products';

const sp = (s: string) => new URLSearchParams(s);

describe('parseCatalogFilters', () => {
  it('defaults on empty params', () => {
    const f = parseCatalogFilters(sp(''));
    expect(f).toEqual({ category: null, brands: [], priceMin: null, priceMax: null, condition: null, q: null, sort: 'default', page: 1, onlyDeals: false });
  });
  it('parses full params', () => {
    const f = parseCatalogFilters(sp('brand=apple,samsung&narx=9000000-20000000&holat=yangi&cat=telefonlar&sort=arzon&page=3&q=iphone'));
    expect(f.brands).toEqual(['apple', 'samsung']);
    expect(f.priceMin).toBe(9000000);
    expect(f.priceMax).toBe(20000000);
    expect(f.condition).toBe('yangi');
    expect(f.category).toBe('telefonlar');
    expect(f.sort).toBe('arzon');
    expect(f.page).toBe(3);
    expect(f.q).toBe('iphone');
  });
  it('open-ended price ranges', () => {
    expect(parseCatalogFilters(sp('narx=9000000-')).priceMax).toBeNull();
    expect(parseCatalogFilters(sp('narx=9000000-')).priceMin).toBe(9000000);
    expect(parseCatalogFilters(sp('narx=-20000000')).priceMin).toBeNull();
    expect(parseCatalogFilters(sp('narx=-20000000')).priceMax).toBe(20000000);
  });
  it('invalid values fall back silently', () => {
    const f = parseCatalogFilters(sp('page=abc&sort=zzz&holat=broken&narx=xx-yy'));
    expect(f.page).toBe(1);
    expect(f.sort).toBe('default');
    expect(f.condition).toBeNull();
    expect(f.priceMin).toBeNull();
    expect(f.priceMax).toBeNull();
  });
  it('base overrides merge (onlyDeals, category)', () => {
    const f = parseCatalogFilters(sp('sort=yangi'), { onlyDeals: true, category: 'telefonlar' });
    expect(f.onlyDeals).toBe(true);
    expect(f.category).toBe('telefonlar');
    expect(f.sort).toBe('yangi');
  });
});

describe('hasActiveParams', () => {
  it('false on empty, true on filter params', () => {
    expect(hasActiveParams(sp(''))).toBe(false);
    expect(hasActiveParams(sp('brand=apple'))).toBe(true);
    expect(hasActiveParams(sp('page=2'))).toBe(true);
    expect(hasActiveParams(sp('utm_source=x'))).toBe(false);
  });
});

const P = (o: Partial<Product> & { id: string; cashPriceUzs: number; minPriceUzs: number }): Product => ({
  name: o.id, category: 'iphone', condition: 'yangi', image: '', ...o,
});
const items: Product[] = [
  P({ id: 'a', cashPriceUzs: 10, minPriceUzs: 8, brandId: 'apple' }),
  P({ id: 'b', cashPriceUzs: 20, minPriceUzs: 20, brandId: 'samsung', condition: 'ishlatilgan' }),
  P({ id: 'c', cashPriceUzs: 30, minPriceUzs: 30, brandId: 'apple', oldPriceUzs: 40 }),
];
const base = parseCatalogFilters(sp(''));

describe('applyFilters', () => {
  it('filters by brand and condition', () => {
    expect(applyFilters(items, { ...base, brands: ['apple'] }).items.map((x) => x.id)).toEqual(['a', 'c']);
    expect(applyFilters(items, { ...base, condition: 'ishlatilgan' }).items.map((x) => x.id)).toEqual(['b']);
  });
  it('filters by effective price (minPriceUzs)', () => {
    expect(applyFilters(items, { ...base, priceMin: 10, priceMax: 25 }).items.map((x) => x.id)).toEqual(['b']);
  });
  it('deals only', () => {
    expect(applyFilters(items, { ...base, onlyDeals: true }).items.map((x) => x.id)).toEqual(['c']);
  });
  it('sorts by price asc/desc', () => {
    expect(applyFilters(items, { ...base, sort: 'arzon' }).items.map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(applyFilters(items, { ...base, sort: 'qimmat' }).items.map((x) => x.id)).toEqual(['c', 'b', 'a']);
  });
  it('paginates and reports total + facets', () => {
    const many: Product[] = Array.from({ length: PAGE_SIZE + 2 }, (_, i) => P({ id: `p${i}`, cashPriceUzs: i + 1, minPriceUzs: i + 1, brandId: 'apple' }));
    const r1 = applyFilters(many, base);
    expect(r1.items).toHaveLength(PAGE_SIZE);
    expect(r1.total).toBe(PAGE_SIZE + 2);
    const r2 = applyFilters(many, { ...base, page: 2 });
    expect(r2.items).toHaveLength(2);
    expect(r2.facets.brandCounts.apple).toBe(PAGE_SIZE + 2);
    expect(r2.facets.priceMin).toBe(1);
    expect(r2.facets.priceMax).toBe(PAGE_SIZE + 2);
  });
});
