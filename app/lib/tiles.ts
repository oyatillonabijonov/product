import { typesFor } from '../../shared/product-types';

/** Tile qatori uchun kerak bo'lgan mahsulot maydonlari (SQL'dan kelgan xom qator). */
export interface TileRow {
  type: string;
  imageUrl: string;
}

export interface CategoryTile {
  /** `products.type` qiymati — havolada `?tur=` bo'lib ketadi. */
  id: string;
  label: string;
  img: string;
}

/**
 * Yo'nalish sahifasidagi rasmli bo'lim qatori: yo'nalishning turlari, lekin
 * faqat mahsuloti borlari — bo'sh turga bosgan mijoz bo'sh katalogga tushardi.
 *
 * Tartib registrdagi tartib (do'kon egasi qo'ygan mantiq), mahsulot soni emas.
 * Rasm — o'sha turdagi birinchi mahsulotniki, shuning uchun yangi tur qo'shilsa
 * qator o'zi yangilanadi: alohida asset yuklash kerak emas.
 */
export function categoryTiles(rows: TileRow[], categoryId: string, lang: 'uz' | 'ru'): CategoryTile[] {
  const firstImage = new Map<string, string>();
  for (const r of rows) if (!firstImage.has(r.type)) firstImage.set(r.type, r.imageUrl);
  const tiles: CategoryTile[] = [];
  for (const t of typesFor(categoryId)) {
    const img = firstImage.get(t.id);
    if (img) tiles.push({ id: t.id, label: lang === 'ru' ? t.labelRu : t.label, img });
  }
  // Bitta tile qator emas — u faqat "hammasi" degan yolg'on tanlov bo'lib qolardi.
  return tiles.length >= 2 ? tiles : [];
}
