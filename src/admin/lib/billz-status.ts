import type { BillzSyncStatus } from '../../../shared/billz';
import { errText } from '../errText';

/**
 * Billz holati sodda tilda — bosh sahifa ham, Sozlamalar → Integratsiyalar ham
 * shu funksiyani o'qiydi, shuning uchun egasi ikki ekranda bir xil gapni ko'radi.
 * Ilgari ikkalasida «ko'rildi 1593/1596 · yangi 0 · yangilandi 1198» kabi texnik
 * qator turardi — raqamlar to'g'ri edi, lekin nimani anglatishi aytilmasdi.
 * `error: true` — qizil ko'rsatiladi (ekranning o'zi bo'yaydi).
 */
export function billzStatusText(s: BillzSyncStatus | null): { text: string; error: boolean } {
  if (!s) return { text: 'Holat yuklanmoqda…', error: false };
  if (!s.configured) return { text: "Billz ulanmagan. Integratsiyalar bo'limida kalit va do'konni saqlang.", error: true };
  if (s.running) return { text: 'Hozir yangilanmoqda…', error: false };
  const last = s.last;
  if (!last) return { text: 'Hali bir marta ham yangilanmagan.', error: false };

  // Soniyasiz: egasiga aniq lahza emas, qachonligi kerak.
  const when = new Date(last.at).toLocaleString('ru-RU', {
    timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  if (!last.ok) {
    return { text: `${when} da urinish xato bilan tugadi: ${errText(new Error(last.error ?? 'network'))}`, error: true };
  }
  const parts = [`Billz'dan ${last.count} ta tovar o'qildi`];
  if (last.inserted > 0) parts.push(`${last.inserted} tasi yangi qo'shildi`);
  if (last.updated > 0) parts.push(`${last.updated} tasining ma'lumoti yangilandi`);
  if (last.hidden > 0) parts.push(`${last.hidden} tasi saytdan yashirildi`);
  if (parts.length === 1) parts.push("o'zgarish bo'lmadi");
  return { text: `${when} da yangilandi. ${parts.join(', ')}.`, error: false };
}
