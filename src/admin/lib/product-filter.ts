import type { ApiProduct } from '../../../shared/types';

export interface ProductFilter {
  q?: string;
  categoryId?: string;
  brandId?: string;
  condition?: string; // '' | 'yangi' | 'ishlatilgan'
  status?: string; // '' | 'active' | 'hidden'
}

/**
 * Admin mahsulotlar ro'yxatini client tomonda filtrlaydi (nom qidiruv +
 * kategoriya/brend/holat/status). Bo'sh filtr maydonlari e'tiborsiz qoldiriladi.
 */
export function filterProducts(items: ApiProduct[], f: ProductFilter): ApiProduct[] {
  const q = (f.q ?? '').trim().toLowerCase();
  return items.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q)) return false;
    if (f.categoryId && p.categoryId !== f.categoryId) return false;
    if (f.brandId && p.brandId !== f.brandId) return false;
    if (f.condition && p.condition !== f.condition) return false;
    if (f.status === 'active' && !p.isActive) return false;
    if (f.status === 'hidden' && p.isActive) return false;
    return true;
  });
}
