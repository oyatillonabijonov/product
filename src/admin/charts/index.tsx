import type { FC } from 'react';
import i18n from 'i18next';
import { HUE_DOT, type Hue } from '../ui/controls';

/**
 * Admin grafiklarining yengil qismi (kutubxonasiz): `Sparkline` (KPI trend chizig'i), `SegmentBar` (ingichka ulush
 * chizig'i), `ChartLegend`, `compact`. Katta vizuallar — `./viz` (ustunlar, halqa, pog'ona, soatlar tasmasi).
 * Ranglar CSS tokenlaridan (`c-*` — qorong'i rejimda o'zi almashadi); matn — matn tokenlarida.
 */

type Fmt = (n: number) => string;
const plain: Fmt = (n) => Math.round(n).toLocaleString('ru-RU').replace(/\s/g, ' ');

/** Legenda: rang belgisi + nom (+ qiymat). Matn — matn tokeni, seriya rangi faqat belgida. */
export const ChartLegend: FC<{ items: { label: string; hue: Hue; value?: string }[]; className?: string }> = ({ items, className = '' }) => (
  <ul className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-text-muted ${className}`}>
    {items.map((it) => (
      <li key={it.label} className="flex items-center gap-1.5">
        <span aria-hidden className={`size-2.5 rounded-[3px] ${HUE_DOT[it.hue]}`} />
        {it.label}
        {it.value && <span className="font-semibold tabular-nums text-text">{it.value}</span>}
      </li>
    ))}
  </ul>
);

/** Kichik trend chizig'i (KPI kartasida) — SVG, kutubxonasiz. */
export const Sparkline: FC<{ values: number[]; hue?: Hue; width?: number; height?: number; className?: string }> = ({
  values, hue = 'violet', width = 96, height = 32, className = '',
}) => {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * width, height - 3 - ((v - min) / span) * (height - 6)]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const id = `sp-${hue}-${values.length}-${Math.round(max)}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} preserveAspectRatio="none" className={`overflow-visible ${className}`} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`var(--color-c-${hue})`} stopOpacity="0.28" />
          <stop offset="100%" stopColor={`var(--color-c-${hue})`} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${width} ${height} L0 ${height} Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={`var(--color-c-${hue})`} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

/** Ingichka ulush chizig'i (qator ichida): bo'laklar orasida 2px oraliq, ostida ixtiyoriy legenda foiz bilan. */
export const SegmentBar: FC<{ items: { label: string; value: number; hue: Hue }[]; showLegend?: boolean }> = ({ items, showLegend = true }) => {
  const total = items.reduce((s, i) => s + i.value, 0);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
        {total === 0
          ? <span className="flex-1 bg-surface-sunken" />
          : items.filter((i) => i.value > 0).map((i) => (
            <span key={i.label} title={`${i.label}: ${i.value}`} className={`h-full min-w-1 rounded-[2px] transition-[flex-grow] duration-700 ease-standard ${HUE_DOT[i.hue]}`} style={{ flexGrow: i.value, flexBasis: 0 }} />
          ))}
      </div>
      {showLegend && (
        <ChartLegend items={items.map((i) => ({ label: i.label, hue: i.hue, value: total ? `${Math.round((i.value / total) * 100)}%` : '0%' }))} />
      )}
    </div>
  );
};

/** Katta sonni qisqartirish: 1 250 000 → 1,3 mln; o'q yorliqlari uchun. */
export function compact(n: number): string {
  const ru = i18n.language === 'ru';
  const a = Math.abs(n);
  const one = (x: number) => x.toFixed(1).replace('.', ',').replace(/,0$/, '');
  if (a >= 1e9) return `${one(n / 1e9)} ${ru ? 'млрд' : 'mlrd'}`;
  if (a >= 1e6) return `${one(n / 1e6)} ${ru ? 'млн' : 'mln'}`;
  if (a >= 1e4) return `${Math.round(n / 1e3)} ${ru ? 'тыс' : 'ming'}`;
  return plain(n);
}
