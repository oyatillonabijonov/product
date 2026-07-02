import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/search';
import { resolveLocale } from '../lib/i18n';
import { pageTitle } from '../lib/seo';
import { parseCatalogFilters } from '../lib/catalog';
import { queryProducts, loadConfig, loadBrands } from '../lib/loaders';
import type { StoreContext } from '../../src/store/StoreLayout';
import SearchPage from '../../src/store/SearchPage';

export async function loader({ params, request, context }: Route.LoaderArgs) {
  if (!resolveLocale(params.lang)) throw new Response('Not Found', { status: 404 });
  const env = context.cloudflare.env;
  const sp = new URL(request.url).searchParams;
  const filters = parseCatalogFilters(sp);
  const q = filters.q ?? '';
  const [result, config, brands] = await Promise.all([
    queryProducts(env, filters), loadConfig(env), loadBrands(env),
  ]);
  return { result, config, q, brands, filters };
}
export function meta({ data }: Route.MetaArgs) {
  return [{ title: pageTitle(data?.q ? `"${data.q}"` : undefined) }, { name: 'robots', content: 'noindex' }];
}
export default function SearchRoute() {
  const { result, config, q, brands, filters } = useLoaderData<typeof loader>();
  const ctx = useOutletContext<StoreContext>();
  return <SearchPage t={ctx.t} q={q} result={result} config={config} brands={brands} filters={filters} />;
}
