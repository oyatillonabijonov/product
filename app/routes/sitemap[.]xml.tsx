import type { Route } from './+types/sitemap[.]xml';
import { loadStore, loadCategories } from '../lib/loaders';
import { LOCALES, localizedPath } from '../lib/i18n';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const origin = new URL(request.url).origin;
  const [{ products }, categories] = await Promise.all([loadStore(env), loadCategories(env)]);
  const paths = ['/', ...categories.map((c) => `/category/${c.id}`), ...products.map((p) => `/product/${p.id}`)];
  const urls = paths.flatMap((p) => LOCALES.map((loc) => `${origin}${localizedPath(loc, p)}`));
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${u}</loc></url>`)
    .join('\n')}\n</urlset>`;
  return new Response(body, { headers: { 'content-type': 'application/xml' } });
}
