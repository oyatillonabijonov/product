import type { Route } from './+types/api.admin.account';
import { json, loadAdminAuth, reserveLoginAttempt, updateAdminAuth, updateLoginThrottle } from '../../functions/lib/db';
import {
  createSession,
  hashPassword,
  randomSaltHex,
  randomSecretHex,
  isSecureRequest,
  sessionCookie,
  verifyPassword,
} from '../../functions/lib/auth';
import { requireAdmin } from './api.admin.guard';
import { tokenFromHeader } from '../../shared/mcp-auth';

const TTL = 60 * 60 * 24 * 7; // 7 kun — api.admin.login bilan bir xil

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  if (tokenFromHeader(request.headers.get('authorization'))) {
    return json({ error: 'cookie_only' }, { status: 403 });
  }
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const auth = await loadAdminAuth(env);
  return json({ username: auth?.username ?? '', adminGoogleEmail: auth?.adminGoogleEmail ?? '' });
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  // Faqat cookie bilan (api.admin.tokens kabi): aks holda sizib ketgan MCP token parolni
  // taxmin qilib, javobda cookie sessiyasini olib qo'yardi — tokenni bekor qilish foydasiz bo'lardi.
  if (tokenFromHeader(request.headers.get('authorization'))) {
    return json({ error: 'cookie_only' }, { status: 403 });
  }
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
  // Joriy parol tekshiruvi login bilan bitta qulf hisoblagichidan o'tadi — aks holda bu
  // endpoint cheklovsiz parol taxmin qilish eshigi bo'lardi.
  const slot = await reserveLoginAttempt(env, Math.floor(Date.now() / 1000));
  if (!slot.ok) {
    return json(
      { error: 'too_many_attempts', retryAfter: slot.retryAfter },
      { status: 429, headers: { 'retry-after': String(slot.retryAfter) } },
    );
  }
  if (!(await verifyPassword(body.currentPassword, auth.passwordSalt, auth.passwordHash))) {
    // 403, 401 emas: sessiya tirik, faqat qayta tasdiq xato. 401 bo'lsa `api.ts` sahifani
    // qayta yuklab yuboradi va egasi xato xabarini ko'rmaydi.
    return json({ error: 'invalid_current_password' }, { status: 403 });
  }
  await updateLoginThrottle(env, 0, 0);

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
  // Parol almashsa mijoz sessiya siri ham aylantiriladi: u admin sozlamalarida turadi va
  // ilgari sizib chiqqan bo'lsa, eski nusxa bilan mijoz cookie'larini yasab bo'lmasin
  // (hamma mijoz qayta kiradi).
  if (fields.passwordHash !== undefined) {
    await env.DB.prepare('UPDATE site_config SET customer_session_secret = ? WHERE id = 1').bind(randomSecretHex()).run();
  }

  // Rotatsiya joriy klientning cookie'sini ham bekor qiladi — yangi secret bilan
  // qayta imzolangan sessiya beramiz, admin qayta login qilmasin.
  if (fields.sessionSecret) {
    const token = await createSession(
      fields.username ?? auth.username,
      fields.sessionSecret,
      TTL,
      Math.floor(Date.now() / 1000),
    );
    return json({ ok: true }, { headers: { 'set-cookie': sessionCookie(token, TTL, isSecureRequest(request)) } });
  }
  return json({ ok: true });
}
