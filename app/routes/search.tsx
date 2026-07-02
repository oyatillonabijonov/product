import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/search';
import { resolveLocale } from '../lib/i18n';
import { pageTitle } from '../lib/seo';
import { loadProductsBy, loadConfig } from '../lib/loaders';
import type { StoreContext } from '../../src/store/StoreLayout';
import SearchPage from '../../src/store/SearchPage';

export async function loader({ params, request, context }: Route.LoaderArgs) {
  if (!resolveLocale(params.lang)) throw new Response('Not Found', { status: 404 });
  const q = new URL(request.url).searchParams.get('q') ?? '';
  const env = context.cloudflare.env;
  const [products, config] = await Promise.all([loadProductsBy(env, { q }), loadConfig(env)]);
  return { products, config, q };
}
export function meta({ data }: Route.MetaArgs) {
  return [{ title: pageTitle(data?.q ? `"${data.q}"` : undefined) }];
}
export default function SearchRoute() {
  const { products, config, q } = useLoaderData<typeof loader>();
  const ctx = useOutletContext<StoreContext>();
  return <SearchPage t={ctx.t} q={q} products={products} config={config} />;
}
