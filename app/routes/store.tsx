import { Outlet, isRouteErrorResponse, redirect, useLoaderData, useLocation, useRouteError } from 'react-router';
import type { Route } from './+types/store';
import { resolveLocale, localeToLang, localizedPath, DEFAULT_LOCALE, type Locale } from '../lib/i18n';
import { loadSiteConfig, loadPages, loadCategories, type PageLink } from '../lib/loaders';
import { translations } from '../../src/locales';
import StoreLayout from '../../src/store/StoreLayout';

export async function loader({ params, request, context }: Route.LoaderArgs) {
  // /uz/* — default locale'ning dublikati: bare yo'lga doimiy redirect (SEO duplicate + buzuq
  // hreflang/til almashtirgichning oldini oladi).
  if (params.lang === DEFAULT_LOCALE) {
    const url = new URL(request.url);
    const bare = url.pathname.replace(/^\/uz(?=\/|$)/, '') || '/';
    throw redirect(bare + url.search, 301);
  }
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  const env = context.cloudflare.env;
  // Kategoriyalar ham shu yerda — Header dropdown'i SSR HTMLda chiqadi
  // (crawler ichki linklarni ko'radi) va klientdagi qo'shimcha /api/categories so'rovi yo'qoladi.
  const [siteConfig, pages, categories] = await Promise.all([loadSiteConfig(env), loadPages(env), loadCategories(env)]);
  const pageLinks: PageLink[] = pages.map((p) => ({ slug: p.slug, title: p.title }));
  // origin — root.tsx'dagi hreflang va route meta'lardagi absolut URL'lar uchun.
  return { locale, siteConfig, pageLinks, categories, origin: new URL(request.url).origin };
}

export default function StoreRoot() {
  const { locale, siteConfig, pageLinks, categories } = useLoaderData<typeof loader>();
  const lang = localeToLang(locale);
  const t = translations[lang];
  return (
    <StoreLayout locale={locale} lang={lang} t={t} config={siteConfig} pageLinks={pageLinks} categories={categories}>
      <Outlet context={{ t, lang, locale, config: siteConfig }} />
    </StoreLayout>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const { pathname } = useLocation();
  const locale: Locale = pathname === '/ru' || pathname.startsWith('/ru/') ? 'ru' : 'uz';
  const t = translations[localeToLang(locale)];
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
      <h1 className="text-[40px] font-semibold">{notFound ? '404' : t.errorGeneric.split('.')[0]}</h1>
      <p className="text-muted">{notFound ? t.notFoundTitle : t.errorGeneric}</p>
      <a href={localizedPath(locale, '/')} className="px-6 py-3 bg-accent text-white font-semibold rounded-full">
        {t.backHome}
      </a>
    </div>
  );
}
