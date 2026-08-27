import type { Route } from './+types/api.admin.brands';
import { json, rowToBrand, type BrandRow } from '../../functions/lib/db';
import { parseBrandInput } from '../../functions/lib/validate';
import { requireAdmin, parseBody } from './api.admin.guard';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const { results } = await env.DB.prepare('SELECT * FROM brands ORDER BY sort_order ASC').all<BrandRow>();
  return json(results.map(rowToBrand));
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;

  const input = parseBody(await request.json().catch(() => null), parseBrandInput);
  if (input instanceof Response) return input;
  try {
    await env.DB.prepare('INSERT INTO brands (id, name, slug, logo_url, sort_order) VALUES (?, ?, ?, ?, ?)')
      .bind(input.id, input.name, input.slug, input.logoUrl, input.sortOrder)
      .run();
  } catch {
    return json({ error: 'slug_taken' }, { status: 400 });
  }
  const row = await env.DB.prepare('SELECT * FROM brands WHERE id = ?').bind(input.id).first<BrandRow>();
  return json(row ? rowToBrand(row) : { error: 'insert_failed' }, { status: row ? 201 : 500 });
}
