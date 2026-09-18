import { useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { X } from 'lucide-react';
import type { ApiAdminBrand, ApiCategory, ApiDeviceModel, ApiProductType } from '../../../shared/types';
import { deriveLegacyCategory } from '../../../shared/legacy-category';
import {
  createProduct, deleteProduct, getProductDetail, listBrands, listCategories, listDeviceModels, listTypes, updateProduct, uploadImage,
} from '../api';
import type { AdminVariantInput } from '../api';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import ModelCombobox from '../ModelCombobox';
import PriceInput from '../PriceInput';
import ReviewsEditor from '../ReviewsEditor';
import { formatThousands } from '../lib/format';
import { normalizeImage } from '../lib/image-normalize';
import { mergeSpecs, modelToSpecs } from '../lib/models';
import {
  COLOR_VALUES, EMPTY_FORM, STORAGE_VALUES, addAxisValue, detailToForm, formToPayload, toggleAxisValue, validateForm, variantLabel,
  type ProductFormState,
} from '../lib/product-form';
import { Button, Card, EmptyState, Field, INPUT_CLS, Input, Page, Rows, Segmented, Select, Skeleton, SwitchRow, Textarea } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/products';
type LoadState = 'loading' | 'ready' | 'error';

/** Variant chipi (Xotira/Rang qiymati) — tanlangani `cta`. */
const Chip: FC<{ on: boolean; onClick: () => void; children: ReactNode }> = ({ on, onClick, children }) => (
  <button
    type="button"
    aria-pressed={on}
    onClick={onClick}
    className={`press h-11 md:h-9 rounded-full border px-3.5 text-para ${on ? 'border-cta bg-cta text-white' : 'border-line text-primary hover:border-cta'}`}
  >
    {children}
  </button>
);

/**
 * Mahsulot tahriri — bitta ustun, kartalar muhimlik tartibida (spec §5): Rasmlar → Holat → Ma'lumot → Narx →
 * Variantlar → Xususiyatlar → Reyting va sharhlar → Xavfli zona. `id` = 'new' yoki mahsulot id'si.
 * Billz tovarida sinxron ustunlar (nom, brend, kategoriya, tur, tavsif, narx, xususiyatlar) faqat o'qiladi —
 * keyingi sinxronizatsiya baribir qayta yozadi; o'chirish yo'q (sinxronizatsiya qaytaradi), faqat yashirish.
 */
const ProductEdit: FC<{ id: string }> = ({ id }) => {
  const isNew = id === 'new';
  const navigate = useNavigate();
  const location = useLocation();
  const search = (location.state as { search?: string } | null)?.search;
  const backTo = search ? `${LIST}?${search}` : LIST;
  const toast = useToast();
  const confirm = useConfirm();
  const [rawForm, setForm] = useState(EMPTY_FORM as ProductFormState);
  const form = rawForm as ProductFormState;
  const [rawCats, setCats] = useState([] as ApiCategory[]);
  const cats = rawCats as ApiCategory[];
  const [rawBrands, setBrands] = useState([] as ApiAdminBrand[]);
  const brands = rawBrands as ApiAdminBrand[];
  const [rawModels, setModels] = useState([] as ApiDeviceModel[]);
  const models = rawModels as ApiDeviceModel[];
  const [rawTypes, setTypes] = useState([] as ApiProductType[]);
  const types = rawTypes as ApiProductType[];
  // Tahrirda detail kelmaguncha saqlash bloklanadi — bo'sh forma ustidan PUT (replace-all) mahsulotni bo'shatib yuborardi.
  const [rawLoad, setLoad] = useState((isNew ? 'ready' : 'loading') as LoadState);
  const loadState = rawLoad as LoadState;
  const [retry, setRetry] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [colorDraft, setColorDraft] = useState('');
  const [rawBusyRow, setBusyRow] = useState(null as number | null);
  const busyRow = rawBusyRow as number | null;

  useEffect(() => {
    Promise.all([listCategories(), listBrands(), listDeviceModels(), listTypes()])
      .then(([c, b, m, t]) => { setCats(c); setBrands(b); setModels(m); setTypes(t); })
      .catch(() => setError("Ma'lumotnomalar (kategoriya, brend, tur) yuklanmadi"));
  }, []);

  useEffect(() => {
    if (isNew) return;
    let stale = false; // tez ketma-ket ochilganda eski javob formani to'ldirmasin
    setLoad('loading');
    getProductDetail(id)
      .then((d) => { if (stale) return; setForm(detailToForm(d)); setLoad('ready'); })
      .catch(() => { if (!stale) setLoad('error'); });
    return () => { stale = true; };
  }, [id, isNew, retry]);

  const patch = (fn: (f: ProductFormState) => ProductFormState) => { setForm(fn); setDirty(true); };
  const set = <K extends keyof ProductFormState>(k: K, v: ProductFormState[K]) => patch((f) => ({ ...f, [k]: v }));
  /** Yo'nalish almashsa eski tur begona bo'lib qoladi (masalan `pc`da `iphone`) — tozalanadi. */
  const typeOf = (categoryId: string | null, type: string | null) =>
    type && types.some((t) => t.categoryId === categoryId && t.id === type) ? type : null;

  function pickModel(m: ApiDeviceModel) {
    patch((f) => {
      // Registrdagi eskirgan yo'nalish id'si (0025'gacha: telefonlar/planshetlar/noutbuklar) mahsulotga o'tmasin.
      const categoryId = cats.some((c) => c.id === m.categoryId) ? m.categoryId : f.categoryId;
      return {
        ...f, name: m.name, brandId: m.brandId, categoryId, category: m.legacyCategory,
        type: typeOf(categoryId, f.type), specs: mergeSpecs(f.specs, modelToSpecs(m)),
      };
    });
  }
  function setCategory(categoryId: string | null) {
    patch((f) => ({ ...f, categoryId, category: deriveLegacyCategory(categoryId), type: typeOf(categoryId, f.type) }));
  }
  function addCustomColor() {
    const c = colorDraft;
    setColorDraft('');
    if (c.trim()) patch((f) => addAxisValue(f, 'Rang', c));
  }
  function updateVariant(i: number, p: Partial<AdminVariantInput>) {
    patch((f) => ({ ...f, variants: f.variants.map((v, j) => (j === i ? { ...v, ...p } : v)) }));
  }
  async function uploadVariantImage(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusyRow(i);
    try {
      const { imageUrl } = await uploadImage(await normalizeImage(file));
      updateVariant(i, { imageUrl });
    } catch (err) {
      toast(errText(err), 'error');
    } finally {
      setBusyRow(null);
    }
  }

  async function save() {
    const problem = validateForm(form);
    if (problem) { setError(problem); toast(problem, 'error'); return; }
    setBusy(true); setError('');
    try {
      if (isNew) {
        await createProduct(formToPayload(form));
        setDirty(false);
        toast("Mahsulot qo'shildi");
        navigate(backTo, { state: { leave: true } });
      } else {
        await updateProduct(id, formToPayload(form));
        setDirty(false);
        toast("Saqlandi · saytda 1–5 daqiqada ko'rinadi");
      }
    } catch (err) {
      const msg = errText(err); setError(msg); toast(msg, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: `«${form.name}» ni o'chirish`,
      message: "Mahsulot, rasmlari va variantlari o'chiriladi. Qaytarib bo'lmaydi.",
      confirmLabel: "O'chirish", destructive: true,
    });
    if (!ok) return;
    try {
      await deleteProduct(id);
      setDirty(false);
      toast("Mahsulot o'chirildi");
      navigate(backTo, { state: { leave: true } });
    } catch (err) {
      toast(errText(err), 'error');
    }
  }

  const billz = form.billzId !== null;
  const title = isNew ? 'Yangi mahsulot' : form.name || 'Mahsulot';
  const canSave = dirty && !busy && loadState === 'ready';
  const storage = form.options.find((o) => o.name === 'Xotira')?.values ?? [];
  const colors = form.options.find((o) => o.name === 'Rang')?.values ?? [];
  const brandName = brands.find((b) => b.id === form.brandId)?.name ?? '—';
  const catName = cats.find((c) => c.id === form.categoryId)?.name ?? '—';
  const typeLabel = types.find((t) => t.categoryId === form.categoryId && t.id === form.type)?.label ?? '—';

  if (loadState !== 'ready') {
    return (
      <Page title="Mahsulot" back={backTo}>
        {loadState === 'loading' ? (
          <Skeleton rows={6} />
        ) : (
          <EmptyState
            title="Mahsulot yuklanmadi"
            text="Saqlash bloklandi — ma'lumot to'liq kelmasa saqlash mavjud mahsulotni bo'shatib yuborardi."
            action={<Button variant="secondary" onClick={() => setRetry((r: number) => r + 1)}>Qayta urinish</Button>}
          />
        )}
      </Page>
    );
  }

  return (
    <Page
      title={title}
      back={backTo}
      dirty={dirty}
      actions={
        <>
          {!isNew && form.isActive && <Button variant="quiet" href={`/product/${id}`} external>Saytda ko'rish</Button>}
          <Button onClick={save} disabled={!canSave}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <p className="text-para text-danger">{error}</p>}

        <Card title="Rasmlar" description={billz ? "Billz'da rasm bo'lsa sinxronizatsiyada u ustun turadi; bo'lmasa shu yerda yuklagani qoladi." : undefined}>
          <ImageUploader label="Asosiy rasm" images={form.imageUrl ? [form.imageUrl] : []} onChange={(next) => set('imageUrl', next[0] ?? '')} />
          <div className="mt-4">
            <ImageUploader label="Galereya" images={form.images} onChange={(next) => set('images', next)} multiple reorderable />
          </div>
        </Card>

        <Card title="Holat">
          <div className="divide-y divide-line">
            <SwitchRow
              label="Saytda ko'rsatilsin"
              hint={billz ? "Billz tovarida keyingi sinxronizatsiyagacha amal qiladi: qoldiq > 0 va rasm bo'lsa o'zi yoqiladi." : undefined}
              on={form.isActive}
              onChange={(v) => set('isActive', v)}
            />
            <SwitchRow
              label="Pre-order"
              hint="Sotuvga hali chiqmagan: saytda «Pre-order» yorlig'i, tugma — «Oldindan buyurtma berish»."
              on={form.preorder}
              onChange={(v) => set('preorder', v)}
            />
            <div className="flex flex-wrap items-center justify-between gap-4 py-3">
              <div>
                <p className="text-para text-primary">Holati</p>
                <p className="text-label text-muted-2">Ishlatilgan — bitta dona, variantsiz.</p>
              </div>
              <Segmented
                label="Holati"
                value={form.condition}
                onChange={(v) => patch((f) => (v === 'ishlatilgan' ? { ...f, condition: 'ishlatilgan', options: [], variants: [] } : { ...f, condition: 'yangi' }))}
                options={[{ id: 'yangi', label: 'Yangi' }, { id: 'ishlatilgan', label: 'Ishlatilgan' }]}
              />
            </div>
            <div className="py-3">
              <Field label="Tartib raqami" hint="Kichigi oldin" className="max-w-40">
                <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
              </Field>
            </div>
          </div>
        </Card>

        <Card title="Ma'lumot" description={billz ? "Billz'dan keladi — Billz'da o'zgartiring." : undefined}>
          {billz ? (
            <Rows rows={[
              { k: 'Nomi', v: form.name }, { k: 'Brend', v: brandName }, { k: 'Kategoriya', v: catName }, { k: 'Turi', v: typeLabel },
              { k: 'Tavsif', v: form.description || '—' },
            ]} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nomi / model qidirish" required hint="Model tanlansa brend, kategoriya va xususiyatlar o'zi to'ladi" className="md:col-span-2">
                <ModelCombobox models={models} value={form.name} onChange={(t) => set('name', t)} onPick={pickModel} className={INPUT_CLS} />
              </Field>
              <Field label="Brend">
                <Select value={form.brandId ?? ''} onChange={(v) => set('brandId', v || null)}>
                  <option value="">— tanlang —</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
              <Field label="Kategoriya">
                <Select value={form.categoryId ?? ''} onChange={(v) => setCategory(v || null)}>
                  <option value="">— tanlang —</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Turi" hint="Yo'nalish sahifasidagi tur qatori; tursiz mahsulot katalogda qoladi">
                <Select value={form.type ?? ''} disabled={form.categoryId === null} onChange={(v) => set('type', v || null)}>
                  <option value="">{form.categoryId === null ? '— avval kategoriya —' : '— tanlang —'}</option>
                  {types.filter((t) => t.categoryId === form.categoryId).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </Select>
              </Field>
              <Field label="Tavsif" className="md:col-span-2">
                <Textarea value={form.description} onChange={(v) => set('description', v)} rows={5} />
              </Field>
            </div>
          )}
        </Card>

        <Card title="Narx" description={billz ? "Billz'dagi USD narx × do'kon kursi — sinxronizatsiyada yangilanadi." : undefined}>
          {billz ? (
            <Rows rows={[
              { k: 'Naqd', v: `${formatThousands(form.cashPriceUzs)} so'm` },
              { k: 'Eski narx', v: form.oldPriceUzs > 0 ? `${formatThousands(form.oldPriceUzs)} so'm` : '—' },
              { k: 'Qoldiq', v: String(form.billzStock ?? 0) },
            ]} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Naqd narx (so'm)" required={form.variants.length === 0} hint={form.variants.length > 0 ? "Bo'sh qolsa eng arzon variant narxi olinadi" : undefined}>
                <PriceInput className={INPUT_CLS} value={form.cashPriceUzs} onChange={(v) => set('cashPriceUzs', v)} />
              </Field>
              <Field label="Eski narx (so'm)" hint="Chegirma belgisi uchun; ixtiyoriy">
                <PriceInput className={INPUT_CLS} value={form.oldPriceUzs} onChange={(v) => set('oldPriceUzs', v)} />
              </Field>
            </div>
          )}
        </Card>

        {!billz && form.condition === 'yangi' && (
          <Card title="Variantlar" description="Xotira va rangni tanlang — har birikma alohida narxli variant bo'ladi. Tanlamasangiz yuqoridagi bitta narx ishlaydi (aksessuar).">
            <p className="mb-2 text-label font-medium text-muted">Xotira</p>
            <div className="flex flex-wrap gap-2">
              {STORAGE_VALUES.map((v) => (
                <Chip key={v} on={storage.includes(v)} onClick={() => patch((f) => toggleAxisValue(f, 'Xotira', v))}>{v}</Chip>
              ))}
            </div>
            <p className="mb-2 mt-4 text-label font-medium text-muted">Rang</p>
            <div className="flex flex-wrap items-center gap-2">
              {[...COLOR_VALUES, ...colors.filter((c) => !COLOR_VALUES.includes(c))].map((c) => (
                <Chip key={c} on={colors.includes(c)} onClick={() => patch((f) => toggleAxisValue(f, 'Rang', c))}>{c}</Chip>
              ))}
              <div className="w-36">
                <input
                  value={colorDraft}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setColorDraft(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); addCustomColor(); } }}
                  onBlur={addCustomColor}
                  placeholder="+ boshqa rang"
                  className={INPUT_CLS}
                />
              </div>
            </div>
            {form.variants.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                <p className="text-label font-medium text-muted">Har variant narxi va rasmi</p>
                {form.variants.map((v, i) => (
                  <div key={`${variantLabel(v)}-${i}`} className="flex flex-wrap items-center gap-3 rounded-xs border border-line p-2.5">
                    <span className="min-w-28 text-para font-medium text-primary">{variantLabel(v)}</span>
                    <div className="w-40">
                      <PriceInput placeholder="Narx" className={INPUT_CLS} value={v.cashPriceUzs} onChange={(n) => updateVariant(i, { cashPriceUzs: n })} />
                    </div>
                    {v.imageUrl && <img src={v.imageUrl} alt="" className="size-10 rounded-xs border border-line bg-white object-contain" />}
                    <label className={`press cursor-pointer text-label ${busyRow === i ? 'text-muted' : 'text-cta'}`}>
                      {busyRow === i ? 'Yuklanmoqda…' : v.imageUrl ? 'Rasmni almashtirish' : '+ rasm'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        disabled={busyRow === i}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => uploadVariantImage(i, e)}
                      />
                    </label>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        <Card title="Xususiyatlar" description={billz ? "Billz'dan keladi." : 'Nom va qiymat — mahsulot sahifasidagi jadval.'}>
          {billz ? (
            form.specs.length > 0
              ? <Rows rows={form.specs.map((s) => ({ k: s.label, v: s.value }))} />
              : <p className="text-para text-muted">Xususiyat yo'q.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {form.specs.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder="Nomi (Xotira)" value={s.label} onChange={(v) => set('specs', form.specs.map((x, j) => (j === i ? { ...x, label: v } : x)))} />
                  <Input placeholder="Qiymati (256GB)" value={s.value} onChange={(v) => set('specs', form.specs.map((x, j) => (j === i ? { ...x, value: v } : x)))} />
                  <button
                    type="button"
                    aria-label="Xususiyatni olib tashlash"
                    onClick={() => set('specs', form.specs.filter((_, j) => j !== i))}
                    className="press shrink-0 rounded-xs px-2 text-muted-2 hover:text-danger"
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                </div>
              ))}
              <div>
                <Button variant="quiet" onClick={() => set('specs', [...form.specs, { label: '', value: '' }])}>+ Xususiyat</Button>
              </div>
            </div>
          )}
        </Card>

        <Card title="Reyting va sharhlar" description="Reyting sharhlardan hisoblanadi; sharhsiz mahsulotga tashqi manba qiymatini qo'lda kiriting. Sharh soni 0 bo'lsa kartada yulduzcha chiqmaydi.">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Reyting (0–5)">
              <Input type="number" value={form.ratingAvg ? String(form.ratingAvg) : ''} onChange={(v) => set('ratingAvg', Math.min(5, Math.max(0, Number(v) || 0)))} />
            </Field>
            <Field label="Sharhlar soni">
              <Input type="number" value={form.reviewCount ? String(form.reviewCount) : ''} onChange={(v) => set('reviewCount', Math.max(0, Math.floor(Number(v) || 0)))} />
            </Field>
          </div>
          {/* Sharhlar faqat saqlangan mahsulotda (product_id kerak). Reyting/soni sharhlardan qayta hisoblanadi. */}
          {!isNew && (
            <ReviewsEditor productId={id} onChanged={(avg, count) => setForm((f: ProductFormState) => ({ ...f, ratingAvg: avg, reviewCount: count }))} />
          )}
        </Card>

        {!isNew && !billz && (
          <Card title="Xavfli zona" description="Mahsulot, rasmlari va variantlari o'chiriladi; qaytarib bo'lmaydi.">
            <Button variant="destructive" onClick={remove}>Mahsulotni o'chirish</Button>
          </Card>
        )}
      </div>
    </Page>
  );
};

export default ProductEdit;
