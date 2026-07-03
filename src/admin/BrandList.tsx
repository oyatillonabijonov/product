import { useEffect, useState } from 'react';
import type { ApiBrand } from '../../shared/types';
import { deleteBrand, listBrands } from './api';
import BrandForm from './BrandForm';

export default function BrandList() {
  const [items, setItems] = useState<ApiBrand[]>([]);
  const [editing, setEditing] = useState<ApiBrand | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    setItems(await listBrands());
    setLoading(false);
    setEditing(null);
    setCreating(false);
  }
  useEffect(() => { refresh(); }, []);

  async function remove(b: ApiBrand) {
    if (!window.confirm(`"${b.name}" brendi o'chirilsinmi? (mahsulotlar brendsiz qoladi)`)) return;
    await deleteBrand(b.id);
    refresh();
  }

  if (loading) return <p className="text-muted">Yuklanmoqda…</p>;
  return (
    <div>
      {creating && <BrandForm initial={null} onSaved={refresh} onCancel={() => setCreating(false)} />}
      {editing && <BrandForm key={editing.id} initial={editing} onSaved={refresh} onCancel={() => setEditing(null)} />}
      {!creating && !editing && (
        <button onClick={() => setCreating(true)} className="mb-4 px-5 py-2.5 bg-primary text-white font-semibold rounded-full">+ Yangi brend</button>
      )}
      <div className="space-y-2">
        {items.map((b) => (
          <div key={b.id} className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-[--shadow-apple]">
            {b.logoUrl ? <img src={b.logoUrl} alt="" className="w-10 h-10 rounded-full object-cover bg-bg" /> : <div className="w-10 h-10 rounded-full bg-bg" />}
            <div className="flex-1">
              <div className="font-semibold">{b.name}</div>
              <div className="text-[13px] text-muted">{b.slug}</div>
            </div>
            <button onClick={() => setEditing(b)} className="text-[13px] text-accent font-semibold px-2">Tahrir</button>
            <button onClick={() => remove(b)} className="text-[13px] text-danger px-2">O'chir</button>
          </div>
        ))}
      </div>
    </div>
  );
}
