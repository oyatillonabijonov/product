import type { Route } from './+types/api.admin.login';
import { json, loadAdminAuth, reserveLoginAttempt, updateLoginThrottle } from '../../functions/lib/db';
import { createSession, isSecureRequest, sessionCookie, verifyPassword } from '../../functions/lib/auth';
import { readJson } from '../../functions/lib/body';

const TTL = 60 * 60 * 24 * 7; // 7 kun
/** Login va parol — bir necha yuz bayt; autentifikatsiyasiz endpoint katta tanani xotiraga yig'masin. */
const MAX_BODY = 8 * 1024;

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  const raw = await readJson(request, MAX_BODY);
  if (raw instanceof Response) return raw;
  const body = raw as { username?: string; password?: string } | null;
  if (!body || !body.username || !body.password) {
    return json({ error: 'missing_credentials' }, { status: 400 });
  }
  const auth = await loadAdminAuth(env);
  if (!auth) return json({ error: 'not_initialized' }, { status: 500 });

  const now = Math.floor(Date.now() / 1000);
  // Urinish parol tekshiruvidan oldin atomik band qilinadi (parallel taxminlar hisobni yo'qotmasin).
  const slot = await reserveLoginAttempt(env, now);
  if (!slot.ok) {
    return json(
      { error: 'too_many_attempts', retryAfter: slot.retryAfter },
      { status: 429, headers: { 'retry-after': String(slot.retryAfter) } },
    );
  }

  // Always run the (slow) password check even for a wrong username, so response timing
  // doesn't reveal whether the username exists.
  const passwordOk = await verifyPassword(body.password, auth.passwordSalt, auth.passwordHash);
  const ok = body.username === auth.username && passwordOk;
  if (!ok) return json({ error: 'invalid_credentials' }, { status: 401 });

  await updateLoginThrottle(env, 0, 0);
  const token = await createSession(auth.username, auth.sessionSecret, TTL, now);
  return json(
    { ok: true, defaultPassword: body.password === 'admin' },
    { headers: { 'set-cookie': sessionCookie(token, TTL, isSecureRequest(request)) } },
  );
}
