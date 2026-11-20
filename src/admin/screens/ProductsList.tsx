import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Eye, EyeSlash, ImageBroken, Info, MagnifyingGlass, Package, Plus, WarningCircle } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { ApiAdminBrand, ApiCategory, ApiProduct, ApiProductType } from '../../../shared/types';
import { listBrands, listCategories, listProducts, listTypes, setProductActive } from '../api';
import { errText } from '../errText';
import { formatSum } from '../lib/format';
import { QUICK_FILTERS, filterProducts, quickFilter, summaryText, type QuickFilter } from '../lib/product-filter';
import { Badge, Button, Card, DataTable, EmptyState, Pagination, SearchInput, Segmented, Select, Toggle, type Column, type Tone } from '../ui';
import { Kpi, KpiStrip } from '../ui/stats';
import { useToast } from '../ui/toast';

const PAGE_SIZE = 20;
const LIST = '/admin/products';
const QUICK_IDS: string[] = QUICK_FILTERS.map((q) => q.id);
/** Qoldiq shundan kam bo'lsa — «kam» (sariq belgi). */
const LOW_STOCK = 3;

const stagger = (i: number) => ({ ['--i' as string]: i } as Record<string, number>);

/** Qoldiq belgisi: 0 — qizil, kam — sariq, qolgani neytral; qo'lda kiritilganda (`null`) — chiziqcha. */
function stockTone(n: number): Tone {
  if (n <= 0) return 'danger';
  return n < LOW_STOCK ? 'attention' : 'neutral';
}

/** Ro'yxat qatoridagi eskiz — 44px, kulrang karta ichida oq orolcha; rasmsiz bo'lsa ikonka. */
const Thumb: FC<{ src: string; dim?: boolean }> = ({ src, dim }) => (
  <span className={`grid size-11 shrink-0 place-items-center overflow-hidden rounded-control bg-surface ${dim ? 'opacity-60' : ''}`}>
    {src ? <img src={src} alt="" loading="lazy" className="size-full object-contain p-0.5" /> : <ImageBroken className="size-[18px] text-text-faint" />}
  </span>
);

