import iph1 from '../assets/images/iph1.webp';
import mac1 from '../assets/images/mac1.webp';
import pad1 from '../assets/images/pad1.webp';
import imac1 from '../assets/images/imac1.webp';
import mini from '../assets/images/mini.webp';
import pc from '../assets/images/pc.webp';

export type Category = 'iphone' | 'mac' | 'ipad' | 'pc';

export interface Product {
  id: string;
  name: string;
  category: Category;
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
  downPaymentUsd: number;
  usdToUzs: number;
  terms: Term[];
}

export const installmentConfig: InstallmentConfig = {
  downPaymentUsd: 30,
  usdToUzs: 12600, // NAMUNA kurs — egasi yangilaydi
  terms: [
    { months: 3, markup: 0.1 },
    { months: 6, markup: 0.22 },
    { months: 9, markup: 0.32 },
    { months: 12, markup: 0.42 },
  ],
};

// NAMUNA narxlar — egasi keyin real narxlarga almashtiradi.
export const products: Product[] = [
  { id: 'iphone-17-pro', name: 'iPhone 17 Pro', category: 'iphone', image: iph1, cashPriceUzs: 18_500_000 },
  { id: 'iphone-16', name: 'iPhone 16', category: 'iphone', image: iph1, cashPriceUzs: 12_900_000 },
  { id: 'macbook-pro', name: 'MacBook Pro', category: 'mac', image: mac1, cashPriceUzs: 32_000_000 },
  { id: 'macbook-air', name: 'MacBook Air', category: 'mac', image: mac1, cashPriceUzs: 19_900_000 },
  { id: 'ipad-pro', name: 'iPad Pro', category: 'ipad', image: pad1, cashPriceUzs: 14_500_000 },
  { id: 'imac', name: 'iMac', category: 'mac', image: imac1, cashPriceUzs: 24_000_000 },
  { id: 'mac-mini', name: 'Mac Mini', category: 'mac', image: mini, cashPriceUzs: 9_900_000 },
  { id: 'workstation', name: 'Workstation PC', category: 'pc', image: pc, cashPriceUzs: 21_000_000 },
];
