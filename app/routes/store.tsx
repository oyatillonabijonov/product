import { Outlet, useLoaderData, useRouteError } from 'react-router';
import type { Route } from './+types/store';
import { resolveLocale, localeToLang } from '../lib/i18n';
import { hreflangLinks } from '../lib/seo';
import { loadSiteConfig, loadPages, type PageLink } from '../lib/loaders';
import { translations } from '../../src/locales';
import StoreLayout from '../../src/store/StoreLayout';

export async function loader({ params, context }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  const env = context.cloudflare.env;
  const [siteConfig, pages] = await Promise.all([loadSiteConfig(env), loadPages(env)]);
  const pageLinks: PageLink[] = pages.map((p) => ({ slug: p.slug, title: p.title }));
  return { locale, siteConfig, pageLinks };
}

export function meta({ location }: Route.MetaArgs) {
  return [...hreflangLinks(location?.pathname ?? '/')];
}

export default function StoreRoot() {
  const { locale, siteConfig, pageLinks } = useLoaderData<typeof loader>();
  const lang = localeToLang(locale);
  const t = translations[lang];
  return (
    <StoreLayout locale={locale} lang={lang} t={t} config={siteConfig} pageLinks={pageLinks}>
      <Outlet context={{ t, lang, locale }} />
    </StoreLayout>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  return <div className="p-16 text-center text-[#6E6E73]">Xatolik yuz berdi.</div>;
}
