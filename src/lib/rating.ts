/**
 * Reyting — sof hisob-kitob. Ma'lumot saytda hisoblanmaydi: do'kon egasi
 * tashqi manbadan ko'chirib, admin panelda kiritadi.
 */

/** Yulduzchalar qatorining necha foizi to'ldirilishi (0–100). */
export function starFillPercent(rating: number | null | undefined): number {
  if (typeof rating !== 'number' || !Number.isFinite(rating)) return 0;
  return (Math.min(5, Math.max(0, rating)) / 5) * 100;
}

/**
 * Rus tilida son bilan kelgan ot uchta shaklga ega: 1 отзыв · 2 отзыва ·
 * 5 отзывов. O'zbek tilida bunday kelishuv yo'q, shuning uchun uchala kalit ham
 * bir xil matnni beradi va bu funksiya faqat qaysi kalitni olishni aytadi.
 *
 * @returns 0 = one · 1 = few · 2 = many
 */
export function ruPluralIndex(n: number): 0 | 1 | 2 {
  const abs = Math.abs(Math.floor(n));
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 14) return 2;
  const mod10 = abs % 10;
  if (mod10 === 1) return 0;
  if (mod10 >= 2 && mod10 <= 4) return 1;
  return 2;
}
