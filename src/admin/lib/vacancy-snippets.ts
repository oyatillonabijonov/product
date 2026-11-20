import type { Locale } from '../../../app/lib/i18n';

/** Vakansiya matniga bir bosishda qo'shiladigan tayyor qatorlar — saytga yoziladigan matn, shuning uchun admin tilida emas, matn tilida. */
export const SNIPPETS: Record<Locale, { heading: string; items: string[] }[]> = {
  uz: [
    { heading: 'Vazifalar', items: ['Mijozlarga maslahat berish', 'Buyurtmalarni qabul qilish', "Qo'ng'iroqlarga javob berish", 'Tovarlar hisobini yuritish'] },
    { heading: 'Talablar', items: ['Texnikaga qiziqish', 'Rus tilini bilish', 'Muloqotga ochiqlik', 'Tajriba — afzallik'] },
    { heading: 'Biz taklif qilamiz', items: ['Rasmiy ishga joylashtirish', "O'z vaqtida maosh", 'Sotuvdan bonus', "Bepul o'qitish"] },
    { heading: 'Ish vaqti', items: ['Har kuni 10:00–20:00', '5/2 jadval', '2/2 jadval'] },
  ],
  ru: [
    { heading: 'Обязанности', items: ['Консультировать клиентов', 'Принимать заказы', 'Отвечать на звонки', 'Вести учёт товаров'] },
    { heading: 'Требования', items: ['Интерес к технике', 'Знание узбекского языка', 'Коммуникабельность', 'Опыт — преимущество'] },
    { heading: 'Мы предлагаем', items: ['Официальное трудоустройство', 'Своевременная зарплата', 'Бонус с продаж', 'Бесплатное обучение'] },
    { heading: 'График', items: ['Ежедневно 10:00–20:00', 'График 5/2', 'График 2/2'] },
  ],
};

const bullet = (item: string) => `- ${item}`;
const isHeading = (l: string) => l.startsWith('## ');
const tidy = (lines: string[]) => lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

export const hasBullet = (md: string, item: string) => md.split('\n').some((l) => l.trim() === bullet(item));

/** Qator bo'lsa olib tashlaydi (bo'limi bo'shab qolsa sarlavhasi ham ketadi), bo'lmasa o'z bo'limi oxiriga qo'shadi. */
export function toggleBullet(md: string, heading: string, item: string): string {
  const lines = md.split('\n');
  const at = lines.findIndex((l) => l.trim() === bullet(item));
  if (at >= 0) {
    lines.splice(at, 1);
    const h = lines.findIndex((l) => l.trim() === `## ${heading}`);
    if (h >= 0) {
      let end = lines.findIndex((l, i) => i > h && isHeading(l));
      if (end < 0) end = lines.length;
      if (lines.slice(h + 1, end).every((l) => !l.trim())) lines.splice(h, end - h);
    }
    return tidy(lines);
  }
  const h = lines.findIndex((l) => l.trim() === `## ${heading}`);
  if (h < 0) return tidy([...lines, '', `## ${heading}`, '', bullet(item)]);
  let end = lines.findIndex((l, i) => i > h && isHeading(l));
  if (end < 0) end = lines.length;
  let last = end - 1;
  while (last > h && !lines[last].trim()) last--;
  lines.splice(last + 1, 0, ...(lines[last].trim().startsWith('- ') ? [] : ['']), bullet(item), '');
  return tidy(lines);
}
