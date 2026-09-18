/**
 * Ko'rinishdagi telefondan bosiladigan raqam: faqat raqamlar, oldida `+` (`tel:` havolasi shundan yasaladi).
 * Mahalliy 9 raqam yozilsa `998` old qo'shiladi — saytdagi maska bilan bir qoida (`src/lib/phone.ts`).
 * Egasi bitta maydonga ko'rinishini yozadi — `site_config.phone` shu yerda chiqariladi.
 */
export function phoneFromDisplay(display: string): string {
  const digits = display.replace(/\D+/g, '');
  if (digits === '') return '';
  return `+${digits.length === 9 ? `998${digits}` : digits}`;
}
