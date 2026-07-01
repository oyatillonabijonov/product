import type { ApiProduct, ApiSettings, Category, Condition, Term } from '../../shared/types';

export interface ProductRow {
  id: string;
  name: string;
  category: string;
  condition: string;
  condition_note: string | null;
  cash_price_uzs: number;
  image_url: string;
  sort_order: number;
  is_active: number;
  created_at: number;
}

export interface SettingsRow {
  id: number;
  down_payment_percent: number;
  usd_to_uzs: number;
  terms: string;
}

export function rowToProduct(row: ProductRow): ApiProduct {
  return {
    id: row.id,
    name: row.name,
    category: row.category as Category,
    condition: row.condition as Condition,
    conditionNote: row.condition_note,
    cashPriceUzs: row.cash_price_uzs,
    imageUrl: row.image_url,
    sortOrder: row.sort_order,
    isActive: row.is_active === 1,
  };
}

export function rowToSettings(row: SettingsRow): ApiSettings {
  const terms = JSON.parse(row.terms) as Term[];
  return {
    downPaymentPercent: row.down_payment_percent,
    usdToUzs: row.usd_to_uzs,
    terms,
  };
}

export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(init?.headers ?? {}) },
  });
}