/**
 * Mahsulotlar ro'yxati — hammasi URL'da (`q`, `f`, `cat`, `brand`, `cond`, `page`): dashboard'dagi
 * "Rasm kerak" `?f=needs_image` bilan keladi, orqaga/oldinga ishlaydi. Tepada katalog raqamlari (bosilsa
 * o'sha tez filtr yoqiladi), ostida filtrlar va tez filtr (har birida son). Ma'lumot to'liq yuklanib client'da
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
  /** KPI kartasi havolasi — boshqa filtrlar saqlanadi, tez filtr almashadi. */
  function quickHref(id: QuickFilter): string {
    const next = new URLSearchParams(params);
    if (id) next.set('f', id); else next.delete('f');
    next.delete('page');
    const s = next.toString();
    return s ? `${LIST}?${s}` : LIST;
  }

  // Tez filtr sanoqlari boshqa filtrlar (qidiruv, kategoriya, brend, holat) ichida hisoblanadi.
  const base = useMemo(
    () => filterProducts(items ?? [], { q, categoryId: cat, brandId: brand, condition: cond }),
    [items, q, cat, brand, cond],
  );
  const filtered = useMemo(() => (f ? base.filter((p) => quickFilter(p, f)) : base), [base, f]);
  const counts = useMemo(
    () => Object.fromEntries(QUICK_FILTERS.map((qf) => [qf.id, qf.id ? base.filter((p) => quickFilter(p, qf.id)).length : base.length])) as Record<string, number>,
    [base],
  );
  const stats = useMemo(() => {
    const all = items ?? [];
    const active = all.filter((p) => p.isActive).length;
    return {
      total: all.length,
      active,
      hidden: all.length - active,
      needsImage: all.filter((p) => quickFilter(p, 'needs_image')).length,
      billz: all.filter((p) => p.billzId).length,
      pct: all.length ? Math.round((active / all.length) * 100) : 0,
    };
  }, [items]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const hasFilter = Boolean(q || f || cat || brand || cond);

  const catName = (id: string | null) => cats.find((c) => c.id === id)?.name ?? '—';
  const brandName = (id: string | null) => brands.find((b) => b.id === id)?.name;
  const typeLabel = (p: ApiProduct) => types.find((x) => x.categoryId === p.categoryId && x.id === p.type)?.label;

  async function toggle(p: ApiProduct, on: boolean) {
    // Optimistik: qator darhol almashadi, xato bo'lsa qaytadi.
    setItems((xs: ApiProduct[] | null) => xs && xs.map((x) => (x.id === p.id ? { ...x, isActive: on } : x)));
    try {
      const updated = await setProductActive(p.id, on);
      // Billz tovarida ko'rinish qoidadan hisoblanadi (rasm bor va yashirilmagan) — so'ralgan
      // qiymat bilan bir xil bo'lmasligi mumkin, shuning uchun optimistik qatorni serverniki bilan almashtiramiz.
      setItems((xs: ApiProduct[] | null) => xs && xs.map((x) => (x.id === p.id ? updated : x)));
      if (on && !updated.isActive) {
        toast(t('productsList.toastNoImage'), 'error');
      } else {
        toast(on ? t('common:shownOnSite') : t('common:hidden'));
      }
    } catch (err) {
      setItems((xs: ApiProduct[] | null) => xs && xs.map((x) => (x.id === p.id ? { ...x, isActive: !on } : x)));
      toast(errText(err), 'error');
    }
  }

  const columns: Column<ApiProduct>[] = [
    { id: 'img', label: '', className: 'w-16', mobile: 'hide', cell: (p) => <Thumb src={p.imageUrl} dim={!p.isActive} /> },
    {
      id: 'name', label: t('shared.name'), mobile: 'title',
      cell: (p) => {
        const meta = [typeLabel(p), brandName(p.brandId)].filter(Boolean).join(' · ');
        return (
          <span className="flex min-w-0 max-w-md flex-col gap-1">
            <span className={`truncate font-medium ${p.isActive ? 'text-text' : 'text-text-muted'}`}>{p.name}</span>
            <span className="flex min-w-0 flex-wrap items-center gap-1.5">
              {meta && <span className="truncate text-sm text-text-muted">{meta}</span>}
              {p.billzId
                ? <Badge tone="info" className="h-5 px-2">{t('productEdit.source.billz')}</Badge>
                : <Badge className="h-5 px-2">{t('productEdit.source.manual')}</Badge>}
              {/* i18n: ma'lumot — tarjima qilinmaydi (server bilan solishtiriladigan Condition qiymati) */}
              {p.condition === 'ishlatilgan' && <Badge tone="accent" className="h-5 px-2">{t('shared.conditionUsed')}</Badge>}
              {p.billzId && !p.imageUrl && <Badge tone="attention" dot className="h-5 px-2">{t('filter.quick.needsImage')}</Badge>}
            </span>
          </span>
        );
      },
    },
    { id: 'cat', label: t('shared.category'), cell: (p) => <span className="whitespace-nowrap text-text-muted">{catName(p.categoryId)}</span> },
    {
      id: 'price', label: t('shared.price'), align: 'right',
      cell: (p) => <span className="whitespace-nowrap font-medium tabular-nums text-text">{formatSum(p.minPriceUzs, sum)}</span>,
    },
    {
      id: 'stock', label: t('shared.stock'), align: 'right', className: 'w-24',
      cell: (p) => (p.billzStock === null
        ? <span className="text-text-faint">—</span>
        : <Badge tone={stockTone(p.billzStock)} className="h-5 min-w-8 justify-center px-2 tabular-nums">{p.billzStock}</Badge>),
    },
    {
      id: 'active', label: t('productsList.onSiteColumn'), align: 'right', className: 'w-20',
      cell: (p) => <Toggle on={p.isActive} onChange={(v) => toggle(p, v)} label={t('productsList.toggleAria', { name: p.name })} />,
    },
  ];

  const newButton = (
    <Button to={`${LIST}/new`} className="max-sm:w-full"><Plus weight="bold" />{t('shared.newProduct')}</Button>
  );

  return (
    <div className="flex flex-col gap-6">
      {!items && !error && <div aria-hidden className="skeleton h-[132px] rounded-surface" />}
      {items && !error && (
        <div className="stagger" style={stagger(0)}>
          {/* Telefonda ham 2 ustun — ro'yxat bir ekran pastga surilib ketmasin (kit sukuti 1 ustun). */}
          <KpiStrip className="max-sm:grid-cols-2">
            <Kpi icon={Package} hue="violet" label={t('productsList.kpi.total')} value={stats.total} note={t('productsList.kpi.totalNote', { n: stats.billz })} to={quickHref('')} />
            <Kpi icon={Eye} hue="green" label={t('productsList.kpi.active')} value={stats.active} note={t('productsList.kpi.activeNote', { n: stats.pct })} to={quickHref('active')} />
            <Kpi icon={EyeSlash} hue="slate" label={t('productsList.kpi.hidden')} value={stats.hidden} note={t('productsList.kpi.hiddenNote')} to={quickHref('hidden')} />
            <Kpi icon={ImageBroken} hue="orange" label={t('productsList.kpi.needsImage')} value={stats.needsImage} note={t('productsList.kpi.needsImageNote')} to={quickHref('needs_image')} />
          </KpiStrip>
        </div>
      )}

      <div className="stagger flex flex-col gap-4" style={stagger(1)}>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="sm:w-64 xl:w-72">
            <SearchInput value={q} onChange={(v) => update('q', v)} placeholder={t('shared.searchByName')} />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:contents">
            <div className="sm:w-44">
              <Select value={cat} ariaLabel={t('shared.allCategories')} onChange={(v) => update('cat', v)}>
                <option value="">{t('shared.allCategories')}</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div className="sm:w-44">
              <Select value={brand} ariaLabel={t('shared.allBrands')} onChange={(v) => update('brand', v)}>
                <option value="">{t('shared.allBrands')}</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </div>
            <div className="col-span-2 sm:w-36">
              <Select value={cond} ariaLabel={t('productsList.conditionPlaceholder')} onChange={(v) => update('cond', v)}>
                <option value="">{t('productsList.conditionPlaceholder')}</option>
                {/* i18n: ma'lumot — tarjima qilinmaydi ('yangi'/'ishlatilgan' server bilan solishtiriladigan qiymat) */}
                <option value="yangi">{t('shared.conditionNew')}</option>
                <option value="ishlatilgan">{t('shared.conditionUsed')}</option>
              </Select>
            </div>
          </div>
          <div className="sm:ml-auto">{newButton}</div>
        </div>
        <Segmented
          label={t('productsList.quickFilterLabel')}
          value={f}
          onChange={(v) => update('f', v)}
          options={QUICK_FILTERS.map((qf) => ({ id: qf.id, label: t(qf.labelKey), count: items ? counts[qf.id] : undefined }))}
        />
      </div>

      {error ? (
        <EmptyState
          icon={<WarningCircle />}
          title={t('shared.loadErrorTitle')}
          text={error}
          action={<Button variant="secondary" onClick={load}>{t('common:retry')}</Button>}
        />
      ) : !items ? (
        <div aria-busy="true" aria-label={t('common:loading')} className="skeleton h-[420px] rounded-surface" />
      ) : (
        <div className="stagger flex flex-col gap-4" style={stagger(2)}>
          <p className="flex items-start gap-2 text-sm text-text-muted">
            <Info aria-hidden className="mt-[calc(0.5lh-8px)] size-4 shrink-0 text-text-faint" />
            <span>
              {summaryText(items, t)}
              {hasFilter && <span className="font-medium text-text"> {t('productsList.matchesFilter', { count: filtered.length })}</span>}
            </span>
          </p>
          {rows.length === 0 ? (
            <EmptyState
              icon={hasFilter ? <MagnifyingGlass /> : <Package />}
              title={t('productsList.notFound')}
              action={hasFilter
                ? <Button variant="secondary" onClick={() => setParams({}, { replace: true })}>{t('shared.clearFilter')}</Button>
                : newButton}
            />
          ) : (
            <Card padded={false}>
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(p) => p.id}
                onRowClick={(p) => navigate(`${LIST}/${p.id}`, { state: { search: params.toString() } })}
              />
            </Card>
          )}
          <Pagination page={safePage} pageCount={pageCount} onChange={(p) => update('page', String(p))} total={filtered.length} />
        </div>
      )}
    </div>
  );
};

export default ProductsList;
