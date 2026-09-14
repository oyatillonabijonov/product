import { createContext, useContext, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { CURRENCY_COOKIE, formatPrice, type Currency } from '../lib/currency';

interface CurrencyApi {
  currency: Currency;
  /** Do'kon kursi: 1 USD necha so'm (`settings.usd_to_uzs`); 0 — noma'lum. */
  rate: number;
  setCurrency(next: Currency): void;
  /** So'mdagi narxni tanlangan valyutada chizadi. */
  price(uzs: number): string;
}

const CurrencyCtx = createContext<CurrencyApi | null>(null);

export function useCurrency(): CurrencyApi {
  const ctx = useContext(CurrencyCtx);
  if (!ctx) throw new Error('useCurrency must be used inside CurrencyProvider');
  return ctx;
}

// Boshlang'ich qiymat store loader'idan (cookie) — birinchi render server va klientda bir xil, narx sakramaydi.
export const CurrencyProvider: FC<{ initial: Currency; rate: number; sum: string; children: ReactNode }> = ({
  initial, rate, sum, children,
}) => {
  const [raw, setRaw] = useState(initial);
  const currency = raw as Currency;
  const api: CurrencyApi = {
    currency,
    rate,
    setCurrency(next) {
      setRaw(next);
      // UZS — sukut: cookie o'chiriladi va sahifa yana umumiy keshga tushadi (server/index.ts).
      document.cookie = next === 'USD'
        ? `${CURRENCY_COOKIE}=USD; Path=/; Max-Age=31536000; SameSite=Lax`
        : `${CURRENCY_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    },
    price: (uzs) => formatPrice(uzs, currency, rate, sum),
  };
  return <CurrencyCtx.Provider value={api}>{children}</CurrencyCtx.Provider>;
};
