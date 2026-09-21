import type { ApiProduct } from '../../../shared/types';

/**
 * Tez filtr segmentlari (URL `f`); `''` — hammasi. Yorliqlar sodda tilda: egasi
 * "yashirin" yoki "qoldiq 0" emas, "saytda bormi" deb o'ylaydi.
 */
export type QuickFilter = '' | 'active' | 'hidden' | 'needs_image' | 'stock0' | 'manual';

export const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: '', label: 'Hammasi' },
  { id: 'active', label: 'Saytda bor' },
  { id: 'hidden', label: "Saytda yo'q" },
  { id: 'needs_image', label: 'Rasm kerak' },
  { id: 'stock0', label: 'Qoldiq tugagan' },
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
export function summaryText(items: ApiProduct[]): string {
  const total = items.length;
  if (total === 0) return "Hali tovar yo'q.";
  const hidden = items.filter((p) => !p.isActive);
  const head = `Jami ${total} ta tovar: ${total - hidden.length} tasi saytda e'lon qilingan`;
  if (hidden.length === 0) return `${head}.`;

  const noImage = hidden.filter((p) => !p.imageUrl).length;
  const noStock = hidden.filter((p) => p.imageUrl && p.billzStock === 0).length;
  const byHand = hidden.length - noImage - noStock;
  const why = [
    noImage > 0 ? `${noImage} tasida rasm yo'q` : '',
    noStock > 0 ? `${noStock} tasining qoldig'i tugagan` : '',
    byHand > 0 ? `${byHand} tasini qo'lda yashirgansiz` : '',
  ].filter(Boolean);
  return `${head}, ${hidden.length} tasi ko'rinmaydi. Sababi: ${why.join(', ')}.`;
}
