import type { FC } from 'react';
import { PAGE_SIZE } from '../../app/lib/catalog';

const Pagination: FC<{ page: number; total: number; onPage: (n: number) => void }> = ({ page, total, onPage }) => {
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
  return (
    <nav className="flex items-center justify-center gap-1.5 mt-8">
      {withGaps.map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-2 text-[#86868B]">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPage(p)}
            disabled={p === page}
            className={`min-w-9 h-9 px-2 rounded-full text-[14px] font-semibold transition-colors ${
              p === page ? 'bg-[#0071E3] text-white' : 'bg-white border border-[#D2D2D7] hover:border-[#0071E3]'
            }`}
          >
            {p}
          </button>
        ),
      )}
    </nav>
  );
};
export default Pagination;
