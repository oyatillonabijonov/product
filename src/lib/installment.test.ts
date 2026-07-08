import { describe, it, expect } from 'vitest';
import type { InstallmentConfig, Product, Term } from '../data/products';
import { calcInstallment, discountPercent, formatUzs, priceView } from './installment';

const config: InstallmentConfig = {
  downPaymentPercent: 20,
  downPaymentMaxPercent: 90,
  usdToUzs: 12600,
  terms: [
    { months: 3, markup: 0.1 },
    { months: 6, markup: 0.22 },
    { months: 12, markup: 0.42 },
  ],
};

const product: Product = {
  id: 'iphone-16',
  name: 'iPhone 16',
  category: 'iphone',
  condition: 'yangi',
  image: 'x',
  cashPriceUzs: 10_000_000,
  minPriceUzs: 10_000_000,
};

describe('calcInstallment', () => {
  it('ustamani to\'liq narxga, boshlang\'ichni narxdan foizga qo\'llaydi', () => {
    const term: Term = { months: 12, markup: 0.42 };
    const r = calcInstallment(product, term, config);
    expect(r.total).toBe(14_200_000);
    expect(r.downPaymentUzs).toBe(2_000_000);
    expect(r.monthly).toBeCloseTo(1_016_666.67, 2);
  });

  it('0% boshlang\'ich va 0% ustamada oddiy bo\'linish', () => {
    const zeroConfig: InstallmentConfig = { ...config, downPaymentPercent: 0 };
    const term: Term = { months: 3, markup: 0 };
    const r = calcInstallment({ ...product, cashPriceUzs: 5_000_000 }, term, zeroConfig);
    expect(r.total).toBe(5_000_000);
    expect(r.downPaymentUzs).toBe(0);
    expect(r.monthly).toBeCloseTo(1_666_666.67, 2);
  });

  it('boshlang\'ich jamiga teng bo\'lsa oylik manfiy emas, 0 bo\'ladi', () => {
    const fullConfig: InstallmentConfig = { ...config, downPaymentPercent: 100 };
    const term: Term = { months: 6, markup: 0 };
    const r = calcInstallment({ ...product, cashPriceUzs: 1_000_000 }, term, fullConfig);
    expect(r.total).toBe(1_000_000);
    expect(r.downPaymentUzs).toBe(1_000_000);
    expect(r.monthly).toBe(0);
  });

  it('berilgan downPaymentUzs ustama narxdan ayriladi', () => {
    const term: Term = { months: 12, markup: 0.42 };
    // total = 10m×1.42 = 14.2m; down = 5m; monthly = (14.2m−5m)/12
    const r = calcInstallment(product, term, config, 5_000_000);
    expect(r.total).toBe(14_200_000);
    expect(r.downPaymentUzs).toBe(5_000_000);
    expect(r.monthly).toBeCloseTo(766_666.67, 2);
  });
});

describe('formatUzs', () => {
  it('yaxlitlab, bo\'sh joy bilan formatlaydi', () => {
    expect(formatUzs(1_016_666.67)).toBe("1 016 667 so'm");
  });
});

describe('discountPercent', () => {
  it("eski narx yo'q yoki narxdan kichik/teng bo'lsa null", () => {
    expect(discountPercent(10_000_000, null)).toBeNull();
    expect(discountPercent(10_000_000, 10_000_000)).toBeNull();
    expect(discountPercent(10_000_000, 9_000_000)).toBeNull();
  });

  it('foizni yaxlitlaydi', () => {
    expect(discountPercent(12_000_000, 18_000_000)).toBe(33);
  });

  it("0% ga yaxlitlanadigan mikro-farq null — '-0%' badge chiqmasin", () => {
    expect(discountPercent(10_000_000, 10_040_000)).toBeNull();
  });
});

describe('priceView', () => {
  const p = { ...product, minPriceUzs: 8_000_000 };
  it("both — naqd birlamchi, oylik ko'rinadi", () => {
    const v = priceView(p, config, 'both');
    expect(v.cashUzs).toBe(8_000_000);
    expect(v.showMonthly).toBe(true);
    expect(v.monthlyPrimary).toBe(false);
    expect(v.monthlyUzs).toBeGreaterThan(0);
  });
  it('cash — oylik yashirin', () => {
    const v = priceView(p, config, 'cash');
    expect(v.showMonthly).toBe(false);
  });
  it('installment — oylik birlamchi', () => {
    const v = priceView(p, config, 'installment');
    expect(v.monthlyPrimary).toBe(true);
    expect(v.showMonthly).toBe(true);
  });
});
