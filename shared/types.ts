export type Category = 'iphone' | 'mac' | 'ipad' | 'pc';
export type Condition = 'yangi' | 'ishlatilgan';
export type PaymentMode = 'both' | 'cash' | 'installment';

export interface Term {
  months: number;
  markup: number;
}

export interface ApiProduct {
  id: string;
  name: string;
  category: Category;
  condition: Condition;
  conditionNote: string | null;
  cashPriceUzs: number;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
  categoryId: string | null;
  oldPriceUzs: number | null;
  brandId: string | null;
  slug: string | null;
  minPriceUzs: number;
}

export interface ApiSettings {
  downPaymentPercent: number;
  downPaymentMaxPercent: number;
  usdToUzs: number;
  terms: Term[];
}

export interface ApiCategory {
  id: string;
  name: string;
  iconUrl: string;
  /** Preset icon key (see src/lib/category-icons); falls back to a generic icon when empty/unknown. */
  icon: string;
  sortOrder: number;
}

export interface ApiSpec {
  label: string;
  value: string;
}

export interface ApiProductDetail extends ApiProduct {
  description: string | null;
  images: string[];
  specs: ApiSpec[];
  brand: ApiBrand | null;
  options: ApiOption[];
  variants: ApiVariant[];
}

export interface ApiBrand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  sortOrder: number;
}

export interface ApiOptionValue {
  id: string;
  value: string;
  sortOrder: number;
}

export interface ApiOption {
  id: string;
  name: string;
  sortOrder: number;
  values: ApiOptionValue[];
}

export interface ApiVariant {
  id: string;
  sku: string | null;
  cashPriceUzs: number;
  oldPriceUzs: number | null;
  imageUrl: string | null;
  inStock: boolean;
  sortOrder: number;
  optionValueIds: string[];
}

export interface LocalizedText {
  uz: string;
  ru: string;
  en: string;
  uzCyrl: string;
}

export interface ApiBanner {
  id: string;
  imageUrl: string;
  linkUrl: string;
  altText: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ApiPage {
  id: string;
  slug: string;
  title: LocalizedText;
  content: LocalizedText;
  sortOrder: number;
  isActive: boolean;
}

export interface ApiDeviceModel {
  id: string;
  name: string;
  brandId: string;
  categoryId: string;
  legacyCategory: Category;
  chip: string;
  ram: string;
  camera: string;
  display: string;
  sortOrder: number;
}

export interface ApiSiteConfig {
  name: string;
  phone: string;
  phoneDisplay: string;
  telegram: string;
  instagram: string;
  whatsapp: string;
  mapLl: string;
  mapLabel: string;
  seoTitleSuffix: string;
  seoDescription: string;
  ogImage: string;
  paymentMode: PaymentMode;
}
