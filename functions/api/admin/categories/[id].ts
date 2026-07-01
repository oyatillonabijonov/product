import type { Env } from '../../../env';
import { json, rowToCategory, type CategoryRow } from '../../../lib/db';
import { parseCategoryInput, ValidationError } from '../../../lib/validate';

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = String(params.id);
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
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  const id = String(params.id);
  await env.DB.prepare('UPDATE products SET category_id = NULL WHERE category_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
  return json({ ok: true });
};
