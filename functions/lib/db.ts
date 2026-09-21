import type { SqlDatabase, SqlStatement } from '../../shared/runtime';
import type {
  ApiBanner,
  ApiBrand,
  ApiCategory,
  ApiDeviceModel,
  ApiOption,
  ApiOptionValue,
  ApiNews,
  ApiPage,
  ApiPost,
  ApiProductDetail,
  ApiProduct,
  ApiProductType,
  ApiSiteConfig,
  ApiSpec,
  ApiSettings,
  ApiVariant,
  ApiOrder,
  ApiCustomer,
  ApiVacancy,
  ApiJobApplication,
  EmploymentType,
  OrderItemInput,
  OrderPaymentKind,
  OrderSource,
  OrderStatus,
  Category,
  Condition,
  PaymentMode,
  Term,
} from '../../shared/types';
import { rowToProductType, type ProductTypeDbRow } from '../../shared/product-types';
import type { Env } from '../env';
import { parseManualFields } from '../../shared/billz';

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
  type: string | null;
  billz_id: string | null;
  billz_stock: number | null;
  manual_fields: string | null;
  old_price_uzs: number | null;
  description: string | null;
  brand_id: string | null;
  slug: string | null;
  rating_avg: number | null;
  review_count: number;
  preorder: number;
  pc_hidden: number;
  pc_socket: string | null;
  pc_memory: string | null;
  pc_watts: number | null;
  min_variant_price?: number | null;
}

export interface SettingsRow {
  id: number;
  down_payment_percent: number;
  down_payment_max_percent: number;
  usd_to_uzs: number;
  usd_markup_percent: number | null;
  usd_cbu_rate: number | null;
  usd_rate_date: string;
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
    type: row.type ?? null,
    oldPriceUzs: row.old_price_uzs,
    brandId: row.brand_id ?? null,
    slug: row.slug ?? null,
    minPriceUzs: row.min_variant_price ?? row.cash_price_uzs,
    ratingAvg: row.rating_avg,
    reviewCount: row.review_count ?? 0,
    preorder: row.preorder === 1,
    pcHidden: row.pc_hidden === 1,
    pcSocket: row.pc_socket ?? null,
    pcMemory: row.pc_memory ?? null,
    pcWatts: row.pc_watts ?? null,
    billzId: row.billz_id ?? null,
    billzStock: row.billz_stock ?? null,
    manualFields: parseManualFields(row.manual_fields),
    description: row.description ?? null,
  };
}

export function rowToSettings(row: SettingsRow): ApiSettings {
  const terms = JSON.parse(row.terms) as Term[];
  return {
    downPaymentPercent: row.down_payment_percent,
    downPaymentMaxPercent: row.down_payment_max_percent,
    usdToUzs: row.usd_to_uzs,
    usdMarkupPercent: row.usd_markup_percent ?? null,
    usdCbuRate: row.usd_cbu_rate ?? null,
    usdRateDate: row.usd_rate_date ?? '',
    terms,
  };
}

export interface CategoryRow {
  id: string;
  name: string;
  name_ru: string;
  cover_url: string;
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
  return {
    id: row.id,
    name: row.name,
    nameRu: row.name_ru ?? '',
    coverUrl: row.cover_url ?? '',
    sortOrder: row.sort_order,
  };
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
  env: { DB: SqlDatabase },
  id: string,
  opts?: { includeInactive?: boolean },
): Promise<ApiProductDetail | null> {
  // Storefront faqat faol mahsulotni ko'radi; admin (tahrirlash) nofaolini ham.
  const row = await env.DB.prepare(`SELECT ${PRODUCT_COLS} FROM products WHERE id = ?${opts?.includeInactive ? '' : ' AND is_active = 1'}`)
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
  const images = row.image_url ? [row.image_url, ...gallery.filter((g) => g !== row.image_url)] : gallery;
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

export async function ensureUniqueSlug(env: { DB: SqlDatabase }, slug: string, excludeId: string): Promise<string> {
  let candidate = slug;
  for (let i = 2; ; i++) {
    const row = await env.DB.prepare('SELECT id FROM products WHERE slug = ? AND id <> ?').bind(candidate, excludeId).first<{ id: string }>();
    if (!row) return candidate;
    candidate = `${slug}-${i}`;
  }
}

export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(init?.headers ?? {}) },
  });
}

