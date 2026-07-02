import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/category';
import { resolveLocale } from '../lib/i18n';
import { pageTitle } from '../lib/seo';
import { loadProductsBy, loadStore, loadCategories } from '../lib/loaders';
import type { StoreContext } from '../../src/store/StoreLayout';
import CategoryPage from '../../src/store/CategoryPage';

export async function loader({ params, context }: Route.LoaderArgs) {
  if (!resolveLocale(params.lang)) throw new Response('Not Found', { status: 404 });
  const env = context.cloudflare.env;
  const slug = params.slug as string;
  const [products, { config }, categories] = await Promise.all([
    loadProductsBy(env, { category: slug }), loadStore(env), loadCategories(env),
  ]);
  const title = categories.find((c) => c.id === slug)?.name ?? slug;
  return { products, config, title };
}

export function meta({ data }: Route.MetaArgs) {
  return [{ title: pageTitle(data?.title) }];
}

export default function CategoryRoute() {
  const { products, config, title } = useLoaderData<typeof loader>();
  const ctx = useOutletContext<StoreContext>();
  return <CategoryPage t={ctx.t} title={title} products={products} config={config} />;
}
