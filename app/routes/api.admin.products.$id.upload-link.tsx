import type { Route } from './+types/api.admin.products.$id.upload-link';
import { json, loadAdminAuth } from '../../functions/lib/db';
import { createUploadToken, UPLOAD_TTL } from '../../functions/lib/upload-link';
import { requireAdmin } from './api.admin.guard';

/**
 * Bir martalik rasm yuklash havolasi (spec 2026-09-24 §8) — MCP `image_upload_link` shuni chaqiradi.
 * Manzil so'rovdan: MCP o'z saytini `PUBLIC_URL` orqali chaqiradi, ya'ni host — saytning haqiqiy domeni.
 */
export async function action({ request, context, params }: Route.ActionArgs) {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const id = String(params.id);
  const product = await env.DB.prepare('SELECT id FROM products WHERE id = ?').bind(id).first<{ id: string }>();
  if (!product) return json({ error: 'not_found' }, { status: 404 });
  const auth = await loadAdminAuth(env);
  if (!auth) return json({ error: 'not_initialized' }, { status: 500 });
  const now = Math.floor(Date.now() / 1000);
  const token = await createUploadToken(id, auth.sessionSecret, now);
  return json({ url: `${new URL(request.url).origin}/yuklash/${token}`, expiresAt: now + UPLOAD_TTL });
}
