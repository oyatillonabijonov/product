import { describe, it, expect } from 'vitest';
import {
  parseProductInput,
  parseBrandInput,
  parseBannerInput,
  parseNewsInput,
  parsePageInput,
  parseSiteConfigInput,
  parseDeviceModelInput,
  parseSettingsInput,
  parseOrderInput,
  parseProfileInput,
  parseVacancyInput,
  parseJobApplicationInput,
  parseTypeInput,
  parseTextsInput,
  parseAssetsInput,
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

describe('parseProductInput hardening', () => {
  it('manfiy/0 eski narxni null qiladi', () => {
    expect(parseProductInput({ ...base, oldPriceUzs: -5000 }).oldPriceUzs).toBeNull();
    expect(parseProductInput({ ...base, oldPriceUzs: 0 }).oldPriceUzs).toBeNull();
    expect(parseProductInput({ ...base, oldPriceUzs: 2000 }).oldPriceUzs).toBe(2000);
  });
  it("tovar turi yo'nalishga tegishli bo'lishi shart", () => {
    expect(parseProductInput({ ...base, categoryId: 'pc', type: 'gpu' }).type).toBe('gpu');
    expect(parseProductInput({ ...base, categoryId: 'pc', type: '' }).type).toBeNull();
    expect(parseProductInput({ ...base, categoryId: 'pc' }).type).toBeNull();
    // Yo'nalishga tegishlilik endi route'da (bazadan); parser faqat shaklni tekshiradi.
    expect(parseProductInput({ ...base, categoryId: 'pc', type: 'iphone' }).type).toBe('iphone');
    expect(() => parseProductInput({ ...base, categoryId: 'pc', type: 'Bad Type!' })).toThrow('type_invalid');
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

describe('parseNewsInput', () => {
  const base = { title: ' iPhone 17 Pro ', imageUrl: '/products/iph1.webp' };
  it("majburiy — sarlavha va rasm; qolgani bo'sh qatorga tushadi", () => {
    const n = parseNewsInput(base);
    expect(n).toMatchObject({
      title: 'iPhone 17 Pro', titleRu: '', badge: '', badgeRu: '', tag: '', tagRu: '',
      text: '', textRu: '', cta: '', ctaRu: '', linkUrl: '', sortOrder: 0, isActive: true,
    });
    expect(n.id.length).toBeGreaterThan(0);
  });
  it('sarlavhasiz yoki rasmsiz — xato', () => {
    expect(() => parseNewsInput({ imageUrl: '/x.webp' })).toThrow('title_required');
    expect(() => parseNewsInput({ title: 'X' })).toThrow('imageUrl_required');
  });
  it("havola faqat ichki yo'l yoki http(s)", () => {
    expect(parseNewsInput({ ...base, linkUrl: '/category/apple?tur=iphone' }).linkUrl).toBe('/category/apple?tur=iphone');
    expect(() => parseNewsInput({ ...base, linkUrl: 'javascript:alert(1)' })).toThrow('link_invalid');
    expect(() => parseNewsInput({ ...base, linkUrl: '//evil.example' })).toThrow('link_invalid');
  });
  it('uzun matn kesiladi', () => {
    expect(parseNewsInput({ ...base, text: 'a'.repeat(500) }).text).toHaveLength(200);
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
  const title = { uz: 'FAQ', ru: 'FAQ' };
  it('accepts a valid page and defaults empty content', () => {
    const p = parsePageInput({ slug: 'faq', title });
    expect(p.slug).toBe('faq');
    expect(p.content).toEqual({ uz: '', ru: '' });
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
  it("billz maydonlari: token trim, billzLastSync body'dan kelmaydi", () => {
    const c = parseSiteConfigInput({ name: 'Store', phone: '+998900000000', billzSecretToken: ' abc ', billzShopId: 'shop-1', billzLastSync: '{"ok":true}' });
    expect(c.billzSecretToken).toBe('abc');
    expect(c.billzShopId).toBe('shop-1');
    expect(c.billzLastSync).toBe('');
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

const siteBase = { name: 'S', phone: '+998900000000' };

describe('parseSiteConfigInput — paymentMode', () => {
  it("yo'q bo'lsa 'both'ga tushadi", () => {
    expect(parseSiteConfigInput(siteBase).paymentMode).toBe('both');
  });
  it("'cash' va 'installment'ni qabul qiladi", () => {
    expect(parseSiteConfigInput({ ...siteBase, paymentMode: 'cash' }).paymentMode).toBe('cash');
    expect(parseSiteConfigInput({ ...siteBase, paymentMode: 'installment' }).paymentMode).toBe('installment');
  });
  it("noto'g'ri qiymat 'both'ga tushadi", () => {
    expect(parseSiteConfigInput({ ...siteBase, paymentMode: 'xyz' }).paymentMode).toBe('both');
  });
});

describe('parseDeviceModelInput', () => {
  it('happy path slugified id, defaults', () => {
    const m = parseDeviceModelInput({ name: 'iPhone 16 Pro', brandId: 'apple', categoryId: 'telefonlar' });
    expect(m.id).toBe('iphone-16-pro');
    expect(m.chip).toBe('');
    expect(m.ram).toBe('');
    expect(m.camera).toBe('');
    expect(m.display).toBe('');
    expect(m.sortOrder).toBe(0);
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

describe('parseOrderInput', () => {
  const item = { productId: 'imac', name: 'iMac', variantLabel: '256GB', qty: 1, priceUzs: 24_000_000 };
  const cashBase = { name: 'Ali', phone: '+998 90 123 45 67', paymentKind: 'cash', source: 'product', items: [item] };

  it('naqd buyurtmani qabul qiladi, muddatli maydonlarni null qiladi', () => {
    const o = parseOrderInput(cashBase);
    expect(o.paymentKind).toBe('cash');
    expect(o.termMonths).toBeNull();
    expect(o.monthlyUzs).toBeNull();
    expect(o.items).toHaveLength(1);
    expect(o.items[0].priceUzs).toBe(24_000_000);
  });

  it('muddatli buyurtmada narx maydonlarini saqlaydi', () => {
    const o = parseOrderInput({ ...cashBase, paymentKind: 'installment', termMonths: 12, downPaymentUzs: 4_800_000, monthlyUzs: 2_440_000, totalUzs: 34_080_000 });
    expect(o.paymentKind).toBe('installment');
    expect(o.termMonths).toBe(12);
    expect(o.monthlyUzs).toBe(2_440_000);
  });

  it("ism yo'q bo'lsa rad etadi", () => {
    expect(() => parseOrderInput({ ...cashBase, name: '' })).toThrow(ValidationError);
  });
  it("telefon juda qisqa bo'lsa rad etadi", () => {
    expect(() => parseOrderInput({ ...cashBase, phone: '123' })).toThrow('phone_invalid');
  });
  it("noto'g'ri paymentKind rad etadi", () => {
    expect(() => parseOrderInput({ ...cashBase, paymentKind: 'card' })).toThrow('payment_kind_invalid');
  });
  it("bo'sh items rad etadi", () => {
    expect(() => parseOrderInput({ ...cashBase, items: [] })).toThrow('items_required');
  });
  it("manfiy narxli item rad etadi", () => {
    expect(() => parseOrderInput({ ...cashBase, items: [{ ...item, priceUzs: 0 }] })).toThrow('price_positive');
  });
});

describe('parseProfileInput', () => {
  it('ism trim, qolgani ixtiyoriy', () => {
    expect(parseProfileInput({ name: '  Ali  ' })).toEqual({ name: 'Ali', phone: '', avatar: '', email: '' });
  });
  it('bo\'sh ismni rad etadi', () => {
    expect(() => parseProfileInput({ name: '   ' })).toThrow('name_required');
  });
  it('qisqa telefonni rad etadi', () => {
    expect(() => parseProfileInput({ name: 'Ali', phone: '123' })).toThrow('phone_invalid');
  });
  it('to\'g\'ri telefonni qabul qiladi', () => {
    expect(parseProfileInput({ name: 'Ali', phone: '+998 90 123 45 67' }))
      .toEqual({ name: 'Ali', phone: '+998 90 123 45 67', avatar: '', email: '' });
  });
  it('avatarni qabul qiladi', () => {
    expect(parseProfileInput({ name: 'Ali', avatar: 'cat.mouth' }).avatar).toBe('cat.mouth');
  });
  it('emailni kichik harfga o\'tkazadi', () => {
    expect(parseProfileInput({ name: 'Ali', email: '  Ali@Example.COM ' }).email).toBe('ali@example.com');
  });
  it('yaroqsiz emailni rad etadi', () => {
    expect(() => parseProfileInput({ name: 'Ali', email: 'pochta' })).toThrow('email_invalid');
  });
  it('ro\'yxatda yo\'q avatarni rad etadi', () => {
    expect(() => parseProfileInput({ name: 'Ali', avatar: 'yoq-shakl' })).toThrow('avatar_invalid');
    expect(() => parseProfileInput({ name: 'Ali', avatar: '<script>' })).toThrow('avatar_invalid');
  });
});

describe('parseSettingsInput — usdMarkupPercent', () => {
  const base = {
    downPaymentPercent: 20, downPaymentMaxPercent: 90, usdToUzs: 12600,
    terms: [{ months: 3, markup: 0.1 }],
  };
  it("berilmasa null — avtomatik kurs o'chiq", () => {
    expect(parseSettingsInput(base).usdMarkupPercent).toBeNull();
  });
  it("0–100 oralig'ini qabul qiladi", () => {
    expect(parseSettingsInput({ ...base, usdMarkupPercent: 7 }).usdMarkupPercent).toBe(7);
    expect(parseSettingsInput({ ...base, usdMarkupPercent: 0 }).usdMarkupPercent).toBe(0);
  });
  it('diapazondan tashqarisini rad etadi', () => {
    expect(() => parseSettingsInput({ ...base, usdMarkupPercent: -1 })).toThrow('usd_markup_range');
    expect(() => parseSettingsInput({ ...base, usdMarkupPercent: 101 })).toThrow('usd_markup_range');
    expect(() => parseSettingsInput({ ...base, usdMarkupPercent: '7' })).toThrow('usd_markup_range');
  });
  it("MB kursi va sanasi body'dan olinmaydi (server mulki)", () => {
    const s = parseSettingsInput({ ...base, usdCbuRate: 1, usdRateDate: 'x' });
    expect(s.usdCbuRate).toBeNull();
    expect(s.usdRateDate).toBe('');
  });
});

describe('parseVacancyInput', () => {
  it("majburiy — faqat lavozim nomi; qolgani sukut qiymatlar", () => {
    const v = parseVacancyInput({ title: ' Sotuv maslahatchisi ' });
    expect(v).toMatchObject({
      title: 'Sotuv maslahatchisi', titleRu: '', department: '', departmentRu: '', employment: 'full',
      salary: '', salaryRu: '', description: '', descriptionRu: '', sortOrder: 0, isActive: true,
    });
    expect(v.id.length).toBeGreaterThan(0);
  });
  it('nomsiz — xato', () => {
    expect(() => parseVacancyInput({ department: 'Sotuv' })).toThrow('title_required');
  });
  it('bandlik turi faqat full | part | intern', () => {
    expect(parseVacancyInput({ title: 'X', employment: 'intern' }).employment).toBe('intern');
    expect(() => parseVacancyInput({ title: 'X', employment: 'freelance' })).toThrow('employment_invalid');
  });
  it('uzun tavsif kesiladi', () => {
    expect(parseVacancyInput({ title: 'X', description: 'a'.repeat(6000) }).description).toHaveLength(4000);
  });
});

describe('parseJobApplicationInput', () => {
  const base = { name: ' Aziz ', phone: '+998 90 123-45-67' };
  it("ism va telefon majburiy; qolgani bo'sh", () => {
    expect(parseJobApplicationInput(base)).toEqual({
      name: 'Aziz', phone: '+998 90 123-45-67', message: '', resumeUrl: '', vacancyId: null,
    });
  });
  it('telefon 7–15 raqam', () => {
    expect(() => parseJobApplicationInput({ ...base, phone: '12-34' })).toThrow('phone_invalid');
    expect(() => parseJobApplicationInput({ name: 'A' })).toThrow('phone_required');
  });
  it('rezyume havolasi faqat https va 500 belgigacha', () => {
    expect(parseJobApplicationInput({ ...base, resumeUrl: 'https://t.me/aziz' }).resumeUrl).toBe('https://t.me/aziz');
    expect(() => parseJobApplicationInput({ ...base, resumeUrl: 'http://evil.example' })).toThrow('resume_invalid');
    expect(() => parseJobApplicationInput({ ...base, resumeUrl: 'javascript:alert(1)' })).toThrow('resume_invalid');
    expect(() => parseJobApplicationInput({ ...base, resumeUrl: `https://x.uz/${'a'.repeat(500)}` })).toThrow('resume_invalid');
  });
  it('xabar 1000 belgigacha kesiladi, vakansiya id ixtiyoriy', () => {
    const a = parseJobApplicationInput({ ...base, message: 'a'.repeat(1500), vacancyId: ' v1 ' });
    expect(a.message).toHaveLength(1000);
    expect(a.vacancyId).toBe('v1');
  });
});

describe('parseTypeInput', () => {
  const base = { categoryId: 'pc', label: 'GPU', labelRu: 'GPU', iconUrl: '/sections/gpu.webp', billzAliases: ['Videokarta'], sortOrder: 40 };
  it("to'liq kirish", () => {
    expect(parseTypeInput({ ...base, id: 'gpu' })).toEqual({ id: 'gpu', categoryId: 'pc', label: 'GPU', labelRu: 'GPU', iconUrl: '/sections/gpu.webp', billzAliases: ['Videokarta'], sortOrder: 40 });
  });
  it("id bo'lmasa nomdan slug; lotin bo'lmasa id_invalid", () => {
    expect(parseTypeInput({ ...base, label: 'Quvvat bloki' }).id).toBe('quvvat-bloki');
    expect(() => parseTypeInput({ ...base, label: 'Свет' })).toThrow('id_invalid');
    expect(() => parseTypeInput({ ...base, id: 'Bad Id' })).toThrow('id_invalid');
  });
  it('majburiy maydonlar va ikonka', () => {
    expect(() => parseTypeInput({ ...base, label: '' })).toThrow('label_required');
    expect(() => parseTypeInput({ ...base, categoryId: '' })).toThrow('categoryId_required');
    expect(() => parseTypeInput({ ...base, iconUrl: '' })).toThrow('icon_required');
    expect(() => parseTypeInput({ ...base, iconUrl: 'https://evil/x.png' })).toThrow('url_invalid');
    expect(parseTypeInput({ ...base, iconUrl: '/images/products/abc.webp' }).iconUrl).toBe('/images/products/abc.webp');
  });
  it('aliaslar tozalanadi va chegaralanadi', () => {
    expect(parseTypeInput({ ...base, billzAliases: [' DDR4 ', '', 5, 'DDR5'] }).billzAliases).toEqual(['DDR4', 'DDR5']);
    expect(parseTypeInput({ ...base, billzAliases: undefined }).billzAliases).toEqual([]);
    expect(() => parseTypeInput({ ...base, billzAliases: Array.from({ length: 21 }, (_, i) => `a${i}`) })).toThrow('aliases_limit');
    expect(() => parseTypeInput({ ...base, billzAliases: ['x'.repeat(41)] })).toThrow('aliases_limit');
  });
  it('40 belgidan uzun nom rad etiladi', () => {
    expect(() => parseTypeInput({ ...base, label: 'a'.repeat(41) })).toThrow('label_long');
    expect(() => parseTypeInput({ ...base, labelRu: 'a'.repeat(41) })).toThrow('label_long');
  });
});

describe('parseTextsInput', () => {
  const keys = ['proTitle', 'newsTitle'];
  it('ikkala til trim qilinadi', () => {
    expect(parseTextsInput({ proTitle: { uz: '  Shior ', ru: ' Слоган ' } }, keys)).toEqual({ proTitle: { uz: 'Shior', ru: 'Слоган' } });
  });
  it("yo'q til bo'sh satr bo'ladi", () => {
    expect(parseTextsInput({ newsTitle: { uz: 'Yangiliklar' } }, keys)).toEqual({ newsTitle: { uz: 'Yangiliklar', ru: '' } });
  });
  it("registrda yo'q kalit — key_invalid", () => {
    expect(() => parseTextsInput({ adminPassword: { uz: 'x', ru: '' } }, keys)).toThrow('key_invalid');
  });
  it('2000 belgidan uzun — text_too_long', () => {
    expect(() => parseTextsInput({ proTitle: { uz: 'a'.repeat(2001), ru: '' } }, keys)).toThrow('text_too_long');
    expect(parseTextsInput({ proTitle: { uz: 'a'.repeat(2000), ru: '' } }, keys).proTitle.uz).toHaveLength(2000);
  });
  it("obyekt bo'lmagan body va qiymat — body_not_object", () => {
    expect(() => parseTextsInput(null, keys)).toThrow('body_not_object');
    expect(() => parseTextsInput({ proTitle: 'matn' }, keys)).toThrow('body_not_object');
  });
});

describe('parseAssetsInput', () => {
  const fields = [
    { key: 'logo', kind: 'image' as const },
    { key: 'hero.apple.video1', kind: 'video' as const },
  ];
  it("yuklangan rasm va video yo'li qabul qilinadi, bo'sh — standartga qaytish", () => {
    expect(parseAssetsInput({ logo: ' /images/products/9f1c-2a.webp ', 'hero.apple.video1': '' }, fields))
      .toEqual({ logo: '/images/products/9f1c-2a.webp', 'hero.apple.video1': '' });
    expect(parseAssetsInput({ 'hero.apple.video1': '/images/products/abc.mp4' }, fields))
      .toEqual({ 'hero.apple.video1': '/images/products/abc.mp4' });
  });
  it("registrda yo'q kalit — key_invalid", () => {
    expect(() => parseAssetsInput({ 'hero.tv.image': '/images/products/a.webp' }, fields)).toThrow('key_invalid');
  });
  it("begona yoki yolg'on yo'l — url_invalid", () => {
    for (const url of [
      'https://evil.example/a.webp',
      '/images/products/../secret.webp',
      '/images/other/a.webp',
      '/images/products/a.svg',
      '/images/products/a.webp?x=1',
    ]) {
      expect(() => parseAssetsInput({ logo: url }, fields)).toThrow('url_invalid');
    }
  });
  it('rasm kalitiga video va aksincha — url_invalid', () => {
    expect(() => parseAssetsInput({ logo: '/images/products/a.mp4' }, fields)).toThrow('url_invalid');
    expect(() => parseAssetsInput({ 'hero.apple.video1': '/images/products/a.webp' }, fields)).toThrow('url_invalid');
  });
});
