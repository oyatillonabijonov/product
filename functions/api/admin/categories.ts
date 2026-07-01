import type { Env } from '../../env';
import { json, rowToCategory, type CategoryRow } from '../../lib/db';
import { parseCategoryInput, ValidationError } from '../../lib/validate';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all<CategoryRow>();
  return json(results.map(rowToCategory));
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let input;
  try {
    input = parseCategoryInput(await request.json().catch(() => null));
  } catch (e) {
    if (e instanceof ValidationError) return json({ error: e.message }, { status: 400 });
    throw e;
  }
  await env.DB.prepare('INSERT INTO categories (id, name, icon_url, sort_order) VALUES (?, ?, ?, ?)')
    .bind(input.id, input.name, input.iconUrl, input.sortOrder)
    .run();
  const row = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(input.id).first<CategoryRow>();
  return json(row ? rowToCategory(row) : { error: 'insert_failed' }, { status: row ? 201 : 500 });
};
