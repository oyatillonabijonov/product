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
  /** Eskisida narx, chegirma hisoblash uchun. */
  oldPriceUzs?: number | null;
  /** Qo'shimcha galereya rasmlari (asosiy `image` dan tashqari). */
  gallery?: string[];
  /** Xususiyatlar (label/value). */
  specs?: { label: string; value: string }[];
  /** Qisqa tavsif. */
  description?: string;
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

/** Storefront kategoriyalari — API ishlamaganда namuna sifatida (migratsiya 0003 bilan mos). */
export const categories: { id: string; name: string; iconUrl: string; sortOrder: number }[] = [
  { id: 'telefonlar', name: 'Telefonlar', iconUrl: '', sortOrder: 10 },
  { id: 'noutbuklar', name: 'Noutbuklar', iconUrl: '', sortOrder: 20 },
  { id: 'planshetlar', name: 'Planshetlar', iconUrl: '', sortOrder: 30 },
  { id: 'kompyuterlar', name: 'Kompyuterlar', iconUrl: '', sortOrder: 40 },
  { id: 'aksessuarlar', name: 'Aksessuarlar', iconUrl: '', sortOrder: 50 },
];

/** Sample mahsulotni storefront kategoriyasiga bog'lash (migratsiya 0003 mantig'i). */
export function fallbackCategoryOf(p: Product): string | null {
  if (p.category === 'iphone') return 'telefonlar';
  if (p.category === 'ipad') return 'planshetlar';
  if (p.category === 'mac') return p.id.includes('macbook') ? 'noutbuklar' : 'kompyuterlar';
  if (p.category === 'pc') return 'kompyuterlar';
  return null;
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

const iphoneSpecs = [
  { label: 'Ekran', value: '6.3" Super Retina XDR OLED' },
  { label: 'Protsessor', value: 'Apple A18 Pro' },
  { label: 'Xotira', value: '256 GB' },
  { label: 'Asosiy kamera', value: '48 MP' },
  { label: 'Batareya', value: 'Video 27 soatgacha' },
  { label: 'SIM', value: 'Nano-SIM + eSIM' },
];

const macbookSpecs = [
  { label: 'Ekran', value: '14" Liquid Retina XDR' },
  { label: 'Protsessor', value: 'Apple M4 Pro' },
  { label: 'Operativ xotira', value: '18 GB' },
  { label: 'SSD', value: '512 GB' },
  { label: 'Batareya', value: '18 soatgacha' },
];

// NAMUNA narxlar — egasi keyin real narxlarga almashtiradi.
export const products: Product[] = [
  { id: 'iphone-17-pro', name: 'iPhone 17 Pro', category: 'iphone', condition: 'yangi', image: iph1, cashPriceUzs: 18_500_000, specs: iphoneSpecs, description: 'Titan korpus, Apple A18 Pro chipi va professional kamera tizimi. Muddatli to\'lovga — pasport + boshlang\'ich to\'lov bilan.' },
  { id: 'iphone-16', name: 'iPhone 16', category: 'iphone', condition: 'yangi', image: iph1, cashPriceUzs: 12_900_000, specs: iphoneSpecs, description: 'Yangi avlod iPhone — kuchli protsessor va yaxshilangan kamera. Rasmiy kafolat bilan.' },
  { id: 'macbook-pro', name: 'MacBook Pro', category: 'mac', condition: 'yangi', image: mac1, cashPriceUzs: 32_000_000, specs: macbookSpecs, description: 'M4 Pro chipidagi professional noutbuk — video montaj, dasturlash va og\'ir vazifalar uchun.' },
  { id: 'macbook-air', name: 'MacBook Air', category: 'mac', condition: 'yangi', image: mac1, cashPriceUzs: 19_900_000, specs: macbookSpecs, description: 'Yengil va nozik korpus, kun bo\'yi batareya. Kundalik ishlar uchun ideal.' },
  { id: 'ipad-pro', name: 'iPad Pro', category: 'ipad', condition: 'yangi', image: pad1, cashPriceUzs: 14_500_000, specs: [
    { label: 'Ekran', value: '11" Ultra Retina XDR' },
    { label: 'Protsessor', value: 'Apple M4' },
    { label: 'Xotira', value: '256 GB' },
    { label: 'Apple Pencil', value: 'Pro qo\'llab-quvvatlaydi' },
  ] },
  { id: 'imac', name: 'iMac', category: 'mac', condition: 'yangi', image: imac1, cashPriceUzs: 24_000_000, specs: [
    { label: 'Ekran', value: '24" 4.5K Retina' },
    { label: 'Protsessor', value: 'Apple M4' },
    { label: 'Operativ xotira', value: '16 GB' },
    { label: 'SSD', value: '512 GB' },
  ] },
  { id: 'iphone-15-used', name: 'iPhone 15 (ishlatilgan)', category: 'iphone', condition: 'ishlatilgan', conditionNote: '95% holat', image: iph1, cashPriceUzs: 9_500_000, specs: iphoneSpecs, description: 'Tekshirilgan, toza holatdagi iPhone 15. Ishlatilgan, lekin ishonchli.' },
  { id: 'macbook-air-used', name: 'MacBook Air (ishlatilgan)', category: 'mac', condition: 'ishlatilgan', conditionNote: '90% holat', image: mac1, cashPriceUzs: 13_900_000, specs: macbookSpecs, description: 'Ishlatilgan MacBook Air — tekshirilgan va tayyor. Arzon narxda.' },
  { id: 'mac-mini', name: 'Mac Mini', category: 'mac', condition: 'yangi', image: mini, cashPriceUzs: 9_900_000, specs: [
    { label: 'Protsessor', value: 'Apple M4' },
    { label: 'Operativ xotira', value: '16 GB' },
    { label: 'SSD', value: '256 GB' },
    { label: 'Portlar', value: 'Thunderbolt 4, HDMI' },
  ] },
  { id: 'workstation', name: 'Workstation PC', category: 'pc', condition: 'yangi', image: pc, cashPriceUzs: 21_000_000, specs: [
    { label: 'Protsessor', value: 'Intel Core i9' },
    { label: 'Videokarta', value: 'NVIDIA RTX 4070' },
    { label: 'Operativ xotira', value: '32 GB DDR5' },
    { label: 'SSD', value: '1 TB NVMe' },
  ] },
];
