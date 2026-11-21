import { describe, expect, it } from 'vitest';
import {
  buildStats, orderProductIds, parseOrderItems, parseStatsDays, parseStatsRange, pct, statsWindow,
  type StatsInput, type StatsOrderRow, type StatsProduct,
} from './admin-stats';

// 2026-11-19 15:00 Toshkent.
const NOW = Date.parse('2026-11-19T10:00:00Z');
/** Toshkent vaqti → unix soniya. */
const at = (local: string): number => (Date.parse(`${local}Z`) - 5 * 3600_000) / 1000;

let nextId = 1;
const order = (local: string, over: Partial<StatsOrderRow> & { items?: unknown[] } = {}): StatsOrderRow => ({
  id: nextId++, created_at: at(local), name: 'Ali', phone: '+998901234567', status: 'new', source: 'product',
  payment_kind: 'cash', items_json: JSON.stringify(over.items ?? []), ...over,
});
const item = (productId: string, qty: number, priceUzs: number, name = productId) =>
  ({ productId, name, variantLabel: '', qty, priceUzs });

const PRODUCTS = new Map<string, StatsProduct>([
  ['a', { name: 'iPhone 17', imageUrl: '/a.webp', categoryId: 'apple' }],
  ['b', { name: 'RTX 5090', imageUrl: null, categoryId: 'pc' }],
  ['c', { name: 'AirPods', imageUrl: '/c.webp', categoryId: 'apple' }],
]);

const input = (over: Partial<StatsInput> = {}, days = 7): StatsInput => ({
  window: statsWindow(NOW, days),
  orders: [], recentOrders: [], customerCreatedAt: [], customersTotal: 0, applicationCreatedAt: [], visits: [],
  topViewed: [], visitsSince: null, products: PRODUCTS,
  categories: [{ id: 'apple', name: 'Apple' }, { id: 'pc', name: 'PC' }, { id: 'audio', name: 'Audio' }],
  catalog: { total: 0, onSite: 0, hidden: 0, needsImage: 0, outOfStock: 0, onOrder: 0 },
  ...over,
});

describe('parseStatsDays', () => {
  it('faqat 7/30/90, qolgani 30', () => {
    expect(parseStatsDays('7')).toBe(7);
    expect(parseStatsDays('90')).toBe(90);
    expect(parseStatsDays(null)).toBe(30);
    expect(parseStatsDays('14')).toBe(30);
    expect(parseStatsDays('abc')).toBe(30);
  });
});

describe('statsWindow — Toshkent kunlari', () => {
  it('davr bugunni qo\'shib oxirgi N kun, oldingi davr undan oldin', () => {
    const w = statsWindow(NOW, 7);
    expect(w.dayKeys).toEqual(['2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19']);
    expect(w.startDay).toBe('2026-11-13');
    expect(w.prevStartDay).toBe('2026-11-06');
    expect(w.startSec).toBe(at('2026-11-13T00:00:00'));
    expect(w.prevStartSec).toBe(at('2026-11-06T00:00:00'));
  });
  it('Toshkentda yarim tundan keyin (UTC hali kecha) — yangi kun', () => {
    const w = statsWindow(Date.parse('2026-11-18T19:30:00Z'), 1);
    expect(w.dayKeys).toEqual(['2026-11-19']);
  });
});

describe('parseStatsRange — kalendar oralig\'i', () => {
  it('oraliq oxiri va uzunligi; davrdan keyingi yozuv sanalmaydi', () => {
    const r = parseStatsRange('2026-11-01', '2026-11-10', NOW)!;
    expect(r.days).toBe(10);
    const w = statsWindow(r.endMs, r.days);
    expect(w.startDay).toBe('2026-11-01');
    expect(w.endDay).toBe('2026-11-10');
    expect(w.prevStartDay).toBe('2026-10-22');
    const s = buildStats(input({
      window: w,
      orders: [order('2026-11-05T12:00:00'), order('2026-11-11T09:00:00')],
      visits: [{ day: '2026-11-10', views: 5, visitors: 2 }, { day: '2026-11-12', views: 9, visitors: 9 }],
    }));
    expect(s.totals.orders).toBe(1);
    expect(s.totals.visitors).toBe(2);
  });
  it('noto\'g\'ri, teskari, kelajakdagi va 366 kundan uzun — null', () => {
    expect(parseStatsRange('2026-11-10', '2026-11-01', NOW)).toBeNull();
    expect(parseStatsRange('2026-11-01', '2026-11-20', NOW)).toBeNull();
    expect(parseStatsRange('2024-01-01', '2026-11-19', NOW)).toBeNull();
    expect(parseStatsRange('abc', '2026-11-19', NOW)).toBeNull();
    expect(parseStatsRange(null, null, NOW)).toBeNull();
    expect(parseStatsRange('2026-11-19', '2026-11-19', NOW)?.days).toBe(1);
  });
});

