/** Yandex Metrica yordamchilari — hisoblagich sozlanmagan yoki skript yuklanmagan
 * bo'lsa jim no-op (analitika hech qachon UI oqimini buzmasin). */

type YmFn = (id: number, action: 'hit' | 'reachGoal', target: string) => void;

declare global {
  interface Window {
    ym?: YmFn;
  }
}

/** SPA navigatsiyada sahifa ko'rinishini qayd etish. */
export function ymHit(counterId: string, url: string): void {
  if (!counterId) return;
  try {
    window.ym?.(Number(counterId), 'hit', url);
  } catch {
    /* analitika xatosi UX'ga ta'sir qilmasin */
  }
}

/** Konversiya maqsadi: 'order_form_open' | 'order_submit' kabi. */
export function ymGoal(counterId: string, goal: string): void {
  if (!counterId) return;
  try {
    window.ym?.(Number(counterId), 'reachGoal', goal);
  } catch {
    /* analitika xatosi UX'ga ta'sir qilmasin */
  }
}

export interface YmProduct {
  id: string;
  name: string;
  price: number;
  variant?: string;
  quantity?: number;
}

/** Metrica e-commerce: `dataLayer`ga voqea. Hisoblagich yo'q bo'lsa massiv shunchaki
 * hech kim o'qimaydigan ro'yxat bo'lib qoladi — tekshiruv shart emas.
 * `purchase` bu yerda to'lov emas, buyurtma arizasi (operator telefonda tasdiqlaydi). */
export function ymEcommerce(action: 'detail' | 'add' | 'remove' | 'purchase', products: YmProduct[], orderId?: number): void {
  try {
    const w = window as unknown as { dataLayer?: unknown[] };
    (w.dataLayer ??= []).push({
      ecommerce: {
        currencyCode: 'UZS',
        [action]: orderId === undefined ? { products } : { actionField: { id: String(orderId) }, products },
      },
    });
  } catch {
    /* analitika xatosi UX'ga ta'sir qilmasin */
  }
}
