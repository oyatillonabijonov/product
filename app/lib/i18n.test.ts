import { describe, it, expect } from 'vitest';
import { resolveLocale, localizedPath, localeToLang, langToLocale, htmlLang, DEFAULT_LOCALE } from './i18n';

describe('i18n', () => {
  it('resolves valid and default locales', () => {
    expect(resolveLocale(undefined)).toBe('uz');
    expect(resolveLocale('ru')).toBe('ru');
    expect(resolveLocale('uz-cyrl')).toBe('uz-cyrl');
  });
  it('rejects unknown locale', () => {
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
    expect(langToLocale("O'zbek tili (Cyrillic)")).toBe('uz-cyrl');
  });
  it('produces html lang codes', () => {
    expect(htmlLang('uz-cyrl')).toBe('uz-Cyrl');
    expect(htmlLang('en')).toBe('en');
    expect(DEFAULT_LOCALE).toBe('uz');
  });
});
