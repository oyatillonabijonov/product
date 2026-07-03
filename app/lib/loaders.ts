import type { Env } from '../../functions/env';
import type { ApiProduct, ApiSettings, ApiCategory, ApiSpec, ApiBrand, ApiOption, ApiVariant, ApiBanner, ApiPage, ApiSiteConfig, LocalizedText } from '../../shared/types';
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
  rowToBanner, rowToPage, rowToSiteConfig, type BannerRow, type PageRow, type SiteConfigRow,
} from '../../functions/lib/db';
import { applyFilters, PAGE_SIZE, type CatalogFilters, type CatalogResult } from './catalog';
import { siteConfig as staticSiteConfig } from './site.config';

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
    minPriceUzs: p.minPriceUzs, brandId: p.brandId, categoryId: p.categoryId,
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

export async function loadStore(env: Env, opts?: { limit?: number }): Promise<{ products: Product[]; config: InstallmentConfig }> {
  const [products, config] = await Promise.all([
    (async () => {
      try {
        const limit = opts?.limit;
        const sql = `SELECT ${PRODUCT_COLS} FROM products WHERE is_active = 1 ORDER BY sort_order ASC, created_at ASC${limit ? ' LIMIT ?' : ''}`;
        const stmt = limit ? env.DB.prepare(sql).bind(limit) : env.DB.prepare(sql);
        const { results } = await stmt.all<ProductRow>();
        if (results.length === 0) throw new Error('empty');
        return results.map(rowToProduct).map(mapProduct);
      } catch (err) {
        console.error('loadStore products fallback:', err);
        return opts?.limit ? fallbackProducts.slice(0, opts.limit) : fallbackProducts;
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

/** LIKE'dagi %/_ belgilarini escape qiladi — foydalanuvchi kiritgan qidiruv wildcard bo'lib ketmasin. */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export async function loadProductsBy(env: Env, params: { category?: string; q?: string; limit?: number }): Promise<Product[]> {
  try {
    let sql = `SELECT ${PRODUCT_COLS} FROM products WHERE is_active = 1`;
    const binds: unknown[] = [];
    if (params.category) { sql += ' AND category_id = ?'; binds.push(params.category); }
    if (params.q && params.q.trim() !== '') { sql += " AND name LIKE ? ESCAPE '\\'"; binds.push(`%${escapeLike(params.q.trim())}%`); }
    sql += ' ORDER BY sort_order ASC, created_at ASC';
    if (params.limit) { sql += ' LIMIT ?'; binds.push(params.limit); }
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

const EFFECTIVE = 'COALESCE(min_variant_price, cash_price_uzs)';

function buildConds(f: CatalogFilters, opts: { skipBrands?: boolean; skipPrice?: boolean } = {}): { sql: string; binds: unknown[] } {
  const conds: string[] = ['is_active = 1'];
  const binds: unknown[] = [];
  if (f.category) { conds.push('category_id = ?'); binds.push(f.category); }
  if (f.condition) { conds.push('condition = ?'); binds.push(f.condition); }
  if (f.q) {
    const like = `%${escapeLike(f.q)}%`;
    // Match product name, brand name, or category name so a search like "Apple" or "telefon" works.
    conds.push(
      "(name LIKE ? ESCAPE '\\' OR brand_id IN (SELECT id FROM brands WHERE name LIKE ? ESCAPE '\\') OR category_id IN (SELECT id FROM categories WHERE name LIKE ? ESCAPE '\\'))",
    );
    binds.push(like, like, like);
  }
  if (f.onlyDeals) conds.push('old_price_uzs IS NOT NULL AND old_price_uzs > cash_price_uzs');
  if (!opts.skipBrands && f.brands.length > 0) {
    conds.push(`brand_id IN (${f.brands.map(() => '?').join(',')})`);
    binds.push(...f.brands);
  }
  if (!opts.skipPrice) {
    if (f.priceMin !== null) { conds.push(`${EFFECTIVE} >= ?`); binds.push(f.priceMin); }
    if (f.priceMax !== null) { conds.push(`${EFFECTIVE} <= ?`); binds.push(f.priceMax); }
  }
  return { sql: conds.join(' AND '), binds };
}

const ORDERS: Record<CatalogFilters['sort'], string> = {
  default: 'sort_order ASC, created_at ASC',
  arzon: `${EFFECTIVE} ASC`,
  qimmat: `${EFFECTIVE} DESC`,
  yangi: 'created_at DESC',
};

export async function queryProducts(env: Env, f: CatalogFilters): Promise<CatalogResult> {
  try {
    const inner = `SELECT ${PRODUCT_COLS} FROM products`;
    const w = buildConds(f);
    const offset = (f.page - 1) * PAGE_SIZE;
    const [list, count, brandFacet, priceFacet] = await Promise.all([
      env.DB.prepare(`SELECT * FROM (${inner}) WHERE ${w.sql} ORDER BY ${ORDERS[f.sort]} LIMIT ? OFFSET ?`)
        .bind(...w.binds, PAGE_SIZE, offset).all<ProductRow>(),
      env.DB.prepare(`SELECT COUNT(*) AS cnt FROM (${inner}) WHERE ${w.sql}`)
        .bind(...w.binds).first<{ cnt: number }>(),
      (() => {
        const wb = buildConds(f, { skipBrands: true });
        return env.DB.prepare(`SELECT brand_id, COUNT(*) AS cnt FROM (${inner}) WHERE ${wb.sql} AND brand_id IS NOT NULL GROUP BY brand_id`)
          .bind(...wb.binds).all<{ brand_id: string; cnt: number }>();
      })(),
      (() => {
        const wp = buildConds(f, { skipPrice: true });
        return env.DB.prepare(`SELECT MIN(${EFFECTIVE}) AS lo, MAX(${EFFECTIVE}) AS hi FROM (${inner}) WHERE ${wp.sql}`)
          .bind(...wp.binds).first<{ lo: number | null; hi: number | null }>();
      })(),
    ]);
    const brandCounts: Record<string, number> = {};
    for (const r of brandFacet.results) brandCounts[r.brand_id] = r.cnt;
    return {
      items: list.results.map(rowToProduct).map(mapProduct),
      total: count?.cnt ?? 0,
      facets: { brandCounts, priceMin: priceFacet?.lo ?? 0, priceMax: priceFacet?.hi ?? 0 },
    };
  } catch (err) {
    console.error('queryProducts fallback:', err);
    return applyFilters(fallbackProducts, f);
  }
}

export interface PageLink {
  slug: string;
  title: LocalizedText;
}

export function staticSiteConfigAsApi(): ApiSiteConfig {
  return {
    name: staticSiteConfig.name,
    phone: staticSiteConfig.phone,
    phoneDisplay: staticSiteConfig.phoneDisplay,
    telegram: staticSiteConfig.telegram,
    instagram: staticSiteConfig.instagram,
    whatsapp: staticSiteConfig.whatsapp,
    mapLl: staticSiteConfig.map.ll,
    mapLabel: staticSiteConfig.map.label,
    seoTitleSuffix: staticSiteConfig.seo.titleSuffix,
    seoDescription: staticSiteConfig.seo.description,
    ogImage: staticSiteConfig.seo.ogImage,
  };
}

export async function loadSiteConfig(env: Env): Promise<ApiSiteConfig> {
  try {
    const row = await env.DB.prepare('SELECT * FROM site_config WHERE id = 1').first<SiteConfigRow>();
    if (!row) throw new Error('no_site_config');
    return rowToSiteConfig(row);
  } catch (err) {
    console.error('loadSiteConfig fallback:', err);
    return staticSiteConfigAsApi();
  }
}

export async function loadBanners(env: Env): Promise<ApiBanner[]> {
  try {
    const { results } = await env.DB.prepare('SELECT * FROM banners WHERE is_active = 1 ORDER BY sort_order ASC').all<BannerRow>();
    return results.map(rowToBanner);
  } catch (err) {
    console.error('loadBanners fallback:', err);
    return [];
  }
}

export async function loadPages(env: Env): Promise<ApiPage[]> {
  try {
    const { results } = await env.DB.prepare('SELECT * FROM pages WHERE is_active = 1 ORDER BY sort_order ASC, slug ASC').all<PageRow>();
    return results.map(rowToPage);
  } catch (err) {
    console.error('loadPages fallback:', err);
    return [];
  }
}

export async function loadPage(env: Env, slug: string): Promise<ApiPage | null> {
  try {
    const row = await env.DB.prepare('SELECT * FROM pages WHERE slug = ? AND is_active = 1').bind(slug).first<PageRow>();
    return row ? rowToPage(row) : null;
  } catch (err) {
    console.error('loadPage fallback:', err);
    return null;
  }
}

export async function loadRail(env: Env, kind: 'deals' | 'latest', limit = 8): Promise<Product[]> {
  try {
    const where = kind === 'deals'
      ? 'is_active = 1 AND old_price_uzs IS NOT NULL AND old_price_uzs > cash_price_uzs'
      : 'is_active = 1';
    const order = kind === 'deals' ? 'sort_order ASC, created_at ASC' : 'created_at DESC';
    const { results } = await env.DB.prepare(
      `SELECT ${PRODUCT_COLS} FROM products WHERE ${where} ORDER BY ${order} LIMIT ?`,
    ).bind(limit).all<ProductRow>();
    return results.map(rowToProduct).map(mapProduct);
  } catch (err) {
    console.error('loadRail fallback:', err);
    // 'latest' fallback katalogdagi 'yangi' bilan bir xil: sample tartibi saqlanadi (created_at yo'q)
    const all = kind === 'deals'
      ? fallbackProducts.filter((p) => p.oldPriceUzs != null && p.oldPriceUzs > p.cashPriceUzs)
      : fallbackProducts;
    return all.slice(0, limit);
  }
}
