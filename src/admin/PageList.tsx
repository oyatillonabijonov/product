import { useEffect, useState } from 'react';
import type { ApiPage } from '../../shared/types';
import { deletePage, listPages } from './api';
import PageForm from './PageForm';

export default function PageList() {
  const [items, setItems] = useState<ApiPage[]>([]);
  const [editing, setEditing] = useState<ApiPage | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    setLoading(true);
    try {
      setItems(await listPages());
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

  async function remove(p: ApiPage) {
    if (!window.confirm(`"${p.title.uz}" sahifasi o'chirilsinmi?`)) return;
    await deletePage(p.id);
    refresh();
  }

  if (loading) return <p className="text-muted">Yuklanmoqda…</p>;
  if (error) return <p className="text-sale">{error}</p>;
  return (
    <div>
      {creating && <PageForm initial={null} onSaved={refresh} onCancel={() => setCreating(false)} />}
      {editing && <PageForm key={editing.id} initial={editing} onSaved={refresh} onCancel={() => setEditing(null)} />}
      {!creating && !editing && (
        <button onClick={() => setCreating(true)} className="mb-4 px-5 py-2.5 bg-primary text-white font-semibold rounded-full">+ Yangi sahifa</button>
      )}
      <div className="space-y-2">
        {items.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-[--shadow-apple]">
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{p.title.uz}</div>
              <div className="text-[12px] text-muted-2">/page/{p.slug} · {p.isActive ? 'Faol' : 'Nofaol'}</div>
            </div>
            <button onClick={() => setEditing(p)} className="text-[13px] text-accent font-semibold px-2">Tahrir</button>
            <button onClick={() => remove(p)} className="text-[13px] text-sale font-semibold px-2">O'chirish</button>
          </div>
        ))}
        {items.length === 0 && <p className="text-muted text-[14px]">Sahifalar yo'q.</p>}
      </div>
    </div>
  );
}
