import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ArrowRight, ChatCircleText, CheckCircle, Clock, Kanban as KanbanIcon, ListBullets, Package, Phone, Tray, Wallet, WarningCircle } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { ApiOrder, OrderStatus } from '../../../shared/types';
import { listOrders, setOrderStatus } from '../api';
import { errText } from '../errText';
import { formatDateTime, formatSum } from '../lib/format';
import { orderStatusLabels, filterInbox, orderSummary, orderTotal, STATUSES, telHref } from '../lib/inbox';
import { StatTile, StatusSelect } from '../StatusControls';
import { Badge, Button, Card, DataTable, EmptyState, Kanban, Pagination, SearchInput, Segmented, type Column, type Hue, type KanbanColumn } from '../ui';
import { CountUp } from '../ui/stats';
import { compact } from '../charts';
import { timeAgo } from '../lib/ago';
import { useToast } from '../ui/toast';

const PAGE_SIZE = 20;
const LIST = '/admin/orders';
const HUE: Record<OrderStatus, Hue> = { new: 'blue', contacted: 'orange', done: 'green' };
const NEXT: Record<OrderStatus, OrderStatus> = { new: 'contacted', contacted: 'done', done: 'new' };
/** «Bajarildi» ustuni uzayib ketmasin — avval shuncha karta, qolgani tugma bilan. */
const DONE_LIMIT = 12;

/**
 * Buyurtmalar (v2, egasining talabi — CRM'dagi kabi kanban): uch ustun — Yangi · Bog'lanildi · Bajarildi.
 * Karta boshqa ustunga sudralsa yoki kartadagi «→» tugmasi bosilsa holat darhol saqlanadi (optimistik) va
 * sidebar sanog'i yangilanadi. Tepada holatlar bo'yicha raqamlar, qidiruv va turi filtri; `view=list` —
 * qidiruv/sahifalash uchun jadval ko'rinishi. Filtrlar URL'da.
 * ponytail: API oxirgi 200 ta buyurtmani beradi — ko'proq kerak bo'lsa server tomonda sahifalash.
 */