describe('pct', () => {
  it('o\'zgarish foizi, oldingisi 0 bo\'lsa null', () => {
    expect(pct(15, 10)).toBe(50);
    expect(pct(5, 10)).toBe(-50);
    expect(pct(0, 0)).toBe(0);
    expect(pct(3, 0)).toBeNull();
  });
});

describe('parseOrderItems', () => {
  it('buzilgan JSON va massiv bo\'lmagan qiymat — bo\'sh', () => {
    expect(parseOrderItems('{')).toEqual([]);
    expect(parseOrderItems('{"a":1}')).toEqual([]);
    expect(parseOrderItems('[null, 5, {"productId":"a","name":"x","qty":"2","priceUzs":100}]'))
      .toEqual([{ productId: 'a', name: 'x', qty: 0 }]);
  });
  it('orderProductIds — takrorsiz, bo\'sh id\'siz', () => {
    expect(orderProductIds([
      order('2026-11-19T10:00:00', { items: [item('a', 1, 1), item('', 1, 1)] }),
      order('2026-11-19T10:00:00', { items: [item('a', 1, 1), item('b', 1, 1)] }),
      order('2026-11-19T10:00:00', { items_json: 'x' }),
    ])).toEqual(['a', 'b']);
  });
});

describe('buildStats', () => {
  it('davr va oldingi davr ajratiladi, undan oldingisi tashlanadi', () => {
    const s = buildStats(input({
      orders: [
        order('2026-11-19T09:00:00', { items: [item('a', 1, 100)] }),
        order('2026-11-13T00:00:00', { items: [item('a', 2, 100)] }), // davrning birinchi soniyasi
        order('2026-11-12T23:59:59', { items: [item('b', 1, 1000)] }), // oldingi davr oxiri
        order('2026-11-06T00:00:00', { items: [item('b', 1, 500)] }),
        order('2026-11-05T23:59:59', { items: [item('b', 9, 9999)] }), // hisobdan tashqarida
      ],
    }));
    expect(s.totals.orders).toBe(2);
    expect(s.totals.ordersPrev).toBe(2);
    expect(s.totals.itemsRequested).toBe(3);
    expect(s.totals.itemsRequestedPrev).toBe(2);
  });

  it('konsultatsiya buyurtma va talabga kirmaydi, lekin holat/manba/soatda bor', () => {
    const s = buildStats(input({
      orders: [
        order('2026-11-19T09:00:00', { source: 'consult', status: 'contacted', items_json: '[]' }),
        order('2026-11-19T09:30:00', { source: 'cart', status: 'done', payment_kind: 'installment', items: [item('a', 1, 100)] }),
        order('2026-11-10T09:00:00', { source: 'consult' }),
      ],
    }));
    expect(s.totals.orders).toBe(1);
    expect(s.totals.consults).toBe(1);
    expect(s.totals.consultsPrev).toBe(1);
    expect(s.totals.itemsRequested).toBe(1);
    expect(s.sources).toEqual({ product: 0, cart: 1, consult: 1 });
    expect(s.status).toEqual({ new: 0, contacted: 1, done: 1 });
    expect(s.payment).toEqual({ cash: 0, installment: 1 });
    expect(s.hours[9]).toBe(2);
  });

  it('buzilgan items_json — dona 0, buyurtma baribir sanaladi', () => {
    const s = buildStats(input({ orders: [order('2026-11-19T09:00:00', { items_json: 'not json' })] }));
    expect(s.totals.orders).toBe(1);
    expect(s.totals.itemsRequested).toBe(0);
    expect(s.topProducts).toEqual([]);
  });

  it('eng ko\'p so\'ralganlar: avval buyurtmalar soni, keyin dona; bitta buyurtmadagi ikki variant — bitta so\'rov', () => {
    const s = buildStats(input({
      orders: [
        order('2026-11-19T09:00:00', { items: [item('b', 5, 10)] }),
        order('2026-11-18T09:00:00', { items: [item('a', 1, 100), item('a', 1, 120)] }),
        order('2026-11-17T09:00:00', { items: [item('a', 1, 100), item('c', 1, 50)] }),
        order('2026-11-16T09:00:00', { items: [item('c', 3, 50)] }),
        order('2026-11-15T09:00:00', { items: [item('gone', 1, 7, 'Eski tovar')] }),
      ],
    }));
    expect(s.topProducts.map((p) => [p.productId, p.requests, p.qty])).toEqual([
      ['c', 2, 4], ['a', 2, 3], ['b', 1, 5], ['gone', 1, 1],
    ]);
    expect(s.topProducts[1]).toMatchObject({ name: 'iPhone 17', imageUrl: '/a.webp' });
    // O'chirilgan tovar — buyurtmadagi nomi bilan.
    expect(s.topProducts[3]).toMatchObject({ name: 'Eski tovar', imageUrl: null });
  });

  it('yo\'nalishlar: hammasi tartibda, nollar bilan; buyurtmalar soni va oldingi davr', () => {
    const s = buildStats(input({
      orders: [
        order('2026-11-19T09:00:00', { items: [item('a', 1, 100), item('c', 2, 10)] }),
        order('2026-11-18T09:00:00', { items: [item('b', 1, 1000)] }),
        order('2026-11-08T09:00:00', { items: [item('a', 1, 70)] }),
      ],
    }));
    expect(s.categories).toEqual([
      { id: 'apple', name: 'Apple', requests: 1, requestsPrev: 1 },
      { id: 'pc', name: 'PC', requests: 1, requestsPrev: 0 },
      { id: 'audio', name: 'Audio', requests: 0, requestsPrev: 0 },
    ]);
  });

  it('series: aynan N kun, bo\'sh kunlar nol, tashriflar va mijozlar kunlarga tushadi', () => {
    const s = buildStats(input({
      orders: [
        order('2026-11-19T23:59:00', { items: [item('a', 1, 100)] }),
        order('2026-11-15T00:10:00', { source: 'consult' }),
      ],
      customerCreatedAt: [at('2026-11-19T01:00:00'), at('2026-11-10T01:00:00')],
      customersTotal: 42,
      applicationCreatedAt: [at('2026-11-14T12:00:00'), at('2026-11-07T12:00:00'), at('2026-11-01T12:00:00')],
      visits: [
        { day: '2026-11-19', views: 30, visitors: 10 },
        { day: '2026-11-13', views: 5, visitors: 2 },
        { day: '2026-11-12', views: 8, visitors: 4 },
        { day: '2026-11-06', views: 1, visitors: 1 },
      ],
    }));
    expect(s.series).toHaveLength(7);
    expect(s.series.map((d) => d.day)).toEqual(statsWindow(NOW, 7).dayKeys);
    expect(s.series[6]).toEqual({ day: '2026-11-19', orders: 1, consults: 0, visitors: 10, views: 30, customers: 1, items: 1 });
    expect(s.series[2]).toMatchObject({ day: '2026-11-15', consults: 1, orders: 0 });
    expect(s.series[1]).toEqual({ day: '2026-11-14', orders: 0, consults: 0, visitors: 0, views: 0, customers: 0, items: 0 });
    expect(s.totals).toMatchObject({
      visitors: 12, views: 35, visitorsPrev: 5, viewsPrev: 9,
      customersNew: 1, customersNewPrev: 1, customersTotal: 42, applications: 1, applicationsPrev: 1,
    });
  });

  it('soatlar Toshkent vaqtida, 24 ta', () => {
    const s = buildStats(input({
      orders: [
        order('2026-11-19T00:05:00'), order('2026-11-18T23:55:00'), order('2026-11-18T23:00:00', { source: 'consult' }),
      ],
    }));
    expect(s.hours).toHaveLength(24);
    expect(s.hours[0]).toBe(1);
    expect(s.hours[23]).toBe(2);
    expect(s.hours.reduce((a, b) => a + b, 0)).toBe(3);
  });

  it('oxirgi murojaatlar: birinchi tovar, rasm va qatorlar soni', () => {
    const recent = [
      order('2026-11-19T09:00:00', { items: [item('a', 2, 100, 'iPhone 17 256GB'), item('b', 1, 50)] }),
      order('2026-11-19T08:00:00', { source: 'consult', items_json: '[]' }),
    ];
    const s = buildStats(input({ recentOrders: recent }));
    expect(s.recentOrders[0]).toMatchObject({ itemCount: 2, firstItem: 'iPhone 17 256GB', imageUrl: '/a.webp' });
    expect(s.recentOrders[1]).toMatchObject({ source: 'consult', itemCount: 0, firstItem: null, imageUrl: null });
  });
});
