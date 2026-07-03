import type { Route } from './+types/api.admin.banners.$id';
import { json, rowToBanner, type BannerRow } from '../../functions/lib/db';
import { parseBannerInput, ValidationError } from '../../functions/lib/validate';
import { requireAdmin } from './api.admin.guard';

export async function action({ request, context, params }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const id = String(params.id);

  if (request.method === 'PUT') {
    let input;
    try {
      input = parseBannerInput({ ...(((await request.json().catch(() => null)) ?? {}) as object), id });
    } catch (e) {
      if (e instanceof ValidationError) return json({ error: e.message }, { status: 400 });
      throw e;
    }
    await env.DB.prepare('UPDATE banners SET image_url=?, link_url=?, alt_text=?, sort_order=?, is_active=? WHERE id=?')
      .bind(input.imageUrl, input.linkUrl, input.altText, input.sortOrder, input.isActive ? 1 : 0, id)
      .run();
    const row = await env.DB.prepare('SELECT * FROM banners WHERE id = ?').bind(id).first<BannerRow>();
    if (!row) return json({ error: 'not_found' }, { status: 404 });
    return json(rowToBanner(row));
  }

  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM banners WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }

  return json({ error: 'method_not_allowed' }, { status: 405 });
}
