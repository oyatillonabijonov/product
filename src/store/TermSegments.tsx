import type { FC } from 'react';
import type { Translation } from '../locales';
import type { Term } from '../data/products';

/** Muddat tanlash segmented-control — ProductPage va CartPage kalkulyatorlarida umumiy.
 * Ustun soni terms uzunligidan olinadi (qattiq 3 emas — admin 4 ta muddat qo'shsa ham buzilmaydi). */
const TermSegments: FC<{
  t: Translation;
  terms: Term[];
  months: number;
  onChange: (months: number) => void;
  className?: string;
}> = ({ t, terms, months, onChange, className }) => (
  <div
    className={`grid gap-1 bg-segment rounded-full p-1 ${className ?? ''}`}
    style={{ gridTemplateColumns: `repeat(${Math.max(terms.length, 1)}, minmax(0, 1fr))` }}
  >
    {terms.map((x) => (
      <button
        key={x.months}
        onClick={() => onChange(x.months)}
        className={`py-2.5 rounded-full text-[14px] font-semibold transition-all duration-200 ${
          x.months === months
            ? 'bg-surface text-primary'
            : 'text-muted hover:text-primary'
        }`}
      >
        {x.months} {t.calcMonths}
      </button>
    ))}
  </div>
);

export default TermSegments;
