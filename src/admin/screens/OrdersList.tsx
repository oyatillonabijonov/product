import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ArrowRight, ChatCircleText, CheckCircle, Clock, Kanban as KanbanIcon, ListBullets, Package, Phone, Tray, WarningCircle } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { ApiOrder, OrderStatus } from '../../../shared/types';
import { getOrderCounts, listOrders, setOrderStatus } from '../api';
import { errText } from '../errText';
import { formatDateTime, formatSum } from '../lib/format';
import { orderStatusLabels, filterInbox, orderSummary, orderTotal, STATUSES, telHref } from '../lib/inbox';
import { StatTile, StatusSelect } from '../StatusControls';
import { Badge, Button, DataTable, EmptyState, Kanban, Pagination, SearchInput, Segmented, type Column, type Hue, type KanbanColumn } from '../ui';
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
 * Sanoqlar aniq: API yopilmagan buyurtmalarning hammasini beradi, bajarilganlardan oxirgi 200 tasini; qolgan
 * bajarilganlar soni `?counts=1`dan (`hiddenDone`). Summa ko'rsatilmaydi — sayt sotuvni bilmaydi (egasining qarori).
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

  // Ro'yxatga sig'magan (200 tadan eski) bajarilgan buyurtmalar soni — «Bajarildi» sanog'i shular bilan to'liq.
  const [rawHidden, setHiddenDone] = useState(0);
  const hiddenDone = rawHidden as number;

  function load() {
    setError('');
    Promise.all([listOrders(), getOrderCounts()]).then(([list, counts]) => {
      setItems(list);
      setHiddenDone(Math.max(0, counts.done - list.filter((o) => o.status === 'done').length));
    }).catch(() => setError(t('shared.loadError')));
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
    return {
      new: all.filter((o) => o.status === 'new').length,
      contacted: all.filter((o) => o.status === 'contacted').length,
      done: all.filter((o) => o.status === 'done').length + hiddenDone,
    };
  }, [items, hiddenDone]);

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


  /** Ixcham CRM kartasi: tovar eskizi, mijoz va tarkib, summa va to'lov turi, pastda raqam, telefon, vaqt va keyingi holat. */
  const card = (o: ApiOrder, move: (to: string) => void) => {
    const total = orderTotal(o);
    const first = o.items[0];
    const img = first ? o.images?.[first.productId] : undefined;
    const consult = o.source === 'consult';
    return (
      <article
        onClick={() => navigate(`${LIST}/${o.id}`, { state: { search: params.toString() } })}
        className="group rounded-control-lg border border-border bg-surface p-3.5"
      >
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-control bg-surface-sunken">
            {consult
              ? <ChatCircleText weight="fill" className="size-5 text-text-muted" />
              : img ? <img src={img} alt="" className="size-full object-contain p-0.5" /> : <Package className="size-4 text-text-faint" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-text group-hover:text-accent-text">{o.name}</p>
            <p className="truncate text-sm text-text-faint">{consult ? (o.note || t('source.consult')) : orderSummary(o)}</p>
          </div>
          {!o.telegramSent && <span title={t('shared.tgNotSent')} className="flex h-[1lh] items-center text-base"><WarningCircle weight="fill" className="size-4 text-danger" /></span>}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          {total != null ? <span className="text-md font-bold tabular-nums text-text">{compact(total)}</span> : <span />}
          {consult
            ? <Badge tone="info" className="h-6">{t('source.consult')}</Badge>
            : o.paymentKind === 'installment'
              ? <Badge tone="accent" className="h-6">{t('source.installment')}{o.termMonths ? ` · ${t('board.term', { n: o.termMonths })}` : ''}</Badge>
              : <Badge className="h-6">{t('source.cash')}</Badge>}
        </div>
        <div className="mt-3 flex items-center gap-3 text-sm text-text-faint">
          <span className="tabular-nums">№{o.id}</span>
          <a
            href={telHref(o.phone)}
            onClick={(e: { stopPropagation: () => void }) => e.stopPropagation()}
            title={t('shared.call')}
            className="flex min-w-0 items-center gap-1 tabular-nums transition-colors hover:text-text"
          >
            <Phone weight="fill" className="size-3.5 shrink-0" /><span className="truncate">{o.phone}</span>
          </a>
          <span className="ml-auto shrink-0 tabular-nums">{timeAgo(o.createdAt)}</span>
          <button
            type="button"
            onClick={(e: { stopPropagation: () => void }) => { e.stopPropagation(); move(NEXT[o.status]); }}
            title={t(`board.next.${o.status}`)}
            aria-label={t(`board.next.${o.status}`)}
            className="-my-1 -mr-1 grid size-7 shrink-0 place-items-center rounded-full text-text-muted transition-colors hover:bg-primary hover:text-text-on-primary"
          >
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
    // «Bajarildi» ustunida kartalar qisqartirilgan — sarlavhadagi son esa haqiqiysi (filtrsiz holatda hammasi).
    count: s === 'done' ? doneCount + (q || kind !== 'all' ? 0 : hiddenDone) : undefined,
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
      <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 max-sm:[&>*:last-child]:col-span-2">
        <StatTile icon={Tray} hue="blue" label={t('board.statNew')}><CountUp value={stats.new} /></StatTile>
        <StatTile icon={Clock} hue="orange" label={t('board.statContacted')}><CountUp value={stats.contacted} /></StatTile>
        <StatTile icon={CheckCircle} hue="green" label={t('board.statDone')}><CountUp value={stats.done} /></StatTile>
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
            <DataTable
              columns={listColumns}
              rows={filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)}
              rowKey={(o) => String(o.id)}
              onRowClick={(o) => navigate(`${LIST}/${o.id}`, { state: { search: params.toString() } })}
              empty={<div className="p-6"><EmptyState title={t('shared.notFoundTitle')} text={t('shared.notFoundText')} action={<Button variant="secondary" onClick={() => update('q', '')}>{t('shared.clearSearch')}</Button>} /></div>}
            />
            <Pagination page={safePage} pageCount={pageCount} total={filtered.length} onChange={(p) => update('page', String(p))} />
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersList;
