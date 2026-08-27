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
  return (
    <nav className="flex items-center justify-center gap-1.5 mt-8">
      {withGaps.map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-2 text-muted-2">…</span>
        ) : p === page ? (
          <span
            key={p}
            aria-current="page"
            className="min-w-9 h-9 px-2 rounded-full text-[14px] font-semibold bg-accent text-bg inline-flex items-center justify-center"
          >
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
            className="min-w-9 h-9 px-2 rounded-full text-[14px] font-semibold transition-colors bg-surface border border-line hover:border-accent inline-flex items-center justify-center"
          >
            {p}
          </Link>
        ),
      )}
    </nav>
  );
};
export default Pagination;
