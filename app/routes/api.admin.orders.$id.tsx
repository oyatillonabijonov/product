import type { Route } from './+types/api.admin.orders.$id';
import { json } from '../../functions/lib/db';
import { requireAdmin } from './api.admin.guard';

export async function action({ request, params, context }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  if (request.method !== 'PATCH') return json({ error: 'method_not_allowed' }, { status: 405 });
  const body = (await request.json().catch(() => null)) as { status?: string } | null;
  const status = body?.status;
  if (status !== 'new' && status !== 'contacted' && status !== 'done') {
    return json({ error: 'status_invalid' }, { status: 400 });
  }
  await env.DB.prepare('UPDATE orders SET status = ? WHERE id = ?')
    .bind(status, Number(params.id))
    .run();
  return json({ ok: true });
}
