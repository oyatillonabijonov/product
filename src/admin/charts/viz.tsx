import { useEffect, useId, useRef, useState } from 'react';
import type { FC, ReactNode } from 'react';

/**
 * Dashboard vizuallari — kutubxonasiz SVG/HTML (egasining referenslari, 2026-11-21): ustunlar + chiziq
 * (`ColumnsChart`), bo'lakli halqa (`RingBreakdown`), pog'onali ustunlar (`StepColumns`), soatlar tasmasi
 * (`HourStrip`), ulush tasmasi (`SplitBand`). Hammasi bitta o'lchovda: 24px karta ichi, 2px bo'lak oralig'i,
 * raqamlar `tabular-nums`, matn — matn tokenlarida, rang faqat belgida. Ranglar `c-*` tokenlaridan
 * (binafsha + siyoh), holat halqasi — Astryx holat ranglari (Badge bilan bir xil).
 */

export const VIOLET = 'var(--color-c-violet)';
export const INK = 'var(--color-c-orange)';
export const LILAC = 'var(--color-c-blue)';
/** Rangning shaffof tusi — to'ldirma va kuchsiz ustunlar uchun (har ikki mavzuda yuza ustida ishlaydi). */
export const tint = (pct: number, color = VIOLET) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;
const fmt = (n: number) => Math.round(n).toLocaleString('ru-RU').replace(/\s/g, ' ');
const pctOf = (v: number, total: number) => (total > 0 ? `${Math.round((v / total) * 100)}%` : '0%');

/** Konteyner enini kuzatadi — SVG aniq pikselda chiziladi (matn cho'zilmaydi). */
function useWidth(): [{ current: HTMLDivElement | null }, number] {
  const ref = useRef(null) as { current: HTMLDivElement | null };
  const [raw, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, raw as number];
}

