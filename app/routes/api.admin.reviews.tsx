import type { Route } from './+types/api.admin.reviews';
import { json, recomputeRating } from '../../functions/lib/db';
import { parseReviewInput } from '../../functions/lib/validate';
import { requireAdmin, parseBody } from './api.admin.guard';
import type { ApiReview } from '../../shared/types';

interface ReviewRow { id: string; author: string; rating: number; body: string; created_at: number }

/** Mahsulot sharhlari (admin): `GET ?productId=` ro'yxat, `POST` yangi sharh + reyting qayta hisobi. */
export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const productId = new URL(request.url).searchParams.get('productId') ?? '';
  if (!productId) return json({ error: 'productId_required' }, { status: 400 });
  const { results } = await env.DB
    .prepare('SELECT id, author, rating, body, created_at FROM product_reviews WHERE product_id = ? ORDER BY created_at DESC LIMIT 200')
    .bind(productId).all<ReviewRow>();
  const out: ApiReview[] = results.map((r) => ({ id: r.id, author: r.author, rating: r.rating, body: r.body, createdAt: r.created_at }));
  return json(out);
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });
  const input = parseBody(await request.json().catch(() => null), parseReviewInput);
  if (input instanceof Response) return input;
  const exists = await env.DB.prepare('SELECT 1 AS x FROM products WHERE id = ?').bind(input.productId).first<{ x: number }>();
  if (!exists) return json({ error: 'not_found' }, { status: 404 });
  await env.DB.prepare('INSERT INTO product_reviews (id, product_id, author, rating, body, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(input.id, input.productId, input.author, input.rating, input.body, input.createdAt).run();
  await recomputeRating(env, input.productId);
  const out: ApiReview = { id: input.id, author: input.author, rating: input.rating, body: input.body, createdAt: input.createdAt };
  return json(out, { status: 201 });
}
