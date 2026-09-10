import { useState } from 'react';
import type { FC } from 'react';
import { useSearchParams } from 'react-router';
import { SlidersHorizontal, X } from 'lucide-react';
import type { Translation } from '../locales';
import type { ApiBrand } from '../../shared/types';
import type { InstallmentConfig } from '../data/products';
import { activeFilterCount, type CatalogFilters, type CatalogResult, type SortKey } from '../../app/lib/catalog';
import ProductGrid from './ProductGrid';
import FilterPanel from './FilterPanel';
import SortSelect from './SortSelect';
import ActiveFilterChips from './ActiveFilterChips';
import Pagination from './Pagination';
import Sheet from './Sheet';
import { PILL } from './ui';

const CatalogView: FC<{
  t: Translation;
  title: string;
  result: CatalogResult;
  config: InstallmentConfig;
  brands: ApiBrand[];
  filters: CatalogFilters;
  hideBrands?: boolean;
}> = ({ t, title, result, config, brands, filters, hideBrands }) => {
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
    // Filtr o'zgarganda foydalanuvchi panel yonida qoladi; faqat sahifalashda tepaga chiqadi.
    setSp(p, { preventScrollReset: next.page === undefined });
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

  const active = activeFilterCount(filters, { ignoreBrands: hideBrands });
  const panel = (
    <FilterPanel
      key={`price-${filters.priceMin ?? ''}-${filters.priceMax ?? ''}`}
      t={t}
      brands={brands}
      facets={result.facets}
      filters={filters}
      onChange={(n) => update(n)}
      onClear={clearAll}
      hideBrands={hideBrands}
    />
  );

  return (
    <div className="shell py-6 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-baseline gap-3">
          <h1 className="text-heading md:text-title font-semibold">{title}</h1>
          <span className="text-label text-muted-2">{result.total} {t.resultsCount}</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setSheetOpen(true)} className="press lg:hidden inline-flex h-11 items-center gap-2 border border-line rounded-full px-4 text-copy font-normal">
            <SlidersHorizontal className="w-4 h-4" /> {t.filterTitle}{active > 0 ? ` · ${active}` : ''}
          </button>
          <SortSelect t={t} value={filters.sort} onChange={(v: SortKey) => update({ sort: v })} />
        </div>
      </div>

      <div className="mb-4"><ActiveFilterChips t={t} filters={hideBrands ? { ...filters, brands: [] } : filters} brands={brands} onRemove={removeChip} /></div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
        <aside className="hidden lg:block">{panel}</aside>
        <div>
          <ProductGrid t={t} items={result.items} config={config} eagerCount={4} />
          {result.total === 0 &&
            (filters.brands.length > 0 || filters.priceMin !== null || filters.priceMax !== null || filters.condition !== null) && (
              <div className="mt-4 text-center">
                <button onClick={clearAll} className="press h-11 px-6 rounded-full border border-line text-copy font-normal hover:border-accent hover:text-accent">
                  {t.filterClear}
                </button>
              </div>
            )}
          <Pagination page={filters.page} total={result.total} onPage={(n) => update({ page: n }, false)} />
        </div>
      </div>

      <Sheet
        open={sheetOpen}
        label={t.filterTitle}
        onClose={() => setSheetOpen(false)}
        header={
          <div className="flex items-center justify-between px-6 pt-4 pb-4">
            <h2 className="text-copy font-semibold">{t.filterTitle}</h2>
            <button onClick={() => setSheetOpen(false)} aria-label={t.close} className="press flex h-9 w-9 items-center justify-center rounded-full bg-segment"><X className="w-5 h-5" /></button>
          </div>
        }
        footer={
          /* Belgilash sheet'ni yopmaydi — natija soni loader orqali jonli yangilanadi; shu tugma yopadi. */
          <div className="border-t border-divider px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button onClick={() => setSheetOpen(false)} className={`${PILL} w-full justify-center`}>
              {t.filterShowCount.replace('{n}', String(result.total))}
            </button>
          </div>
        }
      >
        {panel}
      </Sheet>
    </div>
  );
};
export default CatalogView;
