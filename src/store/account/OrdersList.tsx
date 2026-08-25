import type { FC } from 'react';
import { Package } from 'lucide-react';
import type { Translation } from '../../locales';
import type { ApiOrder, OrderStatus } from '../../../shared/types';
import { formatUzs } from '../../lib/installment';

const statusStyle: Record<OrderStatus, string> = {
  new: 'bg-accent-soft text-accent',
  contacted: 'bg-trust-soft text-trust',
  done: 'bg-row-alt text-muted',
};

const OrdersList: FC<{ t: Translation; orders: ApiOrder[] }> = ({ t, orders }) => {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-14 gap-3">
        <div className="w-14 h-14 rounded-full bg-bg flex items-center justify-center">
          <Package className="w-7 h-7 text-muted-2" />
        </div>
        <p className="text-muted text-[14px]">{t.accountNoOrders}</p>
      </div>
    );
  }

  const statusLabel = (s: OrderStatus) =>
    s === 'contacted' ? t.orderStatusContacted : s === 'done' ? t.orderStatusDone : t.orderStatusNew;

  return (
    <div className="space-y-4">
      {orders.map((o) => {
        const itemsTotal = o.items.reduce((s, it) => s + it.priceUzs * it.qty, 0);
        const installment = o.paymentKind === 'installment';
        return (
          <div key={o.id} className="border border-line-2 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-bg/50 border-b border-line/60">
              <div className="flex items-baseline gap-2.5">
                <span className="text-[14px] font-semibold text-primary tabular-nums">#{o.id}</span>
                <span className="text-[14px] text-muted-2">{new Date(o.createdAt * 1000).toLocaleDateString('ru-RU')}</span>
              </div>
              <span className={`text-[14px] font-semibold px-2.5 py-1 rounded-full ${statusStyle[o.status] ?? statusStyle.new}`}>
                {statusLabel(o.status)}
              </span>
            </div>

            <div className="p-4">
              <div className="flex flex-col gap-1.5">
                {o.items.map((it, i) => (
                  <div key={i} className="flex items-baseline justify-between gap-3 text-[14px]">
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
                  <span className="text-[14px] text-muted">{installment ? t.orderBuyInstallment : t.orderBuyCash}</span>
                  {installment && o.termMonths != null && (
                    <span className="text-[14px] text-muted">{o.termMonths} {t.calcMonths}</span>
                  )}
                </div>

                {installment ? (
                  <div className="bg-bg rounded-lg p-3 flex flex-col gap-1.5 text-[14px]">
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
                    <span className="text-[14px] text-muted">{t.calcTotal}</span>
                    <span className="text-[16px] font-semibold text-primary tabular-nums">{formatUzs(o.totalUzs ?? itemsTotal, t.sum)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OrdersList;
