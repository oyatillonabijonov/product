import type { Env } from '../../env';
import { json } from '../../lib/db';
import { getCookie, verifySession } from '../../lib/auth';

export const onRequest: PagesFunction<Env, string, { username: string }> = async (context) => {
  const url = new URL(context.request.url);
  if (url.pathname === '/api/admin/login') return context.next();

  const token = getCookie(context.request, 'session');
  const username = token
    ? await verifySession(token, context.env.SESSION_SECRET, Math.floor(Date.now() / 1000))
    : null;
  if (!username) return json({ error: 'unauthorized' }, { status: 401 });

  context.data.username = username;
  return context.next();
};
