import { describe, it, expect } from 'vitest';
import { optionValuesKey, cartesianProduct, generateVariants, type OptionDraft } from './variant-gen';
import type { AdminVariantInput } from '../api';

describe('cartesianProduct', () => {
  it('produces the cartesian product of option values (2x3 -> 6 combos)', () => {
    const options: OptionDraft[] = [
      { name: 'Xotira', values: ['128GB', '256GB'] },
      { name: 'Rang', values: ['Qora', 'Oq', 'Kumush'] },
    ];
    const combos = cartesianProduct(options);
    expect(combos).toHaveLength(6);
    expect(combos).toContainEqual([
      { optionName: 'Xotira', value: '128GB' },
      { optionName: 'Rang', value: 'Qora' },
    ]);
    expect(combos).toContainEqual([
      { optionName: 'Xotira', value: '256GB' },
      { optionName: 'Rang', value: 'Kumush' },
    ]);
  });

  it('skips options with no values', () => {
    const options: OptionDraft[] = [
      { name: 'Xotira', values: ['128GB'] },
      { name: 'Rang', values: [] },
    ];
    expect(cartesianProduct(options)).toEqual([[{ optionName: 'Xotira', value: '128GB' }]]);
  });
});

describe('optionValuesKey', () => {
  it('is stable under reordering of optionValues', () => {
    const a = [
      { optionName: 'Xotira', value: '256GB' },
      { optionName: 'Rang', value: 'Qora' },
    ];
    const b = [
      { optionName: 'Rang', value: 'Qora' },
      { optionName: 'Xotira', value: '256GB' },
    ];
    expect(optionValuesKey(a)).toBe(optionValuesKey(b));
  });

  it('differs for different combos', () => {
    const a = [{ optionName: 'Xotira', value: '256GB' }];
    const b = [{ optionName: 'Xotira', value: '128GB' }];
    expect(optionValuesKey(a)).not.toBe(optionValuesKey(b));
  });
});

describe('generateVariants', () => {
  const baseOptions: OptionDraft[] = [{ name: 'Xotira', values: ['128GB', '256GB'] }];

  it('preserves existing variant data keyed by combo', () => {
    const existing: AdminVariantInput[] = [
      { sku: 'SKU-128', cashPriceUzs: 1000, oldPriceUzs: null, imageUrl: null, inStock: true, optionValues: [{ optionName: 'Xotira', value: '128GB' }] },
    ];
    const result = generateVariants(baseOptions, existing);
    expect(result).toHaveLength(2);
    const kept = result.find((v) => v.optionValues.some((ov) => ov.value === '128GB'));
    expect(kept?.sku).toBe('SKU-128');
    expect(kept?.cashPriceUzs).toBe(1000);
  });

  it('drops removed combos (existing variant not matching any current combo is dropped)', () => {
    const existing: AdminVariantInput[] = [
      { sku: 'SKU-512', cashPriceUzs: 5000, oldPriceUzs: null, imageUrl: null, inStock: true, optionValues: [{ optionName: 'Xotira', value: '512GB' }] },
    ];
    const result = generateVariants(baseOptions, existing);
    expect(result).toHaveLength(2);
    expect(result.every((v) => v.sku !== 'SKU-512')).toBe(true);
  });

  it('adds new combos with cashPriceUzs 0 and inStock true', () => {
    const result = generateVariants(baseOptions, []);
    expect(result).toHaveLength(2);
    for (const v of result) {
      expect(v.cashPriceUzs).toBe(0);
      expect(v.inStock).toBe(true);
      expect(v.sku).toBeNull();
      expect(v.oldPriceUzs).toBeNull();
      expect(v.imageUrl).toBeNull();
    }
  });

  it('returns [] when options are all empty/valueless', () => {
    expect(generateVariants([], [])).toEqual([]);
    expect(generateVariants([{ name: 'Xotira', values: [] }], [])).toEqual([]);
  });

  it('filters out options with an empty name', () => {
    const options: OptionDraft[] = [
      { name: '', values: ['128GB'] },
      { name: 'Rang', values: ['Qora'] },
    ];
    const result = generateVariants(options, []);
    expect(result).toHaveLength(1);
    expect(result[0].optionValues).toEqual([{ optionName: 'Rang', value: 'Qora' }]);
  });
});
