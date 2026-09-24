import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { ApiAdminBrand, ApiCategory, ApiProduct, ApiProductType } from '../../../shared/types';
import { listBrands, listCategories, listProducts, listTypes, setProductActive } from '../api';
import { errText } from '../errText';
import { formatSum } from '../lib/format';
import { QUICK_FILTERS, filterProducts, summaryText, type QuickFilter } from '../lib/product-filter';
import { Badge, Button, Card, DataTable, EmptyState, Pagination, SearchInput, Segmented, Select, Skeleton, Toggle, type Column } from '../ui';
import { useToast } from '../ui/toast';

const PAGE_SIZE = 20;
const LIST = '/admin/products';
const QUICK_IDS: string[] = QUICK_FILTERS.map((q) => q.id);

/**
 * Mahsulotlar ro'yxati — hammasi URL'da (`q`, `f`, `cat`, `brand`, `cond`, `page`): dashboard'dagi
 * "Rasm kerak" `?f=needs_image` bilan keladi, orqaga/oldinga ishlaydi. Ma'lumot to'liq yuklanib client'da
 * filtrlanadi (`filterProducts`), 20 tadan sahifalanadi. Qatorda faol toggle darhol `PATCH`; qatorda
 * o'chirish yo'q — Billz tovari o'chirilmaydi (sinxronizatsiya qaytaradi), qo'lda kiritilgani tahrirda.
 */
