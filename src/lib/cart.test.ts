import { describe, it, expect } from 'vitest';
import {
  addItem, removeItem, setQty, cartCount, cartSum,
  serializeCart, parseCart, cartInstallment, composeCartLeadMessage,
  type CartItem,
} from './cart';
import { calcInstallment } from './installment';
import { installmentConfig, products } from '../data/products';

const I = (o: Partial<CartItem> & { productId: string }): CartItem => ({
  name: o.productId, image: '', priceUzs: 100, variantId: null, variantLabel: '', qty: 1, ...o,
});

describe('addItem', () => {
  it('appends a new item', () => {
    expect(addItem([], I({ productId: 'a' }))).toHaveLength(1);
  });
  it('merges same product+variant by qty', () => {
    const items = addItem([I({ productId: 'a', variantId: 'v1', qty: 2 })], I({ productId: 'a', variantId: 'v1', qty: 3 }));
    expect(items).toHaveLength(1);
    expect(items[0].qty).toBe(5);
  });
  it('same product different variant stays separate', () => {
    const items = addItem([I({ productId: 'a', variantId: 'v1' })], I({ productId: 'a', variantId: 'v2' }));
    expect(items).toHaveLength(2);
  });
  it('caps qty at 99', () => {
    const items = addItem([I({ productId: 'a', qty: 98 })], I({ productId: 'a', qty: 5 }));
    expect(items[0].qty).toBe(99);
  });
});

describe('removeItem / setQty', () => {
  const base = [I({ productId: 'a', variantId: 'v1' }), I({ productId: 'b', variantId: null })];
  it('removes by product+variant', () => {
    expect(removeItem(base, 'a', 'v1').map((x) => x.productId)).toEqual(['b']);
  });
  it('setQty updates and clamps', () => {
    expect(setQty(base, 'b', null, 4)[1].qty).toBe(4);
    expect(setQty(base, 'b', null, 500)[1].qty).toBe(99);
  });
  it('setQty <= 0 removes the item', () => {
    expect(setQty(base, 'b', null, 0)).toHaveLength(1);
  });
});

describe('count/sum', () => {
  it('sums qty and price*qty', () => {
    const items = [I({ productId: 'a', priceUzs: 100, qty: 2 }), I({ productId: 'b', priceUzs: 50, qty: 1 })];
    expect(cartCount(items)).toBe(3);
    expect(cartSum(items)).toBe(250);
  });
});

describe('parseCart', () => {
  it('round-trips serialize/parse', () => {
    const items = [I({ productId: 'a', variantId: 'v1', variantLabel: 'Xotira: 256GB', qty: 2 })];
    expect(parseCart(serializeCart(items))).toEqual(items);
  });
  it('returns [] on null, garbage and non-array', () => {
    expect(parseCart(null)).toEqual([]);
    expect(parseCart('{broken')).toEqual([]);
    expect(parseCart('{"a":1}')).toEqual([]);
  });
  it('drops malformed entries, keeps valid ones', () => {
    const raw = JSON.stringify([I({ productId: 'ok' }), { productId: 42, qty: 'x' }, { productId: 'neg', name: 'n', image: '', priceUzs: -5, variantId: null, variantLabel: '', qty: 1 }]);
    expect(parseCart(raw).map((x) => x.productId)).toEqual(['ok']);
  });
});

describe('cartInstallment', () => {
  it('equals per-item calc summed (linearity)', () => {
    const term = installmentConfig.terms[2];
    const p1 = products[0];
    const p2 = products[1];
    const sum = p1.cashPriceUzs + p2.cashPriceUzs;
    const whole = cartInstallment(sum, term, installmentConfig);
    const split = calcInstallment(p1, term, installmentConfig).monthly + calcInstallment(p2, term, installmentConfig).monthly;
    expect(whole.monthly).toBeCloseTo(split, 6);
  });
});

describe('composeCartLeadMessage', () => {
  it('lists items with variant labels and totals', () => {
    const msg = composeCartLeadMessage({
      items: [I({ productId: 'a', name: 'iPhone 17 Pro', variantLabel: 'Xotira: 256GB', qty: 2 }), I({ productId: 'b', name: 'AirPods' })],
      months: 12, monthly: "1 000 000 so'm", downPayment: "500 000 so'm", totalCash: "5 000 000 so'm",
    });
    expect(msg).toContain('iPhone 17 Pro (Xotira: 256GB) ×2');
    expect(msg).toContain('AirPods ×1');
    expect(msg).toContain('Muddat: 12 oy');
    expect(msg).toContain("Jami narx: 5 000 000 so'm");
    expect(msg).toContain("oylik to'lov: 1 000 000 so'm");
  });
});
