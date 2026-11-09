/**
 * Kichik rasmlar: yuklangan rasm 1440px (≈100 KB), kartada esa ~300px ko'rinadi. Sayt manzilga `?w=` qo'shadi,
 * server (`server/thumbs.ts`) shu enga kichraytirib beradi. Enlar ro'yxati qat'iy — ikkala tomon shu fayldan o'qiydi.
 */
export const THUMB_WIDTHS = [320, 640] as const;

/** Faqat admin yoki Billz yuklagan rasmlar; `public/` dagi va tashqi manzillar o'zgarishsiz qoladi. */
const UPLOADED = /^\/images\/products\/[\w-]+\.(webp|jpe?g|png)$/i;

/** Fayl nomi (yo'lsiz) kichraytirsa bo'ladigan rasmmi — server shu bilan yo'ldan chiqishni ham to'sadi. */
export function isThumbName(name: string): boolean {
  return UPLOADED.test(`/images/products/${name}`);
}

/** Kichik, qat'iy o'lchamli rasm uchun manzil (ro'yxat qatori, konfigurator). */
export function thumbUrl(url: string): string {
  return UPLOADED.test(url) ? `${url}?w=${THUMB_WIDTHS[0]}` : url;
}

/** `<img srcSet>` — brauzer ekran zichligiga qarab enni o'zi tanlaydi; boshqa manzilda `undefined`. */
export function thumbSrcSet(url: string): string | undefined {
  return UPLOADED.test(url) ? THUMB_WIDTHS.map((w) => `${url}?w=${w} ${w}w`).join(', ') : undefined;
}
