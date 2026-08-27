import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/deals';
import { resolveLocale, localeToLang, type Locale } from '../lib/i18n';
import { pageTitle, catalogMeta, storeConfigFrom } from '../lib/seo';
import { parseCatalogFilters } from '../lib/catalog';
import { queryProducts, loadConfig, loadBrands } from '../lib/loaders';
import { translations } from '../../src/locales';
import type { StoreContext } from '../../src/store/StoreLayout';
import CatalogView from '../../src/store/CatalogView';

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  const env = context.env;
  const filters = parseCatalogFilters(new URL(request.url).searchParams, { onlyDeals: true });
  const [result, config, brands] = await Promise.all([queryProducts(env, filters), loadConfig(env), loadBrands(env)]);
  const lang = localeToLang(locale as Locale);
  const metaTitle = translations[lang].dealsTitle;
  return { result, config, brands, filters, requestUrl: request.url, metaTitle };
}

export function meta({ data, matches }: Route.MetaArgs) {
  const sfx = storeConfigFrom(matches)?.seoTitleSuffix;
  if (!data) return [{ title: pageTitle(undefined, sfx) }];
  return catalogMeta(pageTitle(data.metaTitle, sfx), data.requestUrl);
}

export default function DealsRoute() {
  const { result, config, brands, filters } = useLoaderData<typeof loader>();
  const { t } = useOutletContext<StoreContext>();
  return <CatalogView t={t} title={t.dealsTitle} result={result} config={config} brands={brands} filters={filters} />;
}
