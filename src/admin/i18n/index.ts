import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import uzCommon from './uz/common';
import uzShell from './uz/shell';
import uzProducts from './uz/products';
import uzOrders from './uz/orders';
import uzContent from './uz/content';
import uzSite from './uz/site';
import uzSettings from './uz/settings';
import uzErrors from './uz/errors';
import ruCommon from './ru/common';
import ruShell from './ru/shell';
import ruProducts from './ru/products';
import ruOrders from './ru/orders';
import ruContent from './ru/content';
import ruSite from './ru/site';
import ruSettings from './ru/settings';
import ruErrors from './ru/errors';

/**
 * Admin tarjimalari (spec `docs/superpowers/specs/2026-09-24-admin-rus-tili-design.md`).
 * O'zbekcha — manba (`uz/*`, `as const`), ruscha `Dict<typeof uz>` bilan tuzilmasi tekshiriladi.
 * Faqat admin import qiladi — storefront chunk'lariga tushmaydi. Serverda til hech qachon
 * almashtirilmaydi (`changeLanguage` faqat klient effektida) — so'rovlar orasida til sizmaydi.
 */
export type AdminLang = 'uz' | 'ru';
export const ADMIN_LANGS: AdminLang[] = ['uz', 'ru'];
/** Til nomi o'z tilida — tarjima qilinmaydi. */
export const LANG_NAMES: Record<AdminLang, string> = { uz: "O'zbekcha", ru: 'Русский' };
const KEY = 'adminLang';

const uz = {
  common: uzCommon, shell: uzShell, products: uzProducts, orders: uzOrders,
  content: uzContent, site: uzSite, settings: uzSettings, errors: uzErrors,
};
const ru = {
  common: ruCommon, shell: ruShell, products: ruProducts, orders: ruOrders,
  content: ruContent, site: ruSite, settings: ruSettings, errors: ruErrors,
};

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: typeof uz;
    strictKeyChecks: true;
  }
}

void i18n.use(initReactI18next).init({
  resources: { uz, ru },
  lng: 'uz',
  fallbackLng: 'uz',
  supportedLngs: ADMIN_LANGS,
  ns: Object.keys(uz),
  defaultNS: 'common',
  initAsync: false, // v26 sukuti `true` — SSR'da sinxron bo'lishi shart
  interpolation: { escapeValue: false }, // React o'zi escape qiladi
  returnNull: false,
});

export { i18n };

/** Saqlangan qiymat → til; noma'lum yoki bo'sh — o'zbekcha. */
export function parseLang(raw: string | null): AdminLang {
  return raw === 'ru' ? 'ru' : 'uz';
}

function apply(lang: AdminLang): void {
  void i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
}

/** `AdminApp`ning birinchi effekti: saqlangan tilni qo'llaydi (server va gidratatsiya — o'zbekcha). */
export function restoreAdminLang(): void {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(KEY);
  } catch {
    /* private rejimda localStorage yo'q — sukut o'zbekcha */
  }
  const lang = parseLang(saved);
  if (lang !== i18n.language) apply(lang);
}

/** Joriy til va almashtirgich; tanlov darhol qo'llanadi va shu brauzerda eslab qolinadi. */
export function useAdminLang(): { lang: AdminLang; setLang: (l: AdminLang) => void } {
  const { i18n: instance } = useTranslation();
  const setLang = (l: AdminLang) => {
    apply(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* private rejim — til shu sahifada baribir almashadi */
    }
  };
  return { lang: parseLang(instance.language), setLang };
}
