import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeSlash, PencilSimple, Trash } from '@phosphor-icons/react';
import type { ApiBrand, ApiCategory, ApiProduct } from '../../shared/types';
import { deleteProduct, listBrands, listCategories, listProducts, setProductActive } from './api';
import { filterProducts } from './lib/product-filter';
import { formatThousands } from './lib/format';
import IconAction from './IconAction';
import ProductForm from './ProductForm';

const PAGE_SIZE = 20;

export default function ProductList() {
  const [items, setItems] = useState<ApiProduct[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [brands, setBrands] = useState<ApiBrand[]>([]);
  const [editing, setEditing] = useState<ApiProduct | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [q, setQ] = useState('');
  const [catId, setCatId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [cond, setCond] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  async function refresh() {
    setLoading(true);
    try {
      const [prods, cats, brs] = await Promise.all([listProducts(), listCategories(), listBrands()]);
      setItems(prods);
      setCategories(cats);
      setBrands(brs);
      setError('');
    } catch {
      setError('Yuklashda xatolik');
    } finally {
      setLoading(false);
      setEditing(null);
      setCreating(false);
    }
  }
  useEffect(() => { refresh(); }, []);

  async function toggle(p: ApiProduct) {
    try { await setProductActive(p.id, !p.isActive); refresh(); }
    catch { setError('Amal bajarilmadi'); }
  }
  async function remove(p: ApiProduct) {
    if (!window.confirm(`"${p.name}" o'chirilsinmi?`)) return;
    try { await deleteProduct(p.id); refresh(); }
    catch { setError("O'chirishda xatolik"); }
  }

  const filtered = useMemo(
    () => filterProducts(items, { q, categoryId: catId, brandId, condition: cond, status }),
    [items, q, catId, brandId, cond, status],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? '—';
  const brandName = (id: string | null) => brands.find((b) => b.id === id)?.name ?? '—';

  if (loading) return <p className="text-muted">Yuklanmoqda…</p>;
  if (creating) return <ProductForm key="new" initial={null} onSaved={refresh} onCancel={() => setCreating(false)} />;
  if (editing) return <ProductForm key={editing.id} initial={editing} onSaved={refresh} onCancel={() => setEditing(null)} />;

  const select = 'border border-line rounded-xl px-3 py-2 text-[14px] bg-white focus:outline-none focus:border-accent';

  return (
    <div>
      {error && <p className="text-danger text-[14px] mb-3">{error}</p>}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Nom bo'yicha qidirish…"
          className={`${select} flex-1 min-w-[180px]`}
        />
        <select value={catId} onChange={(e) => { setCatId(e.target.value); setPage(1); }} className={select}>
          <option value="">Barcha kategoriya</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={brandId} onChange={(e) => { setBrandId(e.target.value); setPage(1); }} className={select}>
          <option value="">Barcha brend</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={cond} onChange={(e) => { setCond(e.target.value); setPage(1); }} className={select}>
          <option value="">Holat</option>
          <option value="yangi">Yangi</option>
          <option value="ishlatilgan">Ishlatilgan</option>
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={select}>
          <option value="">Status</option>
          <option value="active">Faol</option>
          <option value="hidden">Yashirin</option>
        </select>
        <button onClick={() => setCreating(true)} className="px-4 py-2 bg-primary text-white font-semibold rounded-full text-[14px]">
          + Yangi
        </button>
      </div>

      <div className="text-[13px] text-muted-2 mb-2">{filtered.length} ta mahsulot</div>

      <div className="overflow-x-auto bg-white rounded-2xl shadow-apple">
        <table className="w-full text-[14px]">
          <thead>
            <tr className="text-left text-[12px] uppercase tracking-wide text-muted-2 border-b border-line">
              <th className="p-3 font-semibold">Rasm</th>
              <th className="p-3 font-semibold">Nomi</th>
              <th className="p-3 font-semibold">Kategoriya</th>
              <th className="p-3 font-semibold">Brend</th>
              <th className="p-3 font-semibold">Narx</th>
              <th className="p-3 font-semibold">Holat</th>
              <th className="p-3 font-semibold text-right">Amallar</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((p) => (
              <tr key={p.id} className={`border-b border-line/60 last:border-0 hover:bg-bg ${p.isActive ? '' : 'opacity-60'}`}>
                <td className="p-3">
                  {p.imageUrl
                    ? <img src={p.imageUrl} alt="" className="w-11 h-11 rounded-lg object-contain bg-bg" />
                    : <div className="w-11 h-11 rounded-lg bg-bg" />}
                </td>
                <td className="p-3"><div className="font-semibold text-primary max-w-[240px] truncate">{p.name}</div></td>
                <td className="p-3 text-muted whitespace-nowrap">{catName(p.categoryId)}</td>
                <td className="p-3 text-muted whitespace-nowrap">{brandName(p.brandId)}</td>
                <td className="p-3 whitespace-nowrap">{formatThousands(p.minPriceUzs)} so'm</td>
                <td className="p-3 whitespace-nowrap">
                  <span className={`text-[12px] font-semibold ${p.condition === 'yangi' ? 'text-accent' : 'text-trust'}`}>
                    {p.condition === 'yangi' ? 'Yangi' : 'Ishlatilgan'}
                  </span>
                  {!p.isActive && <span className="ml-2 text-[12px] text-muted-2">· yashirin</span>}
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-1">
                    <IconAction Icon={PencilSimple} label="Tahrir" onClick={() => setEditing(p)} />
                    <IconAction Icon={p.isActive ? EyeSlash : Eye} label={p.isActive ? 'Yashir' : "Ko'rsat"} onClick={() => toggle(p)} />
                    <IconAction Icon={Trash} label="O'chir" onClick={() => remove(p)} danger />
                  </div>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted">Mahsulot topilmadi</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-1 mt-4">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={`min-w-9 px-3 py-1.5 rounded-lg text-[14px] font-semibold transition-colors ${
                n === safePage ? 'bg-accent text-white' : 'text-primary hover:bg-bg'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
