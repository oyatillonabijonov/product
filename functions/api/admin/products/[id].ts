import type { Env } from '../../../env';
import { json, rowToProduct, type ProductRow } from '../../../lib/db';
import { parseProductInput, ValidationError } from '../../../lib/validate';
import { writeImagesAndSpecs } from '../products';

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = String(params.id);
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
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  const id = String(params.id);
  await env.DB.prepare('DELETE FROM product_images WHERE product_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM product_specs WHERE product_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
  return json({ ok: true });
};
