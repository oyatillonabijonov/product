import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { ApiPost } from '../../../shared/types';
import { createPost, deletePost, listPosts, updatePost } from '../api';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import { PHOTO_UPLOAD, withoutId } from '../lib/content-form';
import MarkdownHelp from '../MarkdownHelp';
import { Button, Card, Field, Input, LangPair, Page, Skeleton, SwitchRow } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/content/posts';

type Form = Omit<ApiPost, 'id'>;
const EMPTY: Form = {
  slug: '', title: '', titleRu: '', excerpt: '', excerptRu: '', content: '', contentRu: '',
  coverUrl: '', publishedAt: '', sortOrder: 0, isActive: true,
};

/** Brauzerning bugungi sanasi (YYYY-MM-DD) — yangi maqolaga. */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Blog maqolasi tahriri. `id` = 'new' yoki maqola id'si. */
const PostEdit: FC<{ id: string }> = ({ id }) => {
  const { t } = useTranslation('content');
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [rawForm, setForm] = useState((isNew ? { ...EMPTY, publishedAt: today() } : EMPTY) as Form);
  const form = rawForm as Form;
  // "Saytda ko'rish" saqlangan slug bo'yicha — maydonda yozilayotgani hali saytda yo'q.
  const [savedSlug, setSavedSlug] = useState('');
  const [loaded, setLoaded] = useState(isNew);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isNew) return;
    listPosts().then((all) => {
      const p = all.find((x) => x.id === id);
      if (!p) { setError(t('postEdit.notFound')); return; }
      setForm(withoutId(p));
      setSavedSlug(p.slug);
      setLoaded(true);
    }).catch(() => setError(t('shared.loadError')));
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };

  async function save() {
    setBusy(true); setError('');
    try {
      if (isNew) {
        await createPost(form);
        setDirty(false);
        toast(t('postEdit.toastCreated'));
        navigate(LIST, { state: { leave: true } });
      } else {
        // Server bo'sh slug'ni sarlavhadan yasaydi — forma saqlangan qiymatni oladi.
        const saved = await updatePost(id, form);
        setForm(withoutId(saved));
        setSavedSlug(saved.slug);
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
      title: t('postEdit.confirmDelete', { name: form.title }),
      message: t('postEdit.confirmDeleteMessage'),
      confirmLabel: t('shared.delete'), destructive: true,
    });
    if (!ok) return;
    try {
      await deletePost(id);
      setDirty(false);
      toast(t('postEdit.toastDeleted'));
      navigate(LIST, { state: { leave: true } });
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const canSave = dirty && !busy && form.title.trim() !== '';

  return (
    <Page
      title={isNew ? t('postEdit.newTitle') : form.title || t('postEdit.untitled')}
      back={LIST}
      dirty={dirty}
      actions={(
        <>
          {!isNew && form.isActive && savedSlug && <Button variant="quiet" href={`/blog/${savedSlug}`} external>{t('shared.viewOnSite')}</Button>}
          <Button onClick={save} disabled={!canSave}>{busy ? t('shared.saving') : t('shared.save')}</Button>
        </>
      )}
    >
      {!loaded && !error ? <Skeleton rows={6} /> : (
        <div className="flex flex-col gap-4">
          {error && <p className="text-para text-danger">{error}</p>}
          <Card title={t('postEdit.cover.title')} description={t('postEdit.cover.description')}>
            <ImageUploader label={t('postEdit.cover.label')} images={form.coverUrl ? [form.coverUrl] : []} onChange={(next) => set('coverUrl', next[0] ?? '')} normalize={PHOTO_UPLOAD} />
          </Card>
          <Card title={t('postEdit.heading.title')}>
            <div className="flex flex-col gap-4">
              <LangPair label={t('shared.title')} required uz={form.title} ru={form.titleRu} onUz={(v) => set('title', v)} onRu={(v) => set('titleRu', v)} />
              <LangPair label={t('postEdit.heading.excerptLabel')} kind="textarea" rows={2} hint={t('postEdit.heading.excerptHint')} uz={form.excerpt} ru={form.excerptRu} onUz={(v) => set('excerpt', v)} onRu={(v) => set('excerptRu', v)} />
            </div>
          </Card>
          <Card title={t('shared.text')}>
            <div className="flex flex-col gap-3">
              <LangPair label={t('shared.text')} kind="textarea" rows={14} mono uz={form.content} ru={form.contentRu} onUz={(v) => set('content', v)} onRu={(v) => set('contentRu', v)} />
              <MarkdownHelp />
            </div>
          </Card>
          <Card title={t('shared.slugAndVisibility')}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t('shared.slug')} hint={t('postEdit.slugHint')}>
                <Input value={form.slug} onChange={(v) => set('slug', v)} placeholder={t('postEdit.slugPlaceholder')} />
              </Field>
              <Field label={t('shared.date')} hint={t('postEdit.dateHint')}>
                <Input type="date" value={form.publishedAt} onChange={(v) => set('publishedAt', v)} />
              </Field>
              <Field label={t('shared.sortOrder')} hint={t('postEdit.sortHint')}>
                <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
              </Field>
            </div>
            <div className="mt-2 divide-y divide-line">
              <SwitchRow label={t('shared.showOnSite')} on={form.isActive} onChange={(v) => set('isActive', v)} />
            </div>
          </Card>
          {!isNew && (
            <Card title={t('shared.dangerZone')}>
              <Button variant="destructive" onClick={remove}>{t('postEdit.deleteButton')}</Button>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
};

export default PostEdit;
