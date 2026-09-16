import type { ApiOrder, OrderItemInput, OrderStatus } from '../../../shared/types';

/** Holat filtri (URL `status`): `new` — sukut, ro'yxat kiruvchi quti bo'lib ochiladi; `all` — hammasi. */
export type StatusFilter = OrderStatus | 'all';

export const STATUSES: OrderStatus[] = ['new', 'contacted', 'done'];

export const ORDER_STATUS: Record<OrderStatus, string> = { new: 'Yangi', contacted: "Bog'lanildi", done: 'Bajarildi' };
/** Nomzod arizasi "bajarilmaydi" — yopiladi (eski ekrandagi so'z). */
export const APPLICATION_STATUS: Record<OrderStatus, string> = { new: 'Yangi', contacted: "Bog'lanildi", done: 'Yopildi' };

/** URL qiymati → filtr; bo'sh yoki noma'lum qiymat → `new`. */
export function parseStatus(raw: string | null): StatusFilter {
  return raw === 'contacted' || raw === 'done' || raw === 'all' ? raw : 'new';
}

/** Segmentlar «Yangi 3 · Bog'lanildi · Bajarildi · Hammasi» (spec §5); yangi yo'q bo'lsa son yozilmaydi. */
export function statusSegments(labels: Record<OrderStatus, string>, newCount: number): { id: StatusFilter; label: string }[] {
  return [
    { id: 'new', label: newCount > 0 ? `${labels.new} ${newCount}` : labels.new },
    { id: 'contacted', label: labels.contacted },
    { id: 'done', label: labels.done },
    { id: 'all', label: 'Hammasi' },
  ];
}

/**
 * Holat + qidiruv (client'da). Raqamli so'rov ("93 555", "+998…") telefon raqamlari bo'yicha — bo'shliq, tire,
 * qavsdan qat'i nazar; harfli so'rov ism bo'yicha, katta-kichik harfsiz.
 */
export function filterInbox<T extends { name: string; phone: string; status: OrderStatus }>(items: T[], status: StatusFilter, q: string): T[] {
  const needle = q.trim().toLowerCase();
  const digits = /^[\d\s()+-]+$/.test(needle) ? needle.replace(/\D/g, '') : '';
  return items.filter((x) => {
    if (status !== 'all' && x.status !== status) return false;
    if (!needle) return true;
    return digits ? x.phone.replace(/\D/g, '').includes(digits) : x.name.toLowerCase().includes(needle);
  });
}

/** `tel:` havolasi: ko'rinish belgilari (bo'shliq, tire, qavs) tushib qoladi, `+` qoladi. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/** Tovarlar yig'indisi (naqd narx × soni). */
export function itemsTotal(items: OrderItemInput[]): number {
  return items.reduce((s, it) => s + it.priceUzs * it.qty, 0);
}

/** Manba: konsultatsiya arizasi (mahsulotsiz) yoki to'lov turi. */
export function orderSource(o: Pick<ApiOrder, 'source' | 'paymentKind'>): string {
  if (o.source === 'consult') return 'Konsultatsiya';
  return o.paymentKind === 'installment' ? 'Muddatli' : 'Naqd';
}

/** Qatordagi tarkib: birinchi tovar (variant, soni) va «+ yana N»; konsultatsiyada mavzular/izoh. */
export function orderSummary(o: Pick<ApiOrder, 'source' | 'items' | 'note'>): string {
  const first = o.items[0];
  if (o.source === 'consult' || !first) return o.note || '—';
  let label = first.variantLabel ? `${first.name} (${first.variantLabel})` : first.name;
  if (first.qty > 1) label += ` ×${first.qty}`;
  return o.items.length > 1 ? `${label} + yana ${o.items.length - 1}` : label;
}

/**
 * Summa — Telegram xabaridagi bilan bir xil (`shared/order.ts`): muddatlida mijoz to'laydigan jami (`totalUzs`,
 * bo'lmasa naqd yig'indi), naqdda tovarlar yig'indisi; konsultatsiyada summa yo'q.
 */
export function orderTotal(o: Pick<ApiOrder, 'source' | 'paymentKind' | 'items' | 'totalUzs'>): number | null {
  if (o.source === 'consult') return null;
  if (o.paymentKind === 'installment' && o.totalUzs != null) return o.totalUzs;
  return itemsTotal(o.items);
}
