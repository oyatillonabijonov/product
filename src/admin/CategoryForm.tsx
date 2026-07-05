import { useState } from 'react';
import type { FC } from 'react';
import type { ApiCategory } from '../../shared/types';
import { createCategory, updateCategory } from './api';
import { errText } from './errText';
import { CATEGORY_ICON_LIST, categoryIcon } from '../lib/category-icons';

const CategoryForm: FC<{
  initial: ApiCategory | null;
  onSaved: () => void;
  onCancel: () => void;
}> = ({ initial, onSaved, onCancel }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? 'smartphone');
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setBusy(true);
    setError('');
    try {
      // iconUrl left as-is (legacy image override); preset icon key is what the picker sets.
      const payload = { name, icon, iconUrl: initial?.iconUrl ?? '', sortOrder };
      if (initial) await updateCategory(initial.id, payload);
      else await createCategory(payload);
      onSaved();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  const input = 'w-full border border-line rounded-xl px-3 py-2 focus:outline-none focus:border-accent';
  return (
    <div className="bg-white rounded-[20px] p-6 mb-6 shadow-apple max-w-lg">
      <h3 className="font-semibold mb-4">{initial ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}</h3>
      <label className="block text-[13px] text-muted mb-3">Nomi
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="block text-[13px] text-muted mb-3">Tartib raqami
        <input type="number" className={input} value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
      </label>
      <div className="mb-4">
        <p className="text-[13px] text-muted mb-2">Ikon</p>
        <div className="grid grid-cols-8 gap-2">
          {CATEGORY_ICON_LIST.map(({ key, label }) => {
            const Icon = categoryIcon(key);
            const active = icon === key;
            return (
              <button
                key={key}
                type="button"
                title={label}
                aria-label={label}
                onClick={() => setIcon(key)}
                className={`aspect-square rounded-xl flex items-center justify-center border transition-colors ${
                  active ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted hover:border-line-2 hover:text-primary'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={1.7} />
              </button>
            );
          })}
        </div>
      </div>
      {error && <p className="text-[13px] text-danger mb-3">{error}</p>}
      <div className="flex gap-3">
        <button onClick={save} disabled={busy} className="px-6 py-2.5 bg-accent text-white font-semibold rounded-full disabled:opacity-60">{busy ? 'Saqlanmoqda…' : 'Saqlash'}</button>
        <button onClick={onCancel} className="px-6 py-2.5 text-muted font-semibold rounded-full">Bekor qilish</button>
      </div>
    </div>
  );
};

export default CategoryForm;
