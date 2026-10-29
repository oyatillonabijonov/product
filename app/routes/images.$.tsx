import type { Route } from './+types/images.$';
import { IMAGE_KEY_RE } from '../../shared/http-policy';

export async function loader({ params, context }: Route.LoaderArgs) {
  const key = params['*'] as string;
  // Faqat ilova yozadigan kalit shakli — boshqa prefiks, `..` yoki ichki papka ochilmaydi.
  if (!IMAGE_KEY_RE.test(key)) return new Response('Not found', { status: 404 });
  const obj = await context.env.IMAGES.get(key);
  if (!obj) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(obj.body, { headers });
}