const OrdersList: FC<{ onCountsChange: () => void }> = ({ onCountsChange }) => {
  const sum = useTranslation('common').t('sum');
  const { t } = useTranslation(['orders', 'common']);
  const labels = orderStatusLabels();
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'list' ? 'list' : 'board';
  const kind = params.get('kind') === 'products' || params.get('kind') === 'consults' ? (params.get('kind') as string) : 'all';
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [rawItems, setItems] = useState(null as ApiOrder[] | null);
  const items = rawItems as ApiOrder[] | null;
  const [error, setError] = useState('');
  const [rawShowAll, setShowAll] = useState(false);
  const showAllDone = rawShowAll as boolean;

  function load() {
    setError('');
    listOrders().then(setItems).catch(() => setError(t('shared.loadError')));
  }
  useEffect(load, []);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true, preventScrollReset: true });
  }

  const filtered = useMemo(() => {
    const byKind = (items ?? []).filter((o) => (kind === 'products' ? o.source !== 'consult' : kind === 'consults' ? o.source === 'consult' : true));
    return filterInbox(byKind, 'all', q);
  }, [items, kind, q]);

  const stats = useMemo(() => {
    const all = items ?? [];
    const weekAgo = Date.now() / 1000 - 7 * 86400;
    return {
      new: all.filter((o) => o.status === 'new').length,
      contacted: all.filter((o) => o.status === 'contacted').length,
      done7: all.filter((o) => o.status === 'done' && o.createdAt >= weekAgo).length,
      open: all.filter((o) => o.status !== 'done').reduce((s, o) => s + (orderTotal(o) ?? 0), 0),
    };
  }, [items]);

  async function changeStatus(o: ApiOrder, next: OrderStatus) {
    const put = (s: OrderStatus) => setItems((xs: ApiOrder[] | null) => xs && xs.map((x) => (x.id === o.id ? { ...x, status: s } : x)));
    put(next);
    try {
      await setOrderStatus(o.id, next);
      toast(`${o.name} — ${labels[next]}`);
      onCountsChange();
    } catch (e) {
      put(o.status);
      toast(errText(e), 'error');
    }
  }


  /** CRM kartasi: raqam va vaqt, mijoz, telefon (qo'ng'iroq tugmasi), tovarlar eskizi, summa va to'lov turi. */
  const card = (o: ApiOrder, move: (to: string) => void) => {
    const total = orderTotal(o);
    const first = o.items[0];
    const img = first ? o.images?.[first.productId] : undefined;
    return (
      <article
        onClick={() => navigate(`${LIST}/${o.id}`, { state: { search: params.toString() } })}
        className="group rounded-control bg-surface p-4 transition-transform duration-200 hover:-translate-y-px"
      >
        <div className="flex items-center justify-between gap-2 text-sm text-text-faint">
          <span className="tabular-nums">№{o.id} · {timeAgo(o.createdAt)}</span>
          {!o.telegramSent && <span title={t('shared.tgNotSent')}><WarningCircle weight="fill" className="size-4 text-danger" /></span>}
        </div>
        <p className="mt-1.5 truncate text-base font-semibold text-text">{o.name}</p>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <a href={telHref(o.phone)} onClick={(e: { stopPropagation: () => void }) => e.stopPropagation()} className="truncate text-sm tabular-nums text-text-muted hover:text-text hover:underline">{o.phone}</a>
          <a
            href={telHref(o.phone)}
            onClick={(e: { stopPropagation: () => void }) => e.stopPropagation()}
            aria-label={t('shared.call')}
            title={t('shared.call')}
            className="grid size-8 shrink-0 place-items-center rounded-full text-text-muted transition-colors hover:bg-surface-sunken hover:text-text"
          >
            <Phone weight="fill" className="size-3.5" />
          </a>
        </div>
        <div className="mt-3 flex items-center gap-2.5 rounded-item bg-surface-sunken p-2">
          {o.source === 'consult' ? (
            <span className="grid size-9 shrink-0 place-items-center text-text-muted"><ChatCircleText weight="fill" className="size-5" /></span>
          ) : (
            <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-[7px] bg-surface">
              {img ? <img src={img} alt="" className="size-full object-contain p-0.5" /> : <Package className="size-4 text-text-faint" />}
            </span>
          )}
          <span className="line-clamp-2 min-w-0 flex-1 text-sm text-text">{o.source === 'consult' ? (o.note || t('source.consult')) : orderSummary(o)}</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="flex min-w-0 flex-wrap items-center gap-1.5">
            {o.source === 'consult'
              ? <Badge tone="info">{t('source.consult')}</Badge>
              : o.paymentKind === 'installment'
                ? <Badge tone="accent">{t('source.installment')}{o.termMonths ? ` · ${t('board.term', { n: o.termMonths })}` : ''}</Badge>
                : <Badge tone="neutral">{t('source.cash')}</Badge>}
          </span>
          {total != null && <span className="shrink-0 text-base font-bold tabular-nums text-text">{compact(total)}</span>}
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={(e: { stopPropagation: () => void }) => { e.stopPropagation(); move(NEXT[o.status]); }}
            className="inline-flex h-7 items-center gap-1 rounded-full bg-surface-sunken px-3 text-sm font-medium text-text-muted transition-colors hover:bg-primary hover:text-text-on-primary"
          >
            {t(`board.next.${o.status}`)}
            <ArrowRight weight="bold" className="size-3.5" />
          </button>
        </div>
      </article>
    );
  };

  const doneCount = filtered.filter((o) => o.status === 'done').length;
  const boardItems = showAllDone ? filtered : (() => {
    let n = 0;
    return filtered.filter((o) => o.status !== 'done' || n++ < DONE_LIMIT);
  })();
  const columns: KanbanColumn[] = STATUSES.map((s) => ({
    id: s,
    label: labels[s],
    hue: HUE[s],
    hint: t(`board.hint${s === 'new' ? 'New' : s === 'contacted' ? 'Contacted' : 'Done'}` as 'board.hintNew'),
    footer: s === 'done' && !showAllDone && doneCount > DONE_LIMIT
      ? <button type="button" onClick={() => setShowAll(true)} className="w-full rounded-item py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface hover:text-text">{t('board.moreDone', { n: doneCount - DONE_LIMIT })}</button>
      : undefined,
  }));

  const listColumns: Column<ApiOrder>[] = [
    {
      id: 'who', label: t('shared.customer'), mobile: 'title',
      cell: (o) => (
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate font-medium text-text md:max-w-48">{o.name}</span>
          <a href={telHref(o.phone)} className="whitespace-nowrap text-sm text-text-muted hover:text-text hover:underline">{o.phone}</a>
        </span>
      ),
    },
    { id: 'items', label: t('shared.items'), className: 'hidden xl:table-cell', cell: (o) => <span className="block max-w-64 truncate text-text-muted">{orderSummary(o)}</span> },
    { id: 'sum', label: t('ordersList.sumColumn'), align: 'right', cell: (o) => <span className="whitespace-nowrap font-medium tabular-nums">{formatSum(orderTotal(o), sum)}</span> },
    { id: 'date', label: t('shared.date'), cell: (o) => <span className="whitespace-nowrap text-sm tabular-nums text-text-muted">{formatDateTime(o.createdAt)}</span> },
    { id: 'status', label: t('shared.status'), cell: (o) => <StatusSelect value={o.status} labels={labels} onChange={(s) => changeStatus(o, s)} ariaLabel={t('shared.statusAria', { name: o.name })} /> },
  ];
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  return (
    <div className="flex flex-col gap-6">
      <div className="stagger grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile icon={Tray} hue="blue" label={t('board.statNew')}><CountUp value={stats.new} /></StatTile>
        <StatTile icon={Clock} hue="orange" label={t('board.statContacted')}><CountUp value={stats.contacted} /></StatTile>
        <StatTile icon={CheckCircle} hue="green" label={t('board.statDone')}><CountUp value={stats.done7} /></StatTile>
        <StatTile icon={Wallet} hue="violet" label={t('board.statValue')}>
          <CountUp value={stats.open} format={compact} />
          <span className="text-base font-medium text-text-muted">{sum}</span>
        </StatTile>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="lg:w-64 xl:w-72"><SearchInput value={q} onChange={(v) => update('q', v)} placeholder={t('shared.searchPlaceholder')} /></div>
          <Segmented
            label={t('board.filter')} size="sm" value={kind} onChange={(v) => update('kind', v === 'all' ? '' : v)}
            options={[{ id: 'all', label: t('board.all') }, { id: 'products', label: t('board.products') }, { id: 'consults', label: t('board.consults') }]}
          />
          <span className="flex-1" />
          <Segmented
            label={t('board.view')} size="sm" value={view} onChange={(v) => update('view', v === 'board' ? '' : v)}
            options={[{ id: 'board', label: t('board.viewBoard'), icon: KanbanIcon }, { id: 'list', label: t('board.viewList'), icon: ListBullets }]}
          />
        </div>

        {error ? (
          <EmptyState icon={<WarningCircle />} title={t('shared.loadErrorTitle')} text={error} action={<Button variant="secondary" onClick={load}>{t('common:retry')}</Button>} />
        ) : !items ? (
          <div className="grid gap-4 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-[420px] rounded-surface" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Tray />} title={t('ordersList.emptyAllTitle')} text={t('ordersList.emptyAllText')} />
        ) : view === 'board' ? (
          <>
            <Kanban
              columns={columns}
              items={boardItems}
              columnOf={(o) => o.status}
              keyOf={(o) => String(o.id)}
              renderCard={card}
              onMove={(o, to) => changeStatus(o, to as OrderStatus)}
              empty={() => (q ? t('shared.notFoundTitle') : t('board.emptyColumn'))}
            />
            <p className="hidden text-center text-sm text-text-faint lg:block">{t('board.dragHint')}</p>
          </>
        ) : (
          <div>
            <Card padded={false}>
              <DataTable
                columns={listColumns}
                rows={filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)}
                rowKey={(o) => String(o.id)}
                onRowClick={(o) => navigate(`${LIST}/${o.id}`, { state: { search: params.toString() } })}
                empty={<div className="p-6"><EmptyState title={t('shared.notFoundTitle')} text={t('shared.notFoundText')} action={<Button variant="secondary" onClick={() => update('q', '')}>{t('shared.clearSearch')}</Button>} /></div>}
              />
            </Card>
            <Pagination page={safePage} pageCount={pageCount} total={filtered.length} onChange={(p) => update('page', String(p))} />
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersList;
