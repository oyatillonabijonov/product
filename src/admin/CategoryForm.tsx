import { useState } from 'react';
import type { FC } from 'react';
import type { ApiCategory } from '../../shared/types';
import { createCategory, updateCategory } from './api';
import { errText } from './errText';
import ImageUploader from './ImageUploader';

const CategoryForm: FC<{
  initial: ApiCategory | null;
  onSaved: () => void;
  onCancel: () => void;
}> = ({ initial, onSaved, onCancel }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [nameRu, setNameRu] = useState(initial?.nameRu ?? '');
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);
  const [coverUrl, setCoverUrl] = useState(initial?.coverUrl ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setBusy(true);
    setError('');
    try {
      // Saytda ko'rinmaydigan ustunlar (ikonka kaliti, cover izohi) tahrirlanmaydi — mavjud qiymat saqlanadi.
      const payload = {
        name, nameRu, coverUrl, sortOrder,
        icon: initial?.icon ?? '', iconUrl: initial?.iconUrl ?? '',
        coverLede: initial?.coverLede ?? '', coverLedeRu: initial?.coverLedeRu ?? '',
      };
      if (initial) await updateCategory(initial.id, payload);
      else await createCategory(payload);
      onSaved();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  const input = 'rounded-sm w-full border border-line px-3 py-2 focus:outline-none focus:border-accent';
  return (
    <div className=" rounded-lg bg-white p-6 mb-6 max-w-lg">
      <h3 className="font-semibold mb-4">{initial ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}</h3>
      <label className="block text-[13px] text-muted mb-3">Nomi
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="block text-[13px] text-muted mb-3">Nomi (ruscha)
        <input className={input} value={nameRu} onChange={(e) => setNameRu(e.target.value)} placeholder="Bo'sh qolsa o'zbekchasi ko'rinadi" />
      </label>
      <label className="block text-[13px] text-muted mb-3">Tartib raqami
        <input type="number" className={input} value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
      </label>
      {/* Cover — kategoriya sahifasi tepasidagi keng rasm. Bo'sh qolsa sahifa
          oddiy sarlavha bilan ochiladi (majburiy emas). */}
      <div className="mb-4">
        <ImageUploader label="Cover rasmi (kategoriya sahifasi tepasida)" images={coverUrl ? [coverUrl] : []} onChange={(next) => setCoverUrl(next[0] ?? '')} />
        <p className="text-[13px] text-muted mt-1">Keng (landshaft) rasm tavsiya etiladi — u to'liq enli tasma bo'lib ko'rinadi.</p>
      </div>
      {error && <p className="text-[13px] text-danger mb-3">{error}</p>}
      <div className="flex gap-3">
        <button onClick={save} disabled={busy} className="press px-6 py-2.5 bg-accent text-white font-semibold rounded-full disabled:opacity-60">{busy ? 'Saqlanmoqda…' : 'Saqlash'}</button>
        <button onClick={onCancel} className="press px-6 py-2.5 text-muted font-semibold rounded-full">Bekor qilish</button>
      </div>
    </div>
  );
};

export default CategoryForm;
