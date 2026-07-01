import { useState } from 'react';
import type { FC } from 'react';
import type { ApiProduct, Category, Condition } from '../../shared/types';
import { createProduct, updateProduct, uploadImage } from './api';

const CATEGORIES: Category[] = ['iphone', 'mac', 'ipad', 'pc'];
const CONDITIONS: Condition[] = ['yangi', 'ishlatilgan'];

const empty: Partial<ApiProduct> = {
  name: '',
  category: 'iphone',
  condition: 'yangi',
  conditionNote: null,
  cashPriceUzs: 0,
  imageUrl: '',
  sortOrder: 0,
  isActive: true,
};

const ProductForm: FC<{
  initial: ApiProduct | null;
  onSaved: () => void;
  onCancel: () => void;
}> = ({
  initial,
  onSaved,
  onCancel,
}) => {
  const [form, setForm] = useState<Partial<ApiProduct>>(initial ?? empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof ApiProduct>(key: K, value: ApiProduct[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const { imageUrl } = await uploadImage(file);
      set('imageUrl', imageUrl);
    } catch {
      setError("Rasm yuklanmadi");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setError('');
    try {
      if (initial) await updateProduct(initial.id, form);
      else await createProduct(form);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'xatolik');
    } finally {
      setBusy(false);
    }
  }

  const input = 'w-full border border-[#D2D2D7] rounded-xl px-3 py-2 focus:outline-none focus:border-[#0071E3]';

  return (
    <div className="bg-white rounded-[20px] p-6 mb-6 shadow-[--shadow-apple]">
      <h3 className="font-semibold mb-4">{initial ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-[13px] text-[#6E6E73]">
          Nomi
          <input className={input} value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} />
        </label>
        <label className="text-[13px] text-[#6E6E73]">
          Naqd narx (so'm)
          <input
            type="number"
            className={input}
            value={form.cashPriceUzs ?? 0}
            onChange={(e) => set('cashPriceUzs', Number(e.target.value))}
          />
        </label>
        <label className="text-[13px] text-[#6E6E73]">
          Kategoriya
          <select className={input} value={form.category} onChange={(e) => set('category', e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="text-[13px] text-[#6E6E73]">
          Holati
          <select className={input} value={form.condition} onChange={(e) => set('condition', e.target.value as Condition)}>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="text-[13px] text-[#6E6E73]">
          Holat izohi (ixtiyoriy)
          <input
            className={input}
            value={form.conditionNote ?? ''}
            onChange={(e) => set('conditionNote', e.target.value === '' ? null : e.target.value)}
          />
        </label>
        <label className="text-[13px] text-[#6E6E73]">
          Tartib raqami
          <input
            type="number"
            className={input}
            value={form.sortOrder ?? 0}
            onChange={(e) => set('sortOrder', Number(e.target.value))}
          />
        </label>
      </div>

      <div className="mt-4 flex items-center gap-4">
        {form.imageUrl ? (
          <img src={form.imageUrl} alt="" className="w-16 h-16 object-contain rounded-lg bg-[#F5F5F7]" />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-[#F5F5F7] flex items-center justify-center text-[11px] text-[#C7C7CC]">rasm</div>
        )}
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onFile} />
      </div>

      <label className="mt-4 flex items-center gap-2 text-[14px]">
        <input type="checkbox" checked={form.isActive ?? true} onChange={(e) => set('isActive', e.target.checked)} />
        Saytda ko'rsatilsin
      </label>

      {error && <p className="text-[13px] text-[#E30000] mt-3">{error}</p>}

      <div className="flex gap-3 mt-5">
        <button
          onClick={save}
          disabled={busy}
          className="px-6 py-2.5 bg-[#0071E3] text-white font-semibold rounded-full disabled:opacity-60"
        >
          {busy ? 'Saqlanmoqda…' : 'Saqlash'}
        </button>
        <button onClick={onCancel} className="px-6 py-2.5 text-[#6E6E73] font-semibold rounded-full">
          Bekor qilish
        </button>
      </div>
    </div>
  );
};

export default ProductForm;
