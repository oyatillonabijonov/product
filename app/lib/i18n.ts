import type { LangKey } from '../../src/locales';
import type { LocalizedText } from '../../shared/types';

export const LOCALES = ['uz', 'ru'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'uz';

const LOCALE_TO_LANG: Record<Locale, LangKey> = {
  uz: "O'zbek tili",
  ru: 'Rus tili',
};
const LANG_TO_LOCALE = Object.fromEntries(
  Object.entries(LOCALE_TO_LANG).map(([l, k]) => [k, l as Locale]),
) as Record<LangKey, Locale>;

const HTML_LANG: Record<Locale, string> = { uz: 'uz', ru: 'ru' };

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
export function stripLocale(pathname: string): string {
  const seg = pathname.split('/').filter(Boolean);
  if (seg[0] && (LOCALES as readonly string[]).includes(seg[0]) && seg[0] !== DEFAULT_LOCALE) {
    return '/' + seg.slice(1).join('/');
  }
  return pathname || '/';
}

export function localeToTextKey(locale: Locale): keyof LocalizedText {
  return locale === 'ru' ? 'ru' : 'uz';
}

/** Kategoriya nomi lokal bo'yicha — ruscha nom bo'sh bo'lsa o'zbekchasiga tushadi. */
export function categoryLabel(c: { name: string; nameRu: string }, locale: Locale): string {
  return locale === 'ru' && c.nameRu ? c.nameRu : c.name;
}
