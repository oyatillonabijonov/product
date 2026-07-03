import { useEffect, useState } from 'react';
import type { ApiCategory } from '../../shared/types';
import { deleteCategory, listCategories } from './api';
import CategoryForm from './CategoryForm';

export default function CategoryList() {
  const [items, setItems] = useState<ApiCategory[]>([]);
  const [editing, setEditing] = useState<ApiCategory | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    setItems(await listCategories());
    setLoading(false);
    setEditing(null);
    setCreating(false);
  }
  useEffect(() => { refresh(); }, []);

  async function remove(c: ApiCategory) {
    if (!window.confirm(`"${c.name}" o'chirilsinmi? (mahsulotlar kategoriyasiz qoladi)`)) return;
    await deleteCategory(c.id);
    refresh();
  }

  if (loading) return <p className="text-muted">Yuklanmoqda…</p>;
  return (
    <div>
      {creating && <CategoryForm initial={null} onSaved={refresh} onCancel={() => setCreating(false)} />}
      {editing && <CategoryForm key={editing.id} initial={editing} onSaved={refresh} onCancel={() => setEditing(null)} />}
      {!creating && !editing && (
        <button onClick={() => setCreating(true)} className="mb-4 px-5 py-2.5 bg-primary text-white font-semibold rounded-full">+ Yangi kategoriya</button>
      )}
      <div className="space-y-2">
        {items.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-[--shadow-apple]">
            {c.iconUrl ? <img src={c.iconUrl} alt="" className="w-10 h-10 rounded-full object-cover bg-bg" /> : <div className="w-10 h-10 rounded-full bg-bg" />}
            <div className="flex-1 font-semibold">{c.name}</div>
            <button onClick={() => setEditing(c)} className="text-[13px] text-accent font-semibold px-2">Tahrir</button>
            <button onClick={() => remove(c)} className="text-[13px] text-danger px-2">O'chir</button>
          </div>
        ))}
      </div>
    </div>
  );
}
