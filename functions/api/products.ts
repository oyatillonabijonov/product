import type { Env } from '../env';
import { json, rowToProduct, type ProductRow } from '../lib/db';

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const q = url.searchParams.get('q');

  let sql = 'SELECT * FROM products WHERE is_active = 1';
  const binds: unknown[] = [];
  if (category) {
    sql += ' AND category_id = ?';
    binds.push(category);
  }
  if (q && q.trim() !== '') {
    sql += ' AND name LIKE ?';
    binds.push(`%${q.trim()}%`);
  }
  sql += ' ORDER BY sort_order ASC, created_at ASC';

  const { results } = await env.DB.prepare(sql).bind(...binds).all<ProductRow>();
  return json(results.map(rowToProduct), { headers: { 'cache-control': 'public, max-age=60' } });
};
