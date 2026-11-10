/** Kartadagi rasm o'lchami chegaralari (foiz). 100 — odatdagi o'lcham; surgich va server bitta qoidani o'qiydi. */
export const NEWS_SCALE_MIN = 50;
export const NEWS_SCALE_MAX = 130;

export function clampNewsScale(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(NEWS_SCALE_MAX, Math.max(NEWS_SCALE_MIN, Math.round(v))) : 100;
}

/** Yangiliklar matnidagi belgi: o'rniga tugma havolasidagi mahsulotning joriy narxi qo'yiladi. */
export const PRICE_TOKEN = '{narx}';

/** `/product/<id>` havolasidan mahsulot id'si; boshqa havolada null. */
export function newsProductId(linkUrl: string): string | null {
  return /^\/product\/([^/?#]+)/.exec(linkUrl)?.[1] ?? null;
}

export function needsNewsPrice(news: { text: string; textRu: string }): boolean {
  return news.text.includes(PRICE_TOKEN) || news.textRu.includes(PRICE_TOKEN);
}

/**
 * `{narx}` ni tayyor narx satri bilan almashtiradi. Narx yo'q bo'lsa (mahsulot yashirin yoki havola
 * mahsulotga emas) belgili gap butunlay tushadi — mijoz xom `{narx}` yoki yarim gapni ko'rmasin.
 */
export function fillNewsPrice(text: string, price: string | null): string {
  if (price !== null) return text.replaceAll(PRICE_TOKEN, price);
  return text.replace(/[^.!?]*\{narx\}[^.!?]*[.!?]?\s*/g, '').trim();
}
