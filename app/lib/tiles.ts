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
  /** `img` — registrdagi shaffof 2x ikonka (true) yoki mahsulot fotosi (false); ko'rinishi farq qiladi. */
  icon: boolean;
}

/**
 * Yo'nalish sahifasidagi rasmli bo'lim qatori: yo'nalishning turlari, lekin
 * faqat mahsuloti borlari — bo'sh turga bosgan mijoz bo'sh katalogga tushardi.
 *
 * Tartib registrdagi tartib (do'kon egasi qo'ygan mantiq), mahsulot soni emas.
 * Rasm — registrdagi ikonka (`ProductType.icon`), bo'lmasa o'sha turdagi birinchi
 * mahsulotniki: yangi tur qo'shilsa qator ikonkasiz ham o'zi yangilanadi.
 */
export function categoryTiles(rows: TileRow[], categoryId: string, lang: 'uz' | 'ru'): CategoryTile[] {
  const firstImage = new Map<string, string>();
  for (const r of rows) if (!firstImage.has(r.type)) firstImage.set(r.type, r.imageUrl);
  const tiles: CategoryTile[] = [];
  for (const t of typesFor(categoryId)) {
    const img = firstImage.get(t.id);
    // Mahsuloti yo'q tur ikonkasi bo'lsa ham chiqmaydi — bo'sh katalogga olib borardi.
    if (img) tiles.push({ id: t.id, label: lang === 'ru' ? t.labelRu : t.label, img: t.icon ?? img, icon: Boolean(t.icon) });
  }
  // Bitta tile qator emas — u faqat "hammasi" degan yolg'on tanlov bo'lib qolardi.
  return tiles.length >= 2 ? tiles : [];
}
