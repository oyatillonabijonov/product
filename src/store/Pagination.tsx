import type { FC } from 'react';
import { Link, useSearchParams } from 'react-router';
import { PAGE_SIZE } from '../../app/lib/catalog';

const Pagination: FC<{ page: number; total: number; onPage: (n: number) => void }> = ({ page, total, onPage }) => {
  const [params] = useSearchParams();
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pageCount <= 1) return null;
  const pages: number[] = [];
  for (let i = 1; i <= pageCount; i++) {
    if (i === 1 || i === pageCount || Math.abs(i - page) <= 1) pages.push(i);
  }
  const withGaps: (number | '…')[] = [];
  for (let i = 0; i < pages.length; i++) {
    if (i > 0 && pages[i] - pages[i - 1] > 1) withGaps.push('…');
    withGaps.push(pages[i]);
  }
  // Haqiqiy <a href> — crawler chuqur sahifalarga link orqali yeta olsin;
  // klik esa avvalgidek onPage orqali (scroll/filtr holati saqlanadi).
  const searchFor = (n: number): string => {
    const next = new URLSearchParams(params);
    if (n <= 1) next.delete('page');
    else next.set('page', String(n));
    return next.toString();
  };
  // Apple pager idiomasi: raqamlar oddiy matn, xrom faqat **joriy** sahifada.
  // Ilgari har bir raqam to'ldirma va chegara bilan chizilardi — bitta element ikki
  // marta ajratilgan, ya'ni "elevation bir marta e'lon qilinadi" qoidasiga zid.
  // Katak 44x44 (tegish maydonining pastki chegarasi), `tabular-nums` — raqam
  // almashganda kenglik sakramaydi.
  const CELL = 'inline-flex h-11 min-w-11 items-center justify-center rounded-full px-2 text-label tabular-nums';
  return (
    <nav className="mt-8 flex items-center justify-center gap-0.5">
      {withGaps.map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="inline-flex h-11 items-center justify-center px-1 text-label text-muted-3">…</span>
        ) : p === page ? (
          <span key={p} aria-current="page" className={`${CELL} bg-accent font-semibold text-bg`}>
            {p}
          </span>
        ) : (
          <Link
            key={p}
            to={{ search: searchFor(p) }}
            onClick={(e: { preventDefault: () => void }) => {
              e.preventDefault();
              onPage(p);
            }}
            className={`press ${CELL} text-muted hover:bg-fill-2 hover:text-primary`}
          >
            {p}
          </Link>
        ),
      )}
    </nav>
  );
};
export default Pagination;
