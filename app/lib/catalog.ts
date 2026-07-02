import type { Product } from '../../src/data/products';
import { fallbackCategoryOf } from '../../src/data/products';

export const PAGE_SIZE = 24;
export const SORTS = ['default', 'arzon', 'qimmat', 'yangi'] as const;
export type SortKey = (typeof SORTS)[number];
const CONDITIONS = ['yangi', 'ishlatilgan'] as const;
const FILTER_PARAMS = ['brand', 'narx', 'holat', 'cat', 'sort', 'page', 'q'] as const;

export interface CatalogFilters {
  category: string | null;
  brands: string[];
  priceMin: number | null;
  priceMax: number | null;
  condition: 'yangi' | 'ishlatilgan' | null;
  q: string | null;
  sort: SortKey;
  page: number;
  onlyDeals: boolean;
}

export interface CatalogFacets { brandCounts: Record<string, number>; priceMin: number; priceMax: number }
export interface CatalogResult { items: Product[]; total: number; facets: CatalogFacets }

function posInt(v: string | null): number | null {
  if (v === null || v.trim() === '' || !/^\d+$/.test(v.trim())) return null;
  const n = Number(v.trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseCatalogFilters(sp: URLSearchParams, base?: Partial<CatalogFilters>): CatalogFilters {
  const brandsRaw = sp.get('brand');
  const brands = brandsRaw ? brandsRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];
  let priceMin: number | null = null;
  let priceMax: number | null = null;
  const narx = sp.get('narx');
  if (narx && narx.includes('-')) {
    const [lo, hi] = narx.split('-', 2);
    priceMin = posInt(lo);
    priceMax = posInt(hi);
  }
  const holat = sp.get('holat');
  const condition = holat && (CONDITIONS as readonly string[]).includes(holat) ? (holat as CatalogFilters['condition']) : null;
  const sortRaw = sp.get('sort');
  const sort: SortKey = sortRaw && (SORTS as readonly string[]).includes(sortRaw) ? (sortRaw as SortKey) : 'default';
  const page = posInt(sp.get('page')) ?? 1;
  const qRaw = sp.get('q');
  const q = qRaw && qRaw.trim() !== '' ? qRaw.trim() : null;
  const cat = sp.get('cat');
  return {
    category: base?.category ?? (cat && cat.trim() !== '' ? cat.trim() : null),
    brands, priceMin, priceMax, condition, q, sort, page,
    onlyDeals: base?.onlyDeals ?? false,
  };
}

export function hasActiveParams(sp: URLSearchParams): boolean {
  return FILTER_PARAMS.some((k) => sp.get(k) !== null && sp.get(k) !== '');
}

const effective = (p: Product): number => p.minPriceUzs;

export function applyFilters(products: Product[], f: CatalogFilters): CatalogResult {
  let xs = products;
  if (f.category) xs = xs.filter((p) => fallbackCategoryOf(p) === f.category);
  if (f.condition) xs = xs.filter((p) => p.condition === f.condition);
  if (f.q) { const q = f.q.toLowerCase(); xs = xs.filter((p) => p.name.toLowerCase().includes(q)); }
  if (f.onlyDeals) xs = xs.filter((p) => p.oldPriceUzs != null && p.oldPriceUzs > p.cashPriceUzs);
  // fasetlar brend filtridan OLDIN (brend hisoblagichlari boshqa filtrlar bo'yicha)
  const brandCounts: Record<string, number> = {};
  let priceLo = Infinity;
  let priceHi = 0;
  for (const p of xs) {
    if (p.brandId) brandCounts[p.brandId] = (brandCounts[p.brandId] ?? 0) + 1;
    const e = effective(p);
    if (e < priceLo) priceLo = e;
    if (e > priceHi) priceHi = e;
  }
  if (f.brands.length > 0) xs = xs.filter((p) => p.brandId != null && f.brands.includes(p.brandId));
  if (f.priceMin !== null) xs = xs.filter((p) => effective(p) >= (f.priceMin as number));
  if (f.priceMax !== null) xs = xs.filter((p) => effective(p) <= (f.priceMax as number));
  const sorted = [...xs];
  if (f.sort === 'arzon') sorted.sort((a, b) => effective(a) - effective(b));
  else if (f.sort === 'qimmat') sorted.sort((a, b) => effective(b) - effective(a));
  // 'yangi'/'default' — sample tartibi saqlanadi (created_at fallbackda yo'q)
  const total = sorted.length;
  const start = (f.page - 1) * PAGE_SIZE;
  return {
    items: sorted.slice(start, start + PAGE_SIZE),
    total,
    facets: { brandCounts, priceMin: priceLo === Infinity ? 0 : priceLo, priceMax: priceHi },
  };
}
