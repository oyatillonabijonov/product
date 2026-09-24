import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { ApiBanner } from '../../../shared/types';
import { createBanner, deleteBanner, listBanners, updateBanner } from '../api';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import { PHOTO_UPLOAD, withoutId } from '../lib/content-form';
import { Button, Card, Field, Input, Page, Skeleton, SwitchRow } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/content/banners';

type Form = Omit<ApiBanner, 'id'>;
const EMPTY: Form = { imageUrl: '', linkUrl: '', altText: '', sortOrder: 0, isActive: true };

/** Banner tahriri. `id` = 'new' yoki banner id'si. */
const BannerEdit: FC<{ id: string }> = ({ id }) => {
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
    listBanners().then((all) => {
      const b = all.find((x) => x.id === id);
      if (!b) { setError(t('bannerEdit.notFound')); return; }
      setForm(withoutId(b));
      setLoaded(true);
    }).catch(() => setError(t('shared.loadError')));
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };

  async function save() {
    setBusy(true); setError('');
    try {
      if (isNew) {
        await createBanner(form);
        setDirty(false);
        toast(t('bannerEdit.toastCreated'));
        navigate(LIST, { state: { leave: true } });
      } else {
        await updateBanner(id, form);
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
      title: t('bannerEdit.confirmDelete'),
      message: t('bannerEdit.confirmDeleteMessage'),
      confirmLabel: t('shared.delete'), destructive: true,
    });
    if (!ok) return;
    try {
      await deleteBanner(id);
      setDirty(false);
      toast(t('bannerEdit.toastDeleted'));
      navigate(LIST, { state: { leave: true } });
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const canSave = dirty && !busy && form.imageUrl !== '';

  return (
    <Page
      title={isNew ? t('bannerEdit.newTitle') : form.altText || t('bannerEdit.untitled')}
      back={LIST}
      dirty={dirty}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? t('shared.saving') : t('shared.save')}</Button>}
    >
      {!loaded && !error ? <Skeleton rows={4} /> : (
        <div className="flex flex-col gap-4">
          {error && <p className="text-para text-danger">{error}</p>}
          <Card title={t('shared.image')} description={t('bannerEdit.image.description')}>
            <ImageUploader label={t('bannerEdit.image.label')} images={form.imageUrl ? [form.imageUrl] : []} onChange={(next) => set('imageUrl', next[0] ?? '')} normalize={PHOTO_UPLOAD} />
          </Card>
          <Card title={t('bannerEdit.info.title')}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t('shared.link')} hint={t('bannerEdit.info.linkHint')}>
                <Input value={form.linkUrl} onChange={(v) => set('linkUrl', v)} placeholder="/chegirmalar" />
              </Field>
              <Field label={t('bannerEdit.info.altLabel')} hint={t('bannerEdit.info.altHint')}>
                <Input value={form.altText} onChange={(v) => set('altText', v)} />
              </Field>
              <Field label={t('shared.sortOrder')} hint={t('bannerEdit.info.sortHint')}>
                <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
              </Field>
            </div>
            <div className="mt-2 divide-y divide-line">
              <SwitchRow label={t('shared.showOnSite')} on={form.isActive} onChange={(v) => set('isActive', v)} />
            </div>
          </Card>
          {!isNew && (
            <Card title={t('shared.dangerZone')}>
              <Button variant="destructive" onClick={remove}>{t('bannerEdit.confirmDelete')}</Button>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
};

export default BannerEdit;
