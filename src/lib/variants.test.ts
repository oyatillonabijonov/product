import { describe, it, expect } from 'vitest';
import { defaultSelection, resolveVariant, isValueAvailable, selectionLabel, variantSelection } from './variants';
import type { ApiOption, ApiVariant } from '../../shared/types';

const options: ApiOption[] = [
  { id: 'o1', name: 'Xotira', sortOrder: 0, values: [
    { id: 'ov1', value: '256GB', sortOrder: 0 },
    { id: 'ov2', value: '512GB', sortOrder: 1 },
  ] },
  { id: 'o2', name: 'Rang', sortOrder: 1, values: [
    { id: 'ov3', value: 'Qora', sortOrder: 0 },
    { id: 'ov4', value: 'Oq', sortOrder: 1 },
  ] },
];
const V = (id: string, price: number, inStock: boolean, ids: string[]): ApiVariant =>
  ({ id, sku: null, cashPriceUzs: price, oldPriceUzs: null, imageUrl: null, inStock, sortOrder: 0, optionValueIds: ids });
// v1: 256+Qora 100 (bor), v2: 512+Qora 200 (yo'q), v3: 256+Oq 150 (bor). 512+Oq kombinatsiyasi YO'Q.
const variants: ApiVariant[] = [V('v1', 100, true, ['ov1', 'ov3']), V('v2', 200, false, ['ov2', 'ov3']), V('v3', 150, true, ['ov1', 'ov4'])];

describe('variantSelection', () => {
  it('maps optionValueIds to names/values', () => {
    expect(variantSelection(variants[1], options)).toEqual({ Xotira: '512GB', Rang: 'Qora' });
  });
});

describe('defaultSelection', () => {
  it('picks cheapest in-stock variant', () => {
    expect(defaultSelection(options, variants)).toEqual({ Xotira: '256GB', Rang: 'Qora' });
  });
  it('falls back to cheapest overall when none in stock', () => {
    const all = variants.map((v) => ({ ...v, inStock: false }));
    expect(defaultSelection(options, all)).toEqual({ Xotira: '256GB', Rang: 'Qora' });
  });
  it('returns null when no variants', () => {
    expect(defaultSelection(options, [])).toBeNull();
  });
});

describe('resolveVariant', () => {
  it('finds exact match', () => {
    expect(resolveVariant(options, variants, { Xotira: '256GB', Rang: 'Oq' })?.id).toBe('v3');
  });
  it('returns null for missing combination', () => {
    expect(resolveVariant(options, variants, { Xotira: '512GB', Rang: 'Oq' })).toBeNull();
  });
});

describe('isValueAvailable', () => {
  const sel = { Xotira: '256GB', Rang: 'Qora' };
  it('true when switching to an existing combo', () => {
    expect(isValueAvailable(options, variants, sel, 'Rang', 'Oq')).toBe(true);
    expect(isValueAvailable(options, variants, sel, 'Xotira', '512GB')).toBe(true);
  });
  it('false when combo does not exist', () => {
    expect(isValueAvailable(options, variants, { Xotira: '512GB', Rang: 'Qora' }, 'Rang', 'Oq')).toBe(false);
  });
});

describe('selectionLabel', () => {
  it('labels in options order', () => {
    expect(selectionLabel(options, { Rang: 'Qora', Xotira: '256GB' })).toBe('Xotira: 256GB, Rang: Qora');
  });
});
