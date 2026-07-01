import type { InstallmentConfig, Product, Term } from '../data/products';

export interface InstallmentResult {
  /** Muddatli to'lovdagi jami narx (ustama bilan), so'm. */
  total: number;
  /** Boshlang'ich to'lov, so'm. */
  downPaymentUzs: number;
  /** Oylik to'lov, so'm. */
  monthly: number;
}

export function calcInstallment(
  product: Product,
  term: Term,
  config: InstallmentConfig,
): InstallmentResult {
  const total = product.cashPriceUzs * (1 + term.markup);
  const downPaymentUzs = product.cashPriceUzs * (config.downPaymentPercent / 100);
  const monthly = Math.max(0, (total - downPaymentUzs) / term.months);
  return { total, downPaymentUzs, monthly };
}

/** Eng past oylik to'lov (eng uzoq muddat) — katalog kartasi uchun. */
export function lowestMonthly(product: Product, config: InstallmentConfig): number {
  const longest = config.terms.reduce((a, b) => (b.months > a.months ? b : a), config.terms[0]);
  return calcInstallment(product, longest, config).monthly;
}

export function formatUzs(value: number): string {
  const rounded = Math.round(value);
  return `${rounded.toLocaleString('ru-RU').replace(/[,\u00A0]/g, ' ')} so'm`;
}

export interface LeadData {
  name: string;
  phone: string;
  product: string;
  months: number;
  monthly: string;
}

export function composeLeadMessage(data: LeadData): string {
  return [
    '🛒 Taqsit Store — yangi ariza',
    '',
    `👤 Ism: ${data.name}`,
    `📞 Telefon: ${data.phone}`,
    `📱 Qurilma: ${data.product}`,
    `📅 Muddat: ${data.months} oy`,
    `💵 Taxminiy oylik to'lov: ${data.monthly}`,
  ].join('\n');
}

const TELEGRAM_USER = 'Taqsit_store';
const WHATSAPP_PHONE = '998886043636';

export function telegramShareUrl(message: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent('https://t.me/' + TELEGRAM_USER)}&text=${encodeURIComponent(message)}`;
}

export function whatsappUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
}

export function discountPercent(cash: number, old: number | null): number | null {
  if (old === null || old <= cash) return null;
  return Math.round(((old - cash) / old) * 100);
}
