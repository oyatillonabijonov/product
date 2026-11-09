import { describe, expect, it } from 'vitest';
import { fillNewsPrice, needsNewsPrice, newsProductId } from './news-price';

describe('newsProductId', () => {
  it('mahsulot havolasidan id oladi', () => {
    expect(newsProductId('/product/iphone-18-pro')).toBe('iphone-18-pro');
    expect(newsProductId('/product/abc?x=1')).toBe('abc');
  });
  it('boshqa havolada null', () => {
    expect(newsProductId('/category/apple')).toBeNull();
    expect(newsProductId('')).toBeNull();
  });
});

describe('needsNewsPrice', () => {
  it("ikkala tildagi matnni ko'radi", () => {
    expect(needsNewsPrice({ text: '{narx} dan.', textRu: '' })).toBe(true);
    expect(needsNewsPrice({ text: '', textRu: 'От {narx}.' })).toBe(true);
    expect(needsNewsPrice({ text: 'Matn', textRu: 'Текст' })).toBe(false);
  });
});

describe('fillNewsPrice', () => {
  it("belgini narx bilan almashtiradi", () => {
    expect(fillNewsPrice("{narx} dan. To'rt rangda.", "21 000 000 so'm")).toBe("21 000 000 so'm dan. To'rt rangda.");
  });
  it("narx yo'q bo'lsa faqat o'sha gap tushadi", () => {
    expect(fillNewsPrice("{narx} dan. To'rt rangda, 2TB gacha.", null)).toBe("To'rt rangda, 2TB gacha.");
    expect(fillNewsPrice('Yangi model. Narxi {narx}.', null)).toBe('Yangi model.');
    expect(fillNewsPrice('Faqat {narx}', null)).toBe('');
  });
  it("belgisiz matn o'zgarmaydi", () => {
    expect(fillNewsPrice('Oddiy matn.', null)).toBe('Oddiy matn.');
  });
});
