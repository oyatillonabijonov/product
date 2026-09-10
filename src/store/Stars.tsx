import type { FC } from 'react';
import { Star } from 'lucide-react';
import type { Translation } from '../locales';
import { starFillPercent, ruPluralIndex } from '../lib/rating';

const STARS = [0, 1, 2, 3, 4];

/**
 * Reyting qatori — beshta yulduzcha va sharhlar soni.
 *
 * To'ldirish ikki qatlam bilan: pastda bo'sh yulduzchalar, ustida to'lganlari
 * foizga qarab kesilgan konteynerda. Shu sababli yarim yulduzcha ham aniq
 * chiqadi va alohida "yarim" ikonka kerak emas.
 *
 * Rang — palitra tokenlari (oltin emas): to'lgan yulduzcha `primary`, bo'shi
 * `disabled`. Ikkala temada ham o'zi to'g'ri ranglanadi.
 */
const Stars: FC<{ t: Translation; rating: number | null | undefined; count: number }> = ({ t, rating, count }) => {
  const pct = starFillPercent(rating);
  const label = count > 0
    ? [t.reviewsOne, t.reviewsFew, t.reviewsMany][ruPluralIndex(count)].replace('{n}', String(count))
    : t.reviewsNone;

  return (
    <div
      className="mt-1.5 flex items-center gap-1.5"
      aria-label={count > 0 && pct > 0 ? `${rating} / 5 — ${label}` : label}
    >
      <span className="relative inline-flex shrink-0" aria-hidden>
        <span className="flex gap-px text-disabled">
          {STARS.map((i) => <Star key={i} className="h-3.5 w-3.5" strokeWidth={1.5} />)}
        </span>
        <span
          className="absolute inset-y-0 left-0 flex gap-px overflow-hidden text-primary"
          style={{ width: `${pct}%` }}
        >
          {STARS.map((i) => <Star key={i} className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} fill="currentColor" />)}
        </span>
      </span>
      <span className="truncate text-label text-muted-2">{label}</span>
    </div>
  );
};

export default Stars;
