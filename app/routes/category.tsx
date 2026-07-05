import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/category';
import { resolveLocale } from '../lib/i18n';
import { pageTitle, catalogMeta, storeConfigFrom } from '../lib/seo';
import { parseCatalogFilters } from '../lib/catalog';
import { queryProducts, loadConfig, loadCategories, loadBrands } from '../lib/loaders';
import type { StoreContext } from '../../src/store/StoreLayout';
import CatalogView from '../../src/store/CatalogView';

export async function loader({ params, request, context }: Route.LoaderArgs) {
  if (!resolveLocale(params.lang)) throw new Response('Not Found', { status: 404 });
  const env = context.cloudflare.env;
  const slug = params.slug as string;
  const filters = parseCatalogFilters(new URL(request.url).searchParams, { category: slug });
  const [result, config, categories, brands] = await Promise.all([
    queryProducts(env, filters), loadConfig(env), loadCategories(env), loadBrands(env),
  ]);
  const category = categories.find((c) => c.id === slug);
  if (!category) throw new Response('Not Found', { status: 404 }); // noma'lum slug 200 + soft-404 bo'lib indekslanmasin
  const title = category.name;
  return { result, config, title, brands, filters, requestUrl: request.url };
}

export function meta({ data, matches }: Route.MetaArgs) {
  const sfx = storeConfigFrom(matches)?.seoTitleSuffix;
  if (!data) return [{ title: pageTitle(undefined, sfx) }];
  return catalogMeta(pageTitle(data.title, sfx), data.requestUrl);
}

export default function CategoryRoute() {
  const { result, config, title, brands, filters } = useLoaderData<typeof loader>();
  const ctx = useOutletContext<StoreContext>();
  return <CatalogView t={ctx.t} title={title} result={result} config={config} brands={brands} filters={filters} />;
}
