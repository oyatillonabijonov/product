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

  if (loading) return <p className="text-[#6E6E73]">Yuklanmoqda…</p>;
  if (error) return <p className="text-[#E8462D]">{error}</p>;
  return (
    <div>
      {creating && <BannerForm initial={null} onSaved={refresh} onCancel={() => setCreating(false)} />}
      {editing && <BannerForm key={editing.id} initial={editing} onSaved={refresh} onCancel={() => setEditing(null)} />}
      {!creating && !editing && (
        <button onClick={() => setCreating(true)} className="mb-4 px-5 py-2.5 bg-[#1D1D1F] text-white font-semibold rounded-full">+ Yangi banner</button>
      )}
      <div className="space-y-2">
        {items.map((b) => (
          <div key={b.id} className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-[--shadow-apple]">
            <img src={b.imageUrl} alt={b.altText} className="w-24 h-14 rounded-xl object-cover bg-[#F5F5F7]" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] text-[#6E6E73] truncate">{b.linkUrl || '—'}</div>
              <div className="text-[12px] text-[#86868B]">Tartib: {b.sortOrder} · {b.isActive ? 'Faol' : 'Nofaol'}</div>
            </div>
            <button onClick={() => setEditing(b)} className="text-[13px] text-[#0071E3] font-semibold px-2">Tahrir</button>
            <button onClick={() => remove(b)} className="text-[13px] text-[#E8462D] font-semibold px-2">O'chirish</button>
          </div>
        ))}
        {items.length === 0 && <p className="text-[#6E6E73] text-[14px]">Bannerlar yo'q.</p>}
      </div>
    </div>
  );
}
