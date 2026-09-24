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

// ─── Variant narxlari ─────────────────────────────────────────────────────────
//
// Variantli tovarda saytda **variant narxi** ko'rinadi (`minPriceUzs` = mavjud variantlarning
// eng arzoni), tovarning asosiy `cashPriceUzs`i esa faqat zaxira. Ilgari `product_update`
// faqat asosiy narxni o'zgartirardi — yozuv muvaffaqiyatli bo'lardi-yu, saytda hech narsa
// o'zgarmasdi (2026-09-24, iPhone 18 Pro). Quyidagilar narxni variantlar bo'yicha qo'yadi va
// natijani do'kon egasi mijoz oldida o'qib bera oladigan sodda tilda aytadi.

export interface PriceRow { label: string; price: number }

export interface PriceGroups {
  /** Narxni yolg'iz o'zi belgilaydigan tanlov ("Xotira"); topilmasa `null` — har variant alohida. */
  by: string | null;
  /** Narxga ta'sir qilmaydigan qolgan tanlovlar ("Rang"). */
  others: string[];
  rows: PriceRow[];
}

const sortBy = <T extends { sortOrder: number }>(xs: readonly T[]): T[] => [...xs].sort((a, b) => a.sortOrder - b.sortOrder);

/**
 * Narxni qaysi tanlov belgilashini topadi: shu tanlovning har qiymatidagi hamma variant bir xil
 * narxda bo'lsa, o'sha qiymatlar bo'yicha qator chiqariladi — 16 variant o'rniga 4 qator.
 * Bunday tanlov yo'q bo'lsa har variant «256GB / Black» ko'rinishida alohida.
 */
export function variantPriceGroups(d: ApiProductDetail): PriceGroups {
  const options = sortBy(d.options);
  for (const o of options) {
    const rows: PriceRow[] = [];
    let determines = true;
    for (const v of sortBy(o.values)) {
      const prices = new Set(d.variants.filter((x) => x.optionValueIds.includes(v.id)).map((x) => x.cashPriceUzs));
      if (prices.size === 0) continue;
      if (prices.size > 1) { determines = false; break; }
      rows.push({ label: v.value, price: [...prices][0] });
    }
    if (determines && rows.length > 0) {
      return { by: o.name, others: options.filter((x) => x !== o).map((x) => x.name), rows };
    }
  }
  return { by: null, others: [], rows: sortBy(d.variants).map((v) => ({ label: variantLabel(d, v.optionValueIds), price: v.cashPriceUzs })) };
}

function variantLabel(d: ApiProductDetail, ids: string[]): string {
  const parts: string[] = [];
  for (const o of sortBy(d.options)) {
    const hit = o.values.find((v) => ids.includes(v.id));
    if (hit) parts.push(hit.value);
  }
  return parts.join(' / ');
}

/** "256 GB" va "256gb" bir narsa — egasi og'zaki aytadi. */
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');

/**
 * Narxni qiymat bo'yicha qo'yadi: «256GB — 150» shu qiymatli **hamma** variantga (hamma rangga)
 * tushadi. Asl tovar o'zgarmaydi, yangi nusxa qaytadi. Noma'lum qiymat yoki bitta variantga
 * ikki xil narx tushsa — hech narsa qo'yilmaydi, sababi sodda tilda aytiladi.
 */
export function applyVariantPrices(d: ApiProductDetail, updates: { value: string; price: number }[]): ApiProductDetail {
  const matched = updates.map((u) => {
    const ids = d.options.flatMap((o) => o.values).filter((v) => norm(v.value) === norm(u.value)).map((v) => v.id);
    if (ids.length === 0) {
      const have = sortBy(d.options).map((o) => `${o.name}: ${sortBy(o.values).map((v) => v.value).join(', ')}`).join('; ');
      throw new Error(`«${u.value}» topilmadi. Bu tovarda bor variantlar — ${have}.`);
    }
    return { ...u, ids };
  });

  const variants = d.variants.map((v) => {
    const hits = matched.filter((m) => m.ids.some((id) => v.optionValueIds.includes(id)));
    const prices = new Set(hits.map((h) => h.price));
    if (prices.size > 1) {
      throw new Error(`«${variantLabel(d, v.optionValueIds)}» ga ikki xil narx to'g'ri keldi (${hits.map((h) => h.value).join(' va ')}). Bittasini ayting.`);
    }
    return prices.size === 1 ? { ...v, cashPriceUzs: [...prices][0] } : v;
  });
  return { ...d, variants };
}

/** Saytdagi «… dan» narx: mavjud variantlarning eng arzoni, hammasi tugagan bo'lsa — hammasining. */
export function displayedPrice(d: ApiProductDetail): number {
  const inStock = d.variants.filter((v) => v.inStock);
  const pool = inStock.length > 0 ? inStock : d.variants;
  return Math.min(...pool.map((v) => v.cashPriceUzs));
}

const som = (n: number) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so'm`;

/** Variantli tovarga oddiy narx buyurilganda: hech narsa yozilmaydi, egasiga tanlov beriladi. */
export function priceAskText(d: ApiProductDetail): string {
  const g = variantPriceGroups(d);
  const lines = [
    "Hech narsa o'zgartirilmadi — avval qaysi variant ekanini aniqlab olaylik.",
    `${d.name} bir nechta variantda sotiladi, har birining o'z narxi bor:`,
    ...g.rows.map((r) => `• ${r.label} — ${som(r.price)}`),
  ];
  if (g.by && g.others.length) lines.push(`${g.others.join(' va ')} narxga ta'sir qilmaydi.`);
  lines.push(`Qaysi ${g.by ? g.by.toLowerCase() : 'variant'}ning narxini o'zgartiray?`);
  return lines.join('\n');
}

/** Narx qo'yilgandan keyin: nima o'zgargani va saytda endi nima ko'rinishi — kutilmagan narsa bo'lmasin. */
export function priceChangeSummary(before: ApiProductDetail, after: ApiProductDetail): string {
  const was = new Map(variantPriceGroups(before).rows.map((r) => [r.label, r.price]));
  const g = variantPriceGroups(after);
  const lines = ["Narx o'zgardi.", ...g.rows.map((r) => {
    const old = was.get(r.label);
    return `• ${r.label} — ${som(r.price)}${old !== undefined && old !== r.price ? ` (avval ${som(old).replace(" so'm", '')})` : ''}`;
  })];
  const shown = displayedPrice(after);
  const cheapest = g.rows.find((r) => r.price === shown);
  lines.push('', `Saytda endi «${som(shown)} dan» ko'rinadi${cheapest ? ` — eng arzoni: ${cheapest.label}` : ''}.`);
  return lines.join('\n');
}
