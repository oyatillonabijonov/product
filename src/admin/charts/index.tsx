import type { FC } from 'react';
import i18n from 'i18next';
import { HUE_DOT, type Hue } from '../ui/controls';
import { EChartsAreaChart } from '../evilcharts/charts/echarts-area-chart';
import { EChartsBarChart } from '../evilcharts/charts/echarts-bar-chart';
import { EChartsPieChart } from '../evilcharts/charts/echarts-pie-chart';
import { EChartsRadialChart } from '../evilcharts/charts/echarts-radial-chart';
import type { ChartConfig } from '../evilcharts/ui/echarts-chart';

/**
 * Admin grafiklari — **EvilCharts** (ECharts komponentlari, `src/admin/evilcharts/`, MIT) ustida yupqa o'ramlar:
 * ekranlar oddiy massiv beradi, o'ram EvilCharts'ning `data` + `config` shakliga o'giradi. Ranglar CSS
 * tokenlaridan (`var(--color-c-*)` — qorong'i rejimda o'zi almashadi). Kutubxonasiz yengillari: `Sparkline`,
 * `SegmentBar`, `ChartLegend`. Qoidalar: bitta y-o'q, ≥2 seriyada legenda, hover'da tooltip.
 */

type Fmt = (n: number) => string;
const plain: Fmt = (n) => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ');
/** ECharts canvas matni ham admin shriftida bo'lsin. */
const FONT_OPTS = { textStyle: { fontFamily: '"Medeo Sans", system-ui, sans-serif' } };
const colorsOf = (hue: Hue) => ({ light: [`var(--color-c-${hue})`], dark: [`var(--color-c-${hue})`] });

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

/** Vaqt bo'yicha o'zgarish — EvilCharts Area (gradient yoki nuqtali to'ldirma), bitta y-o'q. */
export const AreaChart: FC<{
  labels: string[];
  series: { name: string; values: number[]; hue: Hue; variant?: 'gradient' | 'dotted' | 'hatched' | 'solid' }[];
  height?: number;
  legend?: boolean;
}> = ({ labels, series, height = 260, legend = true }) => {
  const data = labels.map((label, i) => ({ label, ...Object.fromEntries(series.map((s, k) => [`s${k}`, s.values[i] ?? 0])) }));
  const config = Object.fromEntries(series.map((s, k) => [`s${k}`, { label: s.name, colors: colorsOf(s.hue) }])) as ChartConfig;
  return (
    <div style={{ height }} className="w-full">
      <EChartsAreaChart data={data} config={config} xDataKey="label" className="h-full w-full" chartOptions={FONT_OPTS}>
        <EChartsAreaChart.Grid />
        <EChartsAreaChart.XAxis dataKey="label" />
        <EChartsAreaChart.YAxis tickFormatter={(v: number) => compact(v)} />
        {legend && series.length > 1 && <EChartsAreaChart.Legend variant="rounded-square" align="left" verticalAlign="top" isClickable />}
        <EChartsAreaChart.Tooltip roundness="lg" />
        {series.map((s, k) => (
          <EChartsAreaChart.Area key={k} dataKey={`s${k}`} variant={s.variant ?? 'gradient'} isClickable>
            <EChartsAreaChart.ActiveDot variant="colored-border" />
          </EChartsAreaChart.Area>
        ))}
      </EChartsAreaChart>
    </div>
  );
};

/** Toifalar bo'yicha kattalik — EvilCharts Bar. `buffer` — oxirgi ustun shtrixli (bugun hali tugamagan). */
export const BarChart: FC<{
  labels: string[];
  values: number[];
  hue?: Hue;
  name: string;
  height?: number;
  highlightMax?: boolean;
  buffer?: boolean;
  variant?: 'default' | 'gradient' | 'duotone' | 'hatched';
  horizontal?: boolean;
}> = ({ labels, values, hue = 'violet', name, height = 220, highlightMax, buffer, variant = 'default', horizontal }) => {
  const data = labels.map((label, i) => ({ label, v: values[i] ?? 0 }));
  const config = { v: { label: name, colors: colorsOf(hue as Hue) } } as ChartConfig;
  return (
    <div style={{ height }} className="w-full">
      <EChartsBarChart
        data={data} config={config} xDataKey="label" className="h-full w-full" chartOptions={FONT_OPTS}
        enableMaxValueHighlight={highlightMax} layout={horizontal ? 'horizontal' : 'vertical'} barRadius={6}
      >
        <EChartsBarChart.Grid />
        {horizontal ? <EChartsBarChart.YAxis dataKey="label" /> : <EChartsBarChart.XAxis dataKey="label" />}
        <EChartsBarChart.Tooltip roundness="lg" />
        <EChartsBarChart.Bar dataKey="v" variant={variant} bufferBar={buffer} enableHoverHighlight />
      </EChartsBarChart>
    </div>
  );
};

