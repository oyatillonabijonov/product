import type { Route } from './+types/api.admin.dashboard';
import type { ApiDashboard } from '../../shared/types';
import { json } from '../../functions/lib/db';
import { requireAdmin } from './api.admin.guard';

/** Bosh sahifa kartalari; qobiq sidebar badge'i (yangi buyurtma + ariza) uchun ham shuni oladi. */
export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;

  const count = async (sql: string): Promise<number> =>
    (await env.DB.prepare(sql).first<{ n: number }>())?.n ?? 0;

  const [needsImage, newOrders, newApplications, settings, billz] = await Promise.all([
    count("SELECT COUNT(*) AS n FROM products WHERE billz_id IS NOT NULL AND billz_stock > 0 AND (image_url IS NULL OR image_url = '')"),
    count("SELECT COUNT(*) AS n FROM orders WHERE status = 'new'"),
    count("SELECT COUNT(*) AS n FROM job_applications WHERE status = 'new'"),
    env.DB.prepare('SELECT usd_to_uzs, usd_markup_percent FROM settings WHERE id = 1')
      .first<{ usd_to_uzs: number; usd_markup_percent: number | null }>(),
    context.billz.status(),
  ]);

  const body: ApiDashboard = {
    needsImage,
    newOrders,
    newApplications,
    billz,
    usd: { rate: settings?.usd_to_uzs ?? 0, auto: settings?.usd_markup_percent != null },
  };
  return json(body);
}
