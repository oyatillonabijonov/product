import type { Env } from '../env';
import { json, rowToProduct, type ProductRow } from '../lib/db';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    'SELECT * FROM products WHERE is_active = 1 ORDER BY sort_order ASC, created_at ASC',
  ).all<ProductRow>();
  return json(results.map(rowToProduct), {
    headers: { 'cache-control': 'public, max-age=60' },
  });
};
