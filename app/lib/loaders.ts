import type { Env } from '../../functions/env';
import type { ApiProduct, ApiSettings, ApiCategory, ApiSpec, ApiBrand, ApiOption, ApiVariant, ApiBanner, ApiNews, ApiPage, ApiPost, ApiReview, ApiSiteConfig, ApiVacancy, LocalizedText } from '../../shared/types';
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
  rowToBanner, rowToNews, rowToPage, rowToPost, rowToSiteConfig, type BannerRow, type NewsRow, type PageRow, type PostRow, type SiteConfigRow,
  rowToVacancy, type VacancyRow,
} from '../../functions/lib/db';
import { rowToProductType, type ProductTypeDbRow, type ProductTypeRow } from '../../shared/product-types';
import { PC_SLOTS, toConfigParts, type ConfigPart, type ConfigPartRow, type SlotKey } from '../../shared/pc-compat';
import { applyFilters, searchTerms, PAGE_SIZE, type CatalogFilters, type CatalogResult } from './catalog';
import { siteConfig as staticSiteConfig } from './site.config';
import { translations, type Translation } from '../../src/locales';
import { isAssetKey, mergeTexts, type SiteAssets, type SiteTexts } from '../../src/lib/site-content';
import { localeToLang, type Locale } from './i18n';

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
    minPriceUzs: p.minPriceUzs, brandId: p.brandId, categoryId: p.categoryId, type: p.type,
    ratingAvg: p.ratingAvg, reviewCount: p.reviewCount,
    preorder: p.preorder,
  };
}
function mapConfig(s: ApiSettings): InstallmentConfig {
  return {
    downPaymentPercent: s.downPaymentPercent,
    downPaymentMaxPercent: s.downPaymentMaxPercent,
    usdToUzs: s.usdToUzs,
    terms: s.terms,
  };
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

export async function loadProductsBy(
  env: Env,
  params: { category?: string; type?: string; exclude?: string; q?: string; limit?: number; order?: 'default' | 'random' },
): Promise<Product[]> {
  try {
    let sql = `SELECT ${PRODUCT_COLS} FROM products WHERE is_active = 1`;
    const binds: unknown[] = [];
    if (params.category) { sql += ' AND category_id = ?'; binds.push(params.category); }
    if (params.type) { sql += ' AND type = ?'; binds.push(params.type); }
    if (params.exclude) { sql += ' AND id <> ?'; binds.push(params.exclude); }
    for (const term of searchTerms(params.q ?? '')) { sql += " AND name LIKE ? ESCAPE '\\'"; binds.push(`%${escapeLike(term)}%`); }
    sql += params.order === 'random' ? ' ORDER BY random()' : ' ORDER BY sort_order ASC, created_at ASC';
    if (params.limit) { sql += ' LIMIT ?'; binds.push(params.limit); }
    const { results } = await env.DB.prepare(sql).bind(...binds).all<ProductRow>();
    return results.map(rowToProduct).map(mapProduct);
  } catch (err) {
    console.error('loadProductsBy fallback:', err);
    let items = fallbackProducts;
    if (params.category) items = items.filter((p) => fallbackCategoryOf(p) === params.category);
    if (params.type) items = items.filter((p) => p.type === params.type);
    if (params.exclude) items = items.filter((p) => p.id !== params.exclude);
    for (const term of searchTerms((params.q ?? '').toLowerCase())) items = items.filter((p) => p.name.toLowerCase().includes(term));
    return params.limit ? items.slice(0, params.limit) : items;
  }
}

/**
 * PC konfiguratori qismlari — saytda yashirin bo'lsa ham (qoldiq 0 → "Buyurtma asosida"; rasmsiz qoldiqli).
 * Qo'lda kiritilgan (billz_id yo'q) nofaol mahsulotlar — namuna ma'lumot, chiqmaydi. Xato → {} (bo'lim chiqmaydi).
 */
export async function loadConfiguratorParts(env: Env): Promise<Partial<Record<SlotKey, ConfigPart[]>>> {
  try {
    const types = PC_SLOTS.map((s) => s.type);
    const { results } = await env.DB.prepare(
      `SELECT id, name, image_url, type, COALESCE(
         (SELECT MIN(v.cash_price_uzs) FROM product_variants v WHERE v.product_id = products.id AND v.in_stock = 1),
         cash_price_uzs) AS price,
       billz_id, billz_stock, is_active, pc_socket, pc_memory, pc_watts
       FROM products
       WHERE category_id = 'pc' AND type IN (${types.map(() => '?').join(', ')}) AND pc_hidden = 0
         AND cash_price_uzs > 0 AND (is_active = 1 OR billz_id IS NOT NULL)`,
    ).bind(...types).all<ConfigPartRow>();
    return toConfigParts(results);
  } catch (err) {
    console.error('loadConfiguratorParts fallback:', err);
    return {};
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

/**
 * Mahsulot sharhlari — eng yangisi birinchi. Jadval bo'lmasa (eski baza) yoki
 * so'rov yiqilsa bo'sh ro'yxat: sharhlar sahifani bloklamaydi.
 */
export async function loadReviews(env: Env, productId: string): Promise<ApiReview[]> {
  try {
    const { results } = await env.DB
      .prepare('SELECT id, author, rating, body, created_at FROM product_reviews WHERE product_id = ? ORDER BY created_at DESC LIMIT 50')
      .bind(productId)
      .all<{ id: string; author: string; rating: number; body: string; created_at: number }>();
    return results.map((r) => ({ id: r.id, author: r.author, rating: r.rating, body: r.body, createdAt: r.created_at }));
  } catch (err) {
    console.error('loadReviews fallback:', err);
    return [];
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

/** Tovar turlari (`product_types`); xato → [] — tile qatori bo'sh chiqadi, sahifa yiqilmaydi. */
export async function loadTypes(env: Env): Promise<ProductTypeRow[]> {
  try {
    const { results } = await env.DB.prepare('SELECT * FROM product_types ORDER BY sort_order ASC, id ASC').all<ProductTypeDbRow>();
    return results.map(rowToProductType);
  } catch (err) {
    console.error('loadTypes fallback:', err);
    return [];
  }
}

const EFFECTIVE = 'COALESCE(min_variant_price, cash_price_uzs)';

function buildConds(f: CatalogFilters, opts: { skipBrands?: boolean; skipPrice?: boolean } = {}): { sql: string; binds: unknown[] } {
  const conds: string[] = ['is_active = 1'];
  const binds: unknown[] = [];
  if (f.category) { conds.push('category_id = ?'); binds.push(f.category); }
  if (f.condition) { conds.push('condition = ?'); binds.push(f.condition); }
  if (f.type) { conds.push('type = ?'); binds.push(f.type); }
  if (f.q) {
    // Har bir so'z alohida LIKE, AND bilan: "macbook 14 pro" nomdagi tartibdan qat'i nazar topiladi.
    // So'z mahsulot nomi, brend nomi yoki kategoriya nomiga mos kelishi mumkin.
    for (const term of searchTerms(f.q)) {
      const like = `%${escapeLike(term)}%`;
      conds.push(
        "(name LIKE ? ESCAPE '\\' OR brand_id IN (SELECT id FROM brands WHERE name LIKE ? ESCAPE '\\') OR category_id IN (SELECT id FROM categories WHERE name LIKE ? ESCAPE '\\'))",
      );
      binds.push(like, like, like);
    }
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
    paymentMode: 'cash',
    telegramBotToken: '',
    telegramOrderChatId: '',
    googleClientId: '',
    googleClientSecret: '',
    telegramLoginBot: '',
    customerSessionSecret: '',
    billzSecretToken: '', billzShopId: '', billzLastSync: '',
    yandexMetricaId: '',
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

/** Storefront klientiga (loader → HTML) yuboriladigan config — sirlar olib tashlanadi.
 * Bot token / OAuth secret / sessiya siri faqat server-side (api.order, auth, admin) o'qiladi. */
export function publicSiteConfig(cfg: ApiSiteConfig): ApiSiteConfig {
  return { ...cfg, telegramBotToken: '', googleClientSecret: '', customerSessionSecret: '', billzSecretToken: '' };
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

/** Landing "Yangiliklar" bo'limi — faol, tartib bo'yicha birinchi 3 tasi (tile to'ri shuncha joyga chizilgan). */
export async function loadNews(env: Env): Promise<ApiNews[]> {
  try {
    const { results } = await env.DB.prepare('SELECT * FROM news WHERE is_active = 1 ORDER BY sort_order ASC, id ASC LIMIT 3').all<NewsRow>();
    return results.map(rowToNews);
  } catch (err) {
    console.error('loadNews fallback:', err);
    return []; // bo'lim bezak — bazasiz landing usiz ochilaveradi
  }
}

/** "Vakansiyalar" sahifasi — faollari tartib bo'yicha. Xato bo'lsa bo'sh: sahifa umumiy ariza bilan ochilaveradi. */
export async function loadVacancies(env: Env): Promise<ApiVacancy[]> {
  try {
    const { results } = await env.DB.prepare('SELECT * FROM vacancies WHERE is_active = 1 ORDER BY sort_order ASC, title ASC').all<VacancyRow>();
    return results.map(rowToVacancy);
  } catch (err) {
    console.error('loadVacancies fallback:', err);
    return [];
  }
}

/** Chegirmadagi mahsulot bormi — footer'dagi "Chegirmalar" havolasi bo'sh sahifaga olib bormasin. */
export async function hasDeals(env: Env): Promise<boolean> {
  try {
    const row = await env.DB.prepare('SELECT 1 AS x FROM products WHERE is_active = 1 AND old_price_uzs > cash_price_uzs LIMIT 1').first<{ x: number }>();
    return row !== null;
  } catch (err) {
    console.error('hasDeals fallback:', err);
    return fallbackProducts.some((p) => p.oldPriceUzs != null && p.oldPriceUzs > p.cashPriceUzs);
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

/** Landing va /blog uchun postlar — yangi birinchi. D1 yo'q bo'lsa bo'sh ro'yxat. */
export async function loadPosts(env: Env, limit = 20): Promise<ApiPost[]> {
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM posts WHERE is_active = 1 ORDER BY published_at DESC, sort_order ASC, id ASC LIMIT ?',
    ).bind(limit).all<PostRow>();
    return results.map(rowToPost);
  } catch (err) {
    console.error('loadPosts fallback:', err);
    return [];
  }
}

export async function loadPost(env: Env, slug: string): Promise<ApiPost | null> {
  try {
    const row = await env.DB.prepare('SELECT * FROM posts WHERE slug = ? AND is_active = 1').bind(slug).first<PostRow>();
    return row ? rowToPost(row) : null;
  } catch (err) {
    console.error('loadPost fallback:', err);
    return null;
  }
}

/** `site_texts` → kalit bo'yicha xarita. Xato yuqoriga uzatiladi — admin API shuni ishlatadi. */
export async function readSiteTexts(env: Env): Promise<SiteTexts> {
  const { results } = await env.DB.prepare('SELECT key, uz, ru FROM site_texts').all<{ key: string; uz: string; ru: string }>();
  return Object.fromEntries(results.map((r) => [r.key, { uz: r.uz, ru: r.ru }]));
}

/** Sayt uchun: xato bo'lsa bo'sh — sayt `locales.ts` matnlari bilan ishlayveradi. */
export async function loadSiteTexts(env: Env): Promise<SiteTexts> {
  try {
    return await readSiteTexts(env);
  } catch (err) {
    console.error('loadSiteTexts fallback:', err);
    return {};
  }
}

/** `site_assets` → registr kalitlari bo'yicha xarita (registrdan tashqari qatorlar tashlanadi). */
export async function readSiteAssets(env: Env): Promise<SiteAssets> {
  const { results } = await env.DB.prepare('SELECT key, url FROM site_assets').all<{ key: string; url: string }>();
  const out: SiteAssets = {};
  for (const r of results) if (isAssetKey(r.key)) out[r.key] = r.url;
  return out;
}

/** Sayt uchun: xato bo'lsa bo'sh — koddagi standart rasm/videolar chiqadi. */
export async function loadSiteAssets(env: Env): Promise<SiteAssets> {
  try {
    return await readSiteAssets(env);
  } catch (err) {
    console.error('loadSiteAssets fallback:', err);
    return {};
  }
}

/**
 * Joriy til matnlari admin o'zgarishlari bilan — `meta()` bazaga kira olmagani uchun registr kalitlarini meta'da
 * ishlatadigan route'lar matnni loader'da shu bilan oladi (spec §7).
 * ponytail: store layout ham `site_texts`ni o'qiydi — bir so'rovda ikki kichik SELECT; sekinlashsa so'rov darajasida kesh.
 */
export async function loadT(env: Env, locale: Locale): Promise<Translation> {
  return mergeTexts(translations[localeToLang(locale)], await loadSiteTexts(env), locale === 'ru' ? 'ru' : 'uz');
}
