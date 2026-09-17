import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import type { ApiVacancy, EmploymentType } from '../../../shared/types';
import { createVacancy, deleteVacancy, listVacancies, updateVacancy } from '../api';
import { errText } from '../errText';
import { withoutId } from '../lib/content-form';
import MarkdownHelp from '../MarkdownHelp';
import { Button, Card, Field, Input, LangPair, Page, Select, Skeleton, SwitchRow } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/content/vacancies';

export const EMPLOYMENT_LABEL: Record<EmploymentType, string> = { full: "To'liq stavka", part: 'Yarim stavka', intern: 'Amaliyot' };

type Form = Omit<ApiVacancy, 'id'>;
const EMPTY: Form = {
  title: '', titleRu: '', department: '', departmentRu: '', employment: 'full',
  salary: '', salaryRu: '', description: '', descriptionRu: '', sortOrder: 0, isActive: true,
};

/** Vakansiya tahriri. `id` = 'new' yoki vakansiya id'si. */
const VacancyEdit: FC<{ id: string }> = ({ id }) => {
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [rawForm, setForm] = useState(EMPTY as Form);
  const form = rawForm as Form;
  const [loaded, setLoaded] = useState(isNew);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isNew) return;
    listVacancies().then((all) => {
      const v = all.find((x) => x.id === id);
      if (!v) { setError('Vakansiya topilmadi'); return; }
      setForm(withoutId(v));
      setLoaded(true);
    }).catch(() => setError('Yuklashda xatolik'));
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };

  async function save() {
    setBusy(true); setError('');
    try {
      if (isNew) {
        await createVacancy(form);
        setDirty(false);
        toast("Vakansiya qo'shildi");
        navigate(LIST, { state: { leave: true } });
      } else {
        await updateVacancy(id, form);
        setDirty(false);
        toast("Saqlandi · saytda 1–5 daqiqada ko'rinadi");
      }
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: `«${form.title}» vakansiyasini o'chirish`,
      message: "Saytdan olib tashlanadi; unga kelgan arizalar qoladi. Faqat yashirish kerak bo'lsa «Saytda ko'rsatilsin»ni o'chiring.",
      confirmLabel: "O'chirish", destructive: true,
    });
    if (!ok) return;
    try {
      await deleteVacancy(id);
      setDirty(false);
      toast("Vakansiya o'chirildi");
      navigate(LIST, { state: { leave: true } });
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const canSave = dirty && !busy && form.title.trim() !== '';

  return (
    <Page
      title={isNew ? 'Yangi vakansiya' : form.title || 'Vakansiya'}
      back={LIST}
      dirty={dirty}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>}
    >
      {!loaded && !error ? <Skeleton rows={6} /> : (
        <div className="flex flex-col gap-4">
          {error && <p className="text-para text-danger">{error}</p>}
          <Card title="Lavozim">
            <div className="flex flex-col gap-4">
              <LangPair label="Lavozim" required uz={form.title} ru={form.titleRu} onUz={(v) => set('title', v)} onRu={(v) => set('titleRu', v)} />
              <LangPair label="Bo'lim" hint="Masalan «Sotuv», «Servis»" uz={form.department} ru={form.departmentRu} onUz={(v) => set('department', v)} onRu={(v) => set('departmentRu', v)} />
              <LangPair label="Maosh" hint="Bo'sh bo'lsa ko'rsatilmaydi" uz={form.salary} ru={form.salaryRu} onUz={(v) => set('salary', v)} onRu={(v) => set('salaryRu', v)} />
              <Field label="Bandlik turi" className="md:w-1/2">
                <Select value={form.employment} onChange={(v) => set('employment', v as EmploymentType)}>
                  {(Object.keys(EMPLOYMENT_LABEL) as EmploymentType[]).map((k) => <option key={k} value={k}>{EMPLOYMENT_LABEL[k]}</option>)}
                </Select>
              </Field>
            </div>
          </Card>
          <Card title="Tavsif" description="Vazifalar va talablar — saytda vakansiya qatori ochilganda chiqadi.">
            <div className="flex flex-col gap-3">
              <LangPair label="Tavsif" kind="textarea" rows={10} mono hint="«## Vazifalar» sarlavhasi, «- » bilan ro'yxat" uz={form.description} ru={form.descriptionRu} onUz={(v) => set('description', v)} onRu={(v) => set('descriptionRu', v)} />
              <MarkdownHelp />
            </div>
          </Card>
          <Card title="Ko'rinish">
            <Field label="Tartib" hint="Saytdagi ro'yxatda — kichiki oldin" className="md:w-1/2">
              <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
            </Field>
            <div className="mt-2 divide-y divide-line">
              <SwitchRow label="Saytda ko'rsatilsin" on={form.isActive} onChange={(v) => set('isActive', v)} />
            </div>
          </Card>
          {!isNew && (
            <Card title="Xavfli zona">
              <Button variant="destructive" onClick={remove}>Vakansiyani o'chirish</Button>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
};

export default VacancyEdit;
