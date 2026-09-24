import type { ParseKeys, TFunction } from 'i18next';
import type { ApiProduct } from '../../../shared/types';

/**
 * Tez filtr segmentlari (URL `f`); `''` — hammasi. Yorliqlar sodda tilda: egasi
 * "yashirin" yoki "qoldiq 0" emas, "saytda bormi" deb o'ylaydi.
 */
export type QuickFilter = '' | 'active' | 'hidden' | 'needs_image' | 'stock0' | 'manual';

export const QUICK_FILTERS: { id: QuickFilter; labelKey: ParseKeys<'products'> }[] = [
  { id: '', labelKey: 'filter.quick.all' },
  { id: 'active', labelKey: 'filter.quick.active' },
  { id: 'hidden', labelKey: 'filter.quick.hidden' },
  { id: 'needs_image', labelKey: 'filter.quick.needsImage' },
  { id: 'stock0', labelKey: 'filter.quick.stock0' },
  { id: 'manual', labelKey: 'filter.quick.manual' },
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
    case 'active': return p.isActive;
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

/**
 * Ro'yxat ustidagi xulosa — raqam emas, holat: nechtasi saytda va ko'rinmayotganlari
 * nega ko'rinmayapti. Sabablar **bir-birini takrorlamaydi**: har tovar birinchi mos
 * sababga qo'shiladi (rasm → qoldiq → qo'lda yashirilgan), shuning uchun ularning
 * yig'indisi ko'rinmayotganlar soniga teng.
 */
export function summaryText(items: ApiProduct[], t: TFunction<'products'>): string {
  const total = items.length;
  if (total === 0) return t('filter.empty');
  const hidden = items.filter((p) => !p.isActive);
  const head = t('filter.total', { count: total, active: total - hidden.length });
  if (hidden.length === 0) return `${head}.`;

  const noImage = hidden.filter((p) => !p.imageUrl).length;
  const noStock = hidden.filter((p) => p.imageUrl && p.billzStock === 0).length;
  const byHand = hidden.length - noImage - noStock;
  const why = [
    noImage > 0 ? t('filter.noImage', { count: noImage }) : '',
    noStock > 0 ? t('filter.noStock', { count: noStock }) : '',
    byHand > 0 ? t('filter.byHand', { count: byHand }) : '',
  ].filter(Boolean);
  return `${head}, ${t('filter.hidden', { count: hidden.length })}. ${t('filter.reason', { list: why.join(', ') })}.`;
}
