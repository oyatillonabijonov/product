import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { MagnifyingGlass, Plus, WarningCircle } from '../icons';
import { useTranslation } from 'react-i18next';
import type { ApiAdminBrand, ApiCategory, ApiDeviceModel } from '../../../shared/types';
import { listBrands, listCategories, listDeviceModels } from '../api';
import { filterModels } from '../lib/models';
import { Avatar, Badge, Button, DataTable, EmptyState, Pagination, SearchInput, Select, Skeleton, type Column, type Hue } from '../ui';

const PAGE_SIZE = 20;
const LIST = '/admin/products/models';
/** Yo'nalish rangi tartib bo'yicha — «Yo'nalishlar» kartalari va Bosh sahifa grafigi bilan bir xil. */
const HUES: Hue[] = ['violet', 'orange', 'blue', 'green'];
const CHIP: Record<Hue, string> = {
  violet: 'bg-c-violet/12 text-c-violet', orange: 'bg-c-orange/12 text-c-orange', blue: 'bg-c-blue/12 text-c-blue', green: 'bg-c-green/14 text-c-green',
  pink: 'bg-c-pink/12 text-c-pink', teal: 'bg-c-teal/12 text-c-teal', amber: 'bg-c-amber/14 text-c-amber', slate: 'bg-c-slate/12 text-c-slate',
};
const specCount = (m: ApiDeviceModel) => [m.chip, m.ram, m.camera, m.display].filter((v) => v.trim() !== '').length;

/** Brend belgisi: logotip bo'lsa oq orolchada (bir rangga keltirilgan), bo'lmasa rangli bosh harf. */
const BrandMark: FC<{ brand: ApiAdminBrand | undefined; fallback: string }> = ({ brand, fallback }) => (
  brand?.logoUrl
    ? <span className="grid size-9 shrink-0 place-items-center rounded-control bg-surface-sunken"><img src={brand.logoUrl} alt="" className="max-h-4 max-w-6 object-contain brightness-0 dark:invert" /></span>
    : <Avatar name={brand?.name ?? fallback} />
);

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
  const brandOf = (id: string) => brands.find((b) => b.id === id);
  // Registrdagi eskirgan `categoryId`lar (0025'gacha) `cats`da yo'q — bo'lmasa ular bilan filtrlab bo'lmasdi.
  const catOptions = [
    ...cats.map((c) => ({ id: c.id, name: c.name })),
    ...[...new Set((items ?? []).map((m) => m.categoryId))].filter((id) => !cats.some((c) => c.id === id)).map((id) => ({ id, name: id })),
  ];

  const catChip = (id: string) => {
    const i = cats.findIndex((c) => c.id === id);
    if (i < 0) return <Badge tone="neutral">{id}</Badge>;
    return <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-sm font-medium ${CHIP[HUES[i % HUES.length]]}`}>{cats[i].name}</span>;
  };

  const columns: Column<ApiDeviceModel>[] = [
    {
      id: 'name', label: t('shared.name'), mobile: 'title',
      cell: (m) => (
        <span className="flex min-w-0 items-center gap-3">
          <span className="max-lg:hidden"><BrandMark brand={brandOf(m.brandId)} fallback={m.brandId} /></span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-text">{m.name}</span>
            <span className="truncate text-sm text-text-muted max-lg:hidden">{brandOf(m.brandId)?.name ?? m.brandId}</span>
          </span>
        </span>
      ),
    },
    { id: 'brand', label: t('shared.brand'), className: 'lg:hidden', cell: (m) => <span>{brandOf(m.brandId)?.name ?? m.brandId}</span> },
    { id: 'cat', label: t('shared.category'), cell: (m) => catChip(m.categoryId) },
    { id: 'chip', label: t('modelsList.chipColumn'), cell: (m) => <span className="text-text-muted">{m.chip || '—'}</span> },
    {
      id: 'specs', label: t('shared.specs'),
      cell: (m) => {
        const n = specCount(m);
        return (
          <span className="inline-flex items-center gap-2" title={t('modelsList.specsFilled', { n })}>
            <span aria-hidden className="flex gap-0.5">
              {[0, 1, 2, 3].map((k) => <span key={k} className={`h-1.5 w-3 rounded-full ${k < n ? (n === 4 ? 'bg-success' : 'bg-c-violet') : 'bg-surface-sunken-hover'}`} />)}
            </span>
            <span className="text-sm tabular-nums text-text-muted">{n}/4</span>
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="lg:w-64 xl:w-72">
          <SearchInput value={q} onChange={(v) => update('q', v)} placeholder={t('modelsList.searchPlaceholder')} />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:flex">
          <div className="lg:w-44">
            <Select value={brand} onChange={(v) => update('brand', v)} ariaLabel={t('shared.brand')}>
              <option value="">{t('shared.allBrands')}</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </div>
          <div className="lg:w-44">
            <Select value={cat} onChange={(v) => update('cat', v)} ariaLabel={t('shared.category')}>
              <option value="">{t('shared.allCategories')}</option>
              {catOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
        </div>
        <div className="lg:ml-auto">
          <Button to={`${LIST}/new`} className="max-lg:w-full"><Plus weight="bold" />{t('shared.newModel')}</Button>
        </div>
      </div>
      {error ? (
        <EmptyState icon={<WarningCircle />} title={t('shared.loadErrorTitle')} text={error} />
      ) : !items ? (
        <Skeleton rows={8} />
      ) : (
        <div className="flex flex-col">
          <p className="mb-3 text-sm text-text-muted">{t('modelsList.count', { count: filtered.length })}</p>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(m) => m.id}
              onRowClick={(m) => navigate(`${LIST}/${m.id}`)}
              empty={
                <div className="p-6">
                  <EmptyState icon={<MagnifyingGlass />} title={t('modelsList.notFound')} action={<Button variant="secondary" onClick={() => setParams({}, { replace: true })}>{t('shared.clearFilter')}</Button>} />
                </div>
              }
            />
          <Pagination page={safePage} pageCount={pageCount} onChange={(p) => update('page', String(p))} total={filtered.length} />
        </div>
      )}
    </div>
  );
};

export default ModelsList;
