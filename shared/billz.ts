// `.ts` kengaytmasi — Node (server/) type-stripping rejimida kengaytmasiz import ishlamaydi.
import { matchBillzType, typesOf, type ProductTypeRow } from './product-types.ts';

/**
 * Billz (billz.io) — faqat o'qish. Bu fayl sof: tarmoq ham, baza ham yo'q,
 * shuning uchun to'liq testlanadi. Runner (`server/billz-sync.ts`) shu
 * qoidalarni ishlatadi, admin (`src/admin`) tiplarni.
 */
export const BILLZ_BASE = 'https://api-admin.billz.ai';
/** Rasm faqat shu hostlardan yuklanadi — Billz ma'lumoti yarim ishonchli, SSRF'ga yo'l yo'q. */
const BILLZ_CDN_HOSTS = ['fra1.digitaloceanspaces.com'];
const BILLZ_PAGE_SIZE = 200;

export interface BillzPhoto { photo_url: string; sequence: number; is_main: boolean }
export interface BillzShopPrice { shop_id: string; retail_price: number; retail_currency: string; promo_price: number }
export interface BillzShopStock { shop_id: string; active_measurement_value: number }
/** `GET /v2/products` tovari — faqat o'qiladigan maydonlar. */
export interface BillzProduct {
  id: string;
  name: string;
  brand_name: string;
  categories: { id: string; name: string }[] | null;
  description: string | null;
  updated_at: string;
  main_image_url_full: string;
  photos: BillzPhoto[] | null;
  custom_fields: { custom_field_name: string; custom_field_value: string }[] | null;
  product_attributes: { attribute_name: string; attribute_value: string }[] | null;
  shop_prices: BillzShopPrice[] | null;
  shop_measurement_values: BillzShopStock[] | null;
}
export interface BillzProductsPage { count: number; products: BillzProduct[] | null }
export interface BillzShop { id: string; name: string }

export interface BillzSyncResult {
  at: string;
  mode: 'full' | 'delta';
  ok: boolean;
  count: number;
  seen: number;
  inserted: number;
  updated: number;
  hidden: number;
  photos: number;
  skipped: number;
  error?: string;
  note?: string;
}
export interface BillzSyncStatus { configured: boolean; running: boolean; last: BillzSyncResult | null }

export function productsUrl(page: number, since?: string): string {
  const u = new URL('/v2/products', BILLZ_BASE);
  u.searchParams.set('limit', String(BILLZ_PAGE_SIZE));
  u.searchParams.set('page', String(page));
  if (since) u.searchParams.set('last_updated_date', since);
  return u.toString();
}

/** Billz kutadigan UTC vaqt: `YYYY-MM-DD HH:MM:SS`. */
export function utcStamp(d: Date): string {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

/** Billz narxi → so'm, 1 000 ga yaxlitlab. Noma'lum valyuta yoki nol → null. */
export function toUzs(amount: number, currency: string, rate: number): number | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const uzs = currency === 'USD' ? amount * rate : currency === 'UZS' ? amount : NaN;
  if (!Number.isFinite(uzs)) return null;
  return Math.round(uzs / 1000) * 1000;
}

/** Rich-editor HTML → oddiy matn (`ProductPage` `whitespace-pre-line` bilan ko'rsatadi). */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function asciiSlug(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const PHOTO_EXT = new Set(['jpg', 'jpeg', 'png', 'webp']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Brauzerda ham ishlaydigan qisqa hash — CDN nomi uuid bo'lmagan holat uchun. */
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** CDN URL → ombor kaliti (`products/billz-<uuid>.<ext>`); yaroqsiz URL → null. */
export function photoKey(url: string): string | null {
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== 'https:' || !BILLZ_CDN_HOSTS.includes(u.hostname)) return null;
  const base = decodeURIComponent(u.pathname.split('/').pop() ?? '');
  const dot = base.lastIndexOf('.');
  if (dot < 0) return null;
  const ext = base.slice(dot + 1).toLowerCase();
  if (!PHOTO_EXT.has(ext)) return null;
  const stem = base.slice(0, dot);
  const name = UUID.test(stem) ? stem.toLowerCase() : fnv1a(url);
  return `products/billz-${name}.${ext}`;
}

/** Bazada Billz'dan kelgan, lekin to'liq sinxronizatsiyada ko'rinmagan tovarlar. */
export function hiddenIds(dbIds: Iterable<string>, seen: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const id of dbIds) if (!seen.has(id)) out.push(id);
  return out;
}

