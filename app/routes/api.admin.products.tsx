import type { Route } from './+types/api.admin.products';
import {
  json,
  rowToProduct,
  imagesAndSpecsStatements,
  optionsAndVariantsStatements,
  ensureUniqueSlug,
  PRODUCT_COLS,
  type ProductRow,
} from '../../functions/lib/db';
import { parseProductInput } from '../../functions/lib/validate';
import { requireAdmin, parseBody } from './api.admin.guard';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const { results } = await env.DB.prepare(
    `SELECT ${PRODUCT_COLS} FROM products ORDER BY sort_order ASC, created_at ASC`,
  ).all<ProductRow>();
  return json(results.map(rowToProduct));
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;

  const input = parseBody(await request.json().catch(() => null), parseProductInput);
  if (input instanceof Response) return input;
  if (input.slug) input.slug = await ensureUniqueSlug(env, input.slug, input.id);
  const insert = env.DB.prepare(
    `INSERT INTO products (id, name, category, condition, condition_note, cash_price_uzs, image_url, sort_order, is_active, category_id, old_price_uzs, description, brand_id, slug, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`,
  ).bind(
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
    input.brandId,
    input.slug,
  );
  // Bitta atomik tranzaksiya: yozuv o'rtada uzilsa yarim yozilgan mahsulot qolmaydi.
  await env.DB.batch([
    insert,
    ...imagesAndSpecsStatements(env, input.id, input.images, input.specs),
    ...optionsAndVariantsStatements(env, input.id, input.options, input.variants),
  ]);
  const row = await env.DB.prepare(`SELECT ${PRODUCT_COLS} FROM products WHERE id = ?`).bind(input.id).first<ProductRow>();
  return json(row ? rowToProduct(row) : { error: 'insert_failed' }, { status: row ? 201 : 500 });
}
