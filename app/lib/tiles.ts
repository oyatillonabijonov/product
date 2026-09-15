import { typesFor } from '../../shared/product-types';

export interface CategoryTile {
  /** `products.type` qiymati — havolada `?tur=` bo'lib ketadi. */
  id: string;
  label: string;
  /** Registrdagi shaffof 2x ikonka (`ProductType.icon`). */
  img: string;
}

/**
 * Yo'nalish sahifasidagi rasmli bo'lim qatori: yo'nalishning **hamma** turi, mahsuloti
 * yo'qlari ham (2026-09-14, egasining talabi — do'kon tuzilishi assortiment kelmasidan
 * ko'rinib tursin; bo'sh turga bosilsa katalog "topilmadi" deydi).
 *
 * Tartib registrdagi tartib (do'kon egasi qo'ygan mantiq), mahsulot soni emas.
 */
export function categoryTiles(categoryId: string, lang: 'uz' | 'ru'): CategoryTile[] {
  return typesFor(categoryId).map((t) => ({ id: t.id, label: lang === 'ru' ? t.labelRu : t.label, img: t.icon }));
}
