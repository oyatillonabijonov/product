import type { Env } from '../../functions/env';
import type { ApiProduct, ApiSettings, ApiCategory, ApiSpec, ApiBrand, ApiOption, ApiVariant } from '../../shared/types';
import type { InstallmentConfig, Product } from '../../src/data/products';
import {
  installmentConfig as fallbackConfig,
  products as fallbackProducts,
  categories as fallbackCategories,
  brands as fallbackBrands,
  fallbackCategoryOf,
} from '../../src/data/products';
import {
  rowToProduct, rowToCategory, rowToBrand, buildProductDetail, PRODUCT_COLS,
  type ProductRow, type CategoryRow, type SettingsRow, rowToSettings, type BrandRow,
} from '../../functions/lib/db';

export interface ProductDetail extends Product {
  oldPriceUzs: number | null;
  description: string | null;
  images: string[];
  specs: ApiSpec[];
  brand: ApiBrand | null;
  options: ApiOption[];
  variants: ApiVariant[];
}

function mapProduct(p: ApiProduct): Product {
  return {
    id: p.id, name: p.name, category: p.category, condition: p.condition,
    conditionNote: p.conditionNote ?? undefined, image: p.imageUrl,
    cashPriceUzs: p.cashPriceUzs, oldPriceUzs: p.oldPriceUzs ?? null,
    minPriceUzs: p.minPriceUzs, brandId: p.brandId,
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
  } catch (err) {
    console.error('loadCategories fallback:', err);
    return fallbackCategories;
  }
}

export async function loadStore(env: Env): Promise<{ products: Product[]; config: InstallmentConfig }> {
  const [products, config] = await Promise.all([
    (async () => {
      try {
        const { results } = await env.DB.prepare(`SELECT ${PRODUCT_COLS} FROM products WHERE is_active = 1 ORDER BY sort_order ASC, created_at ASC`).all<ProductRow>();
        if (results.length === 0) throw new Error('empty');
        return results.map(rowToProduct).map(mapProduct);
      } catch (err) {
        console.error('loadStore products fallback:', err);
        return fallbackProducts;
      }
    })(),
    (async () => {
      try {
        const row = await env.DB.prepare('SELECT * FROM settings WHERE id = 1').first<SettingsRow>();
        if (!row) throw new Error('no_settings');
        return mapConfig(rowToSettings(row));
      } catch (err) {
        console.error('loadStore config fallback:', err);
        return fallbackConfig;
      }
    })(),
  ]);
  return { products, config };
}

export async function loadConfig(env: Env): Promise<InstallmentConfig> {
  try {
    const row = await env.DB.prepare('SELECT * FROM settings WHERE id = 1').first<SettingsRow>();
    if (!row) throw new Error('no_settings');
    return mapConfig(rowToSettings(row));
  } catch (err) {
    console.error('loadConfig fallback:', err);
    return fallbackConfig;
  }
}

export async function loadProductsBy(env: Env, params: { category?: string; q?: string }): Promise<Product[]> {
  try {
    let sql = `SELECT ${PRODUCT_COLS} FROM products WHERE is_active = 1`;
    const binds: unknown[] = [];
    if (params.category) { sql += ' AND category_id = ?'; binds.push(params.category); }
    if (params.q && params.q.trim() !== '') { sql += ' AND name LIKE ?'; binds.push(`%${params.q.trim()}%`); }
    sql += ' ORDER BY sort_order ASC, created_at ASC';
    const { results } = await env.DB.prepare(sql).bind(...binds).all<ProductRow>();
    return results.map(rowToProduct).map(mapProduct);
  } catch (err) {
    console.error('loadProductsBy fallback:', err);
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
    return {
      ...mapProduct(d), oldPriceUzs: d.oldPriceUzs, description: d.description, images: d.images, specs: d.specs,
      brand: d.brand, options: d.options, variants: d.variants,
    };
  } catch (err) {
    console.error('loadProductDetail fallback:', err);
    const p = fallbackProducts.find((x) => x.id === id);
    if (!p) return null;
    return {
      ...p, oldPriceUzs: p.oldPriceUzs ?? null, description: p.description ?? null, images: p.image ? [p.image, ...(p.gallery ?? [])] : (p.gallery ?? []), specs: p.specs ?? [],
      brand: null, options: [], variants: [],
    };
  }
}

export async function loadBrands(env: Env): Promise<ApiBrand[]> {
  try {
    const { results } = await env.DB.prepare('SELECT * FROM brands ORDER BY sort_order ASC').all<BrandRow>();
    if (results.length === 0) throw new Error('empty');
    return results.map(rowToBrand);
  } catch (err) {
    console.error('loadBrands fallback:', err);
    return fallbackBrands;
  }
}
