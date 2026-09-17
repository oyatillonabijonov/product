import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/deals';
import { resolveLocale } from '../lib/i18n';
import { pageTitle, catalogMeta, storeConfigFrom } from '../lib/seo';
import { siteConfig } from '../lib/site.config';
import { parseCatalogFilters } from '../lib/catalog';
import { queryProducts, loadConfig, loadBrands, loadT } from '../lib/loaders';
import type { StoreContext } from '../../src/store/StoreLayout';
import CatalogView from '../../src/store/CatalogView';

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  const env = context.env;
  const filters = parseCatalogFilters(new URL(request.url).searchParams, { onlyDeals: true });
  const [result, config, brands, t] = await Promise.all([queryProducts(env, filters), loadConfig(env), loadBrands(env), loadT(env, locale)]);
  // `meta()` bazaga kira olmaydi — admin'da tahrirlangan tavsif shabloni shu yerda olinadi.
  return { result, config, brands, filters, requestUrl: request.url, metaTitle: t.dealsTitle, metaDesc: t.metaCatalogDesc };
}

export function meta({ data, matches }: Route.MetaArgs) {
  const sfx = storeConfigFrom(matches)?.seoTitleSuffix;
  if (!data) return [{ title: pageTitle(undefined, sfx) }];
  const desc = data.metaDesc.replace('{title}', data.metaTitle).replace('{store}', storeConfigFrom(matches)?.name ?? siteConfig.name);
  return catalogMeta(pageTitle(data.metaTitle, sfx), data.requestUrl, desc);
}

export default function DealsRoute() {
  const { result, config, brands, filters } = useLoaderData<typeof loader>();
  const { t } = useOutletContext<StoreContext>();
  return <CatalogView t={t} title={t.dealsTitle} result={result} config={config} brands={brands} filters={filters} />;
}
