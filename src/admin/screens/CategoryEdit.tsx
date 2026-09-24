import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { ApiCategory } from '../../../shared/types';
import { createCategory, deleteCategory, listCategories, listTypes, updateCategory } from '../api';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import { PHOTO_UPLOAD } from '../lib/content-form';
import { Button, Card, Field, Input, LangPair, Page, Skeleton } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/products/categories';

interface Form { name: string; nameRu: string; sortOrder: number; coverUrl: string }
const EMPTY: Form = { name: '', nameRu: '', sortOrder: 0, coverUrl: '' };

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
        <div className="flex flex-col gap-4">
          {error && <p className="text-para text-danger">{error}</p>}
          <Card title={t('shared.basicInfo')}>
            <LangPair label={t('shared.name')} uz={form.name} ru={form.nameRu} onUz={(v) => set('name', v)} onRu={(v) => set('nameRu', v)} required />
            <div className="mt-4 max-w-40">
              <Field label={t('shared.sortOrder')} hint={t('categoryEdit.sortHint')}>
                <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
              </Field>
            </div>
          </Card>
          <Card title={t('categoryEdit.cover.title')} description={t('categoryEdit.cover.desc')}>
            <ImageUploader label={t('categoryEdit.cover.uploaderLabel')} images={form.coverUrl ? [form.coverUrl] : []} onChange={(next) => set('coverUrl', next[0] ?? '')} normalize={PHOTO_UPLOAD} />
          </Card>
          {!isNew && initial && (
            <Card title={t('shared.dangerZone')} description={t('categoryEdit.dangerDesc')}>
              <Button variant="destructive" onClick={remove}>{t('categoryEdit.deleteButton')}</Button>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
};

export default CategoryEdit;
