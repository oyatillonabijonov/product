import type { Route } from './+types/api.admin.orders';
import { json, loadOrderItemImages, rowToOrder, type OrderRow } from '../../functions/lib/db';
import { requireAdmin } from './api.admin.guard';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  // `?counts=1` — holatlar bo'yicha aniq sanoq (ro'yxat «Bajarildi»ni 200 ta bilan cheklaydi, sanoq esa hammasini).
  if (new URL(request.url).searchParams.has('counts')) {
    const { results: rows } = await env.DB.prepare('SELECT status, COUNT(*) AS n FROM orders GROUP BY status').all<{ status: string; n: number }>();
    const n = (s: string) => rows.find((r) => r.status === s)?.n ?? 0;
    return json({ new: n('new'), contacted: n('contacted'), done: n('done') });
  }
  // Yopilmagan (yangi, bog'lanilgan) buyurtmalarning hammasi — kanbanda birortasi ham tushib qolmasin;
  // bajarilganlardan oxirgi 200 tasi.
  const { results } = await env.DB.prepare(
    `SELECT * FROM (SELECT * FROM orders WHERE status <> 'done')
     UNION ALL
     SELECT * FROM (SELECT * FROM orders WHERE status = 'done' ORDER BY created_at DESC, id DESC LIMIT 200)
     ORDER BY created_at DESC, id DESC`,
  ).all<OrderRow>();
  const orders = results.map(rowToOrder);
  // Kanban kartasidagi tovar eskizlari: buyurtma nusxasida rasm yo'q — joriy `products.image_url`dan.
  const images = await loadOrderItemImages(env, orders);
  return json(orders.map((o) => {
    const own = Object.fromEntries(o.items.map((it) => [it.productId, images[it.productId]]).filter(([, v]) => v));
    return Object.keys(own).length ? { ...o, images: own } : o;
  }));
}
