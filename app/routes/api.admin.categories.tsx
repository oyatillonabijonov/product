import type { Route } from './+types/api.admin.categories';
import { json, rowToCategory, type CategoryRow } from '../../functions/lib/db';
import { parseCategoryInput } from '../../functions/lib/validate';
import { requireAdmin, parseBody } from './api.admin.guard';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const { results } = await env.DB.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all<CategoryRow>();
  return json(results.map(rowToCategory));
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;

  const input = parseBody(await request.json().catch(() => null), parseCategoryInput);
  if (input instanceof Response) return input;
  await env.DB.prepare('INSERT INTO categories (id, name, icon_url, icon, sort_order) VALUES (?, ?, ?, ?, ?)')
    .bind(input.id, input.name, input.iconUrl, input.icon, input.sortOrder)
    .run();
  const row = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(input.id).first<CategoryRow>();
  return json(row ? rowToCategory(row) : { error: 'insert_failed' }, { status: row ? 201 : 500 });
}
