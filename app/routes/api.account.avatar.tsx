import type { Route } from './+types/api.account.avatar';
import { currentCustomerId } from '../../functions/lib/customer-auth';
import { readBytes } from '../../functions/lib/body';
import { createLimiter } from '../../functions/lib/rate-limit';
import { sniffType } from '../../shared/image-magic';
import { avatarPhotoUrl } from '../../shared/avatar';

/** Brauzer rasmni 256 px ga kichraytirib yuboradi (~20 KB) — 1 MB zaxira bilan yetadi. */
const MAX_BODY = 1024 * 1024;
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
/** Bitta mijozdan 10 daqiqada 10 ta rasm. */
const allowUpload = createLimiter(10, 10 * 60 * 1000);

/**
 * Profil rasmini yuklash (kabinet). Tana — rasmning o'zi (multipart emas): baytlar sanab o'qiladi.
 * Faqat faylni saqlab manzilini qaytaradi; profilga yozish forma «Saqlash» tugmasi orqali (`api.account`).
 * ponytail: yuklab, saqlamay ketilgan rasm diskda qoladi (~20 KB) — ko'paysa `avatar-*` fayllarini
 * `customers.avatar` bilan solishtirib tozalaydigan vazifa qo'shiladi.
 */
export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  const id = await currentCustomerId(request, env);
  if (!id) return Response.json({ error: 'unauthorized' }, { status: 401 });
  if (!allowUpload(String(id))) return Response.json({ error: 'too_many' }, { status: 429 });

  const bytes = await readBytes(request, MAX_BODY);
  if (bytes instanceof Response) return bytes;
  // Mijoz aytgan turga emas, baytlarga qaraladi (`api.admin.upload` bilan bir qoida).
  const type = sniffType(bytes);
  const ext = type ? EXT[type] : undefined;
  if (!type || !ext) return Response.json({ error: 'unsupported_type' }, { status: 400 });

  const rand = [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const url = avatarPhotoUrl(id, rand, ext);
  await env.IMAGES.put(url.slice('/images/'.length), bytes.buffer as ArrayBuffer, { httpMetadata: { contentType: type } });
  return Response.json({ avatarUrl: url }, { status: 201 });
}
