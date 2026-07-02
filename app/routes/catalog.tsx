import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/catalog';
import { resolveLocale } from '../lib/i18n';
import { pageTitle } from '../lib/seo';
import { parseCatalogFilters } from '../lib/catalog';
import { queryProducts, loadConfig, loadBrands } from '../lib/loaders';
import type { StoreContext } from '../../src/store/StoreLayout';
import CatalogView from '../../src/store/CatalogView';

export async function loader({ params, request, context }: Route.LoaderArgs) {
  if (!resolveLocale(params.lang)) throw new Response('Not Found', { status: 404 });
  const env = context.cloudflare.env;
  const filters = parseCatalogFilters(new URL(request.url).searchParams);
  const [result, config, brands] = await Promise.all([queryProducts(env, filters), loadConfig(env), loadBrands(env)]);
  return { result, config, brands, filters };
}

export function meta(_: Route.MetaArgs) {
  return [{ title: pageTitle('Katalog') }];
}

export default function CatalogRoute() {
  const { result, config, brands, filters } = useLoaderData<typeof loader>();
  const { t } = useOutletContext<StoreContext>();
  return <CatalogView t={t} title={t.catalogAll} result={result} config={config} brands={brands} filters={filters} />;
}
