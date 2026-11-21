import { useEffect, useMemo, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  ArrowsClockwise, CaretRight, ChartLineUp, Clock, Cpu, CurrencyDollar, Eye, ImageBroken, Package, Plus, Receipt, ShoppingBagOpen,
  Sparkle, SquaresFour, Tray, UserPlus, Users, WarningCircle,
} from '@phosphor-icons/react';
import type { Icon as PhIcon } from '@phosphor-icons/react';
import { Trans, useTranslation } from 'react-i18next';
import type { ApiAdminStats, ApiDashboard } from '../../../shared/types';
import { getStats, runBillzSync } from '../api';
import { billzStatusText } from '../lib/billz-status';
import { errText } from '../errText';
import { formatThousands } from '../lib/format';
import { Badge, Button, Card, DateRangePicker, EmptyState, HUE_DOT, Page, Segmented, useRangeLabel, type DayRange, type Hue, type Tone } from '../ui';
import { Kpi, KpiStrip, pctChange } from '../ui/stats';
import { AreaChart, BarChart, CompareBarChart, DonutChart, SegmentBar } from '../charts';
import { useToast } from '../ui/toast';
import { timeAgo } from '../lib/ago';

/**
 * Bosh sahifa (v2, egasining talabi — «dashboard aniq raqamlar haqida gapirsin»): davr tanlanadi (7/30/90 kun),
 * ostida KPI qatori (buyurtma, tashrif, ro'yxatdan o'tish, so'ralgan tovarlar soni — oldingi davr bilan),
 * Summa yo'q (2026-11-21, egasining qarori): sayt sotuvni bilmaydi, buyurtma — ariza; faqat sanoqlar.
 * Tashrifga bog'liq raqamlar (konversiya, o'rtacha, eng faol kun) faqat tashrif sanalgan kunlardan (`visitsSince`).
 * sayt faolligi grafigi, buyurtmalar holati, eng ko'p so'ralgan va ko'rilgan tovarlar, yo'nalishlar bo'yicha talab,
 * so'nggi buyurtmalar, buyurtma soatlari, katalog holati va «diqqat kerak» ro'yxati.
 * Raqamlar `GET /api/admin/stats`dan; sidebar sanog'i va Billz/kurs — `ApiDashboard`dan (AdminApp beradi).
 */

const PERIODS = [7, 30, 90] as const;
const STATUS_HUE: Record<string, Hue> = { new: 'blue', contacted: 'orange', done: 'green' };
const STATUS_TONE: Record<string, Tone> = { new: 'info', contacted: 'neutral', done: 'ok' };
const CAT_HUES: Hue[] = ['violet', 'orange', 'blue', 'green'];

function useDashFormat() {
  const { t, i18n } = useTranslation(['shell', 'common']);
  const months = t('dashboard.months').split(',');
  const day = (d: string) => { const [, m, dd] = d.split('-'); return `${Number(dd)} ${months[Number(m) - 1] ?? ''}`; };
  return { t, lang: i18n.language, day };
}

const Initials: FC<{ name: string }> = ({ name }) => {
  const parts = name.replace(/^SINOV\s+/, '').split(/\s+/).filter(Boolean);
  const ini = (parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '');
  return <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-sunken text-sm font-semibold uppercase text-text-muted">{ini}</span>;
};

const Thumb: FC<{ src: string | null }> = ({ src }) => (
  <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-control bg-surface">
    {src ? <img src={src} alt="" className="size-full object-contain p-0.5" /> : <Package className="size-4 text-text-faint" />}
  </span>
);

/** Ro'yxat/jadval kartasining sarlavhasi: ikonka nom bilan bir qatorda, izoh ostida chapdan. */
const CardHead: FC<{ icon: PhIcon; title: string; description: string }> = ({ icon: I, title, description }) => (
  <header className="px-6 pb-4 pt-5">
    <h2 className="flex items-center gap-2 text-md font-semibold text-text">
      <I weight="fill" className="size-[18px] shrink-0 text-text-faint" />{title}
    </h2>
    <p className="mt-1 text-sm text-text-muted">{description}</p>
  </header>
);

/**
 * Tovarlar reytingi jadvali: o'z sarlavhasi (ikonka nom bilan bir qatorda), ustun sarlavhalari,
 * qatorlar orasida hairline; qator bosilsa tovar sahifasi. Birinchi ustun — eskiz va nom, qolgani raqamlar.
 */
