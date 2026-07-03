import { describe, it, expect } from 'vitest';
import {
  parseProductInput,
  parseBrandInput,
  parseBannerInput,
  parsePageInput,
  parseSiteConfigInput,
  ValidationError,
} from './validate';

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

describe('parseBannerInput', () => {
  it('accepts minimal input and fills defaults', () => {
    const b = parseBannerInput({ imageUrl: '/images/banner.webp' });
    expect(b.imageUrl).toBe('/images/banner.webp');
    expect(b.linkUrl).toBe('');
    expect(b.altText).toBe('');
    expect(b.sortOrder).toBe(0);
    expect(b.isActive).toBe(true);
    expect(b.id.length).toBeGreaterThan(0);
  });
  it('rejects missing imageUrl', () => {
    expect(() => parseBannerInput({ linkUrl: '/katalog' })).toThrow('imageUrl_required');
  });
});

describe('parseBannerInput linkUrl', () => {
  it('accepts empty, internal and http(s) links', () => {
    expect(parseBannerInput({ imageUrl: '/i.webp' }).linkUrl).toBe('');
    expect(parseBannerInput({ imageUrl: '/i.webp', linkUrl: '/katalog' }).linkUrl).toBe('/katalog');
    expect(parseBannerInput({ imageUrl: '/i.webp', linkUrl: 'https://t.me/x' }).linkUrl).toBe('https://t.me/x');
  });
  it('rejects unsafe schemes', () => {
    expect(() => parseBannerInput({ imageUrl: '/i.webp', linkUrl: 'javascript:alert(1)' })).toThrow('link_invalid');
    expect(() => parseBannerInput({ imageUrl: '/i.webp', linkUrl: '//evil.com' })).toThrow('link_invalid');
  });
});

describe('parsePageInput', () => {
  const title = { uz: 'FAQ', ru: 'FAQ', en: 'FAQ', uzCyrl: 'FAQ' };
  it('accepts a valid page and defaults empty content', () => {
    const p = parsePageInput({ slug: 'faq', title });
    expect(p.slug).toBe('faq');
    expect(p.title.uzCyrl).toBe('FAQ');
    expect(p.content).toEqual({ uz: '', ru: '', en: '', uzCyrl: '' });
    expect(p.isActive).toBe(true);
  });
  it('rejects invalid slug', () => {
    expect(() => parsePageInput({ slug: 'Bad Slug!', title })).toThrow('slug_invalid');
  });
  it('rejects when a title locale is empty', () => {
    expect(() => parsePageInput({ slug: 'faq', title: { ...title, ru: '' } })).toThrow('title_ru_required');
  });
});

describe('parseSiteConfigInput', () => {
  it('requires name and phone, defaults the rest', () => {
    const c = parseSiteConfigInput({ name: 'Store', phone: '+998900000000' });
    expect(c.phoneDisplay).toBe('+998900000000');
    expect(c.seoTitleSuffix).toBe('Store');
    expect(c.telegram).toBe('');
  });
  it('rejects missing name', () => {
    expect(() => parseSiteConfigInput({ phone: '+998900000000' })).toThrow('name_required');
  });
});
