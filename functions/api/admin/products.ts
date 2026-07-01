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
    `INSERT INTO products (id, name, category, condition, condition_note, cash_price_uzs, image_url, sort_order, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`,
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
    )
    .run();
  const row = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(input.id).first<ProductRow>();
  return json(row ? rowToProduct(row) : { error: 'insert_failed' }, { status: row ? 201 : 500 });
};
