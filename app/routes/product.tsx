import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/product';
import { resolveLocale, localizedPath, localeToLang } from '../lib/i18n';
import { pageTitle, storeConfigFrom, productJsonLd, breadcrumbJsonLd } from '../lib/seo';
import { loadProductDetail, loadConfig, loadProductsBy, loadCategories } from '../lib/loaders';
import { fallbackCategoryOf } from '../../src/data/products';
import { translations } from '../../src/locales';
import { firstParagraph } from '../../src/lib/markdown';
import type { StoreContext } from '../../src/store/StoreLayout';
import ProductPage from '../../src/store/ProductPage';

export async function loader({ params, context }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  const env = context.cloudflare.env;
  const [product, config, categories] = await Promise.all([
    loadProductDetail(env, params.id as string), loadConfig(env), loadCategories(env),
  ]);
  if (!product) throw new Response('Not Found', { status: 404 });
  const categoryId = product.categoryId ?? fallbackCategoryOf(product);
  const similar = categoryId
    ? (await loadProductsBy(env, { category: categoryId }))
        .filter((p) => p.id !== product.id)
        .slice(0, 4)
    : [];
  const categoryName = categories.find((c) => c.id === product.categoryId)?.name ?? null;
  return { product, config, similar, locale, categoryName };
}

export function meta({ data, matches }: Route.MetaArgs) {
  const cfg = storeConfigFrom(matches);
  if (!data) return [{ title: pageTitle(undefined, cfg?.seoTitleSuffix) }];
  const t = translations[localeToLang(data.locale)];
  const path = localizedPath(data.locale, `/product/${data.product.id}`);
  const desc = (data.product.conditionNote ?? firstParagraph(data.product.description ?? '')).slice(0, 160);
  return [
    { title: pageTitle(data.product.name, cfg?.seoTitleSuffix) },
    ...(desc ? [{ name: 'description', content: desc }] : []),
    { 'script:ld+json': productJsonLd(data.product, path) },
    { 'script:ld+json': breadcrumbJsonLd([
      { name: t.breadcrumbHome, url: localizedPath(data.locale, '/') },
      ...(data.categoryName && data.product.categoryId
        ? [{ name: data.categoryName, url: localizedPath(data.locale, `/category/${data.product.categoryId}`) }]
        : []),
      { name: data.product.name, url: path },
    ]) },
  ];
}

export default function ProductRoute() {
  const { product, config, similar } = useLoaderData<typeof loader>();
  const ctx = useOutletContext<StoreContext>();
  return <ProductPage key={product.id} t={ctx.t} product={product} config={config} similar={similar} />;
}
