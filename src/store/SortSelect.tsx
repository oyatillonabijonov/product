import type { FC } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Translation } from '../locales';
import { SORTS, type SortKey } from '../../app/lib/catalog';

/**
 * Saralash — yonidagi "Filtr" tugmasi bilan bir xil o'lchamda (44px, to'liq
 * radius, 17px). Native `select` brauzer ko'rinishini oladi, shuning uchun
 * `appearance-none` + o'z shevronimiz.
 *
 * Ko'rinadigan "Saralash" yorlig'i yo'q: 14px och matn 44px pill yonida
 * o'lcham jihatdan mos tushmasdi, tanlangan qiymatning o'zi ("Tavsiya etilgan")
 * esa nima ekanini aytib turadi. Yorliq `aria-label`da qoladi.
 */
const SortSelect: FC<{ t: Translation; value: SortKey; onChange: (v: SortKey) => void }> = ({ t, value, onChange }) => {
  const labels: Record<SortKey, string> = {
    default: t.sortDefault, arzon: t.sortCheap, qimmat: t.sortExpensive, yangi: t.sortNew,
  };
  return (
    <label className="relative inline-flex">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        aria-label={t.sortLabel}
        className="h-11 appearance-none rounded-full border border-line bg-transparent pl-4 pr-10 text-copy font-normal text-primary transition-colors hover:border-accent focus:outline-none focus:border-accent"
      >
        {SORTS.map((s) => (
          <option key={s} value={s}>{labels[s]}</option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
    </label>
  );
};
export default SortSelect;
