import type { Route } from './+types/api.categories';
import { json, rowToCategory, type CategoryRow } from '../../functions/lib/db';

export async function loader({ context }: Route.LoaderArgs) {
  const { results } = await context.cloudflare.env.DB
    .prepare('SELECT * FROM categories ORDER BY sort_order ASC').all<CategoryRow>();
  return json(results.map(rowToCategory), { headers: { 'cache-control': 'public, max-age=60' } });
}