const ProductsList: FC = () => {
  const { t } = useTranslation(['products', 'common']);
  const sum = t('common:sum');
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const rawF = params.get('f') ?? '';
  const f = (QUICK_IDS.includes(rawF) ? rawF : '') as QuickFilter;
  const cat = params.get('cat') ?? '';
  const brand = params.get('brand') ?? '';
  const cond = params.get('cond') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [rawItems, setItems] = useState(null as ApiProduct[] | null);
  const items = rawItems as ApiProduct[] | null;
  const [rawCats, setCats] = useState([] as ApiCategory[]);
  const cats = rawCats as ApiCategory[];
  const [rawBrands, setBrands] = useState([] as ApiAdminBrand[]);
  const brands = rawBrands as ApiAdminBrand[];
  const [rawTypes, setTypes] = useState([] as ApiProductType[]);
  const types = rawTypes as ApiProductType[];
  const [error, setError] = useState('');

  function load() {
    setError('');
    Promise.all([listProducts(), listCategories(), listBrands(), listTypes()])
      .then(([p, c, b, ts]) => { setItems(p); setCats(c); setBrands(b); setTypes(ts); })
      .catch(() => setError(t('shared.loadError')));
  }
  useEffect(load, []);

  /** URL parametrini yozadi; filtr o'zgarsa sahifa 1 ga qaytadi. */
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  }

  const filtered = useMemo(
    () => filterProducts(items ?? [], { q, categoryId: cat, brandId: brand, condition: cond, quick: f }),
    [items, q, cat, brand, cond, f],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const hasFilter = Boolean(q || f || cat || brand || cond);

  const catName = (id: string | null) => cats.find((c) => c.id === id)?.name ?? '—';
  const typeLabel = (p: ApiProduct) => types.find((t) => t.categoryId === p.categoryId && t.id === p.type)?.label;

  async function toggle(p: ApiProduct, on: boolean) {
    // Optimistik: qator darhol almashadi, xato bo'lsa qaytadi.
    setItems((xs: ApiProduct[] | null) => xs && xs.map((x) => (x.id === p.id ? { ...x, isActive: on } : x)));
    try {
      await setProductActive(p.id, on);
      toast(on ? t('common:shownOnSite') : t('common:hidden'));
    } catch (err) {
      setItems((xs: ApiProduct[] | null) => xs && xs.map((x) => (x.id === p.id ? { ...x, isActive: !on } : x)));
      toast(errText(err), 'error');
    }
  }

  const columns: Column<ApiProduct>[] = [
    {
      id: 'img', label: '', className: 'w-14', mobile: 'hide',
      cell: (p) => (p.imageUrl
        ? <img src={p.imageUrl} alt="" className="size-11 rounded-xs bg-white object-contain" />
        : <span className="block size-11 rounded-xs bg-fill-2" />),
    },
    {
      id: 'name', label: t('shared.name'), mobile: 'title',
      cell: (p) => (
        <span className="flex min-w-0 max-w-sm flex-col gap-1">
          <span className={`truncate ${p.isActive ? 'text-primary' : 'text-muted'}`}>{p.name}</span>
          <span className="flex flex-wrap items-center gap-1.5 text-label text-muted-2">
            {p.billzId && <Badge>Billz</Badge>}
            {p.billzId && !p.imageUrl && <Badge tone="attention">{t('filter.quick.needsImage')}</Badge>}
            {/* i18n: ma'lumot — tarjima qilinmaydi (server bilan solishtiriladigan Condition qiymati) */}
            {p.condition === 'ishlatilgan' && <Badge tone="info">{t('shared.conditionUsed')}</Badge>}
            {typeLabel(p) && <span>{typeLabel(p)}</span>}
          </span>
        </span>
      ),
    },
    { id: 'cat', label: t('shared.category'), cell: (p) => <span className="text-muted">{catName(p.categoryId)}</span> },
    { id: 'price', label: t('shared.price'), align: 'right', cell: (p) => <span className="whitespace-nowrap tabular-nums">{formatSum(p.minPriceUzs, sum)}</span> },
    { id: 'stock', label: t('shared.stock'), align: 'right', className: 'w-20', cell: (p) => <span className={p.billzStock === 0 ? 'text-muted-2' : 'text-muted'}>{p.billzStock ?? '—'}</span> },
    { id: 'active', label: t('productsList.onSiteColumn'), align: 'right', className: 'w-20', cell: (p) => <Toggle on={p.isActive} onChange={(v) => toggle(p, v)} label={t('productsList.toggleAria', { name: p.name })} /> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-64">
          <SearchInput value={q} onChange={(v) => update('q', v)} placeholder={t('shared.searchByName')} />
        </div>
        <div className="w-full sm:w-44">
          <Select value={cat} onChange={(v) => update('cat', v)}>
            <option value="">{t('shared.allCategories')}</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div className="w-full sm:w-44">
          <Select value={brand} onChange={(v) => update('brand', v)}>
            <option value="">{t('shared.allBrands')}</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </div>
        <div className="w-full sm:w-36">
          <Select value={cond} onChange={(v) => update('cond', v)}>
            <option value="">{t('productsList.conditionPlaceholder')}</option>
            {/* i18n: ma'lumot — tarjima qilinmaydi ('yangi'/'ishlatilgan' server bilan solishtiriladigan qiymat) */}
            <option value="yangi">{t('shared.conditionNew')}</option>
            <option value="ishlatilgan">{t('shared.conditionUsed')}</option>
          </Select>
        </div>
        <div className="sm:ml-auto">
          <Button to={`${LIST}/new`}>{t('shared.newProduct')}</Button>
        </div>
      </div>
      <Segmented label={t('productsList.quickFilterLabel')} value={f} onChange={(v) => update('f', v)} options={QUICK_FILTERS.map((qf) => ({ id: qf.id, label: t(qf.labelKey) }))} />

      {error ? (
        <EmptyState title={t('shared.loadErrorTitle')} text={error} action={<Button variant="secondary" onClick={load}>{t('common:retry')}</Button>} />
      ) : !items ? (
        <Skeleton rows={8} />
      ) : (
        <>
          <p className="text-para text-muted">
            {summaryText(items, t)}
            {hasFilter && <span className="text-primary"> {t('productsList.matchesFilter', { count: filtered.length })}</span>}
          </p>
          <Card padded={false}>
            <div className="px-2 py-1">
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(p) => p.id}
                onRowClick={(p) => navigate(`${LIST}/${p.id}`, { state: { search: params.toString() } })}
                empty={
                  <EmptyState
                    title={t('productsList.notFound')}
                    action={hasFilter
                      ? <Button variant="secondary" onClick={() => setParams({}, { replace: true })}>{t('shared.clearFilter')}</Button>
                      : <Button to={`${LIST}/new`}>{t('shared.newProduct')}</Button>}
                  />
                }
              />
            </div>
          </Card>
          <Pagination page={safePage} pageCount={pageCount} onChange={(p) => update('page', String(p))} />
        </>
      )}
    </div>
  );
};

export default ProductsList;
