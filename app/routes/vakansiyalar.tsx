import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/vakansiyalar';
import { resolveLocale, localeToLang } from '../lib/i18n';
import { pageTitle, catalogMeta, storeConfigFrom } from '../lib/seo';
import { siteConfig } from '../lib/site.config';
import { loadVacancies } from '../lib/loaders';
import { translations } from '../../src/locales';
import type { StoreContext } from '../../src/store/StoreLayout';
import CareersPage from '../../src/store/CareersPage';

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  return { vacancies: await loadVacancies(context.env), locale, requestUrl: request.url };
}

export function meta({ data, matches }: Route.MetaArgs) {
  const cfg = storeConfigFrom(matches);
  if (!data) return [{ title: pageTitle(undefined, cfg?.seoTitleSuffix) }];
  const t = translations[localeToLang(data.locale)];
  const desc = t.careersMetaDesc.replace('{store}', cfg?.name ?? siteConfig.name);
  return catalogMeta(pageTitle(t.footerCareers, cfg?.seoTitleSuffix), data.requestUrl, desc);
}

export default function VakansiyalarRoute() {
  const { vacancies } = useLoaderData<typeof loader>();
  const { t, locale } = useOutletContext<StoreContext>();
  return <CareersPage t={t} locale={locale} vacancies={vacancies} />;
}
