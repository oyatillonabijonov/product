import type { Env } from '../../env';
import { json, rowToProduct, type ProductRow } from '../../lib/db';
import { parseProductInput, ValidationError } from '../../lib/validate';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    'SELECT * FROM products ORDER BY sort_order ASC, created_at ASC',
  ).all<ProductRow>();
  return json(results.map(rowToProduct));
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let input;
  try {
    input = parseProductInput(await request.json().catch(() => null));
  } catch (e) {
    if (e instanceof ValidationError) return json({ error: e.message }, { status: 400 });
    throw e;
  }
  await env.DB.prepare(
    `INSERT INTO products (id, name, category, condition, condition_note, cash_price_uzs, image_url, sort_order, is_active, category_id, old_price_uzs, description, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`,
  )
    .bind(
      input.id,
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
    )
    .run();
  await writeImagesAndSpecs(env, input.id, input.images, input.specs);
  const row = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(input.id).first<ProductRow>();
  return json(row ? rowToProduct(row) : { error: 'insert_failed' }, { status: row ? 201 : 500 });
};

export async function writeImagesAndSpecs(
  env: Env,
  productId: string,
  images: string[],
  specs: { label: string; value: string }[],
): Promise<void> {
  await env.DB.prepare('DELETE FROM product_images WHERE product_id = ?').bind(productId).run();
  await env.DB.prepare('DELETE FROM product_specs WHERE product_id = ?').bind(productId).run();
  for (let i = 0; i < images.length; i++) {
    await env.DB.prepare('INSERT INTO product_images (id, product_id, image_url, sort_order) VALUES (?, ?, ?, ?)')
      .bind(crypto.randomUUID(), productId, images[i], i)
      .run();
  }
  for (let i = 0; i < specs.length; i++) {
    await env.DB.prepare('INSERT INTO product_specs (id, product_id, label, value, sort_order) VALUES (?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), productId, specs[i].label, specs[i].value, i)
      .run();
  }
}
