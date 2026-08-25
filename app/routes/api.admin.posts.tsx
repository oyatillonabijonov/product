import type { Route } from './+types/api.admin.posts';
import { json, rowToPost, type PostRow } from '../../functions/lib/db';
import { parsePostInput, type PostInput } from '../../functions/lib/validate';
import { requireAdmin, parseBody } from './api.admin.guard';

// route moduldan qo'shimcha export qilinmaydi (RR v7 route API konvensiyasi) — lokal funksiya:
function postBindValues(p: PostInput): [string, string, string, string, string, string, string, string, string, string, number, number] {
  return [p.id, p.slug, p.title, p.titleRu, p.excerpt, p.excerptRu,
    p.content, p.contentRu, p.coverUrl, p.publishedAt, p.sortOrder, p.isActive ? 1 : 0];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const { results } = await env.DB.prepare(
    'SELECT * FROM posts ORDER BY published_at DESC, sort_order ASC, id ASC',
  ).all<PostRow>();
  return json(results.map(rowToPost));
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;

  const input = parseBody(await request.json().catch(() => null), parsePostInput);
  if (input instanceof Response) return input;
  try {
    await env.DB.prepare(
      'INSERT INTO posts (id, slug, title, title_ru, excerpt, excerpt_ru, content, content_ru, cover_url, published_at, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(...postBindValues(input)).run();
  } catch (e) {
    if (e instanceof Error && e.message.includes('UNIQUE')) return json({ error: 'slug_taken' }, { status: 400 });
    throw e;
  }
  const row = await env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(input.id).first<PostRow>();
  return json(row ? rowToPost(row) : { error: 'insert_failed' }, { status: row ? 201 : 500 });
}
