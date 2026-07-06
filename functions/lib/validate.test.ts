import { describe, it, expect } from 'vitest';
import {
  parseProductInput,
  parseBrandInput,
  parseBannerInput,
  parsePageInput,
  parseSiteConfigInput,
  parseDeviceModelInput,
  parseSettingsInput,
  ValidationError,
} from './validate';
import { deriveLegacyCategory } from '../../shared/legacy-category';

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

describe('parseProductInput hardening', () => {
  it('manfiy/0 eski narxni null qiladi', () => {
    expect(parseProductInput({ ...base, oldPriceUzs: -5000 }).oldPriceUzs).toBeNull();
    expect(parseProductInput({ ...base, oldPriceUzs: 0 }).oldPriceUzs).toBeNull();
    expect(parseProductInput({ ...base, oldPriceUzs: 2000 }).oldPriceUzs).toBe(2000);
  });
  it('bir xil kombinatsiyali dublikat variantni rad etadi', () => {
    const dup = {
      ...base,
      options: [{ name: 'Xotira', values: ['256GB'] }],
      variants: [
        { cashPriceUzs: 1200, optionValues: [{ optionName: 'Xotira', value: '256GB' }] },
        { cashPriceUzs: 1300, optionValues: [{ optionName: 'Xotira', value: '256GB' }] },
      ],
    };
    expect(() => parseProductInput(dup)).toThrow('variant_duplicate');
  });
  it('opsiyalar sonini cheklaydi', () => {
    const many = {
      ...base,
      options: Array.from({ length: 5 }, (_, i) => ({ name: `O${i}`, values: ['a'] })),
      variants: [],
    };
    expect(() => parseProductInput(many)).toThrow('options_limit');
  });
  it('rasmlar sonini cheklaydi', () => {
    expect(() => parseProductInput({ ...base, images: Array.from({ length: 25 }, (_, i) => `/i${i}.webp`) })).toThrow('images_limit');
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

describe('parseProductInput category default (T7)', () => {
  it('derives category from categoryId telefonlar when category omitted', () => {
    const p = parseProductInput({
      name: base.name, condition: base.condition, cashPriceUzs: base.cashPriceUzs, imageUrl: base.imageUrl,
      categoryId: 'telefonlar',
    });
    expect(p.category).toBe('iphone');
  });
  it('defaults to pc when category and categoryId are both omitted', () => {
    const p = parseProductInput({
      name: base.name, condition: base.condition, cashPriceUzs: base.cashPriceUzs, imageUrl: base.imageUrl,
    });
    expect(p.category).toBe('pc');
  });
  it('defaults to pc when categoryId is null', () => {
    const p = parseProductInput({
      name: base.name, condition: base.condition, cashPriceUzs: base.cashPriceUzs, imageUrl: base.imageUrl,
      categoryId: null,
    });
    expect(p.category).toBe('pc');
  });
  it('respects an explicit category (mac)', () => {
    const p = parseProductInput({ ...base, category: 'mac' });
    expect(p.category).toBe('mac');
  });
  it('throws on an explicit invalid category', () => {
    expect(() => parseProductInput({ ...base, category: 'junk' })).toThrow('category_invalid');
  });
});

describe('parseProductInput slug auto-derive (T7)', () => {
  it('derives the slug from the name when slug is omitted', () => {
    const p = parseProductInput({ ...base, name: 'iPhone 17 Pro' });
    expect(p.slug).toBe('iphone-17-pro');
  });
  it('derives the slug from a Cyrillic name', () => {
    const p = parseProductInput({ ...base, name: 'Айфон 17' });
    expect(p.slug).toBe('айфон-17');
  });
  it('slugifies an explicitly given slug', () => {
    const p = parseProductInput({ ...base, slug: 'Custom Slug!!' });
    expect(p.slug).toBe('custom-slug');
  });
});

describe('parseProductInput required fields unchanged (T7)', () => {
  it('still throws when condition is missing', () => {
    expect(() =>
      parseProductInput({ name: base.name, cashPriceUzs: base.cashPriceUzs, imageUrl: base.imageUrl }),
    ).toThrow('condition_required');
  });
  it('still throws when price <= 0', () => {
    expect(() => parseProductInput({ ...base, cashPriceUzs: 0 })).toThrow('price_positive');
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

describe('deriveLegacyCategory', () => {
  it('maps telefonlar to iphone', () => {
    expect(deriveLegacyCategory('telefonlar')).toBe('iphone');
  });
  it('maps planshetlar to ipad', () => {
    expect(deriveLegacyCategory('planshetlar')).toBe('ipad');
  });
  it('maps noutbuklar to mac', () => {
    expect(deriveLegacyCategory('noutbuklar')).toBe('mac');
  });
  it('maps aksessuarlar to pc', () => {
    expect(deriveLegacyCategory('aksessuarlar')).toBe('pc');
  });
  it('maps kompyuterlar to pc', () => {
    expect(deriveLegacyCategory('kompyuterlar')).toBe('pc');
  });
  it('maps null to pc', () => {
    expect(deriveLegacyCategory(null)).toBe('pc');
  });
});

describe('parseSettingsInput — downPaymentMaxPercent', () => {
  const settingsBase = {
    downPaymentPercent: 20, downPaymentMaxPercent: 90, usdToUzs: 12600,
    terms: [{ months: 3, markup: 0.1 }],
  };
  it("to'g'ri qiymatni qabul qiladi", () => {
    expect(parseSettingsInput(settingsBase).downPaymentMaxPercent).toBe(90);
  });
  it("max < min bo'lsa rad etadi", () => {
    expect(() => parseSettingsInput({ ...settingsBase, downPaymentMaxPercent: 10 }))
      .toThrow(ValidationError);
  });
  it("max > 100 bo'lsa rad etadi", () => {
    expect(() => parseSettingsInput({ ...settingsBase, downPaymentMaxPercent: 120 }))
      .toThrow(ValidationError);
  });
});

describe('parseDeviceModelInput', () => {
  it('happy path derives legacyCategory and slugified id, defaults', () => {
    const m = parseDeviceModelInput({ name: 'iPhone 16 Pro', brandId: 'apple', categoryId: 'telefonlar' });
    expect(m.legacyCategory).toBe('iphone');
    expect(m.id).toBe('iphone-16-pro');
    expect(m.chip).toBe('');
    expect(m.ram).toBe('');
    expect(m.camera).toBe('');
    expect(m.display).toBe('');
    expect(m.sortOrder).toBe(0);
  });
  it('respects explicit legacyCategory', () => {
    const m = parseDeviceModelInput({ name: 'Mac Studio', brandId: 'apple', categoryId: 'noutbuklar', legacyCategory: 'pc' });
    expect(m.legacyCategory).toBe('pc');
  });
  it('rejects invalid legacyCategory', () => {
    expect(() =>
      parseDeviceModelInput({ name: 'X', brandId: 'apple', categoryId: 'telefonlar', legacyCategory: 'junk' }),
    ).toThrow('legacy_category_invalid');
  });
  it('rejects missing name', () => {
    expect(() => parseDeviceModelInput({ brandId: 'apple', categoryId: 'telefonlar' })).toThrow('name_required');
  });
  it('rejects missing brandId', () => {
    expect(() => parseDeviceModelInput({ name: 'X', categoryId: 'telefonlar' })).toThrow('brandId_required');
  });
  it('rejects missing categoryId', () => {
    expect(() => parseDeviceModelInput({ name: 'X', brandId: 'apple' })).toThrow('categoryId_required');
  });
});