/** O'q shkalasi: 1/2/5×10ⁿ qadam, butun sonlar (sanoqlar uchun). */
export function niceScale(max: number, ticks = 4): { top: number; step: number } {
  if (max <= 0) return { top: ticks, step: 1 };
  const raw = max / ticks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const m = raw / pow;
  const step = Math.max(1, (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * pow);
  return { top: step * Math.ceil(max / step), step };
}

/** Legenda belgisi + nom; `line` — chiziq seriyasi. */
export const Key: FC<{ color: string; label: string; line?: boolean }> = ({ color, label, line }) => (
  <span className="flex items-center gap-1.5 text-sm text-text-muted">
    <span aria-hidden className={line ? 'h-0.5 w-3 rounded-full' : 'size-2.5 rounded-[3px]'} style={{ background: color }} />
    {label}
  </span>
);

/**
 * Ustunlar (+ ixtiyoriy chiziq, bitta o'qda). Sukutda eng baland nuqta ajratilgan va ustida qiymat belgisi;
 * sichqoncha ustunga kelsa — o'sha kun ajraladi va ikkala seriya qiymati ko'rinadi. `mutedBefore` — shu
 * indeksgacha ma'lumot yo'q (sanalmagan kunlar): shtrixlangan.
 */
export const ColumnsChart: FC<{
  labels: string[];
  bars: number[];
  barName: string;
  line?: number[];
  lineName?: string;
  height?: number;
  mutedBefore?: number;
  /** Qiymat matni (belgi va oyna) va o'q yorlig'i — sukutda oddiy son. */
  format?: (n: number) => string;
  axisFormat?: (n: number) => string;
}> = ({ labels, bars, barName, line, lineName, height = 280, mutedBefore = 0, format = fmt, axisFormat = fmt }) => {
  const [ref, w] = useWidth();
  const [rawHover, setHover] = useState(-1);
  const hover = rawHover as number;
  const hatch = useId();
  const n = bars.length;
  const lead = line ?? bars;
  const peak = lead.reduce((bi, v, i) => (v > lead[bi] ? i : bi), 0);
  const active = hover >= 0 ? hover : (lead[peak] ?? 0) > 0 ? peak : -1;

  const { top, step: tick } = niceScale(Math.max(0, ...bars, ...(line ?? [])));
  const padL = 16 + 7 * Math.max(3, axisFormat(top).length), padR = 24, padT = 34, padB = 30;
  const plotW = Math.max(0, w - padL - padR);
  const plotH = height - padT - padB;
  const stepX = n ? plotW / n : 0;
  const barW = Math.min(40, Math.max(3, stepX * 0.64));
  const x = (i: number) => padL + stepX * (i + 0.5);
  const y = (v: number) => padT + plotH * (1 - v / top);
  const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(plotW / 62))));

  const barPath = (i: number) => {
    const v = bars[i] ?? 0;
    if (v <= 0) return '';
    const yb = padT + plotH;
    const yt = Math.min(y(v), yb - 2);
    const x0 = x(i) - barW / 2, x1 = x(i) + barW / 2;
    const r = Math.min(5, barW / 2, yb - yt);
    return `M${x0} ${yb}V${yt + r}Q${x0} ${yt} ${x0 + r} ${yt}H${x1 - r}Q${x1} ${yt} ${x1} ${yt + r}V${yb}Z`;
  };
  const linePath = line ? line.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('') : '';
  const anchorY = active < 0 ? 0 : y(line ? line[active] ?? 0 : bars[active] ?? 0);
  const ax = active < 0 ? 0 : x(active);
  const shift = ax < 76 ? '-18%' : ax > w - 76 ? '-82%' : '-50%';

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }} onMouseLeave={() => setHover(-1)}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label={lineName ? `${barName}, ${lineName}` : barName}>
          <defs>
            <pattern id={hatch} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" strokeWidth="1.5" className="stroke-border-strong" />
            </pattern>
          </defs>
          {Array.from({ length: Math.round(top / tick) + 1 }, (_, k) => k * tick).map((v) => (
            <g key={v}>
              <line x1={padL} x2={w - padR} y1={y(v)} y2={y(v)} className={v === 0 ? 'stroke-border-strong' : 'stroke-border'} strokeDasharray={v === 0 ? undefined : '2 5'} />
              <text x={padL - 12} y={y(v) + 4} textAnchor="end" className="fill-text-faint text-xs tabular-nums">{axisFormat(v)}</text>
            </g>
          ))}
          {mutedBefore > 0 && <rect x={padL} y={padT} width={stepX * Math.min(n, mutedBefore)} height={plotH} fill={`url(#${hatch})`} opacity="0.55" />}
          {bars.map((_, i) => (
            <path
              key={i} d={barPath(i)} className="viz-rise"
              style={{ fill: i === active ? VIOLET : tint(line ? 22 : 26), transition: 'fill 140ms', animationDelay: `${Math.min(i * 14, 420)}ms` }}
            />
          ))}
          {line && <path d={linePath} fill="none" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" pathLength={1} className="viz-draw stroke-text" />}
          {line && n <= 16 && line.map((v, i) => i !== active && <circle key={i} cx={x(i)} cy={y(v)} r="3" strokeWidth="2" className="fill-surface stroke-text" />)}
          {line && active >= 0 && <circle cx={ax} cy={anchorY} r="5" strokeWidth="2.5" className="fill-surface stroke-text" />}
          {labels.map((l, i) => (n - 1 - i) % every === 0 && (
            <text key={i} x={x(i)} y={height - 8} textAnchor="middle" className={`text-xs tabular-nums ${i === active ? 'fill-text font-semibold' : 'fill-text-faint'}`}>{l}</text>
          ))}
          {bars.map((_, i) => (
            <rect key={i} x={padL + stepX * i} y={padT} width={stepX} height={plotH} fill="transparent" onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
          ))}
        </svg>
      )}
      {active >= 0 && w > 0 && (hover >= 0 ? (
        <div
          className="pointer-events-none absolute z-10 min-w-[136px] rounded-control border border-border bg-surface-raised px-3 py-2 shadow-med"
          style={{ left: ax, top: Math.max(0, anchorY - 12), transform: `translate(${shift}, -100%)` }}
        >
          <p className="text-xs text-text-muted tabular-nums">{labels[active]}</p>
          <p className="mt-1 flex items-center justify-between gap-4 text-sm"><Key color={VIOLET} label={barName} /><b className="font-semibold tabular-nums text-text">{format(bars[active] ?? 0)}</b></p>
          {line && lineName && <p className="mt-0.5 flex items-center justify-between gap-4 text-sm"><Key color="var(--color-text)" label={lineName} line /><b className="font-semibold tabular-nums text-text">{format(line[active] ?? 0)}</b></p>}
        </div>
      ) : (
        <span
          className="pointer-events-none absolute z-10 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold tabular-nums text-text-on-primary"
          style={{ left: ax, top: anchorY - 12, transform: `translate(${shift}, -100%)` }}
        >
          {format(lead[active] ?? 0)}
        </span>
      ))}
    </div>
  );
};

export interface Slice { label: string; value: number; color: string }

