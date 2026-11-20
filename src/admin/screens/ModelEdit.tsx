import { useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Camera, CheckCircle, Circle, Cpu, DeviceMobile, Eye, Memory, Monitor, Trash } from '@phosphor-icons/react';
import type { Icon as PhIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { ApiAdminBrand, ApiCategory, ApiDeviceModel } from '../../../shared/types';
import { createDeviceModel, deleteDeviceModel, listBrands, listCategories, listDeviceModels, updateDeviceModel } from '../api';
import { errText } from '../errText';
import { Avatar, Badge, Button, Card, Field, IconTile, Input, Page, Select, Skeleton, type Hue } from '../ui';
import { Meter } from '../ui/stats';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/products/models';

interface Form { name: string; brandId: string; categoryId: string; chip: string; ram: string; camera: string; display: string; sortOrder: number }
const EMPTY: Form = { name: '', brandId: '', categoryId: '', chip: '', ram: '', camera: '', display: '', sortOrder: 0 };
type SpecKey = 'chip' | 'ram' | 'camera' | 'display';
const SPECS: { key: SpecKey; label: 'modelEdit.chipLabel' | 'modelEdit.ramLabel' | 'modelEdit.cameraLabel' | 'modelEdit.displayLabel'; icon: PhIcon; hue: Hue }[] = [
  { key: 'chip', label: 'modelEdit.chipLabel', icon: Cpu, hue: 'violet' },
  { key: 'ram', label: 'modelEdit.ramLabel', icon: Memory, hue: 'teal' },
  { key: 'camera', label: 'modelEdit.cameraLabel', icon: Camera, hue: 'orange' },
  { key: 'display', label: 'modelEdit.displayLabel', icon: Monitor, hue: 'blue' },
];

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

/**
 * Model tahriri. Model tanlanganda mahsulot formasi nom/brend/kategoriya va xususiyatlarni
 * (Protsessor, Operativ xotira, Kamera, Displey) shu yozuvdan to'ldiradi — o'ngdagi karta shuni ko'rsatadi.
 */
const ModelEdit: FC<{ id: string }> = ({ id }) => {
  const { t } = useTranslation('products');
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [rawForm, setForm] = useState(EMPTY as Form);
  const form = rawForm as Form;
  const [rawInitial, setInitial] = useState(null as ApiDeviceModel | null);
  const initial = rawInitial as ApiDeviceModel | null;
  const [rawBrands, setBrands] = useState([] as ApiAdminBrand[]);
  const brands = rawBrands as ApiAdminBrand[];
  const [rawCats, setCats] = useState([] as ApiCategory[]);
  const cats = rawCats as ApiCategory[];
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([listBrands(), listCategories(), isNew ? Promise.resolve([] as ApiDeviceModel[]) : listDeviceModels()])
      .then(([b, c, models]) => {
        setBrands(b); setCats(c);
        if (isNew) {
          // Yangi yozuvda birinchi brend/kategoriya tanlangan turadi — ikkalasi majburiy.
          setForm((f: Form) => ({ ...f, brandId: b[0]?.id ?? '', categoryId: c[0]?.id ?? '' }));
        } else {
          const m = models.find((x) => x.id === id);
          if (!m) { setError(t('modelEdit.notFound')); return; }
          setInitial(m);
          setForm({ name: m.name, brandId: m.brandId, categoryId: m.categoryId, chip: m.chip, ram: m.ram, camera: m.camera, display: m.display, sortOrder: m.sortOrder });
        }
        setLoaded(true);
      })
      .catch(() => setError(t('shared.loadError')));
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };

  async function save() {
    setBusy(true); setError('');
    const body = { name: form.name, brandId: form.brandId, categoryId: form.categoryId, chip: form.chip, ram: form.ram, camera: form.camera, display: form.display, sortOrder: form.sortOrder };
    try {
      if (isNew) {
        await createDeviceModel(body);
        setDirty(false);
        toast(t('modelEdit.toastCreated'));
        navigate(LIST, { state: { leave: true } });
      } else {
        await updateDeviceModel(id, body);
        setDirty(false);
        toast(t('modelEdit.toastSaved'));
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
      title: t('modelEdit.confirmDelete', { name: initial.name }),
      message: t('modelEdit.confirmDeleteMessage'),
      confirmLabel: t('shared.delete'), destructive: true,
    });
    if (!ok) return;
    try {
      await deleteDeviceModel(id);
      setDirty(false);
      toast(t('modelEdit.toastDeleted'));
      navigate(LIST, { state: { leave: true } });
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const canSave = dirty && !busy && form.name.trim() !== '' && form.brandId !== '' && form.categoryId !== '';
  const filled = SPECS.filter((s) => form[s.key].trim() !== '').length;
  const brand = brands.find((b) => b.id === form.brandId);
  const catName = cats.find((c) => c.id === form.categoryId)?.name ?? form.categoryId;

  return (
    <Page
      title={isNew ? t('shared.newModel') : form.name || initial?.name || t('modelEdit.fallbackTitle')}
      back={LIST}
      dirty={dirty}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? t('shared.saving') : t('shared.save')}</Button>}
    >
      {!loaded && !error ? <Skeleton rows={5} /> : (
        <div className="flex flex-col gap-6">
          {error && <p role="alert" className="rounded-surface bg-danger-soft px-5 py-4 text-base text-danger-strong">{error}</p>}
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex min-w-0 flex-col gap-4">
              <div className="stagger" style={stagger(0)}>
                <Card icon={DeviceMobile} hue="blue" title={t('shared.basicInfo')}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label={t('shared.name')} required className="md:col-span-2">
                      <Input value={form.name} onChange={(v) => set('name', v)} placeholder="iPhone 16 Pro Max" />
                    </Field>
                    <Field label={t('shared.brand')} required>
                      <Select value={form.brandId} onChange={(v) => set('brandId', v)}>
                        {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </Select>
                    </Field>
                    <Field label={t('shared.category')} required>
                      <Select value={form.categoryId} onChange={(v) => set('categoryId', v)}>
                        {form.categoryId && !cats.some((c) => c.id === form.categoryId) && <option value={form.categoryId}>{t('modelEdit.legacyCategory', { id: form.categoryId })}</option>}
                        {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </Select>
                    </Field>
                    <Field label={t('shared.sortOrder')} hint={t('modelEdit.sortHint')}>
                      <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
                    </Field>
                  </div>
                </Card>
              </div>
              <div className="stagger" style={stagger(1)}>
                <Card
                  icon={Cpu} hue="violet" title={t('shared.specs')} description={t('modelEdit.specsDesc')}
                  actions={<Badge tone={filled === 4 ? 'ok' : 'neutral'}>{filled}/4</Badge>}
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    {SPECS.map((s) => (
                      <div key={s.key} className="flex items-end gap-3">
                        <IconTile icon={s.icon} hue={s.hue} soft size="lg" className="lg:size-9" />
                        <Field label={t(s.label)} className="min-w-0 flex-1">
                          <Input value={form[s.key]} onChange={(v) => set(s.key, v)} />
                        </Field>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
            <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-28">
              <div className="stagger" style={stagger(2)}>
                <Card icon={Eye} hue="green" title={t('modelEdit.previewTitle')}>
                  <div className="flex items-center gap-3">
                    {brand?.logoUrl
                      ? <span className="grid size-12 shrink-0 place-items-center rounded-control bg-surface"><img src={brand.logoUrl} alt="" className="max-h-6 max-w-8 object-contain brightness-0 dark:invert" /></span>
                      : <Avatar name={brand?.name ?? (form.name || '?')} size="lg" />}
                    <div className="min-w-0">
                      <p className="truncate text-lg font-bold text-text">{form.name || t('shared.newModel')}</p>
                      <p className="truncate text-sm text-text-muted">{[brand?.name, catName].filter(Boolean).join(' · ')}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <p className="text-sm text-text-muted">{t('modelsList.specsFilled', { n: filled })}</p>
                    <Meter value={filled} max={4} hue={filled === 4 ? 'green' : 'violet'} />
                  </div>
                  <ul className="flex flex-col">
                    {SPECS.map((s) => {
                      const v = form[s.key].trim();
                      return (
                        <li key={s.key} className="flex items-center gap-2.5 border-b border-border py-3 text-base last:border-b-0 last:pb-0">
                          {v ? <CheckCircle weight="fill" className="size-4 shrink-0 text-success" /> : <Circle className="size-4 shrink-0 text-text-faint" />}
                          <span className="shrink-0 text-text-muted">{t(s.label)}</span>
                          <span className={`min-w-0 flex-1 truncate text-right ${v ? 'font-medium text-text' : 'text-text-faint'}`}>{v || '—'}</span>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              </div>
              {!isNew && initial && (
                <div className="stagger" style={stagger(3)}>
                  <DangerZone title={t('shared.dangerZone')} text={t('modelEdit.dangerDesc')}>
                    <Button variant="dangerSoft" onClick={remove} className="w-full"><Trash />{t('modelEdit.deleteButton')}</Button>
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

export default ModelEdit;
