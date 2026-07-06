import type { OrderInput } from './types';

/** Server-side (Worker) Telegram xabari uchun sodda son formati — src/lib'ga (formatUzs)
 *  bog'lanmaydi, chunki functions/ tsconfig src/'ni ko'rmaydi. */
function fmt(n: number): string {
  return Math.round(n).toLocaleString('ru-RU').replace(/[, ]/g, ' ');
}

/** Buyurtmani Telegram botga yuboriladigan matnga aylantiradi. `brand` — site_config'dan. */
export function composeOrderMessage(o: OrderInput, brand: string): string {
  const kind = o.paymentKind === 'installment' ? 'muddatli' : 'naqd';
  const lines: string[] = [`🛒 ${brand} — yangi buyurtma (${kind})`, '', `👤 ${o.name}`, `📞 ${o.phone}`, ''];
  for (const it of o.items) {
    const label = it.variantLabel ? ` (${it.variantLabel})` : '';
    lines.push(`• ${it.name}${label} ×${it.qty} — ${fmt(it.priceUzs * it.qty)} so'm`);
  }
  lines.push('');
  if (o.paymentKind === 'installment') {
    if (o.termMonths) lines.push(`📅 Muddat: ${o.termMonths} oy`);
    if (o.downPaymentUzs != null) lines.push(`💵 Boshlang'ich: ${fmt(o.downPaymentUzs)} so'm`);
    if (o.monthlyUzs != null) lines.push(`📆 Oylik: ${fmt(o.monthlyUzs)} so'm`);
    if (o.totalUzs != null) lines.push(`💰 Jami: ${fmt(o.totalUzs)} so'm`);
  } else {
    const cash = o.items.reduce((s, it) => s + it.priceUzs * it.qty, 0);
    lines.push(`💰 Naqd narx: ${fmt(cash)} so'm`);
  }
  if (o.note) lines.push('', `📝 ${o.note}`);
  return lines.join('\n');
}
