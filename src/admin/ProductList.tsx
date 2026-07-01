import { useEffect, useState } from 'react';
import type { ApiProduct } from '../../shared/types';
import { deleteProduct, listProducts, updateProduct } from './api';
import ProductForm from './ProductForm';

export default function ProductList() {
  const [items, setItems] = useState<ApiProduct[]>([]);
  const [editing, setEditing] = useState<ApiProduct | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    setItems(await listProducts());
    setLoading(false);
    setEditing(null);
    setCreating(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function toggle(p: ApiProduct) {
    await updateProduct(p.id, { ...p, isActive: !p.isActive });
    refresh();
  }

  async function remove(p: ApiProduct) {
    if (!window.confirm(`"${p.name}" o'chirilsinmi?`)) return;
    await deleteProduct(p.id);
    refresh();
  }

  if (loading) return <p className="text-[#6E6E73]">Yuklanmoqda…</p>;

  return (
    <div>
      {creating && <ProductForm initial={null} onSaved={refresh} onCancel={() => setCreating(false)} />}
      {editing && <ProductForm initial={editing} onSaved={refresh} onCancel={() => setEditing(null)} />}

      {!creating && !editing && (
        <button
          onClick={() => setCreating(true)}
          className="mb-4 px-5 py-2.5 bg-[#1D1D1F] text-white font-semibold rounded-full"
        >
          + Yangi mahsulot
        </button>
      )}

      <div className="space-y-2">
        {items.map((p) => (
          <div
            key={p.id}
            className={`bg-white rounded-2xl p-3 flex items-center gap-3 shadow-[--shadow-apple] ${
              p.isActive ? '' : 'opacity-50'
            }`}
          >
            {p.imageUrl ? (
              <img src={p.imageUrl} alt="" className="w-12 h-12 object-contain rounded-lg bg-[#F5F5F7]" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-[#F5F5F7]" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{p.name}</div>
              <div className="text-[13px] text-[#6E6E73]">
                {p.condition} · {p.cashPriceUzs.toLocaleString('ru-RU').replace(/,/g, ' ')} so'm
              </div>
            </div>
            <button onClick={() => setEditing(p)} className="text-[13px] text-[#0071E3] font-semibold px-2">
              Tahrir
            </button>
            <button onClick={() => toggle(p)} className="text-[13px] text-[#6E6E73] px-2">
              {p.isActive ? 'Yashir' : "Ko'rsat"}
            </button>
            <button onClick={() => remove(p)} className="text-[13px] text-[#E30000] px-2">
              O'chir
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
