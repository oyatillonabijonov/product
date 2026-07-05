import type { Env } from '../../functions/env';
import { json, loadAdminAuth } from '../../functions/lib/db';
import { getCookie, verifySession } from '../../functions/lib/auth';
import { ValidationError } from '../../functions/lib/validate';

/**
 * Body'ni parse qiladi; ValidationError'ni 400 Response'ga aylantiradi.
 * Chaqiruvchi `if (x instanceof Response) return x;` bilan tekshiradi (requireAdmin kabi).
 */
export function parseBody<T>(body: unknown, parse: (b: unknown) => T): T | Response {
  try {
    return parse(body);
  } catch (e) {
    if (e instanceof ValidationError) return json({ error: e.message }, { status: 400 });
    throw e;
  }
}

export async function requireAdmin(request: Request, env: Env): Promise<string | Response> {
  const token = getCookie(request, 'session');
  if (!token) return json({ error: 'unauthorized' }, { status: 401 });
  const auth = await loadAdminAuth(env);
  if (!auth) return json({ error: 'unauthorized' }, { status: 401 });
  const username = await verifySession(token, auth.sessionSecret, Math.floor(Date.now() / 1000));
  if (!username) return json({ error: 'unauthorized' }, { status: 401 });
  return username;
}
