import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ImageBroken, Plus, SealCheck, Tag, WarningCircle } from '../icons';
import { useTranslation } from 'react-i18next';
import type { ApiAdminBrand } from '../../../shared/types';
import { listBrands } from '../api';
import { Avatar, Badge, Button, EmptyState, Pagination, SearchInput } from '../ui';
import { StatTile } from '../StatusControls';
import { CountUp } from '../ui/stats';

const LIST = '/admin/products/brands';
/** To'r 2/3/4/5/6 ustunli — 30 hammasiga bo'linadi, oxirgi qator yarim qolmaydi. */
const PAGE_SIZE = 30;

const stagger = (i: number) => ({ ['--i' as string]: i } as Record<string, number>);

/**
 * Brendlar — logotiplar to'ri: kulrang kartochka, logo oq orolchada (tasmadagidek bir rangga keltirilgan), nom,
 * manzil, tovarlar soni.
 * Logotipi borlari bosh sahifadagi tasmada chiqadi. Karta bosilsa tahrir. Qidiruv va sahifa URL'da (`q`, `page`).
 */
const BrandsList: FC = () => {
  const { t } = useTranslation('products');
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [rawItems, setItems] = useState(null as ApiAdminBrand[] | null);
  const items = rawItems as ApiAdminBrand[] | null;
  const [error, setError] = useState('');

  useEffect(() => {
    listBrands().then(setItems).catch(() => setError(t('shared.loadError')));
  }, []);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items ?? [];
    return (items ?? []).filter((b) => b.name.toLowerCase().includes(needle) || b.slug.includes(needle));
  }, [items, q]);

  const newButton = <Button to={`${LIST}/new`} className="max-sm:w-full"><Plus weight="bold" />{t('shared.newBrand')}</Button>;

  if (error) return <EmptyState icon={<WarningCircle />} title={t('shared.loadErrorTitle')} text={error} />;
  if (!items) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-[86px] rounded-surface" />)}</div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{Array.from({ length: 10 }, (_, i) => <div key={i} className="skeleton h-52 rounded-surface" />)}</div>
      </div>
    );
  }

  const withLogo = items.filter((b) => b.logoUrl).length;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-base text-text-muted">{t('brandsList.intro')}</p>
      <div className="stagger grid gap-3 sm:grid-cols-3">
        <StatTile icon={Tag} label={t('brandsList.statTotal')}><CountUp value={items.length} /></StatTile>
        <StatTile icon={SealCheck} label={t('brandsList.statStrip')}><CountUp value={withLogo} /></StatTile>
        <StatTile icon={ImageBroken} label={t('brandsList.statNoLogo')}><CountUp value={items.length - withLogo} /></StatTile>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="sm:w-64 xl:w-72">
          <SearchInput value={q} onChange={(v) => update('q', v)} placeholder={t('shared.searchByName')} />
        </div>
        <p className="text-sm tabular-nums text-text-muted">{t('brandsList.count', { count: filtered.length })}</p>
        <div className="sm:ml-auto">{newButton}</div>
      </div>
      {rows.length === 0 ? (
        q
          ? <EmptyState icon={<Tag />} title={t('brandsList.notFound')} action={<Button variant="secondary" onClick={() => setParams({}, { replace: true })}>{t('shared.clearFilter')}</Button>} />
          : <EmptyState icon={<Tag />} title={t('brandsList.empty')} action={newButton} />
      ) : (
        <div className="flex flex-col">
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {rows.map((b, i) => (
              <li key={b.id} className="stagger min-w-0" style={stagger(Math.min(i, 12))}>
                <Link
                  to={`${LIST}/${b.id}`}
                  className="group flex h-full flex-col gap-3 rounded-surface border border-border bg-surface p-3 transition-colors duration-200 hover:bg-ghost-hover"
                >
                  <div className="relative grid aspect-[16/10] place-items-center rounded-control-lg bg-surface-sunken p-4">
                    {b.logoUrl
                      ? <img src={b.logoUrl} alt="" className="max-h-10 max-w-[75%] object-contain brightness-0 dark:invert" />
                      : <Avatar name={b.name} size="lg" />}
                    {b.logoUrl && (
                      <span title={t('brandsList.stripColumn')} className="absolute right-2 top-2 text-success">
                        <SealCheck weight="fill" className="size-4" />
                      </span>
                    )}
                    <span title={t('shared.sortOrder')} className="absolute left-2 top-2 text-xs font-semibold tabular-nums text-text-faint">#{b.sortOrder}</span>
                  </div>
                  <div className="min-w-0 px-1">
                    <p className="truncate text-base font-bold text-text">{b.name}</p>
                    <p className="truncate text-sm text-text-faint">/brand/{b.slug}</p>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-1.5 px-1">
                    <Badge tone={b.productCount > 0 ? 'info' : 'neutral'}>{t('brandsList.products', { n: b.productCount })}</Badge>
                    {!b.logoUrl && <Badge tone="attention">{t('brandsList.noLogo')}</Badge>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={safePage} pageCount={pageCount} total={filtered.length} onChange={(p) => update('page', String(p))} />
        </div>
      )}
    </div>
  );
};

export default BrandsList;
