import type { FC, ReactNode } from 'react';
import { Package } from 'lucide-react';
import type { Translation } from '../../locales';
import type { ApiOrder, OrderStatus } from '../../../shared/types';
import { formatUzs } from '../../lib/installment';
import AccountEmptyState from './AccountEmptyState';

const statusStyle: Record<OrderStatus, string> = {
  new: 'bg-accent-soft text-accent',
  contacted: 'bg-trust-soft text-trust',
  done: 'bg-row-alt text-muted',
};

/** Sana + vaqt, Toshkent. `Intl` emas — server va brauzer boshqa satr berib gidratatsiyani buzardi. */
function stamp(sec: number): string {
  const d = new Date((sec + 5 * 3600) * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/**
 * Tafsilot qatori — yorliq va qiymat orasi nuqtali chiziq bilan to'ldiriladi.
 * Chiziq `flex-1` bo'lgani uchun qiymat har doim o'ng chetda turadi va ko'z
 * yorliqdan qiymatga adashmay boradi (bosma blankalar idiomasi).
 */
const Row: FC<{ label: string; children: ReactNode; strong?: boolean }> = ({ label, children, strong = false }) => (
  <div className="flex items-baseline gap-2">
    <span className="shrink-0 text-label text-muted-2">{label}</span>
    <span aria-hidden className="min-w-4 flex-1 translate-y-[-3px] border-b border-dashed border-line-2" />
    <span className={`shrink-0 text-right text-para tabular-nums ${strong ? 'font-semibold text-primary' : 'text-body'}`}>
      {children}
    </span>
  </div>
);

/**
 * Kabinet → Buyurtmalarim. Har buyurtma to'liq ochiq karta: yig'ilgan akkordeon
 * mijozni buyurtmasini "qidirishga" majburlardi, ular esa kam sonli.
 *
 * Raqam (`№12`) admin panelidagi bilan **aynan bir xil** — operator telefonda
 * shu raqam bo'yicha topadi (`OrderDetail` sarlavhasida ham `№{id}`).
 */
const OrdersList: FC<{ t: Translation; orders: ApiOrder[]; itemImages: Record<string, string> }> = ({
  t, orders, itemImages,
}) => {
  if (orders.length === 0) {
    return <AccountEmptyState icon={Package} text={t.accountNoOrders} />;
  }

  const statusLabel = (s: OrderStatus) =>
    s === 'contacted' ? t.orderStatusContacted : s === 'done' ? t.orderStatusDone : t.orderStatusNew;

  return (
    <div className="flex flex-col gap-4">
      {orders.map((o) => {
        const itemsTotal = o.items.reduce((s, it) => s + it.priceUzs * it.qty, 0);
        const total = o.totalUzs ?? itemsTotal;
        const installment = o.paymentKind === 'installment';
        return (
          <article key={o.id} className="rounded-lg bg-bg">
            <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-4">
              <h3 className="text-copy font-semibold text-primary">
                {t.orderNo} <span className="tabular-nums">№{o.id}</span>
              </h3>
              <span className={`rounded-full px-2.5 py-1 text-label font-semibold ${statusStyle[o.status] ?? statusStyle.new}`}>
                {statusLabel(o.status)}
              </span>
            </header>

            <div className="grid gap-x-8 gap-y-5 border-t border-divider px-5 py-4 md:grid-cols-2">
              <ul className="flex flex-col gap-3">
                {o.items.map((it, i) => (
                  <li key={`${it.productId}-${i}`} className="flex items-start gap-3">
                    <span className="size-14 shrink-0 overflow-hidden rounded-sm border border-line bg-white">
                      {itemImages[it.productId] && (
                        <img src={itemImages[it.productId]} alt="" loading="lazy" className="size-full object-contain" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-para text-primary">{it.name}</span>
                      {it.variantLabel && <span className="block text-label text-muted-2">{it.variantLabel}</span>}
                      <span className="mt-0.5 block text-label text-muted tabular-nums">
                        {it.qty} {t.orderQty} × {formatUzs(it.priceUzs, t.sum)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-2.5 md:border-l md:border-divider md:pl-8">
                <Row label={t.orderPayment}>{installment ? t.orderPaymentInstallment : t.orderPaymentCash}</Row>
                <Row label={t.orderTime}>{stamp(o.createdAt)}</Row>
                {installment && o.termMonths != null && (
                  <Row label={t.orderTermLabel}>{o.termMonths} {t.orderMonths}</Row>
                )}
                {installment && o.downPaymentUzs != null && (
                  <Row label={t.orderDownPayment}>{formatUzs(o.downPaymentUzs, t.sum)}</Row>
                )}
                {installment && o.monthlyUzs != null && (
                  <Row label={t.orderMonthly}>{formatUzs(o.monthlyUzs, t.sum)}</Row>
                )}
                <Row label={t.orderTotal} strong>{formatUzs(total, t.sum)}</Row>
                <Row label={t.orderContact}>{o.name}</Row>
                <Row label={t.orderPhone}>{o.phone}</Row>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default OrdersList;
