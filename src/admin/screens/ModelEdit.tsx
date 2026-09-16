import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
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
          if (!m) { setError('Model topilmadi'); return; }
          setInitial(m);
          setForm({ name: m.name, brandId: m.brandId, categoryId: m.categoryId, chip: m.chip, ram: m.ram, camera: m.camera, display: m.display, sortOrder: m.sortOrder });
        }
        setLoaded(true);
      })
      .catch(() => setError('Yuklashda xatolik'));
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };

  async function save() {
    setBusy(true); setError('');
    const body = { name: form.name, brandId: form.brandId, categoryId: form.categoryId, chip: form.chip, ram: form.ram, camera: form.camera, display: form.display, sortOrder: form.sortOrder };
    try {
      if (isNew) {
        await createDeviceModel(body);
        toast("Model qo'shildi");
        navigate(LIST);
      } else {
        await updateDeviceModel(id, body);
        setDirty(false);
        toast('Saqlandi');
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
      title: `«${initial.name}» modelini o'chirish`,
      message: "Registrdan o'chadi; mavjud mahsulotlarga ta'sir qilmaydi.",
      confirmLabel: "O'chirish", destructive: true,
    });
    if (!ok) return;
    try {
      await deleteDeviceModel(id);
      toast("Model o'chirildi");
      navigate(LIST);
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const canSave = dirty && !busy && form.name.trim() !== '' && form.brandId !== '' && form.categoryId !== '';

  return (
    <Page
      title={isNew ? 'Yangi model' : initial?.name ?? 'Model'}
      back={LIST}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>}
    >
      {!loaded && !error ? <Skeleton rows={5} /> : (
        <div className="flex flex-col gap-4">
          {error && <p className="text-para text-danger">{error}</p>}
          <Card title="Asosiy">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nomi" required className="md:col-span-2">
                <Input value={form.name} onChange={(v) => set('name', v)} placeholder="iPhone 16 Pro Max" />
              </Field>
              <Field label="Brend" required>
                <Select value={form.brandId} onChange={(v) => set('brandId', v)}>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
              <Field label="Kategoriya" required>
                <Select value={form.categoryId} onChange={(v) => set('categoryId', v)}>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Tartib" hint="Taklif ro'yxatidagi o'rni — kichigi oldin">
                <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
              </Field>
            </div>
          </Card>
          <Card title="Xususiyatlar" description="Model tanlanganda mahsulot xususiyatlariga shu qiymatlar tushadi; bo'sh qolgani tushmaydi.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Protsessor"><Input value={form.chip} onChange={(v) => set('chip', v)} /></Field>
              <Field label="Operativ xotira"><Input value={form.ram} onChange={(v) => set('ram', v)} /></Field>
              <Field label="Kamera"><Input value={form.camera} onChange={(v) => set('camera', v)} /></Field>
              <Field label="Displey"><Input value={form.display} onChange={(v) => set('display', v)} /></Field>
            </div>
          </Card>
          {!isNew && initial && (
            <Card title="Xavfli zona" description="Model registrdan o'chadi; mavjud mahsulotlarga ta'sir qilmaydi.">
              <Button variant="destructive" onClick={remove}>Modelni o'chirish</Button>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
};

export default ModelEdit;
