import { useEffect, useState } from 'react';
import { PencilSimple, Trash } from '@phosphor-icons/react';
import type { ApiDeviceModel } from '../../shared/types';
import { deleteDeviceModel, listDeviceModels } from './api';
import { filterModels } from './lib/models';
import IconAction from './IconAction';
import ModelForm from './ModelForm';

export default function ModelList() {
  const [items, setItems] = useState<ApiDeviceModel[]>([]);
  const [editing, setEditing] = useState<ApiDeviceModel | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  async function refresh() {
    setLoading(true);
    try {
      setItems(await listDeviceModels());
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

  async function remove(m: ApiDeviceModel) {
    if (!window.confirm(`"${m.name}" modeli o'chirilsinmi?`)) return;
    try {
      await deleteDeviceModel(m.id);
      refresh();
    } catch {
      setError("O'chirishda xatolik");
    }
  }

  if (loading) return <p className="text-muted">Yuklanmoqda…</p>;
  if (error) return <p className="text-danger">{error}</p>;

  const filtered = filterModels(items, query, 200);

  return (
    <div>
      {creating && <ModelForm initial={null} onSaved={refresh} onCancel={() => setCreating(false)} />}
      {editing && <ModelForm key={editing.id} initial={editing} onSaved={refresh} onCancel={() => setEditing(null)} />}
      {!creating && !editing && (
        <>
          <button onClick={() => setCreating(true)} className="mb-4 px-5 py-2.5 bg-primary text-white font-semibold rounded-full">+ Yangi model</button>
          <div className="mb-4">
            <input
              className="w-full max-w-sm border border-line rounded-xl px-3 py-2 focus:outline-none focus:border-accent"
              placeholder="Qidirish (masalan: 16 pro)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </>
      )}
      <div className="space-y-2">
        {filtered.map((m) => (
          <div key={m.id} className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-apple">
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{m.name}</div>
              <div className="text-[12px] text-muted">{m.brandId} · {m.categoryId} · {m.chip}</div>
            </div>
            <IconAction Icon={PencilSimple} label="Tahrir" onClick={() => setEditing(m)} />
            <IconAction Icon={Trash} label="O'chir" onClick={() => remove(m)} danger />
          </div>
        ))}
        {filtered.length === 0 && <p className="text-muted text-[14px]">Modellar topilmadi.</p>}
      </div>
    </div>
  );
}
