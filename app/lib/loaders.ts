import type { Env } from '../../functions/env';
import type { ApiProduct, ApiSettings, ApiCategory, ApiSpec } from '../../shared/types';
import type { InstallmentConfig, Product } from '../../src/data/products';
import {
  installmentConfig as fallbackConfig,
  products as fallbackProducts,
  categories as fallbackCategories,
  fallbackCategoryOf,
} from '../../src/data/products';
import {
  rowToProduct, rowToCategory, buildProductDetail,
  type ProductRow, type CategoryRow, type SettingsRow, rowToSettings,
} from '../../functions/lib/db';

export interface ProductDetail extends Product {
  oldPriceUzs: number | null;
  description: string | null;
  images: string[];
  specs: ApiSpec[];
}

function mapProduct(p: ApiProduct): Product {
  return {
    id: p.id, name: p.name, category: p.category, condition: p.condition,
    conditionNote: p.conditionNote ?? undefined, image: p.imageUrl,
    cashPriceUzs: p.cashPriceUzs, oldPriceUzs: p.oldPriceUzs ?? null,
  };
}
function mapConfig(s: ApiSettings): InstallmentConfig {
  return { downPaymentPercent: s.downPaymentPercent, usdToUzs: s.usdToUzs, terms: s.terms };
}

export async function loadCategories(env: Env): Promise<ApiCategory[]> {
  try {
    const { results } = await env.DB.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all<CategoryRow>();
    if (results.length === 0) throw new Error('empty');
    return results.map(rowToCategory);
  } catch {
    return fallbackCategories;
  }
}

export async function loadStore(env: Env): Promise<{ products: Product[]; config: InstallmentConfig }> {
  const [products, config] = await Promise.all([
    (async () => {
      try {
        const { results } = await env.DB.prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY sort_order ASC, created_at ASC').all<ProductRow>();
        if (results.length === 0) throw new Error('empty');
        return results.map(rowToProduct).map(mapProduct);
      } catch {
        return fallbackProducts;
      }
    })(),
    (async () => {
      try {
        const row = await env.DB.prepare('SELECT * FROM settings WHERE id = 1').first<SettingsRow>();
        if (!row) throw new Error('no_settings');
        return mapConfig(rowToSettings(row));
      } catch {
        return fallbackConfig;
      }
    })(),
  ]);
  return { products, config };
}

export async function loadProductsBy(env: Env, params: { category?: string; q?: string }): Promise<Product[]> {
  try {
    let sql = 'SELECT * FROM products WHERE is_active = 1';
    const binds: unknown[] = [];
    if (params.category) { sql += ' AND category_id = ?'; binds.push(params.category); }
    if (params.q && params.q.trim() !== '') { sql += ' AND name LIKE ?'; binds.push(`%${params.q.trim()}%`); }
    sql += ' ORDER BY sort_order ASC, created_at ASC';
    const { results } = await env.DB.prepare(sql).bind(...binds).all<ProductRow>();
    return results.map(rowToProduct).map(mapProduct);
  } catch {
    let items = fallbackProducts;
    if (params.category) items = items.filter((p) => fallbackCategoryOf(p) === params.category);
    if (params.q) { const q = params.q.toLowerCase(); items = items.filter((p) => p.name.toLowerCase().includes(q)); }
    return items;
  }
}

export async function loadProductDetail(env: Env, id: string): Promise<ProductDetail | null> {
  try {
    const d = await buildProductDetail(env, id);
    if (!d) throw new Error('not_found');
    return { ...mapProduct(d), oldPriceUzs: d.oldPriceUzs, description: d.description, images: d.images, specs: d.specs };
  } catch {
    const p = fallbackProducts.find((x) => x.id === id);
    if (!p) return null;
    return { ...p, oldPriceUzs: p.oldPriceUzs ?? null, description: p.description ?? null, images: p.image ? [p.image, ...(p.gallery ?? [])] : (p.gallery ?? []), specs: p.specs ?? [] };
  }
}
