import type {
  ApiBanner,
  ApiBrand,
  ApiCategory,
  ApiOption,
  ApiOptionValue,
  ApiPage,
  ApiProductDetail,
  ApiProduct,
  ApiSiteConfig,
  ApiSpec,
  ApiSettings,
  ApiVariant,
  Category,
  Condition,
  Term,
} from '../../shared/types';
import type { Env } from '../env';

export const PRODUCT_COLS =
  `*, (SELECT MIN(v.cash_price_uzs) FROM product_variants v WHERE v.product_id = products.id AND v.in_stock = 1) AS min_variant_price`;

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
  brand_id: string | null;
  slug: string | null;
  min_variant_price?: number | null;
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
    brandId: row.brand_id ?? null,
    slug: row.slug ?? null,
    minPriceUzs: row.min_variant_price ?? row.cash_price_uzs,
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

export interface BrandRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
  sort_order: number;
}

export function rowToBrand(r: BrandRow): ApiBrand {
  return { id: r.id, name: r.name, slug: r.slug, logoUrl: r.logo_url, sortOrder: r.sort_order };
}

export interface OptionRow {
  id: string;
  product_id: string;
  name: string;
  sort_order: number;
}

export interface OptionValueRow {
  id: string;
  option_id: string;
  value: string;
  sort_order: number;
}

export interface VariantRow {
  id: string;
  product_id: string;
  sku: string | null;
  cash_price_uzs: number;
  old_price_uzs: number | null;
  image_url: string | null;
  in_stock: number;
  sort_order: number;
}

export interface VariantOptionValueRow {
  variant_id: string;
  option_value_id: string;
}

function inClause(count: number): string {
  return `(${Array.from({ length: count }, () => '?').join(',')})`;
}

export async function buildProductDetail(
  env: { DB: D1Database },
  id: string,
): Promise<ApiProductDetail | null> {
  const row = await env.DB.prepare(`SELECT ${PRODUCT_COLS} FROM products WHERE id = ? AND is_active = 1`)
    .bind(id)
    .first<ProductRow>();
  if (!row) return null;
  const [
    { results: imgRows },
    { results: specRows },
    { results: optionRows },
    { results: variantRows },
    brandRow,
  ] = await Promise.all([
    env.DB.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC')
      .bind(id)
      .all<ImageRow>(),
    env.DB.prepare('SELECT * FROM product_specs WHERE product_id = ? ORDER BY sort_order ASC')
      .bind(id)
      .all<SpecRow>(),
    env.DB.prepare('SELECT * FROM product_options WHERE product_id = ? ORDER BY sort_order ASC')
      .bind(id)
      .all<OptionRow>(),
    env.DB.prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY sort_order ASC')
      .bind(id)
      .all<VariantRow>(),
    row.brand_id
      ? env.DB.prepare('SELECT * FROM brands WHERE id = ?').bind(row.brand_id).first<BrandRow>()
      : Promise.resolve(null),
  ]);

  const optionIds = optionRows.map((o) => o.id);
  const { results: optionValueRows } = optionIds.length
    ? await env.DB.prepare(
        `SELECT * FROM product_option_values WHERE option_id IN ${inClause(optionIds.length)} ORDER BY sort_order ASC`,
      )
        .bind(...optionIds)
        .all<OptionValueRow>()
    : { results: [] as OptionValueRow[] };

  const variantIds = variantRows.map((v) => v.id);
  const { results: variantOptionValueRows } = variantIds.length
    ? await env.DB.prepare(
        `SELECT * FROM variant_option_values WHERE variant_id IN ${inClause(variantIds.length)}`,
      )
        .bind(...variantIds)
        .all<VariantOptionValueRow>()
    : { results: [] as VariantOptionValueRow[] };

  const options: ApiOption[] = optionRows.map((o) => ({
    id: o.id,
    name: o.name,
    sortOrder: o.sort_order,
    values: optionValueRows
      .filter((v) => v.option_id === o.id)
      .map((v): ApiOptionValue => ({ id: v.id, value: v.value, sortOrder: v.sort_order })),
  }));

  const variants: ApiVariant[] = variantRows.map((v) => ({
    id: v.id,
    sku: v.sku,
    cashPriceUzs: v.cash_price_uzs,
    oldPriceUzs: v.old_price_uzs,
    imageUrl: v.image_url,
    inStock: v.in_stock === 1,
    sortOrder: v.sort_order,
    optionValueIds: variantOptionValueRows
      .filter((r) => r.variant_id === v.id)
      .map((r) => r.option_value_id),
  }));

  const base = rowToProduct(row);
  const gallery = imgRows.map((r) => r.image_url);
  const images = row.image_url ? [row.image_url, ...gallery] : gallery;
  return {
    ...base,
    description: row.description,
    images,
    specs: specRows.map(rowToSpec),
    brand: brandRow ? rowToBrand(brandRow) : null,
    options,
    variants,
  };
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

export interface OptionInput {
  name: string;
  values: string[];
}

export interface VariantInput {
  sku: string | null;
  cashPriceUzs: number;
  oldPriceUzs: number | null;
  imageUrl: string | null;
  inStock: boolean;
  optionValues: { optionName: string; value: string }[];
}

export async function writeOptionsAndVariants(
  env: Env,
  productId: string,
  options: OptionInput[],
  variants: VariantInput[],
): Promise<void> {
  // Delete in FK-safe order: variant_option_values (via variants) -> product_variants
  // -> product_option_values (via options) -> product_options.
  await env.DB.prepare(
    'DELETE FROM variant_option_values WHERE variant_id IN (SELECT id FROM product_variants WHERE product_id = ?)',
  )
    .bind(productId)
    .run();
  await env.DB.prepare('DELETE FROM product_variants WHERE product_id = ?').bind(productId).run();

  await env.DB.prepare(
    'DELETE FROM product_option_values WHERE option_id IN (SELECT id FROM product_options WHERE product_id = ?)',
  )
    .bind(productId)
    .run();
  await env.DB.prepare('DELETE FROM product_options WHERE product_id = ?').bind(productId).run();

  // Insert options + values, building { optionName: { value: option_value_id } }.
  const valueIdMap = new Map<string, Map<string, string>>();
  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    const optionId = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO product_options (id, product_id, name, sort_order) VALUES (?, ?, ?, ?)',
    )
      .bind(optionId, productId, option.name, i)
      .run();
    const values = new Map<string, string>();
    for (let j = 0; j < option.values.length; j++) {
      const valueId = crypto.randomUUID();
      await env.DB.prepare(
        'INSERT INTO product_option_values (id, option_id, value, sort_order) VALUES (?, ?, ?, ?)',
      )
        .bind(valueId, optionId, option.values[j], j)
        .run();
      values.set(option.values[j], valueId);
    }
    valueIdMap.set(option.name, values);
  }

  // Insert variants + their variant_option_values rows from the map.
  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i];
    const variantId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO product_variants
        (id, product_id, sku, cash_price_uzs, old_price_uzs, image_url, in_stock, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        variantId,
        productId,
        variant.sku,
        variant.cashPriceUzs,
        variant.oldPriceUzs,
        variant.imageUrl,
        variant.inStock ? 1 : 0,
        i,
      )
      .run();
    for (const ov of variant.optionValues) {
      const optionValueId = valueIdMap.get(ov.optionName)?.get(ov.value);
      if (!optionValueId) throw new Error('option_value_mismatch');
      await env.DB.prepare(
        'INSERT INTO variant_option_values (variant_id, option_value_id) VALUES (?, ?)',
      )
        .bind(variantId, optionValueId)
        .run();
    }
  }
}

