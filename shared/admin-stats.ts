import type { ApiAdminStats } from './types';
import { TASHKENT_OFFSET_MS, tashkentDay } from './visits.ts';

/**
 * Admin statistikasining sof hisobi — `app/routes/api.admin.stats.tsx` faqat SQL o'qiydi va shu yerga beradi.
 * Vaqt Toshkentda (UTC+5): davr — bugunni qo'shib oxirgi `days` kun, oldingi davr — undan oldingi shuncha kun.
 */

const DAY_MS = 86_400_000;
export const STATS_DAYS = [7, 30, 90] as const;
export type StatsDays = (typeof STATS_DAYS)[number];

/** `?days=` — 7, 30 yoki 90; boshqa har qanday qiymat 30. */
export function parseStatsDays(raw: string | null): StatsDays {
  const n = Number(raw);
  return STATS_DAYS.find((d) => d === n) ?? 30;
}

/**
 * `?from=YYYY-MM-DD&to=YYYY-MM-DD` (kalendar) — davr oxiri va uzunligi; noto'g'ri, kelajakdagi yoki 366 kundan
 * uzun oraliq — `null` (route `?days=`ga qaytadi). `endMs` — oxirgi kunning ichidagi vaqt (`statsWindow`ga).
 */
export function parseStatsRange(from: string | null, to: string | null, nowMs: number): { endMs: number; days: number } | null {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!from || !to || !re.test(from) || !re.test(to)) return null;
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b) || a > b || to > tashkentDay(nowMs)) return null;
  const days = (b - a) / DAY_MS + 1;
  return days > 366 ? null : { endMs: b - TASHKENT_OFFSET_MS + DAY_MS / 2, days };
}

export interface StatsWindow {
  days: number;
  /** Davr oxiri (oxirgi kundan keyingi yarim tun), unix soniya; `endDay` — oxirgi kun. */
  endSec: number;
  endDay: string;
  /** Davr boshi — `days - 1` kun oldingi Toshkent yarim tuni, unix soniya. */
  startSec: number;
  prevStartSec: number;
  startDay: string;
  prevStartDay: string;
  /** Davr kunlari `YYYY-MM-DD`, eskisidan boshlab, aynan `days` ta. */
  dayKeys: string[];
}

export function statsWindow(nowMs: number, days: number): StatsWindow {
  const todayStartMs = Date.parse(`${tashkentDay(nowMs)}T00:00:00Z`) - TASHKENT_OFFSET_MS;
  const startMs = todayStartMs - (days - 1) * DAY_MS;
  const prevStartMs = startMs - days * DAY_MS;
  const dayKeys = Array.from({ length: days }, (_, i) => tashkentDay(startMs + i * DAY_MS));
  return {
    days, endSec: (todayStartMs + DAY_MS) / 1000, endDay: tashkentDay(todayStartMs),
    startSec: startMs / 1000, prevStartSec: prevStartMs / 1000,
    startDay: tashkentDay(startMs), prevStartDay: tashkentDay(prevStartMs), dayKeys,
  };
}

/** Oldingi davrga nisbatan o'zgarish, butun %; oldingisi 0 — `null` (foizda aytib bo'lmaydi), ikkalasi 0 — 0. */
export function pct(cur: number, prev: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null;
  return Math.round(((cur - prev) / prev) * 100);
}

/** `orders` qatori — route shu ustunlarni o'qiydi. */
export interface StatsOrderRow {
  id: number;
  created_at: number;
  name: string;
  phone: string;
  status: string;
  source: string;
  payment_kind: string;
  items_json: string;
}

export interface StatsItem {
  productId: string;
  name: string;
  qty: number;
}

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** `items_json` → tovarlar; buzilgan JSON yoki massiv bo'lmasa — bo'sh. Narx o'qilmaydi — statistika summa ko'rsatmaydi. */
export function parseOrderItems(json: string): StatsItem[] {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  return raw.filter((it): it is Record<string, unknown> => typeof it === 'object' && it !== null).map((it) => ({
    productId: typeof it.productId === 'string' ? it.productId : '',
    name: typeof it.name === 'string' ? it.name : '',
    qty: num(it.qty),
  }));
}

