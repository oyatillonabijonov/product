import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import { X } from 'lucide-react';
import type { ApiCategory, ApiProductType } from '../../../shared/types';
import { createType, deleteType, listCategories, listTypes, updateType, type AdminTypeInput } from '../api';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import { Badge, Button, Card, Field, INPUT_CLS, Input, Page, Select, Skeleton } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/products/types';

/** Nomdan id — serverdagi `slugify` bilan bir xil qoida (kichik lotin, raqam, `-`). */
function slugId(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

interface Form { categoryId: string; id: string; label: string; labelRu: string; iconUrl: string; billzAliases: string[]; sortOrder: number }
const EMPTY: Form = { categoryId: '', id: '', label: '', labelRu: '', iconUrl: '', billzAliases: [], sortOrder: 0 };

/** Tur tahriri. `id` = 'new' yoki `${categoryId}/${typeId}` (yaratilgandan keyin id/yo'nalish o'zgarmaydi). */
const TypeEdit: FC<{ id: string }> = ({ id }) => {
  const isNew = id === 'new';
  const [catParam, typeParam] = isNew ? ['', ''] : id.split('/');
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [rawForm, setForm] = useState(EMPTY as Form);
  const form = rawForm as Form;
  const [rawCats, setCats] = useState([] as ApiCategory[]);
  const cats = rawCats as ApiCategory[];
  const [rawCurrent, setCurrent] = useState(null as ApiProductType | null);
  const current = rawCurrent as ApiProductType | null;
  const [loaded, setLoaded] = useState(isNew);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [alias, setAlias] = useState('');

  useEffect(() => {
    listCategories().then(setCats).catch(() => setError('Yo\'nalishlar yuklanmadi'));
    if (isNew) return;
    listTypes().then((all) => {
      const t = all.find((x) => x.categoryId === catParam && x.id === typeParam);
      if (!t) { setError('Tur topilmadi'); return; }
      setCurrent(t);
      setForm({ categoryId: t.categoryId, id: t.id, label: t.label, labelRu: t.labelRu, iconUrl: t.iconUrl, billzAliases: t.billzAliases, sortOrder: t.sortOrder });
      setLoaded(true);
    }).catch(() => setError('Yuklashda xatolik'));
  }, [isNew, catParam, typeParam]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };

  function addAlias() {
    const a = alias.trim();
    setAlias('');
    if (!a || form.billzAliases.includes(a)) return;
    set('billzAliases', [...form.billzAliases, a]);
  }

  async function save() {
    setBusy(true); setError('');
    const body: AdminTypeInput = {
      id: form.id || undefined, categoryId: form.categoryId, label: form.label, labelRu: form.labelRu,
      iconUrl: form.iconUrl, billzAliases: form.billzAliases, sortOrder: form.sortOrder,
    };
    try {
      if (isNew) {
        const created = await createType(body);
        toast('Tur qo\'shildi');
        navigate(`${LIST}/${created.categoryId}/${created.id}`, { replace: true });
      } else {
        const saved = await updateType(catParam, typeParam, body);
        setCurrent(saved);
        setDirty(false);
        toast('Saqlandi · saytda 1–5 daqiqada ko\'rinadi');
      }
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!current) return;
    const n = current.productCount;
    const ok = await confirm({
      title: `«${current.label}» turini o'chirish`,
      message: n > 0 ? `${n} ta mahsulot tursiz qoladi — katalogda ko'rinadi, tur qatorida chiqmaydi.` : 'Bu turda mahsulot yo\'q.',
      confirmLabel: "O'chirish", destructive: true,
    });
    if (!ok) return;
    try {
      await deleteType(catParam, typeParam);
      toast('Tur o\'chirildi');
      navigate(LIST);
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const title = isNew ? 'Yangi tur' : current?.label ?? 'Tur';
  const canSave = dirty && !busy && form.label.trim() !== '' && form.categoryId !== '' && form.iconUrl !== '';

  return (
    <Page
      title={title}
      back={LIST}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>}
    >
      {!loaded && !error ? <Skeleton rows={4} /> : (
        <div className="flex flex-col gap-4">
          {error && <p className="text-para text-danger">{error}</p>}
          <Card title="Asosiy">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Yo'nalish" required>
                <Select value={form.categoryId} onChange={(v) => set('categoryId', v)} disabled={!isNew}>
                  <option value="">— tanlang —</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="ID" hint={isNew ? "Bo'sh qolsa nomdan yasaladi; keyin o'zgarmaydi" : 'Yaratilgandan keyin o\'zgarmaydi'} required>
                <Input value={form.id} onChange={(v) => set('id', v)} placeholder={slugId(form.label)} disabled={!isNew} />
              </Field>
              <Field label="Nomi" required>
                <Input value={form.label} onChange={(v) => set('label', v)} />
              </Field>
              <Field label="Nomi (ru)" hint="Bo'sh qolsa o'zbekchasi chiqadi">
                <Input value={form.labelRu} onChange={(v) => set('labelRu', v)} />
              </Field>
              <Field label="Tartib" hint="Tur qatoridagi o'rni — kichigi oldin">
                <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
              </Field>
            </div>
          </Card>

          <Card title="Ikonka" description="Shaffof PNG; yuklashda 220×136 qutiga sig'diriladi (sayt yarim o'lchamda chizadi).">
            <ImageUploader
              label="Ikonka"
              images={form.iconUrl ? [form.iconUrl] : []}
              onChange={(next) => set('iconUrl', next[0] ?? '')}
              normalize={{ maxSize: 220, maxHeight: 136, quality: 0.8 }}
            />
          </Card>

          <Card title="Billz aliaslari" description="Billz'dagi kategoriya nomlari — sinxronizatsiya shu nomdagi tovarni shu turga qo'yadi (tur nomi ham mos keladi).">
            <div className="flex flex-wrap gap-2">
              {form.billzAliases.map((a) => (
                <span key={a} className="inline-flex items-center gap-1">
                  <Badge>{a}</Badge>
                  <button type="button" aria-label={`${a} — olib tashlash`} onClick={() => set('billzAliases', form.billzAliases.filter((x) => x !== a))} className="press rounded-full p-1 text-muted-2 hover:text-primary">
                    <X aria-hidden className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              {/* Kit `Input`i onKeyDown bermaydi — native input o'sha `INPUT_CLS` bilan (Enter alias qo'shadi). */}
              <input
                value={alias}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAlias(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); addAlias(); } }}
                placeholder="Masalan: DDR5 — Enter"
                className={INPUT_CLS}
              />
              <Button variant="secondary" onClick={addAlias}>Qo'shish</Button>
            </div>
          </Card>

          {!isNew && current && (
            <Card title="Xavfli zona" description="Tur o'chirilsa shu turdagi mahsulotlar tursiz qoladi.">
              <Button variant="destructive" onClick={remove}>Turni o'chirish</Button>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
};

export default TypeEdit;
