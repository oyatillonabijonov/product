import { useEffect, useRef, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowDownRight, ArrowUpRight } from '@phosphor-icons/react';
import type { Icon as PhIcon } from '@phosphor-icons/react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { useTranslation } from 'react-i18next';
import type { Hue } from './controls';
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

/** Ikonka plitkasi — KPI va ro'yxat qatorlarida: 32px, hoshiyali; Phosphor yoki Hugeicons ikonkasini qabul qiladi. */
export const KpiTile: FC<{ icon: PhIcon | IconSvgElement }> = ({ icon }) => {
  const P = icon as PhIcon;
  return (
    <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-[10px] border border-border bg-surface-sunken text-text">
      {Array.isArray(icon) ? <HugeiconsIcon icon={icon as IconSvgElement} size={18} strokeWidth={1.5} /> : <P className="size-[18px]" />}
    </span>
  );
};

/**
 * KPI kartasi (hamma ekranda bitta): plitka + nom, katta son (sanaladi), o'zgarish belgisi va izohi (`trend`);
 * pastki tasmada qo'shimcha izoh va trend chizig'i. `hue` eski API uchun qoldi — ishlatilmaydi.
 */
export const Kpi: FC<{
  icon: PhIcon | IconSvgElement;
  hue?: Hue;
  label: string;
  value: number;
  format?: (n: number) => string;
  unit?: string;
  delta?: number | null;
  trend?: string;
  note?: ReactNode;
  spark?: number[];
  to?: string;
}> = ({ icon, label, value, format, unit, delta, trend, note, spark, to }) => {
  const hasSpark = spark !== undefined && spark.length > 1;
  const body = (
    <>
      <div className="flex flex-1 flex-col px-4 pb-5 pt-5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <KpiTile icon={icon} />
          <span className="min-w-0 flex-1 truncate text-base font-medium text-text">{label}</span>
          {to && <ArrowUpRight className="size-4 shrink-0 text-text-faint transition-transform max-sm:hidden duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />}
        </div>
        <div className="mt-5 flex items-baseline gap-1.5 whitespace-nowrap">
          <CountUp value={value} format={format} className="text-3xl font-semibold leading-10 text-text sm:text-4xl" />
          {unit && <span className="text-base font-medium text-text-muted">{unit}</span>}
        </div>
        {(delta !== undefined || trend) && (
          <div className="mt-2 flex h-5 items-center gap-2 text-sm text-text-muted">
            {delta !== undefined && <Delta value={delta} />}
            {trend && <span className="truncate">{trend}</span>}
          </div>
        )}
      </div>
      {(note || hasSpark) && (
        <div className="flex h-11 items-center justify-between gap-3 rounded-b-[15px] border-t border-border bg-surface-sunken px-4 sm:px-6">
          <span className="truncate text-sm text-text-muted">{note}</span>
          {hasSpark && <Sparkline values={spark} hue="violet" width={64} height={20} className="shrink-0" />}
        </div>
      )}
    </>
  );
  const cls = 'group flex min-w-0 flex-col rounded-surface border border-border bg-surface transition-colors duration-[175ms]';
  return to ? <Link to={to} className={`${cls} hover:border-border-strong`}>{body}</Link> : <div className={cls}>{body}</div>;
};

/** KPI'lar qatori — telefonda 1–2 ustun, keng ekranda bir qatorda; kartalar orasi 16px. */
export const KpiStrip: FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => (
  <section className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-4 ${className}`}>
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
