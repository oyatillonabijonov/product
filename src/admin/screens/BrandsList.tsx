import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { ApiAdminBrand } from '../../../shared/types';
import { listBrands } from '../api';
import { Button, Card, DataTable, EmptyState, SearchInput, Skeleton, type Column } from '../ui';

const LIST = '/admin/products/brands';

/** Brendlar — logotipi borlari bosh sahifadagi tasmada chiqadi; qator bosilsa tahrir. Qidiruv URL'da (`q`), sahifalash yo'q. */
const BrandsList: FC = () => {
  const { t } = useTranslation('products');
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [rawItems, setItems] = useState(null as ApiAdminBrand[] | null);
  const items = rawItems as ApiAdminBrand[] | null;
  const [error, setError] = useState('');

  useEffect(() => {
    listBrands().then(setItems).catch(() => setError(t('shared.loadError')));
  }, []);

  function updateQ(value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set('q', value); else next.delete('q');
    setParams(next, { replace: true });
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items ?? [];
    return (items ?? []).filter((b) => b.name.toLowerCase().includes(needle) || b.slug.includes(needle));
  }, [items, q]);

  const columns: Column<ApiAdminBrand>[] = [
    {
      id: 'logo', label: '', className: 'w-14', mobile: 'hide',
      cell: (b) => (b.logoUrl
        ? <img src={b.logoUrl} alt="" className="size-10 rounded-xs bg-fill-2 object-contain p-1" />
        : <span className="flex size-10 items-center justify-center rounded-xs bg-fill-2 text-para font-medium text-primary">{b.name.slice(0, 1)}</span>),
    },
    {
      id: 'name', label: t('shared.name'), mobile: 'title',
      cell: (b) => (
        <span className="flex flex-col">
          <span className="text-primary">{b.name}</span>
          <span className="text-label text-muted-2">/brand/{b.slug}</span>
        </span>
      ),
    },
    { id: 'count', label: t('shared.product'), align: 'right', className: 'w-24', cell: (b) => <span className={b.productCount > 0 ? 'text-primary' : 'text-muted-2'}>{b.productCount}</span> },
    { id: 'strip', label: t('brandsList.stripColumn'), className: 'w-24', cell: (b) => <span className="text-muted">{b.logoUrl ? t('brandsList.yes') : '—'}</span> },
    { id: 'sort', label: t('shared.sortOrder'), align: 'right', className: 'w-20', cell: (b) => <span className="text-muted">{b.sortOrder}</span>, mobile: 'hide' },
  ];

  if (error) return <EmptyState title={t('shared.loadErrorTitle')} text={error} />;
  if (!items) return <Skeleton rows={8} />;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-para text-muted">{t('brandsList.intro')}</p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-64">
          <SearchInput value={q} onChange={updateQ} placeholder={t('shared.searchByName')} />
        </div>
        <div className="sm:ml-auto">
          <Button to={`${LIST}/new`}>{t('shared.newBrand')}</Button>
        </div>
      </div>
      <p className="text-label text-muted">{t('brandsList.count', { count: filtered.length })}</p>
      <Card padded={false}>
        <div className="px-2 py-1">
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(b) => b.id}
            onRowClick={(b) => navigate(`${LIST}/${b.id}`)}
            empty={q
              ? <EmptyState title={t('brandsList.notFound')} action={<Button variant="secondary" onClick={() => setParams({}, { replace: true })}>{t('shared.clearFilter')}</Button>} />
              : <EmptyState title={t('brandsList.empty')} action={<Button to={`${LIST}/new`}>{t('shared.newBrand')}</Button>} />}
          />
        </div>
      </Card>
    </div>
  );
};

export default BrandsList;
