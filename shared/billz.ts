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
  /** Ko'rinish: rasm bor bo'lsa (qoldiqqa qaramaydi, 2026-09-24); qulflar `syncTarget`da qo'llanadi. */
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
    isActive: billzVisible({ hasImage: imageUrl !== '', hiddenLocked: false }),
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
    out.push({ ...rep, stock, isActive: billzVisible({ hasImage: rep.imageUrl !== '', hiddenLocked: false }) });
  }
  return out;
}

/**
 * Ko'rinish qoidasi (spec §4): rasm bor va egasi qo'lda yashirmagan. Qoldiq e'tiborga olinmaydi —
 * egasi tovarni omborda bo'lmasa ham tez olib keladi (2026-09-24). Sinxronizatsiya ham, admin `PUT`/`PATCH`
 * ham shu funksiyani ishlatadi — ikkalasi bir xil natija bermasa, rasm qo'yilgan tovar 30 daqiqa kutardi.
 */
export function billzVisible(o: { hasImage: boolean; hiddenLocked: boolean }): boolean {
  return o.hasImage && !o.hiddenLocked;
}

/**
 * Sinxronizatsiya yozadigan yakuniy tovar. Saytdagi rasm qoladi, agar rasmlar qo'lda qulflangan bo'lsa yoki
 * Billz'da rasm yo'q / CDN'dan yuklab bo'lmasa — aks holda admin/MCP yuklagan rasm har 30 daqiqada o'chardi.
 * `photos: []` bo'lgani uchun galereya ham yozilmaydi. Ko'rinish — `billzVisible`.
 */
export function syncTarget(m: MappedProduct, existingImage: string | null, locks: readonly ManualField[], failed: Set<string>): MappedProduct {
  const siteImage = locks.includes('images') || m.photos.length === 0 || failed.has(m.photos[0].key);
  const base = siteImage ? { ...m, photos: [], imageUrl: existingImage ?? '', gallery: [] } : m;
  return { ...base, isActive: billzVisible({ hasImage: base.imageUrl !== '', hiddenLocked: locks.includes('hidden') }) };
}

/**
 * Sinxronizatsiya mavjud qatorni **Billz'dagi nom** bo'yicha topadi (`products.billz_name`), saytdagi `name`
 * bo'yicha emas: nom endi qulflanadi. Busiz «… / Silver» ni «iPhone 17 Pro» deb qayta nomlasangiz, Billz'dagi
 * boshqa «iPhone 17 Pro» tovarining narx va qoldig'i sizning tovaringizga yozilardi. `billz_name` hali bo'sh
 * bo'lsa (migratsiyadan oldingi qator) — saytdagi nom, u o'sha paytda Billz nomi bilan bir xil edi.
 */
export function billzNameKey(r: { name: string; billz_name: string | null }): string {
  return nameKey(r.billz_name ?? r.name);
}

/**
 * Sinxronizatsiya mavjud Billz qatoriga yozadigan ustunlar (`UPDATE … SET`). Qulflangan guruh butunlay
 * chiqariladi. `billz_name` (moslashtirish kaliti), qoldiq va ko'rinish (`syncTarget` hisoblagan) doim
 * yoziladi. Egasining ustunlari (slug, holat, tartib, reyting) bu yerda umuman yo'q. Xususiyatlar va
 * galereya alohida jadvalda — runner ularni `specs` qulfi va `photos` bo'yicha o'zi hal qiladi.
 */
export function billzUpdateColumns(m: MappedProduct, locks: readonly ManualField[]): { cols: string[]; vals: unknown[] } {
  const cols = ['billz_name=?', 'billz_stock=?', 'is_active=?'];
  const vals: unknown[] = [m.name, m.stock, m.isActive ? 1 : 0];
  const add = (lock: ManualField, pairs: [string, unknown][]) => {
    if (locks.includes(lock)) return;
    for (const [c, v] of pairs) { cols.push(`${c}=?`); vals.push(v); }
  };
  add('name', [['name', m.name]]);
  add('brand', [['brand_id', m.brandId]]);
  add('images', [['image_url', m.imageUrl]]);
  add('category', [['category_id', m.categoryId], ['type', m.type]]);
  add('price', [['cash_price_uzs', m.cashPriceUzs], ['old_price_uzs', m.oldPriceUzs]]);
  add('description', [['description', m.description]]);
  return { cols, vals };
}

