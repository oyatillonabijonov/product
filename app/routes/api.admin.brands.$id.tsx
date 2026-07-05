import type { Route } from './+types/api.admin.brands.$id';
import { json, rowToBrand, type BrandRow } from '../../functions/lib/db';
import { parseBrandInput } from '../../functions/lib/validate';
import { requireAdmin, parseBody } from './api.admin.guard';

export async function action({ request, context, params }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const id = String(params.id);

  if (request.method === 'PUT') {
    const input = parseBody({ ...((await request.json().catch(() => null)) ?? {}) as object, id }, parseBrandInput);
    if (input instanceof Response) return input;
    try {
      await env.DB.prepare('UPDATE brands SET name=?, slug=?, logo_url=?, sort_order=? WHERE id=?')
        .bind(input.name, input.slug, input.logoUrl, input.sortOrder, id)
        .run();
    } catch {
      return json({ error: 'slug_taken' }, { status: 400 });
    }
    const row = await env.DB.prepare('SELECT * FROM brands WHERE id = ?').bind(id).first<BrandRow>();
    if (!row) return json({ error: 'not_found' }, { status: 404 });
    return json(rowToBrand(row));
  }

  if (request.method === 'DELETE') {
    await env.DB.prepare('UPDATE products SET brand_id = NULL WHERE brand_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM brands WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }

  return json({ error: 'method_not_allowed' }, { status: 405 });
}
