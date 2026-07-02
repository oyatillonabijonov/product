import type { FC } from 'react';
import type { Translation } from '../locales';
import type { ApiBrand } from '../../shared/types';
import type { CatalogFilters } from '../../app/lib/catalog';
import { formatUzs } from '../lib/installment';

const Chip: FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <button onClick={onRemove} className="inline-flex items-center gap-1.5 bg-[#EAF3FF] text-[#0071E3] text-[13px] font-semibold px-3 py-1.5 rounded-full hover:bg-[#DCEBFF]">
    {label} <span aria-hidden>×</span>
  </button>
);

const ActiveFilterChips: FC<{
  t: Translation;
  filters: CatalogFilters;
  brands: ApiBrand[];
  onRemove: (kind: 'brand' | 'price' | 'condition', value?: string) => void;
}> = ({ t, filters, brands, onRemove }) => {
  const chips: { key: string; label: string; remove: () => void }[] = [];
  for (const b of filters.brands) {
    const name = brands.find((x) => x.id === b || x.slug === b)?.name ?? b;
    chips.push({ key: `b-${b}`, label: name, remove: () => onRemove('brand', b) });
  }
  if (filters.priceMin !== null || filters.priceMax !== null) {
    const lo = filters.priceMin !== null ? formatUzs(filters.priceMin) : '0';
    const hi = filters.priceMax !== null ? formatUzs(filters.priceMax) : '∞';
    chips.push({ key: 'price', label: `${lo} – ${hi}`, remove: () => onRemove('price') });
  }
  if (filters.condition) {
    chips.push({ key: 'cond', label: filters.condition === 'yangi' ? t.badgeNew : t.badgeUsed, remove: () => onRemove('condition') });
  }
  if (chips.length === 0) return null;
  return <div className="flex flex-wrap gap-2">{chips.map((c) => <Chip key={c.key} label={c.label} onRemove={c.remove} />)}</div>;
};
export default ActiveFilterChips;
