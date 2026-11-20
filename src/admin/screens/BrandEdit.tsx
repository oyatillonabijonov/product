import { useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Eye, ImageSquare, Moon, Sun, Tag, Trash } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { ApiAdminBrand } from '../../../shared/types';
import { createBrand, deleteBrand, listBrands, updateBrand } from '../api';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import { Avatar, Badge, Button, Card, Field, Input, Page, Skeleton } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/products/brands';

interface Form { name: string; slug: string; sortOrder: number; logoUrl: string }
const EMPTY: Form = { name: '', slug: '', sortOrder: 0, logoUrl: '' };

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

/** Brend tahriri. `id` = 'new' yoki brend id'si (server slug'dan yasaydi). */
const BrandEdit: FC<{ id: string }> = ({ id }) => {
  const { t } = useTranslation('products');
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [rawForm, setForm] = useState(EMPTY as Form);
  const form = rawForm as Form;
  const [rawInitial, setInitial] = useState(null as ApiAdminBrand | null);
  const initial = rawInitial as ApiAdminBrand | null;
  const [loaded, setLoaded] = useState(isNew);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isNew) return;
    listBrands().then((all) => {
      const b = all.find((x) => x.id === id);
      if (!b) { setError(t('brandEdit.notFound')); return; }
      setInitial(b);
      setForm({ name: b.name, slug: b.slug, sortOrder: b.sortOrder, logoUrl: b.logoUrl });
      setLoaded(true);
    }).catch(() => setError(t('shared.loadError')));
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };

  async function save() {
    setBusy(true); setError('');
    const body = { name: form.name, slug: form.slug, logoUrl: form.logoUrl, sortOrder: form.sortOrder };
    try {
      if (isNew) {
        await createBrand(body);
        setDirty(false);
        toast(t('brandEdit.toastCreated'));
        navigate(LIST, { state: { leave: true } });
      } else {
        await updateBrand(id, body);
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
      title: t('brandEdit.confirmDelete', { name: initial.name }),
      message: t('brandEdit.confirmDeleteMessage', { count: initial.productCount }),
      confirmLabel: t('shared.delete'), destructive: true,
    });
    if (!ok) return;
    try {
      await deleteBrand(id);
      setDirty(false);
      toast(t('brandEdit.toastDeleted'));
      navigate(LIST, { state: { leave: true } });
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const canSave = dirty && !busy && form.name.trim() !== '';
  const name = form.name || initial?.name || t('shared.newBrand');

  return (
    <Page
      title={isNew ? t('shared.newBrand') : form.name || initial?.name || t('shared.brand')}
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
                  icon={Tag} hue="blue" title={t('shared.basicInfo')}
                  actions={initial && <Badge tone={initial.productCount > 0 ? 'info' : 'neutral'}>{t('brandEdit.productsBadge', { n: initial.productCount })}</Badge>}
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label={t('shared.name')} required>
                      <Input value={form.name} onChange={(v) => set('name', v)} />
                    </Field>
                    <Field label={t('brandEdit.slugLabel')} hint={t('brandEdit.slugHint')}>
                      <Input value={form.slug} onChange={(v) => set('slug', v)} />
                    </Field>
                    <Field label={t('shared.sortOrder')} hint={t('brandEdit.sortHint')}>
                      <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
                    </Field>
                  </div>
                </Card>
              </div>
              <div className="stagger" style={stagger(1)}>
                <Card icon={ImageSquare} hue="violet" title={t('brandEdit.logo.title')} description={t('brandEdit.logo.desc')}>
                  <ImageUploader label={t('brandEdit.logo.uploaderLabel')} images={form.logoUrl ? [form.logoUrl] : []} onChange={(next) => set('logoUrl', next[0] ?? '')} accept="image/png,image/webp" />
                </Card>
              </div>
            </div>
            <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-28">
              <div className="stagger" style={stagger(2)}>
                <Card icon={Eye} hue="green" title={t('brandEdit.logoPreview')}>
                  {form.logoUrl ? (
                    <div className="grid grid-cols-2 gap-3">
                      {/* Saytdagi tasmadagidek bir rangga keltiriladi; ramkalar admin mavzusiga bog'lanmagan — saytning ikki mavzusi. */}
                      <figure className="flex flex-col gap-1.5">
                        <div className="grid aspect-[4/3] place-items-center rounded-control-lg bg-white p-4">
                          <img src={form.logoUrl} alt="" className="max-h-12 max-w-[80%] object-contain brightness-0" />
                        </div>
                        <figcaption className="flex items-center gap-1 text-sm text-text-muted"><Sun className="size-3.5" />{t('brandEdit.logoLight')}</figcaption>
                      </figure>
                      <figure className="flex flex-col gap-1.5">
                        <div className="grid aspect-[4/3] place-items-center rounded-control-lg bg-black p-4">
                          <img src={form.logoUrl} alt="" className="max-h-12 max-w-[80%] object-contain brightness-0 invert" />
                        </div>
                        <figcaption className="flex items-center gap-1 text-sm text-text-muted"><Moon className="size-3.5" />{t('brandEdit.logoDark')}</figcaption>
                      </figure>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 rounded-control-lg bg-surface-sunken px-4 py-8 text-center">
                      <Avatar name={name} size="xl" />
                      <p className="text-sm text-text-muted">{t('brandEdit.logoEmpty')}</p>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold text-text">{name}</p>
                    {form.slug && <p className="truncate text-sm text-text-faint">/brand/{form.slug}</p>}
                  </div>
                </Card>
              </div>
              {!isNew && initial && (
                <div className="stagger" style={stagger(3)}>
                  <DangerZone title={t('shared.dangerZone')} text={t('brandEdit.dangerDesc')}>
                    <Button variant="dangerSoft" onClick={remove} className="w-full"><Trash />{t('brandEdit.deleteButton')}</Button>
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

export default BrandEdit;
