import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Link, useLocation } from 'react-router';
import { Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ApiOrder, OrderStatus } from '../../../shared/types';
import { listOrders, setOrderStatus } from '../api';
import { errText } from '../errText';
import { formatDateTime, formatSum } from '../lib/format';
import { orderStatusLabels, itemsTotal, orderSource, telHref } from '../lib/inbox';
import { StatusCard } from '../StatusControls';
import { Button, Card, EmptyState, Page, Rows, Skeleton } from '../ui';
import { useToast } from '../ui/toast';

const LIST = '/admin/orders';
type LoadState = 'loading' | 'ready' | 'missing' | 'error';

/**
 * Buyurtma tafsiloti (`/admin/orders/:id`): to'liq tarkib, muddatli shartlar, izoh; holat darhol saqlanadi.
 * Alohida GET yo'q — ro'yxat API'si (oxirgi 200 ta) yuklanib id bo'yicha topiladi. "Orqaga" ro'yxat filtrini
 * saqlaydi (`location.state.search`).
 */
const OrderDetail: FC<{ id: string; onCountsChange: () => void }> = ({ id, onCountsChange }) => {
  const sum = useTranslation('common').t('sum');
  const { t } = useTranslation(['orders', 'common']);
  const labels = orderStatusLabels();
  const location = useLocation();
  const search = (location.state as { search?: string } | null)?.search;
  const backTo = search ? `${LIST}?${search}` : LIST;
  const toast = useToast();
  const [rawOrder, setOrder] = useState(null as ApiOrder | null);
  const order = rawOrder as ApiOrder | null;
  const [rawLoad, setLoad] = useState('loading' as LoadState);
  const load = rawLoad as LoadState;

  function fetchOrder() {
    setLoad('loading');
    listOrders()
      .then((xs) => {
        const found = xs.find((x) => String(x.id) === id) ?? null;
        setOrder(found);
        setLoad(found ? 'ready' : 'missing');
      })
      .catch(() => setLoad('error'));
  }
  useEffect(fetchOrder, [id]);

  async function changeStatus(next: OrderStatus) {
    if (!order) return;
    setOrder({ ...order, status: next });
    try {
      await setOrderStatus(order.id, next);
      toast(t('shared.statusToast', { status: labels[next] }));
      onCountsChange();
    } catch (e) {
      setOrder(order);
      toast(errText(e), 'error');
    }
  }

  if (load !== 'ready' || !order) {
    return (
      <Page title={t('orderDetail.title')} back={backTo}>
        {load === 'loading' ? (
          <Skeleton rows={4} />
        ) : load === 'missing' ? (
          <EmptyState
            title={t('orderDetail.missingTitle')}
            text={t('orderDetail.missingText')}
            action={<Button variant="secondary" to={LIST}>{t('orderDetail.backToList')}</Button>}
          />
        ) : (
          <EmptyState
            title={t('shared.loadErrorTitle')}
            text={t('shared.networkErrorText')}
            action={<Button variant="secondary" onClick={fetchOrder}>{t('common:retry')}</Button>}
          />
        )}
      </Page>
    );
  }

  const installment = order.source !== 'consult' && order.paymentKind === 'installment';
  return (
    <Page
      title={order.name}
      description={`№${order.id} · ${formatDateTime(order.createdAt)}`}
      back={backTo}
      actions={<Button variant="secondary" href={telHref(order.phone)}><Phone aria-hidden className="size-4" /> {t('shared.call')}</Button>}
    >
      <div className="flex flex-col gap-4">
        <StatusCard value={order.status} labels={labels} onChange={changeStatus} telegramSent={order.telegramSent} />
        <Card title={t('shared.customer')}>
          <Rows
            rows={[
              { k: t('shared.nameLabel'), v: order.name },
              { k: t('shared.phoneLabel'), v: <a href={telHref(order.phone)} className="press text-link">{order.phone}</a> },
              { k: t('orderDetail.sourceLabel'), v: orderSource(order) },
              ...(order.addressText ? [{ k: t('orderDetail.addressLabel'), v: <span className="whitespace-pre-line">{order.addressText}</span> }] : []),
              ...(order.note ? [{ k: t('orderDetail.noteLabel'), v: <span className="whitespace-pre-line">{order.note}</span> }] : []),
            ]}
          />
        </Card>
        {order.items.length > 0 && (
          <Card title={t('shared.items')} padded={false}>
            <ul className="mt-2 divide-y divide-line-3 px-5">
              {order.items.map((it, i) => (
                <li key={`${i}-${it.productId}`} className="flex items-start justify-between gap-4 py-3 text-para">
                  <div className="min-w-0">
                    <Link to={`/admin/products/${it.productId}`} className="press inline-block text-primary hover:text-link">{it.name}</Link>
                    {it.variantLabel && <p className="text-label text-muted-2">{it.variantLabel}</p>}
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <p className="text-primary">{formatSum(it.priceUzs * it.qty, sum)}</p>
                    {it.qty > 1 && <p className="text-label text-muted-2">{it.qty} × {formatSum(it.priceUzs, sum)}</p>}
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-3 text-para font-semibold text-primary">
              <span>{t(installment ? 'orderDetail.cashTotal' : 'orderDetail.total')}</span>
              <span className="tabular-nums">{formatSum(itemsTotal(order.items), sum)}</span>
            </div>
          </Card>
        )}
        {installment && (
          <Card title={t('orderDetail.installmentCard')}>
            <Rows
              rows={[
                { k: t('orderDetail.termLabel'), v: order.termMonths ? t('orderDetail.months', { count: order.termMonths }) : '—' },
                { k: t('orderDetail.downPaymentLabel'), v: formatSum(order.downPaymentUzs, sum) },
                { k: t('orderDetail.monthlyLabel'), v: formatSum(order.monthlyUzs, sum) },
                { k: t('orderDetail.total'), v: formatSum(order.totalUzs, sum) },
              ]}
            />
          </Card>
        )}
      </div>
    </Page>
  );
};

export default OrderDetail;
