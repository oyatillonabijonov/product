import { MANUAL_FIELDS, type ManualField } from './billz.ts';
import type { ApiProduct, ApiProductDetail, ApiSpec } from './types.ts';

/**
 * MCP tool'larining sof mantig'i. Tool'larning o'zi `mcp/tools.ts`da (MCP SDK va fayl
 * tizimi bilan), bu yerda esa faqat hisob-kitob — shuning uchun testlanadi va keyin
 * remote transport (`server/mcp.ts`) ham aynan shuni ishlatadi.
 */

export interface CatalogStats {
  total: number;
  active: number;
  hidden: number;
  noImage: number;
  noDescription: number;
  stockZero: number;
  billz: number;
  manual: number;
}

export function catalogStats(items: ApiProduct[]): CatalogStats {
  const s: CatalogStats = { total: items.length, active: 0, hidden: 0, noImage: 0, noDescription: 0, stockZero: 0, billz: 0, manual: 0 };
  for (const p of items) {
    if (p.isActive) s.active++; else s.hidden++;
    if (!p.imageUrl) s.noImage++;
    if (!p.description || p.description.trim() === '') s.noDescription++;
    if (p.billzStock === 0) s.stockZero++;
    if (p.billzId) s.billz++; else s.manual++;
  }
  return s;
}

export type Missing = 'image' | 'description' | 'any';

export interface IncompleteItem {
  id: string;
  name: string;
  missing: ('image' | 'description')[];
}

export interface IncompleteResult {
  items: IncompleteItem[];
  /** Keyingi sahifaning boshlanish siljishi; tugagan bo'lsa `null`. */
  nextOffset: number | null;
  /** Filtrga tushgan jami tovar soni (sahifadan qat'i nazar). */
  total: number;
}

/**
 * Yetishmayotgan ma'lumotli tovarlar. Modelga butun katalog bermaslik uchun sahifalanadi
 * (sukut 20 ta) — egasining ssenariysi «nomlarini ketma-ket yubor» aynan shunday ishlaydi.
 */
export function incompleteProducts(
  items: ApiProduct[],
  opts: { missing: Missing; limit?: number; offset?: number },
): IncompleteResult {
  const limit = opts.limit && opts.limit > 0 ? opts.limit : 20;
  const offset = opts.offset && opts.offset > 0 ? opts.offset : 0;
  const all: IncompleteItem[] = [];
  for (const p of items) {
    const missing: ('image' | 'description')[] = [];
    if (!p.imageUrl) missing.push('image');
    if (!p.description || p.description.trim() === '') missing.push('description');
    const wanted = opts.missing === 'any' ? missing.length > 0 : missing.includes(opts.missing);
    if (wanted) all.push({ id: p.id, name: p.name, missing });
  }
  const page = all.slice(offset, offset + limit);
  return { items: page, nextOffset: offset + limit < all.length ? offset + limit : null, total: all.length };
}

/** `product_update` tegadigan maydonlar — `manual_fields` kalitiga xaritasi. */
const LOCKS: { key: ManualField; touched: (patch: ProductPatch) => boolean }[] = [
  { key: 'price', touched: (p) => p.cashPriceUzs !== undefined || p.oldPriceUzs !== undefined },
  { key: 'specs', touched: (p) => p.specs !== undefined },
  { key: 'description', touched: (p) => p.description !== undefined },
];

export interface ProductPatch {
  name?: string;
  description?: string;
  cashPriceUzs?: number;
  oldPriceUzs?: number | null;
  specs?: { label: string; value: string }[];
}

/**
 * Billz tovarida qaysi maydon tegilsa, o'sha maydonning qulfi yoqiladi — aks holda
 * 30 daqiqadan keyin Billz qiymati qaytaradi (`shared/billz.ts`, `manual_fields`).
 * Tartib `MANUAL_FIELDS` bo'yicha barqaror.
 */
export function manualFieldsFor(current: ManualField[], patch: ProductPatch): ManualField[] {
  const set = new Set<ManualField>(current);
  for (const l of LOCKS) if (l.touched(patch)) set.add(l.key);
  return MANUAL_FIELDS.filter((f) => set.has(f));
}

const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp'];

/** Papkadagi fayllardan rasmlarni ajratadi va nom bo'yicha tartiblaydi (birinchisi — asosiy rasm). */
export function imageFilesOf(names: string[]): string[] {
  return names
    .filter((n) => IMAGE_EXT.some((e) => n.toLowerCase().endsWith(e)))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}

/** `PUT /api/admin/products/:id` kutadigan tana. */
export interface ProductInputBody {
  name: string;
  categoryId: string | null;
  type: string | null;
  condition: string;
  conditionNote: string | null;
  cashPriceUzs: number;
  oldPriceUzs: number | null;
  description: string | null;
  imageUrl: string;
  images: string[];
  specs: ApiSpec[];
  sortOrder: number;
  isActive: boolean;
  brandId: string | null;
  slug: string | null;
  ratingAvg: number | null;
  reviewCount: number;
  preorder: boolean;
  pcHidden: boolean;
  pcSocket: string | null;
  pcMemory: string | null;
  pcWatts: number | null;
  options: { name: string; values: string[] }[];
  variants: {
    sku: string | null;
    cashPriceUzs: number;
    oldPriceUzs: number | null;
    imageUrl: string | null;
    inStock: boolean;
    optionValues: { optionName: string; value: string }[];
  }[];
  manualFields: ManualField[];
}

/**
 * `GET` javobini `PUT` tanasiga o'giradi — `src/admin/lib/product-form.ts` dagi
 * `detailToForm` + `formToPayload` bilan **bir xil** qoidalar: galereya asosiy rasmsiz,
 * option qiymatlari nomga, variant `optionValueIds` esa `{optionName, value}` juftligiga.
 * Busiz variantli tovarda `parseProductInput` `option_values_required` bilan 400 beradi.
 */
export function detailToInput(d: ApiProductDetail): ProductInputBody {
  const valueById = new Map<string, { optionName: string; value: string }>();
  for (const o of d.options) {
    for (const v of o.values) valueById.set(v.id, { optionName: o.name, value: v.value });
  }
  return {
    name: d.name, categoryId: d.categoryId, type: d.type,
    condition: d.condition, conditionNote: d.conditionNote, cashPriceUzs: d.cashPriceUzs,
    oldPriceUzs: d.oldPriceUzs, description: d.description, imageUrl: d.imageUrl,
    images: d.images.filter((u) => u !== d.imageUrl),
    specs: d.specs, sortOrder: d.sortOrder, isActive: d.isActive,
    brandId: d.brandId, slug: d.slug, ratingAvg: d.ratingAvg, reviewCount: d.reviewCount,
    preorder: d.preorder, pcHidden: d.pcHidden, pcSocket: d.pcSocket,
    pcMemory: d.pcMemory, pcWatts: d.pcWatts,
    options: d.options.map((o) => ({ name: o.name, values: o.values.map((v) => v.value) })),
    variants: d.variants.map((v) => ({
      sku: v.sku, cashPriceUzs: v.cashPriceUzs, oldPriceUzs: v.oldPriceUzs,
      imageUrl: v.imageUrl, inStock: v.inStock,
      optionValues: v.optionValueIds
        .map((id) => valueById.get(id))
        .filter((x): x is { optionName: string; value: string } => x !== undefined),
    })),
    manualFields: d.manualFields,
  };
}
