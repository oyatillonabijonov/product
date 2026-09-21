import type { Route } from './+types/api.admin.tokens.$id';
import { json } from '../../functions/lib/db';
import { requireAdmin } from './api.admin.guard';

/** Bekor qilish — qator o'chirilmaydi, `revoked_at` qo'yiladi (jurnal nomi bilan bog'liq qoladi). */
export async function action({ request, params, context }: Route.ActionArgs) {
  if (request.method !== 'DELETE') return json({ error: 'method_not_allowed' }, { status: 405 });
  const who = await requireAdmin(request, context.env);
  if (who instanceof Response) return who;
  await context.env.DB.prepare(
    'UPDATE admin_tokens SET revoked_at = unixepoch() WHERE id = ? AND revoked_at IS NULL',
  )
    .bind(Number(params.id))
    .run();
  return json({ ok: true });
}
