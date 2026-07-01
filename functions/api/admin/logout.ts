import type { Env } from '../../env';
import { json } from '../../lib/db';
import { clearedSessionCookie } from '../../lib/auth';

export const onRequestPost: PagesFunction<Env> = async () => {
  return json({ ok: true }, { headers: { 'set-cookie': clearedSessionCookie() } });
};
