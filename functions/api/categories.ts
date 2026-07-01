import type { Env } from '../env';
import { json, rowToCategory, type CategoryRow } from '../lib/db';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all<CategoryRow>();
  return json(results.map(rowToCategory), { headers: { 'cache-control': 'public, max-age=60' } });
};
