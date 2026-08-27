import type { Route } from './+types/api.admin.account';
import { json, loadAdminAuth, updateAdminAuth } from '../../functions/lib/db';
import {
  createSession,
  hashPassword,
  randomSaltHex,
  randomSecretHex,
  sessionCookie,
  verifyPassword,
} from '../../functions/lib/auth';
import { requireAdmin } from './api.admin.guard';

const TTL = 60 * 60 * 24 * 7; // 7 kun — api.admin.login bilan bir xil

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const auth = await loadAdminAuth(env);
  return json({ username: auth?.username ?? '', adminGoogleEmail: auth?.adminGoogleEmail ?? '' });
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;

  const auth = await loadAdminAuth(env);
  if (!auth) return json({ error: 'not_initialized' }, { status: 500 });

  const body = (await request.json().catch(() => null)) as
    | { currentPassword?: string; username?: string; newPassword?: string; adminGoogleEmail?: string }
    | null;
  if (!body || !body.currentPassword) {
    return json({ error: 'current_password_required' }, { status: 400 });
  }
  if (!(await verifyPassword(body.currentPassword, auth.passwordSalt, auth.passwordHash))) {
    return json({ error: 'invalid_current_password' }, { status: 401 });
  }

  const fields: { username?: string; passwordHash?: string; passwordSalt?: string; sessionSecret?: string; adminGoogleEmail?: string } = {};

  const username = body.username?.trim();
  if (username && username !== auth.username) {
    if (username.length < 3) return json({ error: 'username_too_short' }, { status: 400 });
    fields.username = username;
    // Login o'zgarganda ham secret aylantiriladi — eski token'lar (eski login bilan
    // imzolangan) tirik qolmasin (login shubhali holatda almashtirilishi mumkin).
    fields.sessionSecret = randomSecretHex();
  }

  if (body.newPassword) {
    if (body.newPassword.length < 8) return json({ error: 'password_too_short' }, { status: 400 });
    const salt = randomSaltHex();
    fields.passwordSalt = salt;
    fields.passwordHash = await hashPassword(body.newPassword, salt);
    // Parol almashganda session_secret ham aylantiriladi — o'g'irlangan/eski cookie'lar
    // shu zahoti bekor bo'ladi.
    fields.sessionSecret = randomSecretHex();
  }

  // Google admin email — bo'sh = o'chirish; aks holda oddiy email formati.
  if (body.adminGoogleEmail !== undefined) {
    const em = body.adminGoogleEmail.trim().toLowerCase();
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return json({ error: 'email_invalid' }, { status: 400 });
    if (em !== auth.adminGoogleEmail) fields.adminGoogleEmail = em;
  }

  if (fields.username === undefined && fields.passwordHash === undefined && fields.adminGoogleEmail === undefined) {
    return json({ error: 'nothing_to_update' }, { status: 400 });
  }

  await updateAdminAuth(env, fields);

  // Rotatsiya joriy klientning cookie'sini ham bekor qiladi — yangi secret bilan
  // qayta imzolangan sessiya beramiz, admin qayta login qilmasin.
  if (fields.sessionSecret) {
    const token = await createSession(
      fields.username ?? auth.username,
      fields.sessionSecret,
      TTL,
      Math.floor(Date.now() / 1000),
    );
    return json({ ok: true }, { headers: { 'set-cookie': sessionCookie(token, TTL) } });
  }
  return json({ ok: true });
}