export interface BannerRow {
  id: string; image_url: string; link_url: string; alt_text: string;
  sort_order: number; is_active: number;
}

export function rowToBanner(r: BannerRow): ApiBanner {
  return {
    id: r.id, imageUrl: r.image_url, linkUrl: r.link_url, altText: r.alt_text,
    sortOrder: r.sort_order, isActive: r.is_active === 1,
  };
}

export interface PageRow {
  id: string; slug: string;
  title_uz: string; title_ru: string; title_en: string; title_cyrl: string;
  content_uz: string; content_ru: string; content_en: string; content_cyrl: string;
  sort_order: number; is_active: number;
}

export function rowToPage(r: PageRow): ApiPage {
  return {
    id: r.id, slug: r.slug,
    title: { uz: r.title_uz, ru: r.title_ru, en: r.title_en, uzCyrl: r.title_cyrl },
    content: { uz: r.content_uz, ru: r.content_ru, en: r.content_en, uzCyrl: r.content_cyrl },
    sortOrder: r.sort_order, isActive: r.is_active === 1,
  };
}

export interface SiteConfigRow {
  id: number; name: string; phone: string; phone_display: string;
  telegram: string; instagram: string; whatsapp: string;
  map_ll: string; map_label: string;
  seo_title_suffix: string; seo_description: string; og_image: string;
}

export function rowToSiteConfig(r: SiteConfigRow): ApiSiteConfig {
  return {
    name: r.name, phone: r.phone, phoneDisplay: r.phone_display,
    telegram: r.telegram, instagram: r.instagram, whatsapp: r.whatsapp,
    mapLl: r.map_ll, mapLabel: r.map_label,
    seoTitleSuffix: r.seo_title_suffix, seoDescription: r.seo_description, ogImage: r.og_image,
  };
}
