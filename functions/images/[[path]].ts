import type { Env } from '../env';

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const parts = params.path;
  const key = Array.isArray(parts) ? parts.join('/') : String(parts);
  const object = await env.IMAGES.get(key);
  if (!object) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(object.body, { headers });
};
