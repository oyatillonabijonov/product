import { useEffect, useState } from 'react';
import type { ApiProduct } from '../../shared/types';
import { deleteProduct, listProducts, setProductActive } from './api';
import ProductForm from './ProductForm';

export default function ProductList() {
  const [items, setItems] = useState<ApiProduct[]>([]);
  const [editing, setEditing] = useState<ApiProduct | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    setLoading(true);
    try {
      setItems(await listProducts());
      setError('');
    } catch {
      setError('Yuklashda xatolik');
    } finally {
      setLoading(false);
      setEditing(null);
      setCreating(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function toggle(p: ApiProduct) {
    try {
      await setProductActive(p.id, !p.isActive);
      refresh();
    } catch {
      setError('Amal bajarilmadi');
    }
  }

  async function remove(p: ApiProduct) {
    if (!window.confirm(`"${p.name}" o'chirilsinmi?`)) return;
    try {
      await deleteProduct(p.id);
      refresh();
    } catch {
      setError("O'chirishda xatolik");
    }
  }

  if (loading) return <p className="text-muted">Yuklanmoqda…</p>;

  return (
    <div>
      {error && <p className="text-danger text-[14px] mb-3">{error}</p>}
      {creating && <ProductForm key="new" initial={null} onSaved={refresh} onCancel={() => setCreating(false)} />}
      {editing && <ProductForm key={editing.id} initial={editing} onSaved={refresh} onCancel={() => setEditing(null)} />}

      {!creating && !editing && (
        <button
          onClick={() => setCreating(true)}
          className="mb-4 px-5 py-2.5 bg-primary text-white font-semibold rounded-full"
        >
          + Yangi mahsulot
        </button>
      )}

      <div className="space-y-2">
        {items.map((p) => (
          <div
            key={p.id}
            className={`bg-white rounded-2xl p-3 flex items-center gap-3 shadow-apple ${
              p.isActive ? '' : 'opacity-50'
            }`}
          >
            {p.imageUrl ? (
              <img src={p.imageUrl} alt="" className="w-12 h-12 object-contain rounded-lg bg-bg" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-bg" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{p.name}</div>
              <div className="text-[13px] text-muted">
                {p.condition} · {p.cashPriceUzs.toLocaleString('ru-RU').replace(/,/g, ' ')} so'm
              </div>
            </div>
            <button onClick={() => setEditing(p)} className="text-[13px] text-accent font-semibold px-2">
              Tahrir
            </button>
            <button onClick={() => toggle(p)} className="text-[13px] text-muted px-2">
              {p.isActive ? 'Yashir' : "Ko'rsat"}
            </button>
            <button onClick={() => remove(p)} className="text-[13px] text-danger px-2">
              O'chir
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