const ProductTable: FC<{
  icon: PhIcon; title: string; description: string; empty: string;
  cols: string[];
  rows: { id: string; name: string; imageUrl: string | null; cells: string[] }[];
}> = ({ icon: I, title, description, empty, cols, rows }) => {
  const navigate = useNavigate();
  return (
    <section className="flex h-full min-w-0 flex-col overflow-hidden rounded-surface bg-surface-sunken">
      <CardHead icon={I} title={title} description={description} />
      {rows.length === 0 ? (
        <p className="px-6 pb-8 pt-4 text-center text-base text-text-muted">{empty}</p>
      ) : (
        <table className="w-full text-base">
          <thead>
            <tr className="border-y border-border text-sm text-text-muted">
              {cols.map((c, i) => (
                <th key={c} scope="col" className={`py-2.5 font-medium ${i === 0 ? 'pl-6 text-left' : 'whitespace-nowrap pl-3 text-right last:pr-6'}`}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} onClick={() => navigate(productLink(r.id))} className="cursor-pointer border-b border-border transition-colors duration-150 last:border-b-0 hover:bg-surface-sunken">
                <td className="w-full max-w-0 py-2.5 pl-6">
                  <Link to={productLink(r.id)} onClick={(e: { stopPropagation: () => void }) => e.stopPropagation()} className="flex min-w-0 items-center gap-2.5">
                    <Thumb src={r.imageUrl} />
                    <span className="truncate font-medium text-text">{r.name}</span>
                  </Link>
                </td>
                {r.cells.map((c, i) => (
                  <td key={i} className={`whitespace-nowrap py-2.5 pl-3 text-right tabular-nums last:pr-6 ${i === r.cells.length - 1 ? 'font-semibold text-text' : 'text-text-muted'}`}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};

const productLink = (id: string) => `/admin/products/${encodeURIComponent(id)}`;

/** «Diqqat kerak» qatori — ikonka, nom, izoh, o'ngda son yoki amal. */
const AttentionRow: FC<{ icon: PhIcon; title: string; note: string; right?: ReactNode; to?: string }> = ({ icon: I, title, note, right, to }) => {
  const body = (
    <>
      <I weight="fill" className="size-[18px] shrink-0 text-text-faint" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-medium text-text">{title}</span>
        <span className="mt-0.5 block text-sm text-text-muted">{note}</span>
      </span>
      {right}
      {to && <CaretRight weight="bold" className="size-3.5 shrink-0 text-text-faint transition-transform duration-150 group-hover:translate-x-0.5" />}
    </>
  );
  const cls = 'group flex items-center gap-3 px-6 py-3.5 transition-colors duration-150';
  return <li className="border-b border-border last:border-b-0">{to ? <Link to={to} className={`${cls} hover:bg-surface-sunken`}>{body}</Link> : <div className={cls}>{body}</div>}</li>;
};

/** Dashboard bo'lim sarlavhasi — guruhlar orasida ritm (32px) va ierarxiya. */
const SectionHead: FC<{ title: string; text: string }> = ({ title, text }) => (
  <div className="mt-5 flex items-end justify-between gap-4">
    <div>
      <h2 className="text-lg font-bold text-text">{title}</h2>
      <p className="mt-0.5 text-base text-text-muted">{text}</p>
    </div>
  </div>
);

/** Haftalik yig'indi (90 kunlik nuqtali matritsa uchun). */
function weekly(labels: string[], values: number[]): { labels: string[]; values: number[] } {
  const out = { labels: [] as string[], values: [] as number[] };
  for (let end = values.length; end > 0; end -= 7) {
    const start = Math.max(0, end - 7);
    out.labels.unshift(labels[start]);
    out.values.unshift(values.slice(start, end).reduce((a, b) => a + b, 0));
  }
  return out;
}

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
    return { labels, orders, visitors, views, matrix, totalReq, conversion, visitorsPerDay, bestIdx, peak, since, partial, visitorsDelta };
  }, [stats]);

  const statusTotal = stats ? stats.status.new + stats.status.contacted + stats.status.done : 0;

  const attention = data ? [
    data.newOrders > 0 && { icon: Tray, title: t('dashboard.newOrders.label'), note: t('dashboard.newOrders.note'), n: data.newOrders, to: '/admin/orders' },
    data.needsImage > 0 && { icon: ImageBroken, title: t('dashboard.needsImage.label'), note: t('dashboard.needsImage.note'), n: data.needsImage, to: '/admin/products?f=needs_image' },
    data.configuratorUntagged > 0 && { icon: Cpu, title: t('dashboard.configurator.label'), note: t('dashboard.configurator.note'), n: data.configuratorUntagged, to: '/admin/products/configurator?f=untagged' },
    data.newApplications > 0 && { icon: Users, title: t('dashboard.newApplications.label'), note: t('dashboard.newApplications.note'), n: data.newApplications, to: '/admin/orders/applications' },
  ].filter(Boolean) as { icon: PhIcon; title: string; note: string; n: number; to: string }[] : [];

  return (
    <Page
      title={t('dashboard.title')}
      description={range ? t('dashboard.subtitleRange', { range: rangeLabel(range) }) : t('dashboard.subtitle', { days })}
      actions={
        <>
          <Segmented
            label={t('dashboard.period.label')}
            value={range ? '' : String(days)}
            onChange={setPeriod}
            options={PERIODS.map((p) => ({ id: String(p), label: t(`dashboard.period.d${p}` as 'dashboard.period.d7') }))}
            className="max-sm:hidden"
          />
          <DateRangePicker value={range} onChange={setPeriod} className="max-sm:hidden" />
          <Button to="/admin/products/new" className="max-sm:hidden"><Plus weight="bold" />{t('dashboard.newProduct')}</Button>
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2 sm:hidden">
        <Segmented
          label={t('dashboard.period.label')}
          value={range ? '' : String(days)}
          onChange={setPeriod}
          options={PERIODS.map((p) => ({ id: String(p), label: t(`dashboard.period.d${p}` as 'dashboard.period.d7') }))}
        />
        <DateRangePicker value={range} onChange={setPeriod} />
      </div>

      {defaultPw && (
        <div className="stagger mb-4 flex flex-wrap items-center gap-3 rounded-surface border border-danger/20 bg-danger-soft px-4 py-3 text-base text-danger-strong">
          <WarningCircle weight="fill" className="size-5 shrink-0 text-danger" />
          <span className="min-w-0 flex-1"><Trans t={t} i18nKey="dashboard.defaultPassword" components={{ b: <b /> }} /></span>
          <Button variant="outline" size="sm" to="/admin/settings/account">{t('dashboard.changePassword')}</Button>
        </div>
      )}

      {!stats || !derived ? (
        statsError ? (
          <EmptyState
            icon={<WarningCircle />}
            title={t('dashboard.loadErrorTitle')}
            text={t('dashboard.loadErrorText')}
            action={<Button variant="secondary" onClick={() => setReload(reload + 1)}>{t('common:retry')}</Button>}
          />
        ) : (
          <div className="flex flex-col gap-4" aria-busy="true">
            <div className="skeleton h-[150px] rounded-surface" />
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]"><div className="skeleton h-[380px] rounded-surface" /><div className="skeleton h-[380px] rounded-surface" /></div>
          </div>
        )
      ) : (
        <div className="flex flex-col gap-4">
          <div className="stagger" style={{ ['--i' as string]: 0 } as Record<string, number>}>
            <KpiStrip>
              <Kpi
                icon={Receipt} hue="orange" label={t('dashboard.kpi.orders.label')} value={stats.totals.orders}
                delta={pctChange(stats.totals.orders, stats.totals.ordersPrev)}
                note={t('dashboard.kpi.orders.note', { n: stats.totals.consults })}
                spark={stats.series.map((s) => s.orders)} to="/admin/orders"
              />
              <Kpi
                icon={Eye} hue="violet" label={t('dashboard.kpi.visitors.label')} value={stats.totals.visitors}
                delta={derived.visitorsDelta}
                note={t('dashboard.kpi.visitors.note', { n: formatThousands(stats.totals.views) })}
                spark={derived.visitors}
              />
              <Kpi
                icon={UserPlus} hue="blue" label={t('dashboard.kpi.customers.label')} value={stats.totals.customersNew}
                delta={pctChange(stats.totals.customersNew, stats.totals.customersNewPrev)}
                note={t('dashboard.kpi.customers.note', { n: formatThousands(stats.totals.customersTotal) })}
                spark={stats.series.map((s) => s.customers)} to="/admin/orders/customers"
              />
              <Kpi
                icon={ShoppingBagOpen} hue="green" label={t('dashboard.kpi.demand.label')} value={stats.totals.itemsRequested}
                unit={t('dashboard.kpi.demand.unit')}
                delta={pctChange(stats.totals.itemsRequested, stats.totals.itemsRequestedPrev)}
                note={t('dashboard.kpi.demand.note', { n: formatThousands(stats.totals.orders) || '0' })}
                spark={stats.series.map((s) => s.items)}
              />
            </KpiStrip>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="stagger" style={{ ['--i' as string]: 1 } as Record<string, number>}>
              <Card
                icon={ChartLineUp} hue="violet"
                title={t('dashboard.activity.title')}
                description={t('dashboard.activity.description')}
                actions={
                  <Segmented
                    label={t('dashboard.activity.title')} value={metric} onChange={setMetric} size="sm"
                    options={[{ id: 'visits', label: t('dashboard.activity.visits') }, { id: 'orders', label: t('dashboard.activity.orders') }]}
                  />
                }
                className="h-full"
              >
                <div className="grid grid-cols-3 gap-3 rounded-control bg-surface-sunken/60 p-3">
                  <div>
                    <p className="text-sm text-text-muted">{t('dashboard.activity.conversion')}</p>
                    <p className="mt-0.5 text-lg font-semibold tabular-nums text-text">{derived.conversion === null ? '—' : `${derived.conversion.toFixed(1).replace('.', ',')}%`}</p>
                    <p className="text-xs text-text-faint">{t('dashboard.activity.conversionHint')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">{metric === 'visits' ? t('dashboard.activity.visitors') : t('dashboard.activity.orders')}</p>
                    <p className="mt-0.5 text-lg font-semibold tabular-nums text-text">
                      {formatThousands(Math.round(metric === 'visits' ? derived.visitorsPerDay : derived.totalReq / stats.days)) || '0'}
                    </p>
                    <p className="text-xs text-text-faint">{t('dashboard.activity.perDay')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">{t('dashboard.activity.best')}</p>
                    <p className="mt-0.5 text-lg font-semibold tabular-nums text-text">{derived.bestIdx < 0 ? '—' : derived.labels[derived.bestIdx]}</p>
                    <p className="text-xs text-text-faint">{derived.bestIdx < 0 ? t('dashboard.activity.noVisits') : `${formatThousands(derived.visitors[derived.bestIdx] ?? 0)} · ${t('dashboard.activity.visitors').toLowerCase()}`}</p>
                  </div>
                </div>
                {(derived.partial || derived.since === null) && (
                  <p className="text-sm text-text-muted">
                    {derived.since === null ? t('dashboard.activity.notTracked') : t('dashboard.activity.trackedSince', { date: day(derived.since) })}
                  </p>
                )}
                {metric === 'visits' ? (
                  <div key="v" className="animate-fade-in">
                    <AreaChart
                      labels={derived.labels}
                      series={[
                        { name: t('dashboard.activity.views'), values: derived.views, hue: 'blue', variant: 'dotted' },
                        { name: t('dashboard.activity.visitors'), values: derived.visitors, hue: 'violet', variant: 'gradient' },
                      ]}
                      height={290}
                    />
                  </div>
                ) : (
                  <div key="o" className="animate-fade-in pt-2">
                    <BarChart
                      labels={derived.matrix.labels}
                      values={derived.matrix.values}
                      name={t('dashboard.activity.orders')}
                      hue="violet"
                      height={290}
                      buffer
                      highlightMax
                    />
                  </div>
                )}
              </Card>
            </div>

            <div className="stagger" style={{ ['--i' as string]: 2 } as Record<string, number>}>
              <Card
                icon={Receipt} hue="orange"
                title={t('dashboard.status.title')}
                description={t('dashboard.status.description')}
                className="h-full"
              >
                <div className="flex items-center gap-5">
                  <DonutChart
                    size={148}
                    center={{ value: formatThousands(statusTotal), label: t('dashboard.status.total') }}
                    items={(['new', 'contacted', 'done'] as const).map((k) => ({ name: to(`status.${k}`), value: stats.status[k], hue: STATUS_HUE[k] }))}
                  />
                  <ul className="flex min-w-0 flex-1 flex-col gap-2.5">
                    {(['new', 'contacted', 'done'] as const).map((k) => (
                      <li key={k} className="flex items-center justify-between gap-2 text-base">
                        <span className="flex min-w-0 items-center gap-2 text-text-muted">
                          <span className={`size-2.5 shrink-0 rounded-[3px] ${k === 'new' ? 'bg-c-blue' : k === 'contacted' ? 'bg-c-orange' : 'bg-c-green'}`} />
                          <span className="truncate">{to(`status.${k}`)}</span>
                        </span>
                        <span className="font-semibold tabular-nums text-text">{stats.status[k]}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-text">{t('dashboard.status.payment')}</p>
                  <SegmentBar items={[
                    { label: t('dashboard.status.cash'), value: stats.payment.cash, hue: 'green' },
                    { label: t('dashboard.status.installment'), value: stats.payment.installment, hue: 'violet' },
                  ]} />
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-text">{t('dashboard.status.sources')}</p>
                  <SegmentBar items={[
                    { label: t('dashboard.status.product'), value: stats.sources.product, hue: 'violet' },
                    { label: t('dashboard.status.cart'), value: stats.sources.cart, hue: 'orange' },
                    { label: t('dashboard.status.consult'), value: stats.sources.consult, hue: 'blue' },
                  ]} />
                </div>
                <Button variant="outline" to="/admin/orders" className="mt-auto w-full">
                  {stats.status.new > 0 && <Badge tone="info" className="-ml-1 h-5 px-1.5">{stats.status.new}</Badge>}
                  {t('dashboard.status.open')}
                </Button>
              </Card>
            </div>
          </div>

          <SectionHead title={t('dashboard.sections.products')} text={t('dashboard.sections.productsText')} />
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <div className="stagger" style={{ ['--i' as string]: 3 } as Record<string, number>}>
              <ProductTable
                icon={Sparkle} title={t('dashboard.top.title')} description={t('dashboard.top.description')} empty={t('dashboard.top.empty')}
                cols={[t('dashboard.top.cols.product'), t('dashboard.top.cols.requests'), t('dashboard.top.cols.qty')]}
                rows={stats.topProducts.map((p) => ({ id: p.productId, name: p.name, imageUrl: p.imageUrl, cells: [String(p.requests), String(p.qty)] }))}
              />
            </div>
            <div className="stagger" style={{ ['--i' as string]: 4 } as Record<string, number>}>
              <ProductTable
                icon={Eye} title={t('dashboard.viewed.title')} description={t('dashboard.viewed.description')} empty={t('dashboard.viewed.empty')}
                cols={[t('dashboard.top.cols.product'), t('dashboard.viewed.views')]}
                rows={stats.topViewed.map((p) => ({ id: p.productId, name: p.name, imageUrl: p.imageUrl, cells: [formatThousands(p.views)] }))}
              />
            </div>
            <div className="stagger lg:col-span-2 xl:col-span-1" style={{ ['--i' as string]: 5 } as Record<string, number>}>
              <Card icon={SquaresFour} hue="green" title={t('dashboard.categories.title')} description={t('dashboard.categories.description')} className="h-full">
                <CompareBarChart
                  labels={stats.categories.map((c) => c.name)}
                  current={stats.categories.map((c) => c.requests)}
                  previous={stats.categories.map((c) => c.requestsPrev)}
                  currentLabel={t('dashboard.categories.current')}
                  previousLabel={t('dashboard.categories.previous')}
                  hue="violet"
                  height={210}
                />
                <ul className="flex flex-col">
                  {stats.categories.map((c, i) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 border-b border-border py-2.5 text-base last:border-b-0">
                      <span className="flex items-center gap-2 font-medium text-text"><span className={`size-2.5 rounded-full ${HUE_DOT[CAT_HUES[i % CAT_HUES.length]]}`} />{c.name}</span>
                      <span className="font-semibold tabular-nums text-text">{t('dashboard.categories.count', { n: c.requests })}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>

          <SectionHead title={t('dashboard.sections.operations')} text={t('dashboard.sections.operationsText')} />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="stagger" style={{ ['--i' as string]: 6 } as Record<string, number>}>
              <Card
                padded={false}
                icon={Receipt} hue="blue"
                title={t('dashboard.recent.title')}
                actions={<Button variant="outline" size="sm" to="/admin/orders">{t('dashboard.recent.all')}<CaretRight weight="bold" /></Button>}
                className="h-full"
              >
                {stats.recentOrders.length === 0 ? (
                  <p className="px-5 pb-8 pt-4 text-center text-base text-text-muted">{t('dashboard.recent.empty')}</p>
                ) : (
                  <ul className="border-t border-border">
                    {stats.recentOrders.map((o) => (
                      <li key={o.id} className="border-b border-border last:border-b-0">
                        <Link to={`/admin/orders/${o.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-sunken/50">
                          <Initials name={o.name} />
                          <span className="min-w-0 flex-1 sm:w-48 sm:flex-none">
                            <span className="block truncate text-base font-medium text-text">{o.name}</span>
                            <span className="block truncate text-sm tabular-nums text-text-muted">№{o.id} · {timeAgo(o.createdAt)}</span>
                          </span>
                          <span className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
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
              </Card>
            </div>
            <div className="stagger" style={{ ['--i' as string]: 7 } as Record<string, number>}>
              <Card icon={Clock} hue="teal" title={t('dashboard.hours.title')} description={t('dashboard.hours.description')} className="h-full">
                <BarChart
                  labels={stats.hours.map((_, h) => `${String(h).padStart(2, '0')}:00`)}
                  values={stats.hours}
                  name={t('dashboard.hours.name')}
                  hue="teal"
                  height={210}
                  highlightMax
                />
                {stats.hours.some((h) => h > 0) && (
                  <p className="flex items-center gap-2 text-sm text-text-muted">
                    <span className="size-2 rounded-full bg-c-teal" />
                    {t('dashboard.hours.peak', { from: `${String(derived.peak).padStart(2, '0')}:00`, to: `${String((derived.peak + 1) % 24).padStart(2, '0')}:00` })}
                  </p>
                )}
              </Card>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="stagger" style={{ ['--i' as string]: 8 } as Record<string, number>}>
              <Card
                icon={Package} hue="violet"
                title={t('dashboard.catalog.title')} description={t('dashboard.catalog.description')}
                actions={<Button variant="outline" size="sm" to="/admin/products">{t('dashboard.catalog.open')}</Button>}
                className="h-full"
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-semibold tabular-nums text-text">{formatThousands(stats.catalog.onSite)}</span>
                  <span className="text-base text-text-muted">{t('dashboard.catalog.onSite').toLowerCase()} · {t('dashboard.catalog.ofTotal', { n: formatThousands(stats.catalog.total) })}</span>
                </div>
                <SegmentBar items={[
                  { label: t('dashboard.catalog.onSite'), value: stats.catalog.onSite, hue: 'green' },
                  { label: t('dashboard.catalog.hidden'), value: stats.catalog.hidden, hue: 'slate' },
                ]} />
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: t('dashboard.catalog.needsImage'), n: stats.catalog.needsImage, href: '/admin/products?f=needs_image' },
                    { label: t('dashboard.catalog.outOfStock'), n: stats.catalog.outOfStock, href: '/admin/products?f=stock0' },
                    { label: t('dashboard.catalog.onOrder'), n: stats.catalog.onOrder, href: '/admin/products' },
                  ].map((x) => (
                    <Link key={x.label} to={x.href} className="rounded-control bg-surface-sunken p-3.5 transition-colors hover:bg-surface-sunken-hover">
                      <p className="text-xl font-semibold tabular-nums text-text">{formatThousands(x.n) || '0'}</p>
                      <p className="mt-0.5 text-sm text-text-muted">{x.label}</p>
                    </Link>
                  ))}
                </div>
              </Card>
            </div>
            <div className="stagger" style={{ ['--i' as string]: 9 } as Record<string, number>}>
              <section className="flex h-full min-w-0 flex-col overflow-hidden rounded-surface bg-surface-sunken">
                <CardHead icon={WarningCircle} title={t('dashboard.attention.title')} description={t('dashboard.attention.description')} />
                <ul className="border-t border-border">
                  {attention.map((a) => (
                    <AttentionRow key={a.title} icon={a.icon} title={a.title} note={a.note} to={a.to} right={<span className="text-base font-semibold tabular-nums text-text">{a.n}</span>} />
                  ))}
                  {data && (
                    <AttentionRow
                      icon={ArrowsClockwise}
                      title={t('dashboard.billz.title')}
                      note={billzStatusText(data.billz).text}
                      to={data.billz.configured ? undefined : '/admin/settings/integrations'}
                      right={data.billz.configured ? <Button variant="outline" size="sm" onClick={sync} disabled={busy || running}>{t('dashboard.billz.refresh')}</Button> : undefined}
                    />
                  )}
                  {data && (
                    <AttentionRow
                      icon={CurrencyDollar}
                      title={`${t('dashboard.usd.title')}: ${formatThousands(data.usd.rate) || '—'}`}
                      note={data.usd.auto ? t('dashboard.usd.autoNote') : t('dashboard.usd.manualNote')}
                      to="/admin/settings/payment"
                    />
                  )}
                </ul>
                {attention.length === 0 && <p className="mx-6 mb-5 mt-1 rounded-control bg-success-soft px-3 py-2 text-sm text-success-strong">{t('dashboard.attention.allGood')}</p>}
                {error && <p className="mx-6 mb-5 text-sm text-danger-text">{t('dashboard.loadErrorText')}</p>}
              </section>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
};

export default Dashboard;
