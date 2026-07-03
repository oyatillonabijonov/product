import type { Route } from './+types/api.admin.account';
import { json, loadAdminAuth, updateAdminAuth } from '../../functions/lib/db';
import { hashPassword, randomSaltHex, verifyPassword } from '../../functions/lib/auth';
import { requireAdmin } from './api.admin.guard';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const auth = await loadAdminAuth(env);
  return json({ username: auth?.username ?? '' });
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;

  const auth = await loadAdminAuth(env);
  if (!auth) return json({ error: 'not_initialized' }, { status: 500 });

  const body = (await request.json().catch(() => null)) as
    | { currentPassword?: string; username?: string; newPassword?: string }
    | null;
  if (!body || !body.currentPassword) {
    return json({ error: 'current_password_required' }, { status: 400 });
  }
  if (!(await verifyPassword(body.currentPassword, auth.passwordSalt, auth.passwordHash))) {
    return json({ error: 'invalid_current_password' }, { status: 401 });
  }

  const fields: { username?: string; passwordHash?: string; passwordSalt?: string } = {};

  const username = body.username?.trim();
  if (username && username !== auth.username) {
    if (username.length < 3) return json({ error: 'username_too_short' }, { status: 400 });
    fields.username = username;
  }

  if (body.newPassword) {
    if (body.newPassword.length < 6) return json({ error: 'password_too_short' }, { status: 400 });
    const salt = randomSaltHex();
    fields.passwordSalt = salt;
    fields.passwordHash = await hashPassword(body.newPassword, salt);
  }

  if (fields.username === undefined && fields.passwordHash === undefined) {
    return json({ error: 'nothing_to_update' }, { status: 400 });
  }

  await updateAdminAuth(env, fields);
  return json({ ok: true });
}
