import type { TFunction } from 'i18next';
import type { ApiSpec, Condition } from '../../../shared/types';
import type { AdminProductDetail, AdminProductInput, AdminVariantInput } from '../api';
import { generateVariants, type OptionDraft } from './variant-gen';
import { applyManualEdits, type LockSnapshot, type ManualField } from '../../../shared/billz.ts';

// i18n: ma'lumot — tarjima qilinmaydi (variant qiymati bo'lib bazaga yoziladi va saytda chip bo'lib chiqadi)
/** Variant o'qlari — chiplar shu qiymatlardan; boshqa rang qo'lda yoziladi. */
export const STORAGE_VALUES = ['64GB', '128GB', '256GB', '512GB', '1TB', '2TB'];
export const COLOR_VALUES = ['Qora', 'Oq', 'Kulrang', "Ko'k", 'Yashil', 'Qizil', 'Tillarang', 'Pushti'];
// i18n: ma'lumot — tarjima qilinmaydi (option nomi sifatida saqlanadi va butun faylda shu qiymat bilan solishtiriladi)
/** Variant yorlig'i — o'qlar doim shu tartibda (Xotira · Rang). */
const AXES = ['Xotira', 'Rang'];

/** Mahsulot tahriri holati — ekran faqat chizadi, mantiq shu faylda (testli). */
export interface ProductFormState {
  name: string;
  categoryId: string | null;
  type: string | null;
  condition: Condition;
  /** UI'siz — eski mahsulotlar qiymatini yo'qotmasin. */
  conditionNote: string;
  cashPriceUzs: number;
  oldPriceUzs: number;
  description: string;
  imageUrl: string;
  images: string[];
  specs: ApiSpec[];
  sortOrder: number;
  isActive: boolean;
  brandId: string | null;
  /** UI'siz — server nomdan yasaydi, mavjudi saqlanadi. */
  slug: string;
  ratingAvg: number;
  reviewCount: number;
  preorder: boolean;
  pcHidden: boolean;
  pcSocket: string | null;
  pcMemory: string | null;
  pcWatts: number | null;
  options: OptionDraft[];
  variants: AdminVariantInput[];
  /** Billz tovari — ham to'liq tahrirlanadi; o'zgartirilgan guruh `manualFields`ga qulflanadi. */
  billzId: string | null;
  billzStock: number | null;
  /** Billz tovarida qo'lda o'zgartirilgan (sinxronizatsiya tegmaydigan) guruhlar. */
  manualFields: ManualField[];
}

// i18n: ma'lumot — tarjima qilinmaydi ('yangi'/'ishlatilgan' server bilan solishtiriladigan qiymat)
export const EMPTY_FORM: ProductFormState = {
  name: '', categoryId: null, type: null, condition: 'yangi', conditionNote: '',
  cashPriceUzs: 0, oldPriceUzs: 0, description: '', imageUrl: '', images: [], specs: [], sortOrder: 0, isActive: true,
  brandId: null, slug: '', ratingAvg: 0, reviewCount: 0, preorder: false,
  pcHidden: false, pcSocket: null, pcMemory: null, pcWatts: null,
  options: [], variants: [], billzId: null, billzStock: null, manualFields: [],
};

export function variantLabel(v: AdminVariantInput): string {
  return AXES.map((ax) => v.optionValues.find((ov) => ov.optionName === ax)?.value).filter(Boolean).join(' · ');
}

/** Serverdagi detail → forma. Galereya asosiy rasmsiz; variant qiymatlari option id'laridan nomga o'giriladi. */
export function detailToForm(d: AdminProductDetail): ProductFormState {
  const optionValueMap = new Map<string, { optionName: string; value: string }>();
  for (const o of d.options) {
    for (const v of o.values) optionValueMap.set(v.id, { optionName: o.name, value: v.value });
  }
  return {
    name: d.name, categoryId: d.categoryId, type: d.type, condition: d.condition,
    conditionNote: d.conditionNote ?? '', cashPriceUzs: d.cashPriceUzs, oldPriceUzs: d.oldPriceUzs ?? 0,
    description: d.description ?? '', imageUrl: d.imageUrl, images: d.images.filter((u) => u !== d.imageUrl),
    specs: d.specs, sortOrder: d.sortOrder, isActive: d.isActive, brandId: d.brandId, slug: d.slug ?? '',
    ratingAvg: d.ratingAvg ?? 0, reviewCount: d.reviewCount ?? 0, preorder: d.preorder,
    pcHidden: d.pcHidden, pcSocket: d.pcSocket, pcMemory: d.pcMemory, pcWatts: d.pcWatts,
    options: d.options.map((o) => ({ name: o.name, values: o.values.map((v) => v.value) })),
    variants: d.variants.map((v) => ({
      sku: v.sku, cashPriceUzs: v.cashPriceUzs, oldPriceUzs: v.oldPriceUzs, imageUrl: v.imageUrl, inStock: v.inStock,
      optionValues: v.optionValueIds
        .map((id) => optionValueMap.get(id))
        .filter((x): x is { optionName: string; value: string } => x !== undefined),
    })),
    billzId: d.billzId, billzStock: d.billzStock, manualFields: d.manualFields,
  };
}

/** Saqlashdan oldingi tekshiruv — xato matni yoki null. */
export function validateForm(f: ProductFormState, t: TFunction<'products'>): string | null {
  if (!f.name.trim()) return t('form.nameRequired');
  if (!(f.cashPriceUzs > 0 || f.variants.some((v) => v.cashPriceUzs > 0))) return t('form.priceRequired');
  // O'lchov bor-u, birorta variant narxlanmagan bo'lsa — mahsulot sahifasida ishlamaydigan chiplar chiqadi; jim saqlamaymiz.
  if (f.options.some((o) => o.name.trim() && o.values.length) && !f.variants.some((v) => v.cashPriceUzs > 0)) {
    return t('form.variantPriceRequired');
  }
  return null;
}