/** Buyurtmalardagi tovar id'lari (takrorsiz) — route ularning nomi, rasmi va yo'nalishini o'qiydi. */
export function orderProductIds(rows: StatsOrderRow[]): string[] {
  return [...new Set(rows.flatMap((r) => parseOrderItems(r.items_json).map((it) => it.productId)).filter(Boolean))];
}

/** Tovarning hozirgi holati (`products` jadvalidan); o'chirilgan tovar bu xaritada yo'q. */
export interface StatsProduct {
  name: string;
  imageUrl: string | null;
  categoryId: string | null;
}

export interface StatsInput {
  window: StatsWindow;
  /** `created_at >= window.prevStartSec`. */
  orders: StatsOrderRow[];
  /** Oxirgi 6 ta, davrdan qat'i nazar. */
  recentOrders: StatsOrderRow[];
  /** Mijozlarning `created_at`i, `>= window.prevStartSec`. */
  customerCreatedAt: number[];
  customersTotal: number;
  /** Ish arizalarining `created_at`i, `>= window.prevStartSec`. */
  applicationCreatedAt: number[];
  /** `site_visits`, `day >= window.prevStartDay`. */
  visits: { day: string; views: number; visitors: number }[];
  topViewed: ApiAdminStats['topViewed'];
  /** `site_visits`dagi eng birinchi kun (davrdan qat'i nazar). */
  visitsSince: string | null;
  products: Map<string, StatsProduct>;
  /** Hamma yo'nalishlar `sort_order` tartibida. */
  categories: { id: string; name: string }[];
  catalog: ApiAdminStats['catalog'];
}

type Series = ApiAdminStats['series'][number];
type Totals = ApiAdminStats['totals'];

const qtyOf = (items: StatsItem[]): number => items.reduce((s, it) => s + it.qty, 0);

