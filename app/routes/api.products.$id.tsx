import type { Route } from './+types/api.products.$id';
import { buildProductDetail, json } from '../../functions/lib/db';

export async function loader({ params, context }: Route.LoaderArgs) {
  const detail = await buildProductDetail(context.cloudflare.env, String(params.id));
  if (!detail) return json({ error: 'not_found' }, { status: 404 });
  return json(detail, { headers: { 'cache-control': 'public, max-age=60' } });
}
