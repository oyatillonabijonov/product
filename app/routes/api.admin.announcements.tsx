import type { Route } from './+types/api.admin.announcements';
import { json, broadcastAnnouncement } from '../../functions/lib/db';
import { parseAnnouncementInput } from '../../functions/lib/validate';
import { parseBody, requireAdmin } from './api.admin.guard';

// Admin e'loni — hamma mijozga bildirishnoma. Yuborilgach qaytarib bo'lmaydi
// (har mijozga alohida qator), shuning uchun admin ekranida tasdiq so'raladi.
export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });
  const input = parseBody(await request.json().catch(() => null), parseAnnouncementInput);
  if (input instanceof Response) return input;
  const sent = await broadcastAnnouncement(env, input);
  return json({ ok: true, sent });
}
