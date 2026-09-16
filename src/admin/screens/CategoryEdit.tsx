import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import type { ApiCategory } from '../../../shared/types';
import { createCategory, deleteCategory, listCategories, listTypes, updateCategory } from '../api';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import { Button, Card, Field, Input, LangPair, Page, Skeleton } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/products/categories';

interface Form { name: string; nameRu: string; sortOrder: number; coverUrl: string }
const EMPTY: Form = { name: '', nameRu: '', sortOrder: 0, coverUrl: '' };

/** Kategoriya tahriri. `id` = 'new' yoki kategoriya id'si; id server tomonida nomdan yasaladi, keyin o'zgarmaydi. */
const CategoryEdit: FC<{ id: string }> = ({ id }) => {
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
      if (!c) { setError('Kategoriya topilmadi'); return; }
      setInitial(c);
      setForm({ name: c.name, nameRu: c.nameRu, sortOrder: c.sortOrder, coverUrl: c.coverUrl });
      setTypeCount(types.filter((t) => t.categoryId === id).length);
      setLoaded(true);
    }).catch(() => setError('Yuklashda xatolik'));
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };

  async function save() {
    setBusy(true); setError('');
    // Saytda ko'rinmaydigan ustunlar (ikonka kaliti, cover izohi) tahrirlanmaydi — mavjud qiymat saqlanadi.
    const body = {
      name: form.name, nameRu: form.nameRu, coverUrl: form.coverUrl, sortOrder: form.sortOrder,
      icon: initial?.icon ?? '', iconUrl: initial?.iconUrl ?? '',
      coverLede: initial?.coverLede ?? '', coverLedeRu: initial?.coverLedeRu ?? '',
    };
    try {
      if (isNew) {
        await createCategory(body);
        toast("Kategoriya qo'shildi");
        navigate(LIST);
      } else {
        await updateCategory(id, body);
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
      title: `«${initial.name}» yo'nalishini o'chirish`,
      message: `${typeCount} ta tur ham o'chadi; mahsulotlar kategoriyasiz qoladi (katalogda ko'rinadi).`,
      confirmLabel: "O'chirish", destructive: true,
    });
    if (!ok) return;
    try {
      await deleteCategory(id);
      toast("Kategoriya o'chirildi");
      navigate(LIST);
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const canSave = dirty && !busy && form.name.trim() !== '';

  return (
    <Page
      title={isNew ? 'Yangi kategoriya' : initial?.name ?? 'Kategoriya'}
      back={LIST}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>}
    >
      {!loaded && !error ? <Skeleton rows={4} /> : (
        <div className="flex flex-col gap-4">
          {error && <p className="text-para text-danger">{error}</p>}
          <Card title="Asosiy">
            <LangPair label="Nomi" uz={form.name} ru={form.nameRu} onUz={(v) => set('name', v)} onRu={(v) => set('nameRu', v)} required />
            <div className="mt-4 max-w-40">
              <Field label="Tartib" hint="Menyudagi o'rni — kichigi oldin">
                <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
              </Field>
            </div>
          </Card>
          <Card title="Cover rasmi" description="Yo'nalish sahifasi tepasidagi keng (landshaft) rasm; bo'sh qolsa sahifa oddiy sarlavha bilan ochiladi.">
            <ImageUploader label="Cover" images={form.coverUrl ? [form.coverUrl] : []} onChange={(next) => set('coverUrl', next[0] ?? '')} />
          </Card>
          {!isNew && initial && (
            <Card title="Xavfli zona" description="Yo'nalish bilan birga uning turlari o'chadi; mahsulotlar kategoriyasiz qoladi.">
              <Button variant="destructive" onClick={remove}>Yo'nalishni o'chirish</Button>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
};

export default CategoryEdit;
