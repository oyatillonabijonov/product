import type { ApiCategory, ApiProductDetail, ApiProduct, ApiSpec, ApiSettings, Category, Condition, Term } from '../../shared/types';
import type { Env } from '../env';

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
  category_id: string | null;
  old_price_uzs: number | null;
  description: string | null;
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
    categoryId: row.category_id,
    oldPriceUzs: row.old_price_uzs,
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

export interface CategoryRow {
  id: string;
  name: string;
  icon_url: string;
  sort_order: number;
}

export interface SpecRow {
  id: string;
  product_id: string;
  label: string;
  value: string;
  sort_order: number;
}

export interface ImageRow {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number;
}

export function rowToCategory(row: CategoryRow): ApiCategory {
  return { id: row.id, name: row.name, iconUrl: row.icon_url, sortOrder: row.sort_order };
}

export function rowToSpec(row: SpecRow): ApiSpec {
  return { label: row.label, value: row.value };
}

export async function buildProductDetail(
  env: { DB: D1Database },
  id: string,
): Promise<ApiProductDetail | null> {
  const row = await env.DB.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1')
    .bind(id)
    .first<ProductRow>();
  if (!row) return null;
  const [{ results: imgRows }, { results: specRows }] = await Promise.all([
    env.DB.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC')
      .bind(id)
      .all<ImageRow>(),
    env.DB.prepare('SELECT * FROM product_specs WHERE product_id = ? ORDER BY sort_order ASC')
      .bind(id)
      .all<SpecRow>(),
  ]);
  const base = rowToProduct(row);
  const gallery = imgRows.map((r) => r.image_url);
  const images = row.image_url ? [row.image_url, ...gallery] : gallery;
  return { ...base, description: row.description, images, specs: specRows.map(rowToSpec) };
}

export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(init?.headers ?? {}) },
  });
}

export async function writeImagesAndSpecs(
  env: Env,
  productId: string,
  images: string[],
  specs: { label: string; value: string }[],
): Promise<void> {
  await env.DB.prepare('DELETE FROM product_images WHERE product_id = ?').bind(productId).run();
  await env.DB.prepare('DELETE FROM product_specs WHERE product_id = ?').bind(productId).run();
  for (let i = 0; i < images.length; i++) {
    await env.DB.prepare('INSERT INTO product_images (id, product_id, image_url, sort_order) VALUES (?, ?, ?, ?)')
      .bind(crypto.randomUUID(), productId, images[i], i)
      .run();
  }
  for (let i = 0; i < specs.length; i++) {
    await env.DB.prepare('INSERT INTO product_specs (id, product_id, label, value, sort_order) VALUES (?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), productId, specs[i].label, specs[i].value, i)
      .run();
  }
}