/** Ikki davrni taqqoslash — EvilCharts guruhlangan Bar: joriy davr to'liq, oldingisi shtrixli. */
export const CompareBarChart: FC<{
  labels: string[];
  current: number[];
  previous: number[];
  currentLabel: string;
  previousLabel: string;
  hue?: Hue;
  height?: number;
}> = ({ labels, current, previous, currentLabel, previousLabel, hue = 'violet', height = 230 }) => {
  const data = labels.map((label, i) => ({ label, cur: current[i] ?? 0, prev: previous[i] ?? 0 }));
  const config = {
    cur: { label: currentLabel, colors: colorsOf(hue as Hue) },
    prev: { label: previousLabel, colors: colorsOf('slate') },
  } as ChartConfig;
  return (
    <div style={{ height }} className="w-full">
      <EChartsBarChart data={data} config={config} xDataKey="label" className="h-full w-full" chartOptions={FONT_OPTS} barRadius={6}>
        <EChartsBarChart.Grid />
        <EChartsBarChart.XAxis dataKey="label" />
        <EChartsBarChart.Legend variant="rounded-square" align="left" verticalAlign="top" />
        <EChartsBarChart.Tooltip roundness="lg" />
        <EChartsBarChart.Bar dataKey="cur" variant="default" enableHoverHighlight />
        <EChartsBarChart.Bar dataKey="prev" variant="hatched" enableHoverHighlight />
      </EChartsBarChart>
    </div>
  );
};

/** Ulush — EvilCharts Pie (donut, yumaloq bo'laklar orasida oraliq). Markazda jami — HTML. */
export const DonutChart: FC<{
  items: { name: string; value: number; hue: Hue }[];
  center?: { value: string; label: string };
  size?: number;
}> = ({ items, center, size = 180 }) => {
  const data = items.map((it, i) => ({ key: `k${i}`, value: it.value }));
  const config = Object.fromEntries(items.map((it, i) => [`k${i}`, { label: it.name, colors: colorsOf(it.hue) }])) as ChartConfig;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <EChartsPieChart data={data} dataKey="value" nameKey="key" config={config} className="h-full w-full" chartOptions={FONT_OPTS}>
        <EChartsPieChart.Tooltip roundness="lg" />
        <EChartsPieChart.Pie innerRadius="68%" outerRadius="96%" cornerRadius={6} paddingAngle={3} isClickable />
      </EChartsPieChart>
      {center && (
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <span className="text-2xl font-bold tabular-nums text-text">{center.value}</span>
          <span className="text-sm text-text-muted">{center.label}</span>
        </div>
      )}
    </div>
  );
};

/** Halqali ko'rsatkich — EvilCharts Radial: har qator alohida halqa (`max` bilan o'lchanadi). */
export const RadialChart: FC<{
  items: { name: string; value: number; hue: Hue }[];
  max?: number;
  size?: number;
  variant?: 'full' | 'semi';
}> = ({ items, max, size = 200, variant = 'full' }) => {
  const data = items.map((it, i) => ({ key: `k${i}`, value: it.value }));
  const config = Object.fromEntries(items.map((it, i) => [`k${i}`, { label: it.name, colors: colorsOf(it.hue) }])) as ChartConfig;
  return (
    <div className="relative shrink-0" style={{ width: size, height: variant === 'semi' ? size * 0.62 : size }}>
      <EChartsRadialChart data={data} nameKey="key" config={config} className="h-full w-full" max={max} variant={variant as 'full' | 'semi'} chartOptions={FONT_OPTS}>
        <EChartsRadialChart.Tooltip roundness="lg" />
        <EChartsRadialChart.RadialBar dataKey="value" isClickable />
      </EChartsRadialChart>
    </div>
  );
};

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

/** Ulushlar chizig'i: bo'laklar orasida 3px oraliq, ostida legenda foiz bilan. */
export const SegmentBar: FC<{ items: { label: string; value: number; hue: Hue }[]; showLegend?: boolean }> = ({ items, showLegend = true }) => {
  const total = items.reduce((s, i) => s + i.value, 0);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-2.5 gap-[3px] overflow-hidden rounded-full">
        {total === 0
          ? <span className="flex-1 rounded-full bg-surface-sunken" />
          : items.filter((i) => i.value > 0).map((i) => (
            <span key={i.label} title={`${i.label}: ${i.value}`} className={`h-full rounded-full transition-[flex-grow] duration-700 ease-standard ${HUE_DOT[i.hue]}`} style={{ flexGrow: i.value, flexBasis: 0 }} />
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
