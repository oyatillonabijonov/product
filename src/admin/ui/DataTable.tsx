import type { ReactNode } from 'react';
import { CaretRight } from '../icons';

export interface Column<T> {
  id: string;
  label: string;
  cell: (row: T) => ReactNode;
  /** Ustun klassi (masalan `w-14`). */
  className?: string;
  align?: 'left' | 'right';
  /** Mobil kartada: `title` — sarlavha qatori, `hide` — chiqmaydi, sukut — "yorliq: qiymat". */
  mobile?: 'title' | 'hide';
}

/** Qator ichidagi boshqaruv (toggle, select, havola) bosilganda qator navigatsiyasi ishlamasin. */
function fromControl(e: React.SyntheticEvent<HTMLElement>): boolean {
  return Boolean(e.target.closest('button, a, select, input, textarea, label'));
}

/**
 * Jadval — Astryx `Table`: karta ramkasida (yuza + hoshiya, radius 16), sarlavha 14/600 ikkilamchi rangda, qatorlar
 * orasida faqat gorizontal chiziq, hover'da `background-muted`, qator bosiladi. <1024px jadval yo'q — xuddi shu
 * ramkadagi ro'yxat: sarlavha ustuni, ostida «yorliq: qiymat». Bitta ustun ta'rifi ikkalasini beradi.
 */
export function DataTable<T>({ columns, rows, rowKey, onRowClick, empty }: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
}) {
  if (rows.length === 0) return <>{empty ?? null}</>;
  const click = (row: T) => (onRowClick ? (e: React.SyntheticEvent<HTMLElement>) => { if (!fromControl(e)) onRowClick(row); } : undefined);
  // Klaviatura: Enter/Space qatorni ochadi (Tab bilan yetiladi); ichki boshqaruvda bosilsa emas.
  const keydown = (row: T) =>
    onRowClick
      ? (e: React.KeyboardEvent<HTMLElement>) => {
          if ((e.key === 'Enter' || e.key === ' ') && !fromControl(e)) { e.preventDefault(); onRowClick(row); }
        }
      : undefined;
  const title = columns.find((c) => c.mobile === 'title');
  const rest = columns.filter((c) => c !== title && c.mobile !== 'hide');
  const align = (c: Column<T>) => (c.align === 'right' ? 'text-right' : '');
  return (
    <>
      <div className="no-scrollbar hidden overflow-x-auto rounded-surface border border-border bg-surface lg:block">
        <table className="w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.id}
                  scope="col"
                  className={`h-10 whitespace-nowrap border-b border-border px-4 text-base font-semibold text-text-muted ${align(c)} ${c.className ?? ''}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={rowKey(r)}
                onClick={click(r)}
                onKeyDown={keydown(r)}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : undefined}
                className={`group text-base text-text animate-fade-in ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((c) => (
                  <td key={c.id} className={`h-14 border-b border-border px-4 py-2 transition-colors duration-[175ms] group-last:border-b-0 group-hover:bg-surface-sunken ${align(c)} ${c.className ?? ''}`}>{c.cell(r)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="overflow-hidden rounded-surface border border-border bg-surface lg:hidden">
        {rows.map((r) => (
          <li
            key={rowKey(r)}
            onClick={click(r)}
            onKeyDown={keydown(r)}
            tabIndex={onRowClick ? 0 : undefined}
            className={`flex items-center gap-3 border-b border-border px-4 py-3.5 last:border-b-0 ${onRowClick ? 'cursor-pointer active:bg-surface-sunken' : ''}`}
          >
            <div className="min-w-0 flex-1">
              {title && <div className="truncate text-base font-medium text-text">{title.cell(r)}</div>}
              {rest.length > 0 && (
                <dl className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
                  {rest.map((c) => (
                    <div key={c.id} className="flex min-w-0 items-center gap-1">
                      <dt className="whitespace-nowrap text-text-faint">{c.label}:</dt>
                      <dd className="min-w-0 tabular-nums">{c.cell(r)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
            {onRowClick && <CaretRight aria-hidden className="size-4 shrink-0 text-text-faint" />}
          </li>
        ))}
      </ul>
    </>
  );
}