/**
 * Billz tovarining **qo'lda o'zgartirilgan** maydonlari (`products.manual_fields`). Ro'yxatdagi guruhga
 * sinxronizatsiya tegmaydi — egasi admin'da yoki MCP orqali nima o'zgartirsa, shunday qoladi
 * (2026-09-24, egasining standarti: «30 daqiqada eski holatga qaytsa — cringe»). `price` naqd va eski
 * narxni, `category` yo'nalish va turni, `images` asosiy rasm va galereyani birga qulflaydi; `hidden` —
 * egasi yashirgan (ko'rsatish qulfni yechadi). Qoldiq hech qachon qulflanmaydi — u ombordan keladi.
 * Yangi kalitlar oxiriga qo'shiladi: bazadagi eski satrlar (`price,specs`) o'zgarishsiz o'qiladi.
 */
export const MANUAL_FIELDS = ['price', 'specs', 'description', 'category', 'name', 'brand', 'images', 'hidden'] as const;
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

/** Qulf solishtiriladigan holat — admin formasi ham, MCP tanasi ham shu shaklga keladi. */
export interface LockSnapshot {
  name: string;
  brandId: string | null;
  categoryId: string | null;
  type: string | null;
  description: string | null;
  cashPriceUzs: number;
  oldPriceUzs: number | null;
  specs: { label: string; value: string }[];
  imageUrl: string;
  images: string[];
  isActive: boolean;
}

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const trimmed = (s: string | null) => (s ?? '').trim();

const GROUPS: { key: ManualField; touched: (a: LockSnapshot, b: LockSnapshot) => boolean }[] = [
  { key: 'price', touched: (a, b) => a.cashPriceUzs !== b.cashPriceUzs || (a.oldPriceUzs ?? null) !== (b.oldPriceUzs ?? null) },
  { key: 'specs', touched: (a, b) => !sameJson(a.specs.map((s) => [s.label, s.value]), b.specs.map((s) => [s.label, s.value])) },
  { key: 'description', touched: (a, b) => trimmed(a.description) !== trimmed(b.description) },
  { key: 'category', touched: (a, b) => a.categoryId !== b.categoryId || a.type !== b.type },
  { key: 'name', touched: (a, b) => a.name.trim() !== b.name.trim() },
  { key: 'brand', touched: (a, b) => a.brandId !== b.brandId },
  { key: 'images', touched: (a, b) => a.imageUrl !== b.imageUrl || !sameJson(a.images, b.images) },
];

/** Ko'rinish qulfi: yashirish `hidden` qo'yadi (Billz qaytarib ochmaydi), ko'rsatish uni yechadi. */
export function withHiddenLock(locks: readonly ManualField[], visible: boolean): ManualField[] {
  const set = new Set<ManualField>(locks);
  if (visible) set.delete('hidden'); else set.add('hidden');
  return MANUAL_FIELDS.filter((f) => set.has(f));
}

/**
 * Saqlashda qo'yiladigan qulflar: `before` — foydalanuvchi ko'rgan holat, `after` — saqlanayotgani.
 * **Mijoz tomonida** hisoblanadi, server farqi bo'yicha emas: sinxronizatsiya tahrir paytida narxni
 * yangilasa, forma eski narxni ham yuboradi — server uni «o'zgartirilgan» deb ko'rib eski narxni abadiy
 * qulflardi (spec §3). Tegilmagan maydon qulflanmaydi va keyingi sinxronizatsiya uni o'zi tuzatadi.
 */
export function applyManualEdits(locks: readonly ManualField[], before: LockSnapshot, after: LockSnapshot): ManualField[] {
  const set = new Set<ManualField>(locks);
  for (const g of GROUPS) if (g.touched(before, after)) set.add(g.key);
  const out = MANUAL_FIELDS.filter((f) => set.has(f));
  return before.isActive === after.isActive ? out : withHiddenLock(out, after.isActive);
}
