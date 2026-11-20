import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Link, useLocation } from 'react-router';
import { CalendarCheck, ChatCircleText, ChatText, Clock, Hash, MapPin, Package, Phone, Receipt, Storefront, User, Wallet, WarningCircle } from '@phosphor-icons/react';
import { TelegramLogo } from '../brand-logos';
import { useTranslation } from 'react-i18next';
import type { ApiOrder, OrderStatus } from '../../../shared/types';
import { listOrders, setOrderStatus } from '../api';
import { errText } from '../errText';
import { formatDateTime, formatSum, formatThousands } from '../lib/format';
import { orderStatusLabels, itemsTotal, telHref } from '../lib/inbox';
import { timeAgo } from '../lib/ago';
import { MetaRows, StatusStepper } from '../StatusControls';
import { Avatar, Badge, Button, Card, EmptyState, Page } from '../ui';
import { useToast } from '../ui/toast';

const LIST = '/admin/orders';
type LoadState = 'loading' | 'ready' | 'missing' | 'error';
const at = (i: number) => ({ ['--i' as string]: i }) as Record<string, number>;

/** Tovar eskizi (44px) — rasm buyurtma nusxasida yo'q, ro'yxat API'si joriy rasmni beradi. */
const Thumb: FC<{ src?: string }> = ({ src }) => (
  <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-control bg-surface">
    {src ? <img src={src} alt="" className="size-full object-contain p-0.5" /> : <Package className="size-5 text-text-faint" />}
  </span>
);

/**
 * Buyurtma tafsiloti (`/admin/orders/:id`, v2): tepada holat stepper'i (bosilgan qadam darhol saqlanadi), ostida
 * ikki ustun — chapda tarkib (eskiz, nom, variant, `soni × narx`, jami), muddatli shartlar va izoh/manzil; o'ngda
 * mijoz (katta «Qo'ng'iroq qilish») va buyurtma ma'lumoti. Telefonda: stepper → mijoz → tarkib → ma'lumot.
 * Alohida GET yo'q — ro'yxat API'si (oxirgi 200 ta) yuklanib id bo'yicha topiladi. «Orqaga» ro'yxat filtrini
 * saqlaydi (`location.state.search`).
 */
