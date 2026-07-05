import type { Route } from './+types/api.admin.pages.$id';
import { json, rowToPage, type PageRow } from '../../functions/lib/db';
import { parsePageInput } from '../../functions/lib/validate';
import { requireAdmin, parseBody } from './api.admin.guard';

export async function action({ request, context, params }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const id = String(params.id);

  if (request.method === 'PUT') {
    const input = parseBody({ ...(((await request.json().catch(() => null)) ?? {}) as object), id }, parsePageInput);
    if (input instanceof Response) return input;
    try {
      await env.DB.prepare(
        'UPDATE pages SET slug=?, title_uz=?, title_ru=?, title_en=?, title_cyrl=?, content_uz=?, content_ru=?, content_en=?, content_cyrl=?, sort_order=?, is_active=? WHERE id=?',
      ).bind(input.slug, input.title.uz, input.title.ru, input.title.en, input.title.uzCyrl,
        input.content.uz, input.content.ru, input.content.en, input.content.uzCyrl,
        input.sortOrder, input.isActive ? 1 : 0, id).run();
    } catch (e) {
      if (e instanceof Error && e.message.includes('UNIQUE')) return json({ error: 'slug_taken' }, { status: 400 });
      throw e;
    }
    const row = await env.DB.prepare('SELECT * FROM pages WHERE id = ?').bind(id).first<PageRow>();
    if (!row) return json({ error: 'not_found' }, { status: 404 });
    return json(rowToPage(row));
  }

  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM pages WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }

  return json({ error: 'method_not_allowed' }, { status: 405 });
}
