import { useState } from 'react';
import type { FC } from 'react';
import type { Translation } from '../locales';
import type { ApiBrand } from '../../shared/types';
import type { CatalogFilters, CatalogFacets } from '../../app/lib/catalog';

const FilterPanel: FC<{
  t: Translation;
  brands: ApiBrand[];
  facets: CatalogFacets;
  filters: CatalogFilters;
  onChange: (next: Partial<CatalogFilters>) => void;
  onClear: () => void;
  hideBrands?: boolean;
}> = ({ t, brands, facets, filters, onChange, onClear, hideBrands }) => {
  const [lo, setLo] = useState(filters.priceMin !== null ? String(filters.priceMin) : '');
  const [hi, setHi] = useState(filters.priceMax !== null ? String(filters.priceMax) : '');

  function toggleBrand(id: string) {
    const next = filters.brands.includes(id) ? filters.brands.filter((x) => x !== id) : [...filters.brands, id];
    onChange({ brands: next });
  }
  function applyPrice() {
    const pm = lo.trim() !== '' && /^\d+$/.test(lo.trim()) ? Number(lo.trim()) : null;
    const px = hi.trim() !== '' && /^\d+$/.test(hi.trim()) ? Number(hi.trim()) : null;
    onChange({ priceMin: pm, priceMax: px });
  }

  const visibleBrands = brands.filter((b) => (facets.brandCounts[b.id] ?? 0) > 0 || filters.brands.includes(b.id));
  const input = 'w-full border border-line rounded-xl px-3 py-2 text-[14px] focus:outline-none focus:border-accent';
  return (
    <div className="flex flex-col gap-6">
      {!hideBrands && visibleBrands.length > 0 && (
        <section>
          <h3 className="text-[14px] font-bold uppercase tracking-wide text-muted-2 mb-3">{t.filterBrand}</h3>
          <div className="flex flex-col gap-2">
            {visibleBrands.map((b) => (
              <label key={b.id} className="flex items-center gap-2.5 text-[14px] cursor-pointer">
                <input type="checkbox" checked={filters.brands.includes(b.id)} onChange={() => toggleBrand(b.id)} />
                <span className="flex-1">{b.name}</span>
                <span className="text-[14px] text-muted-2">{facets.brandCounts[b.id] ?? 0}</span>
              </label>
            ))}
          </div>
        </section>
      )}
      <section>
        <h3 className="text-[14px] font-bold uppercase tracking-wide text-muted-2 mb-3">{t.filterPrice}</h3>
        <div className="flex items-center gap-2">
          <input inputMode="numeric" placeholder={t.filterPriceFrom} className={input} value={lo} onChange={(e) => setLo(e.target.value)} />
          <span className="text-muted-2">–</span>
          <input inputMode="numeric" placeholder={t.filterPriceTo} className={input} value={hi} onChange={(e) => setHi(e.target.value)} />
        </div>
        <button onClick={applyPrice} className="mt-2 w-full py-2 bg-primary text-white text-[14px] font-semibold rounded-full hover:bg-accent transition-colors">
          {t.filterApply}
        </button>
      </section>
      <section>
        <h3 className="text-[14px] font-bold uppercase tracking-wide text-muted-2 mb-3">{t.filterCondition}</h3>
        <div className="flex flex-col gap-2 text-[14px]">
          {([null, 'yangi', 'ishlatilgan'] as const).map((c) => (
            <label key={c ?? 'all'} className="flex items-center gap-2.5 cursor-pointer">
              <input type="radio" name="holat" checked={filters.condition === c} onChange={() => onChange({ condition: c })} />
              {c === null ? t.filterAll : c === 'yangi' ? t.badgeNew : t.badgeUsed}
            </label>
          ))}
        </div>
      </section>
      <button onClick={onClear} className="text-[14px] text-muted hover:text-sale font-semibold text-left">
        {t.filterClear}
      </button>
    </div>
  );
};
export default FilterPanel;
