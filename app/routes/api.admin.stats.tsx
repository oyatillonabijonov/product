import type { Route } from './+types/api.admin.stats';
import type { ApiAdminStats } from '../../shared/types';
import { json } from '../../functions/lib/db';
import { ON_ORDER_SQL } from '../../shared/on-order';
import { buildStats, orderProductIds, parseStatsDays, parseStatsRange, statsWindow, type StatsOrderRow, type StatsProduct } from '../../shared/admin-stats';
import { requireAdmin } from './api.admin.guard';

const ORDER_COLS = 'id, created_at, name, phone, status, source, payment_kind, items_json';

/** Bosh sahifa grafiklari: `?from=&to=` (kalendar) yoki `?days=7|30|90` (boshqasi — 30). Hisob `shared/admin-stats.ts`da, bu yerda faqat o'qish. */
export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;

  const q = new URL(request.url).searchParams;
  const range = parseStatsRange(q.get('from'), q.get('to'), Date.now());
  const w = range ? statsWindow(range.endMs, range.days) : statsWindow(Date.now(), parseStatsDays(q.get('days')));
  const all = async <T,>(sql: string, ...values: unknown[]): Promise<T[]> =>
    (await env.DB.prepare(sql).bind(...values).all<T>()).results;

  const [orders, recentOrders, customers, customersTotal, applications, visits, visitsSince, topViewed, categories, catalog] = await Promise.all([
    all<StatsOrderRow>(`SELECT ${ORDER_COLS} FROM orders WHERE created_at >= ?`, w.prevStartSec),
    all<StatsOrderRow>(`SELECT ${ORDER_COLS} FROM orders ORDER BY created_at DESC, id DESC LIMIT 6`),
    all<{ created_at: number }>('SELECT created_at FROM customers WHERE created_at >= ?', w.prevStartSec),
    env.DB.prepare('SELECT COUNT(*) AS n FROM customers').first<{ n: number }>(),
    all<{ created_at: number }>('SELECT created_at FROM job_applications WHERE created_at >= ?', w.prevStartSec),
    all<{ day: string; views: number; visitors: number }>('SELECT day, views, visitors FROM site_visits WHERE day >= ?', w.prevStartDay),
    env.DB.prepare('SELECT MIN(day) AS day FROM site_visits').first<{ day: string | null }>(),
    all<ApiAdminStats['topViewed'][number]>(
      `SELECT v.product_id AS productId, p.name AS name, NULLIF(p.image_url, '') AS imageUrl, SUM(v.views) AS views
       FROM product_views v JOIN products p ON p.id = v.product_id
       WHERE v.day >= ? AND v.day <= ? GROUP BY v.product_id ORDER BY views DESC, p.name LIMIT 6`,
      w.startDay, w.endDay,
    ),
    all<{ id: string; name: string }>('SELECT id, name FROM categories ORDER BY sort_order, id'),
    // Ta'riflar boshqa joylardagidek: saytda — `is_active`, rasm kerak — bosh sahifa kartasi, qoldiq 0 — Billz.
    env.DB.prepare(
      `SELECT COUNT(*) AS total,
         COALESCE(SUM(is_active = 1), 0) AS onSite,
         COALESCE(SUM(is_active <> 1), 0) AS hidden,
         COALESCE(SUM(billz_id IS NOT NULL AND (image_url IS NULL OR image_url = '')), 0) AS needsImage,
         COALESCE(SUM(billz_id IS NOT NULL AND billz_stock = 0), 0) AS outOfStock,
         COALESCE(SUM(is_active = 1 AND ${ON_ORDER_SQL}), 0) AS onOrder
       FROM products`,
    ).first<ApiAdminStats['catalog']>(),
  ]);

  // Buyurtmadagi tovarlarning hozirgi nomi, rasmi va yo'nalishi — bitta so'rovda (`json_each`, parametr chegarasiz).
  const ids = orderProductIds([...orders, ...recentOrders]);
  const productRows = ids.length === 0 ? [] : await all<{ id: string; name: string; image_url: string | null; category_id: string | null }>(
    'SELECT id, name, image_url, category_id FROM products WHERE id IN (SELECT value FROM json_each(?))',
    JSON.stringify(ids),
  );
  const products = new Map<string, StatsProduct>(productRows.map((r) => [
    r.id, { name: r.name, imageUrl: r.image_url || null, categoryId: r.category_id },
  ]));

  const body: ApiAdminStats = buildStats({
    window: w,
    orders,
    recentOrders,
    customerCreatedAt: customers.map((r) => r.created_at),
    customersTotal: customersTotal?.n ?? 0,
    applicationCreatedAt: applications.map((r) => r.created_at),
    visits,
    visitsSince: visitsSince?.day ?? null,
    topViewed,
    products,
    categories,
    catalog: catalog ?? { total: 0, onSite: 0, hidden: 0, needsImage: 0, outOfStock: 0, onOrder: 0 },
  });
  return json(body);
}
