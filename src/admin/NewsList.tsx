import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { ApiNews } from '../../shared/types';
import { deleteNews, listNews } from './api';
import IconAction from './IconAction';
import NewsForm from './NewsForm';

/** Landing "Yangiliklar" tile'lari — tartib bo'yicha birinchi 3 ta faoli ko'rinadi. */
export default function NewsList() {
  const [items, setItems] = useState<ApiNews[]>([]);
  const [editing, setEditing] = useState<ApiNews | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    setLoading(true);
    try {
      setItems(await listNews());
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

  async function remove(n: ApiNews) {
    if (!window.confirm(`«${n.title}» o'chirilsinmi?`)) return;
    try {
      await deleteNews(n.id);
      refresh();
    } catch {
      setError("O'chirishda xatolik");
    }
  }

  if (loading) return <p className="text-muted">Yuklanmoqda…</p>;
  if (error) return <p className="text-danger">{error}</p>;
  return (
    <div>
      {creating && <NewsForm initial={null} onSaved={refresh} onCancel={() => setCreating(false)} />}
      {editing && <NewsForm key={editing.id} initial={editing} onSaved={refresh} onCancel={() => setEditing(null)} />}
      {!creating && !editing && (
        <>
          <button onClick={() => setCreating(true)} className="press mb-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-full">+ Yangi yangilik</button>
          <p className="mb-4 text-[13px] text-muted-2">Bosh sahifada tartib bo'yicha birinchi 3 ta faol yangilik chiqadi: 1-si chapda katta, qolgan ikkitasi o'ngda.</p>
        </>
      )}
      <div className="space-y-2">
        {items.map((n) => (
          <div key={n.id} className="rounded-md bg-white p-3 flex items-center gap-3">
            <img src={n.imageUrl} alt="" className="rounded-sm w-16 h-16 object-contain bg-bg" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[14px] truncate">{n.title}</div>
              <div className="text-[12px] text-muted-2 truncate">
                {[n.badge, n.tag].filter(Boolean).join(' · ') || '—'} · {n.linkUrl || 'havolasiz'} · Tartib: {n.sortOrder} · {n.isActive ? 'Faol' : 'Nofaol'}
              </div>
            </div>
            <IconAction Icon={Pencil} label="Tahrir" onClick={() => setEditing(n)} />
            <IconAction Icon={Trash2} label="O'chir" onClick={() => remove(n)} danger />
          </div>
        ))}
        {items.length === 0 && <p className="text-muted text-[14px]">Yangiliklar yo'q.</p>}
      </div>
    </div>
  );
}
