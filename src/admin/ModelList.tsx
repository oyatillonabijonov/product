import { useEffect, useMemo, useState } from 'react';
import { PencilSimple, Trash } from '@phosphor-icons/react';
import type { ApiDeviceModel } from '../../shared/types';
import { deleteDeviceModel, listDeviceModels } from './api';
import { filterModels } from './lib/models';
import IconAction from './IconAction';
import ModelForm from './ModelForm';

const PAGE_SIZE = 20;

export default function ModelList() {
  const [items, setItems] = useState<ApiDeviceModel[]>([]);
  const [editing, setEditing] = useState<ApiDeviceModel | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [brand, setBrand] = useState('');
  const [cat, setCat] = useState('');
  const [page, setPage] = useState(1);

  async function refresh() {
    setLoading(true);
    try {
      setItems(await listDeviceModels());
      setError('');
    } catch {
      setError("Yuklashda xatolik (migratsiya qo'llanganmi?)");
    } finally {
      setLoading(false);
      setEditing(null);
      setCreating(false);
    }
  }
  useEffect(() => { refresh(); }, []);

  async function remove(m: ApiDeviceModel) {
    if (!window.confirm(`"${m.name}" modeli o'chirilsinmi?`)) return;
    try { await deleteDeviceModel(m.id); refresh(); }
    catch { setError("O'chirishda xatolik"); }
  }

  const brandOptions = useMemo(() => [...new Set(items.map((m) => m.brandId))].sort(), [items]);
  const catOptions = useMemo(() => [...new Set(items.map((m) => m.categoryId))].sort(), [items]);

  const filtered = useMemo(() => {
    const byName = filterModels(items, query, items.length);
    return byName.filter((m) => (!brand || m.brandId === brand) && (!cat || m.categoryId === cat));
  }, [items, query, brand, cat]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (loading) return <p className="text-muted">Yuklanmoqda…</p>;
  if (error) return <p className="text-danger">{error}</p>;
  if (creating) return <ModelForm initial={null} onSaved={refresh} onCancel={() => setCreating(false)} />;
  if (editing) return <ModelForm key={editing.id} initial={editing} onSaved={refresh} onCancel={() => setEditing(null)} />;

  const select = 'border border-line rounded-xl px-3 py-2 text-[14px] bg-white focus:outline-none focus:border-accent';

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder="Qidirish (masalan: 16 pro)"
          className={`${select} flex-1 min-w-[180px]`}
        />
        <select value={brand} onChange={(e) => { setBrand(e.target.value); setPage(1); }} className={select}>
          <option value="">Barcha brend</option>
          {brandOptions.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={cat} onChange={(e) => { setCat(e.target.value); setPage(1); }} className={select}>
          <option value="">Barcha kategoriya</option>
          {catOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => setCreating(true)} className="px-4 py-2 bg-primary text-white font-semibold rounded-full text-[14px]">
          + Yangi model
        </button>
      </div>

      <div className="text-[13px] text-muted-2 mb-2">{filtered.length} ta model</div>

      <div className="overflow-x-auto bg-white rounded-2xl shadow-apple">
        <table className="w-full text-[14px]">
          <thead>
            <tr className="text-left text-[12px] uppercase tracking-wide text-muted-2 border-b border-line">
              <th className="p-3 font-semibold">Nomi</th>
              <th className="p-3 font-semibold">Brend</th>
              <th className="p-3 font-semibold">Kategoriya</th>
              <th className="p-3 font-semibold">Chip</th>
              <th className="p-3 font-semibold text-right">Amallar</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((m) => (
              <tr key={m.id} className="border-b border-line/60 last:border-0 hover:bg-bg">
                <td className="p-3"><div className="font-semibold text-primary max-w-[280px] truncate">{m.name}</div></td>
                <td className="p-3 text-muted whitespace-nowrap">{m.brandId}</td>
                <td className="p-3 text-muted whitespace-nowrap">{m.categoryId}</td>
                <td className="p-3 text-muted whitespace-nowrap">{m.chip}</td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-1">
                    <IconAction Icon={PencilSimple} label="Tahrir" onClick={() => setEditing(m)} />
                    <IconAction Icon={Trash} label="O'chir" onClick={() => remove(m)} danger />
                  </div>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-muted">Modellar topilmadi</td></tr>
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
