import type { FC, ReactNode } from 'react';
import { Link } from 'react-router';
import { ChevronLeft } from 'lucide-react';

/**
 * Sahifa: sarlavha chapda, amallar ("Saqlash") o'ngda; sarlavha yopishqoq — asosiy amal doim
 * ko'rinadi. Manfiy margin kontent maydonining padding'ini qoplaydi (fon uzilmasin).
 */
export const Page: FC<{ title: string; back?: string; description?: string; actions?: ReactNode; children: ReactNode }> = ({
  title, back, description, actions, children,
}) => (
  <div>
    <header className="sticky top-0 z-30 -mx-4 mb-6 bg-bg px-4 pb-4 pt-5 md:-mx-8 md:px-8 md:pt-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {back && (
            <Link to={back} className="press mb-1 inline-flex items-center gap-0.5 text-label text-cta">
              <ChevronLeft aria-hidden className="size-4" /> Orqaga
            </Link>
          )}
          <h1 className="truncate text-subhead font-semibold text-primary md:text-heading">{title}</h1>
          {description && <p className="mt-1 text-para text-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
    {children}
  </div>
);

/** Karta — yagona yuza: `surface` + hairline, soya yo'q. `padded={false}` — jadval/qatorlar chetgacha. */
export const Card: FC<{ title?: string; description?: string; actions?: ReactNode; padded?: boolean; className?: string; children: ReactNode }> = ({
  title, description, actions, padded = true, className = '', children,
}) => {
  const body = padded ? (title ? 'px-5 pb-5 pt-4' : 'p-5') : '';
  return (
    <section className={`rounded-sm border border-line bg-surface ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 px-5 pt-5">
          <div className="min-w-0">
            {title && <h2 className="text-copy font-semibold text-primary">{title}</h2>}
            {description && <p className="mt-0.5 text-label text-muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={body}>{children}</div>
    </section>
  );
};

/** Segment-kontrol (URL'ga bog'liq): konteyner 12px, ichki 8px — konsentrik. Mobilda yonga suriladi. */
export const Tabs: FC<{ items: { id: string; label: string; to: string }[]; active: string; className?: string }> = ({ items, active, className = '' }) => (
  <nav aria-label="Tablar" className={`no-scrollbar -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0 ${className}`}>
    <ul className="inline-flex gap-1 rounded-sm bg-fill-2 p-1">
      {items.map((it) => (
        <li key={it.id}>
          <Link
            to={it.to}
            aria-current={it.id === active ? 'page' : undefined}
            className={`press block h-9 whitespace-nowrap rounded-xs px-3.5 text-para leading-9 ${
              it.id === active ? 'bg-surface text-primary' : 'text-muted hover:text-primary'
            }`}
          >
            {it.label}
          </Link>
        </li>
      ))}
    </ul>
  </nav>
);

/** Bo'sh holat — bitta amal bilan ("Hali yangilik yo'q — Qo'shish"). */
export const EmptyState: FC<{ title: string; text?: string; action?: ReactNode }> = ({ title, text, action }) => (
  <div className="flex flex-col items-center gap-2 rounded-sm border border-dashed border-line px-6 py-12 text-center">
    <p className="text-copy font-semibold text-primary">{title}</p>
    {text && <p className="max-w-sm text-para text-muted">{text}</p>}
    {action && <div className="mt-3">{action}</div>}
  </div>
);

/** Yuklanish — skelet qatorlar ("Yuklanmoqda…" matni o'rniga). */
export const Skeleton: FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div aria-busy="true" aria-label="Yuklanmoqda" className="flex flex-col gap-3">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="h-11 animate-pulse rounded-xs bg-fill-2" />
    ))}
  </div>
);
