import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { ApiPage } from '../../shared/types';
import { deletePage, listPages } from './api';
import IconAction from './IconAction';
import PageForm from './PageForm';

/** Kontent sahifalari (Shartlar, FAQ, oferta…) — footer'da chiqadi, matn markdown. */
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
      setError('Yuklashda xatolik');
    } finally {
      setLoading(false);
      setEditing(null);
      setCreating(false);
    }
  }
  useEffect(() => { refresh(); }, []);

  async function remove(p: ApiPage) {
    if (!window.confirm(`«${p.title.uz}» sahifasi o'chirilsinmi?`)) return;
    try {
      await deletePage(p.id);
      refresh();
    } catch {
      setError("O'chirishda xatolik");
    }
  }

  if (loading) return <p className="text-muted">Yuklanmoqda…</p>;
  if (error) return <p className="text-danger">{error}</p>;
  return (
    <div>
      {creating && <PageForm initial={null} onSaved={refresh} onCancel={() => setCreating(false)} />}
      {editing && <PageForm key={editing.id} initial={editing} onSaved={refresh} onCancel={() => setEditing(null)} />}
      {!creating && !editing && (
        <button onClick={() => setCreating(true)} className="press mb-4 px-5 py-2.5 bg-primary text-white font-semibold rounded-full">+ Yangi sahifa</button>
      )}
      <div className="space-y-2">
        {items.map((p) => (
          <div key={p.id} className="rounded-md bg-white p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[14px] truncate">{p.title.uz}</div>
              <div className="text-[12px] text-muted-2">/page/{p.slug} · {p.isActive ? 'Faol' : 'Nofaol'}</div>
            </div>
            <IconAction Icon={Pencil} label="Tahrir" onClick={() => setEditing(p)} />
            <IconAction Icon={Trash2} label="O'chir" onClick={() => remove(p)} danger />
          </div>
        ))}
        {items.length === 0 && <p className="text-muted text-[14px]">Sahifalar yo'q.</p>}
      </div>
    </div>
  );
}
