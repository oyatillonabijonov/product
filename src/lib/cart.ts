import { calcInstallment, type InstallmentResult } from './installment';
import type { InstallmentConfig, Product, Term } from '../data/products';

export interface CartItem {
  productId: string;
  name: string;
  image: string;
  priceUzs: number;
  variantId: string | null;
  variantLabel: string;
  qty: number;
}

export const CART_KEY = 'taqsit-cart-v1';
const MAX_QTY = 99;

const sameLine = (x: CartItem, productId: string, variantId: string | null): boolean =>
  x.productId === productId && x.variantId === variantId;

export function addItem(items: CartItem[], item: CartItem): CartItem[] {
  const existing = items.find((x) => sameLine(x, item.productId, item.variantId));
  if (existing) {
    return items.map((x) => (x === existing ? { ...x, qty: Math.min(MAX_QTY, x.qty + item.qty) } : x));
  }
  return [...items, { ...item, qty: Math.min(MAX_QTY, item.qty) }];
}

export function removeItem(items: CartItem[], productId: string, variantId: string | null): CartItem[] {
  return items.filter((x) => !sameLine(x, productId, variantId));
}

export function setQty(items: CartItem[], productId: string, variantId: string | null, qty: number): CartItem[] {
  if (qty <= 0) return removeItem(items, productId, variantId);
  const q = Math.min(MAX_QTY, qty);
  return items.map((x) => (sameLine(x, productId, variantId) ? { ...x, qty: q } : x));
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((s, x) => s + x.qty, 0);
}

export function cartSum(items: CartItem[]): number {
  return items.reduce((s, x) => s + x.priceUzs * x.qty, 0);
}

export function serializeCart(items: CartItem[]): string {
  return JSON.stringify(items);
}

export function parseCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const out: CartItem[] = [];
    for (const entry of data) {
      if (typeof entry !== 'object' || entry === null) continue;
      const o = entry as Record<string, unknown>;
      if (typeof o.productId !== 'string' || o.productId === '') continue;
      if (typeof o.name !== 'string' || typeof o.image !== 'string') continue;
      if (typeof o.priceUzs !== 'number' || !Number.isFinite(o.priceUzs) || o.priceUzs <= 0) continue;
      if (typeof o.qty !== 'number' || !Number.isInteger(o.qty) || o.qty <= 0) continue;
      out.push({
        productId: o.productId,
        name: o.name,
        image: o.image,
        priceUzs: o.priceUzs,
        variantId: typeof o.variantId === 'string' ? o.variantId : null,
        variantLabel: typeof o.variantLabel === 'string' ? o.variantLabel : '',
        qty: Math.min(MAX_QTY, o.qty),
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** Savat jami summasiga muddatli to'lov hisobi. Formula chiziqli bo'lgani uchun
 * jami naqd summaga calcInstallment'ni qo'llash per-item hisoblar yig'indisiga teng. */
export function cartInstallment(sumUzs: number, term: Term, config: InstallmentConfig): InstallmentResult {
  const pseudo: Product = {
    id: '__cart__', name: '__cart__', category: 'pc', condition: 'yangi', image: '',
    cashPriceUzs: sumUzs, minPriceUzs: sumUzs,
  };
  return calcInstallment(pseudo, term, config);
}

