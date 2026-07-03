import { useState } from 'react';
import type { FC } from 'react';
import type { ApiBanner } from '../../shared/types';
import { createBanner, updateBanner, uploadImage } from './api';

const BannerForm: FC<{ initial: ApiBanner | null; onSaved: () => void; onCancel: () => void }> = ({ initial, onSaved, onCancel }) => {
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [linkUrl, setLinkUrl] = useState(initial?.linkUrl ?? '');
  const [altText, setAltText] = useState(initial?.altText ?? '');
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try { const { imageUrl: url } = await uploadImage(file); setImageUrl(url); }
    catch { setError('Rasm yuklashda xatolik'); }
    finally { setBusy(false); }
  }

  async function save() {
    if (!imageUrl) { setError('Banner rasmi majburiy'); return; }
    setBusy(true); setError('');
    try {
      const body = { imageUrl, linkUrl, altText, sortOrder, isActive };
      if (initial) await updateBanner(initial.id, body);
      else await createBanner(body);
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : 'Xatolik'); }
    finally { setBusy(false); }
  }

  return (
    <div className="bg-white rounded-2xl p-5 mb-4 shadow-[--shadow-apple] space-y-3">
      <h3 className="font-semibold">{initial ? 'Bannerni tahrirlash' : 'Yangi banner'}</h3>
      <div className="flex items-center gap-3">
        {imageUrl ? <img src={imageUrl} alt="" className="h-20 rounded-xl object-cover bg-[#F5F5F7]" /> : <div className="h-20 w-40 rounded-xl bg-[#F5F5F7]" />}
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} />
      </div>
      <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="Link (masalan /chegirmalar)" className="w-full border border-[#E5E5EA] rounded-xl px-3 py-2 text-[14px]" />
      <input value={altText} onChange={(e) => setAltText(e.target.value)} placeholder="Alt matn" className="w-full border border-[#E5E5EA] rounded-xl px-3 py-2 text-[14px]" />
      <div className="flex items-center gap-4">
        <label className="text-[13px] text-[#6E6E73]">Tartib
          <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className="ml-2 w-20 border border-[#E5E5EA] rounded-xl px-2 py-1.5" />
        </label>
        <label className="text-[13px] text-[#6E6E73] flex items-center gap-2">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Faol
        </label>
      </div>
      {error && <p className="text-[13px] text-[#E8462D]">{error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className="px-5 py-2.5 bg-[#0071E3] text-white font-semibold rounded-full disabled:opacity-50">Saqlash</button>
        <button onClick={onCancel} className="px-5 py-2.5 text-[#6E6E73] font-semibold rounded-full">Bekor qilish</button>
      </div>
    </div>
  );
};

export default BannerForm;
