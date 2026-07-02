import type { Route } from './+types/robots[.]txt';

export function loader({ request }: Route.LoaderArgs) {
  const origin = new URL(request.url).origin;
  const body = ['User-agent: *', 'Disallow: /admin', 'Disallow: /api', '', `Sitemap: ${origin}/sitemap.xml`, ''].join('\n');
  return new Response(body, { headers: { 'content-type': 'text/plain' } });
}
