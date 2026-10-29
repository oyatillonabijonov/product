import type { Route } from './+types/api.admin.logout';
import { json, updateAdminAuth } from '../../functions/lib/db';
import { clearedSessionCookie, isSecureRequest, randomSecretHex } from '../../functions/lib/auth';
import { requireAdmin } from './api.admin.guard';

export async function action({ request, context }: Route.ActionArgs) {
  const who = await requireAdmin(request, context.env);
  if (who instanceof Response) return who;
  // Sessiya cookie'si holatsiz HMAC token: brauzerdan o'chirish nusxalarni bekor qilmaydi.
  // session_secret aylantiriladi (parol almashgandagi kabi) — chiqarilgan hamma admin cookie'si,
  // shu jumladan boshqa qurilmalardagilari va ochiq /yuklash havolalari ham darhol o'ladi.
  await updateAdminAuth(context.env, { sessionSecret: randomSecretHex() });
  return json({ ok: true }, { headers: { 'set-cookie': clearedSessionCookie(isSecureRequest(request)) } });
}
