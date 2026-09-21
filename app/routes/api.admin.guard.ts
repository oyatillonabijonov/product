import type { Env } from '../../functions/env';
import { json, loadAdminAuth } from '../../functions/lib/db';
import { getCookie, verifySession } from '../../functions/lib/auth';
import { ValidationError } from '../../functions/lib/validate';
import { hashToken, tokenFromHeader } from '../../shared/mcp-auth';

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

/**
 * MCP tokeni bilan kirish (`Authorization: Bearer prod_…`).
 *
 * Token to'liq admin huquqiga ega (egasining qarori 2026-09-21), shuning uchun har bir
 * **yozuv** amali `admin_audit`ga tushadi: kim (token nomi), qaysi tool, qaysi yozuv.
 * Tool nomini MCP `X-MCP-Tool` sarlavhasida yuboradi; bo'lmasa metod va yo'l yoziladi.
 *
 * `kind='refresh'` rad etiladi: refresh token faqat `/token` da yangi access olish
 * uchun, u bilan admin API'ga kirib bo'lmaydi.
 */
async function adminFromToken(request: Request, env: Env, token: string): Promise<string | Response> {
  const row = await env.DB.prepare(
    "SELECT id, label, expires_at FROM admin_tokens WHERE token_hash = ? AND revoked_at IS NULL AND kind != 'refresh'",
  )
    .bind(await hashToken(token))
    .first<{ id: number; label: string; expires_at: number | null }>();
  const now = Math.floor(Date.now() / 1000);
  // `expires_at` tekshiruvi qaytarildi: OAuth access tokeni 30 kunlik muddat bilan
  // yoziladi, ya'ni ustun endi haqiqatan ishlatiladi (ilgari hech kim yozmagani uchun
  // tekshiruv o'lik kod deb olib tashlangan edi).
  if (!row || (row.expires_at !== null && row.expires_at < now)) {
    return json({ error: 'unauthorized' }, { status: 401 });
  }
  await env.DB.prepare('UPDATE admin_tokens SET last_used_at = ? WHERE id = ?').bind(now, row.id).run();
  if (request.method !== 'GET') {
    const url = new URL(request.url);
    const tool = (request.headers.get('x-mcp-tool') ?? `${request.method} ${url.pathname}`).slice(0, 60);
    await env.DB.prepare('INSERT INTO admin_audit (at, token_label, tool, target_id) VALUES (?, ?, ?, ?)')
      .bind(now, row.label, tool, url.pathname.split('/').pop() ?? null)
      .run();
  }
  return row.label;
}

export async function requireAdmin(request: Request, env: Env): Promise<string | Response> {
  // Bearer birinchi: MCP so'rovida cookie umuman bo'lmaydi.
  const bearer = tokenFromHeader(request.headers.get('authorization'));
  if (bearer) return adminFromToken(request, env, bearer);
  const token = getCookie(request, 'session');
  if (!token) return json({ error: 'unauthorized' }, { status: 401 });
  const auth = await loadAdminAuth(env);
  if (!auth) return json({ error: 'unauthorized' }, { status: 401 });
  const username = await verifySession(token, auth.sessionSecret, Math.floor(Date.now() / 1000));
  if (!username) return json({ error: 'unauthorized' }, { status: 401 });
  return username;
}
