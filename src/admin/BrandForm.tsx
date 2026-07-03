import { useState } from 'react';
import type { FC } from 'react';
import type { ApiBrand } from '../../shared/types';
import { createBrand, updateBrand, uploadImage } from './api';

const BrandForm: FC<{
  initial: ApiBrand | null;
  onSaved: () => void;
  onCancel: () => void;
}> = ({ initial, onSaved, onCancel }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? '');
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const { imageUrl } = await uploadImage(file);
      setLogoUrl(imageUrl);
    } catch {
      setError('Rasm yuklanmadi');
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setError('');
    try {
      const payload = { name, slug, logoUrl, sortOrder };
      if (initial) await updateBrand(initial.id, payload);
      else await createBrand(payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'xatolik');
    } finally {
      setBusy(false);
    }
  }

  const input = 'w-full border border-line rounded-xl px-3 py-2 focus:outline-none focus:border-accent';
  return (
    <div className="bg-white rounded-[20px] p-6 mb-6 shadow-apple max-w-lg">
      <h3 className="font-semibold mb-4">{initial ? 'Brendni tahrirlash' : 'Yangi brend'}</h3>
      <label className="block text-[13px] text-muted mb-3">Nomi
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="block text-[13px] text-muted mb-3">Slug (ixtiyoriy — bo'sh qoldirilsa server nomdan yasaydi)
        <input className={input} value={slug} onChange={(e) => setSlug(e.target.value)} />
      </label>
      <label className="block text-[13px] text-muted mb-3">Tartib raqami
        <input type="number" className={input} value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
      </label>
      <div className="flex items-center gap-4 mb-4">
        {logoUrl ? <img src={logoUrl} alt="" className="w-14 h-14 rounded-full object-cover bg-bg" /> : <div className="w-14 h-14 rounded-full bg-bg" />}
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onFile} />
      </div>
      {error && <p className="text-[13px] text-danger mb-3">{error}</p>}
      <div className="flex gap-3">
        <button onClick={save} disabled={busy} className="px-6 py-2.5 bg-accent text-white font-semibold rounded-full disabled:opacity-60">{busy ? 'Saqlanmoqda…' : 'Saqlash'}</button>
        <button onClick={onCancel} className="px-6 py-2.5 text-muted font-semibold rounded-full">Bekor qilish</button>
      </div>
    </div>
  );
};

export default BrandForm;
