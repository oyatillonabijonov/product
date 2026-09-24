import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { ApiNews } from '../../../shared/types';
import { createNews, deleteNews, listNews, updateNews } from '../api';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import { withoutId } from '../lib/content-form';
import { Button, Card, Field, Input, LangPair, Page, Skeleton, SwitchRow } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/content/news';

type Form = Omit<ApiNews, 'id'>;
const EMPTY: Form = {
  badge: '', badgeRu: '', tag: '', tagRu: '', title: '', titleRu: '', text: '', textRu: '',
  cta: '', ctaRu: '', linkUrl: '', imageUrl: '', sortOrder: 0, isActive: true,
};

/** Yangilik (landing tile'i) tahriri. `id` = 'new' yoki yangilik id'si. */
const NewsEdit: FC<{ id: string }> = ({ id }) => {
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
    listNews().then((all) => {
      const n = all.find((x) => x.id === id);
      if (!n) { setError(t('newsEdit.notFound')); return; }
      setForm(withoutId(n));
      setLoaded(true);
    }).catch(() => setError(t('shared.loadError')));
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };

  async function save() {
    setBusy(true); setError('');
    try {
      if (isNew) {
        await createNews(form);
        setDirty(false);
        toast(t('newsEdit.toastCreated'));
        navigate(LIST, { state: { leave: true } });
      } else {
        await updateNews(id, form);
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
      title: t('newsEdit.confirmDelete', { name: form.title }),
      message: t('newsEdit.confirmDeleteMessage'),
      confirmLabel: t('shared.delete'), destructive: true,
    });
    if (!ok) return;
    try {
      await deleteNews(id);
      setDirty(false);
      toast(t('newsEdit.toastDeleted'));
      navigate(LIST, { state: { leave: true } });
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const canSave = dirty && !busy && form.title.trim() !== '' && form.imageUrl !== '';

  return (
    <Page
      title={isNew ? t('newsEdit.newTitle') : form.title || t('newsEdit.untitled')}
      back={LIST}
      dirty={dirty}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? t('shared.saving') : t('shared.save')}</Button>}
    >
      {!loaded && !error ? <Skeleton rows={6} /> : (
        <div className="flex flex-col gap-4">
          {error && <p className="text-para text-danger">{error}</p>}
          <Card title={t('shared.image')} description={t('newsEdit.image.description')}>
            <ImageUploader label={t('shared.image')} images={form.imageUrl ? [form.imageUrl] : []} onChange={(next) => set('imageUrl', next[0] ?? '')} />
          </Card>
          <Card title={t('shared.text')}>
            <div className="flex flex-col gap-4">
              <LangPair label={t('shared.title')} required hint={t('newsEdit.text.titleHint')} uz={form.title} ru={form.titleRu} onUz={(v) => set('title', v)} onRu={(v) => set('titleRu', v)} />
              <LangPair label={t('shared.text')} kind="textarea" rows={2} hint={t('newsEdit.text.textHint')} uz={form.text} ru={form.textRu} onUz={(v) => set('text', v)} onRu={(v) => set('textRu', v)} />
              <LangPair label={t('newsEdit.text.badgeLabel')} hint={t('newsEdit.text.badgeHint')} uz={form.badge} ru={form.badgeRu} onUz={(v) => set('badge', v)} onRu={(v) => set('badgeRu', v)} />
              <LangPair label={t('newsEdit.text.tagLabel')} hint={t('newsEdit.text.tagHint')} uz={form.tag} ru={form.tagRu} onUz={(v) => set('tag', v)} onRu={(v) => set('tagRu', v)} />
              <LangPair label={t('newsEdit.text.ctaLabel')} hint={t('newsEdit.text.ctaHint')} uz={form.cta} ru={form.ctaRu} onUz={(v) => set('cta', v)} onRu={(v) => set('ctaRu', v)} />
            </div>
          </Card>
          <Card title={t('newsEdit.linkAndVisibility')}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t('shared.link')} hint={t('newsEdit.linkHint')}>
                <Input value={form.linkUrl} onChange={(v) => set('linkUrl', v)} placeholder="/category/apple?tur=iphone" />
              </Field>
              <Field label={t('shared.sortOrder')} hint={t('newsEdit.sortHint')}>
                <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
              </Field>
            </div>
            <div className="mt-2 divide-y divide-line">
              <SwitchRow label={t('shared.showOnSite')} on={form.isActive} onChange={(v) => set('isActive', v)} />
            </div>
          </Card>
          {!isNew && (
            <Card title={t('shared.dangerZone')}>
              <Button variant="destructive" onClick={remove}>{t('newsEdit.deleteButton')}</Button>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
};

export default NewsEdit;
