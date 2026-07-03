import { describe, it, expect } from 'vitest';
import { resolveLocale, localizedPath, localeToLang, langToLocale, htmlLang, DEFAULT_LOCALE, localeToTextKey } from './i18n';

describe('i18n', () => {
  it('resolves valid and default locales', () => {
    expect(resolveLocale(undefined)).toBe('uz');
    expect(resolveLocale('ru')).toBe('ru');
  });
  it('rejects unknown / removed locales', () => {
    expect(resolveLocale('en')).toBeNull();
    expect(resolveLocale('uz-cyrl')).toBeNull();
    expect(resolveLocale('de')).toBeNull();
    expect(resolveLocale('product')).toBeNull();
  });
  it('builds localized paths (default has no prefix)', () => {
    expect(localizedPath('uz', '/category/telefonlar')).toBe('/category/telefonlar');
    expect(localizedPath('ru', '/category/telefonlar')).toBe('/ru/category/telefonlar');
    expect(localizedPath('ru', '/')).toBe('/ru');
  });
  it('maps locale to LangKey and back', () => {
    expect(localeToLang('ru')).toBe('Rus tili');
    expect(langToLocale("O'zbek tili")).toBe('uz');
  });
  it('produces html lang codes', () => {
    expect(htmlLang('uz')).toBe('uz');
    expect(htmlLang('ru')).toBe('ru');
    expect(DEFAULT_LOCALE).toBe('uz');
  });
});

describe('localeToTextKey', () => {
  it('maps every locale to a LocalizedText key', () => {
    expect(localeToTextKey('uz')).toBe('uz');
    expect(localeToTextKey('ru')).toBe('ru');
  });
});
