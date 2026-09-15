import { useState } from 'react';
import type { FC } from 'react';
import type { ApiVacancy, EmploymentType } from '../../shared/types';
import { createVacancy, updateVacancy } from './api';
import { errText } from './errText';

const input = 'rounded-sm w-full border border-line-2 px-3 py-2 text-[14px]';

type Form = Omit<ApiVacancy, 'id'>;

export const EMPLOYMENT_LABEL: Record<EmploymentType, string> = { full: "To'liq stavka", part: 'Yarim stavka', intern: 'Amaliyot' };

/** uz/ru juftligi bitta qatorda; `multiline` — markdown tavsif uchun textarea. */
const Pair: FC<{ label: string; hint?: string; uz: string; ru: string; onUz: (v: string) => void; onRu: (v: string) => void; multiline?: boolean }> = ({
  label, hint, uz, ru, onUz, onRu, multiline,
}) => {
  const field = (value: string, onChange: (v: string) => void) => (multiline
    ? <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={8} className={input} />
    : <input value={value} onChange={(e) => onChange(e.target.value)} className={input} />);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <label className="text-[13px] text-muted">{label} (uz){hint && <span className="text-muted-2"> — {hint}</span>}
        {field(uz, onUz)}
      </label>
      <label className="text-[13px] text-muted">{label} (ru)
        {field(ru, onRu)}
      </label>
    </div>
  );
};

const VacancyForm: FC<{ initial: ApiVacancy | null; onSaved: () => void; onCancel: () => void }> = ({ initial, onSaved, onCancel }) => {
  const [form, setForm] = useState<Form>({
    title: initial?.title ?? '', titleRu: initial?.titleRu ?? '',
    department: initial?.department ?? '', departmentRu: initial?.departmentRu ?? '',
    employment: initial?.employment ?? 'full',
    salary: initial?.salary ?? '', salaryRu: initial?.salaryRu ?? '',
    description: initial?.description ?? '', descriptionRu: initial?.descriptionRu ?? '',
    sortOrder: initial?.sortOrder ?? 0, isActive: initial?.isActive ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const f = form as Form;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm({ ...f, [k]: v });

  async function save() {
    if (!f.title.trim()) { setError('Lavozim nomi majburiy'); return; }
    setBusy(true); setError('');
    try {
      if (initial) await updateVacancy(initial.id, f);
      else await createVacancy(f);
      onSaved();
    } catch (e) { setError(errText(e)); }
    finally { setBusy(false); }
  }

  return (
    <div className="rounded-md bg-white p-5 mb-4 space-y-3">
      <h3 className="font-semibold">{initial ? 'Vakansiyani tahrirlash' : 'Yangi vakansiya'}</h3>
      <Pair label="Lavozim" uz={f.title} ru={f.titleRu} onUz={(v) => set('title', v)} onRu={(v) => set('titleRu', v)} />
      <Pair label="Bo'lim" hint="masalan «Sotuv», «Servis»" uz={f.department} ru={f.departmentRu} onUz={(v) => set('department', v)} onRu={(v) => set('departmentRu', v)} />
      <Pair label="Maosh" hint="bo'sh bo'lsa ko'rsatilmaydi" uz={f.salary} ru={f.salaryRu} onUz={(v) => set('salary', v)} onRu={(v) => set('salaryRu', v)} />
      <label className="block text-[13px] text-muted">Bandlik turi
        <select value={f.employment} onChange={(e) => set('employment', e.target.value as EmploymentType)} className={input}>
          {(Object.keys(EMPLOYMENT_LABEL) as EmploymentType[]).map((k) => <option key={k} value={k}>{EMPLOYMENT_LABEL[k]}</option>)}
        </select>
      </label>
      <Pair
        label="Tavsif" hint="«## Vazifalar» sarlavhasi, «- » bilan ro'yxat" multiline
        uz={f.description} ru={f.descriptionRu} onUz={(v) => set('description', v)} onRu={(v) => set('descriptionRu', v)}
      />
      <div className="flex flex-wrap items-center gap-4">
        <label className="text-[13px] text-muted">Tartib
          <input type="number" value={f.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value))} className="rounded-sm ml-2 w-20 border border-line-2 px-2 py-1.5" />
        </label>
        <label className="text-[13px] text-muted flex items-center gap-2">
          <input type="checkbox" checked={f.isActive} onChange={(e) => set('isActive', e.target.checked)} /> Faol
        </label>
      </div>
      {error && <p className="text-[13px] text-danger">{error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className="press px-5 py-2.5 bg-accent text-white font-semibold rounded-full disabled:opacity-50">Saqlash</button>
        <button onClick={onCancel} className="press px-5 py-2.5 text-muted font-semibold rounded-full">Bekor qilish</button>
      </div>
    </div>
  );
};

export default VacancyForm;
