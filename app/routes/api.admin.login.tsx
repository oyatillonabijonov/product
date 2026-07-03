import type { Route } from './+types/api.admin.login';
import { json, loadAdminAuth } from '../../functions/lib/db';
import { createSession, sessionCookie, verifyPassword } from '../../functions/lib/auth';

const TTL = 60 * 60 * 24 * 7; // 7 kun

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const body = (await request.json().catch(() => null)) as
    | { username?: string; password?: string }
    | null;
  if (!body || !body.username || !body.password) {
    return json({ error: 'missing_credentials' }, { status: 400 });
  }
  const auth = await loadAdminAuth(env);
  if (!auth) return json({ error: 'not_initialized' }, { status: 500 });
  const ok =
    body.username === auth.username &&
    (await verifyPassword(body.password, auth.passwordSalt, auth.passwordHash));
  if (!ok) return json({ error: 'invalid_credentials' }, { status: 401 });
  const token = await createSession(auth.username, auth.sessionSecret, TTL, Math.floor(Date.now() / 1000));
  return json({ ok: true }, { headers: { 'set-cookie': sessionCookie(token, TTL) } });
}
