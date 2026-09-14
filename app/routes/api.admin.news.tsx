import type { Route } from './+types/api.admin.news';
import { json, rowToNews, type NewsRow } from '../../functions/lib/db';
import { parseNewsInput } from '../../functions/lib/validate';
import { requireAdmin, parseBody } from './api.admin.guard';

const COLS = 'id, badge, badge_ru, tag, tag_ru, title, title_ru, text, text_ru, cta, cta_ru, link_url, image_url, sort_order, is_active';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const { results } = await env.DB.prepare('SELECT * FROM news ORDER BY sort_order ASC').all<NewsRow>();
  return json(results.map(rowToNews));
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const n = parseBody(await request.json().catch(() => null), parseNewsInput);
  if (n instanceof Response) return n;
  await env.DB.prepare(`INSERT INTO news (${COLS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(n.id, n.badge, n.badgeRu, n.tag, n.tagRu, n.title, n.titleRu, n.text, n.textRu, n.cta, n.ctaRu, n.linkUrl, n.imageUrl, n.sortOrder, n.isActive ? 1 : 0)
    .run();
  const row = await env.DB.prepare('SELECT * FROM news WHERE id = ?').bind(n.id).first<NewsRow>();
  return json(row ? rowToNews(row) : { error: 'insert_failed' }, { status: row ? 201 : 500 });
}
