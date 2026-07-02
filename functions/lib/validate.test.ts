import { describe, it, expect } from 'vitest';
import { parseProductInput, parseBrandInput, ValidationError } from './validate';

const base = { name: 'iPhone 17', category: 'iphone', condition: 'yangi', cashPriceUzs: 1000, imageUrl: '' };

describe('parseBrandInput', () => {
  it('parses and slugifies', () => {
    const b = parseBrandInput({ name: 'Apple Inc' });
    expect(b.name).toBe('Apple Inc');
    expect(b.slug).toBe('apple-inc');
  });
  it('rejects missing name', () => {
    expect(() => parseBrandInput({})).toThrow(ValidationError);
  });
});

describe('parseProductInput variants', () => {
  it('defaults: no brand/slug/options/variants', () => {
    const p = parseProductInput(base);
    expect(p.brandId).toBeNull();
    expect(p.options).toEqual([]);
    expect(p.variants).toEqual([]);
  });
  it('parses full options + variants', () => {
    const p = parseProductInput({
      ...base,
      brandId: 'apple', slug: 'iphone-17',
      options: [{ name: 'Xotira', values: ['256GB', '512GB'] }],
      variants: [{ cashPriceUzs: 1200, optionValues: [{ optionName: 'Xotira', value: '256GB' }], inStock: true }],
    });
    expect(p.options[0].values).toHaveLength(2);
    expect(p.variants[0].cashPriceUzs).toBe(1200);
    expect(p.variants[0].sku).toBeNull();
  });
  it('rejects variant price <= 0', () => {
    expect(() => parseProductInput({ ...base, variants: [{ cashPriceUzs: 0, optionValues: [] }] })).toThrow(ValidationError);
  });
  it('rejects incomplete combination when options exist', () => {
    expect(() =>
      parseProductInput({
        ...base,
        options: [{ name: 'Xotira', values: ['256GB'] }, { name: 'Rang', values: ['Qora'] }],
        variants: [{ cashPriceUzs: 100, optionValues: [{ optionName: 'Xotira', value: '256GB' }] }],
      }),
    ).toThrow(ValidationError);
  });
  it('rejects duplicate option names', () => {
    expect(() =>
      parseProductInput({ ...base, options: [{ name: 'Rang', values: ['Qora'] }, { name: 'Rang', values: ['Oq'] }] }),
    ).toThrow(ValidationError);
  });
  it('rejects unknown option value in variant', () => {
    expect(() =>
      parseProductInput({
        ...base,
        options: [{ name: 'Rang', values: ['Qora'] }],
        variants: [{ cashPriceUzs: 100, optionValues: [{ optionName: 'Rang', value: 'Yashil' }] }],
      }),
    ).toThrow(ValidationError);
  });
});
