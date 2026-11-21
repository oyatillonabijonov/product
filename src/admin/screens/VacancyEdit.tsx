import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import { Check, Lightning, Plus, Trash } from '../icons';
import type { ParseKeys } from 'i18next';
import { useTranslation } from 'react-i18next';
import type { ApiVacancy, EmploymentType } from '../../../shared/types';
import type { Locale } from '../../../app/lib/i18n';
import { createVacancy, deleteVacancy, listVacancies, updateVacancy } from '../api';
import { errText } from '../errText';
import { FormError, LiveSwitch } from '../ContentFields';
import { withoutId } from '../lib/content-form';
import { hasBullet, SNIPPETS, toggleBullet } from '../lib/vacancy-snippets';
import RichEditor from '../RichEditor';
import { Button, Page, Segmented, Skeleton } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';
import { AutoText } from './PostEdit';

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

/**
 * Vakansiya — uchta narsa: lavozim, bandlik (bir bosish), ixtiyoriy maosh va oddiy matn; o'ngda matnga bir bosishda qo'shiladigan tayyor qatorlar.
 * ponytail: bo'lim va tartib maydonlari UI'dan olib tashlandi — qiymati saqlanib qaytariladi, kerak bo'lsa qaytaramiz.
 */
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
  const [rawLang, setLang] = useState('uz');
  const lang = rawLang as Locale;
  // Tayyor qator qo'shilganda muharrir matnni qaytadan oladi.
  const [bump, setBump] = useState(0);

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
  const ru = lang === 'ru';
  const titleKey = ru ? 'titleRu' : 'title';
  const salaryKey = ru ? 'salaryRu' : 'salary';
  const descKey = ru ? 'descriptionRu' : 'description';

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
  const langSwitch = (className: string) => (
    <Segmented
      label={t('newsEdit.lang.title')}
      value={lang}
      onChange={setLang}
      options={[{ id: 'uz', label: t('newsEdit.lang.uz') }, { id: 'ru', label: t('newsEdit.lang.ru') }]}
      className={className}
    />
  );

  return (
    <Page
      title={isNew ? t('vacancyEdit.newTitle') : t('vacancyEdit.untitled')}
      back={LIST}
      dirty={dirty}
      actions={(
        <>
          {langSwitch('max-sm:hidden')}
          <Button onClick={save} disabled={!canSave}>{busy ? t('shared.saving') : t('shared.save')}</Button>
        </>
      )}
    >
      {!loaded && !error ? <Skeleton rows={6} /> : (
        // Sahifa sarlavhasi bilan bir chiziqdan — markazlashtirilmaydi.
        <div className="grid gap-10 xl:grid-cols-[minmax(0,760px)_320px] xl:items-start">
          <article className="flex w-full min-w-0 flex-col">
            {error && <FormError text={error} />}
            {langSwitch('mb-5 sm:hidden')}

            <AutoText
              value={form[titleKey]}
              onChange={(v) => set(titleKey, v)}
              placeholder={ru ? form.title || t('vacancyEdit.titlePlaceholder') : t('vacancyEdit.titlePlaceholder')}
              className="text-[34px] font-semibold leading-[1.15] tracking-tight text-text"
            />

            {/* Bandlik — bir bosish; maosh shu qatorda, ixtiyoriy. */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {(Object.keys(EMPLOYMENT_LABEL_KEY) as EmploymentType[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={form.employment === k}
                  onClick={() => set('employment', k)}
                  className={`h-9 rounded-full px-4 text-sm font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${
                    form.employment === k ? 'bg-primary text-text-on-primary' : 'bg-surface-sunken text-text-muted hover:bg-surface-sunken-hover hover:text-text'
                  }`}
                >
                  {t(EMPLOYMENT_LABEL_KEY[k])}
                </button>
              ))}
            </div>
            <input
              value={form[salaryKey]}
              onChange={(e: { target: HTMLInputElement }) => set(salaryKey, e.target.value)}
              placeholder={ru ? form.salary || t('vacancyEdit.salaryPlaceholder') : t('vacancyEdit.salaryPlaceholder')}
              className="mt-5 w-full bg-transparent text-lg text-text outline-none placeholder:text-text-faint"
            />

            <div className="mt-6 border-t border-border pt-6">
              <RichEditor
                value={form[descKey]}
                onChange={(v) => set(descKey, v)}
                resetKey={`${lang}-${loaded}-${bump}`}
                placeholder={ru && form.description ? t('vacancyEdit.ruFallback') : t('vacancyEdit.bodyPlaceholder')}
                stickyTop="top-[108px]"
              />
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1"><LiveSwitch on={form.isActive} onChange={(v) => set('isActive', v)} /></div>
              {!isNew && <Button variant="dangerSoft" onClick={remove}><Trash />{t('vacancyEdit.deleteButton')}</Button>}
            </div>
          </article>

          <aside className="flex flex-col gap-5 rounded-surface border border-border bg-surface p-5 xl:sticky xl:top-28">
            <div>
              <h2 className="flex items-center gap-2 text-md font-semibold text-text"><Lightning weight="fill" className="size-[18px] text-text-faint" />{t('vacancyEdit.snippets.title')}</h2>
              <p className="mt-1 text-sm text-text-muted">{t('vacancyEdit.snippets.hint')}</p>
            </div>
            {SNIPPETS[lang].map((g) => (
              <div key={g.heading} className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-text">{g.heading}</span>
                <div className="flex flex-wrap gap-1.5">
                  {g.items.map((item) => {
                    const on = hasBullet(form[descKey], item);
                    return (
                      <button
                        key={item}
                        type="button"
                        aria-pressed={on}
                        onClick={() => { set(descKey, toggleBullet(form[descKey], g.heading, item)); setBump((n: number) => n + 1); }}
                        className={`inline-flex h-8 items-center gap-1 rounded-full pl-2.5 pr-3 text-sm font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${
                          on ? 'bg-primary text-text-on-primary' : 'bg-surface-sunken text-text-muted hover:text-text'
                        }`}
                      >
                        {on ? <Check weight="bold" className="size-3.5" /> : <Plus weight="bold" className="size-3.5" />}
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </aside>
        </div>
      )}
    </Page>
  );
};

export default VacancyEdit;
