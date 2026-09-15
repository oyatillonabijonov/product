import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { ApiVacancy } from '../../shared/types';
import { deleteVacancy, listVacancies } from './api';
import IconAction from './IconAction';
import VacancyForm, { EMPLOYMENT_LABEL } from './VacancyForm';

/** Vakansiyalar — saytda faollari tartib bo'yicha chiqadi. */
export default function VacancyList() {
  const [items, setItems] = useState<ApiVacancy[]>([]);
  const [editing, setEditing] = useState<ApiVacancy | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    setLoading(true);
    try {
      setItems(await listVacancies());
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

  async function remove(v: ApiVacancy) {
    if (!window.confirm(`«${v.title}» o'chirilsinmi? Unga kelgan arizalar qoladi.`)) return;
    try {
      await deleteVacancy(v.id);
      refresh();
    } catch {
      setError("O'chirishda xatolik");
    }
  }

  if (loading) return <p className="text-muted">Yuklanmoqda…</p>;
  if (error) return <p className="text-danger">{error}</p>;
  const list = items as ApiVacancy[];
  const edit = editing as ApiVacancy | null;
  return (
    <div>
      {creating && <VacancyForm initial={null} onSaved={refresh} onCancel={() => setCreating(false)} />}
      {edit && <VacancyForm key={edit.id} initial={edit} onSaved={refresh} onCancel={() => setEditing(null)} />}
      {!creating && !edit && (
        <button onClick={() => setCreating(true)} className="press mb-4 px-5 py-2.5 bg-primary text-white font-semibold rounded-full">+ Yangi vakansiya</button>
      )}
      <div className="space-y-2">
        {list.map((v) => (
          <div key={v.id} className="rounded-md bg-white p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[14px] truncate">{v.title}</div>
              <div className="text-[12px] text-muted-2 truncate">
                {[v.department, EMPLOYMENT_LABEL[v.employment], v.salary].filter(Boolean).join(' · ')} · Tartib: {v.sortOrder} · {v.isActive ? 'Faol' : 'Nofaol'}
              </div>
            </div>
            <IconAction Icon={Pencil} label="Tahrir" onClick={() => setEditing(v)} />
            <IconAction Icon={Trash2} label="O'chir" onClick={() => remove(v)} danger />
          </div>
        ))}
        {list.length === 0 && <p className="text-muted text-[14px]">Vakansiyalar yo'q — saytda umumiy ariza formasi chiqadi.</p>}
      </div>
    </div>
  );
}
