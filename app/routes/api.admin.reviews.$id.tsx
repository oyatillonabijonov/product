import type { Route } from './+types/api.admin.reviews.$id';
import { json, recomputeRating } from '../../functions/lib/db';
import { requireAdmin } from './api.admin.guard';

export async function action({ request, context, params }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  if (request.method !== 'DELETE') return json({ error: 'method_not_allowed' }, { status: 405 });
  const id = String(params.id);
  const row = await env.DB.prepare('SELECT product_id FROM product_reviews WHERE id = ?').bind(id).first<{ product_id: string }>();
  if (!row) return json({ error: 'not_found' }, { status: 404 });
  await env.DB.prepare('DELETE FROM product_reviews WHERE id = ?').bind(id).run();
  await recomputeRating(env, row.product_id);
  return json({ ok: true });
}
