import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/vakansiyalar';
import { resolveLocale } from '../lib/i18n';
import { pageTitle, catalogMeta, storeConfigFrom } from '../lib/seo';
import { siteConfig } from '../lib/site.config';
import { loadVacancies, loadT } from '../lib/loaders';
import type { StoreContext } from '../../src/store/StoreLayout';
import CareersPage from '../../src/store/CareersPage';

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  const [vacancies, t] = await Promise.all([loadVacancies(context.env), loadT(context.env, locale)]);
  // `meta()` bazaga kira olmaydi — admin'da tahrirlangan tavsif shu yerda olinadi.
  return { vacancies, requestUrl: request.url, metaTitle: t.footerCareers, metaDesc: t.careersMetaDesc };
}

export function meta({ data, matches }: Route.MetaArgs) {
  const cfg = storeConfigFrom(matches);
  if (!data) return [{ title: pageTitle(undefined, cfg?.seoTitleSuffix) }];
  const desc = data.metaDesc.replace('{store}', cfg?.name ?? siteConfig.name);
  return catalogMeta(pageTitle(data.metaTitle, cfg?.seoTitleSuffix), data.requestUrl, desc);
}

export default function VakansiyalarRoute() {
  const { vacancies } = useLoaderData<typeof loader>();
  const { t, locale } = useOutletContext<StoreContext>();
  return <CareersPage t={t} locale={locale} vacancies={vacancies} />;
}
