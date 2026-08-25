import type { Route } from './+types/api.admin.posts.$id';
import { json, rowToPost, type PostRow } from '../../functions/lib/db';
import { parsePostInput } from '../../functions/lib/validate';
import { requireAdmin, parseBody } from './api.admin.guard';

export async function action({ request, context, params }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const id = String(params.id);

  if (request.method === 'PUT') {
    const input = parseBody({ ...(((await request.json().catch(() => null)) ?? {}) as object), id }, parsePostInput);
    if (input instanceof Response) return input;
    try {
      await env.DB.prepare(
        'UPDATE posts SET slug=?, title=?, title_ru=?, excerpt=?, excerpt_ru=?, content=?, content_ru=?, cover_url=?, published_at=?, sort_order=?, is_active=? WHERE id=?',
      ).bind(
        input.slug, input.title, input.titleRu, input.excerpt, input.excerptRu,
        input.content, input.contentRu, input.coverUrl, input.publishedAt,
        input.sortOrder, input.isActive ? 1 : 0, id,
      ).run();
    } catch (e) {
      if (e instanceof Error && e.message.includes('UNIQUE')) return json({ error: 'slug_taken' }, { status: 400 });
      throw e;
    }
    const row = await env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first<PostRow>();
    if (!row) return json({ error: 'not_found' }, { status: 404 });
    return json(rowToPost(row));
  }

  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }

  return json({ error: 'method_not_allowed' }, { status: 405 });
}
