import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/product';
import { resolveLocale, localizedPath, localeToLang, categoryLabel } from '../lib/i18n';
import { pageTitle, storeConfigFrom, productJsonLd, breadcrumbJsonLd, ogMeta } from '../lib/seo';
import { loadProductDetail, loadConfig, loadProductsBy, loadCategories } from '../lib/loaders';
import { fallbackCategoryOf } from '../../src/data/products';
import { translations } from '../../src/locales';
import { firstParagraph } from '../../src/lib/markdown';
import type { StoreContext } from '../../src/store/StoreLayout';
import ProductPage from '../../src/store/ProductPage';

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  const env = context.env;
  const [product, config, categories] = await Promise.all([
    loadProductDetail(env, params.id as string), loadConfig(env), loadCategories(env),
  ]);
  if (!product) throw new Response('Not Found', { status: 404 });
  const categoryId = product.categoryId ?? fallbackCategoryOf(product);
  const similar = categoryId
    ? (await loadProductsBy(env, { category: categoryId, limit: 5 }))
        .filter((p) => p.id !== product.id)
        .slice(0, 4)
    : [];
  const category = categories.find((c) => c.id === product.categoryId);
  const categoryName = category ? categoryLabel(category, locale) : null;
  return { product, config, similar, locale, categoryName, origin: new URL(request.url).origin };
}

export function meta({ data, matches }: Route.MetaArgs) {
  const cfg = storeConfigFrom(matches);
  if (!data) return [{ title: pageTitle(undefined, cfg?.seoTitleSuffix) }];
  const t = translations[localeToLang(data.locale)];
  // JSON-LD/OG'dagi URL'lar absolut bo'lishi shart — nisbiylarini qidiruv tizimlari tashlab yuboradi.
  const url = data.origin + localizedPath(data.locale, `/product/${data.product.id}`);
  const desc = (data.product.conditionNote ?? firstParagraph(data.product.description ?? '')).slice(0, 160);
  const title = pageTitle(data.product.name, cfg?.seoTitleSuffix);
  const img = data.product.images[0];
  return [
    { title },
    { tagName: 'link', rel: 'canonical', href: url },
    ...(desc ? [{ name: 'description', content: desc }] : []),
    ...ogMeta({
      title,
      description: desc || undefined,
      image: img ? (img.startsWith('http') ? img : data.origin + img) : undefined,
      url,
      type: 'product',
    }),
    { 'script:ld+json': productJsonLd(data.product, url) },
    { 'script:ld+json': breadcrumbJsonLd([
      { name: t.breadcrumbHome, url: data.origin + localizedPath(data.locale, '/') },
      ...(data.categoryName && data.product.categoryId
        ? [{ name: data.categoryName, url: data.origin + localizedPath(data.locale, `/category/${data.product.categoryId}`) }]
        : []),
      { name: data.product.name, url },
    ]) },
  ];
}

export default function ProductRoute() {
  const { product, config, similar, categoryName } = useLoaderData<typeof loader>();
  const ctx = useOutletContext<StoreContext>();
  return <ProductPage key={product.id} t={ctx.t} product={product} config={config} similar={similar} site={ctx.config} categoryName={categoryName} />;
}
