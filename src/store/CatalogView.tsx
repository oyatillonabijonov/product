import { useState } from 'react';
import type { FC } from 'react';
import { useSearchParams } from 'react-router';
import { SlidersHorizontal, X } from 'lucide-react';
import type { Translation } from '../locales';
import type { ApiBrand } from '../../shared/types';
import type { InstallmentConfig } from '../data/products';
import type { CatalogFilters, CatalogResult, SortKey } from '../../app/lib/catalog';
import ProductGrid from './ProductGrid';
import FilterPanel from './FilterPanel';
import SortSelect from './SortSelect';
import ActiveFilterChips from './ActiveFilterChips';
import Pagination from './Pagination';

const CatalogView: FC<{
  t: Translation;
  title: string;
  result: CatalogResult;
  config: InstallmentConfig;
  brands: ApiBrand[];
  filters: CatalogFilters;
}> = ({ t, title, result, config, brands, filters }) => {
  const [sp, setSp] = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);

  function update(next: Partial<CatalogFilters>, resetPage = true) {
    const p = new URLSearchParams(sp);
    if (next.brands !== undefined) { next.brands.length ? p.set('brand', next.brands.join(',')) : p.delete('brand'); }
    if (next.priceMin !== undefined || next.priceMax !== undefined) {
      const lo = next.priceMin !== undefined ? next.priceMin : filters.priceMin;
      const hi = next.priceMax !== undefined ? next.priceMax : filters.priceMax;
      lo === null && hi === null ? p.delete('narx') : p.set('narx', `${lo ?? ''}-${hi ?? ''}`);
    }
    if (next.condition !== undefined) { next.condition ? p.set('holat', next.condition) : p.delete('holat'); }
    if (next.sort !== undefined) { next.sort === 'default' ? p.delete('sort') : p.set('sort', next.sort); }
    if (next.page !== undefined) { next.page <= 1 ? p.delete('page') : p.set('page', String(next.page)); }
    else if (resetPage) p.delete('page');
    setSp(p, { preventScrollReset: false });
  }
  function clearAll() {
    const p = new URLSearchParams(sp);
    ['brand', 'narx', 'holat', 'sort', 'page'].forEach((k) => p.delete(k));
    setSp(p);
  }
  function removeChip(kind: 'brand' | 'price' | 'condition', value?: string) {
    if (kind === 'brand' && value) update({ brands: filters.brands.filter((b) => b !== value) });
    else if (kind === 'price') update({ priceMin: null, priceMax: null });
    else if (kind === 'condition') update({ condition: null });
  }

  const panel = (
    <FilterPanel t={t} brands={brands} facets={result.facets} filters={filters} onChange={(n) => { update(n); setSheetOpen(false); }} onClear={() => { clearAll(); setSheetOpen(false); }} />
  );

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[24px] md:text-[32px] font-semibold tracking-[-0.02em]">{title}</h1>
          <span className="text-[14px] text-[#86868B]">{result.total} {t.resultsCount}</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setSheetOpen(true)} className="lg:hidden inline-flex items-center gap-2 border border-[#D2D2D7] rounded-full px-4 py-2 text-[14px] font-semibold">
            <SlidersHorizontal className="w-4 h-4" /> {t.filterTitle}
          </button>
          <SortSelect t={t} value={filters.sort} onChange={(v: SortKey) => update({ sort: v })} />
        </div>
      </div>

      <div className="mb-4"><ActiveFilterChips t={t} filters={filters} brands={brands} onRemove={removeChip} /></div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
        <aside className="hidden lg:block">{panel}</aside>
        <div>
          <ProductGrid t={t} items={result.items} config={config} />
          <Pagination page={filters.page} total={result.total} onPage={(n) => update({ page: n }, false)} />
        </div>
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSheetOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-[24px] p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">{t.filterTitle}</h2>
              <button onClick={() => setSheetOpen(false)} aria-label={t.filterClear}><X className="w-5 h-5" /></button>
            </div>
            {panel}
          </div>
        </div>
      )}
    </div>
  );
};
export default CatalogView;
