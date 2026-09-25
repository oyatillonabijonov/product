import type { Route } from './+types/api.admin.customers';
import type { ApiAdminCustomer } from '../../shared/types';
import { json } from '../../functions/lib/db';
import { requireAdmin } from './api.admin.guard';

interface CustomerListRow {
  id: number; created_at: number; name: string; phone: string | null; email: string | null; avatar: string | null;
  google_sub: string | null; telegram_id: string | null; order_count: number; last_order_at: number | null;
}

/** Ro'yxatdan o'tgan mijozlar (admin → Buyurtmalar → Mijozlar): kirish usuli va buyurtmalar soni bilan, yangisi tepada. */
export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  // ponytail: hammasi bitta so'rovda, sahifalash klientda — mijozlar minglab bo'lsa LIMIT/OFFSET qo'shiladi.
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.created_at, c.name, c.phone, c.email, c.avatar, c.google_sub, c.telegram_id,
            COUNT(o.id) AS order_count, MAX(o.created_at) AS last_order_at
       FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC, c.id DESC`,
  ).all<CustomerListRow>();
  const body: ApiAdminCustomer[] = results.map((r) => ({
    id: r.id, createdAt: r.created_at, name: r.name, phone: r.phone, email: r.email, avatar: r.avatar,
    via: r.google_sub ? 'google' : r.telegram_id ? 'telegram' : null,
    orderCount: r.order_count, lastOrderAt: r.last_order_at,
  }));
  return json(body);
}
