/**
 * Ko'rinishdagi telefondan bosiladigan raqam: faqat raqamlar, oldida `+` (`tel:` havolasi shundan yasaladi).
 * Egasi bitta maydonga ko'rinishini yozadi — `site_config.phone` shu yerda chiqariladi.
 */
export function phoneFromDisplay(display: string): string {
  const digits = display.replace(/\D+/g, '');
  return digits === '' ? '' : `+${digits}`;
}
