import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { ApiAdminBrand, ApiCategory, ApiProduct, ApiProductType } from '../../../shared/types';
import { listBrands, listCategories, listProducts, listTypes, setProductActive } from '../api';
import { errText } from '../errText';
import { formatThousands } from '../lib/format';
import { QUICK_FILTERS, filterProducts, type QuickFilter } from '../lib/product-filter';
import { Badge, Button, Card, DataTable, EmptyState, Input, Pagination, Segmented, Select, Skeleton, Toggle, type Column } from '../ui';
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
      .then(([p, c, b, t]) => { setItems(p); setCats(c); setBrands(b); setTypes(t); })
      .catch(() => setError('Yuklashda xatolik'));
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
      toast(on ? "Saytda ko'rsatildi" : 'Yashirildi');
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
      id: 'name', label: 'Nomi', mobile: 'title', className: 'max-w-[360px]',
      cell: (p) => (
        <span className="flex min-w-0 flex-col gap-1">
          <span className={`truncate ${p.isActive ? 'text-primary' : 'text-muted'}`}>{p.name}</span>
          <span className="flex flex-wrap items-center gap-1.5 text-label text-muted-2">
            {p.billzId && <Badge>Billz</Badge>}
            {p.billzId && !p.imageUrl && <Badge tone="attention">Rasm kerak</Badge>}
            {p.condition === 'ishlatilgan' && <Badge tone="info">Ishlatilgan</Badge>}
            {typeLabel(p) && <span>{typeLabel(p)}</span>}
          </span>
        </span>
      ),
    },
    { id: 'cat', label: 'Kategoriya', cell: (p) => <span className="text-muted">{catName(p.categoryId)}</span> },
    { id: 'price', label: 'Narx', align: 'right', cell: (p) => <span className="whitespace-nowrap tabular-nums">{formatThousands(p.minPriceUzs)} so'm</span> },
    { id: 'stock', label: 'Qoldiq', align: 'right', className: 'w-20', cell: (p) => <span className={p.billzStock === 0 ? 'text-muted-2' : 'text-muted'}>{p.billzStock ?? '—'}</span> },
    { id: 'active', label: 'Saytda', align: 'right', className: 'w-20', cell: (p) => <Toggle on={p.isActive} onChange={(v) => toggle(p, v)} label={`${p.name} — saytda ko'rsatish`} /> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:max-w-xs sm:flex-1">
          <Input value={q} onChange={(v) => update('q', v)} placeholder="Nom bo'yicha qidirish…" />
        </div>
        <div className="w-full sm:w-44">
          <Select value={cat} onChange={(v) => update('cat', v)}>
            <option value="">Barcha kategoriya</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div className="w-full sm:w-44">
          <Select value={brand} onChange={(v) => update('brand', v)}>
            <option value="">Barcha brend</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </div>
        <div className="w-full sm:w-36">
          <Select value={cond} onChange={(v) => update('cond', v)}>
            <option value="">Holati</option>
            <option value="yangi">Yangi</option>
            <option value="ishlatilgan">Ishlatilgan</option>
          </Select>
        </div>
        <div className="sm:ml-auto">
          <Button to={`${LIST}/new`}>Yangi mahsulot</Button>
        </div>
      </div>
      <Segmented label="Tez filtr" value={f} onChange={(v) => update('f', v)} options={QUICK_FILTERS} />

      {error ? (
        <EmptyState title="Ma'lumot yuklanmadi" text={error} action={<Button variant="secondary" onClick={load}>Qayta urinish</Button>} />
      ) : !items ? (
        <Skeleton rows={8} />
      ) : (
        <>
          <p className="text-label text-muted">{filtered.length} ta mahsulot</p>
          <Card padded={false}>
            <div className="px-2 py-1">
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(p) => p.id}
                onRowClick={(p) => navigate(`${LIST}/${p.id}`)}
                empty={
                  <EmptyState
                    title="Mahsulot topilmadi"
                    action={hasFilter
                      ? <Button variant="secondary" onClick={() => setParams({}, { replace: true })}>Filtrni tozalash</Button>
                      : <Button to={`${LIST}/new`}>Yangi mahsulot</Button>}
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
