import type { Route } from './+types/api.brands';
import { json, rowToBrand, type BrandRow } from '../../functions/lib/db';

export async function loader({ context }: Route.LoaderArgs) {
  const { results } = await context.cloudflare.env.DB
    .prepare('SELECT * FROM brands ORDER BY sort_order ASC').all<BrandRow>();
  return json(results.map(rowToBrand), { headers: { 'cache-control': 'public, max-age=60' } });
}