/** Forma → API tanasi. Naqd narx 0 bo'lsa eng arzon narxlangan variant; narxsiz variantlar va bo'sh xususiyatlar tushib qoladi. */
export function formToPayload(f: ProductFormState): AdminProductInput {
  const priced = f.variants.filter((v) => v.cashPriceUzs > 0);
  const cashPriceUzs = f.cashPriceUzs > 0 ? f.cashPriceUzs : priced.length ? Math.min(...priced.map((v) => v.cashPriceUzs)) : 0;
  return {
    name: f.name, categoryId: f.categoryId, type: f.type, condition: f.condition,
    conditionNote: f.conditionNote || null, cashPriceUzs,
    oldPriceUzs: f.oldPriceUzs > 0 ? f.oldPriceUzs : null, description: f.description || null,
    imageUrl: f.imageUrl, images: f.images,
    specs: f.specs.filter((s) => s.label.trim() !== '' && s.value.trim() !== ''),
    sortOrder: f.sortOrder, isActive: f.isActive,
    brandId: f.brandId, slug: f.slug || null,
    ratingAvg: f.ratingAvg > 0 ? f.ratingAvg : null, reviewCount: f.reviewCount, preorder: f.preorder,
    pcHidden: f.pcHidden, pcSocket: f.pcSocket, pcMemory: f.pcMemory, pcWatts: f.pcWatts,
    options: f.options.filter((o) => o.name.trim() && o.values.length),
    variants: priced,
    manualFields: f.manualFields,
  };
}

/** Bitta o'q (Xotira/Rang) qiymatlarini almashtirib variantlarni qayta yasaydi (narxlar `generateVariants`da saqlanadi). */
export function setAxisValues(f: ProductFormState, axis: string, values: string[]): ProductFormState {
  const others = f.options.filter((o) => o.name !== axis);
  const options = values.length ? [...others, { name: axis, values }] : others;
  return { ...f, options, variants: generateVariants(options, f.variants) };
}

/** Chip bosildi: qiymat qo'shiladi/olinadi; Xotira `STORAGE_VALUES` tartibida turadi. */
export function toggleAxisValue(f: ProductFormState, axis: string, value: string): ProductFormState {
  const current = f.options.find((o) => o.name === axis)?.values ?? [];
  const next = current.includes(value) ? current.filter((x) => x !== value) : [...current, value];
  if (axis === 'Xotira') next.sort((a, b) => STORAGE_VALUES.indexOf(a) - STORAGE_VALUES.indexOf(b));
  return setAxisValues(f, axis, next);
}

/** Qo'lda yozilgan rang — bo'sh yoki allaqachon bor bo'lsa forma o'zgarmaydi. */
export function addAxisValue(f: ProductFormState, axis: string, value: string): ProductFormState {
  const v = value.trim();
  const current = f.options.find((o) => o.name === axis)?.values ?? [];
  if (!v || current.includes(v)) return f;
  return setAxisValues(f, axis, [...current, v]);
}

/** Forma → qulf solishtiruvi uchun holat (`formToPayload` bilan bir xil normallashtirish). */
function lockSnapshot(f: ProductFormState): LockSnapshot {
  const p = formToPayload(f);
  return {
    name: f.name, brandId: f.brandId, categoryId: f.categoryId, type: f.type,
    description: p.description ?? null, cashPriceUzs: p.cashPriceUzs ?? 0, oldPriceUzs: p.oldPriceUzs ?? null,
    specs: p.specs ?? [], imageUrl: f.imageUrl, images: f.images, isActive: f.isActive,
  };
}

/**
 * Saqlashda qo'yiladigan qulflar — belgi («Billz» / «Qo'lda») ham shu bilan jonli ko'rsatiladi, ya'ni egasi
 * nima qulflanishini saqlashdan oldin ko'radi. Faqat Billz tovarida; oddiy tovarga sinxronizatsiya tegmaydi.
 */
export function formLocks(f: ProductFormState, loaded: ProductFormState | null): ManualField[] {
  if (f.billzId === null || loaded === null) return f.manualFields;
  return applyManualEdits(f.manualFields, lockSnapshot(loaded), lockSnapshot(f));
}

/** Qulf guruhi → forma maydonlari (`shared/billz.ts` `GROUPS` bilan bir xil guruhlash). */
const GROUP_FIELDS: Record<ManualField, (keyof ProductFormState)[]> = {
  price: ['cashPriceUzs', 'oldPriceUzs'],
  specs: ['specs'],
  description: ['description'],
  category: ['categoryId', 'type'],
  name: ['name'],
  brand: ['brandId'],
  images: ['imageUrl', 'images'],
  hidden: ['isActive'],
};

/**
 * «Billz'ga qaytarish»: qulf yechiladi va shu seansdagi o'zgarish bekor qilinadi (maydon yuklangan qiymatga
 * qaytadi) — aks holda saqlashda o'sha o'zgarish qulfni qayta qo'yardi. Billz qiymatining o'zi keyingi
 * sinxronizatsiyada (30 daqiqagacha) keladi.
 */
export function revertField(f: ProductFormState, loaded: ProductFormState, field: ManualField): ProductFormState {
  const next = { ...f, manualFields: f.manualFields.filter((x) => x !== field) } as unknown as Record<string, unknown>;
  const src = loaded as unknown as Record<string, unknown>;
  for (const k of GROUP_FIELDS[field]) next[k] = src[k];
  return next as unknown as ProductFormState;
}
