import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ApiAdminCustomer, ApiOrder, OrderStatus } from '../../../shared/types';
import { getCustomer } from '../api';
import { formatDateTime, formatSum } from '../lib/format';
import { orderStatusLabels, orderSummary, orderTotal, telHref } from '../lib/inbox';
import { Badge, Button, Card, DataTable, EmptyState, Page, Rows, Skeleton, type Column, type Tone } from '../ui';

const LIST = '/admin/orders/customers';
type LoadState = 'loading' | 'ready' | 'missing' | 'error';
const STATUS_TONE: Record<OrderStatus, Tone> = { new: 'attention', contacted: 'info', done: 'ok' };

/**
 * Mijoz sahifasi (`/admin/orders/customers/:id`): ma'lumotlari va hamma buyurtmalari (yangisi tepada);
 * buyurtma bosilsa uning tafsiloti ochiladi. "Orqaga" ro'yxat qidiruvini saqlaydi (`location.state.search`).
 */
const CustomerDetail: FC<{ id: string }> = ({ id }) => {
  const { t } = useTranslation(['orders', 'common']);
  const labels = orderStatusLabels();
  const navigate = useNavigate();
  const location = useLocation();
  const search = (location.state as { search?: string } | null)?.search;
  const backTo = search ? `${LIST}?${search}` : LIST;

  const [rawData, setData] = useState(null as { customer: ApiAdminCustomer; orders: ApiOrder[] } | null);
  const data = rawData as { customer: ApiAdminCustomer; orders: ApiOrder[] } | null;
  const [rawLoad, setLoad] = useState('loading' as LoadState);
  const load = rawLoad as LoadState;

  function fetchCustomer() {
    setLoad('loading');
    getCustomer(id)
      .then((d) => { setData(d); setLoad('ready'); })
      .catch((e) => setLoad(e instanceof Error && e.message === 'not_found' ? 'missing' : 'error'));
  }
  useEffect(fetchCustomer, [id]);

  if (load === 'loading') return <Page title={t('customerDetail.infoTitle')} back={backTo}><Skeleton rows={6} /></Page>;
  if (load !== 'ready' || !data) {
    return (
      <Page title={t('customerDetail.missingTitle')} back={backTo}>
        {load === 'missing'
          ? <EmptyState title={t('customerDetail.missingTitle')} action={<Button variant="secondary" to={backTo}>{t('customerDetail.backToList')}</Button>} />
          : <EmptyState title={t('shared.loadErrorTitle')} text={t('shared.networkErrorText')} action={<Button variant="secondary" onClick={fetchCustomer}>{t('common:retry')}</Button>} />}
      </Page>
    );
  }

  const { customer: c, orders } = data;
  const sum = t('common:sum');
  const columns: Column<ApiOrder>[] = [
    {
      id: 'order', label: t('customerDetail.orderColumn'), mobile: 'title',
      cell: (o) => (
        <span className="flex flex-col gap-0.5">
          <span className="text-primary">№{o.id}</span>
          <span className="whitespace-nowrap text-label text-muted">{formatDateTime(o.createdAt)}</span>
        </span>
      ),
    },
    { id: 'items', label: t('shared.items'), cell: (o) => <span className="block max-w-64 truncate text-muted">{orderSummary(o)}</span> },
    { id: 'sum', label: t('ordersList.sumColumn'), align: 'right', cell: (o) => <span className="whitespace-nowrap tabular-nums">{formatSum(orderTotal(o), sum)}</span> },
    { id: 'status', label: t('shared.status'), cell: (o) => <Badge tone={STATUS_TONE[o.status]}>{labels[o.status]}</Badge> },
  ];

  return (
    <Page
      title={c.name || t('customersList.noName')}
      description={`ID №${c.id} · ${formatDateTime(c.createdAt)}`}
      back={backTo}
      actions={c.phone ? <Button variant="secondary" href={telHref(c.phone)}><Phone aria-hidden className="size-4" /> {t('shared.call')}</Button> : undefined}
    >
      <div className="flex flex-col gap-4">
        <Card title={t('customerDetail.infoTitle')}>
          <Rows
            rows={[
              { k: t('shared.phoneLabel'), v: c.phone ? <a href={telHref(c.phone)} className="press text-link">{c.phone}</a> : '—' },
              { k: t('customerDetail.emailLabel'), v: c.email || '—' },
              { k: t('customersList.via'), v: c.via === 'google' ? 'Google' : c.via === 'telegram' ? 'Telegram' : '—' },
              { k: t('customersList.registered'), v: formatDateTime(c.createdAt) },
            ]}
          />
        </Card>
        <Card title={`${t('customerDetail.ordersTitle')} · ${orders.length}`} padded={false}>
          <div className="px-2 py-1">
            <DataTable
              columns={columns}
              rows={orders}
              rowKey={(o) => String(o.id)}
              onRowClick={(o) => navigate(`/admin/orders/${o.id}`)}
              empty={<p className="px-3 py-4 text-para text-muted">{t('customerDetail.noOrders')}</p>}
            />
          </div>
        </Card>
      </div>
    </Page>
  );
};

export default CustomerDetail;
