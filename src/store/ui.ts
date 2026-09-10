/**
 * Landing bo'ylab takrorlanadigan o'lchamlar — sarlavha va tugma.
 *
 * Sinflar shu yerda turadi, komponentlarda qayta yozilmaydi: aks holda har bir
 * bo'lim o'z radiusi va shriftiga ega bo'lib ketadi (shunday bo'lgan edi).
 *
 * Tipografika klasslari (`text-title`, `text-para`, …) o'lcham bilan birga o'ziga
 * mos tracking va leading'ni olib keladi — `app/styles.css` `@theme` blokiga qarang.
 */
export const SECTION_HEADING = 'text-heading md:text-title font-semibold text-balance';

/**
 * Tugma — apple.com'dan o'lchangan spetsifikatsiya: balandlik **44px**,
 * ichki bo'shliq `11px 21px`, o'lcham **17px**, qalinlik **400** (Apple tugmada
 * qalin shrift ishlatmaydi), tracking −0.022em, radius `980px` — ya'ni to'liq pill.
 * `text-copy` shu uchalasini (17px + leading + tracking) o'zi olib keladi.
 *
 * Balandlik uch pog'ona: 52px asosiy CTA · 44px odatiy (Apple qiymati) ·
 * 36px ixcham (nav va ikon tugmalari, Apple'da radiusi 8px). Boshqasi yo'q.
 *
 * Har uchalasida `press` bor: javob barmoq **tushganda** beriladi, qo'yib
 * yuborilganda emas (Apple "Designing Fluid Interfaces" §1). `press` o'tishlarni
 * o'zi boshqargani uchun ustiga `transition-colors` qo'shilmaydi.
 */
export const BTN_LG =
  'press inline-flex h-[52px] items-center justify-center gap-2 rounded-full px-7 text-copy font-normal';

export const PILL =
  'press inline-flex h-11 items-center gap-2 rounded-full bg-primary px-[21px] text-copy font-normal text-bg hover:opacity-85';

export const BTN_MD =
  'press inline-flex h-11 items-center justify-center gap-2 rounded-full px-[21px] text-copy font-normal';

/** Ixcham tugma — Apple'da 36px balandlik va 8px radius (pill emas). */
export const BTN_SM =
  'press inline-flex h-9 items-center justify-center gap-2 rounded-xs px-4 text-label font-normal';
