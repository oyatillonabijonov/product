import type { Route } from './+types/api.admin.orders';
import { json, loadOrderItemImages, rowToOrder, type OrderRow } from '../../functions/lib/db';
import { requireAdmin } from './api.admin.guard';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const { results } = await env.DB.prepare(
    'SELECT * FROM orders ORDER BY created_at DESC LIMIT 200',
  ).all<OrderRow>();
  const orders = results.map(rowToOrder);
  // Kanban kartasidagi tovar eskizlari: buyurtma nusxasida rasm yo'q — joriy `products.image_url`dan.
  const images = await loadOrderItemImages(env, orders);
  return json(orders.map((o) => {
    const own = Object.fromEntries(o.items.map((it) => [it.productId, images[it.productId]]).filter(([, v]) => v));
    return Object.keys(own).length ? { ...o, images: own } : o;
  }));
}
