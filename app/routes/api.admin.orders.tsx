import type { Route } from './+types/api.admin.orders';
import { json, rowToOrder, type OrderRow } from '../../functions/lib/db';
import { requireAdmin } from './api.admin.guard';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const { results } = await env.DB.prepare(
    'SELECT * FROM orders ORDER BY created_at DESC LIMIT 200',
  ).all<OrderRow>();
  return json(results.map(rowToOrder));
}
