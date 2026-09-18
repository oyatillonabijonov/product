import type { FC } from 'react';
import { ChevronRight, Package } from 'lucide-react';
import type { Translation } from '../../locales';
import type { ApiOrder, OrderStatus } from '../../../shared/types';
import { formatUzs } from '../../lib/installment';
import AccountEmptyState from './AccountEmptyState';

const statusStyle: Record<OrderStatus, string> = {
  new: 'bg-accent-soft text-accent',
  contacted: 'bg-trust-soft text-trust',
  done: 'bg-row-alt text-muted',
};

const OrdersList: FC<{ t: Translation; orders: ApiOrder[] }> = ({ t, orders }) => {
  if (orders.length === 0) {
    return <AccountEmptyState icon={Package} text={t.accountNoOrders} />;
  }

  const statusLabel = (s: OrderStatus) =>
    s === 'contacted' ? t.orderStatusContacted : s === 'done' ? t.orderStatusDone : t.orderStatusNew;

  return (
    <div className="flex flex-col gap-3">
      {orders.map((o) => {
        const itemsTotal = o.items.reduce((s, it) => s + it.priceUzs * it.qty, 0);
        const total = o.totalUzs ?? itemsTotal;
        const installment = o.paymentKind === 'installment';
        return (
          <details key={o.id} className="group rounded-sm bg-bg overflow-hidden">
            <summary className="list-none [&::-webkit-details-marker]:hidden flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-4 py-3 bg-bg/50 hover:bg-bg cursor-pointer transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <ChevronRight className="w-4 h-4 text-muted-2 shrink-0 transition-transform duration-200 group-open:rotate-90" />
                <span className="text-label font-semibold text-primary tabular-nums shrink-0">#{o.id}</span>
                <span className="text-label text-muted-2 shrink-0">{new Date(o.createdAt * 1000).toLocaleDateString('ru-RU')}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-label font-semibold px-2.5 py-1 rounded-full ${statusStyle[o.status] ?? statusStyle.new}`}>
                  {statusLabel(o.status)}
                </span>
                <span className="text-control font-semibold text-primary tabular-nums">{formatUzs(total, t.sum)}</span>
              </div>
            </summary>

            <div className="p-4 border-t border-line/60">
              <div className="flex flex-col gap-1.5">
                {o.items.map((it, i) => (
                  <div key={i} className="flex items-baseline justify-between gap-3 text-label">
                    <span className="text-body">
                      {it.name}{it.variantLabel ? <span className="text-muted"> · {it.variantLabel}</span> : ''}
                      {it.qty > 1 && <span className="text-muted-2"> ×{it.qty}</span>}
                    </span>
                    <span className="tabular-nums text-body shrink-0">{formatUzs(it.priceUzs * it.qty, t.sum)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-line/60">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-label text-muted">{installment ? t.orderBuyInstallment : t.orderBuyCash}</span>
                  {installment && o.termMonths != null && (
                    <span className="text-label text-muted">{o.termMonths} {t.calcMonths}</span>
                  )}
                </div>

                {installment ? (
                  <div className="rounded-sm bg-bg p-3 flex flex-col gap-1.5 text-label">
                    {o.monthlyUzs != null && (
                      <div className="flex justify-between">
                        <span className="text-muted">{t.calcMonthly}</span>
                        <span className="tabular-nums font-semibold text-primary">{formatUzs(o.monthlyUzs, t.sum)}</span>
                      </div>
                    )}
                    {o.downPaymentUzs != null && (
                      <div className="flex justify-between"><span className="text-muted">{t.calcDownPayment}</span><span className="tabular-nums text-body">{formatUzs(o.downPaymentUzs, t.sum)}</span></div>
                    )}
                    {o.totalUzs != null && (
                      <div className="flex justify-between"><span className="text-muted">{t.calcTotal}</span><span className="tabular-nums text-body">{formatUzs(o.totalUzs, t.sum)}</span></div>
                    )}
                  </div>
                ) : (
                  <div className="flex justify-between items-baseline">
                    <span className="text-label text-muted">{t.calcTotal}</span>
                    <span className="text-control font-semibold text-primary tabular-nums">{formatUzs(total, t.sum)}</span>
                  </div>
                )}
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
};

export default OrdersList;
