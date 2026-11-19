/**
 * «Buyurtma asosida» rejimi: tovar tugagan, lekin saytda turadi — narx yashirin, xaridor taxminiy narxni
 * o'zi ochadi, tugma «Oldindan buyurtma». Billz tovarida qoldiq hal qiladi (0 — yoqiq, qoldiq qaytsa o'zi
 * o'chadi), qo'lda kiritilgan tovarda — admin'dagi «Tovar qolmadi» belgisi (`products.on_order`).
 */
export function isOnOrder(p: { billzId: string | null; billzStock: number | null; onOrder: boolean }): boolean {
  return p.billzId !== null ? (p.billzStock ?? 0) <= 0 : p.onOrder;
}

/**
 * «Pre-order» (hali sotuvga chiqmagan) faqat qo'lda kiritilgan tovarda: Billz tovarining holatini qoldiq
 * hal qiladi — aks holda omborda bor tovar ham «sotuvga chiqishi bilan yetkazamiz» deb chiqardi (2026-11-19).
 */
export function showsPreorder(p: { billzId: string | null; preorder: boolean }): boolean {
  return p.billzId === null && p.preorder;
}

/** `isOnOrder`ning SQL ko'rinishi — `products` qatori ustida. */
export const ON_ORDER_SQL = '(CASE WHEN billz_id IS NOT NULL THEN COALESCE(billz_stock, 0) <= 0 ELSE on_order = 1 END)';
