import type { FC } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Translation } from '../locales';
import { SORTS, type SortKey } from '../../app/lib/catalog';

/**
 * Saralash — yonidagi "Filtr" tugmasi bilan bir xil o'lchamda (44px, to'liq
 * radius, 14px). Native `select` brauzer ko'rinishini oladi, shuning uchun
 * `appearance-none` + o'z shevronimiz.
 */
const SortSelect: FC<{ t: Translation; value: SortKey; onChange: (v: SortKey) => void }> = ({ t, value, onChange }) => {
  const labels: Record<SortKey, string> = {
    default: t.sortDefault, arzon: t.sortCheap, qimmat: t.sortExpensive, yangi: t.sortNew,
  };
  return (
    <label className="inline-flex items-center gap-2 text-[14px] text-muted-2">
      <span className="hidden sm:inline">{t.sortLabel}</span>
      <span className="relative inline-flex">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as SortKey)}
          aria-label={t.sortLabel}
          className="h-11 appearance-none rounded-full border border-line bg-transparent pl-4 pr-10 text-[14px] font-medium text-primary transition-colors hover:border-accent focus:outline-none focus:border-accent"
        >
          {SORTS.map((s) => (
            <option key={s} value={s}>{labels[s]}</option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
      </span>
    </label>
  );
};
export default SortSelect;
