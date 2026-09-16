import type { ApiProduct } from '../../../shared/types';

/** Tez filtr segmentlari (URL `f`); `''` — hammasi. */
export type QuickFilter = '' | 'needs_image' | 'hidden' | 'stock0' | 'manual';

export const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: '', label: 'Hammasi' },
  { id: 'needs_image', label: 'Rasm kerak' },
  { id: 'hidden', label: 'Yashirin' },
  { id: 'stock0', label: 'Qoldiq 0' },
  { id: 'manual', label: "Qo'lda kiritilgan" },
];

export interface ProductFilter {
  q?: string;
  categoryId?: string;
  brandId?: string;
  condition?: string; // '' | 'yangi' | 'ishlatilgan'
  quick?: QuickFilter;
}

/** Bitta mahsulot tez filtrga mos keladimi. `billzId` bo'sh — qo'lda kiritilgan. */
export function quickFilter(p: ApiProduct, f: QuickFilter): boolean {
  switch (f) {
    case 'needs_image': return Boolean(p.billzId) && !p.imageUrl;
    case 'hidden': return !p.isActive;
    case 'stock0': return p.billzStock === 0;
    case 'manual': return !p.billzId;
    default: return true;
  }
}

/**
 * Admin mahsulotlar ro'yxatini client tomonda filtrlaydi (nom qidiruv +
 * kategoriya/brend/holat/tez filtr). Bo'sh filtr maydonlari e'tiborsiz qoldiriladi.
 */
export function filterProducts(items: ApiProduct[], f: ProductFilter): ApiProduct[] {
  const q = (f.q ?? '').trim().toLowerCase();
  return items.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q)) return false;
    if (f.categoryId && p.categoryId !== f.categoryId) return false;
    if (f.brandId && p.brandId !== f.brandId) return false;
    if (f.condition && p.condition !== f.condition) return false;
    if (f.quick && !quickFilter(p, f.quick)) return false;
    return true;
  });
}
