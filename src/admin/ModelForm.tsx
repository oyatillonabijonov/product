import { useEffect, useState } from 'react';
import type { FC } from 'react';
import type { ApiBrand, ApiCategory, ApiDeviceModel } from '../../shared/types';
import { createDeviceModel, listBrands, listCategories, updateDeviceModel } from './api';
import { errText } from './errText';

const ModelForm: FC<{
  initial: ApiDeviceModel | null;
  onSaved: () => void;
  onCancel: () => void;
}> = ({ initial, onSaved, onCancel }) => {
  const [brands, setBrands] = useState<ApiBrand[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [name, setName] = useState(initial?.name ?? '');
  const [brandId, setBrandId] = useState(initial?.brandId ?? '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [chip, setChip] = useState(initial?.chip ?? '');
  const [ram, setRam] = useState(initial?.ram ?? '');
  const [camera, setCamera] = useState(initial?.camera ?? '');
  const [display, setDisplay] = useState(initial?.display ?? '');
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const [b, c] = await Promise.all([listBrands(), listCategories()]);
      setBrands(b);
      setCategories(c);
      if (!initial) {
        if (b.length > 0) setBrandId((cur) => cur || b[0].id);
        const telefonlar = c.find((cat) => cat.id === 'telefonlar');
        setCategoryId((cur) => cur || telefonlar?.id || c[0]?.id || '');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setError('');
    if (name.trim() === '') {
      setError('Model nomi majburiy');
      return;
    }
    setBusy(true);
    try {
      const payload = { name, brandId, categoryId, chip, ram, camera, display, sortOrder };
      if (initial) await updateDeviceModel(initial.id, payload);
      else await createDeviceModel(payload);
      onSaved();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  const input = 'w-full border border-line rounded-xl px-3 py-2 focus:outline-none focus:border-accent';
  return (
    <div className="bg-white rounded-[20px] p-6 mb-6 shadow-[--shadow-apple] max-w-2xl">
      <h3 className="font-semibold mb-4">{initial ? 'Modelni tahrirlash' : 'Yangi model'}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block text-[13px] text-muted">Nomi
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block text-[13px] text-muted">Brend
          <select className={input} value={brandId} onChange={(e) => setBrandId(e.target.value)}>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>
        <label className="block text-[13px] text-muted">Kategoriya
          <select className={input} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="block text-[13px] text-muted">Tartib raqami
          <input type="number" className={input} value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
        </label>
        <label className="block text-[13px] text-muted">Protsessor
          <input className={input} value={chip} onChange={(e) => setChip(e.target.value)} />
        </label>
        <label className="block text-[13px] text-muted">Operativ xotira
          <input className={input} value={ram} onChange={(e) => setRam(e.target.value)} />
        </label>
        <label className="block text-[13px] text-muted">Kamera
          <input className={input} value={camera} onChange={(e) => setCamera(e.target.value)} />
        </label>
        <label className="block text-[13px] text-muted">Displey
          <input className={input} value={display} onChange={(e) => setDisplay(e.target.value)} />
        </label>
      </div>
      {error && <p className="text-[13px] text-danger mt-3">{error}</p>}
      <div className="flex gap-3 mt-4">
        <button onClick={save} disabled={busy} className="px-6 py-2.5 bg-accent text-white font-semibold rounded-full disabled:opacity-60">{busy ? 'Saqlanmoqda…' : 'Saqlash'}</button>
        <button onClick={onCancel} className="px-6 py-2.5 text-muted font-semibold rounded-full">Bekor qilish</button>
      </div>
    </div>
  );
};

export default ModelForm;
