import type { Route } from './+types/api.products';
import { json, rowToProduct, type ProductRow, PRODUCT_COLS } from '../../functions/lib/db';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const q = url.searchParams.get('q');
  let sql = `SELECT ${PRODUCT_COLS} FROM products WHERE is_active = 1`;
  const binds: unknown[] = [];
  if (category) { sql += ' AND category_id = ?'; binds.push(category); }
  if (q && q.trim() !== '') { sql += ' AND name LIKE ?'; binds.push(`%${q.trim()}%`); }
  sql += ' ORDER BY sort_order ASC, created_at ASC';
  const { results } = await env.DB.prepare(sql).bind(...binds).all<ProductRow>();
  return json(results.map(rowToProduct), { headers: { 'cache-control': 'public, max-age=60' } });
}
