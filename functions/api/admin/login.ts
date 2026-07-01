import type { Env } from '../../env';
import { json } from '../../lib/db';
import { createSession, sessionCookie, sha256Hex } from '../../lib/auth';

const TTL = 60 * 60 * 24 * 7; // 7 kun

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json().catch(() => null)) as
    | { username?: string; password?: string }
    | null;
  if (!body || !body.username || !body.password) {
    return json({ error: 'missing_credentials' }, { status: 400 });
  }
  const hash = await sha256Hex(body.password);
  if (body.username !== env.ADMIN_USERNAME || hash !== env.ADMIN_PASSWORD_HASH) {
    return json({ error: 'invalid_credentials' }, { status: 401 });
  }
  const token = await createSession(body.username, env.SESSION_SECRET, TTL, Math.floor(Date.now() / 1000));
  return json({ ok: true }, { headers: { 'set-cookie': sessionCookie(token, TTL) } });
};
