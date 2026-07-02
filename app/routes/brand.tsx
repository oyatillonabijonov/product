import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/brand';
import { resolveLocale } from '../lib/i18n';
import { pageTitle, catalogMeta } from '../lib/seo';
import { parseCatalogFilters } from '../lib/catalog';
import { queryProducts, loadConfig, loadBrands } from '../lib/loaders';
import type { StoreContext } from '../../src/store/StoreLayout';
import CatalogView from '../../src/store/CatalogView';

export async function loader({ params, request, context }: Route.LoaderArgs) {
  if (!resolveLocale(params.lang)) throw new Response('Not Found', { status: 404 });
  const env = context.cloudflare.env;
  const brands = await loadBrands(env);
  const brand = brands.find((b) => b.slug === params.slug);
  if (!brand) throw new Response('Not Found', { status: 404 });
  const filters = parseCatalogFilters(new URL(request.url).searchParams);
  filters.brands = [brand.id];
  const [result, config] = await Promise.all([queryProducts(env, filters), loadConfig(env)]);
  return { result, config, brand, brands, filters, requestUrl: request.url };
}

export function meta({ data }: Route.MetaArgs) {
  if (!data) return [{ title: pageTitle() }];
  return catalogMeta(pageTitle(data.brand.name), data.requestUrl);
}

export default function BrandRoute() {
  const { result, config, brand, brands, filters } = useLoaderData<typeof loader>();
  const { t } = useOutletContext<StoreContext>();
  return <CatalogView t={t} title={brand.name} result={result} config={config} brands={brands} filters={filters} />;
}
