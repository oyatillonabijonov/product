import { useEffect, useMemo, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ShoppingBagOpen, SignIn, UserPlus, Users, WarningCircle } from '@phosphor-icons/react';
import { GoogleLogo, TelegramLogo } from '../brand-logos';
import { useTranslation } from 'react-i18next';
import type { ApiAdminCustomer } from '../../../shared/types';
import { isAvatarPhoto } from '../../../shared/avatar';
import { listCustomers } from '../api';
import { formatDateTime } from '../lib/format';
import { telHref } from '../lib/inbox';
import { timeAgo } from '../lib/ago';
import { Avatar, Badge, Button, DataTable, EmptyState, Pagination, SearchInput, type Column } from '../ui';
import { Kpi, KpiStrip, KpiTile, pctChange } from '../ui/stats';
import { SegmentBar } from '../charts';

const PAGE_SIZE = 20;
const LIST = '/admin/orders/customers';
const DAY = 86400;
/** Toshkent vaqti (UTC+5, yozgi vaqt yo'q). */
const TZ = 5 * 3600;

/** Kirish usuli belgisi — Google yoki Telegram, brend ikonkasi bilan. */
const ViaBadge: FC<{ via: ApiAdminCustomer['via'] }> = ({ via }) => {
  if (via === 'google') return <Badge><GoogleLogo weight="bold" className="size-3.5" />Google</Badge>;
  if (via === 'telegram') return <Badge tone="info"><TelegramLogo weight="fill" className="size-3.5" />Telegram</Badge>;
  return <span className="text-text-faint">—</span>;
};

