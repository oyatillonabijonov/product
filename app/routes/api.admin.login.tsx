import type { Route } from './+types/api.admin.login';
import { json, loadAdminAuth, updateLoginThrottle } from '../../functions/lib/db';
import { createSession, lockDelaySeconds, sessionCookie, verifyPassword } from '../../functions/lib/auth';

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

  const now = Math.floor(Date.now() / 1000);
  if (auth.lockUntil > now) {
    const retryAfter = auth.lockUntil - now;
    return json(
      { error: 'too_many_attempts', retryAfter },
      { status: 429, headers: { 'retry-after': String(retryAfter) } },
    );
  }

  // Always run the (slow) password check even for a wrong username, so response timing
  // doesn't reveal whether the username exists.
  const passwordOk = await verifyPassword(body.password, auth.passwordSalt, auth.passwordHash);
  const ok = body.username === auth.username && passwordOk;
  if (!ok) {
    const failed = auth.failedAttempts + 1;
    const delay = lockDelaySeconds(failed);
    await updateLoginThrottle(env, failed, delay > 0 ? now + delay : 0);
    return json({ error: 'invalid_credentials' }, { status: 401 });
  }

  if (auth.failedAttempts > 0 || auth.lockUntil > 0) await updateLoginThrottle(env, 0, 0);
  const token = await createSession(auth.username, auth.sessionSecret, TTL, now);
  return json(
    { ok: true, defaultPassword: body.password === 'admin' },
    { headers: { 'set-cookie': sessionCookie(token, TTL) } },
  );
}
