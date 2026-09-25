import { useEffect, useMemo, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { ApiAdminCustomer } from '../../../shared/types';
import { listCustomers } from '../api';
import { formatDateTime } from '../lib/format';
import { telHref } from '../lib/inbox';
import { Badge, Button, Card, DataTable, EmptyState, Pagination, SearchInput, Skeleton, type Column } from '../ui';

const PAGE_SIZE = 20;
const LIST = '/admin/orders/customers';

/**
 * Ro'yxatdan o'tgan mijozlar (Google yoki Telegram orqali kirganlar); qator bosilsa — mijoz va uning buyurtmalari. Qidiruv ism, email yoki
 * telefon raqamlari bo'yicha (raqamli so'rov bo'shliq/tiredan qat'i nazar); `q` va `page` URL'da, boshqa ro'yxatlar kabi.
 */
const CustomersList: FC = () => {
  const { t } = useTranslation(['orders', 'common']);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [rawItems, setItems] = useState(null as ApiAdminCustomer[] | null);
  const items = rawItems as ApiAdminCustomer[] | null;
  const [error, setError] = useState('');

  function load() {
    setError('');
    listCustomers().then(setItems).catch(() => setError(t('shared.loadError')));
  }
  useEffect(load, []);

  /** URL parametrini yozadi; qidiruv o'zgarsa sahifa 1 ga qaytadi. */
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items ?? [];
    const digits = /^[\d\s()+-]+$/.test(needle) ? needle.replace(/\D/g, '') : '';
    return (items ?? []).filter((c) => (digits
      ? (c.phone ?? '').replace(/\D/g, '').includes(digits)
      : c.name.toLowerCase().includes(needle) || (c.email ?? '').toLowerCase().includes(needle)));
  }, [items, q]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const columns: Column<ApiAdminCustomer>[] = [
    {
      id: 'who', label: t('shared.customer'), mobile: 'title',
      cell: (c) => (
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-primary md:max-w-56">{c.name || t('customersList.noName')}</span>
          <span className="text-label text-muted-2">ID №{c.id}</span>
        </span>
      ),
    },
    {
      id: 'contact', label: t('customersList.contact'),
      cell: (c) => (
        <span className="flex min-w-0 flex-col gap-0.5">
          {c.phone && <a href={telHref(c.phone)} className="press whitespace-nowrap text-label text-link">{c.phone}</a>}
          {c.email && <span className="truncate text-label text-muted md:max-w-56">{c.email}</span>}
          {!c.phone && !c.email && <span className="text-muted-2">—</span>}
        </span>
      ),
    },
    {
      id: 'via', label: t('customersList.via'),
      cell: (c) => (c.via ? <Badge>{c.via === 'google' ? 'Google' : 'Telegram'}</Badge> : <span className="text-muted-2">—</span>),
    },
    { id: 'orders', label: t('customersList.orders'), align: 'right', cell: (c) => <span className="tabular-nums">{c.orderCount}</span> },
    {
      id: 'date', label: t('customersList.registered'),
      cell: (c) => <span className="whitespace-nowrap text-label text-muted">{formatDateTime(c.createdAt)}</span>,
    },
  ];

  const empty: ReactNode = q ? (
    <EmptyState
      title={t('shared.notFoundTitle')}
      action={<Button variant="secondary" onClick={() => update('q', '')}>{t('shared.clearSearch')}</Button>}
    />
  ) : (
    <EmptyState title={t('customersList.emptyTitle')} text={t('customersList.emptyText')} />
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="lg:w-72">
        <SearchInput value={q} onChange={(v) => update('q', v)} placeholder={t('customersList.searchPlaceholder')} />
      </div>

      {error ? (
        <EmptyState title={t('shared.loadErrorTitle')} text={error} action={<Button variant="secondary" onClick={load}>{t('common:retry')}</Button>} />
      ) : !items ? (
        <Skeleton rows={8} />
      ) : (
        <>
          <p className="text-label text-muted">{t('customersList.count', { count: filtered.length })}</p>
          <Card padded={false}>
            <div className="px-2 py-1">
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(c) => String(c.id)}
                onRowClick={(c) => navigate(`${LIST}/${c.id}`, { state: { search: params.toString() } })}
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

export default CustomersList;
