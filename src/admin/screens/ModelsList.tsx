import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { ApiAdminBrand, ApiCategory, ApiDeviceModel } from '../../../shared/types';
import { listBrands, listCategories, listDeviceModels } from '../api';
import { filterModels } from '../lib/models';
import { Button, Card, DataTable, EmptyState, Pagination, SearchInput, Select, Skeleton, type Column } from '../ui';

const PAGE_SIZE = 20;
const LIST = '/admin/products/models';

/** Qurilma modellari registri — mahsulot formasidagi `ModelCombobox` shu ro'yxatdan to'ldiradi. Filtrlar URL'da. */
const ModelsList: FC = () => {
  const { t } = useTranslation('products');
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const brand = params.get('brand') ?? '';
  const cat = params.get('cat') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [rawItems, setItems] = useState(null as ApiDeviceModel[] | null);
  const items = rawItems as ApiDeviceModel[] | null;
  const [rawBrands, setBrands] = useState([] as ApiAdminBrand[]);
  const brands = rawBrands as ApiAdminBrand[];
  const [rawCats, setCats] = useState([] as ApiCategory[]);
  const cats = rawCats as ApiCategory[];
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([listDeviceModels(), listBrands(), listCategories()])
      .then(([m, b, c]) => { setItems(m); setBrands(b); setCats(c); })
      .catch(() => setError(t('shared.loadError')));
  }, []);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  }

  const filtered = useMemo(() => {
    const all = items ?? [];
    return filterModels(all, q, all.length).filter((m) => (!brand || m.brandId === brand) && (!cat || m.categoryId === cat));
  }, [items, q, brand, cat]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const brandName = (id: string) => brands.find((b) => b.id === id)?.name ?? id;
  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? id;
  // Registrdagi eskirgan `categoryId`lar (0025'gacha) `cats`da yo'q — bo'lmasa ular bilan filtrlab bo'lmasdi.
  const catOptions = [
    ...cats.map((c) => ({ id: c.id, name: c.name })),
    ...[...new Set((items ?? []).map((m) => m.categoryId))].filter((id) => !cats.some((c) => c.id === id)).map((id) => ({ id, name: id })),
  ];

  const columns: Column<ApiDeviceModel>[] = [
    { id: 'name', label: t('shared.name'), mobile: 'title', cell: (m) => <span className="text-primary">{m.name}</span> },
    { id: 'brand', label: t('shared.brand'), cell: (m) => <span className="text-muted">{brandName(m.brandId)}</span> },
    { id: 'cat', label: t('shared.category'), cell: (m) => <span className="text-muted">{catName(m.categoryId)}</span> },
    { id: 'chip', label: t('modelsList.chipColumn'), cell: (m) => <span className="text-muted">{m.chip || '—'}</span> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-64">
          <SearchInput value={q} onChange={(v) => update('q', v)} placeholder={t('modelsList.searchPlaceholder')} />
        </div>
        <div className="w-full sm:w-44">
          <Select value={brand} onChange={(v) => update('brand', v)}>
            <option value="">{t('shared.allBrands')}</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </div>
        <div className="w-full sm:w-44">
          <Select value={cat} onChange={(v) => update('cat', v)}>
            <option value="">{t('shared.allCategories')}</option>
            {catOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div className="sm:ml-auto">
          <Button to={`${LIST}/new`}>{t('shared.newModel')}</Button>
        </div>
      </div>
      {error ? (
        <EmptyState title={t('shared.loadErrorTitle')} text={error} />
      ) : !items ? (
        <Skeleton rows={8} />
      ) : (
        <>
          <p className="text-label text-muted">{t('modelsList.count', { count: filtered.length })}</p>
          <Card padded={false}>
            <div className="px-2 py-1">
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(m) => m.id}
                onRowClick={(m) => navigate(`${LIST}/${m.id}`)}
                empty={<EmptyState title={t('modelsList.notFound')} action={<Button variant="secondary" onClick={() => setParams({}, { replace: true })}>{t('shared.clearFilter')}</Button>} />}
              />
            </div>
          </Card>
          <Pagination page={safePage} pageCount={pageCount} onChange={(p) => update('page', String(p))} />
        </>
      )}
    </div>
  );
};

export default ModelsList;