/** KPI qatorining to'rtinchi katagi: Google va Telegram ulushi (son o'rniga ikki foiz va ulush chizig'i). */
const ViaCell: FC<{ label: string; google: number; telegram: number }> = ({ label, google, telegram }) => {
  const total = google + telegram;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  return (
    <div className="flex min-w-0 flex-col rounded-surface border border-border bg-surface">
      <div className="flex flex-1 flex-col px-4 pb-5 pt-5 sm:px-6">
        <span className="flex min-w-0 items-center gap-2.5">
          <KpiTile icon={SignIn} />
          <span className="truncate text-base font-medium text-text">{label}</span>
        </span>
        <div className="mt-5 grid grid-cols-2 gap-4">
          {[{ name: 'Google', n: google, I: GoogleLogo }, { name: 'Telegram', n: telegram, I: TelegramLogo }].map(({ name, n, I }) => (
            <div key={name} className="min-w-0">
              <p className="flex items-center gap-1.5 text-text-muted"><I weight="bold" className="size-3 shrink-0" /><span className="eyebrow truncate">{name}</span></p>
              <p className="mt-1 text-2xl font-semibold leading-8 tabular-nums text-text">{pct(n)}%</p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex h-11 items-center rounded-b-[15px] border-t border-border bg-surface-sunken px-4 sm:px-6">
        <div className="w-full"><SegmentBar showLegend={false} items={[{ label: 'Google', value: google, hue: 'violet' }, { label: 'Telegram', value: telegram, hue: 'orange' }]} /></div>
      </div>
    </div>
  );
};

/**
 * Ro'yxatdan o'tgan mijozlar (v2): tepada KPI qatori (jami, shu oyda yangi — o'tgan oy bilan, buyurtma bergan,
 * kirish usuli ulushi) — hammasi yuklangan ro'yxatdan hisoblanadi. Jadval: avatar + ism + ID, aloqa, kirish usuli,
 * buyurtmalar soni (oxirgisi qachon), ro'yxatdan o'tgan sana; qator bosilsa — mijoz sahifasi. Qidiruv ism, email
 * yoki telefon raqamlari bo'yicha (raqamli so'rov bo'shliq/tiredan qat'i nazar); `q` va `page` URL'da.
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

  /** KPI'lar: oy chegarasi Toshkent vaqtida; trend — so'nggi 30 kunning kunlik ro'yxatdan o'tishi va jami o'sishi. */
  const kpi = useMemo(() => {
    const all = items ?? [];
    const now = new Date(Date.now() + TZ * 1000);
    const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000 - TZ;
    const prevStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1) / 1000 - TZ;
    const firstDay = Math.floor((Date.now() / 1000 + TZ) / DAY) - 29;
    const daily = Array.from({ length: 30 }, () => 0);
    let before = 0;
    for (const c of all) {
      const d = Math.floor((c.createdAt + TZ) / DAY) - firstDay;
      if (d < 0) before++;
      else if (d < 30) daily[d]++;
    }
    let acc = before;
    const buyers = all.filter((c) => c.orderCount > 0).length;
    return {
      total: all.length,
      withPhone: all.filter((c) => c.phone).length,
      month: all.filter((c) => c.createdAt >= monthStart).length,
      // Adolatli taqqoslash: o'tgan oyning xuddi shu kunigacha (to'liq oy bilan solishtirilsa oy boshida doim «pasayish» chiqardi).
      prevMonth: all.filter((c) => c.createdAt >= prevStart && c.createdAt < Math.min(monthStart, prevStart + (Date.now() / 1000 - monthStart))).length,
      buyers,
      buyersPct: all.length ? Math.round((buyers / all.length) * 100) : 0,
      google: all.filter((c) => c.via === 'google').length,
      telegram: all.filter((c) => c.via === 'telegram').length,
      growth: daily.map((v) => (acc += v)),
    };
  }, [items]);

  const columns: Column<ApiAdminCustomer>[] = [
    {
      id: 'who', label: t('shared.customer'), mobile: 'title',
      cell: (c) => (
        <span className="flex min-w-0 items-center gap-3">
          <Avatar name={c.name || '?'} src={c.avatar && isAvatarPhoto(c.avatar, c.id) ? c.avatar : null} size="md" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-text md:max-w-56">{c.name || t('customersList.noName')}</span>
            <span className="text-sm font-normal tabular-nums text-text-faint">ID №{c.id}</span>
          </span>
        </span>
      ),
    },
    {
      id: 'contact', label: t('customersList.contact'),
      cell: (c) => (
        <span className="flex min-w-0 flex-col gap-0.5">
          {c.phone && <a href={telHref(c.phone)} className="whitespace-nowrap text-sm font-medium tabular-nums text-text hover:underline">{c.phone}</a>}
          {c.email && <span className="truncate text-sm text-text-muted md:max-w-56">{c.email}</span>}
          {!c.phone && !c.email && <span className="text-text-faint">—</span>}
        </span>
      ),
    },
    { id: 'via', label: t('customersList.via'), cell: (c) => <ViaBadge via={c.via} /> },
    {
      id: 'orders', label: t('customersList.orders'), align: 'right',
      cell: (c) => (c.orderCount > 0 ? (
        <span className="inline-flex flex-col items-end">
          <span className="font-semibold tabular-nums text-text">{c.orderCount}</span>
          {c.lastOrderAt && <span className="hidden whitespace-nowrap text-sm text-text-faint lg:block">{t('customersList.lastOrder', { when: timeAgo(c.lastOrderAt) })}</span>}
        </span>
      ) : <span className="tabular-nums text-text-faint">0</span>),
    },
    {
      id: 'date', label: t('customersList.registered'),
      cell: (c) => <span className="whitespace-nowrap text-sm tabular-nums text-text-muted">{formatDateTime(c.createdAt)}</span>,
    },
  ];

  const empty: ReactNode = q ? (
    <div className="p-6">
      <EmptyState
        title={t('shared.notFoundTitle')}
        action={<Button variant="secondary" onClick={() => update('q', '')}>{t('shared.clearSearch')}</Button>}
      />
    </div>
  ) : (
    <div className="p-6"><EmptyState icon={<Users />} title={t('customersList.emptyTitle')} text={t('customersList.emptyText')} /></div>
  );

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <EmptyState icon={<WarningCircle />} title={t('shared.loadErrorTitle')} text={error} action={<Button variant="secondary" onClick={load}>{t('common:retry')}</Button>} />
      ) : !items ? (
        <div className="flex flex-col gap-6" aria-busy="true">
          <div className="skeleton h-[150px] rounded-surface" />
          <div className="skeleton h-[420px] rounded-surface" />
        </div>
      ) : (
        <>
          <div className="stagger" style={{ ['--i' as string]: 0 } as Record<string, number>}>
            <KpiStrip>
              <Kpi icon={Users} hue="violet" label={t('customersList.kpiTotal')} value={kpi.total} note={t('customersList.kpiTotalNote', { n: kpi.withPhone })} spark={kpi.growth} />
              <Kpi
                icon={UserPlus} hue="blue" label={t('customersList.kpiMonth')} value={kpi.month}
                delta={pctChange(kpi.month, kpi.prevMonth)} note={t('customersList.kpiMonthNote', { n: kpi.prevMonth })}
              />
              <Kpi icon={ShoppingBagOpen} hue="orange" label={t('customersList.kpiBuyers')} value={kpi.buyers} note={t('customersList.kpiBuyersNote', { n: kpi.buyersPct })} />
              <ViaCell label={t('customersList.kpiVia')} google={kpi.google} telegram={kpi.telegram} />
            </KpiStrip>
          </div>

          <div className="stagger flex flex-col gap-4" style={{ ['--i' as string]: 1 } as Record<string, number>}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="sm:w-72"><SearchInput value={q} onChange={(v) => update('q', v)} placeholder={t('customersList.searchPlaceholder')} /></div>
              <p className="text-sm text-text-muted">{t('customersList.count', { count: filtered.length })}</p>
            </div>
            <div>
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(c) => String(c.id)}
                onRowClick={(c) => navigate(`${LIST}/${c.id}`, { state: { search: params.toString() } })}
                empty={empty}
              />
              <Pagination page={safePage} pageCount={pageCount} total={filtered.length} onChange={(p) => update('page', String(p))} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CustomersList;
