import type { Route } from './+types/api.admin.pages';
import { json, rowToPage, type PageRow } from '../../functions/lib/db';
import { parsePageInput, type PageInput } from '../../functions/lib/validate';
import { requireAdmin, parseBody } from './api.admin.guard';

// route moduldan qo'shimcha export qilinmaydi (RR v7 route API konvensiyasi) — lokal funksiya:
function pageBindValues(p: PageInput): [string, string, string, string, string, string, string, string, string, string, number, number] {
  return [p.id, p.slug, p.title.uz, p.title.ru, p.title.en, p.title.uzCyrl,
    p.content.uz, p.content.ru, p.content.en, p.content.uzCyrl, p.sortOrder, p.isActive ? 1 : 0];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const { results } = await env.DB.prepare('SELECT * FROM pages ORDER BY sort_order ASC, slug ASC').all<PageRow>();
  return json(results.map(rowToPage));
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;

  const input = parseBody(await request.json().catch(() => null), parsePageInput);
  if (input instanceof Response) return input;
  try {
    await env.DB.prepare(
      'INSERT INTO pages (id, slug, title_uz, title_ru, title_en, title_cyrl, content_uz, content_ru, content_en, content_cyrl, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(...pageBindValues(input)).run();
  } catch (e) {
    if (e instanceof Error && e.message.includes('UNIQUE')) return json({ error: 'slug_taken' }, { status: 400 });
    throw e;
  }
  const row = await env.DB.prepare('SELECT * FROM pages WHERE id = ?').bind(input.id).first<PageRow>();
  return json(row ? rowToPage(row) : { error: 'insert_failed' }, { status: row ? 201 : 500 });
}
