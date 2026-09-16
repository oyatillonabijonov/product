import { typesOf, type ProductTypeRow } from '../../shared/product-types';

export interface CategoryTile {
  /** `products.type` qiymati — havolada `?tur=` bo'lib ketadi. */
  id: string;
  label: string;
  /** Shaffof 2x ikonka (`product_types.icon_url`; sayt `[zoom:0.5]` bilan chizadi). */
  img: string;
}

/**
 * Yo'nalish sahifasidagi rasmli bo'lim qatori: yo'nalishning **hamma** turi (mahsuloti yo'qlari
 * ham — do'kon tuzilishi assortiment kelmasidan ko'rinsin), tartib `sort_order` (egasi admin'da
 * qo'yadi). Turlar bazadan (`loadTypes`), bu funksiya sof.
 */
export function categoryTiles(types: ProductTypeRow[], categoryId: string, lang: 'uz' | 'ru'): CategoryTile[] {
  return typesOf(types, categoryId).map((t) => ({
    id: t.id,
    label: lang === 'ru' && t.labelRu ? t.labelRu : t.label,
    img: t.iconUrl,
  }));
}
