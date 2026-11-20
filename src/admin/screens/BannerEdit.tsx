import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import { Desktop, DeviceMobile, Image as ImageIcon, Info, LinkSimple, Prohibit } from '@phosphor-icons/react';
import type { Icon as PhIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { ApiBanner } from '../../../shared/types';
import { createBanner, deleteBanner, listBanners, updateBanner } from '../api';
import { delay, EditColumns, FormError, PreviewCard, PublishCard } from '../ContentFields';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import { PHOTO_UPLOAD, withoutId } from '../lib/content-form';
import { Button, Card, Field, Input, Page, Skeleton } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/content/banners';

type Form = Omit<ApiBanner, 'id'>;
const EMPTY: Form = { imageUrl: '', linkUrl: '', altText: '', sortOrder: 0, isActive: true };

/** Saytdagi slayder nisbatida kadr (kompyuterda 3:1, telefonda 21:9 — chetlari kesiladi). */
const Frame: FC<{ icon: PhIcon; label: string; ratio: string; src: string }> = ({ icon: I, label, ratio, src }) => (
  <figure className="flex flex-col gap-1.5">
    <figcaption className="flex items-center gap-1.5 text-sm font-medium text-text-muted"><I className="size-4 text-text-faint" />{label}</figcaption>
    <div className={`${ratio} overflow-hidden rounded-control bg-surface-sunken`}>
      <img src={src} alt="" className="size-full object-cover" />
    </div>
  </figure>
);

/** Banner tahriri. `id` = 'new' yoki banner id'si. Chapda forma, o'ngda saytdagi ko'rinishi va holati. */
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
        <EditColumns
          main={(
            <>
              {error && <FormError text={error} />}
              <div className="stagger" style={delay(0)}>
                <Card icon={ImageIcon} hue="orange" title={t('shared.image')} description={t('bannerEdit.image.description')}>
                  <ImageUploader label={t('bannerEdit.image.label')} images={form.imageUrl ? [form.imageUrl] : []} onChange={(next) => set('imageUrl', next[0] ?? '')} normalize={PHOTO_UPLOAD} />
                </Card>
              </div>
              <div className="stagger" style={delay(1)}>
                <Card icon={LinkSimple} hue="blue" title={t('bannerEdit.info.title')}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label={t('shared.link')} hint={t('bannerEdit.info.linkHint')}>
                      <Input value={form.linkUrl} onChange={(v) => set('linkUrl', v)} placeholder="/chegirmalar" />
                    </Field>
                    <Field label={t('bannerEdit.info.altLabel')} hint={t('bannerEdit.info.altHint')}>
                      <Input value={form.altText} onChange={(v) => set('altText', v)} />
                    </Field>
                  </div>
                </Card>
              </div>
            </>
          )}
          aside={(
            <>
              <div className="stagger" style={delay(2)}>
                <PreviewCard>
                  {form.imageUrl === '' ? (
                    <p className="flex flex-col items-center gap-2 rounded-control bg-surface-sunken px-4 py-8 text-center text-base text-text-muted">
                      <ImageIcon className="size-6 text-text-faint" />{t('bannerEdit.preview.empty')}
                    </p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {/* Saytdagi kadrlar — kulrang karta ichida oq «orolcha». */}
                      <div className="flex flex-col gap-4 rounded-control-lg bg-surface p-4">
                        <Frame icon={Desktop} label={t('bannerEdit.preview.desktop')} ratio="aspect-[3/1]" src={form.imageUrl} />
                        <div className="w-3/5">
                          <Frame icon={DeviceMobile} label={t('bannerEdit.preview.mobile')} ratio="aspect-[21/9]" src={form.imageUrl} />
                        </div>
                      </div>
                      <p className="flex items-start gap-1.5 text-sm text-text-muted"><Info className="mt-[calc(0.5lh-8px)] size-4 shrink-0 text-text-faint" />{t('bannerEdit.preview.note')}</p>
                      <p className="flex min-w-0 items-center gap-1.5 rounded-control bg-surface-sunken px-3 py-2 text-sm text-text-muted">
                        {form.linkUrl
                          ? <><LinkSimple className="size-4 shrink-0 text-text-faint" /><span className="truncate">{t('bannerEdit.preview.clickTo', { url: form.linkUrl })}</span></>
                          : <><Prohibit className="size-4 shrink-0 text-text-faint" />{t('bannerEdit.preview.noClick')}</>}
                      </p>
                    </div>
                  )}
                </PreviewCard>
              </div>
              <div className="stagger" style={delay(3)}>
                <PublishCard
                  active={form.isActive}
                  onActive={(v) => set('isActive', v)}
                  sortOrder={form.sortOrder}
                  onSort={(n) => set('sortOrder', n)}
                  sortHint={t('bannerEdit.info.sortHint')}
                  onDelete={isNew ? undefined : remove}
                  deleteLabel={t('bannerEdit.confirmDelete')}
                />
              </div>
            </>
          )}
        />
      )}
    </Page>
  );
};

export default BannerEdit;
