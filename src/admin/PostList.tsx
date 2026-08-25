import { useEffect, useState } from 'react';
import { PencilSimple, Trash } from '@phosphor-icons/react';
import type { ApiPost } from '../../shared/types';
import { deletePost, listPosts } from './api';
import IconAction from './IconAction';
import PostForm from './PostForm';

export default function PostList() {
  const [items, setItems] = useState<ApiPost[]>([]);
  const [editing, setEditing] = useState<ApiPost | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    setLoading(true);
    try {
      setItems(await listPosts());
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

  async function remove(p: ApiPost) {
    if (!window.confirm("Maqola o'chirilsinmi?")) return;
    try {
      await deletePost(p.id);
      refresh();
    } catch {
      setError("O'chirishda xatolik");
    }
  }

  if (loading) return <p className="text-muted">Yuklanmoqda…</p>;
  if (error) return <p className="text-danger">{error}</p>;
  return (
    <div>
      {creating && <PostForm initial={null} onSaved={refresh} onCancel={() => setCreating(false)} />}
      {editing && <PostForm key={editing.id} initial={editing} onSaved={refresh} onCancel={() => setEditing(null)} />}
      {!creating && !editing && (
        <button onClick={() => setCreating(true)} className="mb-4 px-5 py-2.5 bg-primary text-white font-semibold rounded-full">+ Yangi maqola</button>
      )}
      <div className="space-y-2">
        {items.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-apple">
            {p.coverUrl
              ? <img src={p.coverUrl} alt="" className="w-24 h-14 rounded-xl object-cover bg-bg" />
              : <div className="w-24 h-14 rounded-xl bg-bg" />}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[14px] truncate">{p.title}</div>
              <div className="text-[12px] text-muted-2">
                /blog/{p.slug} · {p.publishedAt || 'sanasiz'} · {p.isActive ? 'Faol' : 'Nofaol'}
              </div>
            </div>
            <IconAction Icon={PencilSimple} label="Tahrir" onClick={() => setEditing(p)} />
            <IconAction Icon={Trash} label="O'chir" onClick={() => remove(p)} danger />
          </div>
        ))}
        {items.length === 0 && <p className="text-muted text-[14px]">Maqolalar yo'q.</p>}
      </div>
    </div>
  );
}
