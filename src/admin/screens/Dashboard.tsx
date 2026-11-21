import { useEffect, useMemo, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  Add01Icon, AlertCircleIcon, ArrowRight01Icon, CpuIcon, DollarCircleIcon, ImageNotFound01Icon, InboxIcon,
  Package01Icon, RefreshIcon, ShoppingBasket01Icon, UserAdd01Icon, UserGroupIcon, ViewIcon,
} from '@hugeicons/core-free-icons';
import { Trans, useTranslation } from 'react-i18next';
import type { ApiAdminStats, ApiDashboard } from '../../../shared/types';
import { getStats, runBillzSync } from '../api';
import { billzStatusText } from '../lib/billz-status';
import { errText } from '../errText';
import { formatThousands } from '../lib/format';
import { Badge, Button, DateRangePicker, EmptyState, Page, Segmented, useRangeLabel, type DayRange, type Tone } from '../ui';
import { Delta, Kpi, KpiTile, pctChange } from '../ui/stats';
import { ColumnsChart, HourStrip, INK, Key, LILAC, RingBreakdown, SplitBand, StepColumns, VIOLET, tint } from '../charts/viz';
import { useToast } from '../ui/toast';
import { timeAgo } from '../lib/ago';

/**
 * Bosh sahifa (v3, egasining referenslari, 2026-11-21): hamma karta bitta anatomiyada (`Panel` — 24px ichki
 * bo'shliq, sarlavha → raqamlar → vizual → qatorlar) va bitta to'rda (16px oraliq, 4/8 ustun chegaralari qatorlar
 * bo'ylab mos). Grafiklar `charts/viz` (kutubxonasiz SVG): kunlik ustunlar + chiziq, holat halqasi, yo'nalishlar
 * pog'onasi, soatlar tasmasi, ulush tasmalari. Raqam ustidagi nomlar — `eyebrow` (mono, bosh harf).
 * Summa yo'q (2026-11-21, egasining qarori): sayt sotuvni bilmaydi, buyurtma — ariza; faqat sanoqlar.
 * Tashrifga bog'liq raqamlar (konversiya, o'rtacha, eng faol kun) faqat tashrif sanalgan kunlardan (`visitsSince`).
 * Raqamlar `GET /api/admin/stats`dan; sidebar sanog'i va Billz/kurs — `ApiDashboard`dan (AdminApp beradi).
 */

const PERIODS = [7, 30, 90] as const;
const STATUS_TONE: Record<string, Tone> = { new: 'info', contacted: 'neutral', done: 'ok' };
/** Holat ranglari — ro'yxatdagi Badge bilan bir xil ma'noda: yangi ko'k, bog'lanilgan neytral, bajarilgan yashil. */
const STATUS_COLOR = { new: 'var(--color-info)', contacted: 'var(--color-text-faint)', done: 'var(--color-success)' } as const;
const STATUSES = ['new', 'contacted', 'done'] as const;
const hh = (h: number) => `${String(h % 24).padStart(2, '0')}:00`;
const num = (n: number) => formatThousands(n) || '0';

function useDashFormat() {
  const { t, i18n } = useTranslation(['shell', 'common']);
  const months = t('dashboard.months').split(',');
  const day = (d: string) => { const [, m, dd] = d.split('-'); return `${Number(dd)} ${months[Number(m) - 1] ?? ''}`; };
  return { t, lang: i18n.language, day };
}

const productLink = (id: string) => `/admin/products/${encodeURIComponent(id)}`;

const Ico: FC<{ icon: IconSvgElement; size?: number; className?: string }> = ({ icon, size = 18, className }) => (
  <HugeiconsIcon icon={icon} size={size} strokeWidth={1.5} className={className} />
);

const Initials: FC<{ name: string }> = ({ name }) => {
  const parts = name.replace(/^SINOV\s+/, '').split(/\s+/).filter(Boolean);
  const ini = (parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '');
  return <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-sunken text-sm font-semibold uppercase text-text-muted">{ini}</span>;
};

