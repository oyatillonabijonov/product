import { useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Eye, ImageSquare, Trash, TextAa } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { ApiCategory } from '../../../shared/types';
import { createCategory, deleteCategory, listCategories, listTypes, updateCategory } from '../api';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import { PHOTO_UPLOAD } from '../lib/content-form';
import { Badge, Button, Card, Field, Input, LangPair, Page, Skeleton } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/products/categories';

interface Form { name: string; nameRu: string; sortOrder: number; coverUrl: string }
const EMPTY: Form = { name: '', nameRu: '', sortOrder: 0, coverUrl: '' };

const stagger = (i: number) => ({ ['--i' as string]: i } as Record<string, number>);

/** «Xavfli zona» — kulrang karta (kit `Card` kabi, hoshiyasiz): qizil ikonka plitkasi, izoh va bitta `dangerSoft` tugma. */
const DangerZone: FC<{ title: string; text: string; children: ReactNode }> = ({ title, text, children }) => (
  <section className="flex flex-col gap-5 rounded-surface bg-surface-sunken p-6">
    <div className="flex items-start gap-3">
      <Trash aria-hidden weight="fill" className="size-5 shrink-0 text-danger-text" />
      <div className="min-w-0">
        <h2 className="text-md font-bold text-text">{title}</h2>
        <p className="mt-0.5 text-sm leading-relaxed text-text-muted">{text}</p>
      </div>
    </div>
    {children}
  </section>
);

/** Kategoriya tahriri. `id` = 'new' yoki kategoriya id'si; id server tomonida nomdan yasaladi, keyin o'zgarmaydi. */
const CategoryEdit: FC<{ id: string }> = ({ id }) => {
  const { t } = useTranslation('products');
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [rawForm, setForm] = useState(EMPTY as Form);
  const form = rawForm as Form;
  const [rawInitial, setInitial] = useState(null as ApiCategory | null);
  const initial = rawInitial as ApiCategory | null;
  const [typeCount, setTypeCount] = useState(0);
  const [loaded, setLoaded] = useState(isNew);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isNew) return;
    Promise.all([listCategories(), listTypes()]).then(([cats, types]) => {
      const c = cats.find((x) => x.id === id);
      if (!c) { setError(t('categoryEdit.notFound')); return; }
      setInitial(c);
      setForm({ name: c.name, nameRu: c.nameRu, sortOrder: c.sortOrder, coverUrl: c.coverUrl });
      setTypeCount(types.filter((type) => type.categoryId === id).length);
      setLoaded(true);
    }).catch(() => setError(t('shared.loadError')));
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };

  async function save() {
    setBusy(true); setError('');
    const body = { name: form.name, nameRu: form.nameRu, coverUrl: form.coverUrl, sortOrder: form.sortOrder };
    try {
      if (isNew) {
        await createCategory(body);
        setDirty(false);
        toast(t('categoryEdit.toastCreated'));
        navigate(LIST, { state: { leave: true } });
      } else {
        await updateCategory(id, body);
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
    if (!initial) return;
    const ok = await confirm({
      title: t('categoryEdit.confirmDelete', { name: initial.name }),
      message: t('categoryEdit.confirmDeleteMessage', { count: typeCount }),
      confirmLabel: t('shared.delete'), destructive: true,
    });
    if (!ok) return;
    try {
      await deleteCategory(id);
      setDirty(false);
      toast(t('categoryEdit.toastDeleted'));
      navigate(LIST, { state: { leave: true } });
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const canSave = dirty && !busy && form.name.trim() !== '';

  return (
    <Page
      title={isNew ? t('shared.newCategory') : form.name || initial?.name || t('shared.category')}
      back={LIST}
      dirty={dirty}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? t('shared.saving') : t('shared.save')}</Button>}
    >
      {!loaded && !error ? <Skeleton rows={4} /> : (
        <div className="flex flex-col gap-6">
          {error && <p role="alert" className="rounded-surface bg-danger-soft px-5 py-4 text-base text-danger-strong">{error}</p>}
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex min-w-0 flex-col gap-4">
              <div className="stagger" style={stagger(0)}>
                <Card
                  icon={TextAa} hue="violet" title={t('shared.basicInfo')}
                  actions={!isNew && <Badge tone="neutral">{t('categoryEdit.typesBadge', { n: typeCount })}</Badge>}
                >
                  <LangPair label={t('shared.name')} uz={form.name} ru={form.nameRu} onUz={(v) => set('name', v)} onRu={(v) => set('nameRu', v)} required />
                  <div className="max-w-60">
                    <Field label={t('shared.sortOrder')} hint={t('categoryEdit.sortHint')}>
                      <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
                    </Field>
                  </div>
                </Card>
              </div>
              <div className="stagger" style={stagger(1)}>
                <Card icon={ImageSquare} hue="orange" title={t('categoryEdit.cover.title')} description={t('categoryEdit.cover.desc')}>
                  <ImageUploader label={t('categoryEdit.cover.uploaderLabel')} images={form.coverUrl ? [form.coverUrl] : []} onChange={(next) => set('coverUrl', next[0] ?? '')} normalize={PHOTO_UPLOAD} />
                </Card>
              </div>
            </div>
            <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-28">
              <div className="stagger" style={stagger(2)}>
                <Card icon={Eye} hue="blue" title={t('categoryEdit.coverPreview')}>
                  <div className="overflow-hidden rounded-control-lg bg-surface">
                    {form.coverUrl ? (
                      <img src={form.coverUrl} alt="" className="aspect-[114/55] w-full object-cover" />
                    ) : (
                      <div className="flex aspect-[114/55] flex-col items-center justify-center gap-2 text-text-faint">
                        <ImageSquare className="size-8" />
                        <span className="text-sm text-text-muted">{t('categoryEdit.coverEmpty')}</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold text-text">{form.name || t('shared.newCategory')}</p>
                    {form.nameRu && form.nameRu !== form.name && <p className="truncate text-sm text-text-muted">{form.nameRu}</p>}
                  </div>
                </Card>
              </div>
              {!isNew && initial && (
                <div className="stagger" style={stagger(3)}>
                  <DangerZone title={t('shared.dangerZone')} text={t('categoryEdit.dangerDesc')}>
                    <Button variant="dangerSoft" onClick={remove} className="w-full"><Trash />{t('categoryEdit.deleteButton')}</Button>
                  </DangerZone>
                </div>
              )}
            </aside>
          </div>
        </div>
      )}
    </Page>
  );
};

export default CategoryEdit;
