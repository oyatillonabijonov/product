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
  // Yonidagi "Ko'rsatish" tugmasi va header qidiruvi bilan bir xil: 44px, to'liq radius.
  const input = 'w-full h-11 border border-line rounded-full px-4 text-[14px] focus:outline-none focus:border-accent';
  return (
    <div className="flex flex-col gap-6">
      {!hideBrands && visibleBrands.length > 0 && (
        <section>
          <h3 className="text-[14px] font-medium text-muted-2 uppercase tracking-[0.04em]">{t.filterBrand}</h3>
          <div className="flex flex-col gap-2">
            {visibleBrands.map((b) => (
              <label key={b.id} className="flex items-center gap-2.5 text-[14px] cursor-pointer">
                <input type="checkbox" className="h-4 w-4 accent-accent" checked={filters.brands.includes(b.id)} onChange={() => toggleBrand(b.id)} />
                <span className="flex-1">{b.name}</span>
                <span className="text-[14px] text-muted-2">{facets.brandCounts[b.id] ?? 0}</span>
              </label>
            ))}
          </div>
        </section>
      )}
      <section>
        <h3 className="text-[14px] font-medium text-muted-2 uppercase tracking-[0.04em]">{t.filterPrice}</h3>
        <div className="flex items-center gap-2">
          <input inputMode="numeric" placeholder={t.filterPriceFrom} className={input} value={lo} onChange={(e) => setLo(e.target.value)} />
          <span className="text-muted-2">–</span>
          <input inputMode="numeric" placeholder={t.filterPriceTo} className={input} value={hi} onChange={(e) => setHi(e.target.value)} />
        </div>
        <button onClick={applyPrice} className="mt-2 w-full h-11 border border-line text-[14px] font-medium rounded-full hover:border-accent hover:text-accent transition-colors">
          {t.filterApply}
        </button>
      </section>
      <section>
        <h3 className="text-[14px] font-medium text-muted-2 uppercase tracking-[0.04em]">{t.filterCondition}</h3>
        <div className="flex flex-col gap-2 text-[14px]">
          {([null, 'yangi', 'ishlatilgan'] as const).map((c) => (
            <label key={c ?? 'all'} className="flex items-center gap-2.5 cursor-pointer">
              <input type="radio" name="holat" className="h-4 w-4 accent-accent" checked={filters.condition === c} onChange={() => onChange({ condition: c })} />
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
