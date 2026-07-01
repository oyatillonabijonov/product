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
}

export interface ApiSettings {
  downPaymentPercent: number;
  usdToUzs: number;
  terms: Term[];
}
