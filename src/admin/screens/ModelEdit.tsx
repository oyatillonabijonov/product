import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { ApiAdminBrand, ApiCategory, ApiDeviceModel } from '../../../shared/types';
import { createDeviceModel, deleteDeviceModel, listBrands, listCategories, listDeviceModels, updateDeviceModel } from '../api';
import { errText } from '../errText';
import { Button, Card, Field, Input, Page, Select, Skeleton } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/products/models';

interface Form { name: string; brandId: string; categoryId: string; chip: string; ram: string; camera: string; display: string; sortOrder: number }
const EMPTY: Form = { name: '', brandId: '', categoryId: '', chip: '', ram: '', camera: '', display: '', sortOrder: 0 };

/**
 * Model tahriri. Model tanlanganda mahsulot formasi nom/brend/kategoriya va xususiyatlarni
 * (Protsessor, Operativ xotira, Kamera, Displey) shu yozuvdan to'ldiradi.
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

  return (
    <Page
      title={isNew ? t('shared.newModel') : form.name || initial?.name || t('modelEdit.fallbackTitle')}
      back={LIST}
      dirty={dirty}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? t('shared.saving') : t('shared.save')}</Button>}
    >
      {!loaded && !error ? <Skeleton rows={5} /> : (
        <div className="flex flex-col gap-4">
          {error && <p className="text-para text-danger">{error}</p>}
          <Card title={t('shared.basicInfo')}>
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
          <Card title={t('shared.specs')} description={t('modelEdit.specsDesc')}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t('modelEdit.chipLabel')}><Input value={form.chip} onChange={(v) => set('chip', v)} /></Field>
              <Field label={t('modelEdit.ramLabel')}><Input value={form.ram} onChange={(v) => set('ram', v)} /></Field>
              <Field label={t('modelEdit.cameraLabel')}><Input value={form.camera} onChange={(v) => set('camera', v)} /></Field>
              <Field label={t('modelEdit.displayLabel')}><Input value={form.display} onChange={(v) => set('display', v)} /></Field>
            </div>
          </Card>
          {!isNew && initial && (
            <Card title={t('shared.dangerZone')} description={t('modelEdit.dangerDesc')}>
              <Button variant="destructive" onClick={remove}>{t('modelEdit.deleteButton')}</Button>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
};

export default ModelEdit;