const Thumb: FC<{ src: string | null }> = ({ src }) => (
  <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-[10px] border border-border bg-surface-sunken">
    {src ? <img src={src} alt="" className="size-full object-contain p-0.5" /> : <Ico icon={Package01Icon} size={16} className="text-text-faint" />}
  </span>
);

/**
 * Dashboard kartasi — hamma kartada bir xil: 24px ichki bo'shliq, sarlavha 17/600 + bir qatorli izoh, o'ngda amal;
 * tana sarlavhadan 20px pastda, bloklar orasida 20px. `flush` — tana chetgacha (ro'yxat qatorlari o'zi 24px beradi).
 */
const Panel: FC<{ title: string; description?: string; actions?: ReactNode; flush?: boolean; className?: string; children: ReactNode }> = ({ title, description, actions, flush, className = '', children }) => (
  <section className={`flex h-full min-w-0 flex-col rounded-surface border border-border bg-surface ${className}`}>
    <header className="flex min-h-[68px] items-start justify-between gap-4 px-6 pt-5">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold leading-6 text-text">{title}</h2>
        {description && <p className="mt-1 text-sm leading-5 text-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
    <div className={`flex min-h-0 flex-1 flex-col ${flush ? 'pt-3' : 'gap-5 px-6 pb-6 pt-4'}`}>{children}</div>
  </section>
);

/** Raqam bloki: mono yorliq, katta son, ostida bir qatorli izoh. */
const Stat: FC<{ label: string; value: ReactNode; hint?: ReactNode }> = ({ label, value, hint }) => (
  <div className="min-w-0">
    <p className="eyebrow truncate">{label}</p>
    <p className="mt-1.5 truncate text-2xl font-semibold leading-8 tabular-nums text-text">{value}</p>
    {hint && <p className="mt-0.5 text-sm leading-5 text-text-muted">{hint}</p>}
  </div>
);

/** Tovarlar reytingi: tartib raqami, eskiz, nom va uning ostida ulush chizig'i (eng kattasiga nisbatan), o'ngda son. */
const RankList: FC<{
  title: string; description: string; empty: string; cols: [string, string];
  rows: { id: string; name: string; imageUrl: string | null; value: number; sub?: string }[];
}> = ({ title, description, empty, cols, rows }) => {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Panel title={title} description={description} flush>
      {rows.length === 0 ? (
        <p className="grid flex-1 place-items-center px-6 pb-8 text-center text-base text-text-muted">{empty}</p>
      ) : (
        <>
          <div className="flex h-9 items-center justify-between border-b border-border px-6"><span className="eyebrow">{cols[0]}</span><span className="eyebrow">{cols[1]}</span></div>
          <ol>
            {rows.map((r, i) => (
              <li key={r.id} className="border-b border-border last:border-b-0">
                <Link to={productLink(r.id)} className="flex h-[60px] items-center gap-3 px-6 transition-colors duration-150 hover:bg-ghost-hover">
                  <span className="w-5 shrink-0 text-xs tabular-nums text-text-faint">{String(i + 1).padStart(2, '0')}</span>
                  <Thumb src={r.imageUrl} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-medium leading-5 text-text">{r.name}</span>
                    <span className="mt-2 block h-1 overflow-hidden rounded-full bg-surface-sunken">
                      <span className="block h-full rounded-full transition-[width] duration-700 ease-standard" style={{ width: `${(r.value / max) * 100}%`, background: i === 0 ? VIOLET : tint(42) }} />
                    </span>
                  </span>
                  <span className="w-16 shrink-0 text-right">
                    <span className="block text-base font-semibold leading-5 tabular-nums text-text">{num(r.value)}</span>
                    {r.sub && <span className="mt-0.5 block text-xs tabular-nums text-text-muted">{r.sub}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}
    </Panel>
  );
};

/** «Diqqat kerak» qatori — plitka, nom, izoh, o'ngda son yoki amal. */
const AttentionRow: FC<{ icon: IconSvgElement; title: string; note: string; right?: ReactNode; to?: string }> = ({ icon, title, note, right, to }) => {
  const body = (
    <>
      <KpiTile icon={icon} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-medium leading-5 text-text">{title}</span>
        <span className="mt-0.5 block text-sm leading-5 text-text-muted">{note}</span>
      </span>
      {right}
      {to && <Ico icon={ArrowRight01Icon} size={16} className="shrink-0 text-text-faint transition-transform duration-150 group-hover:translate-x-0.5" />}
    </>
  );
  const cls = 'group flex items-center gap-3 px-6 py-3.5 transition-colors duration-150';
  return <li className="border-b border-border last:border-b-0">{to ? <Link to={to} className={`${cls} hover:bg-ghost-hover`}>{body}</Link> : <div className={cls}>{body}</div>}</li>;
};

/** Dashboard bo'lim sarlavhasi — guruhlar orasida ritm (32px) va ierarxiya. */
const SectionHead: FC<{ title: string; text: string }> = ({ title, text }) => (
  <div className="mt-4">
    <h2 className="text-xl font-semibold leading-7 text-text">{title}</h2>
    <p className="mt-0.5 text-base text-text-muted">{text}</p>
  </div>
);

/** Haftalik yig'indi (90 kunlik ustunlar uchun). */
function weekly(labels: string[], values: number[]): { labels: string[]; values: number[] } {
  const out = { labels: [] as string[], values: [] as number[] };
  for (let end = values.length; end > 0; end -= 7) {
    const start = Math.max(0, end - 7);
    out.labels.unshift(labels[start]);
    out.values.unshift(values.slice(start, end).reduce((a, b) => a + b, 0));
  }
  return out;
}

const cell = (i: number) => ({ ['--i' as string]: i }) as Record<string, number>;

const Dashboard: FC<{ data: ApiDashboard | null; onRefresh: () => void; defaultPw: boolean; error: boolean }> = ({ data, onRefresh, defaultPw, error }) => {
  const { t, day } = useDashFormat();
  const [rawReload, setReload] = useState(0);
  const reload = rawReload as number;
  const { t: to } = useTranslation('orders');
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const days = Number(params.get('d')) === 7 ? 7 : Number(params.get('d')) === 90 ? 90 : 30;
  const from = params.get('from');
  const until = params.get('to');
  const range: DayRange | null = from && until ? { from, to: until } : null;
  const rangeLabel = useRangeLabel();
  const setPeriod = (v: string | DayRange | null) => setParams((p) => {
    const n = new URLSearchParams(p);
    n.delete('d'); n.delete('from'); n.delete('to');
    if (typeof v === 'string') { if (v !== '30') n.set('d', v); }
    else if (v) { n.set('from', v.from); n.set('to', v.to); }
    return n;
  }, { replace: true, preventScrollReset: true });
  const [rawStats, setStats] = useState(null as ApiAdminStats | null);
  const stats = rawStats as ApiAdminStats | null;
  const [statsError, setStatsError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rawMetric, setMetric] = useState('visits');
  const metric = rawMetric as string;

  useEffect(() => {
    let alive = true;
    setStatsError(false);
    getStats(range ?? days).then((s) => { if (alive) setStats(s); }).catch(() => { if (alive) setStatsError(true); });
    return () => { alive = false; };
  }, [days, from, until, reload]);

  const running = data?.billz.running ?? false;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(onRefresh, 3000);
    return () => clearInterval(timer);
  }, [running, onRefresh]);

  async function sync() {
    setBusy(true);
    try {
      await runBillzSync();
      toast(t('dashboard.billz.syncStarted'));
      onRefresh();
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  const derived = useMemo(() => {
    if (!stats) return null;
    const labels = stats.series.map((s) => day(s.day));
    const orders = stats.series.map((s) => s.orders + s.consults);
    const visitors = stats.series.map((s) => s.visitors);
    const views = stats.series.map((s) => s.views);
    const matrix = stats.days > 31 ? weekly(labels, orders) : { labels, values: orders };
    const totalReq = stats.totals.orders + stats.totals.consults;
    // Tashrif sanalmagan kunlardagi buyurtmalar konversiyaga kirmaydi — aks holda foiz bir necha barobar shishadi.
    const since = stats.visitsSince;
    const tracked = since ? stats.series.filter((s) => s.day >= since) : [];
    const trackedReq = tracked.reduce((n, s) => n + s.orders + s.consults, 0);
    const conversion = stats.totals.visitors > 0 ? (trackedReq / stats.totals.visitors) * 100 : null;
    const visitorsPerDay = tracked.length ? stats.totals.visitors / tracked.length : 0;
    const top = visitors.reduce((bi, v, i) => (v > visitors[bi] ? i : bi), 0);
    const bestIdx = (visitors[top] ?? 0) > 0 ? top : -1;
    const peak = stats.hours.reduce((bi, v, i) => (v > stats.hours[bi] ? i : bi), 0);
    // Davrning bir qismida tashrif sanalmagan bo'lsa — izoh; oldingi davr to'liq sanalmagan bo'lsa — o'sish foizi yo'q.
    const first = stats.series[0]?.day ?? '';
    const prevFirst = first ? new Date(Date.parse(`${first}T00:00:00Z`) - stats.days * 86_400_000).toISOString().slice(0, 10) : '';
    const partial = since !== null && since > first;
    const visitorsDelta = since !== null && since <= prevFirst ? pctChange(stats.totals.visitors, stats.totals.visitorsPrev) : undefined;
    const hoursTotal = stats.hours.reduce((a, b) => a + b, 0);
    const share = (from: number, to: number) => (hoursTotal ? `${Math.round((stats.hours.slice(from, to).reduce((a, b) => a + b, 0) / hoursTotal) * 100)}%` : '—');
    // Sanalmagan kunlar grafikda shtrixlanadi: `since`gacha bo'lgan kunlar soni (hali umuman sanalmagan — hammasi).
    const untracked = since === null ? stats.series.length : stats.series.filter((x) => x.day < since).length;
    return { labels, orders, visitors, views, matrix, totalReq, conversion, visitorsPerDay, bestIdx, peak, since, partial, visitorsDelta, hoursTotal, share, untracked };
  }, [stats]);

  const attention = data ? [
    data.newOrders > 0 && { icon: InboxIcon, title: t('dashboard.newOrders.label'), note: t('dashboard.newOrders.note'), n: data.newOrders, to: '/admin/orders' },
    data.needsImage > 0 && { icon: ImageNotFound01Icon, title: t('dashboard.needsImage.label'), note: t('dashboard.needsImage.note'), n: data.needsImage, to: '/admin/products?f=needs_image' },
    data.configuratorUntagged > 0 && { icon: CpuIcon, title: t('dashboard.configurator.label'), note: t('dashboard.configurator.note'), n: data.configuratorUntagged, to: '/admin/products/configurator?f=untagged' },
    data.newApplications > 0 && { icon: UserGroupIcon, title: t('dashboard.newApplications.label'), note: t('dashboard.newApplications.note'), n: data.newApplications, to: '/admin/orders/applications' },
  ].filter(Boolean) as { icon: IconSvgElement; title: string; note: string; n: number; to: string }[] : [];

  const periodPicker = (cls = '') => (
    <Segmented
      label={t('dashboard.period.label')}
      value={range ? '' : String(days)}
      onChange={setPeriod}
      options={PERIODS.map((p) => ({ id: String(p), label: t(`dashboard.period.d${p}` as 'dashboard.period.d7') }))}
      className={cls}
    />
  );
  const trend = (delta: number | null | undefined) => (delta === undefined ? t('dashboard.kpi.noPrev') : t('dashboard.kpi.vsPrev'));

  return (
    <Page
      title={t('dashboard.title')}
      description={range ? t('dashboard.subtitleRange', { range: rangeLabel(range) }) : t('dashboard.subtitle', { days })}
      actions={
        <>
          {periodPicker('max-sm:hidden')}
          <DateRangePicker value={range} onChange={setPeriod} className="max-sm:hidden" />
          <Button to="/admin/products/new" className="max-sm:hidden"><Ico icon={Add01Icon} size={16} />{t('dashboard.newProduct')}</Button>
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2 sm:hidden">
        {periodPicker()}
        <DateRangePicker value={range} onChange={setPeriod} />
      </div>

      {defaultPw && (
        <div className="stagger mb-4 flex flex-wrap items-center gap-3 rounded-surface border border-danger/20 bg-danger-soft px-4 py-3 text-base text-danger-strong">
          <Ico icon={AlertCircleIcon} size={20} className="shrink-0 text-danger" />
          <span className="min-w-0 flex-1"><Trans t={t} i18nKey="dashboard.defaultPassword" components={{ b: <b /> }} /></span>
          <Button variant="outline" size="sm" to="/admin/settings/account">{t('dashboard.changePassword')}</Button>
        </div>
      )}

      {!stats || !derived ? (
        statsError ? (
          <EmptyState
            icon={<Ico icon={AlertCircleIcon} size={24} />}
            title={t('dashboard.loadErrorTitle')}
            text={t('dashboard.loadErrorText')}
            action={<Button variant="secondary" onClick={() => setReload(reload + 1)}>{t('common:retry')}</Button>}
          />
        ) : (
          <div className="flex flex-col gap-4" aria-busy="true">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-[196px] rounded-surface" />)}</div>
            <div className="grid gap-4 xl:grid-cols-12"><div className="skeleton h-[480px] rounded-surface xl:col-span-8" /><div className="skeleton h-[480px] rounded-surface xl:col-span-4" /></div>
          </div>
        )
      ) : (
        <div className="flex flex-col gap-4">
          <section className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4" style={cell(0)}>
            <Kpi
              icon={InboxIcon} label={t('dashboard.kpi.orders.label')} value={stats.totals.orders}
              delta={pctChange(stats.totals.orders, stats.totals.ordersPrev)} trend={t('dashboard.kpi.vsPrev')}
              note={t('dashboard.kpi.orders.note', { n: stats.totals.consults })}
              spark={stats.series.map((x) => x.orders)} to="/admin/orders"
            />
            <Kpi
              icon={ViewIcon} label={t('dashboard.kpi.visitors.label')} value={stats.totals.visitors}
              delta={derived.visitorsDelta} trend={trend(derived.visitorsDelta)}
              note={t('dashboard.kpi.visitors.note', { n: num(stats.totals.views) })}
              spark={derived.visitors}
            />
            <Kpi
              icon={UserAdd01Icon} label={t('dashboard.kpi.customers.label')} value={stats.totals.customersNew}
              delta={pctChange(stats.totals.customersNew, stats.totals.customersNewPrev)} trend={t('dashboard.kpi.vsPrev')}
              note={t('dashboard.kpi.customers.note', { n: num(stats.totals.customersTotal) })}
              spark={stats.series.map((x) => x.customers)} to="/admin/orders/customers"
            />
            <Kpi
              icon={ShoppingBasket01Icon} label={t('dashboard.kpi.demand.label')} value={stats.totals.itemsRequested} unit={t('dashboard.kpi.demand.unit')}
              delta={pctChange(stats.totals.itemsRequested, stats.totals.itemsRequestedPrev)} trend={t('dashboard.kpi.vsPrev')}
              note={t('dashboard.kpi.demand.note', { n: num(stats.totals.orders) })}
              spark={stats.series.map((x) => x.items)}
            />
          </section>

          <div className="grid gap-4 xl:grid-cols-12">
            <div className="stagger xl:col-span-8" style={cell(1)}>
              <Panel
                title={t('dashboard.activity.title')}
                description={t('dashboard.activity.description')}
                actions={
                  <Segmented
                    label={t('dashboard.activity.title')} value={metric} onChange={setMetric} size="sm"
                    options={[{ id: 'visits', label: t('dashboard.activity.visits') }, { id: 'orders', label: t('dashboard.activity.orders') }]}
                  />
                }
              >
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                  <Stat
                    label={t('dashboard.activity.conversion')}
                    value={derived.conversion === null ? '—' : `${derived.conversion.toFixed(1).replace('.', ',')}%`}
                    hint={t('dashboard.activity.conversionHint')}
                  />
                  <Stat
                    label={metric === 'visits' ? t('dashboard.activity.visitors') : t('dashboard.activity.orders')}
                    value={num(Math.round(metric === 'visits' ? derived.visitorsPerDay : derived.totalReq / stats.days))}
                    hint={t('dashboard.activity.perDay')}
                  />
                  <Stat
                    label={t('dashboard.activity.best')}
                    value={derived.bestIdx < 0 ? '—' : derived.labels[derived.bestIdx]}
                    hint={derived.bestIdx < 0 ? t('dashboard.activity.noVisits') : `${num(derived.visitors[derived.bestIdx] ?? 0)} · ${t('dashboard.activity.visitors').toLowerCase()}`}
                  />
                </div>
                <div className="mt-auto">
                  <div className="mb-1 flex min-h-5 flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    {metric === 'visits' ? (
                      <div className="flex items-center gap-4">
                        <Key color={tint(40)} label={t('dashboard.activity.views')} />
                        <Key color="var(--color-text)" label={t('dashboard.activity.visitors')} line />
                      </div>
                    ) : <Key color={tint(40)} label={t('dashboard.activity.orders')} />}
                    {metric === 'visits' && (derived.partial || derived.since === null) && (
                      <p className="text-sm text-text-muted">
                        {derived.since === null ? t('dashboard.activity.notTracked') : t('dashboard.activity.trackedSince', { date: day(derived.since) })}
                      </p>
                    )}
                  </div>
                  {metric === 'visits' ? (
                    <div key="v" className="animate-fade-in">
                      <ColumnsChart
                        labels={derived.labels} bars={derived.views} barName={t('dashboard.activity.views')}
                        line={derived.visitors} lineName={t('dashboard.activity.visitors')}
                        mutedBefore={derived.untracked} height={300}
                      />
                    </div>
                  ) : (
                    <div key="o" className="animate-fade-in">
                      <ColumnsChart labels={derived.matrix.labels} bars={derived.matrix.values} barName={t('dashboard.activity.orders')} height={300} />
                    </div>
                  )}
                </div>
              </Panel>
            </div>

            <div className="stagger xl:col-span-4" style={cell(2)}>
              <Panel title={t('dashboard.status.title')} description={t('dashboard.status.description')}>
                <RingBreakdown
                  totalLabel={t('dashboard.status.total')}
                  items={STATUSES.map((k) => ({ label: to(`status.${k}`), value: stats.status[k], color: STATUS_COLOR[k] }))}
                />
                <Button variant="outline" to="/admin/orders" className="w-full">
                  {stats.status.new > 0 && <Badge tone="info" className="-ml-1 h-5 px-1.5">{stats.status.new}</Badge>}
                  {t('dashboard.status.open')}
                </Button>
              </Panel>
            </div>
          </div>

          <SectionHead title={t('dashboard.sections.products')} text={t('dashboard.sections.productsText')} />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="stagger" style={cell(3)}>
              <Panel title={t('dashboard.categories.title')} description={t('dashboard.categories.description')}>
                <StepColumns
                  items={stats.categories.map((c) => ({
                    label: c.name, value: c.requests,
                    title: t('dashboard.categories.prev', { n: c.requestsPrev }),
                    foot: c.requests === 0 && c.requestsPrev === 0 ? <span className="text-xs text-text-faint">—</span> : <Delta value={pctChange(c.requests, c.requestsPrev)} />,
                  }))}
                />
              </Panel>
            </div>
            <div className="stagger" style={cell(4)}>
              <Panel title={t('dashboard.hours.title')} description={t('dashboard.hours.description')}>
                <div className="grid grid-cols-3 gap-4">
                  <Stat
                    label={t('dashboard.hours.peakLabel')}
                    value={derived.hoursTotal ? hh(derived.peak) : '—'}
                    hint={derived.hoursTotal ? t('dashboard.hours.peakHint', { n: stats.hours[derived.peak] ?? 0 }) : t('dashboard.hours.none')}
                  />
                  <Stat label={t('dashboard.hours.day')} value={derived.share(9, 18)} hint={t('dashboard.hours.dayHint')} />
                  <Stat label={t('dashboard.hours.evening')} value={derived.share(18, 24)} hint={t('dashboard.hours.eveningHint')} />
                </div>
                <div className="mt-auto">
                  <HourStrip values={stats.hours} less={t('dashboard.hours.less')} more={t('dashboard.hours.more')} caption={(h, n) => t('dashboard.hours.cell', { from: hh(h), to: hh(h + 1), n })} />
                </div>
              </Panel>
            </div>
            <div className="stagger md:col-span-2 xl:col-span-1" style={cell(5)}>
              <Panel title={t('dashboard.mix.title')} description={t('dashboard.mix.description')}>
                <div>
                  <p className="eyebrow mb-2.5">{t('dashboard.status.payment')}</p>
                  <SplitBand items={[
                    { label: t('dashboard.status.cash'), value: stats.payment.cash, color: VIOLET },
                    { label: t('dashboard.status.installment'), value: stats.payment.installment, color: INK },
                  ]} />
                </div>
                <div className="border-t border-border pt-5">
                  <p className="eyebrow mb-2.5">{t('dashboard.status.sources')}</p>
                  <SplitBand items={[
                    { label: t('dashboard.status.product'), value: stats.sources.product, color: VIOLET },
                    { label: t('dashboard.status.cart'), value: stats.sources.cart, color: INK },
                    { label: t('dashboard.status.consult'), value: stats.sources.consult, color: LILAC },
                  ]} />
                </div>
              </Panel>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="stagger" style={cell(6)}>
              <RankList
                title={t('dashboard.top.title')} description={t('dashboard.top.description')} empty={t('dashboard.top.empty')}
                cols={[t('dashboard.top.cols.product'), t('dashboard.top.cols.requests')]}
                rows={stats.topProducts.map((p) => ({ id: p.productId, name: p.name, imageUrl: p.imageUrl, value: p.requests, sub: t('dashboard.top.qty', { n: p.qty }) }))}
              />
            </div>
            <div className="stagger" style={cell(7)}>
              <RankList
                title={t('dashboard.viewed.title')} description={t('dashboard.viewed.description')} empty={t('dashboard.viewed.empty')}
                cols={[t('dashboard.top.cols.product'), t('dashboard.viewed.views')]}
                rows={stats.topViewed.map((p) => ({ id: p.productId, name: p.name, imageUrl: p.imageUrl, value: p.views }))}
              />
            </div>
            <div className="stagger md:col-span-2 xl:col-span-1" style={cell(8)}>
              <Panel title={t('dashboard.catalog.title')} description={t('dashboard.catalog.description')} flush>
                <div className="flex flex-col gap-5 px-6 pb-5 pt-1">
                  <Stat label={t('dashboard.catalog.onSite')} value={num(stats.catalog.onSite)} hint={t('dashboard.catalog.ofTotal', { n: num(stats.catalog.total) })} />
                  <SplitBand items={[
                    { label: t('dashboard.catalog.onSite'), value: stats.catalog.onSite, color: VIOLET },
                    { label: t('dashboard.catalog.hidden'), value: stats.catalog.hidden, color: tint(22) },
                  ]} />
                </div>
                <ul className="mt-auto border-t border-border">
                  {[
                    { label: t('dashboard.catalog.needsImage'), n: stats.catalog.needsImage, href: '/admin/products?f=needs_image' },
                    { label: t('dashboard.catalog.outOfStock'), n: stats.catalog.outOfStock, href: '/admin/products?f=stock0' },
                    { label: t('dashboard.catalog.onOrder'), n: stats.catalog.onOrder, href: '/admin/products' },
                  ].map((x) => (
                    <li key={x.label} className="border-b border-border last:border-b-0">
                      <Link to={x.href} className="group flex h-12 items-center gap-3 px-6 text-base transition-colors duration-150 hover:bg-ghost-hover last:rounded-b-[15px]">
                        <span className="min-w-0 flex-1 truncate text-text">{x.label}</span>
                        <span className="font-semibold tabular-nums text-text">{num(x.n)}</span>
                        <Ico icon={ArrowRight01Icon} size={16} className="shrink-0 text-text-faint transition-transform duration-150 group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          </div>

          <SectionHead title={t('dashboard.sections.operations')} text={t('dashboard.sections.operationsText')} />
          <div className="grid gap-4 xl:grid-cols-12">
            <div className="stagger xl:col-span-8" style={cell(9)}>
              <Panel
                flush
                title={t('dashboard.recent.title')}
                actions={<Button variant="outline" size="sm" to="/admin/orders">{t('dashboard.recent.all')}<Ico icon={ArrowRight01Icon} size={14} /></Button>}
              >
                {stats.recentOrders.length === 0 ? (
                  <p className="grid flex-1 place-items-center px-6 pb-8 text-center text-base text-text-muted">{t('dashboard.recent.empty')}</p>
                ) : (
                  <ul className="border-t border-border">
                    {stats.recentOrders.map((o) => (
                      <li key={o.id} className="border-b border-border last:border-b-0">
                        <Link to={`/admin/orders/${o.id}`} className="flex h-16 items-center gap-3 px-6 transition-colors duration-150 hover:bg-ghost-hover">
                          <Initials name={o.name} />
                          <span className="min-w-0 flex-1 sm:w-52 sm:flex-none">
                            <span className="block truncate text-base font-medium leading-5 text-text">{o.name}</span>
                            <span className="mt-0.5 block truncate text-sm tabular-nums text-text-muted">№{o.id} · {timeAgo(o.createdAt)}</span>
                          </span>
                          <span className="hidden min-w-0 flex-1 items-center gap-2.5 md:flex">
                            {o.source === 'consult' ? (
                              <span className="truncate text-base text-text-muted">{t('dashboard.recent.consult')}</span>
                            ) : (
                              <>
                                <Thumb src={o.imageUrl} />
                                <span className="truncate text-base text-text">{o.firstItem}</span>
                                {o.itemCount > 1 && <span className="shrink-0 text-sm text-text-faint">{t('dashboard.recent.more', { n: o.itemCount - 1 })}</span>}
                              </>
                            )}
                          </span>
                          <Badge tone={STATUS_TONE[o.status] ?? 'neutral'} dot className="w-28 justify-center">{to(`status.${o.status as 'new'}`)}</Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
            <div className="stagger xl:col-span-4" style={cell(10)}>
              <Panel flush title={t('dashboard.attention.title')} description={t('dashboard.attention.description')}>
                <ul className="border-t border-border">
                  {attention.map((a) => (
                    <AttentionRow key={a.title} icon={a.icon} title={a.title} note={a.note} to={a.to} right={<span className="text-base font-semibold tabular-nums text-text">{a.n}</span>} />
                  ))}
                  {data && (
                    <AttentionRow
                      icon={RefreshIcon}
                      title={t('dashboard.billz.title')}
                      note={billzStatusText(data.billz).text}
                      to={data.billz.configured ? undefined : '/admin/settings/integrations'}
                      right={data.billz.configured ? <Button variant="outline" size="sm" onClick={sync} disabled={busy || running}>{t('dashboard.billz.refresh')}</Button> : undefined}
                    />
                  )}
                  {data && (
                    <AttentionRow
                      icon={DollarCircleIcon}
                      title={`${t('dashboard.usd.title')}: ${formatThousands(data.usd.rate) || '—'}`}
                      note={data.usd.auto ? t('dashboard.usd.autoNote') : t('dashboard.usd.manualNote')}
                      to="/admin/settings/payment"
                    />
                  )}
                </ul>
                {attention.length === 0 && <p className="mx-6 my-4 rounded-control bg-success-soft px-3 py-2 text-sm text-success-strong">{t('dashboard.attention.allGood')}</p>}
                {error && <p className="mx-6 mb-5 text-sm text-danger-text">{t('dashboard.loadErrorText')}</p>}
              </Panel>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
};

export default Dashboard;
