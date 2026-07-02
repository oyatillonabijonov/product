import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/home';
import { resolveLocale } from '../lib/i18n';
import { pageTitle } from '../lib/seo';
import { siteConfig } from '../lib/site.config';
import { loadStore, loadCategories } from '../lib/loaders';
import type { StoreContext } from '../../src/store/StoreLayout';
import HomePage from '../../src/store/HomePage';

export async function loader({ params, context }: Route.LoaderArgs) {
  if (!resolveLocale(params.lang)) throw new Response('Not Found', { status: 404 });
  const env = context.cloudflare.env;
  const [{ products, config }, categories] = await Promise.all([loadStore(env), loadCategories(env)]);
  return { products, config, categories };
}

export function meta(_: Route.MetaArgs) {
  return [{ title: pageTitle() }, { name: 'description', content: siteConfig.seo.description }];
}

export default function HomeRoute() {
  const { products, config, categories } = useLoaderData<typeof loader>();
  const ctx = useOutletContext<StoreContext>();
  return <HomePage t={ctx.t} products={products} config={config} categories={categories} />;
}
