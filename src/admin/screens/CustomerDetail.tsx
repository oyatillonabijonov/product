import { useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { CalendarBlank, CaretRight, ChatCircleText, Clock, EnvelopeSimple, Package, Phone, Receipt, WarningCircle } from '@phosphor-icons/react';
import { GoogleLogo, TelegramLogo } from '../brand-logos';
import type { Icon as PhIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { ApiAdminCustomer, ApiOrder, OrderStatus } from '../../../shared/types';
import { isAvatarPhoto } from '../../../shared/avatar';
import { getCustomer, listOrders } from '../api';
import { formatDateTime } from '../lib/format';
import { orderStatusLabels, orderSource, orderSummary, orderTotal, telHref } from '../lib/inbox';
import { timeAgo } from '../lib/ago';
import { StatTile } from '../StatusControls';
import { Avatar, Badge, Button, Card, EmptyState, Page, type Tone } from '../ui';
import { CountUp } from '../ui/stats';
import { compact } from '../charts';

const LIST = '/admin/orders/customers';
type LoadState = 'loading' | 'ready' | 'missing' | 'error';
const STATUS_TONE: Record<OrderStatus, Tone> = { new: 'info', contacted: 'neutral', done: 'ok' };
const STATUS_DOT: Record<OrderStatus, string> = { new: 'bg-c-blue', contacted: 'bg-c-orange', done: 'bg-c-green' };
const at = (i: number) => ({ ['--i' as string]: i }) as Record<string, number>;

/**
 * Mijoz sahifasi (`/admin/orders/customers/:id`, v2): profil kartasi (avatar, ism, ID, aloqa, kirish usuli, sana),
 * mini statistika (buyurtmalar soni, jami so'ralgan summa, oxirgi buyurtma) va buyurtmalar vaqt chizig'i —
 * holat, summa, tovar eskizlari; bosilsa buyurtma tafsiloti. «Orqaga» ro'yxat qidiruvini saqlaydi.
 * Eskizlar: mijoz API'si rasm bermaydi — buyurtmalar ro'yxatidagi (oxirgi 200 ta) rasmlar ishlatiladi, yuklanmasa
 * eskiz o'rnida ikonka qoladi.
 */
const CustomerDetail: FC<{ id: string }> = ({ id }) => {
  const { t } = useTranslation(['orders', 'common']);
  const labels = orderStatusLabels();
  const location = useLocation();
  const search = (location.state as { search?: string } | null)?.search;
  const backTo = search ? `${LIST}?${search}` : LIST;

  const [rawData, setData] = useState(null as { customer: ApiAdminCustomer; orders: ApiOrder[] } | null);
  const data = rawData as { customer: ApiAdminCustomer; orders: ApiOrder[] } | null;
  const [rawLoad, setLoad] = useState('loading' as LoadState);
  const load = rawLoad as LoadState;
  const [rawImages, setImages] = useState({} as Record<string, string>);
  const images = rawImages as Record<string, string>;

  function fetchCustomer() {
    setLoad('loading');
    getCustomer(id)
      .then((d) => { setData(d); setLoad('ready'); })
      .catch((e) => setLoad(e instanceof Error && e.message === 'not_found' ? 'missing' : 'error'));
  }
  useEffect(fetchCustomer, [id]);
  useEffect(() => {
    listOrders()
      .then((xs) => setImages(xs.reduce((m, o) => ({ ...m, ...o.images }), {} as Record<string, string>)))
      .catch(() => { /* eskizsiz ham ishlaydi */ });
  }, []);

  if (load === 'loading') {
    return (
      <Page title={t('customerDetail.infoTitle')} back={backTo}>
        <div className="flex flex-col gap-6" aria-busy="true">
          <div className="flex flex-col gap-4">
            <div className="skeleton h-[136px] rounded-surface" />
            <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-[116px] rounded-surface" />)}</div>
          </div>
          <div className="skeleton h-[320px] rounded-surface" />
        </div>
      </Page>
    );
  }
  if (load !== 'ready' || !data) {
    return (
      <Page title={t('customerDetail.missingTitle')} back={backTo}>
        {load === 'missing'
          ? <EmptyState title={t('customerDetail.missingTitle')} action={<Button variant="secondary" to={backTo}>{t('customerDetail.backToList')}</Button>} />
          : <EmptyState icon={<WarningCircle />} title={t('shared.loadErrorTitle')} text={t('shared.networkErrorText')} action={<Button variant="secondary" onClick={fetchCustomer}>{t('common:retry')}</Button>} />}
      </Page>
    );
  }

  const { customer: c, orders } = data;
  const name = c.name || t('customersList.noName');
  const last = orders[0];
  const contacts: { icon: PhIcon; node: ReactNode }[] = [
    ...(c.phone ? [{ icon: Phone, node: <a href={telHref(c.phone)} className="tabular-nums text-text hover:underline">{c.phone}</a> }] : []),
    ...(c.email ? [{ icon: EnvelopeSimple, node: <a href={`mailto:${c.email}`} className="break-all text-text hover:underline">{c.email}</a> }] : []),
    { icon: CalendarBlank, node: <span>{t('customersList.registered')}: <span className="tabular-nums text-text">{formatDateTime(c.createdAt)}</span></span> },
  ];

  return (
    <Page
      title={name}
      description={`ID №${c.id}`}
      back={backTo}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="stagger" style={at(0)}>
            <Card>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <Avatar name={name} src={c.avatar && isAvatarPhoto(c.avatar, c.id) ? c.avatar : null} size="xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="min-w-0 truncate text-xl font-bold text-text">{name}</h2>
                    {c.via === 'google' && <Badge><GoogleLogo weight="bold" className="size-3.5" />Google</Badge>}
                    {c.via === 'telegram' && <Badge tone="info"><TelegramLogo weight="fill" className="size-3.5" />Telegram</Badge>}
                  </div>
                  <p className="mt-0.5 text-sm tabular-nums text-text-faint">ID №{c.id}</p>
                  <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-base text-text-muted">
                    {contacts.map(({ icon: I, node }, i) => (
                      <li key={i} className="flex min-w-0 items-center gap-2"><I className="size-4 shrink-0 text-text-faint" />{node}</li>
                    ))}
                  </ul>
                </div>
                {c.phone && (
                  <Button size="lg" href={telHref(c.phone)} className="max-sm:w-full"><Phone weight="fill" /> {t('shared.callLong')}</Button>
                )}
              </div>
            </Card>
          </div>

          <div className="stagger grid gap-3 sm:grid-cols-2" style={at(1)}>
            <StatTile icon={Receipt} hue="orange" label={t('customerDetail.statOrders')}><CountUp value={orders.length} /></StatTile>
            <StatTile icon={Clock} hue="violet" label={t('customerDetail.statLast')}>
              <span className="truncate">{last ? timeAgo(last.createdAt) : '—'}</span>
            </StatTile>
          </div>
        </div>

        <div className="stagger" style={at(2)}>
          <Card icon={Receipt} hue="orange" title={t('customerDetail.ordersTitle')} description={orders.length ? t('customerDetail.ordersHint') : undefined} actions={<Badge>{orders.length}</Badge>} padded={false}>
            {orders.length === 0 ? (
              <div className="px-6 pb-6"><EmptyState icon={<Receipt />} title={t('customerDetail.noOrders')} /></div>
            ) : (
              <ol className="px-6 pb-5">
                {orders.map((o, i) => {
                  const total = orderTotal(o);
                  const thumbs = o.items.slice(0, 3);
                  return (
                    <li key={o.id} className="relative flex gap-4">
                      <span aria-hidden className="relative w-3 shrink-0">
                        {orders.length > 1 && (
                          <span className={`absolute left-1/2 w-px -translate-x-1/2 bg-border ${i === 0 ? 'top-8 bottom-0' : i === orders.length - 1 ? 'top-0 h-8' : 'inset-y-0'}`} />
                        )}
                        <span className={`absolute left-1/2 top-[26px] size-3 -translate-x-1/2 rounded-full ${STATUS_DOT[o.status]}`} />
                      </span>
                      <Link
                        to={`/admin/orders/${o.id}`}
                        className="group my-1 flex min-w-0 flex-1 items-center gap-3 rounded-control bg-surface p-4 transition-transform duration-200 hover:-translate-y-px"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-semibold tabular-nums text-text">№{o.id}</span>
                            <Badge tone={STATUS_TONE[o.status]} dot>{labels[o.status]}</Badge>
                            <span className="text-sm tabular-nums text-text-faint">{formatDateTime(o.createdAt)}</span>
                          </span>
                          <span className="mt-2 flex min-w-0 items-center gap-2.5">
                            {o.source === 'consult' ? (
                              <span className="grid size-8 shrink-0 place-items-center text-text-muted"><ChatCircleText weight="fill" className="size-5" /></span>
                            ) : (
                              <span className="flex shrink-0 gap-1">
                                {thumbs.map((it, k) => {
                                  const src = o.images?.[it.productId] ?? images[it.productId];
                                  return (
                                    <span key={`${k}-${it.productId}`} className="grid size-8 place-items-center overflow-hidden rounded-item bg-surface-sunken">
                                      {src ? <img src={src} alt="" className="size-full object-contain p-0.5" /> : <Package className="size-4 text-text-faint" />}
                                    </span>
                                  );
                                })}
                              </span>
                            )}
                            <span className="min-w-0 truncate text-sm text-text-muted">{orderSummary(o)}</span>
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          {total != null && <span className="block text-base font-bold tabular-nums text-text">{compact(total)}</span>}
                          <span className="block text-sm text-text-muted">{orderSource(o)}</span>
                        </span>
                        <CaretRight weight="bold" className="size-3.5 shrink-0 text-text-faint transition-transform duration-200 group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </Page>
  );
};

export default CustomerDetail;
