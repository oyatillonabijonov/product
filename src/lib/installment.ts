import type { InstallmentConfig, Product, Term } from '../data/products';
import type { PaymentMode } from '../../shared/types';

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
  downPaymentUzs?: number,
): InstallmentResult {
  const total = product.cashPriceUzs * (1 + term.markup);
  const down = downPaymentUzs ?? product.cashPriceUzs * (config.downPaymentPercent / 100);
  const monthly = Math.max(0, (total - down) / term.months);
  return { total, downPaymentUzs: down, monthly };
}

export type { PaymentMode };

/** Kartalar/sahifa uchun narx ko'rinishi: naqd + eng past oylik, rejim bo'yicha gating.
 * Oylik minPriceUzs (eng arzon variant) bo'yicha — kartada ko'rinadigan narx bilan mos. */
export function priceView(product: Product, config: InstallmentConfig, mode: PaymentMode) {
  const longest = config.terms.reduce((a, b) => (b.months > a.months ? b : a), config.terms[0]);
  const monthlyUzs = calcInstallment(
    { ...product, cashPriceUzs: product.minPriceUzs }, longest, config,
  ).monthly;
  return {
    cashUzs: product.minPriceUzs,
    monthlyUzs,
    /** Oylik qaysi muddat bo'yicha hisoblangani — kartada "× N oy" ko'rsatish uchun. */
    months: longest.months,
    showMonthly: mode !== 'cash',
    monthlyPrimary: mode === 'installment',
  };
}

/** `suffix` \u2014 locale'ga mos valyuta yozuvi (uz "so'm", ru "\u0441\u0443\u043C"); default admin/uz uchun. */
export function formatUzs(value: number, suffix = "so'm"): string {
  const rounded = Math.round(value);
  return `${rounded.toLocaleString('ru-RU').replace(/[,\u00A0]/g, ' ')} ${suffix}`;
}

export function discountPercent(cash: number, old: number | null): number | null {
  if (old === null || old <= cash) return null;
  const pct = Math.round(((old - cash) / old) * 100);
  return pct > 0 ? pct : null; // 0% ga yaxlitlangan farq "-0%" badge bo'lmasin
}
