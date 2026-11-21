import { useEffect, useMemo, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ArrowRight, ArrowSquareOut, CalendarBlank, CheckCircle, Clock, FileText, Kanban as KanbanIcon, ListBullets, Phone, Tray, Users, WarningCircle } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { ApiJobApplication, OrderStatus } from '../../../shared/types';
import { safeHref } from '../../../shared/safe-href';
import { getJobApplicationCounts, listJobApplications, setJobApplicationStatus } from '../api';
import { errText } from '../errText';
import { formatDateTime } from '../lib/format';
import { applicationStatusLabels, filterInbox, parseStatus, STATUSES, statusSegments, telHref } from '../lib/inbox';
import { timeAgo } from '../lib/ago';
import { StatTile, StatusSelect } from '../StatusControls';
import { Avatar, Badge, Button, DataTable, EmptyState, Kanban, Pagination, SearchInput, Segmented, type Column, type Hue, type KanbanColumn } from '../ui';
import { CountUp } from '../ui/stats';
import { useToast } from '../ui/toast';

const PAGE_SIZE = 20;
const LIST = '/admin/orders/applications';
const HUE: Record<OrderStatus, Hue> = { new: 'blue', contacted: 'orange', done: 'green' };
const NEXT: Record<OrderStatus, OrderStatus> = { new: 'contacted', contacted: 'done', done: 'new' };
/** «Yopildi» ustuni uzayib ketmasin — avval shuncha karta, qolgani tugma bilan. */
const DONE_LIMIT = 12;
const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

/**
 * Ish arizalari (v2) — buyurtmalar kanbani naqshi: uch ustun — Yangi · Bog'lanildi · Yopildi. Karta boshqa ustunga
 * sudralsa yoki «→» bosilsa holat darhol saqlanadi (optimistik) va sidebar sanog'i yangilanadi. Tepada holatlar
 * bo'yicha raqamlar; `view=list` — jadval (holat filtri `status` sukut «Yangi», sahifalash). Filtrlar URL'da.
 * Rezyume havolasi faqat `safeHref` o'tkazsa chiziladi. ponytail: API oxirgi 200 ta arizani beradi.
 */
