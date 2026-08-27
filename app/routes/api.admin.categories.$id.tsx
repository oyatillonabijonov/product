import type { Route } from './+types/api.admin.categories.$id';
import { json, rowToCategory, type CategoryRow } from '../../functions/lib/db';
import { parseCategoryInput } from '../../functions/lib/validate';
import { requireAdmin, parseBody } from './api.admin.guard';

export async function action({ request, context, params }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const id = String(params.id);

  if (request.method === 'PUT') {
    const input = parseBody({ ...((await request.json().catch(() => null)) ?? {}) as object, id }, parseCategoryInput);
    if (input instanceof Response) return input;
    await env.DB.prepare(
      'UPDATE categories SET name=?, name_ru=?, icon_url=?, icon=?, cover_url=?, cover_lede=?, cover_lede_ru=?, sort_order=? WHERE id=?',
    )
      .bind(input.name, input.nameRu, input.iconUrl, input.icon, input.coverUrl, input.coverLede, input.coverLedeRu, input.sortOrder, id)
      .run();
    const row = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first<CategoryRow>();
    if (!row) return json({ error: 'not_found' }, { status: 404 });
    return json(rowToCategory(row));
  }

  if (request.method === 'DELETE') {
    await env.DB.batch([
      env.DB.prepare('UPDATE products SET category_id = NULL WHERE category_id = ?').bind(id),
      env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id),
    ]);
    return json({ ok: true });
  }

  return json({ error: 'method_not_allowed' }, { status: 405 });
}
