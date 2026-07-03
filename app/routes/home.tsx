import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/home';
import { resolveLocale } from '../lib/i18n';
import { pageTitle, storeConfigFrom } from '../lib/seo';
import { siteConfig } from '../lib/site.config';
import { loadStore, loadCategories, loadBanners, loadBrands, loadRail } from '../lib/loaders';
import type { StoreContext } from '../../src/store/StoreLayout';
import HomePage from '../../src/store/HomePage';

export async function loader({ params, context }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  const env = context.cloudflare.env;
  const [{ products, config }, categories, banners, deals, latest, brands] = await Promise.all([
    loadStore(env), loadCategories(env), loadBanners(env),
    loadRail(env, 'deals'), loadRail(env, 'latest'), loadBrands(env),
  ]);
  return { products, config, categories, banners, deals, latest, brands, locale };
}

export function meta({ matches }: Route.MetaArgs) {
  const cfg = storeConfigFrom(matches);
  return [
    { title: pageTitle(undefined, cfg?.seoTitleSuffix) },
    { name: 'description', content: cfg?.seoDescription ?? siteConfig.seo.description },
  ];
}

export default function HomeRoute() {
  const { products, config, categories, banners, deals, latest, brands, locale } = useLoaderData<typeof loader>();
  const ctx = useOutletContext<StoreContext>();
  return (
    <HomePage
      t={ctx.t} products={products} config={config} categories={categories}
      banners={banners} deals={deals} latest={latest} brands={brands} locale={locale}
    />
  );
}
