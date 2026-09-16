import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import type { ApiAdminBrand } from '../../../shared/types';
import { createBrand, deleteBrand, listBrands, updateBrand } from '../api';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import { Button, Card, Field, Input, Page, Skeleton } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/products/brands';

interface Form { name: string; slug: string; sortOrder: number; logoUrl: string }
const EMPTY: Form = { name: '', slug: '', sortOrder: 0, logoUrl: '' };

/** Brend tahriri. `id` = 'new' yoki brend id'si (server slug'dan yasaydi). */
const BrandEdit: FC<{ id: string }> = ({ id }) => {
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
      if (!b) { setError('Brend topilmadi'); return; }
      setInitial(b);
      setForm({ name: b.name, slug: b.slug, sortOrder: b.sortOrder, logoUrl: b.logoUrl });
      setLoaded(true);
    }).catch(() => setError('Yuklashda xatolik'));
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };

  async function save() {
    setBusy(true); setError('');
    const body = { name: form.name, slug: form.slug, logoUrl: form.logoUrl, sortOrder: form.sortOrder };
    try {
      if (isNew) {
        await createBrand(body);
        setDirty(false);
        toast("Brend qo'shildi");
        navigate(LIST);
      } else {
        await updateBrand(id, body);
        setDirty(false);
        toast("Saqlandi · saytda 1–5 daqiqada ko'rinadi");
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
      title: `«${initial.name}» brendini o'chirish`,
      message: `${initial.productCount} ta mahsulot brendsiz qoladi. Billz tovari bo'lsa keyingi sinxronizatsiya brendni qayta yaratadi.`,
      confirmLabel: "O'chirish", destructive: true,
    });
    if (!ok) return;
    try {
      await deleteBrand(id);
      setDirty(false);
      toast("Brend o'chirildi");
      navigate(LIST);
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const canSave = dirty && !busy && form.name.trim() !== '';

  return (
    <Page
      title={isNew ? 'Yangi brend' : form.name || initial?.name || 'Brend'}
      back={LIST}
      dirty={dirty}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>}
    >
      {!loaded && !error ? <Skeleton rows={4} /> : (
        <div className="flex flex-col gap-4">
          {error && <p className="text-para text-danger">{error}</p>}
          <Card title="Asosiy">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nomi" required>
                <Input value={form.name} onChange={(v) => set('name', v)} />
              </Field>
              <Field label="Slug" hint="Saytdagi /brand/<slug> manzili; bo'sh qolsa nomdan yasaladi">
                <Input value={form.slug} onChange={(v) => set('slug', v)} />
              </Field>
              <Field label="Tartib" hint="Tasmadagi va ro'yxatdagi o'rni — kichigi oldin">
                <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
              </Field>
            </div>
          </Card>
          <Card title="Logotip" description="Shaffof fonli PNG. Yuklansa bosh sahifadagi brendlar tasmasida chiqadi — tasmada bir rangga (qora/oq) keltiriladi; bo'sh qolsa tasmada chiqmaydi.">
            <ImageUploader label="Logo" images={form.logoUrl ? [form.logoUrl] : []} onChange={(next) => set('logoUrl', next[0] ?? '')} accept="image/png,image/webp" />
          </Card>
          {!isNew && initial && (
            <Card title="Xavfli zona" description="Brend o'chirilsa mahsulotlar brendsiz qoladi.">
              <Button variant="destructive" onClick={remove}>Brendni o'chirish</Button>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
};

export default BrandEdit;
