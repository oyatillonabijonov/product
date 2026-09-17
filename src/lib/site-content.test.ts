import { describe, expect, it } from 'vitest';
import { translations } from '../locales';
import { ASSET_FIELDS, ASSET_KEYS, TEXT_FIELDS, isAssetKey, mergeTexts, planTextWrites, textOverrides } from './site-content';

const uz = translations["O'zbek tili"];
const ru = translations['Rus tili'];

describe('mergeTexts', () => {
  it("bo'sh bo'lmagan o'zgarish shu tildagi standartni almashtiradi", () => {
    expect(mergeTexts(uz, { proTitle: { uz: 'Yangi shior', ru: 'Новый слоган' } }, 'uz').proTitle).toBe('Yangi shior');
    expect(mergeTexts(ru, { proTitle: { uz: 'Yangi shior', ru: '' } }, 'ru').proTitle).toBe(ru.proTitle);
  });
  it("registrda yo'q kalit e'tiborsiz qoladi", () => {
    expect(mergeTexts(uz, { cartTitle: { uz: 'Savatcha', ru: '' } }, 'uz').cartTitle).toBe(uz.cartTitle);
  });
  it("o'zgarish bo'lmasa asl matnlar", () => {
    expect(mergeTexts(uz, {}, 'uz')).toEqual(uz);
  });
});

describe('textOverrides', () => {
  it("faqat shu tildagi bo'sh bo'lmagan qiymatlar", () => {
    expect(textOverrides({ proTitle: { uz: 'A', ru: '' }, newsTitle: { uz: '', ru: 'Б' } }, 'uz')).toEqual({ proTitle: 'A' });
    expect(textOverrides({ proTitle: { uz: 'A', ru: '' }, newsTitle: { uz: '', ru: 'Б' } }, 'ru')).toEqual({ newsTitle: 'Б' });
  });
});

describe('planTextWrites', () => {
  it("standartga teng til bo'sh deb yoziladi, registrdan tashqari kalit tashlanadi", () => {
    const rows = planTextWrites({ proTitle: { uz: uz.proTitle, ru: 'Свой слоган' }, cartTitle: { uz: 'x', ru: 'y' } }, uz, ru);
    expect(rows).toEqual([{ key: 'proTitle', uz: '', ru: 'Свой слоган' }]);
  });
});

describe('registr', () => {
  it('kalitlar takrorlanmaydi, rasm maydonlari ASSET_KEYS tartibida', () => {
    const keys = TEXT_FIELDS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(ASSET_FIELDS.map((f) => f.key)).toEqual([...ASSET_KEYS]);
  });
  it("yangi matnlarning standarti", () => {
    expect(uz.heroPc).toBe('Personal\nComputers');
    expect(ru.heroApple).toBe('Apple');
    expect(uz.seoOpeningHours).toBe('Mo-Su 10:00-21:00');
    expect(ru.seoOpeningHours).toBe('Mo-Su 10:00-21:00');
  });
  it('isAssetKey', () => {
    expect(isAssetKey('hero.pc.video1')).toBe(true);
    expect(isAssetKey('hero.tv.image')).toBe(false);
  });
});
