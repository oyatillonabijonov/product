import { useEffect, useRef, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowDownRight, ArrowUpRight, CaretRight } from '@phosphor-icons/react';
import type { Icon as PhIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { IconTile, type Hue } from './controls';
import { Sparkline } from '../charts';

/** Raqam 0 dan qiymatgacha yumshoq sanaladi (≈0.7 s, ease-out); qiymat o'zgarsa eski joyidan davom etadi. */
export function useCountUp(value: number, ms = 700): number {
  const [shown, setShown] = useState(value);
  const from = useRef(0) as { current: number };
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); from.current = value; return; }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      setShown(a + (value - a) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return shown as number;
}

/** Sanaladigan son; `format` — tayyor matn (so'm, foiz). */
export const CountUp: FC<{ value: number; format?: (n: number) => string; className?: string }> = ({ value, format, className = '' }) => {
  const n = useCountUp(value);
  return <span className={`tabular-nums ${className}`}>{format ? format(n) : Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ')}</span>;
};

/** O'zgarish foizi: oldingi davr bilan. Oldingisi 0 bo'lsa — `null` (cheksiz o'sishni ko'rsatmaymiz). */
export function pctChange(cur: number, prev: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null;
  return ((cur - prev) / prev) * 100;
}

/** O'sish/tushish belgisi: «↗ +8,2%» yashil, «↘ −3,1%» qizil, 0 — neytral. `inverse` — kamayish yaxshi bo'lsa. */
export const Delta: FC<{ value: number | null; inverse?: boolean; className?: string }> = ({ value, inverse, className = '' }) => {
  const { t } = useTranslation('common');
  if (value === null) return <span className={`inline-flex h-5 items-center rounded-full bg-info-soft px-2 text-xs font-medium text-info-strong ${className}`}>{t('deltaNew')}</span>;
  const r = Math.round(value * 10) / 10;
  const good = inverse ? r < 0 : r > 0;
  const tone = r === 0 ? 'bg-neutral text-text' : good ? 'bg-success-soft text-success-strong' : 'bg-danger-soft text-danger-strong';
  const I = r >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex h-5 items-center gap-0.5 rounded-full px-2 text-xs font-medium tabular-nums ${tone} ${className}`}>
      {r !== 0 && <I weight="bold" className="size-3" />}
      {r > 0 ? '+' : ''}{r.toString().replace('.', ',')}%
    </span>
  );
};

/**
 * KPI katagi (referens №1): rangli ikonka plitkasi + nom, katta son (sanaladi), o'sish belgisi, ostida izoh
 * va ixtiyoriy trend chizig'i. `KpiStrip` ichida kataklar orasida vertikal chiziq bo'ladi.
 */
export const Kpi: FC<{
  icon: PhIcon;
  hue: Hue;
  label: string;
  value: number;
  format?: (n: number) => string;
  unit?: string;
  delta?: number | null;
  note?: ReactNode;
  spark?: number[];
  to?: string;
}> = ({ icon, hue, label, value, format, unit, delta, note, spark, to }) => {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2.5">
          <IconTile icon={icon} hue={hue} size="sm" />
          <span className="truncate text-base font-medium text-text-muted">{label}</span>
        </span>
        {to && <CaretRight weight="bold" className="size-3.5 shrink-0 text-text-faint transition-transform duration-200 group-hover:translate-x-0.5" />}
      </div>
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5">
        <div className="flex min-w-0 items-baseline gap-1.5 whitespace-nowrap">
          <CountUp value={value} format={format} className="text-3xl font-semibold text-text" />
          {unit && <span className="text-base font-medium text-text-muted">{unit}</span>}
        </div>
        {delta !== undefined && <Delta value={delta} />}
      </div>
      {spark && spark.length > 1 && <Sparkline values={spark} hue="violet" width={240} height={34} className="mt-3 h-[34px] w-full" />}
      {note && <p className="mt-2 truncate text-sm text-text-muted">{note}</p>}
    </>
  );
  const cls = 'group block min-w-0 rounded-surface border border-border bg-surface p-5 transition-colors duration-[175ms]';
  return to ? <Link to={to} className={`${cls} hover:bg-ghost-hover`}>{body}</Link> : <div className={cls}>{body}</div>;
};

/** KPI'lar qatori — Astryx kartalari (yuza + hoshiya), telefonda 1–2 ustun, keng ekranda bir qatorda. */
export const KpiStrip: FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => (
  <section className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-4 ${className}`}>
    {children}
  </section>
);

/** Ingichka progress chizig'i (katalog to'liqligi, maqsad). */
/** `hue` eski API uchun qoldi — Astryx progress chizig'i doim urg'u rangida. */
export const Meter: FC<{ value: number; max: number; hue?: Hue; className?: string }> = ({ value, max, className = '' }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-track ${className}`}>
      <div className={`h-full rounded-full bg-accent transition-[width] duration-700 ease-standard`} style={{ width: `${pct}%` }} />
    </div>
  );
};
