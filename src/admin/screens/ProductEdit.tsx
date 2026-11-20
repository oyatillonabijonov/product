import { useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  ArrowSquareOut, ArrowsClockwise, Check, Cpu, CurrencyCircleDollar, FloppyDisk, Image as ImageIcon, ImageBroken, ListChecks, PencilSimple, Plus, Stack,
  Star, TextAa, Trash, UploadSimple, Warning, WarningCircle, X,
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { ApiAdminBrand, ApiCategory, ApiDeviceModel, ApiProductType } from '../../../shared/types';
import { withHiddenLock, type ManualField } from '../../../shared/billz';
import { partWatts, slotForType } from '../../../shared/pc-compat';
import {
  createProduct, deleteProduct, getProductDetail, listBrands, listCategories, listDeviceModels, listTypes, updateProduct, uploadImage,
} from '../api';
import type { AdminVariantInput } from '../api';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import ModelCombobox from '../ModelCombobox';
import PcPartValues from '../PcPartValues';
import PriceInput from '../PriceInput';
import ReviewsEditor from '../ReviewsEditor';
import { normalizeImage, type NormalizeOptions } from '../lib/image-normalize';

/** Mahsulot rasmi chekkasi kesilmaydi: egasi 1440×1440 kvadrat tayyorlaydi, saytda u ramkani to'liq to'ldiradi (`object-cover`). */
const PRODUCT_UPLOAD: NormalizeOptions = { maxSize: 1440, maxTrimRatio: 0 };
import { formatThousands } from '../lib/format';
import { mergeSpecs, modelToSpecs } from '../lib/models';
import {
  COLOR_VALUES, EMPTY_FORM, STORAGE_VALUES, addAxisValue, detailToForm, formLocks, formOnOrder, formToPayload, revertField, toggleAxisValue, validateForm, variantLabel,
  type ProductFormState,
} from '../lib/product-form';
import { Badge, Button, Card, Dot, EmptyState, Field, IconButton, IconTile, INPUT_CLS, Input, Page, Segmented, Select, SwitchRow, Textarea } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/products';
type LoadState = 'loading' | 'ready' | 'error';

const stagger = (i: number) => ({ ['--i' as string]: i } as Record<string, number>);

/** Variant chipi (Xotira/Rang qiymati) — tanlangani qora to'ldirilgan va belgi bilan (konfigurator chiplari kabi). */
const Chip: FC<{ on: boolean; onClick: () => void; children: ReactNode }> = ({ on, onClick, children }) => (
  <button
    type="button"
    aria-pressed={on}
    onClick={onClick}
    className={`inline-flex h-11 items-center gap-1.5 rounded-full px-3.5 text-base font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.97] md:h-9 ${
      on ? 'bg-primary text-text-on-primary hover:bg-primary-hover' : 'bg-surface-sunken text-text-muted hover:bg-surface-sunken-hover hover:text-text'
    }`}
  >
    {on && <Check weight="bold" className="size-3.5" />}
    {children}
  </button>
);

/**
 * Billz tovari maydonining manbasi: «Billz» — sinxronizatsiya yangilaydi; «Qo'lda» — siz o'zgartirgansiz,
 * Billz tegmaydi. «Billz'ga qaytarish» qulfni yechadi — keyingi sinxronizatsiyada Billz qiymati keladi.
 */
const SourceTag: FC<{ manual: boolean; onUnlock: () => void }> = ({ manual, onUnlock }) => {
  const { t } = useTranslation('products');
  return manual ? (
    <span className="flex items-center gap-1.5 text-sm">
      <Badge tone="attention" dot>{t('productEdit.source.manual')}</Badge>
      <button
        type="button"
        onClick={onUnlock}
        title={t('productEdit.source.revertTitle')}
        // Tegish maydoni 44px (16 + 20 + 8), manfiy margin bilan joylashuv 20px qatorda qoladi. Tepaga ko'proq:
        // maydon yorlig'i ostidagi input 6px pastda boshlanadi, tepada esa 16px bo'shliq (grid `gap-4`, karta paddingi).
        className="-mb-2 -mt-4 pb-2 pt-4 font-medium text-accent-text underline-offset-2 transition-colors hover:underline"
      >
        {t('productEdit.source.revert')}
      </button>
    </span>
  ) : (
    <Badge>
      <ArrowsClockwise weight="bold" className="size-3" />
      {t('productEdit.source.billz')}
    </Badge>
  );
};

/**
 * Maydon + o'ng tepada manba belgisi. Belgi `<label>` dan **tashqarida**: `Field` o'zi `<label>`, uning ichidagi
 * tugma HTML qoidasiga ko'ra yorliq bosilganda ham bosilardi — ya'ni maydon nomiga bosish qulfni jimgina yechardi.
 */
const Tagged: FC<{ tag: ReactNode; className?: string; children: ReactNode }> = ({ tag, className = '', children }) => (
  <div className={`relative ${className}`}>
    {tag && <div className="absolute right-0 top-0">{tag}</div>}
    {children}
  </div>
);

/** Karta ichidagi sozlama qatori: chapda nom va izoh, o'ngda boshqaruv (segment). */
const SettingRow: FC<{ label: string; hint: string; children: ReactNode }> = ({ label, hint, children }) => (
  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
    <div className="min-w-0">
      <p className="text-base text-text">{label}</p>
      <p className="text-sm text-text-muted">{hint}</p>
    </div>
    {children}
  </div>
);

/**
 * Mahsulot tahriri (v2) — ikki ustun: chapda bo'lim kartalari (Rasmlar → Ma'lumot → Narx → Variantlar →
 * Xususiyatlar → [Konfigurator] → Reyting va sharhlar → Xavfli zona), o'ngda yopishqoq xulosa paneli — rasm,
 * nom, joriy narx, saytdagi holat toggle'lari, manba (Billz/qo'lda) va qoldiq. Telefonda panel tepada turadi.
 * `id` = 'new' yoki mahsulot id'si. Billz tovari ham oddiy tovardek tahrirlanadi: o'zgartirilgan guruh «Qo'lda»
 * bo'ladi va sinxronizatsiya unga tegmaydi (`products.manual_fields`, spec 2026-09-24 §3); «Billz'ga qaytarish»
 * qulfni yechadi. O'chirish yo'q (sinxronizatsiya qaytaradi), faqat yashirish.
 * Rasmlar bitta to'rda: birinchisi — asosiy (`imageUrl`), qolgani — galereya (`images`); tartib sudrab o'zgaradi.
 */
const ProductEdit: FC<{ id: string }> = ({ id }) => {
  const { t } = useTranslation(['products', 'common']);
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
  // Yuklangan holat — Billz tovarida «nima o'zgardi»ni shu bilan solishtiramiz (qulflar, spec 2026-09-24 §3).
  const [rawLoaded, setLoaded] = useState(null as ProductFormState | null);
  const loaded = rawLoaded as ProductFormState | null;
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
      .then((d) => { if (stale) return; const f = detailToForm(d); setForm(f); setLoaded(f); setLoad('ready'); })
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
      const { imageUrl } = await uploadImage(await normalizeImage(file, PRODUCT_UPLOAD));
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
        await updateProduct(id, { ...formToPayload(form), manualFields: formLocks(form, loaded) });
        // Billz tovarida ko'rinish va qulflar serverda hisoblanadi — formani haqiqat bilan yangilaymiz,
        // aks holda toggle «ko'rsatilgan» deb tursa-yu, rasmsiz tovar saytda yashirin bo'lardi.
        const fresh = detailToForm(await getProductDetail(id));
        setForm(fresh);
        setLoaded(fresh);
        setDirty(false);
        // Billz tovari rasmsiz yoki yashirilgan bo'lsa saytda chiqmaydi — «ko'rinadi» deyish yolg'on bo'lardi.
        toast(fresh.billzId !== null && !fresh.isActive
          ? t(fresh.imageUrl ? 'productEdit.toastSavedHidden' : 'productEdit.toastSavedHiddenNoImage')
          : t('shared.savedLive'));
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
  const onOrderNow = formOnOrder(form);
  // PC bo'g'in turlarida — konfigurator kartasi; "Avtomatik" qiymatlar tuzatishsiz, faqat nomdan.
  const pcSlot = form.categoryId === 'pc' ? slotForType(form.type) : null;
  const autoWatts = pcSlot ? partWatts(pcSlot, form.name, null) : null;
  // Billz tovarida har maydon manbasini ko'rsatamiz; qaysi qulf qo'yilishi saqlashdan oldin jonli hisoblanadi.
  const locks = formLocks(form, loaded);
  const unlock = (f: ManualField) => { if (loaded) patch((x) => revertField(x, loaded, f)); };
  const tag = (f: ManualField) => (billz ? <SourceTag manual={locks.includes(f)} onUnlock={() => unlock(f)} /> : null);
  // Billz tovarida switch egasining niyati (`hidden` qulfi), haqiqiy ko'rinish esa qoidadan (rasm bor va yashirilmagan):
  // `isActive`ga bog'lansa, allaqachon ko'rinmaydigan rasmsiz tovarni yashirib qulflab bo'lmasdi.
  const shown = billz ? !form.manualFields.includes('hidden') : form.isActive;
  const title = isNew ? t('shared.newProduct') : form.name || t('shared.product');
  const canSave = dirty && !busy && loadState === 'ready';
  const storage = form.options.find((o) => o.name === 'Xotira')?.values ?? [];
  const colors = form.options.find((o) => o.name === 'Rang')?.values ?? [];
  // Bitta to'r: birinchisi asosiy rasm, qolgani galereya (`detailToForm` galereyadan asosiysini chiqarib tashlaydi).
  const allImages = form.imageUrl ? [form.imageUrl, ...form.images] : form.images;
  // Xulosa paneli narxi — saytdagidek: variantli tovarda eng arzon narxlangan variant.
  const pricedVariants = form.variants.filter((v) => v.cashPriceUzs > 0);
  const shownPrice = pricedVariants.length ? Math.min(...pricedVariants.map((v) => v.cashPriceUzs)) : form.cashPriceUzs;
  const meta = [brands.find((b) => b.id === form.brandId)?.name, types.find((x) => x.categoryId === form.categoryId && x.id === form.type)?.label]
    .filter(Boolean).join(' · ');

  if (loadState !== 'ready') {
    return (
      <Page title={t('shared.product')} back={backTo}>
        {loadState === 'loading' ? (
          <div aria-busy="true" aria-label={t('common:loading')} className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="skeleton h-[220px] rounded-surface xl:order-2 xl:h-[520px]" />
            <div className="flex flex-col gap-4">
              <div className="skeleton h-[260px] rounded-surface" />
              <div className="skeleton h-[380px] rounded-surface" />
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<WarningCircle />}
            title={t('productEdit.loadFailedTitle')}
            text={t('productEdit.loadFailedText')}
            action={<Button variant="secondary" onClick={() => setRetry((r: number) => r + 1)}>{t('common:retry')}</Button>}
          />
        )}
      </Page>
    );
  }

  /**
   * O'ng panel — kulrang karta (oq varaqda), hoshiya va soyasiz: tepada rasm oq orolchada, nom va narx; ostida
   * saytdagi holat toggle'lari (qatorlar orasida hairline); oxirida manba, qoldiq va saytda ko'rish.
   */
  const summary = (
    <section className="flex flex-col gap-6 rounded-surface bg-surface-sunken p-5 xl:p-6">
      <div className="flex gap-4 xl:flex-col xl:gap-5">
        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-control-lg bg-surface xl:aspect-[4/3] xl:size-auto xl:w-full">
          {form.imageUrl ? (
            <img src={form.imageUrl} alt="" className="size-full animate-fade-in object-contain p-2" />
          ) : (
            <span className="flex flex-col items-center gap-1.5 text-text-faint">
              <ImageBroken className="size-6 xl:size-8" />
              <span className="hidden text-sm xl:block">{t('productEdit.side.noImage')}</span>
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {!isNew && <Dot tone={form.isActive ? 'ok' : 'neutral'}>{form.isActive ? t('productEdit.side.onSite') : t('productEdit.side.hidden')}</Dot>}
          <p className="mt-1.5 line-clamp-2 text-md font-bold text-text">{form.name || t('shared.newProduct')}</p>
          {meta && <p className="mt-0.5 truncate text-sm text-text-muted">{meta}</p>}
          <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            {shownPrice > 0 ? (
              <>
                <span className="text-2xl font-bold tabular-nums text-text">{formatThousands(shownPrice)}</span>
                <span className="text-sm font-semibold text-text-muted">{t('common:sum')}</span>
                {!pricedVariants.length && form.oldPriceUzs > shownPrice && (
                  <span className="text-sm tabular-nums text-text-faint line-through">{formatThousands(form.oldPriceUzs)}</span>
                )}
              </>
            ) : (
              <span className="text-sm text-text-faint">{t('productEdit.side.noPrice')}</span>
            )}
          </div>
          {pricedVariants.length > 0 && <p className="text-sm text-text-muted">{t('productEdit.side.priceFrom')}</p>}
          {(onOrderNow || (!billz && form.preorder) || form.condition === 'ishlatilgan') && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {onOrderNow && <Badge tone="attention" dot>{t('productEdit.status.onOrderLabel')}</Badge>}
              {!billz && form.preorder && <Badge tone="info" dot>{t('productEdit.status.preorderLabel')}</Badge>}
              {/* i18n: ma'lumot — tarjima qilinmaydi ('ishlatilgan' server bilan solishtiriladigan qiymat) */}
              {form.condition === 'ishlatilgan' && <Badge tone="accent">{t('shared.conditionUsed')}</Badge>}
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-text">{t('productEdit.status.title')}</p>
          {tag('hidden')}
        </div>
        <div className="divide-y divide-border">
          <div>
            <SwitchRow
              label={t('productEdit.status.activeLabel')}
              hint={billz ? t('productEdit.status.activeBillzHint') : undefined}
              on={shown}
              onChange={(v) => (billz ? patch((f) => ({ ...f, manualFields: withHiddenLock(f.manualFields, v) })) : set('isActive', v))}
            />
            {billz && shown && !form.isActive && (
              <p className="-mt-1 flex items-start gap-1.5 pb-3 text-sm text-warning-text">
                <WarningCircle weight="fill" className="mt-[calc(0.5lh-8px)] size-4 shrink-0" />
                {form.imageUrl ? t('productEdit.status.notShownNow') : t('productEdit.status.notShownNoImage')}
              </p>
            )}
          </div>
          {/* Billz tovarida «Pre-order» o'qilmaydi — holatni qoldiq hal qiladi (`showsPreorder`). */}
          {!billz && (
            <SwitchRow
              label={t('productEdit.status.preorderLabel')}
              hint={t('productEdit.status.preorderHint')}
              on={form.preorder}
              onChange={(v) => set('preorder', v)}
            />
          )}
          {billz ? onOrderNow && (
            <p className="py-3 text-sm text-text-muted">{t('productEdit.status.onOrderBillz')}</p>
          ) : (
            <SwitchRow
              label={t('productEdit.status.onOrderLabel')}
              hint={t('productEdit.status.onOrderHint')}
              on={form.onOrder}
              onChange={(v) => set('onOrder', v)}
            />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <IconTile icon={billz ? ArrowsClockwise : PencilSimple} hue={billz ? 'blue' : 'slate'} soft />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-text-muted">{t('productEdit.side.source')}</p>
            <p className="text-sm font-semibold text-text">{billz ? t('productEdit.side.sourceBillz') : t('productEdit.side.sourceManual')}</p>
          </div>
        </div>
        {billz && (
          <div className="flex items-center justify-between gap-3 rounded-control bg-surface px-3 py-2.5">
            <span className="text-sm text-text-muted">{t('productEdit.side.stock')}</span>
            <Badge tone={(form.billzStock ?? 0) <= 0 ? 'danger' : (form.billzStock ?? 0) < 3 ? 'attention' : 'ok'} className="tabular-nums">{form.billzStock ?? 0}</Badge>
          </div>
        )}
        {!isNew && form.isActive && (
          <Button variant="outline" href={`/product/${id}`} external className="w-full"><ArrowSquareOut />{t('productEdit.viewOnSite')}</Button>
        )}
      </div>
    </section>
  );

  return (
    <Page
      title={title}
      back={backTo}
      dirty={dirty}
      actions={<Button onClick={save} disabled={!canSave}><FloppyDisk weight="fill" />{busy ? t('shared.saving') : t('shared.save')}</Button>}
    >
      {error && (
        <div role="alert" className="mb-6 flex items-start gap-2.5 rounded-surface bg-danger-soft px-5 py-4 text-base text-danger-strong">
          <WarningCircle weight="fill" className="mt-[calc(0.5lh-9px)] size-[18px] shrink-0 text-danger" />
          <span className="min-w-0">{error}</span>
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Past ekranda panel ko'rinishdan uzun bo'lib qolmasin — o'zi ichida aylanadi. */}
        <aside className="stagger thin-scroll xl:sticky xl:top-24 xl:order-2 xl:max-h-[calc(100dvh-7rem)] xl:overflow-y-auto xl:rounded-surface" style={stagger(0)}>{summary}</aside>

        <div className="flex min-w-0 flex-col gap-4 xl:order-1">
          <div className="stagger" style={stagger(1)}>
            <Card
              icon={ImageIcon} hue="violet"
              title={t('productEdit.images.title')}
              actions={tag('images')}
              description={billz ? `${t('productEdit.images.orderHint')} ${t('productEdit.images.billzHint')}` : t('productEdit.images.orderHint')}
            >
              <ImageUploader
                label=""
                images={allImages}
                onChange={(next) => patch((f) => ({ ...f, imageUrl: next[0] ?? '', images: next.slice(1) }))}
                multiple
                reorderable
                normalize={PRODUCT_UPLOAD}
                firstLabel={form.imageUrl ? t('productEdit.images.mainBadge') : undefined}
              />
            </Card>
          </div>

          <div className="stagger" style={stagger(2)}>
            <Card icon={TextAa} hue="blue" title={t('productEdit.info.title')} description={billz ? t('productEdit.info.billzHint') : undefined}>
              <div className="grid gap-4 md:grid-cols-2">
                <Tagged tag={tag('name')} className="md:col-span-2">
                  {billz ? (
                    // Billz tovarida model qidiruvi yo'q: model tanlash nom, brend, kategoriya va xususiyatlarni birdaniga
                    // to'ldiradi — to'rttasini bir bosishda jimgina qulflab qo'yardi.
                    <Field label={t('shared.name')} required>
                      <Input value={form.name} onChange={(v) => set('name', v)} />
                    </Field>
                  ) : (
                    <Field label={t('productEdit.info.nameSearchLabel')} required hint={t('productEdit.info.nameSearchHint')}>
                      <ModelCombobox models={models} value={form.name} onChange={(v) => set('name', v)} onPick={pickModel} className={INPUT_CLS} />
                    </Field>
                  )}
                </Tagged>
                <Tagged tag={tag('brand')}>
                  <Field label={t('shared.brand')}>
                    <Select value={form.brandId ?? ''} onChange={(v) => set('brandId', v || null)}>
                      <option value="">{t('shared.selectPlaceholder')}</option>
                      {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </Select>
                  </Field>
                </Tagged>
                <Tagged tag={tag('category')}>
                  <Field label={t('shared.category')}>
                    <Select value={form.categoryId ?? ''} onChange={(v) => setCategory(v || null)}>
                      <option value="">{t('shared.selectPlaceholder')}</option>
                      {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                  </Field>
                </Tagged>
                <Field label={t('productEdit.info.typeLabel')} hint={t('productEdit.info.typeHint')}>
                  <Select value={form.type ?? ''} disabled={form.categoryId === null} onChange={(v) => set('type', v || null)}>
                    <option value="">{form.categoryId === null ? t('productEdit.info.typeNeedsCategory') : t('shared.selectPlaceholder')}</option>
                    {types.filter((type) => type.categoryId === form.categoryId).map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
                  </Select>
                </Field>
                <Field label={t('productEdit.status.sortLabel')} hint={t('productEdit.status.sortHint')}>
                  <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
                </Field>
                <Tagged tag={tag('description')} className="md:col-span-2">
                  <Field label={t('productEdit.info.descriptionLabel')}>
                    <Textarea value={form.description} onChange={(v) => set('description', v)} rows={5} />
                  </Field>
                </Tagged>
                <Field label={t('productEdit.info.descriptionRuLabel')} hint={t('productEdit.info.descriptionRuHint')} className="md:col-span-2">
                  <Textarea value={form.descriptionRu} onChange={(v) => set('descriptionRu', v)} rows={5} />
                </Field>
              </div>
              <div className="-mb-3 divide-y divide-border">
                <SettingRow label={t('productEdit.status.conditionLabel')} hint={t('productEdit.status.conditionUsedHint')}>
                  {/* i18n: ma'lumot — tarjima qilinmaydi ('yangi'/'ishlatilgan' server bilan solishtiriladigan qiymat) */}
                  <Segmented
                    label={t('productEdit.status.conditionLabel')}
                    value={form.condition}
                    onChange={(v) => patch((f) => (v === 'ishlatilgan' ? { ...f, condition: 'ishlatilgan', options: [], variants: [] } : { ...f, condition: 'yangi' }))}
                    options={[{ id: 'yangi', label: t('shared.conditionNew') }, { id: 'ishlatilgan', label: t('shared.conditionUsed') }]}
                    size="sm"
                  />
                </SettingRow>
                <SettingRow label={t('productEdit.status.authLabel')} hint={t('productEdit.status.authHint')}>
                  <Segmented
                    label={t('productEdit.status.authLabel')}
                    value={form.authenticity}
                    onChange={(v) => set('authenticity', v as ProductFormState['authenticity'])}
                    options={[
                      { id: 'original', label: t('productEdit.status.authOriginal') },
                      { id: 'replica', label: t('productEdit.status.authReplica') },
                      { id: 'none', label: t('productEdit.status.authNone') },
                    ]}
                    size="sm"
                  />
                </SettingRow>
              </div>
            </Card>
          </div>

          <div className="stagger" style={stagger(3)}>
            <Card
              icon={CurrencyCircleDollar} hue="green"
              title={t('shared.price')}
              actions={tag('price')}
              description={billz ? t('productEdit.price.billzDesc') : undefined}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t('productEdit.price.cashFieldLabel')} required={form.variants.length === 0} hint={form.variants.length > 0 ? t('productEdit.price.cashHintVariants') : undefined}>
                  <PriceInput className={INPUT_CLS} value={form.cashPriceUzs} onChange={(v) => set('cashPriceUzs', v)} />
                </Field>
                <Field label={t('productEdit.price.oldFieldLabel')} hint={t('productEdit.price.oldFieldHint')}>
                  <PriceInput className={INPUT_CLS} value={form.oldPriceUzs} onChange={(v) => set('oldPriceUzs', v)} />
                </Field>
                {onOrderNow && form.variants.length === 0 && (
                  <Field label={t('productEdit.price.approxLabel')} hint={t('productEdit.price.approxHint')}>
                    <PriceInput className={INPUT_CLS} value={form.approxPriceUzs} onChange={(v) => set('approxPriceUzs', v)} />
                  </Field>
                )}
              </div>
            </Card>
          </div>

          {/* i18n: ma'lumot — tarjima qilinmaydi (o'q nomi "Xotira"/"Rang" va chip qiymatlari — AXES/STORAGE_VALUES/COLOR_VALUES, product-form.ts) */}
          {!billz && form.condition === 'yangi' && (
            <div className="stagger" style={stagger(4)}>
              <Card icon={Stack} hue="orange" title={t('productEdit.variants.title')} description={t('productEdit.variants.desc')}>
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="mb-2 text-sm font-semibold text-text">Xotira</p>
                    <div className="flex flex-wrap gap-2">
                      {STORAGE_VALUES.map((v) => (
                        <Chip key={v} on={storage.includes(v)} onClick={() => patch((f) => toggleAxisValue(f, 'Xotira', v))}>{v}</Chip>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-semibold text-text">Rang</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {[...COLOR_VALUES, ...colors.filter((c) => !COLOR_VALUES.includes(c))].map((c) => (
                        <Chip key={c} on={colors.includes(c)} onClick={() => patch((f) => toggleAxisValue(f, 'Rang', c))}>{c}</Chip>
                      ))}
                      <div className="w-40">
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
                  </div>
                  {form.variants.length > 0 && (
                    <div className="flex flex-col gap-2 pt-2">
                      <p className="text-sm font-semibold text-text">{t('productEdit.variants.perVariantTitle')}</p>
                      {form.variants.map((v, i) => (
                        <div key={`${variantLabel(v)}-${i}`} className="flex flex-wrap items-center gap-3 rounded-control-lg bg-surface p-2.5 sm:flex-nowrap">
                          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-item bg-surface-sunken">
                            {v.imageUrl ? <img src={v.imageUrl} alt="" className="size-full object-contain p-0.5" /> : <ImageIcon className="size-4 text-text-faint" />}
                          </span>
                          <span className="min-w-0 flex-1 text-base font-medium text-text">{variantLabel(v)}</span>
                          <div className="w-full sm:w-44">
                            <PriceInput placeholder={t('shared.price')} className={INPUT_CLS} value={v.cashPriceUzs} onChange={(n) => updateVariant(i, { cashPriceUzs: n })} />
                          </div>
                          <label
                            className={`inline-flex h-control-sm shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors ${
                              busyRow === i ? 'pointer-events-none bg-neutral text-text-muted' : 'bg-neutral text-text hover:bg-neutral-hover'
                            }`}
                          >
                            {busyRow === i
                              ? <span className="size-3.5 animate-spin rounded-full border-2 border-border-strong border-t-text" />
                              : <UploadSimple className="size-4" />}
                            {busyRow === i ? t('common:loading') : v.imageUrl ? t('productEdit.variants.replaceImage') : t('productEdit.variants.uploadImage')}
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
                </div>
              </Card>
            </div>
          )}

          <div className="stagger" style={stagger(5)}>
            <Card
              icon={ListChecks} hue="teal"
              title={t('shared.specs')}
              actions={tag('specs')}
              description={billz ? t('productEdit.specs.billzDesc') : t('productEdit.specs.plainDesc')}
            >
              <div className="flex flex-col gap-2">
                {form.specs.length === 0 && (
                  <p className="rounded-control bg-surface-sunken px-4 py-3 text-sm text-text-muted">{t('productEdit.specs.empty')}</p>
                )}
                {form.specs.map((s, i) => (
                  <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2">
                    <Input placeholder={t('productEdit.specs.namePlaceholder')} value={s.label} onChange={(v) => set('specs', form.specs.map((x, j) => (j === i ? { ...x, label: v } : x)))} />
                    <Input placeholder={t('productEdit.specs.valuePlaceholder')} value={s.value} onChange={(v) => set('specs', form.specs.map((x, j) => (j === i ? { ...x, value: v } : x)))} />
                    <IconButton label={t('productEdit.specs.removeLabel')} danger onClick={() => set('specs', form.specs.filter((_, j) => j !== i))}>
                      <X />
                    </IconButton>
                  </div>
                ))}
                <div className="pt-1">
                  <Button variant="outline" size="sm" onClick={() => set('specs', [...form.specs, { label: '', value: '' }])}>
                    <Plus weight="bold" />{t('productEdit.specs.add')}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {pcSlot && (
            <div className="stagger" style={stagger(6)}>
              <Card icon={Cpu} hue="pink" title={t('productEdit.pc.title')} description={t('productEdit.pc.desc')}>
                <div className="divide-y divide-border">
                  <SwitchRow
                    label={t('productEdit.pc.hiddenLabel')}
                    hint={t('productEdit.pc.hiddenHint')}
                    on={form.pcHidden}
                    onChange={(v) => set('pcHidden', v)}
                  />
                  {/* Saqlangan holatdan (`loaded`), qoralamadan emas: server qismni faqat saqlangan tur/narx/holat/nom/qulflar bo'yicha biladi; key o'zgarsa saqlagandan keyin qayta yuklanadi. */}
                  {!isNew && loaded && loaded.categoryId === 'pc' && slotForType(loaded.type) && (
                    <PcPartValues key={`${loaded.categoryId}|${loaded.type}|${loaded.cashPriceUzs}|${loaded.isActive}|${loaded.name}|${loaded.manualFields.join(',')}`} productId={id} />
                  )}
                  {(pcSlot === 'cpu' || pcSlot === 'gpu' || pcSlot === 'psu') && (
                    <div className="grid gap-4 py-3 sm:grid-cols-3">
                      <Field label={pcSlot === 'psu' ? t('productEdit.pc.wattsLabelPsu') : t('productEdit.pc.wattsLabelOther')}>
                        <Input
                          value={form.pcWatts ? String(form.pcWatts) : ''}
                          onChange={(v) => { const n = Number(v.replace(/\D/g, '')); set('pcWatts', n > 0 ? Math.min(3000, n) : null); }}
                          placeholder={autoWatts ? t('productEdit.pc.wattsPlaceholderAuto', { value: autoWatts }) : t('productEdit.pc.wattsPlaceholderUnknown')}
                        />
                      </Field>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          <div className="stagger" style={stagger(7)}>
            <Card icon={Star} hue="amber" title={t('productEdit.reviews.title')} description={t('productEdit.reviews.desc')}>
              <div className="grid gap-4 sm:grid-cols-2">
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
          </div>

          {!isNew && !billz && (
            <div className="stagger" style={stagger(8)}>
              <Card icon={Warning} hue="slate" title={t('shared.dangerZone')} description={t('productEdit.danger.desc')}>
                <div>
                  <Button variant="dangerSoft" onClick={remove}><Trash />{t('productEdit.danger.button')}</Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </Page>
  );
};

export default ProductEdit;
