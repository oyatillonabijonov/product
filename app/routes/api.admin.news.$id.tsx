import type { Route } from './+types/api.admin.news.$id';
import { json, rowToNews, type NewsRow } from '../../functions/lib/db';
import { parseNewsInput } from '../../functions/lib/validate';
import { requireAdmin, parseBody } from './api.admin.guard';

export async function action({ request, context, params }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const id = String(params.id);

  if (request.method === 'PUT') {
    const n = parseBody({ ...(((await request.json().catch(() => null)) ?? {}) as object), id }, parseNewsInput);
    if (n instanceof Response) return n;
    await env.DB.prepare(
      'UPDATE news SET badge=?, badge_ru=?, tag=?, tag_ru=?, title=?, title_ru=?, text=?, text_ru=?, cta=?, cta_ru=?, link_url=?, image_url=?, sort_order=?, is_active=? WHERE id=?',
    )
      .bind(n.badge, n.badgeRu, n.tag, n.tagRu, n.title, n.titleRu, n.text, n.textRu, n.cta, n.ctaRu, n.linkUrl, n.imageUrl, n.sortOrder, n.isActive ? 1 : 0, id)
      .run();
    const row = await env.DB.prepare('SELECT * FROM news WHERE id = ?').bind(id).first<NewsRow>();
    if (!row) return json({ error: 'not_found' }, { status: 404 });
    return json(rowToNews(row));
  }

  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM news WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }

  return json({ error: 'method_not_allowed' }, { status: 405 });
}
