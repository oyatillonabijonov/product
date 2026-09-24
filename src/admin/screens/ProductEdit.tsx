import { useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ApiAdminBrand, ApiCategory, ApiDeviceModel, ApiProductType } from '../../../shared/types';
import type { ManualField } from '../../../shared/billz';
import { PC_SOCKETS, partAttrs, slotForType } from '../../../shared/pc-compat';
import {
  createProduct, deleteProduct, getProductDetail, listBrands, listCategories, listDeviceModels, listTypes, updateProduct, uploadImage,
} from '../api';
import type { AdminVariantInput } from '../api';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import ModelCombobox from '../ModelCombobox';
import PriceInput from '../PriceInput';
import ReviewsEditor from '../ReviewsEditor';
import { formatSum } from '../lib/format';
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
  const { t } = useTranslation(['products', 'common']);
  const sum = t('common:sum');
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
      .then(([c, b, m, ts]) => { setCats(c); setBrands(b); setModels(m); setTypes(ts); })
      .catch(() => setError(t('productEdit.refsLoadError')));
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
        ...f, name: m.name, brandId: m.brandId, categoryId,
        type: typeOf(categoryId, f.type), specs: mergeSpecs(f.specs, modelToSpecs(m)),
      };
    });
  }
  function setCategory(categoryId: string | null) {
    patch((f) => ({ ...f, categoryId, type: typeOf(categoryId, f.type) }));
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
    const problem = validateForm(form, t);
    if (problem) { setError(problem); toast(problem, 'error'); return; }
    setBusy(true); setError('');
    try {
      if (isNew) {
        await createProduct(formToPayload(form));
        setDirty(false);
        toast(t('productEdit.toastCreated'));
        navigate(backTo, { state: { leave: true } });
      } else {
        await updateProduct(id, formToPayload(form));
        setDirty(false);
        toast(t('shared.savedLive'));
      }
    } catch (err) {
      const msg = errText(err); setError(msg); toast(msg, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: t('productEdit.confirmDelete', { name: form.name }),
      message: t('productEdit.confirmDeleteMessage'),
      confirmLabel: t('shared.delete'), destructive: true,
    });
    if (!ok) return;
    try {
      await deleteProduct(id);
      setDirty(false);
      toast(t('productEdit.toastDeleted'));
      navigate(backTo, { state: { leave: true } });
    } catch (err) {
      toast(errText(err), 'error');
    }
  }

  const billz = form.billzId !== null;
  // PC bo'g'in turlarida — konfigurator kartasi; "Avtomatik" qiymatlar tuzatishsiz, faqat nomdan.
  const pcSlot = form.categoryId === 'pc' ? slotForType(form.type) : null;
  const autoAttrs = pcSlot ? partAttrs(pcSlot, form.name) : { socket: null, memory: null, watts: null };
  // Billz tovarida narx/xususiyat/tavsifni qo'lda olish mumkin: yoqilgan maydonga
  // sinxronizatsiya tegmaydi (`products.manual_fields`), qolgani avvalgidek Billz'niki.
  const manual = (f: ManualField) => form.manualFields.includes(f);
  const manualRow = (f: ManualField, hint: string) => (
    <div className="mb-4 border-b border-line">
      <SwitchRow
        label={t('productEdit.manualEditLabel')}
        hint={hint}
        on={manual(f)}
        onChange={(on) => set('manualFields', on ? [...form.manualFields, f] : form.manualFields.filter((x) => x !== f))}
      />
    </div>
  );
  // Kategoriya va tur — Billz tovarida ham (qulf yoqilganda) shu ikki maydon ishlatiladi.
  const catFields = (
    <>
      <Field label={t('shared.category')}>
        <Select value={form.categoryId ?? ''} onChange={(v) => setCategory(v || null)}>
          <option value="">{t('shared.selectPlaceholder')}</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <Field label={t('productEdit.info.typeLabel')} hint={t('productEdit.info.typeHint')}>
        <Select value={form.type ?? ''} disabled={form.categoryId === null} onChange={(v) => set('type', v || null)}>
          <option value="">{form.categoryId === null ? t('productEdit.info.typeNeedsCategory') : t('shared.selectPlaceholder')}</option>
          {types.filter((type) => type.categoryId === form.categoryId).map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
        </Select>
      </Field>
    </>
  );
  const title = isNew ? t('shared.newProduct') : form.name || t('shared.product');
  const canSave = dirty && !busy && loadState === 'ready';
  const storage = form.options.find((o) => o.name === 'Xotira')?.values ?? [];
  const colors = form.options.find((o) => o.name === 'Rang')?.values ?? [];
  const brandName = brands.find((b) => b.id === form.brandId)?.name ?? '—';
  const catName = cats.find((c) => c.id === form.categoryId)?.name ?? '—';
  const typeLabel = types.find((t) => t.categoryId === form.categoryId && t.id === form.type)?.label ?? '—';

  if (loadState !== 'ready') {
    return (
      <Page title={t('shared.product')} back={backTo}>
        {loadState === 'loading' ? (
          <Skeleton rows={6} />
        ) : (
          <EmptyState
            title={t('productEdit.loadFailedTitle')}
            text={t('productEdit.loadFailedText')}
            action={<Button variant="secondary" onClick={() => setRetry((r: number) => r + 1)}>{t('common:retry')}</Button>}
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
          {!isNew && form.isActive && <Button variant="quiet" href={`/product/${id}`} external>{t('productEdit.viewOnSite')}</Button>}
          <Button onClick={save} disabled={!canSave}>{busy ? t('shared.saving') : t('shared.save')}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <p className="text-para text-danger">{error}</p>}

        <Card title={t('productEdit.images.title')} description={billz ? t('productEdit.images.billzHint') : undefined}>
          <ImageUploader label={t('productEdit.images.main')} images={form.imageUrl ? [form.imageUrl] : []} onChange={(next) => set('imageUrl', next[0] ?? '')} />
          <div className="mt-4">
            <ImageUploader label={t('productEdit.images.gallery')} images={form.images} onChange={(next) => set('images', next)} multiple reorderable />
          </div>
        </Card>

        <Card title={t('productEdit.status.title')}>
          <div className="divide-y divide-line">
            <SwitchRow
              label={t('productEdit.status.activeLabel')}
              hint={billz ? t('productEdit.status.activeBillzHint') : undefined}
              on={form.isActive}
              onChange={(v) => set('isActive', v)}
            />
            <SwitchRow
              label={t('productEdit.status.preorderLabel')}
              hint={t('productEdit.status.preorderHint')}
              on={form.preorder}
              onChange={(v) => set('preorder', v)}
            />
            <div className="flex flex-wrap items-center justify-between gap-4 py-3">
              <div>
                <p className="text-para text-primary">{t('productEdit.status.conditionLabel')}</p>
                <p className="text-label text-muted-2">{t('productEdit.status.conditionUsedHint')}</p>
              </div>
              {/* i18n: ma'lumot — tarjima qilinmaydi ('yangi'/'ishlatilgan' server bilan solishtiriladigan qiymat) */}
              <Segmented
                label={t('productEdit.status.conditionLabel')}
                value={form.condition}
                onChange={(v) => patch((f) => (v === 'ishlatilgan' ? { ...f, condition: 'ishlatilgan', options: [], variants: [] } : { ...f, condition: 'yangi' }))}
                options={[{ id: 'yangi', label: t('shared.conditionNew') }, { id: 'ishlatilgan', label: t('shared.conditionUsed') }]}
              />
            </div>
            <div className="py-3">
              <Field label={t('productEdit.status.sortLabel')} hint={t('productEdit.status.sortHint')} className="max-w-40">
                <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
              </Field>
            </div>
          </div>
        </Card>

        <Card
          title={t('productEdit.info.title')}
          description={billz ? t('productEdit.info.billzHint') : undefined}
        >
          {billz ? (
            <>
              {manualRow('category', t('productEdit.info.manualCategoryHint'))}
              {manualRow('description', t('productEdit.info.manualDescriptionHint'))}
              <Rows rows={[
                { k: t('shared.name'), v: form.name }, { k: t('shared.brand'), v: brandName },
                ...(manual('category') ? [] : [{ k: t('shared.category'), v: catName }, { k: t('productEdit.info.typeLabel'), v: typeLabel }]),
                ...(manual('description') ? [] : [{ k: t('productEdit.info.descriptionLabel'), v: form.description || '—' }]),
              ]} />
              {manual('category') && <div className="mt-4 grid gap-4 md:grid-cols-2">{catFields}</div>}
              {manual('description') && (
                <Field label={t('productEdit.info.descriptionLabel')} className="mt-4">
                  <Textarea value={form.description} onChange={(v) => set('description', v)} rows={5} />
                </Field>
              )}
            </>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t('productEdit.info.nameSearchLabel')} required hint={t('productEdit.info.nameSearchHint')} className="md:col-span-2">
                <ModelCombobox models={models} value={form.name} onChange={(v) => set('name', v)} onPick={pickModel} className={INPUT_CLS} />
              </Field>
              <Field label={t('shared.brand')}>
                <Select value={form.brandId ?? ''} onChange={(v) => set('brandId', v || null)}>
                  <option value="">{t('shared.selectPlaceholder')}</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
              {catFields}
              <Field label={t('productEdit.info.descriptionLabel')} className="md:col-span-2">
                <Textarea value={form.description} onChange={(v) => set('description', v)} rows={5} />
              </Field>
            </div>
          )}
        </Card>

        <Card
          title={t('shared.price')}
          description={billz
            ? (manual('price')
              ? t('productEdit.price.manualDesc')
              : t('productEdit.price.syncDesc'))
            : undefined}
        >
          {billz ? (
            <>
              {manualRow('price', t('productEdit.price.manualHint'))}
              {manual('price') ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label={t('productEdit.price.cashFieldLabel')} required>
                      <PriceInput className={INPUT_CLS} value={form.cashPriceUzs} onChange={(v) => set('cashPriceUzs', v)} />
                    </Field>
                    <Field label={t('productEdit.price.oldFieldLabel')} hint={t('productEdit.price.oldFieldHint')}>
                      <PriceInput className={INPUT_CLS} value={form.oldPriceUzs} onChange={(v) => set('oldPriceUzs', v)} />
                    </Field>
                  </div>
                  <p className="mt-3 text-label text-muted-2">{t('productEdit.price.billzStockNote', { count: form.billzStock ?? 0 })}</p>
                </>
              ) : (
                <Rows rows={[
                  { k: t('productEdit.price.cashRowLabel'), v: formatSum(form.cashPriceUzs, sum) },
                  { k: t('productEdit.price.oldRowLabel'), v: form.oldPriceUzs > 0 ? formatSum(form.oldPriceUzs, sum) : '—' },
                  { k: t('shared.stock'), v: String(form.billzStock ?? 0) },
                ]} />
              )}
            </>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t('productEdit.price.cashFieldLabel')} required={form.variants.length === 0} hint={form.variants.length > 0 ? t('productEdit.price.cashHintVariants') : undefined}>
                <PriceInput className={INPUT_CLS} value={form.cashPriceUzs} onChange={(v) => set('cashPriceUzs', v)} />
              </Field>
              <Field label={t('productEdit.price.oldFieldLabel')} hint={t('productEdit.price.oldFieldHint')}>
                <PriceInput className={INPUT_CLS} value={form.oldPriceUzs} onChange={(v) => set('oldPriceUzs', v)} />
              </Field>
            </div>
          )}
        </Card>

        {/* i18n: ma'lumot — tarjima qilinmaydi (o'q nomi "Xotira"/"Rang" va chip qiymatlari — AXES/STORAGE_VALUES/COLOR_VALUES, product-form.ts) */}
        {!billz && form.condition === 'yangi' && (
          <Card title={t('productEdit.variants.title')} description={t('productEdit.variants.desc')}>
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
                  placeholder={t('productEdit.variants.addColorPlaceholder')}
                  className={INPUT_CLS}
                />
              </div>
            </div>
            {form.variants.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                <p className="text-label font-medium text-muted">{t('productEdit.variants.perVariantTitle')}</p>
                {form.variants.map((v, i) => (
                  <div key={`${variantLabel(v)}-${i}`} className="flex flex-wrap items-center gap-3 rounded-xs border border-line p-2.5">
                    <span className="min-w-28 text-para font-medium text-primary">{variantLabel(v)}</span>
                    <div className="w-40">
                      <PriceInput placeholder={t('shared.price')} className={INPUT_CLS} value={v.cashPriceUzs} onChange={(n) => updateVariant(i, { cashPriceUzs: n })} />
                    </div>
                    {v.imageUrl && <img src={v.imageUrl} alt="" className="size-10 rounded-xs border border-line bg-white object-contain" />}
                    <label className={`press cursor-pointer text-label ${busyRow === i ? 'text-muted' : 'text-link'}`}>
                      {busyRow === i ? t('common:loading') : v.imageUrl ? t('productEdit.variants.replaceImage') : t('productEdit.variants.addImage')}
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

        <Card
          title={t('shared.specs')}
          description={billz
            ? (manual('specs') ? t('productEdit.specs.manualDesc') : t('productEdit.specs.syncDesc'))
            : t('productEdit.specs.plainDesc')}
        >
          {billz && manualRow('specs', t('productEdit.specs.manualHint'))}
          {billz && !manual('specs') ? (
            form.specs.length > 0
              ? <Rows rows={form.specs.map((s) => ({ k: s.label, v: s.value }))} />
              : <p className="text-para text-muted">{t('productEdit.specs.empty')}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {form.specs.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder={t('productEdit.specs.namePlaceholder')} value={s.label} onChange={(v) => set('specs', form.specs.map((x, j) => (j === i ? { ...x, label: v } : x)))} />
                  <Input placeholder={t('productEdit.specs.valuePlaceholder')} value={s.value} onChange={(v) => set('specs', form.specs.map((x, j) => (j === i ? { ...x, value: v } : x)))} />
                  <button
                    type="button"
                    aria-label={t('productEdit.specs.removeLabel')}
                    onClick={() => set('specs', form.specs.filter((_, j) => j !== i))}
                    className="press shrink-0 rounded-xs px-2 text-muted-2 hover:text-danger"
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                </div>
              ))}
              <div>
                <Button variant="quiet" onClick={() => set('specs', [...form.specs, { label: '', value: '' }])}>{t('productEdit.specs.addButton')}</Button>
              </div>
            </div>
          )}
        </Card>

        {pcSlot && (
          <Card title={t('productEdit.pc.title')} description={t('productEdit.pc.desc')}>
            <div className="divide-y divide-line">
              <SwitchRow
                label={t('productEdit.pc.hiddenLabel')}
                hint={t('productEdit.pc.hiddenHint')}
                on={form.pcHidden}
                onChange={(v) => set('pcHidden', v)}
              />
              <div className="grid gap-4 py-3 sm:grid-cols-3">
                {(pcSlot === 'cpu' || pcSlot === 'mb') && (
                  <Field label={t('productEdit.pc.socketLabel')}>
                    <Select value={form.pcSocket ?? ''} onChange={(v) => set('pcSocket', v || null)}>
                      <option value="">{t('productEdit.pc.autoOption', { value: autoAttrs.socket ?? t('productEdit.pc.autoUnknown') })}</option>
                      {PC_SOCKETS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </Field>
                )}
                {(pcSlot === 'mb' || pcSlot === 'ram') && (
                  <Field label={t('productEdit.pc.memoryLabel')}>
                    <Select value={form.pcMemory ?? ''} onChange={(v) => set('pcMemory', v || null)}>
                      <option value="">{t('productEdit.pc.autoOption', { value: autoAttrs.memory ?? t('productEdit.pc.autoUnknown') })}</option>
                      <option value="DDR4">DDR4</option>
                      <option value="DDR5">DDR5</option>
                    </Select>
                  </Field>
                )}
                {(pcSlot === 'cpu' || pcSlot === 'gpu' || pcSlot === 'psu') && (
                  <Field label={pcSlot === 'psu' ? t('productEdit.pc.wattsLabelPsu') : t('productEdit.pc.wattsLabelOther')}>
                    <Input
                      value={form.pcWatts ? String(form.pcWatts) : ''}
                      onChange={(v) => { const n = Number(v.replace(/\D/g, '')); set('pcWatts', n > 0 ? Math.min(3000, n) : null); }}
                      placeholder={autoAttrs.watts ? t('productEdit.pc.wattsPlaceholderAuto', { value: autoAttrs.watts }) : t('productEdit.pc.wattsPlaceholderUnknown')}
                    />
                  </Field>
                )}
              </div>
            </div>
          </Card>
        )}

        <Card title={t('productEdit.reviews.title')} description={t('productEdit.reviews.desc')}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t('productEdit.reviews.ratingLabel')}>
              <Input type="number" value={form.ratingAvg ? String(form.ratingAvg) : ''} onChange={(v) => set('ratingAvg', Math.min(5, Math.max(0, Number(v) || 0)))} />
            </Field>
            <Field label={t('productEdit.reviews.countLabel')}>
              <Input type="number" value={form.reviewCount ? String(form.reviewCount) : ''} onChange={(v) => set('reviewCount', Math.max(0, Math.floor(Number(v) || 0)))} />
            </Field>
          </div>
          {/* Sharhlar faqat saqlangan mahsulotda (product_id kerak). Reyting/soni sharhlardan qayta hisoblanadi. */}
          {!isNew && (
            <ReviewsEditor productId={id} onChanged={(avg, count) => setForm((f: ProductFormState) => ({ ...f, ratingAvg: avg, reviewCount: count }))} />
          )}
        </Card>

        {!isNew && !billz && (
          <Card title={t('shared.dangerZone')} description={t('productEdit.danger.desc')}>
            <Button variant="destructive" onClick={remove}>{t('productEdit.danger.button')}</Button>
          </Card>
        )}
      </div>
    </Page>
  );
};

export default ProductEdit;
