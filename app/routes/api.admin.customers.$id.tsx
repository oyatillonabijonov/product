import type { Route } from './+types/api.admin.customers.$id';
import { ADMIN_CUSTOMER_SQL, json, rowToAdminCustomer, rowToOrder, type AdminCustomerRow, type OrderRow } from '../../functions/lib/db';
import { requireAdmin } from './api.admin.guard';

/** Bitta mijoz va uning hamma buyurtmalari (yangisi tepada) — admin → Mijozlar → mijoz sahifasi. */
export async function loader({ request, context, params }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return json({ error: 'not_found' }, { status: 404 });
  const row = await env.DB.prepare(`${ADMIN_CUSTOMER_SQL} WHERE c.id = ? GROUP BY c.id`).bind(id).first<AdminCustomerRow>();
  if (!row) return json({ error: 'not_found' }, { status: 404 });
  const { results } = await env.DB.prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC, id DESC')
    .bind(id).all<OrderRow>();
  return json({ customer: rowToAdminCustomer(row), orders: results.map(rowToOrder) });
}
