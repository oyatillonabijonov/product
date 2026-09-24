import { useEffect, useMemo, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { ApiOrder, OrderStatus } from '../../../shared/types';
import { listOrders, setOrderStatus } from '../api';
import { errText } from '../errText';
import { formatDateTime, formatSum } from '../lib/format';
import { orderStatusLabels, filterInbox, orderSummary, orderTotal, parseStatus, statusSegments, telHref } from '../lib/inbox';
import { StatusSelect } from '../StatusControls';
import { Badge, Button, Card, DataTable, EmptyState, Pagination, SearchInput, Segmented, Skeleton, type Column } from '../ui';
import { useToast } from '../ui/toast';

const PAGE_SIZE = 20;
const LIST = '/admin/orders';

/**
 * Buyurtmalar va konsultatsiya arizalari (spec §5). Filtrlar URL'da — `status` (sukut «Yangi»: ro'yxat kiruvchi
 * quti bo'lib ochiladi, dashboard havolasi shu yerga), `q` (ism yoki telefon), `page`. Holat qatorda darhol
 * saqlanadi va sidebar sanog'i yangilanadi; «Yangi» filtrida holati o'zgargan qator ro'yxatdan chiqadi.
 * Tarkib ustuni `xl`dan — 1024px'da jadval sig'sin (mobil kartada doim bor).
 * ponytail: API oxirgi 200 ta buyurtmani beradi — ko'proq kerak bo'lsa server tomonda sahifalash.
 */
const OrdersList: FC<{ onCountsChange: () => void }> = ({ onCountsChange }) => {
  const sum = useTranslation('common').t('sum');
  const { t } = useTranslation(['orders', 'common']);
  const labels = orderStatusLabels();
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const status = parseStatus(params.get('status'));
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [rawItems, setItems] = useState(null as ApiOrder[] | null);
  const items = rawItems as ApiOrder[] | null;
  const [error, setError] = useState('');

  function load() {
    setError('');
    listOrders().then(setItems).catch(() => setError(t('shared.loadError')));
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
  const newCount = (items ?? []).filter((o) => o.status === 'new').length;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function changeStatus(o: ApiOrder, next: OrderStatus) {
    // Optimistik: qator darhol almashadi, xato bo'lsa qaytadi.
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

  const columns: Column<ApiOrder>[] = [
    {
      id: 'who', label: t('shared.customer'), mobile: 'title',
      cell: (o) => (
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-primary md:max-w-48">{o.name}</span>
          <span className="flex flex-wrap items-center gap-1.5">
            <a href={telHref(o.phone)} className="press whitespace-nowrap text-label text-link">{o.phone}</a>
            {o.source === 'consult' && <Badge>{t('source.consult')}</Badge>}
            {o.source !== 'consult' && o.paymentKind === 'installment' && <Badge tone="info">{t('source.installment')}</Badge>}
            {!o.telegramSent && <Badge tone="danger">{t('shared.tgNotSent')}</Badge>}
          </span>
        </span>
      ),
    },
    {
      id: 'items', label: t('shared.items'), className: 'hidden xl:table-cell',
      cell: (o) => <span className="block max-w-56 truncate text-muted">{orderSummary(o)}</span>,
    },
    { id: 'sum', label: t('ordersList.sumColumn'), align: 'right', cell: (o) => <span className="whitespace-nowrap tabular-nums">{formatSum(orderTotal(o), sum)}</span> },
    { id: 'date', label: t('shared.date'), cell: (o) => <span className="whitespace-nowrap text-label text-muted">{formatDateTime(o.createdAt)}</span> },
    {
      id: 'status', label: t('shared.status'),
      cell: (o) => <StatusSelect value={o.status} labels={labels} onChange={(s) => changeStatus(o, s)} ariaLabel={t('shared.statusAria', { name: o.name })} />,
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
    empty = <EmptyState title={t('ordersList.emptyAllTitle')} text={t('ordersList.emptyAllText')} />;
  } else {
    empty = (
      <EmptyState
        title={status === 'new' ? t('ordersList.emptyNewTitle') : t('ordersList.emptyStatusTitle')}
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
          <p className="text-label text-muted">{t('ordersList.count', { count: filtered.length })}</p>
          <Card padded={false}>
            <div className="px-2 py-1">
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(o) => String(o.id)}
                onRowClick={(o) => navigate(`${LIST}/${o.id}`, { state: { search: params.toString() } })}
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

export default OrdersList;
