import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/product';
import { resolveLocale } from '../lib/i18n';
import { pageTitle } from '../lib/seo';
import { loadProductDetail, loadConfig } from '../lib/loaders';
import type { StoreContext } from '../../src/store/StoreLayout';
import ProductPage from '../../src/store/ProductPage';

export async function loader({ params, context }: Route.LoaderArgs) {
  if (!resolveLocale(params.lang)) throw new Response('Not Found', { status: 404 });
  const env = context.cloudflare.env;
  const [product, config] = await Promise.all([
    loadProductDetail(env, params.id as string), loadConfig(env),
  ]);
  if (!product) throw new Response('Not Found', { status: 404 });
  return { product, config };
}

export function meta({ data }: Route.MetaArgs) {
  return [{ title: pageTitle(data?.product.name) }];
}

export default function ProductRoute() {
  const { product, config } = useLoaderData<typeof loader>();
  const ctx = useOutletContext<StoreContext>();
  return <ProductPage t={ctx.t} product={product} config={config} />;
}
