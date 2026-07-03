import type { Route } from './+types/api.admin.products.$id';
import {
  json,
  rowToProduct,
  imagesAndSpecsStatements,
  optionsAndVariantsStatements,
  ensureUniqueSlug,
  PRODUCT_COLS,
  type ProductRow,
} from '../../functions/lib/db';
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
    if (input.slug) input.slug = await ensureUniqueSlug(env, input.slug, input.id);
    const update = env.DB.prepare(
      `UPDATE products SET name=?, category=?, condition=?, condition_note=?, cash_price_uzs=?, image_url=?, sort_order=?, is_active=?, category_id=?, old_price_uzs=?, description=?, brand_id=?, slug=? WHERE id=?`,
    ).bind(
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
      input.brandId,
      input.slug,
      id,
    );
    // Bitta atomik tranzaksiya: yozuv o'rtada uzilsa yarim yozilgan mahsulot qolmaydi.
    await env.DB.batch([
      update,
      ...imagesAndSpecsStatements(env, id, input.images, input.specs),
      ...optionsAndVariantsStatements(env, id, input.options, input.variants),
    ]);
    const row = await env.DB.prepare(`SELECT ${PRODUCT_COLS} FROM products WHERE id = ?`).bind(id).first<ProductRow>();
    if (!row) return json({ error: 'not_found' }, { status: 404 });
    return json(rowToProduct(row));
  }

  // Yengil ko'rinish-toggle: PUT dan farqli, variant/galereya/spec'larga TEGMAYDI —
  // ro'yxat sahifasidagi to'liq bo'lmagan obyektni PUT qilish ularni o'chirib yuborardi.
  if (request.method === 'PATCH') {
    const body = (await request.json().catch(() => null)) as { isActive?: unknown } | null;
    if (!body || typeof body.isActive !== 'boolean') {
      return json({ error: 'is_active_required' }, { status: 400 });
    }
    await env.DB.prepare('UPDATE products SET is_active = ? WHERE id = ?')
      .bind(body.isActive ? 1 : 0, id)
      .run();
    const row = await env.DB.prepare(`SELECT ${PRODUCT_COLS} FROM products WHERE id = ?`).bind(id).first<ProductRow>();
    if (!row) return json({ error: 'not_found' }, { status: 404 });
    return json(rowToProduct(row));
  }

  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM product_images WHERE product_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM product_specs WHERE product_id = ?').bind(id).run();
    await env.DB.prepare(
      'DELETE FROM variant_option_values WHERE variant_id IN (SELECT id FROM product_variants WHERE product_id = ?)',
    )
      .bind(id)
      .run();
    await env.DB.prepare('DELETE FROM product_variants WHERE product_id = ?').bind(id).run();
    await env.DB.prepare(
      'DELETE FROM product_option_values WHERE option_id IN (SELECT id FROM product_options WHERE product_id = ?)',
    )
      .bind(id)
      .run();
    await env.DB.prepare('DELETE FROM product_options WHERE product_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }

  return json({ error: 'method_not_allowed' }, { status: 405 });
}