export function buildStats(input: StatsInput): ApiAdminStats {
  const { window: w, products } = input;
  /** 'cur' — davrda, 'prev' — oldingi davrda, null — undan oldin yoki davr oxiridan keyin. */
  const periodOf = (sec: number): 'cur' | 'prev' | null => (sec >= w.endSec ? null : sec >= w.startSec ? 'cur' : sec >= w.prevStartSec ? 'prev' : null);
  const dayOf = (sec: number): string => tashkentDay(sec * 1000);

  const series = new Map<string, Series>(w.dayKeys.map((day) => [day, {
    day, orders: 0, consults: 0, visitors: 0, views: 0, customers: 0, items: 0,
  }]));
  const totals: Totals = {
    orders: 0, ordersPrev: 0, consults: 0, consultsPrev: 0, visitors: 0, visitorsPrev: 0, views: 0, viewsPrev: 0,
    customersNew: 0, customersNewPrev: 0, customersTotal: input.customersTotal,
    itemsRequested: 0, itemsRequestedPrev: 0, applications: 0, applicationsPrev: 0,
  };
  const status = { new: 0, contacted: 0, done: 0 };
  const payment = { cash: 0, installment: 0 };
  const sources = { product: 0, cart: 0, consult: 0 };
  const hours = Array.from({ length: 24 }, () => 0);
  const top = new Map<string, ApiAdminStats['topProducts'][number]>();
  const cats = new Map(input.categories.map((c) => [c.id, { id: c.id, name: c.name, requests: 0, requestsPrev: 0 }]));

  for (const row of input.orders) {
    const period = periodOf(row.created_at);
    if (period === null) continue;
    const consult = row.source === 'consult';
    const items = consult ? [] : parseOrderItems(row.items_json);

    if (period === 'prev') {
      if (consult) totals.consultsPrev++;
      else {
        totals.ordersPrev++;
        totals.itemsRequestedPrev += qtyOf(items);
        // Bitta buyurtma yo'nalish uchun bir marta sanaladi.
        const prevCats = new Set(items.map((it) => products.get(it.productId)?.categoryId ?? ''));
        for (const id of prevCats) {
          const cat = cats.get(id);
          if (cat) cat.requestsPrev++;
        }
      }
      continue;
    }

    if (Object.hasOwn(status, row.status)) status[row.status as keyof typeof status]++;
    if (Object.hasOwn(sources, row.source)) sources[row.source as keyof typeof sources]++;
    hours[new Date(row.created_at * 1000 + TASHKENT_OFFSET_MS).getUTCHours()]++;
    const day = series.get(dayOf(row.created_at));

    if (consult) {
      totals.consults++;
      if (day) day.consults++;
      continue;
    }
    totals.orders++;
    totals.itemsRequested += qtyOf(items);
    if (day) {
      day.orders++;
      day.items += qtyOf(items);
    }
    if (Object.hasOwn(payment, row.payment_kind)) payment[row.payment_kind as keyof typeof payment]++;

    // Bitta buyurtma tovar va yo'nalish uchun bir marta «so'rov» — bir nechta varianti bo'lsa ham.
    const seenProducts = new Set<string>();
    const seenCats = new Set<string>();
    for (const it of items) {
      const p = products.get(it.productId);
      if (it.productId) {
        const entry = top.get(it.productId) ?? {
          productId: it.productId, name: p?.name ?? it.name, imageUrl: p?.imageUrl ?? null, requests: 0, qty: 0,
        };
        if (!seenProducts.has(it.productId)) entry.requests++;
        entry.qty += it.qty;
        top.set(it.productId, entry);
        seenProducts.add(it.productId);
      }
      const cat = cats.get(p?.categoryId ?? '');
      if (cat) {
        if (!seenCats.has(cat.id)) cat.requests++;
        seenCats.add(cat.id);
      }
    }
  }

  for (const sec of input.customerCreatedAt) {
    const period = periodOf(sec);
    if (period === 'prev') totals.customersNewPrev++;
    if (period !== 'cur') continue;
    totals.customersNew++;
    const day = series.get(dayOf(sec));
    if (day) day.customers++;
  }

  for (const sec of input.applicationCreatedAt) {
    const period = periodOf(sec);
    if (period === 'cur') totals.applications++;
    if (period === 'prev') totals.applicationsPrev++;
  }

  for (const v of input.visits) {
    if (v.day > w.endDay) continue;
    if (v.day >= w.startDay) {
      totals.visitors += v.visitors;
      totals.views += v.views;
      const day = series.get(v.day);
      if (day) {
        day.visitors += v.visitors;
        day.views += v.views;
      }
    } else if (v.day >= w.prevStartDay) {
      totals.visitorsPrev += v.visitors;
      totals.viewsPrev += v.views;
    }
  }

  const recentOrders = input.recentOrders.map((row) => {
    const items = row.source === 'consult' ? [] : parseOrderItems(row.items_json);
    const first = items[0];
    return {
      id: row.id, name: row.name, phone: row.phone, createdAt: row.created_at, status: row.status, source: row.source,
      itemCount: items.length,
      firstItem: first ? first.name : null,
      imageUrl: first ? products.get(first.productId)?.imageUrl ?? null : null,
    };
  });

  return {
    days: w.days,
    series: [...series.values()],
    totals,
    status,
    payment,
    sources,
    topProducts: [...top.values()]
      .sort((a, b) => b.requests - a.requests || b.qty - a.qty || a.name.localeCompare(b.name))
      .slice(0, 6),
    topViewed: input.topViewed,
    categories: [...cats.values()],
    catalog: input.catalog,
    recentOrders,
    hours,
    visitsSince: input.visitsSince,
  };
}
