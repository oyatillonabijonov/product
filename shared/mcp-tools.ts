import type { ManualField } from './billz.ts';
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

export interface PriceRow { label: string; price: number; old: number | null }

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
      const vs = d.variants.filter((x) => x.optionValueIds.includes(v.id));
      const prices = new Set(vs.map((x) => x.cashPriceUzs));
      if (prices.size === 0) continue;
      if (prices.size > 1) { determines = false; break; }
      const olds = new Set(vs.map((x) => x.oldPriceUzs ?? null));
      rows.push({ label: v.value, price: [...prices][0], old: olds.size === 1 ? [...olds][0] : null });
    }
    if (determines && rows.length > 0) {
      return { by: o.name, others: options.filter((x) => x !== o).map((x) => x.name), rows };
    }
  }
  return {
    by: null, others: [],
    rows: sortBy(d.variants).map((v) => ({ label: variantLabel(d, v.optionValueIds), price: v.cashPriceUzs, old: v.oldPriceUzs ?? null })),
  };
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

export interface VariantPriceUpdate { value: string; price: number; oldPrice?: number | null }

/**
 * Narxni qiymat bo'yicha qo'yadi: «256GB — 150» shu qiymatli **hamma** variantga (hamma rangga)
 * tushadi. `oldPrice` berilsa chegirma (eski narx) ham qo'yiladi, `null` — chegirma olib tashlanadi,
 * berilmasa — mavjudi qoladi. Asl tovar o'zgarmaydi. Noma'lum qiymat, ikki xil narx yoki eski narx
 * yangisidan katta bo'lmasa — hech narsa qo'yilmaydi, sababi sodda tilda aytiladi.
 */
export function applyVariantPrices(d: ApiProductDetail, updates: VariantPriceUpdate[]): ApiProductDetail {
  for (const u of updates) {
    if (u.oldPrice != null && u.oldPrice <= u.price) {
      throw new Error(`«${u.value}»: eski narx (${thousands(u.oldPrice)}) yangi narxdan (${thousands(u.price)}) katta bo'lishi kerak — aks holda saytda chegirma belgisi chiqmaydi.`);
    }
  }
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
    const keys = new Set(hits.map((h) => `${h.price}|${h.oldPrice === undefined ? '~' : String(h.oldPrice)}`));
    if (keys.size > 1) {
      throw new Error(`«${variantLabel(d, v.optionValueIds)}» ga ikki xil narx to'g'ri keldi (${hits.map((h) => h.value).join(' va ')}). Bittasini ayting.`);
    }
    if (hits.length === 0) return v;
    const h = hits[0];
    return { ...v, cashPriceUzs: h.price, oldPriceUzs: h.oldPrice === undefined ? v.oldPriceUzs : h.oldPrice };
  });
  return { ...d, variants };
}

/** Saytdagi «… dan» narx: mavjud variantlarning eng arzoni, hammasi tugagan bo'lsa — hammasining. */
export function displayedPrice(d: ApiProductDetail): number {
  const inStock = d.variants.filter((v) => v.inStock);
  const pool = inStock.length > 0 ? inStock : d.variants;
  return Math.min(...pool.map((v) => v.cashPriceUzs));
}

const thousands = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const som = (n: number) => `${thousands(n)} so'm`;

/** Variantli tovarga oddiy narx buyurilganda: hech narsa yozilmaydi, egasiga tanlov beriladi. */
export function priceAskText(d: ApiProductDetail): string {
  const g = variantPriceGroups(d);
  const lines = [
    "Hech narsa o'zgartirilmadi — avval qaysi variant ekanini aniqlab olaylik.",
    `${d.name} bir nechta variantda sotiladi, har birining o'z narxi bor:`,
    ...g.rows.map((r) => `• ${r.label} — ${priceText(r.price, r.old)}`),
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
    return `• ${r.label} — ${priceText(r.price, r.old)}${old !== undefined && old !== r.price ? ` (avval ${thousands(old)})` : ''}`;
  })];
  const shown = displayedPrice(after);
  const cheapest = g.rows.find((r) => r.price === shown);
  lines.push('', `Saytda endi «${som(shown)} dan» ko'rinadi${cheapest ? ` — eng arzoni: ${cheapest.label}` : ''}.`);
  return lines.join('\n');
}

// ─── Chegirma va xususiyatlar ─────────────────────────────────────────────────

/**
 * Saytdagi «−N%» belgisi. Formula `src/lib/installment.ts` `discountPercent` bilan **aynan bir xil** —
 * `shared/` dan `src/` ni import qilib bo'lmaydi (Docker image'da `src/` yo'q), shuning uchun nusxa;
 * `mcp-tools.test.ts` ikkalasini bir xil javob berishga majburlaydi.
 */
export function discountPct(cash: number, old: number | null): number | null {
  if (old === null || old <= cash) return null;
  const pct = Math.round(((old - cash) / old) * 100);
  return pct > 0 ? pct : null;
}

/** Narx — chegirma bo'lsa saytdagi foiz va eski narx bilan (egasi mijoz oldida aynan shuni ko'radi). */
export function priceText(cash: number, old: number | null): string {
  const pct = discountPct(cash, old);
  return pct === null || old === null ? som(cash) : `${som(cash)} — chegirma −${pct}% (eski narx ${thousands(old)})`;
}

/**
 * Xususiyatlar nom bo'yicha: bor bo'lsa qiymati yangilanadi (joyi va yozilishi saqlanadi), yo'q bo'lsa oxiriga
 * qo'shiladi, `remove` — o'chiriladi; qolganlariga tegilmaydi. Ilgari `specs` butun ro'yxatni almashtirardi:
 * «Xotira qo'sh» deyilsa Claude bitta qator yuborib qolgan hammasini o'chirib yuborishi mumkin edi.
 */
export function upsertSpecs(current: ApiSpec[], set: ApiSpec[] = [], remove: string[] = []): ApiSpec[] {
  const drop = new Set(remove.map(norm));
  const out = current.filter((s) => !drop.has(norm(s.label))).map((s) => ({ ...s }));
  for (const u of set) {
    const label = u.label.trim();
    const value = u.value.trim();
    if (!label || !value) continue;
    const i = out.findIndex((s) => norm(s.label) === norm(label));
    if (i >= 0) out[i] = { label: out[i].label, value };
    else out.push({ label, value });
  }
  return out;
}
