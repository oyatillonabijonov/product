import type { FC } from 'react';
import type { Translation } from '../locales';
import { SORTS, type SortKey } from '../../app/lib/catalog';

const SortSelect: FC<{ t: Translation; value: SortKey; onChange: (v: SortKey) => void }> = ({ t, value, onChange }) => {
  const labels: Record<SortKey, string> = {
    default: t.sortDefault, arzon: t.sortCheap, qimmat: t.sortExpensive, yangi: t.sortNew,
  };
  return (
    <label className="inline-flex items-center gap-2 text-[14px] text-muted">
      {t.sortLabel}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="border border-line rounded-xl px-3 py-2 text-[14px] text-primary bg-surface focus:outline-none focus:border-accent"
      >
        {SORTS.map((s) => (
          <option key={s} value={s}>{labels[s]}</option>
        ))}
      </select>
    </label>
  );
};
export default SortSelect;
