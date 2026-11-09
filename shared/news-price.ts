/** Yangiliklar matnidagi belgi: o'rniga tugma havolasidagi mahsulotning joriy narxi qo'yiladi. */
const PRICE_TOKEN = '{narx}';

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
