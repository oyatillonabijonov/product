import type { Env } from '../../env';
import { buildProductDetail, json } from '../../lib/db';

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const detail = await buildProductDetail(env, String(params.id));
  if (!detail) return json({ error: 'not_found' }, { status: 404 });
  return json(detail, { headers: { 'cache-control': 'public, max-age=60' } });
};
