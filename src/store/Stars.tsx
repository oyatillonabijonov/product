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
 *
 * `compact` — kartada. U yerda joy tor (5 ustunli to'rda karta 173px gacha
 * tushadi), shuning uchun to'liq yorliq o'rniga faqat son ko'rsatiladi, sharh
 * yo'q bo'lsa esa bo'sh yulduzchalarning o'zi yetarli. To'liq matn baribir
 * `aria-label`da qoladi — screen reader hech narsa yo'qotmaydi.
 */
const Stars: FC<{ t: Translation; rating: number | null | undefined; count: number; compact?: boolean }> = ({
  t, rating, count, compact,
}) => {
  const pct = starFillPercent(rating);
  const full = count > 0
    ? [t.reviewsOne, t.reviewsFew, t.reviewsMany][ruPluralIndex(count)].replace('{n}', String(count))
    : t.reviewsNone;
  const shown = compact ? (count > 0 ? `(${count})` : null) : full;

  return (
    <div
      className="mt-1.5 flex items-center gap-1.5"
      aria-label={count > 0 && pct > 0 ? `${rating} / 5 — ${full}` : full}
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
      {shown && <span aria-hidden className="truncate text-label text-muted-2 tabular-nums">{shown}</span>}
    </div>
  );
};

export default Stars;
