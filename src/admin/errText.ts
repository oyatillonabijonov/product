import { i18n } from './i18n';
import type uzErrors from './i18n/uz/errors';

/**
 * Server xato kodi → joriy admin tilidagi matn (`errors` namespace). Noma'lum kod — kodning o'zi, kodsiz — umumiy
 * xato. Imzo o'zgarmagan: ~40 chaqiruvchi (asosan event handler'lar) chaqirilgan paytdagi tilni oladi.
 * MCP klienti o'zbekcha `shared/err-text.ts` ni o'qishda davom etadi.
 */
export function errText(e: unknown): string {
  const code = e instanceof Error ? e.message : '';
  if (code && i18n.exists(code, { ns: 'errors' })) return i18n.t(code as keyof typeof uzErrors, { ns: 'errors' });
  return code || i18n.t('common:errorGeneric');
}
