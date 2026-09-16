import { describe, expect, it } from 'vitest';
import type { ApiOrder, OrderItemInput } from '../../../shared/types';
import {
  APPLICATION_STATUS, ORDER_STATUS, filterInbox, itemsTotal, orderSource, orderSummary, orderTotal, parseStatus, statusSegments, telHref,
} from './inbox';

const order = (over: Partial<ApiOrder> = {}): ApiOrder => ({
  id: 1, createdAt: 0, name: 'Ali Valiyev', phone: '+998 90 123-45-67', note: '',
  paymentKind: 'cash', termMonths: null, downPaymentUzs: null, monthlyUzs: null, totalUzs: null,
  items: [{ productId: 'p1', name: 'iPhone 16', variantLabel: '128GB', qty: 1, priceUzs: 12_000_000 }],
  source: 'product', status: 'new', telegramSent: true,
  ...over,
});

describe('parseStatus', () => {
  it("bo'sh va noma'lum qiymat — new", () => {
    expect(parseStatus(null)).toBe('new');
    expect(parseStatus('')).toBe('new');
    expect(parseStatus('archived')).toBe('new');
  });
  it("ma'lum qiymatlar o'zicha qoladi", () => {
    expect(parseStatus('contacted')).toBe('contacted');
    expect(parseStatus('done')).toBe('done');
    expect(parseStatus('all')).toBe('all');
  });
});

describe('statusSegments', () => {
  it("yangi soni faqat 0 dan katta bo'lsa yoziladi, Hammasi oxirida", () => {
    expect(statusSegments(ORDER_STATUS, 3).map((s) => s.label)).toEqual(['Yangi 3', "Bog'lanildi", 'Bajarildi', 'Hammasi']);
    expect(statusSegments(APPLICATION_STATUS, 0).map((s) => s.label)).toEqual(['Yangi', "Bog'lanildi", 'Yopildi', 'Hammasi']);
    expect(statusSegments(ORDER_STATUS, 0).map((s) => s.id)).toEqual(['new', 'contacted', 'done', 'all']);
  });
});

describe('filterInbox', () => {
  const items = [
    order({ id: 1, name: 'Ali Valiyev', phone: '+998 90 123-45-67', status: 'new' }),
    order({ id: 2, name: 'Olim Karimov', phone: '+998 (93) 555 00 11', status: 'contacted' }),
    order({ id: 3, name: 'Aliya', phone: '998977770000', status: 'done' }),
  ];
  const ids = (xs: ApiOrder[]) => xs.map((x) => x.id);
  it("holat bo'yicha; all — hammasi", () => {
    expect(ids(filterInbox(items, 'new', ''))).toEqual([1]);
    expect(ids(filterInbox(items, 'all', ''))).toEqual([1, 2, 3]);
  });
  it("ism bo'yicha, katta-kichik harfsiz, chetdagi bo'shliqsiz", () => {
    expect(ids(filterInbox(items, 'all', '  ALI '))).toEqual([1, 3]);
  });
  it("raqamli so'rov — telefon raqamlari bo'yicha (bo'shliq, tire, qavs, + farqsiz)", () => {
    expect(ids(filterInbox(items, 'all', '93 555'))).toEqual([2]);
    expect(ids(filterInbox(items, 'all', '+99890123'))).toEqual([1]);
    expect(ids(filterInbox(items, 'all', '(93)'))).toEqual([2]);
  });
  it('qidiruv holat filtri bilan birga ishlaydi', () => {
    expect(ids(filterInbox(items, 'new', 'aliya'))).toEqual([]);
  });
});

describe('telHref', () => {
  it("ko'rinish belgilari olib tashlaydi, + qoladi", () => {
    expect(telHref('+998 (90) 123-45-67')).toBe('tel:+998901234567');
    expect(telHref('90 123 45 67')).toBe('tel:901234567');
  });
});

describe('orderSource', () => {
  it('konsultatsiya, muddatli, naqd', () => {
    expect(orderSource(order({ source: 'consult' }))).toBe('Konsultatsiya');
    expect(orderSource(order({ paymentKind: 'installment' }))).toBe('Muddatli');
    expect(orderSource(order({ source: 'cart' }))).toBe('Naqd');
  });
});

describe('orderSummary', () => {
  it('bitta tovar — variant bilan', () => {
    expect(orderSummary(order())).toBe('iPhone 16 (128GB)');
  });
  it('birinchi tovar soni va qolgan qatorlar', () => {
    const o = order({
      items: [
        { productId: 'a', name: 'AirPods Pro', variantLabel: '', qty: 2, priceUzs: 3_000_000 },
        { productId: 'b', name: 'Case', variantLabel: '', qty: 1, priceUzs: 100_000 },
        { productId: 'c', name: 'Cable', variantLabel: '', qty: 1, priceUzs: 50_000 },
      ],
    });
    expect(orderSummary(o)).toBe('AirPods Pro ×2 + yana 2');
  });
  it("konsultatsiya — izoh (mavzular), bo'sh bo'lsa tire", () => {
    expect(orderSummary(order({ source: 'consult', items: [], note: 'Apple · PC' }))).toBe('Apple · PC');
    expect(orderSummary(order({ source: 'consult', items: [], note: '' }))).toBe('—');
  });
});

describe('orderTotal / itemsTotal', () => {
  const items: OrderItemInput[] = [
    { productId: 'a', name: 'A', variantLabel: '', qty: 2, priceUzs: 1_000_000 },
    { productId: 'b', name: 'B', variantLabel: '', qty: 1, priceUzs: 500_000 },
  ];
  it("naqd — tovarlar yig'indisi", () => {
    expect(itemsTotal(items)).toBe(2_500_000);
    expect(orderTotal(order({ items }))).toBe(2_500_000);
  });
  it("muddatli — totalUzs, bo'lmasa naqd yig'indi", () => {
    expect(orderTotal(order({ items, paymentKind: 'installment', totalUzs: 3_100_000 }))).toBe(3_100_000);
    expect(orderTotal(order({ items, paymentKind: 'installment', totalUzs: null }))).toBe(2_500_000);
  });
  it('konsultatsiya — null', () => {
    expect(orderTotal(order({ source: 'consult', items: [] }))).toBeNull();
  });
});
