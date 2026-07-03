import type { Route } from './+types/images.$';

export async function loader({ params, context }: Route.LoaderArgs) {
  const key = params['*'] as string;
  // Upload faqat products/ ostiga yozadi — boshqa prefikslar tashqariga ochilmaydi.
  if (!key.startsWith('products/')) return new Response('Not found', { status: 404 });
  const obj = await context.cloudflare.env.IMAGES.get(key);
  if (!obj) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(obj.body, { headers });
}
