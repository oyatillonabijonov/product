import iph1 from '../assets/images/iph1.webp';
import mac1 from '../assets/images/mac1.webp';
import pad1 from '../assets/images/pad1.webp';
import imac1 from '../assets/images/imac1.webp';
import mini from '../assets/images/mini.webp';
import pc from '../assets/images/pc.webp';

export type Category = 'iphone' | 'mac' | 'ipad' | 'pc';
export type Condition = 'yangi' | 'ishlatilgan';

export interface Product {
  id: string;
  name: string;
  category: Category;
  condition: Condition;
  /** Ishlatilgan uchun holat izohi, masalan "95% holat". */
  conditionNote?: string;
  image: string;
  /** Naqd (to'liq) narx, so'mda. NAMUNA — egasi keyin almashtiradi. */
  cashPriceUzs: number;
}

export interface Term {
  months: number;
  /** Ustama foiz (0.10 = +10%). NAMUNA. */
  markup: number;
}

export interface InstallmentConfig {
  /** Boshlang'ich to'lov narxdan foizi (20 = 20%). */
  downPaymentPercent: number;
  /** Kurs — admin ma'lumoti/narx kiritish uchun (hisobga kirmaydi). */
  usdToUzs: number;
  terms: Term[];
}

export const installmentConfig: InstallmentConfig = {
  downPaymentPercent: 20, // NAMUNA — admin o'zgartiradi
  usdToUzs: 12600, // NAMUNA kurs
  terms: [
    { months: 3, markup: 0.1 },
    { months: 6, markup: 0.22 },
    { months: 12, markup: 0.42 },
  ],
};

// NAMUNA narxlar — egasi keyin real narxlarga almashtiradi.
export const products: Product[] = [
  { id: 'iphone-17-pro', name: 'iPhone 17 Pro', category: 'iphone', condition: 'yangi', image: iph1, cashPriceUzs: 18_500_000 },
  { id: 'iphone-16', name: 'iPhone 16', category: 'iphone', condition: 'yangi', image: iph1, cashPriceUzs: 12_900_000 },
  { id: 'macbook-pro', name: 'MacBook Pro', category: 'mac', condition: 'yangi', image: mac1, cashPriceUzs: 32_000_000 },
  { id: 'macbook-air', name: 'MacBook Air', category: 'mac', condition: 'yangi', image: mac1, cashPriceUzs: 19_900_000 },
  { id: 'ipad-pro', name: 'iPad Pro', category: 'ipad', condition: 'yangi', image: pad1, cashPriceUzs: 14_500_000 },
  { id: 'imac', name: 'iMac', category: 'mac', condition: 'yangi', image: imac1, cashPriceUzs: 24_000_000 },
  { id: 'iphone-15-used', name: 'iPhone 15 (ishlatilgan)', category: 'iphone', condition: 'ishlatilgan', conditionNote: '95% holat', image: iph1, cashPriceUzs: 9_500_000 },
  { id: 'macbook-air-used', name: 'MacBook Air (ishlatilgan)', category: 'mac', condition: 'ishlatilgan', conditionNote: '90% holat', image: mac1, cashPriceUzs: 13_900_000 },
  { id: 'mac-mini', name: 'Mac Mini', category: 'mac', condition: 'yangi', image: mini, cashPriceUzs: 9_900_000 },
  { id: 'workstation', name: 'Workstation PC', category: 'pc', condition: 'yangi', image: pc, cashPriceUzs: 21_000_000 },
];
