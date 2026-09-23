import { describe, expect, it } from 'vitest';
import type { OrderInput } from './types';
import { composeOrderMessage } from './order';

const order = (over: Partial<OrderInput> = {}): OrderInput => ({
  name: 'Ali Valiyev', phone: '+998 90 123-45-67', note: '',
  paymentKind: 'cash', termMonths: null, downPaymentUzs: null, monthlyUzs: null, totalUzs: null,
  items: [{ productId: 'p1', name: 'iPhone 18 Pro', variantLabel: '256GB', qty: 1, priceUzs: 12_000_000 }],
  source: 'product', addressText: '', ...over,
});

describe('composeOrderMessage — manzil', () => {
  it("manzil bo'lsa xabarga tushadi", () => {
    const msg = composeOrderMessage(order({ addressText: 'Toshkent shahri, Chilonzor, Bunyodkor 12-uy' }), 'ProDuct');
    expect(msg).toContain('📍 Toshkent shahri, Chilonzor, Bunyodkor 12-uy');
  });
  it("manzilsiz buyurtmada qator umuman chiqmaydi", () => {
    expect(composeOrderMessage(order(), 'ProDuct')).not.toContain('📍');
  });
  it('manzil izohdan oldin turadi', () => {
    const msg = composeOrderMessage(order({ addressText: 'Chilonzor', note: 'Kechqurun' }), 'ProDuct');
    expect(msg.indexOf('📍')).toBeLessThan(msg.indexOf('📝'));
  });
  it("nom, telefon va tovar avvalgidek joyida", () => {
    const msg = composeOrderMessage(order(), 'ProDuct');
    expect(msg).toContain('👤 Ali Valiyev');
    expect(msg).toContain('📞 +998 90 123-45-67');
    expect(msg).toContain('iPhone 18 Pro (256GB) ×1');
  });
});
