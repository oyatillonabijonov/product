/**
 * Landing bo'ylab takrorlanadigan ikkita o'lcham — sarlavha va tugma.
 *
 * Sinflar shu yerda turadi, komponentlarda qayta yozilmaydi: aks holda har bir
 * bo'lim o'z radiusi va shriftiga ega bo'lib ketadi (shunday bo'lgan edi).
 */
export const SECTION_HEADING =
  'text-[30px] md:text-[44px] font-semibold leading-[1.08] tracking-[-0.03em] text-balance';

/**
 * Tugma balandligi uch pog'ona: 52px asosiy CTA · 44px odatiy (PILL) ·
 * 36px ixcham (nav va ikon tugmalari). Boshqa balandlik ishlatilmaydi.
 */
export const BTN_LG =
  'inline-flex h-[52px] items-center justify-center gap-2 rounded-full px-7 text-[16px] font-semibold transition-colors';

export const PILL =
  'inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-[15px] font-medium text-bg transition-opacity duration-300 hover:opacity-85';

export const BTN_MD =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium transition-colors';
