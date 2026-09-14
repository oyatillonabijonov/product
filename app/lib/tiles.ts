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
  /** Rasm yo'li; `null` — na ikonka, na mahsulot rasmi bor (UI chiziqli ikonka chizadi). */
  img: string | null;
  /** `img` — registrdagi shaffof 2x ikonka (true) yoki mahsulot fotosi (false); ko'rinishi farq qiladi. */
  icon: boolean;
}

/**
 * Yo'nalish sahifasidagi rasmli bo'lim qatori: yo'nalishning **hamma** turi, mahsuloti
 * yo'qlari ham (2026-09-14, egasining talabi — do'kon tuzilishi assortiment kelmasidan
 * ko'rinib tursin; bo'sh turga bosilsa katalog "topilmadi" deydi).
 *
 * Tartib registrdagi tartib (do'kon egasi qo'ygan mantiq), mahsulot soni emas.
 * Rasm — registrdagi ikonka (`ProductType.icon`), bo'lmasa o'sha turdagi birinchi
 * mahsulotniki, u ham bo'lmasa `null`.
 */
export function categoryTiles(rows: TileRow[], categoryId: string, lang: 'uz' | 'ru'): CategoryTile[] {
  const firstImage = new Map<string, string>();
  for (const r of rows) if (r.imageUrl && !firstImage.has(r.type)) firstImage.set(r.type, r.imageUrl);
  return typesFor(categoryId).map((t) => ({
    id: t.id,
    label: lang === 'ru' ? t.labelRu : t.label,
    img: t.icon ?? firstImage.get(t.id) ?? null,
    icon: Boolean(t.icon),
  }));
}
