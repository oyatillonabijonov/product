import type { BillzSyncStatus } from '../../../shared/billz';
import { errText } from '../errText';
import { i18n } from '../i18n';

/**
 * Billz holati sodda tilda — bosh sahifa ham, Sozlamalar → Integratsiyalar ham
 * shu funksiyani o'qiydi, shuning uchun egasi ikki ekranda bir xil gapni ko'radi.
 * Ilgari ikkalasida «ko'rildi 1593/1596 · yangi 0 · yangilandi 1198» kabi texnik
 * qator turardi — raqamlar to'g'ri edi, lekin nimani anglatishi aytilmasdi.
 * `error: true` — qizil ko'rsatiladi (ekranning o'zi bo'yaydi).
 * Global `i18n` instansiyasi o'qiladi (joriy admin tili) — chaqiruvchilarga `t` uzatish shart emas.
 */
export function billzStatusText(s: BillzSyncStatus | null): { text: string; error: boolean } {
  if (!s) return { text: i18n.t('settings:billz.loading'), error: false };
  if (!s.configured) return { text: i18n.t('settings:billz.notConfigured'), error: true };
  if (s.running) return { text: i18n.t('settings:billz.running'), error: false };
  const last = s.last;
  if (!last) return { text: i18n.t('settings:billz.never'), error: false };

  // Soniyasiz: egasiga aniq lahza emas, qachonligi kerak.
  const when = new Date(last.at).toLocaleString('ru-RU', {
    timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  if (!last.ok) {
    return { text: i18n.t('settings:billz.failed', { when, error: errText(new Error(last.error ?? 'network')) }), error: true };
  }
  const parts: string[] = [i18n.t('settings:billz.read', { count: last.count })];
  if (last.inserted > 0) parts.push(i18n.t('settings:billz.inserted', { count: last.inserted }));
  if (last.updated > 0) parts.push(i18n.t('settings:billz.updated', { count: last.updated }));
  if (last.hidden > 0) parts.push(i18n.t('settings:billz.hidden', { count: last.hidden }));
  if (parts.length === 1) parts.push(i18n.t('settings:billz.noChanges'));
  return { text: i18n.t('settings:billz.done', { when, list: parts.join(', ') }), error: false };
}
