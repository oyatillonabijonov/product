import { createContext, useContext, useEffect } from 'react';
import type { FC, ReactNode } from 'react';
import { Link, useBlocker } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, CaretLeft, CaretRight } from '@phosphor-icons/react';
import type { Icon as PhIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { Button, IconTile, type Hue } from './controls';
import { useConfirm } from './confirm';

/** Qobiq sahifaga yo'l zanjirini beradi («Mahsulotlar › Turlar») — `Page` sarlavha ustida chizadi. */
export interface Crumb { label: string; to: string }
// react tipsiz — generik tushib qoladi, qiymat cast bilan.
export const CrumbsContext = createContext([] as Crumb[]);

/**
 * Sahifa sarlavhasi — kanvas ustida, yopishqoq: yuqorida yo'l zanjiri, nom (22/600), ostida izoh; o'ngda
 * amallar. Aylantirilganda orqasi xiralashadi (kontent ostidan o'tadi). Saqlanmagan o'zgarish bo'lsa ilova
 * ichidagi navigatsiya tasdiq so'raydi, tab yopilsa brauzer ogohlantiradi.
 */
export const Page: FC<{
  title: string;
  back?: string;
  description?: string;
  actions?: ReactNode;
  /** Saqlanmagan o'zgarish — ilova ichidagi navigatsiya tasdiq so'raydi. */
  dirty?: boolean;
  children: ReactNode;
}> = ({ title, back, description, actions, dirty, children }) => {
  const { t } = useTranslation('common');
  const confirm = useConfirm();
  const crumbs = (useContext(CrumbsContext) as Crumb[]).filter((c) => c.label !== title);
  // Saqlash/o'chirishdan keyingi dasturiy o'tish `state.leave` bilan belgilanadi — u bloklanmaydi.
  const blocker = useBlocker(({ nextLocation }) => {
    const st = nextLocation.state as { leave?: boolean } | null;
    return Boolean(dirty) && !st?.leave;
  });
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    confirm({ title: t('unsavedChanges.title'), message: t('unsavedChanges.message'), confirmLabel: t('unsavedChanges.leave'), destructive: true })
      .then((ok) => { if (ok) blocker.proceed(); else blocker.reset(); });
  }, [blocker.state]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  return (
    <div>
      <header className="sticky top-0 z-20 -mx-4 mb-7 bg-surface/85 px-4 pb-4 pt-5 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10 lg:pt-8">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            {(back || crumbs.length > 0) && (
              <nav aria-label={t('aria.breadcrumbs')} className="mb-1.5 flex min-w-0 items-center gap-1 text-sm text-text-muted">
                {back && (
                  <Link to={back} aria-label={t('back')} title={t('back')} className="-ml-1 mr-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-ghost-hover hover:text-text">
                    <ArrowLeft className="size-3.5" weight="bold" />
                  </Link>
                )}
                {crumbs.map((c, i) => (
                  <span key={c.to} className="flex min-w-0 items-center gap-1">
                    {i > 0 && <CaretRight aria-hidden className="size-3 shrink-0 text-text-faint" weight="bold" />}
                    <Link to={c.to} className="truncate transition-colors hover:text-text">{c.label}</Link>
                  </span>
                ))}
              </nav>
            )}
            <div className="flex min-w-0 items-center gap-2.5">
              <h1 className="truncate text-2xl font-bold text-text">{title}</h1>
              {dirty && <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-warning-soft px-2 py-0.5 text-sm font-medium text-warning-strong sm:inline-flex"><span className="size-1.5 rounded-full bg-warning" />{t('unsavedShort')}</span>}
            </div>
            {description && <p className="mt-1.5 max-w-3xl text-base text-text-muted">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>}
        </div>
      </header>
      {children}
    </div>
  );
};

/**
 * Karta — oq varaq ustida kulrang yuza (hoshiya va soyasiz), radius 18. Sarlavha qatori: ixtiyoriy rangli ikonka
 * plitkasi, nom va izoh, o'ngda amallar. `padded={false}` — jadval/ro'yxat chetgacha (sarlavha baribir ichkarida).
 * `filled` eski API uchun qoldi — endi oddiy karta bilan bir xil.
 */
export const Card: FC<{
  title?: string;
  description?: string;
  actions?: ReactNode;
  icon?: PhIcon;
  hue?: Hue;
  padded?: boolean;
  filled?: boolean;
  className?: string;
  children: ReactNode;
}> = ({ title, description, actions, icon, hue = 'slate', padded = true, className = '', children }) => {
  const head = (title || description || actions) ? (
    <div className={`flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-3 ${padded ? '' : 'px-6 pt-5'}`}>
      <div className="flex min-w-[min(100%,14rem)] flex-1 items-start gap-3">
        {icon && <IconTile icon={icon} hue={hue} soft />}
        <div className="min-w-0">
          {title && <h2 className="text-md font-bold text-text">{title}</h2>}
          {description && <p className="mt-0.5 text-sm leading-relaxed text-text-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  ) : null;
  return (
    <section className={`flex min-w-0 flex-col rounded-surface bg-surface-sunken ${padded ? 'gap-5 p-6' : 'gap-4 overflow-hidden'} ${className}`}>
      {head}
      {padded ? children : <div className="min-w-0">{children}</div>}
    </section>
  );
};

/** Faqat o'qiladigan kalit/qiymat ro'yxati — chap yorliq, o'ng qiymat, orasida nuqtali chiziq emas, hairline. */
export const Rows: FC<{ rows: { k: string; v: ReactNode }[] }> = ({ rows }) => (
  <dl className="flex flex-col">
    {rows.map((r, i) => (
      <div key={`${i}-${r.k}`} className="flex items-baseline justify-between gap-6 border-b border-border py-3 text-base first:pt-0 last:border-b-0 last:pb-0">
        <dt className="shrink-0 text-text-muted">{r.k}</dt>
        <dd className="min-w-0 break-words text-right font-medium text-text">{r.v}</dd>
      </div>
    ))}
  </dl>
);

/** Filtr-tablar (URL'ga bog'liq): kulrang trek, faol tab oq tabletka — silliq suriladi. */
export const Tabs: FC<{ items: { id: string; label: string; to: string; count?: number }[]; active: string; className?: string }> = ({ items, active, className = '' }) => {
  const { t } = useTranslation('common');
  return (
    <nav aria-label={t('aria.tabs')} className={`no-scrollbar -mx-4 max-w-[calc(100%+2rem)] overflow-x-auto px-4 sm:mx-0 sm:max-w-full sm:px-0 ${className}`}>
      <ul className="inline-flex gap-0.5 rounded-full bg-surface-sunken p-[3px]">
        {items.map((it) => {
          const on = it.id === active;
          return (
            <li key={it.id}>
              <Link
                to={it.to}
                aria-current={on ? 'page' : undefined}
                className={`relative isolate flex h-[30px] items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-base font-medium transition-colors duration-200 ${on ? 'text-text' : 'text-text-muted hover:text-text'}`}
              >
                {on && <motion.span layoutId="tabs-pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} className="absolute inset-0 -z-10 rounded-full bg-elevated" />}
                {it.label}
                {it.count !== undefined && <span className="tabular-nums text-text-faint">{it.count}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

/** Bo'sh holat: ikonka plitkasi, nima yo'qligi, nima qilish kerakligi, bitta amal. */
export const EmptyState: FC<{ title: string; text?: string; action?: ReactNode; icon?: ReactNode }> = ({ title, text, action, icon }) => (
  <div className="flex animate-fade-in flex-col items-center gap-2 rounded-surface bg-surface-sunken px-6 py-16 text-center">
    {icon && <div className="mb-2 text-text-faint [&_svg]:size-8">{icon}</div>}
    <p className="text-md font-semibold text-text">{title}</p>
    {text && <p className="max-w-sm text-base text-text-muted">{text}</p>}
    {action && <div className="mt-3">{action}</div>}
  </div>
);

/** Yuklanish — yaltiraydigan skelet qatorlar (faqat birinchi yuklanishda). */
export const Skeleton: FC<{ rows?: number; className?: string }> = ({ rows = 5, className = '' }) => {
  const { t } = useTranslation('common');
  return (
    <div aria-busy="true" aria-label={t('aria.loading')} className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton h-11 rounded-control" style={{ opacity: 1 - i * 0.12 }} />
      ))}
    </div>
  );
};

/** Sahifalash: chapda «Jami N ta», o'ngda [‹] 2 / 5 [›]. Bitta sahifa bo'lsa chizilmaydi. */
export const Pagination: FC<{ page: number; pageCount: number; onChange: (page: number) => void; total?: number }> = ({ page, pageCount, onChange, total }) => {
  const { t } = useTranslation('common');
  if (pageCount <= 1) return null;
  return (
    <nav aria-label={t('aria.pagination')} className="flex items-center justify-between gap-4 px-1 pt-4">
      <span className="text-sm tabular-nums text-text-muted">{total !== undefined ? t('totalCount', { count: total }) : ''}</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" ariaLabel={t('aria.prevPage')} disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <CaretLeft weight="bold" />
          <span className="max-sm:hidden">{t('prev')}</span>
        </Button>
        <span className="min-w-14 text-center text-sm tabular-nums text-text">{page} / {pageCount}</span>
        <Button variant="outline" size="sm" ariaLabel={t('aria.nextPage')} disabled={page >= pageCount} onClick={() => onChange(page + 1)}>
          <span className="max-sm:hidden">{t('next')}</span>
          <CaretRight weight="bold" />
        </Button>
      </div>
    </nav>
  );
};