export interface MapContext {
  shopId: string;
  usdToUzs: number;
  categoryIds: ReadonlySet<string>;
  /** kichik harfli brend nomi → brand id */
  brandsByName: ReadonlyMap<string, string>;
  /** Bazadagi turlar (hamma yo'nalish) — Billz kategoriya nomi shulardan biriga tushadi. */
  types: ProductTypeRow[];
  /** Saytdagi joriy rasm (admin yuklagan bo'lishi mumkin) — Billz'da rasm bo'lmasa saqlanadi. */
  existingImage: string | null;
}

export interface MappedProduct {
  billzId: string;
  name: string;
  /** Faqat insert'da ishlatiladi — URL nom o'zgarsa ham turadi. */
  slug: string;
  categoryId: string | null;
  type: string | null;
  brandId: string | null;
  /** Brend saytda yo'q — runner `brands`ga qo'shadi. */
  newBrand: { id: string; name: string } | null;
  cashPriceUzs: number;
  oldPriceUzs: number | null;
  stock: number;
  description: string | null;
  specs: { label: string; value: string }[];
  /** Billz rasmlari, asosiysi birinchi; bo'sh bo'lsa saytdagi rasm qoladi. */
  photos: { url: string; key: string }[];
  imageUrl: string;
  gallery: string[];
  /** Ko'rinish qoidasi: qoldiq bor va rasm bor. */
  isActive: boolean;
}

const SPEC_LABELS: Record<string, string> = { 'Память': 'Xotira', 'Цвет': 'Rang', 'Состояние': 'Chip' };
const JUNK = /^[\s_—–-]*$/;

export function mapBillzProduct(raw: BillzProduct, ctx: MapContext): MappedProduct | null {
  const name = (raw.name ?? '').trim();
  if (!name) return null;
  const price = raw.shop_prices?.find((p) => p.shop_id === ctx.shopId);
  if (!price) return null;
  const retail = toUzs(price.retail_price, price.retail_currency, ctx.usdToUzs);
  if (retail === null) return null;
  const promo = price.promo_price > 0 ? toUzs(price.promo_price, price.retail_currency, ctx.usdToUzs) : null;
  const cashPriceUzs = promo ?? retail;
  const oldPriceUzs = promo !== null ? retail : null;

  const stockRow = raw.shop_measurement_values?.find((m) => m.shop_id === ctx.shopId);
  const stock = Math.max(0, Math.floor(stockRow?.active_measurement_value ?? 0));

  const fields = raw.custom_fields ?? [];
  const field = (n: string) => fields.find((f) => f.custom_field_name === n)?.custom_field_value ?? '';
  const dir = field('Nad Kategoriya').trim().toLowerCase();
  const categoryId = ctx.categoryIds.has(dir) ? dir : null;
  const type = categoryId ? matchBillzType(typesOf(ctx.types, categoryId), raw.categories?.[0]?.name ?? '') : null;
  const brandName = (raw.brand_name ?? '').trim();
  let brandId: string | null = null;
  let newBrand: MappedProduct['newBrand'] = null;
  if (brandName) {
    brandId = ctx.brandsByName.get(brandName.toLowerCase()) ?? null;
    if (!brandId) {
      brandId = asciiSlug(brandName) || 'brand';
      newBrand = { id: brandId, name: brandName };
    }
  }

  const specs: { label: string; value: string }[] = [];
  for (const f of fields) {
    const label = SPEC_LABELS[f.custom_field_name];
    const value = (f.custom_field_value ?? '').trim();
    if (label && !JUNK.test(value)) specs.push({ label, value });
  }
  if (!specs.some((s) => s.label === 'Rang')) {
    const color = raw.product_attributes?.find((a) => a.attribute_name === 'Цвет')?.attribute_value?.trim();
    if (color && !JUNK.test(color)) specs.push({ label: 'Rang', value: color });
  }

  const photos = [...(raw.photos ?? [])]
    .sort((a, b) => Number(b.is_main) - Number(a.is_main) || a.sequence - b.sequence)
    .flatMap((p) => {
      const key = photoKey(p.photo_url);
      return key ? [{ url: p.photo_url, key }] : [];
    });
  const imageUrl = photos[0] ? `/images/${photos[0].key}` : (ctx.existingImage ?? '');
  const gallery = photos.slice(1).map((p) => `/images/${p.key}`);
  const description = htmlToText(raw.description ?? '') || null;

  return {
    billzId: raw.id,
    name,
    slug: `${asciiSlug(name) || 'tovar'}-${raw.id.slice(0, 8)}`,
    categoryId,
    type,
    brandId,
    newBrand,
    cashPriceUzs,
    oldPriceUzs,
    stock,
    description,
    specs,
    photos,
    imageUrl,
    gallery,
    isActive: stock > 0 && imageUrl !== '',
  };
}

