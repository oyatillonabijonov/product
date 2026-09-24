import { useEffect, useMemo, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ApiJobApplication, OrderStatus } from '../../../shared/types';
import { safeHref } from '../../../shared/safe-href';
import { listJobApplications, setJobApplicationStatus } from '../api';
import { errText } from '../errText';
import { formatDateTime } from '../lib/format';
import { applicationStatusLabels, filterInbox, parseStatus, statusSegments, telHref } from '../lib/inbox';
import { StatusSelect } from '../StatusControls';
import { Badge, Button, Card, DataTable, EmptyState, Pagination, SearchInput, Segmented, Skeleton, type Column } from '../ui';
import { useToast } from '../ui/toast';

const PAGE_SIZE = 20;
const LIST = '/admin/orders/applications';

/**
 * Ish arizalari (spec §5) — buyurtmalar ro'yxati naqshi: filtrlar URL'da (`status` sukut «Yangi», `q`, `page`),
 * holat qatorda darhol saqlanadi. Rezyume havolasi faqat `safeHref` o'tkazsa chiziladi; ustun `xl`dan.
 * ponytail: API oxirgi 200 ta arizani beradi.
 */
const ApplicationsList: FC<{ onCountsChange: () => void }> = ({ onCountsChange }) => {
  const { t } = useTranslation(['orders', 'common']);
  const labels = applicationStatusLabels();
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const status = parseStatus(params.get('status'));
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [rawItems, setItems] = useState(null as ApiJobApplication[] | null);
  const items = rawItems as ApiJobApplication[] | null;
  const [error, setError] = useState('');

  function load() {
    setError('');
    listJobApplications().then(setItems).catch(() => setError(t('shared.loadError')));
  }
  useEffect(load, []);

  /** URL parametrini yozadi; filtr o'zgarsa sahifa 1 ga qaytadi. */
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  }

  const filtered = useMemo(() => filterInbox(items ?? [], status, q), [items, status, q]);
  const newCount = (items ?? []).filter((a) => a.status === 'new').length;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function changeStatus(a: ApiJobApplication, next: OrderStatus) {
    // Optimistik: qator darhol almashadi, xato bo'lsa qaytadi.
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

  const columns: Column<ApiJobApplication>[] = [
    {
      id: 'who', label: t('shared.candidate'), mobile: 'title',
      cell: (a) => (
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-primary md:max-w-48">{a.name}</span>
          <span className="flex flex-wrap items-center gap-1.5">
            <a href={telHref(a.phone)} className="press whitespace-nowrap text-label text-link">{a.phone}</a>
            {!a.telegramSent && <Badge tone="danger">{t('shared.tgNotSent')}</Badge>}
          </span>
        </span>
      ),
    },
    { id: 'position', label: t('shared.position'), cell: (a) => <span className="block max-w-56 truncate text-muted">{a.position}</span> },
    {
      id: 'resume', label: t('shared.resumeLabel'), className: 'hidden xl:table-cell',
      cell: (a) => {
        const href = safeHref(a.resumeUrl);
        return href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="press inline-flex items-center gap-1 text-label text-link">
            {t('applicationsList.open')} <ExternalLink aria-hidden className="size-3.5" />
          </a>
        ) : (
          <span className="text-muted-2">—</span>
        );
      },
    },
    { id: 'date', label: t('shared.date'), cell: (a) => <span className="whitespace-nowrap text-label text-muted">{formatDateTime(a.createdAt)}</span> },
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          label={t('shared.status')}
          value={status}
          onChange={(v) => update('status', v === 'new' ? '' : v)}
          options={statusSegments(labels, newCount)}
        />
        <div className="lg:w-64">
          <SearchInput value={q} onChange={(v) => update('q', v)} placeholder={t('shared.searchPlaceholder')} />
        </div>
      </div>

      {error ? (
        <EmptyState title={t('shared.loadErrorTitle')} text={error} action={<Button variant="secondary" onClick={load}>{t('common:retry')}</Button>} />
      ) : !items ? (
        <Skeleton rows={8} />
      ) : (
        <>
          <p className="text-label text-muted">{t('applicationsList.count', { count: filtered.length })}</p>
          <Card padded={false}>
            <div className="px-2 py-1">
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(a) => String(a.id)}
                onRowClick={(a) => navigate(`${LIST}/${a.id}`, { state: { search: params.toString() } })}
                empty={empty}
              />
            </div>
          </Card>
          <Pagination page={safePage} pageCount={pageCount} onChange={(p) => update('page', String(p))} />
        </>
      )}
    </div>
  );
};

export default ApplicationsList;
