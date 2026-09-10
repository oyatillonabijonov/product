import { useState } from 'react';
import type { FC } from 'react';
import { Check, X } from 'lucide-react';
import type { Translation } from '../locales';
import type { ApiBrand } from '../../shared/types';
import { activeFilterCount, type CatalogFilters, type CatalogFacets } from '../../app/lib/catalog';
import { formatThousands, parseDigits } from '../admin/lib/format';

/** Bo'lim sarlavhasi — o'ngida ixtiyoriy izoh ("1 tanlangan"). */
const Heading: FC<{ title: string; note?: string }> = ({ title, note }) => (
  <div className="mb-2.5 flex items-baseline justify-between gap-3">
    <h3 className="text-label font-semibold text-primary">{title}</h3>
    {note && <span className="text-label text-muted-2">{note}</span>}
  </div>
);

// Native input `sr-only` (klaviatura/skrinrider qoladi), ko'rinadigan qism `group-has-checked` bilan bo'yaladi —
// dark rejimda brauzerning oq checkbox'i og'ir ko'rinardi.
// Balandlik ikki xil: mobil varaqda 44px (tegish maydonining pastki chegarasi),
// desktop yon panelda 36px — u yerda sichqoncha aniq va zichlik foydali.
const ROW = 'group relative flex h-11 lg:h-9 cursor-pointer items-center gap-2.5 -mx-2 px-2 text-label text-primary transition-colors hover:bg-row-alt has-checked:bg-row-alt';
const BOX = 'flex h-[18px] w-[18px] shrink-0 items-center justify-center border border-line-2 bg-surface transition-colors group-has-checked:border-accent group-has-checked:bg-accent group-has-focus-visible:ring-2 group-has-focus-visible:ring-accent/40';
// Radio — dumaloq, checkbox esa kvadrat: shakl bittasini tanlash bilan bir nechtasini
// tanlashni ajratib turadi (yorliqni o'qimasdan ham ko'rinadi).
const DOT = 'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-line-2 bg-surface transition-colors group-has-checked:border-accent group-has-focus-visible:ring-2 group-has-focus-visible:ring-accent/40';
const SECTION = 'border-t border-divider py-5 first:border-t-0 first:pt-0';

const FilterPanel: FC<{
  t: Translation;
  brands: ApiBrand[];
  facets: CatalogFacets;
  filters: CatalogFilters;
  onChange: (next: Partial<CatalogFilters>) => void;
  onClear: () => void;
  hideBrands?: boolean;
}> = ({ t, brands, facets, filters, onChange, onClear, hideBrands }) => {
  const appliedLo = filters.priceMin !== null ? String(filters.priceMin) : '';
  const appliedHi = filters.priceMax !== null ? String(filters.priceMax) : '';
  const [lo, setLo] = useState(appliedLo);
  const [hi, setHi] = useState(appliedHi);
  // "Ko'rsatish" faqat kiritilgan qiymat qo'llanganidan farq qilganda chiqadi.
  const dirty = lo.trim() !== appliedLo || hi.trim() !== appliedHi;

  function toggleBrand(id: string) {
    const next = filters.brands.includes(id) ? filters.brands.filter((x) => x !== id) : [...filters.brands, id];
    onChange({ brands: next });
  }
  function applyPrice() {
    if (!dirty) return;
    const pm = parseDigits(lo) || null; // "11 900 000" ham o'tadi; 0/bo'sh → chegara yo'q
    const px = parseDigits(hi) || null;
    onChange({ priceMin: pm, priceMax: px });
  }

  const visibleBrands = brands.filter((b) => (facets.brandCounts[b.id] ?? 0) > 0 || filters.brands.includes(b.id));
  const active = activeFilterCount(filters, { ignoreBrands: hideBrands });
  // Header qidiruvi bilan bir xil: 44px, to'liq radius. Placeholder — joriy natijadagi narx diapazoni.
  const input = 'h-11 w-full min-w-0 rounded-full border border-line bg-transparent px-4 text-label text-primary tabular-nums transition-colors focus:border-accent focus:outline-none';
  const onEnter = (e: { key: string }) => { if (e.key === 'Enter') applyPrice(); };

  return (
    <div className="flex flex-col">
      {!hideBrands && visibleBrands.length > 0 && (
        <section className={SECTION}>
          <Heading title={t.filterBrand} note={filters.brands.length > 0 ? `${filters.brands.length} ${t.filterSelected}` : undefined} />
          <div className="flex flex-col">
            {visibleBrands.map((b) => (
              <label key={b.id} className={ROW}>
                <input type="checkbox" className="sr-only" aria-label={b.name} checked={filters.brands.includes(b.id)} onChange={() => toggleBrand(b.id)} />
                <span aria-hidden className={BOX}>
                  <Check className="h-3 w-3 text-bg opacity-0 transition-opacity group-has-checked:opacity-100" strokeWidth={3} />
                </span>
                <span className="flex-1 truncate">{b.name}</span>
                <span className="text-label text-muted-2 tabular-nums">{facets.brandCounts[b.id] ?? 0}</span>
              </label>
            ))}
          </div>
        </section>
      )}

      <section className={SECTION}>
        <Heading title={t.filterPrice} />
        <div className="flex items-center gap-2">
          <input
            inputMode="numeric"
            placeholder={formatThousands(facets.priceMin) || t.filterPriceFrom}
            aria-label={t.filterPriceFrom}
            className={input}
            value={lo}
            onChange={(e) => setLo(e.target.value)}
            onKeyDown={onEnter}
          />
          <span className="text-muted-2">–</span>
          <input
            inputMode="numeric"
            placeholder={formatThousands(facets.priceMax) || t.filterPriceTo}
            aria-label={t.filterPriceTo}
            className={input}
            value={hi}
            onChange={(e) => setHi(e.target.value)}
            onKeyDown={onEnter}
          />
        </div>
        {dirty && (
          <button onClick={applyPrice} className="press mt-2 h-11 w-full rounded-full bg-accent text-copy font-normal text-bg hover:bg-accent-hover">
            {t.filterApply}
          </button>
        )}
      </section>

      <section className={SECTION}>
        <Heading title={t.filterCondition} />
        {/* Ilgari bu uchta teng bo'lakli segment-kontrol edi. 240px enli panelda
            "Ishlatilgan" o'z bo'lagiga zo'rg'a sig'ar, "Yangi" esa bo'sh joyda
            suzib turardi — uchala yorliq uzunligi har xil bo'lgani uchun teng
            bo'lish ishlamaydi. Endi u tepasidagi brendlar ro'yxati bilan bir xil
            qator idiomasi: to'liq enli, bosish maydoni butun qator. */}
        <div className="flex flex-col">
          {([null, 'yangi', 'ishlatilgan'] as const).map((c) => {
            const label = c === null ? t.filterAll : c === 'yangi' ? t.badgeNew : t.badgeUsed;
            return (
              <label key={c ?? 'all'} className={ROW}>
                <input type="radio" name="holat" className="sr-only" aria-label={label} checked={filters.condition === c} onChange={() => onChange({ condition: c })} />
                <span aria-hidden className={DOT}>
                  <span className="h-2 w-2 rounded-full bg-accent opacity-0 transition-opacity group-has-checked:opacity-100" />
                </span>
                <span className="flex-1 truncate">{label}</span>
              </label>
            );
          })}
        </div>
      </section>

      {active > 0 && (
        <button onClick={onClear} className="press flex h-9 items-center justify-between border-t border-divider pt-5 text-label font-medium text-muted hover:text-primary">
          {t.filterClear} <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
export default FilterPanel;
