import type { ApiSpec, Category, Condition } from '../../../shared/types';
import type { AdminProductDetail, AdminProductInput, AdminVariantInput } from '../api';
import { generateVariants, type OptionDraft } from './variant-gen';

/** Variant o'qlari — chiplar shu qiymatlardan; boshqa rang qo'lda yoziladi. */
export const STORAGE_VALUES = ['64GB', '128GB', '256GB', '512GB', '1TB', '2TB'];
export const COLOR_VALUES = ['Qora', 'Oq', 'Kulrang', "Ko'k", 'Yashil', 'Qizil', 'Tillarang', 'Pushti'];
/** Variant yorlig'i — o'qlar doim shu tartibda (Xotira · Rang). */
export const AXES = ['Xotira', 'Rang'];

/** Mahsulot tahriri holati — ekran faqat chizadi, mantiq shu faylda (testli). */
export interface ProductFormState {
  name: string;
  category: Category;
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
  /** Billz tovari — sinxron maydonlar faqat o'qiladi, o'chirilmaydi. */
  billzId: string | null;
  billzStock: number | null;
}

export const EMPTY_FORM: ProductFormState = {
  name: '', category: 'iphone', categoryId: null, type: null, condition: 'yangi', conditionNote: '',
  cashPriceUzs: 0, oldPriceUzs: 0, description: '', imageUrl: '', images: [], specs: [], sortOrder: 0, isActive: true,
  brandId: null, slug: '', ratingAvg: 0, reviewCount: 0, preorder: false,
  pcHidden: false, pcSocket: null, pcMemory: null, pcWatts: null,
  options: [], variants: [], billzId: null, billzStock: null,
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
    name: d.name, category: d.category, categoryId: d.categoryId, type: d.type, condition: d.condition,
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
    billzId: d.billzId, billzStock: d.billzStock,
  };
}

/** Saqlashdan oldingi tekshiruv — xato matni yoki null. */
export function validateForm(f: ProductFormState): string | null {
  if (!f.name.trim()) return 'Mahsulot nomini kiriting.';
  if (!(f.cashPriceUzs > 0 || f.variants.some((v) => v.cashPriceUzs > 0))) return 'Naqd narx yoki kamida bitta variant narxini kiriting.';
  // O'lchov bor-u, birorta variant narxlanmagan bo'lsa — mahsulot sahifasida ishlamaydigan chiplar chiqadi; jim saqlamaymiz.
  if (f.options.some((o) => o.name.trim() && o.values.length) && !f.variants.some((v) => v.cashPriceUzs > 0)) {
    return "Variant narxlarini kiriting yoki o'lchovlarni olib tashlang.";
  }
  return null;
}

/** Forma → API tanasi. Naqd narx 0 bo'lsa eng arzon narxlangan variant; narxsiz variantlar va bo'sh xususiyatlar tushib qoladi. */
export function formToPayload(f: ProductFormState): AdminProductInput {
  const priced = f.variants.filter((v) => v.cashPriceUzs > 0);
  const cashPriceUzs = f.cashPriceUzs > 0 ? f.cashPriceUzs : priced.length ? Math.min(...priced.map((v) => v.cashPriceUzs)) : 0;
  return {
    name: f.name, category: f.category, categoryId: f.categoryId, type: f.type, condition: f.condition,
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
