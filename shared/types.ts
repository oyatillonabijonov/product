export type Category = 'iphone' | 'mac' | 'ipad' | 'pc';
export type Condition = 'yangi' | 'ishlatilgan';

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
  usdToUzs: number;
  terms: Term[];
}

export interface ApiCategory {
  id: string;
  name: string;
  iconUrl: string;
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
