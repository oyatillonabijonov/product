import type { Route } from './+types/api.admin.logout';
import { json } from '../../functions/lib/db';
import { clearedSessionCookie } from '../../functions/lib/auth';
import { requireAdmin } from './api.admin.guard';

export async function action({ request, context }: Route.ActionArgs) {
  const who = await requireAdmin(request, context.cloudflare.env);
  if (who instanceof Response) return who;
  return json({ ok: true }, { headers: { 'set-cookie': clearedSessionCookie() } });
}
