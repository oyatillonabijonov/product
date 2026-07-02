import type { Route } from './+types/sitemap[.]xml';
import { loadStore, loadCategories, loadBrands } from '../lib/loaders';
import { LOCALES, localizedPath } from '../lib/i18n';

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const origin = new URL(request.url).origin;
  const [{ products }, categories, brands] = await Promise.all([loadStore(env), loadCategories(env), loadBrands(env)]);
  const paths = ['/', '/katalog', '/chegirmalar',
    ...categories.map((c) => `/category/${c.id}`),
    ...brands.map((b) => `/brand/${b.slug}`),
    ...products.map((p) => `/product/${p.id}`)];
  const urls = paths.flatMap((p) => LOCALES.map((loc) => `${origin}${localizedPath(loc, p)}`));
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${xmlEscape(u)}</loc></url>`)
    .join('\n')}\n</urlset>`;
  return new Response(body, { headers: { 'content-type': 'application/xml' } });
}
