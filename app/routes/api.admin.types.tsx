import type { Route } from './+types/api.admin.types';
import { json, rowToApiType, TYPE_LIST_SQL, type TypeListRow } from '../../functions/lib/db';
import { parseTypeInput } from '../../functions/lib/validate';
import { requireAdmin, parseBody } from './api.admin.guard';

/** Tovar turlari: ro'yxat (mahsulot soni bilan) va yaratish. Kalit (category_id, id). */
export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const { results } = await env.DB.prepare(`${TYPE_LIST_SQL} ORDER BY t.category_id ASC, t.sort_order ASC, t.id ASC`).all<TypeListRow>();
  return json(results.map(rowToApiType));
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });
  const input = parseBody(await request.json().catch(() => null), parseTypeInput);
  if (input instanceof Response) return input;
  const cat = await env.DB.prepare('SELECT 1 AS ok FROM categories WHERE id = ?').bind(input.categoryId).first<{ ok: number }>();
  if (!cat) return json({ error: 'categoryId_invalid' }, { status: 400 });
  const dup = await env.DB.prepare('SELECT 1 AS ok FROM product_types WHERE category_id = ? AND id = ?').bind(input.categoryId, input.id).first<{ ok: number }>();
  if (dup) return json({ error: 'id_taken' }, { status: 400 });
  await env.DB.prepare(
    'INSERT INTO product_types (id, category_id, label, label_ru, icon_url, billz_aliases, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).bind(input.id, input.categoryId, input.label, input.labelRu, input.iconUrl, JSON.stringify(input.billzAliases), input.sortOrder).run();
  const row = await env.DB.prepare(`${TYPE_LIST_SQL} WHERE t.category_id = ? AND t.id = ?`).bind(input.categoryId, input.id).first<TypeListRow>();
  if (!row) return json({ error: 'insert_failed' }, { status: 500 });
  return json(rowToApiType(row), { status: 201 });
}