export interface AdminAuth {
  username: string;
  passwordHash: string;
  passwordSalt: string;
  sessionSecret: string;
  failedAttempts: number;
  lockUntil: number;
  /** Bo'sh bo'lmasa — shu Google email admin sifatida kira oladi (allowlist). */
  adminGoogleEmail: string;
}

interface AdminAuthRow {
  username: string;
  password_hash: string;
  password_salt: string;
  session_secret: string;
  failed_attempts: number;
  lock_until: number;
  admin_google_email: string;
}

export async function loadAdminAuth(env: Env): Promise<AdminAuth | null> {
  const row = await env.DB
    .prepare('SELECT username, password_hash, password_salt, session_secret, failed_attempts, lock_until, admin_google_email FROM admin_auth WHERE id = 1')
    .first<AdminAuthRow>();
  if (!row) return null;
  return {
    username: row.username,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    sessionSecret: row.session_secret,
    failedAttempts: row.failed_attempts,
    lockUntil: row.lock_until,
    adminGoogleEmail: row.admin_google_email ?? '',
  };
}

export async function updateAdminAuth(
  env: Env,
  fields: { username?: string; passwordHash?: string; passwordSalt?: string; sessionSecret?: string; adminGoogleEmail?: string },
): Promise<void> {
  const sets: string[] = [];
  const binds: (string | number)[] = [];
  if (fields.username !== undefined) { sets.push('username = ?'); binds.push(fields.username); }
  if (fields.passwordHash !== undefined) { sets.push('password_hash = ?'); binds.push(fields.passwordHash); }
  if (fields.passwordSalt !== undefined) { sets.push('password_salt = ?'); binds.push(fields.passwordSalt); }
  if (fields.sessionSecret !== undefined) { sets.push('session_secret = ?'); binds.push(fields.sessionSecret); }
  if (fields.adminGoogleEmail !== undefined) { sets.push('admin_google_email = ?'); binds.push(fields.adminGoogleEmail); }
  if (sets.length === 0) return;
  await env.DB.prepare(`UPDATE admin_auth SET ${sets.join(', ')} WHERE id = 1`).bind(...binds).run();
}

export async function updateLoginThrottle(env: Env, failedAttempts: number, lockUntil: number): Promise<void> {
  await env.DB.prepare('UPDATE admin_auth SET failed_attempts = ?, lock_until = ? WHERE id = 1')
    .bind(failedAttempts, lockUntil)
    .run();
}

// Replace-all writers below return prepared statements instead of running them, so the
// caller can execute the whole product write in one atomic env.DB.batch() — a mid-write
// failure must not leave the old rows deleted and the new ones half-inserted.

export { imagesAndSpecsStatements } from '../../shared/product-statements';

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

