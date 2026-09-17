import type { Route } from './+types/api.admin.upload';
import { json } from '../../functions/lib/db';
import { requireAdmin } from './api.admin.guard';

const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
};

const MB = 1024 * 1024;
/** Rasm 5 MB gacha; video (yo'nalish cover'i) 40 MB gacha — spec §6. */
const maxSize = (type: string) => (type === 'video/mp4' ? 40 * MB : 5 * MB);

function isFile(obj: unknown): obj is { type: string; size: number; arrayBuffer(): Promise<ArrayBuffer> } {
  return typeof obj === 'object' && obj !== null && 'arrayBuffer' in obj;
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;

  // formData() butun body'ni xotiraga buferlaydi — undan OLDIN qo'pol chegara
  // (40 MB video + multipart overhead uchun zaxira).
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > 42 * MB) return json({ error: 'file_too_large' }, { status: 413 });

  const form = await request.formData();
  const file = form.get('file');
  if (!isFile(file)) return json({ error: 'file_required' }, { status: 400 });
  const ext = ALLOWED[file.type];
  if (!ext) return json({ error: 'unsupported_type' }, { status: 400 });
  if (file.size > maxSize(file.type)) return json({ error: 'file_too_large' }, { status: 400 });

  const key = `products/${crypto.randomUUID()}.${ext}`;
  await env.IMAGES.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });
  return json({ imageUrl: `/images/${key}` }, { status: 201 });
}
