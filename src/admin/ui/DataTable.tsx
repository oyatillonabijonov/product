import type { ReactNode } from 'react';

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
  return Boolean(e.target.closest('button, a, select, input, label'));
}

/**
 * Jadval — `md`dan desktopda `<table>` (vertikal chiziqsiz, hover qator), pastda kartalar:
 * bitta ustun ta'rifi ikkala ko'rinishni beradi. Qator bosilsa `onRowClick`.
 */
export function DataTable<T>({ columns, rows, rowKey, onRowClick, empty }: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
}) {
  if (rows.length === 0) return <>{empty ?? null}</>;
  const clickable = onRowClick ? 'press-surface cursor-pointer hover:bg-fill-2' : '';
  const click = (row: T) => (onRowClick ? (e: React.SyntheticEvent<HTMLElement>) => { if (!fromControl(e)) onRowClick(row); } : undefined);
  const title = columns.find((c) => c.mobile === 'title');
  const rest = columns.filter((c) => c !== title && c.mobile !== 'hide');
  const align = (c: Column<T>) => (c.align === 'right' ? 'text-right' : '');
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-para">
          <thead>
            <tr className="border-b border-line text-left text-label text-muted-2">
              {columns.map((c) => (
                <th key={c.id} scope="col" className={`px-3 py-2.5 font-medium ${align(c)} ${c.className ?? ''}`}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={rowKey(r)} onClick={click(r)} className={`border-b border-line-3 last:border-0 ${clickable}`}>
                {columns.map((c) => (
                  <td key={c.id} className={`px-3 py-3 ${align(c)} ${c.className ?? ''}`}>{c.cell(r)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col gap-2 md:hidden">
        {rows.map((r) => (
          <li key={rowKey(r)} onClick={click(r)} className={`rounded-sm border border-line bg-surface p-4 ${clickable}`}>
            {title && <div className="mb-2 text-para font-medium text-primary">{title.cell(r)}</div>}
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-label">
              {rest.map((c) => (
                <div key={c.id} className="contents">
                  <dt className="text-muted-2">{c.label}</dt>
                  <dd className="text-primary">{c.cell(r)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
