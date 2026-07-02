import type { Route } from './+types/api.admin.products.$id';
import { json, rowToProduct, writeImagesAndSpecs, type ProductRow } from '../../functions/lib/db';
import { parseProductInput, ValidationError } from '../../functions/lib/validate';
import { requireAdmin } from './api.admin.guard';

export async function action({ request, context, params }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const id = String(params.id);

  if (request.method === 'PUT') {
    let input;
    try {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      input = parseProductInput({ ...body, id });
    } catch (e) {
      if (e instanceof ValidationError) return json({ error: e.message }, { status: 400 });
      throw e;
    }
    await env.DB.prepare(
      `UPDATE products SET name=?, category=?, condition=?, condition_note=?, cash_price_uzs=?, image_url=?, sort_order=?, is_active=?, category_id=?, old_price_uzs=?, description=? WHERE id=?`,
    )
      .bind(
        input.name,
        input.category,
        input.condition,
        input.conditionNote,
        input.cashPriceUzs,
        input.imageUrl,
        input.sortOrder,
        input.isActive ? 1 : 0,
        input.categoryId,
        input.oldPriceUzs,
        input.description,
        id,
      )
      .run();
    await writeImagesAndSpecs(env, id, input.images, input.specs);
    const row = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<ProductRow>();
    if (!row) return json({ error: 'not_found' }, { status: 404 });
    return json(rowToProduct(row));
  }

  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM product_images WHERE product_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM product_specs WHERE product_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }

  return json({ error: 'method_not_allowed' }, { status: 405 });
}
