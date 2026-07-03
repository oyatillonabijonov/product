import { useEffect, useState } from 'react';
import type { ApiBanner } from '../../shared/types';
import { deleteBanner, listBanners } from './api';
import BannerForm from './BannerForm';

export default function BannerList() {
  const [items, setItems] = useState<ApiBanner[]>([]);
  const [editing, setEditing] = useState<ApiBanner | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    setLoading(true);
    try {
      setItems(await listBanners());
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

  async function remove(b: ApiBanner) {
    if (!window.confirm('Banner o\'chirilsinmi?')) return;
    await deleteBanner(b.id);
    refresh();
  }

  if (loading) return <p className="text-muted">Yuklanmoqda…</p>;
  if (error) return <p className="text-sale">{error}</p>;
  return (
    <div>
      {creating && <BannerForm initial={null} onSaved={refresh} onCancel={() => setCreating(false)} />}
      {editing && <BannerForm key={editing.id} initial={editing} onSaved={refresh} onCancel={() => setEditing(null)} />}
      {!creating && !editing && (
        <button onClick={() => setCreating(true)} className="mb-4 px-5 py-2.5 bg-primary text-white font-semibold rounded-full">+ Yangi banner</button>
      )}
      <div className="space-y-2">
        {items.map((b) => (
          <div key={b.id} className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-apple">
            <img src={b.imageUrl} alt={b.altText} className="w-24 h-14 rounded-xl object-cover bg-bg" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] text-muted truncate">{b.linkUrl || '—'}</div>
              <div className="text-[12px] text-muted-2">Tartib: {b.sortOrder} · {b.isActive ? 'Faol' : 'Nofaol'}</div>
            </div>
            <button onClick={() => setEditing(b)} className="text-[13px] text-accent font-semibold px-2">Tahrir</button>
            <button onClick={() => remove(b)} className="text-[13px] text-sale font-semibold px-2">O'chirish</button>
          </div>
        ))}
        {items.length === 0 && <p className="text-muted text-[14px]">Bannerlar yo'q.</p>}
      </div>
    </div>
  );
}