/**
 * Bo'lakli halqa + ostida qatorlar (nom, son, ulush). Bo'laklar yumaloq uchli, orasida oraliq; qator yoki
 * bo'lak ustiga kelinsa o'shanisi ajraladi va markazda uning soni chiqadi.
 */
export const RingBreakdown: FC<{ items: Slice[]; totalLabel: string; size?: number; thickness?: number }> = ({ items, totalLabel, size = 184, thickness = 18 }) => {
  const [rawActive, setActive] = useState(-1);
  const active = rawActive as number;
  const total = items.reduce((s, i) => s + i.value, 0);
  const r = (size - thickness) / 2 - 3;
  const c = size / 2;
  const live = items.filter((i) => i.value > 0).length;
  const cap = ((thickness / 2) / r) * (180 / Math.PI);
  const gap = live > 1 ? 3 : 0;
  const pt = (deg: number) => { const a = ((deg - 90) * Math.PI) / 180; return [c + r * Math.cos(a), c + r * Math.sin(a)]; };
  let from = 0;
  const arcs = items.map((it) => {
    const span = total > 0 ? (it.value / total) * 360 : 0;
    const a0 = from; from += span;
    if (span <= 0) return '';
    if (live === 1) return `M${c} ${c - r}A${r} ${r} 0 1 1 ${c - 0.01} ${c - r}`;
    const mid = a0 + span / 2;
    const s = Math.min(mid, a0 + gap / 2 + cap), e = Math.max(mid, a0 + span - gap / 2 - cap);
    const [x0, y0] = pt(s), [x1, y1] = pt(e);
    return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${e - s > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  });
  const shown = active >= 0 ? items[active] : null;
  return (
    <div className="flex flex-1 flex-col" onMouseLeave={() => setActive(-1)}>
      <div className="relative mx-auto" style={{ width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label={items.map((i) => `${i.label}: ${i.value}`).join(', ')}>
          {total === 0 && <circle cx={c} cy={c} r={r} fill="none" strokeWidth={thickness} className="stroke-surface-sunken" />}
          {arcs.map((d, i) => d && (
            <path
              key={i} d={d} fill="none" strokeLinecap={live === 1 ? 'butt' : 'round'} pathLength={1} className="viz-draw"
              stroke={items[i].color} strokeWidth={i === active ? thickness + 5 : thickness}
              style={{ opacity: active >= 0 && i !== active ? 0.28 : 1, transition: 'opacity 160ms, stroke-width 160ms' }}
              onMouseEnter={() => setActive(i)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <span className="text-3xl font-semibold leading-9 tabular-nums text-text">{fmt(shown ? shown.value : total)}</span>
          <span className="eyebrow mt-0.5">{shown ? shown.label : totalLabel}</span>
        </div>
      </div>
      <ul className="mt-6 flex flex-col">
        {items.map((it, i) => (
          <li
            key={it.label} onMouseEnter={() => setActive(i)}
            className={`flex h-11 items-center gap-2.5 border-t border-border text-base transition-opacity duration-150 ${active >= 0 && i !== active ? 'opacity-45' : ''}`}
          >
            <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ background: it.color }} />
            <span className="min-w-0 flex-1 truncate text-text">{it.label}</span>
            <span className="font-semibold tabular-nums text-text">{fmt(it.value)}</span>
            <span className="w-11 text-right text-sm tabular-nums text-text-muted">{pctOf(it.value, total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * Pog'onali ustunlar (toifalar bo'yicha kattalik, 2–6 ta): ustida son, ustun — yuqori chizig'i qalin,
 * ichi pastga so'nadi; ostida `foot` (masalan o'zgarish belgisi) va nom. Balandlik karta bo'yiga cho'ziladi.
 */
export const StepColumns: FC<{ items: { label: string; value: number; foot?: ReactNode; title?: string }[]; minHeight?: number }> = ({ items, minHeight = 150 }) => {
  const max = Math.max(1, ...items.map((i) => i.value));
  const lead = items.reduce((bi, it, i) => (it.value > items[bi].value ? i : bi), 0);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 items-stretch gap-2 border-b border-border-strong" style={{ minHeight }}>
        {items.map((it, i) => (
          <div key={it.label} title={it.title} className="flex min-w-0 flex-1 flex-col justify-end">
            <span className="pb-2 text-center text-xl font-semibold leading-7 tabular-nums text-text">{fmt(it.value)}</span>
            <div
              className="viz-rise rounded-t-[6px] border-t-2"
              style={it.value > 0
                ? { height: `calc((100% - 36px) * ${it.value / max})`, minHeight: 4, borderColor: VIOLET, background: `linear-gradient(${tint(i === lead ? 34 : 20)}, ${tint(3)})`, animationDelay: `${i * 70}ms` }
                : { height: 0, borderColor: 'var(--color-border-strong)' }}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        {items.map((it) => (
          <div key={it.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="flex h-5 items-center">{it.foot}</span>
            <span className="max-w-full truncate text-sm font-medium text-text">{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Soatlar tasmasi (24 katak): rang quyuqligi — o'sha soatdagi son. Eng band soat ustida belgi; katak ustiga
 * kelinsa o'sha soat ko'rinadi. Ostida har soatga chiziqcha va 6 soatlik yorliqlar.
 */
export const HourStrip: FC<{ values: number[]; caption: (hour: number, value: number) => string; less: string; more: string }> = ({ values, caption, less, more }) => {
  const [rawHover, setHover] = useState(-1);
  const hover = rawHover as number;
  const max = Math.max(0, ...values);
  const peak = values.reduce((bi, v, i) => (v > values[bi] ? i : bi), 0);
  const active = hover >= 0 ? hover : max > 0 ? peak : -1;
  const shift = active < 3 ? '-12%' : active > 20 ? '-88%' : '-50%';
  return (
    <div className="relative pt-9" onMouseLeave={() => setHover(-1)}>
      {active >= 0 && (
        <span
          className="pointer-events-none absolute top-0 z-10 whitespace-nowrap rounded-full bg-primary px-2 py-0.5 text-xs font-semibold tabular-nums text-text-on-primary"
          style={{ left: `${((active + 0.5) / 24) * 100}%`, transform: `translateX(${shift})` }}
        >
          {caption(active, values[active] ?? 0)}
        </span>
      )}
      <div className="flex h-[72px] gap-0.5 overflow-hidden rounded-control" role="img" aria-label={values.map((v, h) => `${h}:00 — ${v}`).join(', ')}>
        {values.map((v, h) => (
          <span
            key={h} onMouseEnter={() => setHover(h)} onClick={() => setHover(h)}
            className="flex-1 transition-[box-shadow] duration-150"
            style={{ background: v > 0 ? tint(16 + 84 * (v / max)) : tint(7), boxShadow: h === active ? 'inset 0 0 0 2px var(--color-text)' : undefined }}
          />
        ))}
      </div>
      <div aria-hidden className="mt-2 flex gap-0.5">
        {values.map((_, h) => <span key={h} className="flex flex-1 justify-center"><span className={`w-px ${h % 6 === 0 ? 'h-2.5 bg-text-faint' : 'h-1.5 bg-border-strong'}`} /></span>)}
      </div>
      <div aria-hidden className="relative mt-1.5 h-4 text-xs tabular-nums text-text-muted">
        <span className="absolute left-0">00:00</span>
        {[6, 12, 18].map((h) => <span key={h} className="absolute -translate-x-1/2" style={{ left: `${((h + 0.5) / 24) * 100}%` }}>{String(h).padStart(2, '0')}:00</span>)}
        <span className="absolute right-0">23:00</span>
      </div>
      <div aria-hidden className="mt-4 flex items-center justify-end gap-1.5 text-xs text-text-muted">
        {less}
        {[7, 30, 53, 76, 100].map((p) => <span key={p} className="size-2.5 rounded-[3px]" style={{ background: tint(p) }} />)}
        {more}
      </div>
    </div>
  );
};

/** Ulush tasmasi: qalin bo'laklar (2px oraliq) + ostida har bo'lakning nomi, soni va ulushi. */
export const SplitBand: FC<{ items: Slice[] }> = ({ items }) => {
  const total = items.reduce((s, i) => s + i.value, 0);
  const live = items.filter((i) => i.value > 0);
  return (
    <div>
      <div className="flex h-9 gap-0.5 overflow-hidden rounded-control">
        {total === 0
          ? <span className="flex-1 bg-surface-sunken" />
          : live.map((it) => <span key={it.label} title={`${it.label}: ${it.value}`} className="min-w-1.5 rounded-[3px] transition-[flex-grow] duration-700 ease-standard" style={{ flexGrow: it.value, flexBasis: 0, background: it.color }} />)}
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((it) => (
          <li key={it.label} className="flex items-center gap-2.5 text-base">
            <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ background: it.color }} />
            <span className="min-w-0 flex-1 truncate text-text">{it.label}</span>
            <span className="font-semibold tabular-nums text-text">{fmt(it.value)}</span>
            <span className="w-11 text-right text-sm tabular-nums text-text-muted">{pctOf(it.value, total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
