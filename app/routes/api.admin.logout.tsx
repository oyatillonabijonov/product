import type { Route } from './+types/api.admin.logout';
import { json } from '../../functions/lib/db';
import { clearedSessionCookie } from '../../functions/lib/auth';

export async function action(_args: Route.ActionArgs) {
  return json({ ok: true }, { headers: { 'set-cookie': clearedSessionCookie() } });
}
