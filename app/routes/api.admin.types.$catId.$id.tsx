import type { Route } from './+types/api.admin.types.$catId.$id';
import { json, rowToApiType, TYPE_LIST_SQL, type TypeListRow } from '../../functions/lib/db';
import { parseTypeInput } from '../../functions/lib/validate';
import { requireAdmin, parseBody } from './api.admin.guard';

/** Bitta tur: tahrir (id va yo'nalish o'zgarmaydi — products.type bog'langan) va o'chirish. */
export async function action({ request, context, params }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const categoryId = String(params.catId);
  const id = String(params.id);

  if (request.method === 'PUT') {
    const body = ((await request.json().catch(() => null)) ?? {}) as object;
    const input = parseBody({ ...body, id, categoryId }, parseTypeInput);
    if (input instanceof Response) return input;
    await env.DB.prepare(
      'UPDATE product_types SET label = ?, label_ru = ?, icon_url = ?, billz_aliases = ?, sort_order = ? WHERE category_id = ? AND id = ?',
    ).bind(input.label, input.labelRu, input.iconUrl, JSON.stringify(input.billzAliases), input.sortOrder, categoryId, id).run();
    const row = await env.DB.prepare(`${TYPE_LIST_SQL} WHERE t.category_id = ? AND t.id = ?`).bind(categoryId, id).first<TypeListRow>();
    if (!row) return json({ error: 'not_found' }, { status: 404 });
    return json(rowToApiType(row));
  }

  if (request.method === 'DELETE') {
    // Tursiz qolgan mahsulotlar katalogda qoladi, tur qatorida chiqmaydi — soni javobda.
    const cnt = await env.DB.prepare('SELECT COUNT(*) AS n FROM products WHERE category_id = ? AND type = ?').bind(categoryId, id).first<{ n: number }>();
    await env.DB.batch([
      env.DB.prepare('UPDATE products SET type = NULL WHERE category_id = ? AND type = ?').bind(categoryId, id),
      env.DB.prepare('DELETE FROM product_types WHERE category_id = ? AND id = ?').bind(categoryId, id),
    ]);
    return json({ ok: true, cleared: cnt?.n ?? 0 });
  }

  return json({ error: 'method_not_allowed' }, { status: 405 });
}