const ApplicationsList: FC<{ onCountsChange: () => void }> = ({ onCountsChange }) => {
  const { t } = useTranslation(['orders', 'common']);
  const labels = applicationStatusLabels();
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'list' ? 'list' : 'board';
  const status = parseStatus(params.get('status'));
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [rawItems, setItems] = useState(null as ApiJobApplication[] | null);
  const items = rawItems as ApiJobApplication[] | null;
  const [error, setError] = useState('');
  const [rawShowAll, setShowAll] = useState(false);
  const showAllDone = rawShowAll as boolean;

  // Aniq sanoq: ro'yxatga sig'magan yopilgan arizalar va oxirgi 7 kunda kelganlari (`?counts=1`).
  const [rawExtra, setExtra] = useState({ hiddenDone: 0, week: 0 });
  const extra = rawExtra as { hiddenDone: number; week: number };

  function load() {
    setError('');
    Promise.all([listJobApplications(), getJobApplicationCounts()]).then(([list, counts]) => {
      setItems(list);
      setExtra({ hiddenDone: Math.max(0, counts.done - list.filter((a) => a.status === 'done').length), week: counts.week });
    }).catch(() => setError(t('shared.loadError')));
  }
  useEffect(load, []);

  /** URL parametrini yozadi; filtr o'zgarsa sahifa 1 ga qaytadi. */
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true, preventScrollReset: true });
  }

  const searched = useMemo(() => filterInbox(items ?? [], 'all', q), [items, q]);
  const filtered = useMemo(() => (status === 'all' ? searched : searched.filter((a) => a.status === status)), [searched, status]);
  const stats = useMemo(() => {
    const all = items ?? [];
    return {
      new: all.filter((a) => a.status === 'new').length,
      contacted: all.filter((a) => a.status === 'contacted').length,
      done: all.filter((a) => a.status === 'done').length + extra.hiddenDone,
      week: extra.week,
    };
  }, [items, extra]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function changeStatus(a: ApiJobApplication, next: OrderStatus) {
    // Optimistik: karta/qator darhol almashadi, xato bo'lsa qaytadi.
    const put = (s: OrderStatus) =>
      setItems((xs: ApiJobApplication[] | null) => xs && xs.map((x) => (x.id === a.id ? { ...x, status: s } : x)));
    put(next);
    try {
      await setJobApplicationStatus(a.id, next);
      toast(`${a.name} — ${labels[next]}`);
      onCountsChange();
    } catch (e) {
      put(a.status);
      toast(errText(e), 'error');
    }
  }

  const open = (a: ApiJobApplication) => navigate(`${LIST}/${a.id}`, { state: { search: params.toString() } });

  /** Nomzod kartasi: avatar, ism va vaqt, lavozim, xabar boshi, telefon (qo'ng'iroq) va rezyume tugmalari, «→». */
  const card = (a: ApiJobApplication, move: (to: string) => void) => {
    const resume = safeHref(a.resumeUrl);
    return (
      <article onClick={() => open(a)} className="group rounded-control-lg border border-border bg-surface p-3.5">
        <div className="flex items-start gap-3">
          <Avatar name={a.name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-text group-hover:text-accent-text">{a.name}</p>
            <p className="truncate text-sm text-text-faint">{a.position}</p>
          </div>
          {!a.telegramSent && <span title={t('shared.tgNotSent')} className="flex h-[1lh] items-center text-base"><WarningCircle weight="fill" className="size-4 text-danger" /></span>}
        </div>
        {a.message && <p className="mt-2.5 line-clamp-2 text-sm text-text-muted">{a.message}</p>}
        <div className="mt-3 flex items-center gap-3 text-sm text-text-faint">
          <span className="tabular-nums">№{a.id}</span>
          <a href={telHref(a.phone)} onClick={stop} title={t('shared.call')} className="flex min-w-0 items-center gap-1 tabular-nums transition-colors hover:text-text">
            <Phone weight="fill" className="size-3.5 shrink-0" /><span className="truncate">{a.phone}</span>
          </a>
          {resume && (
            <a href={resume} target="_blank" rel="noopener noreferrer" onClick={stop} title={t('applicationDetail.resumeOpen')} aria-label={t('applicationDetail.resumeOpen')} className="shrink-0 transition-colors hover:text-text">
              <FileText weight="fill" className="size-3.5" />
            </a>
          )}
          <span className="ml-auto shrink-0 tabular-nums">{timeAgo(a.createdAt)}</span>
          <button
            type="button"
            onClick={(e: { stopPropagation: () => void }) => { e.stopPropagation(); move(NEXT[a.status]); }}
            title={t(`applicationsList.next.${a.status}`)}
            aria-label={t(`applicationsList.next.${a.status}`)}
            className="-my-1 -mr-1 grid size-7 shrink-0 place-items-center rounded-full text-text-muted transition-colors hover:bg-primary hover:text-text-on-primary"
          >
            <ArrowRight weight="bold" className="size-3.5" />
          </button>
        </div>
      </article>
    );
  };

  const doneCount = searched.filter((a) => a.status === 'done').length;
  const boardItems = showAllDone ? searched : (() => {
    let n = 0;
    return searched.filter((a) => a.status !== 'done' || n++ < DONE_LIMIT);
  })();
  const columns: KanbanColumn[] = STATUSES.map((s) => ({
    id: s,
    label: labels[s],
    hue: HUE[s],
    hint: t(`board.hint${s === 'new' ? 'New' : s === 'contacted' ? 'Contacted' : 'Done'}` as 'board.hintNew'),
    count: s === 'done' ? doneCount + (q ? 0 : extra.hiddenDone) : undefined,
    footer: s === 'done' && !showAllDone && doneCount > DONE_LIMIT
      ? <button type="button" onClick={() => setShowAll(true)} className="w-full rounded-item py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface hover:text-text">{t('board.moreDone', { n: doneCount - DONE_LIMIT })}</button>
      : undefined,
  }));

  const listColumns: Column<ApiJobApplication>[] = [
    {
      id: 'who', label: t('shared.candidate'), mobile: 'title',
      cell: (a) => (
        <span className="flex min-w-0 items-center gap-3">
          <Avatar name={a.name} size="sm" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-text md:max-w-48">{a.name}</span>
            <span className="flex flex-wrap items-center gap-1.5">
              <a href={telHref(a.phone)} className="whitespace-nowrap text-sm font-normal tabular-nums text-text-muted hover:text-text hover:underline">{a.phone}</a>
              {!a.telegramSent && <Badge tone="danger">{t('shared.tgNotSent')}</Badge>}
            </span>
          </span>
        </span>
      ),
    },
    { id: 'position', label: t('shared.position'), cell: (a) => <span className="block max-w-56 truncate text-text-muted">{a.position}</span> },
    {
      id: 'resume', label: t('shared.resumeLabel'), className: 'hidden xl:table-cell',
      cell: (a) => {
        const href = safeHref(a.resumeUrl);
        return href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-text hover:underline">
            {t('applicationsList.open')} <ArrowSquareOut aria-hidden className="size-3.5" />
          </a>
        ) : (
          <span className="text-text-faint">—</span>
        );
      },
    },
    { id: 'date', label: t('shared.date'), cell: (a) => <span className="whitespace-nowrap text-sm tabular-nums text-text-muted">{formatDateTime(a.createdAt)}</span> },
    {
      id: 'status', label: t('shared.status'),
      cell: (a) => <StatusSelect value={a.status} labels={labels} onChange={(s) => changeStatus(a, s)} ariaLabel={t('shared.statusAria', { name: a.name })} />,
    },
  ];

  let empty: ReactNode;
  if (q) {
    empty = (
      <EmptyState
        title={t('shared.notFoundTitle')}
        text={t('shared.notFoundText')}
        action={<Button variant="secondary" onClick={() => update('q', '')}>{t('shared.clearSearch')}</Button>}
      />
    );
  } else if (status === 'all') {
    empty = <EmptyState title={t('applicationsList.emptyAllTitle')} text={t('applicationsList.emptyAllText')} />;
  } else {
    empty = (
      <EmptyState
        title={status === 'new' ? t('applicationsList.emptyNewTitle') : t('applicationsList.emptyStatusTitle')}
        action={<Button variant="secondary" onClick={() => update('status', 'all')}>{t('shared.showAll')}</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="stagger grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile icon={Tray} hue="blue" label={t('board.statNew')}><CountUp value={stats.new} /></StatTile>
        <StatTile icon={Clock} hue="orange" label={t('board.statContacted')}><CountUp value={stats.contacted} /></StatTile>
        <StatTile icon={CheckCircle} hue="green" label={t('status.closed')}><CountUp value={stats.done} /></StatTile>
        <StatTile icon={CalendarBlank} hue="violet" label={t('applicationsList.statWeek')}><CountUp value={stats.week} /></StatTile>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="lg:w-64 xl:w-72"><SearchInput value={q} onChange={(v) => update('q', v)} placeholder={t('shared.searchPlaceholder')} /></div>
          {view === 'list' && (
            <Segmented
              label={t('shared.status')} size="sm" value={status}
              onChange={(v) => update('status', v === 'new' ? '' : v)}
              options={statusSegments(labels, stats.new)}
            />
          )}
          <span className="flex-1" />
          {view === 'list' && <p className="text-sm text-text-muted">{t('applicationsList.count', { count: filtered.length })}</p>}
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
          <EmptyState icon={<Users />} title={t('applicationsList.emptyAllTitle')} text={t('applicationsList.emptyAllText')} />
        ) : view === 'board' ? (
          <>
            <Kanban
              columns={columns}
              items={boardItems}
              columnOf={(a) => a.status}
              keyOf={(a) => String(a.id)}
              renderCard={card}
              onMove={(a, to) => changeStatus(a, to as OrderStatus)}
              empty={() => (q ? t('shared.notFoundTitle') : t('board.emptyColumn'))}
            />
            <p className="hidden text-center text-sm text-text-faint lg:block">{t('board.dragHint')}</p>
          </>
        ) : (
          <div>
            <DataTable
              columns={listColumns}
              rows={rows}
              rowKey={(a) => String(a.id)}
              onRowClick={open}
              empty={<div className="p-6">{empty}</div>}
            />
            <Pagination page={safePage} pageCount={pageCount} total={filtered.length} onChange={(p) => update('page', String(p))} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationsList;
