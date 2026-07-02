import type { LangKey } from '../../src/locales';

export const LOCALES = ['uz', 'ru', 'en', 'uz-cyrl'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'uz';

const LOCALE_TO_LANG: Record<Locale, LangKey> = {
  uz: "O'zbek tili",
  ru: 'Rus tili',
  en: 'English',
  'uz-cyrl': "O'zbek tili (Cyrillic)",
};
const LANG_TO_LOCALE = Object.fromEntries(
  Object.entries(LOCALE_TO_LANG).map(([l, k]) => [k, l as Locale]),
) as Record<LangKey, Locale>;

const HTML_LANG: Record<Locale, string> = { uz: 'uz', ru: 'ru', en: 'en', 'uz-cyrl': 'uz-Cyrl' };

export function localeToLang(locale: Locale): LangKey {
  return LOCALE_TO_LANG[locale];
}
export function langToLocale(lang: LangKey): Locale {
  return LANG_TO_LOCALE[lang];
}
export function resolveLocale(param: string | undefined): Locale | null {
  if (param === undefined) return DEFAULT_LOCALE;
  return (LOCALES as readonly string[]).includes(param) ? (param as Locale) : null;
}
export function localizedPath(locale: Locale, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return clean;
  return clean === '/' ? `/${locale}` : `/${locale}${clean}`;
}
export function htmlLang(locale: Locale): string {
  return HTML_LANG[locale];
}
