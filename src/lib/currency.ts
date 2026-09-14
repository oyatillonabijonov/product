import { formatUzs } from './installment';

/** Saytdagi narx valyutasi. Bazada hamma narx so'mda; USD = so'm ÷ do'kon kursi (`settings.usd_to_uzs`). */
export type Currency = 'UZS' | 'USD';

export const CURRENCY_COOKIE = 'currency';

export function parseCurrency(value: string | null | undefined): Currency {
  return value === 'USD' ? 'USD' : 'UZS';
}

function groupThousands(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** "$1 299"; $100 dan kichigi sent bilan ("$2.94"). `Intl` yo'q — server va brauzer bir xil satr bersin. */
export function formatUsd(value: number): string {
  if (value < 100) return `$${value.toFixed(2)}`;
  return `$${groupThousands(Math.round(value))}`;
}

/** Narxni tanlangan valyutada chizadi; kurs noma'lum (0) bo'lsa so'mda qoladi. */
export function formatPrice(uzs: number, currency: Currency, rate: number, sum: string): string {
  return currency === 'USD' && rate > 0 ? formatUsd(uzs / rate) : formatUzs(uzs, sum);
}

/** So'm → tanlangan valyutadagi butun son (filtr inputi va placeholder uchun). */
export function fromUzs(uzs: number, currency: Currency, rate: number): number {
  return currency === 'USD' && rate > 0 ? Math.round(uzs / rate) : uzs;
}

/** Tanlangan valyutada kiritilgan son → so'm (URL `narx` doim so'mda). */
export function toUzs(value: number, currency: Currency, rate: number): number {
  return currency === 'USD' && rate > 0 ? Math.round(value * rate) : value;
}