export function optionsAndVariantsStatements(
  env: Env,
  productId: string,
  options: OptionInput[],
  variants: VariantInput[],
): SqlStatement[] {
  // Delete in FK-safe order: variant_option_values (via variants) -> product_variants
  // -> product_option_values (via options) -> product_options.
  const stmts: SqlStatement[] = [
    env.DB.prepare(
      'DELETE FROM variant_option_values WHERE variant_id IN (SELECT id FROM product_variants WHERE product_id = ?)',
    ).bind(productId),
    env.DB.prepare('DELETE FROM product_variants WHERE product_id = ?').bind(productId),
    env.DB.prepare(
      'DELETE FROM product_option_values WHERE option_id IN (SELECT id FROM product_options WHERE product_id = ?)',
    ).bind(productId),
    env.DB.prepare('DELETE FROM product_options WHERE product_id = ?').bind(productId),
  ];

  // Insert options + values, building { optionName: { value: option_value_id } }.
  const valueIdMap = new Map<string, Map<string, string>>();
  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    const optionId = crypto.randomUUID();
    stmts.push(
      env.DB.prepare('INSERT INTO product_options (id, product_id, name, sort_order) VALUES (?, ?, ?, ?)')
        .bind(optionId, productId, option.name, i),
    );
    const values = new Map<string, string>();
    for (let j = 0; j < option.values.length; j++) {
      const valueId = crypto.randomUUID();
      stmts.push(
        env.DB.prepare('INSERT INTO product_option_values (id, option_id, value, sort_order) VALUES (?, ?, ?, ?)')
          .bind(valueId, optionId, option.values[j], j),
      );
      values.set(option.values[j], valueId);
    }
    valueIdMap.set(option.name, values);
  }

  // Insert variants + their variant_option_values rows from the map. The mismatch throw
  // happens while building, i.e. before anything executes.
  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i];
    const variantId = crypto.randomUUID();
    stmts.push(
      env.DB.prepare(
        `INSERT INTO product_variants
          (id, product_id, sku, cash_price_uzs, old_price_uzs, image_url, in_stock, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        variantId,
        productId,
        variant.sku,
        variant.cashPriceUzs,
        variant.oldPriceUzs,
        variant.imageUrl,
        variant.inStock ? 1 : 0,
        i,
      ),
    );
    for (const ov of variant.optionValues) {
      const optionValueId = valueIdMap.get(ov.optionName)?.get(ov.value);
      if (!optionValueId) throw new Error('option_value_mismatch');
      stmts.push(
        env.DB.prepare('INSERT INTO variant_option_values (variant_id, option_value_id) VALUES (?, ?)')
          .bind(variantId, optionValueId),
      );
    }
  }
  return stmts;
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

export interface NewsRow {
  id: string; badge: string; badge_ru: string; tag: string; tag_ru: string;
  title: string; title_ru: string; text: string; text_ru: string; cta: string; cta_ru: string;
  link_url: string; image_url: string; sort_order: number; is_active: number;
}

export function rowToNews(r: NewsRow): ApiNews {
  return {
    id: r.id, badge: r.badge, badgeRu: r.badge_ru, tag: r.tag, tagRu: r.tag_ru,
    title: r.title, titleRu: r.title_ru, text: r.text, textRu: r.text_ru, cta: r.cta, ctaRu: r.cta_ru,
    linkUrl: r.link_url, imageUrl: r.image_url, sortOrder: r.sort_order, isActive: r.is_active === 1,
  };
}

export interface VacancyRow {
  id: string; title: string; title_ru: string; department: string; department_ru: string;
  employment: string; salary: string; salary_ru: string; description: string; description_ru: string;
  sort_order: number; is_active: number;
}

export function rowToVacancy(r: VacancyRow): ApiVacancy {
  return {
    id: r.id, title: r.title, titleRu: r.title_ru, department: r.department, departmentRu: r.department_ru,
    employment: r.employment as EmploymentType, salary: r.salary, salaryRu: r.salary_ru,
    description: r.description, descriptionRu: r.description_ru,
    sortOrder: r.sort_order, isActive: r.is_active === 1,
  };
}

export interface JobApplicationRow {
  id: number; created_at: number; vacancy_id: string | null; position: string; name: string; phone: string;
  message: string; resume_url: string; status: string; telegram_sent: number;
}

export function rowToJobApplication(r: JobApplicationRow): ApiJobApplication {
  return {
    id: r.id, createdAt: r.created_at, vacancyId: r.vacancy_id, position: r.position, name: r.name, phone: r.phone,
    message: r.message, resumeUrl: r.resume_url, status: r.status as OrderStatus, telegramSent: r.telegram_sent === 1,
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

export interface PostRow {
  id: string; slug: string;
  title: string; title_ru: string;
  excerpt: string; excerpt_ru: string;
  content: string; content_ru: string;
  cover_url: string; published_at: string;
  sort_order: number; is_active: number;
}

export function rowToPost(r: PostRow): ApiPost {
  return {
    id: r.id, slug: r.slug,
    title: r.title, titleRu: r.title_ru,
    excerpt: r.excerpt, excerptRu: r.excerpt_ru,
    content: r.content, contentRu: r.content_ru,
    coverUrl: r.cover_url, publishedAt: r.published_at,
    sortOrder: r.sort_order, isActive: r.is_active === 1,
  };
}

export interface SiteConfigRow {
  id: number; name: string; phone: string; phone_display: string;
  telegram: string; instagram: string; whatsapp: string;
  map_ll: string;
  seo_title_suffix: string; seo_description: string; og_image: string;
  payment_mode: string;
  telegram_bot_token: string;
  telegram_order_chat_id: string;
  google_client_id: string;
  google_client_secret: string;
  telegram_login_bot: string;
  customer_session_secret: string;
  yandex_metrica_id: string;
  billz_secret_token: string;
  billz_shop_id: string;
  billz_last_sync: string;
}

export interface DeviceModelRow {
  id: string; name: string; brand_id: string; category_id: string;
  legacy_category: string; chip: string; ram: string; camera: string;
  display: string; sort_order: number;
}

export function rowToDeviceModel(r: DeviceModelRow): ApiDeviceModel {
  return {
    id: r.id, name: r.name, brandId: r.brand_id, categoryId: r.category_id,
    legacyCategory: r.legacy_category as Category,
    chip: r.chip, ram: r.ram, camera: r.camera, display: r.display,
    sortOrder: r.sort_order,
  };
}

export function rowToSiteConfig(r: SiteConfigRow): ApiSiteConfig {
  return {
    name: r.name, phone: r.phone, phoneDisplay: r.phone_display,
    telegram: r.telegram, instagram: r.instagram, whatsapp: r.whatsapp,
    mapLl: r.map_ll,
    seoTitleSuffix: r.seo_title_suffix, seoDescription: r.seo_description, ogImage: r.og_image,
    paymentMode: (r.payment_mode === 'cash' || r.payment_mode === 'installment') ? r.payment_mode : 'both',
    telegramBotToken: r.telegram_bot_token, telegramOrderChatId: r.telegram_order_chat_id,
    googleClientId: r.google_client_id, googleClientSecret: r.google_client_secret,
    telegramLoginBot: r.telegram_login_bot, customerSessionSecret: r.customer_session_secret,
    yandexMetricaId: r.yandex_metrica_id ?? '',
    billzSecretToken: r.billz_secret_token ?? '', billzShopId: r.billz_shop_id ?? '', billzLastSync: r.billz_last_sync ?? '',
  };
}

export interface CustomerRow {
  id: number; created_at: number; name: string;
  phone: string | null; email: string | null;
  google_sub: string | null; telegram_id: string | null;
  password_hash: string | null; password_salt: string | null;
}

export function rowToCustomer(r: CustomerRow): ApiCustomer {
  return { id: r.id, createdAt: r.created_at, name: r.name, phone: r.phone, email: r.email };
}

export async function loadCustomer(env: Env, id: number): Promise<ApiCustomer | null> {
  const row = await env.DB.prepare('SELECT * FROM customers WHERE id = ?').bind(id).first<CustomerRow>();
  return row ? rowToCustomer(row) : null;
}

export async function loadCustomerOrders(env: Env, id: number): Promise<ApiOrder[]> {
  const { results } = await env.DB.prepare(
    'SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 100',
  ).bind(id).all<OrderRow>();
  return results.map(rowToOrder);
}

/** Google `sub` bo'yicha mijozni topadi yoki yaratadi, id qaytaradi. */
export async function upsertCustomerByGoogle(env: Env, sub: string, email: string, name: string): Promise<number> {
  const existing = await env.DB.prepare('SELECT id FROM customers WHERE google_sub = ?').bind(sub).first<{ id: number }>();
  if (existing) return existing.id;
  const res = await env.DB.prepare('INSERT INTO customers (name, email, google_sub) VALUES (?, ?, ?)')
    .bind(name, email, sub).run();
  return Number(res.meta.last_row_id);
}

/** Email bo'yicha mijozni topadi (login + register dublikat tekshiruvi). Email lower-case saqlanadi. */
export async function findCustomerByEmail(
  env: Env,
  email: string,
): Promise<{ id: number; passwordHash: string | null; passwordSalt: string | null } | null> {
  const row = await env.DB.prepare('SELECT id, password_hash, password_salt FROM customers WHERE email = ? LIMIT 1')
    .bind(email).first<{ id: number; password_hash: string | null; password_salt: string | null }>();
  return row ? { id: row.id, passwordHash: row.password_hash, passwordSalt: row.password_salt } : null;
}

/** Email/parol bilan yangi mijoz yaratadi, id qaytaradi. Chaqiruvchi avval email bandligini tekshiradi. */
export async function createEmailCustomer(
  env: Env, email: string, name: string, passwordHash: string, passwordSalt: string,
): Promise<number> {
  const res = await env.DB.prepare(
    'INSERT INTO customers (name, email, password_hash, password_salt) VALUES (?, ?, ?, ?)',
  ).bind(name, email, passwordHash, passwordSalt).run();
  return Number(res.meta.last_row_id);
}

/** Kabinet: profil (ism + telefon) yangilash. */
export async function updateCustomerProfile(env: Env, id: number, name: string, phone: string): Promise<void> {
  await env.DB.prepare('UPDATE customers SET name = ?, phone = ? WHERE id = ?')
    .bind(name, phone || null, id).run();
}

/** Kabinet parol oqimi uchun: email + joriy xash/salt (parol tekshiruvi + email borligi). */
export async function getCustomerAuth(
  env: Env,
  id: number,
): Promise<{ email: string | null; passwordHash: string | null; passwordSalt: string | null } | null> {
  const row = await env.DB.prepare('SELECT email, password_hash, password_salt FROM customers WHERE id = ?')
    .bind(id).first<{ email: string | null; password_hash: string | null; password_salt: string | null }>();
  return row ? { email: row.email, passwordHash: row.password_hash, passwordSalt: row.password_salt } : null;
}

export async function setCustomerPassword(env: Env, id: number, hash: string, salt: string): Promise<void> {
  await env.DB.prepare('UPDATE customers SET password_hash = ?, password_salt = ? WHERE id = ?')
    .bind(hash, salt, id).run();
}

/** Telegram user id bo'yicha mijozni topadi yoki yaratadi, id qaytaradi. */
export async function upsertCustomerByTelegram(env: Env, telegramId: string, name: string): Promise<number> {
  const existing = await env.DB.prepare('SELECT id FROM customers WHERE telegram_id = ?').bind(telegramId).first<{ id: number }>();
  if (existing) return existing.id;
  const res = await env.DB.prepare('INSERT INTO customers (name, telegram_id) VALUES (?, ?)')
    .bind(name, telegramId).run();
  return Number(res.meta.last_row_id);
}

export interface OrderRow {
  id: number; created_at: number; name: string; phone: string; note: string;
  payment_kind: string; term_months: number | null; down_payment_uzs: number | null;
  monthly_uzs: number | null; total_uzs: number | null; items_json: string;
  source: string; status: string; telegram_sent: number;
}

export function rowToOrder(r: OrderRow): ApiOrder {
  return {
    id: r.id, createdAt: r.created_at, name: r.name, phone: r.phone, note: r.note,
    paymentKind: r.payment_kind as OrderPaymentKind,
    termMonths: r.term_months, downPaymentUzs: r.down_payment_uzs,
    monthlyUzs: r.monthly_uzs, totalUzs: r.total_uzs,
    items: JSON.parse(r.items_json) as OrderItemInput[],
    source: r.source as OrderSource,
    status: r.status as OrderStatus,
    telegramSent: r.telegram_sent === 1,
  };
}

/** Sharh qo'shilgan/o'chirilganda mahsulot reytingi shu sharhlardan qayta hisoblanadi (sharh qolmasa NULL/0). */
export async function recomputeRating(env: Env, productId: string): Promise<void> {
  await env.DB.prepare(
    `UPDATE products SET
       rating_avg = (SELECT ROUND(AVG(rating), 1) FROM product_reviews WHERE product_id = ?),
       review_count = (SELECT COUNT(*) FROM product_reviews WHERE product_id = ?)
     WHERE id = ?`,
  ).bind(productId, productId, productId).run();
}

// ── Tovar turlari (`product_types`) ────────────────────────────────────────
export type TypeListRow = ProductTypeDbRow & { product_count: number };

/** Ro'yxat: har turda mahsulot soni (o'chirish tasdig'i va admin jadvali uchun). */
export const TYPE_LIST_SQL =
  `SELECT t.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = t.category_id AND p.type = t.id) AS product_count
   FROM product_types t`;

export function rowToApiType(r: TypeListRow): ApiProductType {
  return { ...rowToProductType(r), productCount: r.product_count };
}

/** Tur shu yo'nalishda bormi — mahsulot yozishda `type_invalid` (registr bazaga ko'chgan, parser faqat shaklni biladi). */
export async function typeExists(env: { DB: SqlDatabase }, categoryId: string | null, type: string | null): Promise<boolean> {
  if (type === null) return true;
  if (categoryId === null) return false;
  const row = await env.DB.prepare('SELECT 1 AS ok FROM product_types WHERE category_id = ? AND id = ?').bind(categoryId, type).first<{ ok: number }>();
  return row !== null;
}
