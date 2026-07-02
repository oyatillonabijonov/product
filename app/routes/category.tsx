import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/category';
import { resolveLocale } from '../lib/i18n';
import { pageTitle } from '../lib/seo';
import { parseCatalogFilters } from '../lib/catalog';
import { queryProducts, loadConfig, loadCategories, loadBrands } from '../lib/loaders';
import type { StoreContext } from '../../src/store/StoreLayout';
import CategoryPage from '../../src/store/CategoryPage';

export async function loader({ params, request, context }: Route.LoaderArgs) {
  if (!resolveLocale(params.lang)) throw new Response('Not Found', { status: 404 });
  const env = context.cloudflare.env;
  const slug = params.slug as string;
  const filters = parseCatalogFilters(new URL(request.url).searchParams, { category: slug });
  const [result, config, categories, brands] = await Promise.all([
    queryProducts(env, filters), loadConfig(env), loadCategories(env), loadBrands(env),
  ]);
  const title = categories.find((c) => c.id === slug)?.name ?? slug;
  return { result, config, title, brands, filters };
}

export function meta({ data }: Route.MetaArgs) {
  return [{ title: pageTitle(data?.title) }];
}

export default function CategoryRoute() {
  const { result, config, title, brands, filters } = useLoaderData<typeof loader>();
  const ctx = useOutletContext<StoreContext>();
  return <CategoryPage t={ctx.t} title={title} result={result} config={config} brands={brands} filters={filters} />;
}
