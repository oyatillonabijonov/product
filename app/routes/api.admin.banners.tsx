import type { Route } from './+types/api.admin.banners';
import { json, rowToBanner, type BannerRow } from '../../functions/lib/db';
import { parseBannerInput } from '../../functions/lib/validate';
import { requireAdmin, parseBody } from './api.admin.guard';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const { results } = await env.DB.prepare('SELECT * FROM banners ORDER BY sort_order ASC').all<BannerRow>();
  return json(results.map(rowToBanner));
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;

  const input = parseBody(await request.json().catch(() => null), parseBannerInput);
  if (input instanceof Response) return input;
  await env.DB.prepare('INSERT INTO banners (id, image_url, link_url, alt_text, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(input.id, input.imageUrl, input.linkUrl, input.altText, input.sortOrder, input.isActive ? 1 : 0)
    .run();
  const row = await env.DB.prepare('SELECT * FROM banners WHERE id = ?').bind(input.id).first<BannerRow>();
  return json(row ? rowToBanner(row) : { error: 'insert_failed' }, { status: row ? 201 : 500 });
}
