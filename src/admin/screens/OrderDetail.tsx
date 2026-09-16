import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Link, useLocation } from 'react-router';
import { Phone } from 'lucide-react';
import type { ApiOrder, OrderStatus } from '../../../shared/types';
import { listOrders, setOrderStatus } from '../api';
import { errText } from '../errText';
import { formatDateTime, formatSum } from '../lib/format';
import { ORDER_STATUS, itemsTotal, orderSource, telHref } from '../lib/inbox';
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
      toast(`Holat: ${ORDER_STATUS[next]}`);
      onCountsChange();
    } catch (e) {
      setOrder(order);
      toast(errText(e), 'error');
    }
  }

  if (load !== 'ready' || !order) {
    return (
      <Page title="Buyurtma" back={backTo}>
        {load === 'loading' ? (
          <Skeleton rows={4} />
        ) : load === 'missing' ? (
          <EmptyState
            title="Buyurtma topilmadi"
            text="Faqat oxirgi 200 ta buyurtma ochiladi."
            action={<Button variant="secondary" to={LIST}>Buyurtmalarga qaytish</Button>}
          />
        ) : (
          <EmptyState
            title="Ma'lumot yuklanmadi"
            text="Tarmoq yoki server xatosi — qayta urinib ko'ring."
            action={<Button variant="secondary" onClick={fetchOrder}>Qayta urinish</Button>}
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
      actions={<Button variant="secondary" href={telHref(order.phone)}><Phone aria-hidden className="size-4" /> Qo'ng'iroq</Button>}
    >
      <div className="flex flex-col gap-4">
        <StatusCard value={order.status} labels={ORDER_STATUS} onChange={changeStatus} telegramSent={order.telegramSent} />
        <Card title="Mijoz">
          <Rows
            rows={[
              { k: 'Telefon', v: <a href={telHref(order.phone)} className="press text-cta">{order.phone}</a> },
              { k: 'Manba', v: orderSource(order) },
              ...(order.note ? [{ k: 'Izoh', v: <span className="whitespace-pre-line">{order.note}</span> }] : []),
            ]}
          />
        </Card>
        {order.items.length > 0 && (
          <Card title="Tarkib" padded={false}>
            <ul className="mt-2 divide-y divide-line-3 px-5">
              {order.items.map((it, i) => (
                <li key={`${i}-${it.productId}`} className="flex items-start justify-between gap-4 py-3 text-para">
                  <div className="min-w-0">
                    <Link to={`/admin/products/${it.productId}`} className="press inline-block text-primary hover:text-cta">{it.name}</Link>
                    {it.variantLabel && <p className="text-label text-muted-2">{it.variantLabel}</p>}
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <p className="text-primary">{formatSum(it.priceUzs * it.qty)}</p>
                    {it.qty > 1 && <p className="text-label text-muted-2">{it.qty} × {formatSum(it.priceUzs)}</p>}
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-3 text-para font-semibold text-primary">
              <span>{installment ? 'Naqd narxi' : 'Jami'}</span>
              <span className="tabular-nums">{formatSum(itemsTotal(order.items))}</span>
            </div>
          </Card>
        )}
        {installment && (
          <Card title="Muddatli to'lov">
            <Rows
              rows={[
                { k: 'Muddat', v: order.termMonths ? `${order.termMonths} oy` : '—' },
                { k: "Boshlang'ich to'lov", v: formatSum(order.downPaymentUzs) },
                { k: "Oylik to'lov", v: formatSum(order.monthlyUzs) },
                { k: 'Jami', v: formatSum(order.totalUzs) },
              ]}
            />
          </Card>
        )}
      </div>
    </Page>
  );
};

export default OrderDetail;
