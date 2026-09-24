import { describe, expect, it } from 'vitest';
import type { Dict } from './dict';
import { i18n, parseLang } from './index';

describe('admin i18n', () => {
  it("sinxron init: server va birinchi render o'zbekcha", () => {
    expect(i18n.isInitialized).toBe(true);
    expect(i18n.language).toBe('uz');
  });

  it('bir kalit ikkala tilda', () => {
    expect(i18n.getFixedT('uz', 'shell')('footer.language')).toBe('Til');
    expect(i18n.getFixedT('ru', 'shell')('footer.language')).toBe('Язык');
  });

  it("saqlangan qiymat: faqat 'ru' ruscha, qolgani o'zbekcha", () => {
    expect(parseLang('ru')).toBe('ru');
    expect(parseLang('uz')).toBe('uz');
    expect(parseLang(null)).toBe('uz');
    expect(parseLang('en')).toBe('uz');
  });

  it("tiplar: noma'lum kalit va chala ruscha fayl lint'ni yiqitadi", () => {
    // @ts-expect-error — mavjud bo'lmagan kalit (strictKeyChecks)
    i18n.t('shell:footer.nope');
    // @ts-expect-error — ruscha faylda kalit tushib qolgan
    const broken: Dict<{ a: 'x'; b: 'y' }> = { a: 'x' };
    expect(broken.a).toBe('x');
  });
});
