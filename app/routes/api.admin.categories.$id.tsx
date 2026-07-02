import type { Route } from './+types/api.admin.categories.$id';
import { json, rowToCategory, type CategoryRow } from '../../functions/lib/db';
import { parseCategoryInput, ValidationError } from '../../functions/lib/validate';
import { requireAdmin } from './api.admin.guard';

export async function action({ request, context, params }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const id = String(params.id);

  if (request.method === 'PUT') {
    let input;
    try {
      input = parseCategoryInput({ ...((await request.json().catch(() => null)) ?? {}) as object, id });
    } catch (e) {
      if (e instanceof ValidationError) return json({ error: e.message }, { status: 400 });
      throw e;
    }
    await env.DB.prepare('UPDATE categories SET name=?, icon_url=?, sort_order=? WHERE id=?')
      .bind(input.name, input.iconUrl, input.sortOrder, id)
      .run();
    const row = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first<CategoryRow>();
    if (!row) return json({ error: 'not_found' }, { status: 404 });
    return json(rowToCategory(row));
  }

  if (request.method === 'DELETE') {
    await env.DB.prepare('UPDATE products SET category_id = NULL WHERE category_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }

  return json({ error: 'method_not_allowed' }, { status: 405 });
}
