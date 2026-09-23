import type { TextKey } from './site-content';

/** "Biz haqimizda" — markdown o'rniga `about` matnlari va fotolari bilan chiziladigan sahifa. */
export const ABOUT_SLUG = 'biz-haqimizda';

/** Maxfiylik siyosati — cookie bildirishnomasidagi "Batafsil" havolasi shu yerga. */
export const PRIVACY_SLUG = 'maxfiylik';

/**
 * `LegalPage` shablonidagi sahifalar: slug → sarlavha ostidagi izoh kaliti (`legal` guruhi). Registrdan alohida
 * modul — sahifa route'ining client bundle'iga butun registr (`TEXT_FIELDS`) tushmasin.
 */
export const LEGAL_LEDE_KEYS: Partial<Record<string, TextKey>> = {
  oferta: 'legalLedeOferta',
  maxfiylik: 'legalLedePrivacy',
  qaytarish: 'legalLedeReturns',
  'muddatli-tolov': 'termsLede',
};
