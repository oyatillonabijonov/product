import type { Route } from './+types/api.admin.tokens.$id';
import { json } from '../../functions/lib/db';
import { tokenFromHeader } from '../../shared/mcp-auth';
import { requireAdmin } from './api.admin.guard';

/**
 * Bekor qilish — qator o'chirilmaydi, `revoked_at` qo'yiladi (jurnal nomi bilan bog'liq qoladi).
 *
 * `client_id` bor qatorda (OAuth konnektor) shu `client_id`ga tegishli **hamma** qator
 * bekor qilinadi — access ham, refresh ham. Aks holda «Bekor qilish» kill-switch bo'lmaydi:
 * konnektor refresh token bilan o'ziga yangi access tokenni yasab oladi.
 */
export async function action({ request, params, context }: Route.ActionArgs) {
  if (request.method !== 'DELETE') return json({ error: 'method_not_allowed' }, { status: 405 });
  // Token bilan token boshqarib bo'lmaydi: aks holda sizib ketgan token o'ziga
  // ikkinchisini yasab qo'yadi va «bekor qilish» kill-switch bo'lmay qoladi.
  if (tokenFromHeader(request.headers.get('authorization'))) {
    return json({ error: 'cookie_only' }, { status: 403 });
  }
  const who = await requireAdmin(request, context.env);
  if (who instanceof Response) return who;
  const id = Number(params.id);
  const row = await context.env.DB.prepare('SELECT client_id FROM admin_tokens WHERE id = ? AND revoked_at IS NULL')
    .bind(id)
    .first<{ client_id: string | null }>();
  if (row?.client_id) {
    await context.env.DB.prepare('UPDATE admin_tokens SET revoked_at = unixepoch() WHERE client_id = ? AND revoked_at IS NULL')
      .bind(row.client_id)
      .run();
  } else {
    await context.env.DB.prepare(
      'UPDATE admin_tokens SET revoked_at = unixepoch() WHERE id = ? AND revoked_at IS NULL',
    )
      .bind(id)
      .run();
  }
  return json({ ok: true });
}
