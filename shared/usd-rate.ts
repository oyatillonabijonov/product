/**
 * Dollar kursi — Markaziy bank (cbu.uz) javobini o'qish va do'kon kursini hisoblash.
 * Sof funksiyalar: server runner'i (`server/usd-rate.ts`) va admin sozlamalari ishlatadi.
 */
export const CBU_USD_URL = 'https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/';

export interface CbuUsd {
  /** 1 USD necha so'm (Nominal hisobga olingan). */
  rate: number;
  /** MB sanasi o'z formatida: "14.09.2026". */
  date: string;
}

/** MB javobi: `[{ Ccy: "USD", Nominal: "1", Rate: "11765.76", Date: "14.09.2026" }]`. Buzuq bo'lsa `null`. */
export function parseCbuUsd(body: unknown): CbuUsd | null {
  if (!Array.isArray(body)) return null;
  const usd = body.find(
    (x): x is Record<string, unknown> => typeof x === 'object' && x !== null && (x as Record<string, unknown>).Ccy === 'USD',
  );
  if (!usd) return null;
  const rate = Number(usd.Rate) / Number(usd.Nominal ?? 1);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return { rate, date: typeof usd.Date === 'string' ? usd.Date : '' };
}

/** Do'kon kursi: MB kursi + ustama, butun so'mga yaxlitlab (`settings.usd_to_uzs` INTEGER). */
export function storeRate(cbuRate: number, markupPercent: number): number {
  return Math.round(cbuRate * (1 + markupPercent / 100));
}