const OrderDetail: FC<{ id: string; onCountsChange: () => void }> = ({ id, onCountsChange }) => {
  const { t } = useTranslation(['orders', 'common', 'shell']);
  const sum = t('common:sum');
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
          <div className="flex flex-col gap-6" aria-busy="true">
            <div className="skeleton h-[112px] rounded-surface" />
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="skeleton h-[320px] rounded-surface" />
              <div className="skeleton h-[240px] rounded-surface" />
            </div>
          </div>
        ) : load === 'missing' ? (
          <EmptyState
            icon={<Receipt />}
            title={t('orderDetail.missingTitle')}
            text={t('orderDetail.missingText')}
            action={<Button variant="secondary" to={LIST}>{t('orderDetail.backToList')}</Button>}
          />
        ) : (
          <EmptyState
            icon={<WarningCircle />}
            title={t('shared.loadErrorTitle')}
            text={t('shared.networkErrorText')}
            action={<Button variant="secondary" onClick={fetchOrder}>{t('common:retry')}</Button>}
          />
        )}
      </Page>
    );
  }

  const consult = order.source === 'consult';
  const installment = !consult && order.paymentKind === 'installment';
  const qty = order.items.reduce((n, it) => n + it.qty, 0);
  const total = itemsTotal(order.items);
  const next: Record<OrderStatus, string> = { new: t('board.next.new'), contacted: t('board.next.contacted'), done: t('board.next.done') };
  const source = consult ? t('shell:dashboard.status.consult') : order.source === 'cart' ? t('shell:dashboard.status.cart') : t('shell:dashboard.status.product');
  const money = (n: number | null) => ({ v: n == null ? '—' : formatThousands(n) || '0', unit: n == null ? '' : sum });
  const cells: { k: string; v: string; unit: string; accent?: boolean }[] = installment ? [
    { k: t('orderDetail.termLabel'), v: order.termMonths ? t('orderDetail.months', { count: order.termMonths }) : '—', unit: '' },
    { k: t('orderDetail.downPaymentLabel'), ...money(order.downPaymentUzs) },
    { k: t('orderDetail.monthlyLabel'), ...money(order.monthlyUzs), accent: true },
    { k: t('orderDetail.total'), ...money(order.totalUzs) },
  ] : [];

  return (
    <Page
      title={order.name}
      description={`№${order.id} · ${formatDateTime(order.createdAt)}`}
      back={backTo}
    >
      <div className="flex flex-col gap-6">
        <div className="stagger" style={at(0)}>
          <StatusStepper value={order.status} labels={labels} next={next} onChange={changeStatus} telegramSent={order.telegramSent} />
        </div>

        {/* Telefonda mijoz tarkibdan oldin, desktopda o'ng ustunda; `auto 1fr` — yon kartalar bir-biriga yopishib turadi. */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_1fr] lg:items-start">
          <div className="stagger lg:col-start-2 lg:row-start-1" style={at(1)}>
            <Card icon={User} hue="blue" title={t('shared.customer')}>
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={order.name} size="lg" />
                <div className="min-w-0">
                  <p className="truncate text-md font-bold text-text">{order.name}</p>
                  <a href={telHref(order.phone)} className="text-base tabular-nums text-text-muted transition-colors hover:text-text hover:underline">{order.phone}</a>
                </div>
              </div>
              <Button size="lg" href={telHref(order.phone)} className="w-full"><Phone weight="fill" /> {t('shared.callLong')}</Button>
              {order.customerId != null && (
                <Button variant="outline" to={`/admin/orders/customers/${order.customerId}`} className="w-full">{t('orderDetail.customerPage')}</Button>
              )}
            </Card>
          </div>

          <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-span-2 lg:row-start-1">
            {order.items.length > 0 && (
              <div className="stagger" style={at(2)}>
                <Card icon={Package} hue="violet" title={t('shared.items')} description={t('orderDetail.itemsCount', { n: qty })} padded={false}>
                  <ul className="divide-y divide-border">
                    {order.items.map((it, i) => (
                      <li key={`${i}-${it.productId}`} className="flex items-center gap-4 px-6 py-3">
                        <Thumb src={order.images?.[it.productId]} />
                        <div className="min-w-0 flex-1">
                          <Link to={`/admin/products/${encodeURIComponent(it.productId)}`} className="line-clamp-2 text-base font-medium text-text hover:underline">{it.name}</Link>
                          <p className="mt-0.5 flex flex-wrap gap-x-2 text-sm text-text-muted">
                            {it.variantLabel && <span>{it.variantLabel}</span>}
                            <span className="tabular-nums">{it.qty} × {formatSum(it.priceUzs, sum)}</span>
                          </p>
                          {it.approx && (
                            <p className="mt-1 flex items-center gap-1 text-sm text-warning-text">
                              <WarningCircle weight="fill" className="size-3.5 shrink-0" />
                              {t('orderDetail.approx')}
                            </p>
                          )}
                        </div>
                        <p className="shrink-0 text-right text-base font-semibold tabular-nums text-text">{it.approx && '≈ '}{formatSum(it.priceUzs * it.qty, sum)}</p>
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-end justify-between gap-4 bg-surface-sunken px-6 py-5">
                    <span className="pb-1 text-base font-semibold text-text-muted">{t(installment ? 'orderDetail.cashTotal' : 'orderDetail.total')}</span>
                    <span className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold tabular-nums text-text">{formatThousands(total) || '0'}</span>
                      <span className="text-base font-medium text-text-muted">{sum}</span>
                    </span>
                  </div>
                </Card>
              </div>
            )}

            {installment && (
              <div className="stagger" style={at(3)}>
                <Card icon={CalendarCheck} hue="violet" title={t('orderDetail.installmentCard')} description={t('orderDetail.installmentHint')}>
                  <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    {cells.map((c) => (
                      <div key={c.k} className={`min-w-0 rounded-control p-4 ${c.accent ? 'bg-accent-soft' : 'bg-surface-sunken'}`}>
                        <p className={`truncate text-sm font-semibold ${c.accent ? 'text-accent-text' : 'text-text-muted'}`}>{c.k}</p>
                        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1">
                          <span className="text-lg font-bold tabular-nums text-text">{c.v}</span>
                          {c.unit && <span className="text-sm text-text-muted">{c.unit}</span>}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {(order.addressText || order.note) && (
              <div className={`stagger grid gap-4 ${order.addressText && order.note ? 'md:grid-cols-2' : ''}`} style={at(4)}>
                {order.addressText && (
                  <Card icon={MapPin} hue="teal" title={t('orderDetail.addressLabel')}>
                    <p className="whitespace-pre-line text-base text-text">{order.addressText}</p>
                  </Card>
                )}
                {order.note && (
                  <Card icon={consult ? ChatCircleText : ChatText} hue={consult ? 'blue' : 'amber'} title={consult ? t('source.consult') : t('orderDetail.noteLabel')}>
                    <p className="whitespace-pre-line text-base text-text">{order.note}</p>
                  </Card>
                )}
              </div>
            )}
          </div>

          <div className="stagger lg:col-start-2 lg:row-start-2" style={at(5)}>
            <Card icon={Receipt} hue="orange" title={t('orderDetail.metaTitle')}>
              <MetaRows
                rows={[
                  { icon: Hash, k: t('shared.numberLabel'), v: <span className="tabular-nums">№{order.id}</span> },
                  {
                    icon: Clock, k: t('shared.timeLabel'),
                    v: (
                      <span className="flex flex-col items-end">
                        <span className="tabular-nums">{formatDateTime(order.createdAt)}</span>
                        <span className="text-sm font-normal text-text-faint">{timeAgo(order.createdAt)}</span>
                      </span>
                    ),
                  },
                  { icon: Storefront, k: t('shell:dashboard.status.sources'), v: source },
                  ...(consult ? [] : [{
                    icon: Wallet, k: t('shell:dashboard.status.payment'),
                    v: installment
                      ? <Badge tone="accent">{t('source.installment')}{order.termMonths ? ` · ${t('board.term', { n: order.termMonths })}` : ''}</Badge>
                      : <Badge>{t('source.cash')}</Badge>,
                  }]),
                  {
                    icon: TelegramLogo, k: t('shared.telegramLabel'),
                    v: <Badge tone={order.telegramSent ? 'ok' : 'danger'} dot>{order.telegramSent ? t('shared.tgSent') : t('shared.tgNotSent')}</Badge>,
                  },
                ]}
              />
            </Card>
          </div>
        </div>
      </div>
    </Page>
  );
};

export default OrderDetail;
