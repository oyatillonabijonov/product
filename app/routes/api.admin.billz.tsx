import type { Route } from './+types/api.admin.billz';
import { json } from '../../functions/lib/db';
import { requireAdmin } from './api.admin.guard';

/**
 * Billz sinxronizatsiyasi: holat, do'konlar ro'yxati, qo'lda ishga tushirish.
 * Faqat admin. Runner `server/index.ts`da yaratiladi va `context.billz` orqali keladi.
 */
export async function loader({ request, context }: Route.LoaderArgs) {
  const who = await requireAdmin(request, context.env);
  if (who instanceof Response) return who;
  if (new URL(request.url).searchParams.get('shops')) {
    try {
      return json(await context.billz.shops());
    } catch (err) {
      const notConfigured = err instanceof Error && err.message === 'not_configured';
      return json({ error: notConfigured ? 'not_configured' : 'billz_auth' }, { status: notConfigured ? 400 : 502 });
    }
  }
  return json(await context.billz.status());
}

export async function action({ request, context }: Route.ActionArgs) {
  const who = await requireAdmin(request, context.env);
  if (who instanceof Response) return who;
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });
  const body = (await request.json().catch(() => ({}))) as { mode?: string };
  const r = await context.billz.run(body.mode === 'full' ? 'full' : 'delta');
  if (r === 'started') return json({ started: true }, { status: 202 });
  return json({ error: r }, { status: r === 'sync_running' ? 409 : 400 });
}
