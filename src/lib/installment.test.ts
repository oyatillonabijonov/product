import { describe, it, expect } from 'vitest';
import type { InstallmentConfig, Product, Term } from '../data/products';
import {
  calcInstallment, composeLeadMessage, discountPercent, formatUzs, lowestMonthly,
  telegramShareUrl, whatsappUrl,
} from './installment';

const config: InstallmentConfig = {
  downPaymentPercent: 20,
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
});

describe('lowestMonthly', () => {
  it('eng uzoq muddat bo\'yicha oylikni qaytaradi', () => {
    const expected = calcInstallment(product, { months: 12, markup: 0.42 }, config).monthly;
    expect(lowestMonthly(product, config)).toBeCloseTo(expected, 2);
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

describe('composeLeadMessage', () => {
  it("bo'sh ism/telefon qatorlari xabarga kirmaydi", () => {
    const msg = composeLeadMessage({
      name: '', phone: '', product: 'iPhone 16 (256GB)', months: 12,
      monthly: "1 016 667 so'm", brand: 'Taqsit Store',
    });
    expect(msg).not.toContain('Ism:');
    expect(msg).not.toContain('Telefon:');
    expect(msg).toContain('Qurilma: iPhone 16 (256GB)');
    expect(msg).toContain('Muddat: 12 oy');
  });

  it("to'ldirilgan ism/telefon chiqadi", () => {
    const msg = composeLeadMessage({
      name: 'Ali', phone: '+998901234567', product: 'X', months: 6, monthly: '1', brand: 'B',
    });
    expect(msg).toContain('Ism: Ali');
    expect(msg).toContain('Telefon: +998901234567');
  });
});

describe('deep link URL\'lari', () => {
  it("xabardagi maxsus belgilar (&, %, yangi qator) encode qilinadi", () => {
    const msg = 'A & B 100%\nkeyingi';
    const tg = telegramShareUrl(msg, 'https://t.me/shop');
    expect(tg).toContain(encodeURIComponent(msg));
    expect(tg).not.toContain('A & B');
    expect(tg).toContain(`url=${encodeURIComponent('https://t.me/shop')}`);
  });

  it("whatsapp bazasidagi oxirgi '/' kesiladi", () => {
    const wa = whatsappUrl('salom', 'https://wa.me/998900000000/');
    expect(wa).toBe(`https://wa.me/998900000000?text=${encodeURIComponent('salom')}`);
  });
});
