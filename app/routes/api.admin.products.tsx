import type { Route } from './+types/api.admin.products';
import { json, rowToProduct, writeImagesAndSpecs, type ProductRow } from '../../functions/lib/db';
import { parseProductInput, ValidationError } from '../../functions/lib/validate';
import { requireAdmin } from './api.admin.guard';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const { results } = await env.DB.prepare(
    'SELECT * FROM products ORDER BY sort_order ASC, created_at ASC',
  ).all<ProductRow>();
  return json(results.map(rowToProduct));
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;

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
}