/** Guruhlash kaliti: registr va ortiqcha bo'shliqlar farq qilmaydi. */
export function nameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Billz har bir jismoniy dona uchun alohida tovar yozuvi yuritadi (Apple TV ×10,
 * har biri qoldiq 1). Saytda bir nom = bitta mahsulot: qoldiq yig'iladi, vakil
 * sifatida rasmi bor birinchi yozuv olinadi (narx/tavsif ham undan).
 * ponytail: aynan bir xil nom bo'yicha; "14inch" va "14\"" farqli nom — ular
 * Billz'da to'g'rilanadi, bu yerda taxmin qilinmaydi.
 */
export function mergeDuplicates(items: MappedProduct[]): MappedProduct[] {
  const groups = new Map<string, MappedProduct[]>();
  for (const m of items) {
    const k = nameKey(m.name);
    const g = groups.get(k);
    if (g) g.push(m); else groups.set(k, [m]);
  }
  const out: MappedProduct[] = [];
  for (const g of groups.values()) {
    const rep = g.find((m) => m.photos.length > 0) ?? g[0];
    const stock = g.reduce((s, m) => s + m.stock, 0);
    out.push({ ...rep, stock, isActive: stock > 0 && rep.imageUrl !== '' });
  }
  return out;
}

/**
 * Billz'da rasm bo'lmasa (yoki CDN'dan yuklab bo'lmasa) saytdagi rasm qoladi va
 * ko'rinish o'sha rasm bo'yicha hisoblanadi. Aks holda Billz'ning bo'sh `image_url`i
 * admin/MCP yuklagan rasmni har 30 daqiqada o'chirib, tovarni yana yashirar edi
 * (galereya allaqachon shunday himoyalangan, asosiy rasm esa qolib ketgan edi).
 */
export function keepSiteImage(m: MappedProduct, existingImage: string | null, failed: Set<string>): MappedProduct {
  if (m.photos.length > 0 && !failed.has(m.photos[0].key)) return m;
  const imageUrl = existingImage ?? '';
  return { ...m, photos: [], imageUrl, gallery: [], isActive: m.stock > 0 && imageUrl !== '' };
}

/**
 * Billz tovarining **qo'lda tahrirlanadigan** maydonlari. Billz'da tavsif va xususiyatlar
 * ko'pincha to'liq emas, `Nad Kategoriya` maydoni esa to'ldirilmay qolishi mumkin —
 * shuning uchun egasi ularni admin'da yozishi mumkin: shu ro'yxatga tushgan maydonga
 * sinxronizatsiya boshqa tegmaydi (`products.manual_fields` ustuni). `category` yo'nalish
 * va turni birga qulflaydi (tur yo'nalish ichidan tanlanadi).
 * Qolgan ustunlar avvalgidek Billz'niki — nom, qoldiq, ko'rinish, rasm, brend.
 */
export const MANUAL_FIELDS = ['price', 'specs', 'description', 'category'] as const;
export type ManualField = (typeof MANUAL_FIELDS)[number];

/** Bazadagi vergulli satrni ro'yxatga aylantiradi; notanish kalit va takror tashlanadi. */
export function parseManualFields(raw: string | null | undefined): ManualField[] {
  if (!raw) return [];
  const seen = new Set(raw.split(',').map((s) => s.trim()));
  return MANUAL_FIELDS.filter((f) => seen.has(f));
}

/** Ro'yxatni bazaga yoziladigan satrga aylantiradi — tartib va to'plam doim bir xil. */
export function serializeManualFields(fields: readonly string[] | null | undefined): string {
  if (!fields) return '';
  return MANUAL_FIELDS.filter((f) => fields.includes(f)).join(',');
}
