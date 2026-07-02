import type { Env } from '../../functions/env';
import { json } from '../../functions/lib/db';
import { getCookie, verifySession } from '../../functions/lib/auth';

export async function requireAdmin(request: Request, env: Env): Promise<string | Response> {
  const token = getCookie(request, 'session');
  const username = token
    ? await verifySession(token, env.SESSION_SECRET, Math.floor(Date.now() / 1000))
    : null;
  if (!username) return json({ error: 'unauthorized' }, { status: 401 });
  return username;
}
