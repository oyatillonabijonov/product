import type { Route } from './+types/api.admin.customers';
import { ADMIN_CUSTOMER_SQL, json, rowToAdminCustomer, type AdminCustomerRow } from '../../functions/lib/db';
import { requireAdmin } from './api.admin.guard';

/** Ro'yxatdan o'tgan mijozlar (admin → Buyurtmalar → Mijozlar): kirish usuli va buyurtmalar soni bilan, yangisi tepada. */
export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  // ponytail: hammasi bitta so'rovda, sahifalash klientda — mijozlar minglab bo'lsa LIMIT/OFFSET qo'shiladi.
  const { results } = await env.DB.prepare(
    `${ADMIN_CUSTOMER_SQL} GROUP BY c.id ORDER BY c.created_at DESC, c.id DESC`,
  ).all<AdminCustomerRow>();
  return json(results.map(rowToAdminCustomer));
}
