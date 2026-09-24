import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import type { ParseKeys } from 'i18next';
import { useTranslation } from 'react-i18next';
import type { ApiVacancy, EmploymentType } from '../../../shared/types';
import { createVacancy, deleteVacancy, listVacancies, updateVacancy } from '../api';
import { errText } from '../errText';
import { withoutId } from '../lib/content-form';
import MarkdownHelp from '../MarkdownHelp';
import { Button, Card, Field, Input, LangPair, Page, Select, Skeleton, SwitchRow } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/content/vacancies';

export const EMPLOYMENT_LABEL_KEY: Record<EmploymentType, ParseKeys<'content'>> = {
  full: 'vacancyEdit.employment.full',
  part: 'vacancyEdit.employment.part',
  intern: 'vacancyEdit.employment.intern',
};

type Form = Omit<ApiVacancy, 'id'>;
const EMPTY: Form = {
  title: '', titleRu: '', department: '', departmentRu: '', employment: 'full',
  salary: '', salaryRu: '', description: '', descriptionRu: '', sortOrder: 0, isActive: true,
};

/** Vakansiya tahriri. `id` = 'new' yoki vakansiya id'si. */
const VacancyEdit: FC<{ id: string }> = ({ id }) => {
  const { t } = useTranslation('content');
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
      if (!v) { setError(t('vacancyEdit.notFound')); return; }
      setForm(withoutId(v));
      setLoaded(true);
    }).catch(() => setError(t('shared.loadError')));
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };

  async function save() {
    setBusy(true); setError('');
    try {
      if (isNew) {
        await createVacancy(form);
        setDirty(false);
        toast(t('vacancyEdit.toastCreated'));
        navigate(LIST, { state: { leave: true } });
      } else {
        await updateVacancy(id, form);
        setDirty(false);
        toast(t('shared.savedLive'));
      }
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: t('vacancyEdit.confirmDelete', { name: form.title }),
      message: t('vacancyEdit.confirmDeleteMessage'),
      confirmLabel: t('shared.delete'), destructive: true,
    });
    if (!ok) return;
    try {
      await deleteVacancy(id);
      setDirty(false);
      toast(t('vacancyEdit.toastDeleted'));
      navigate(LIST, { state: { leave: true } });
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const canSave = dirty && !busy && form.title.trim() !== '';

  return (
    <Page
      title={isNew ? t('vacancyEdit.newTitle') : form.title || t('vacancyEdit.untitled')}
      back={LIST}
      dirty={dirty}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? t('shared.saving') : t('shared.save')}</Button>}
    >
      {!loaded && !error ? <Skeleton rows={6} /> : (
        <div className="flex flex-col gap-4">
          {error && <p className="text-para text-danger">{error}</p>}
          <Card title={t('shared.position')}>
            <div className="flex flex-col gap-4">
              <LangPair label={t('shared.position')} required uz={form.title} ru={form.titleRu} onUz={(v) => set('title', v)} onRu={(v) => set('titleRu', v)} />
              <LangPair label={t('vacancyEdit.department')} hint={t('vacancyEdit.departmentHint')} uz={form.department} ru={form.departmentRu} onUz={(v) => set('department', v)} onRu={(v) => set('departmentRu', v)} />
              <LangPair label={t('shared.salary')} hint={t('vacancyEdit.salaryHint')} uz={form.salary} ru={form.salaryRu} onUz={(v) => set('salary', v)} onRu={(v) => set('salaryRu', v)} />
              <Field label={t('vacancyEdit.employmentType')} className="md:w-1/2">
                <Select value={form.employment} onChange={(v) => set('employment', v as EmploymentType)}>
                  {(Object.keys(EMPLOYMENT_LABEL_KEY) as EmploymentType[]).map((k) => <option key={k} value={k}>{t(EMPLOYMENT_LABEL_KEY[k])}</option>)}
                </Select>
              </Field>
            </div>
          </Card>
          <Card title={t('vacancyEdit.description')} description={t('vacancyEdit.descriptionCardHint')}>
            <div className="flex flex-col gap-3">
              <LangPair label={t('vacancyEdit.description')} kind="textarea" rows={10} mono hint={t('vacancyEdit.descriptionHint')} uz={form.description} ru={form.descriptionRu} onUz={(v) => set('description', v)} onRu={(v) => set('descriptionRu', v)} />
              <MarkdownHelp />
            </div>
          </Card>
          <Card title={t('vacancyEdit.visibilityTitle')}>
            <Field label={t('shared.sortOrder')} hint={t('vacancyEdit.sortHint')} className="md:w-1/2">
              <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
            </Field>
            <div className="mt-2 divide-y divide-line">
              <SwitchRow label={t('shared.showOnSite')} on={form.isActive} onChange={(v) => set('isActive', v)} />
            </div>
          </Card>
          {!isNew && (
            <Card title={t('shared.dangerZone')}>
              <Button variant="destructive" onClick={remove}>{t('vacancyEdit.deleteButton')}</Button>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
};

export default VacancyEdit;
